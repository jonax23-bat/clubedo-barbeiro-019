import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function MyAppointments({ user, navigateTo, refreshUser }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // active | history

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let list = [];
      if (user.role === "client") {
        list = await dbService.getAppointments(user.uid);
      } else if (user.role === "barber") {
        list = await dbService.getBarberAppointments(user.uid);
      } else if (user.role === "owner") {
        // O dono vê todos para fins de histórico geral
        list = await dbService.getAllAppointments();
      }
      
      // Ordena por data e hora decrescente
      list.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return dateTimeB - dateTimeA;
      });

      setAppointments(list);
    } catch (e) {
      console.error("Erro ao carregar agendamentos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const handleCancel = async (apt) => {
    // 1. Verificação extra de autorização no lado do cliente
    if (user.role !== "owner" && user.uid !== apt.clientUid && user.uid !== apt.barberUid) {
      alert("Você não tem autorização para cancelar este agendamento.");
      return;
    }

    if (!window.confirm(`Deseja realmente cancelar o agendamento do dia ${new Date(apt.date + "T00:00:00").toLocaleDateString("pt-BR")} às ${apt.time}?`)) {
      return;
    }

    setCancellingId(apt.id);
    try {
      const success = await dbService.cancelAppointment(apt.id);
      if (success) {
        // Recarrega dados localmente
        await loadAppointments();
        if (refreshUser) refreshUser();
      } else {
        alert("Não foi possível cancelar o agendamento. Verifique sua conexão ou autorização.");
      }
    } catch (err) {
      console.error("Erro ao cancelar agendamento:", err);
      alert("Ocorreu um erro ao processar o cancelamento: " + err.message);
    } finally {
      setCancellingId(null);
    }
  };

  // Divide os agendamentos entre ativos (futuros e agendados) e passados (concluídos, cancelados ou data anterior)
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const activeApts = appointments.filter(apt => {
    if (apt.status === "cancelled" || apt.status === "completed" || apt.status === "absent") {
      return false;
    }
    // Verifica se a data é hoje ou futura
    if (apt.date > todayStr) return true;
    if (apt.date === todayStr && apt.time >= nowTime) return true;
    return false;
  });

  const historyApts = appointments.filter(apt => {
    if (apt.status === "cancelled" || apt.status === "completed" || apt.status === "absent") {
      return true;
    }
    if (apt.date < todayStr) return true;
    if (apt.date === todayStr && apt.time < nowTime) return true;
    return false;
  });

  const currentList = activeTab === "active" ? activeApts : historyApts;

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h1 className="font-display-lg text-headline-lg font-bold tracking-tight text-on-surface">
            {user.role === "barber" ? "Meus Atendimentos" : "Meus Agendamentos"}
          </h1>
          <p className="text-label-sm text-outline mt-1 uppercase tracking-wider">
            {user.role === "barber" ? "Histórico e agenda de clientes" : "Gerencie seus horários marcados na barbearia"}
          </p>
        </div>
        
        {user.role === "client" && (
          <button
            onClick={() => navigateTo("schedule")}
            className="bg-tertiary text-on-tertiary px-lg py-sm rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs shadow-lg shadow-tertiary/20"
          >
            <span className="material-symbols-outlined text-md">calendar_month</span>
            Novo Agendamento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/10">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-lg py-md font-bold text-sm relative transition-colors ${
            activeTab === "active" ? "text-tertiary" : "text-outline hover:text-on-surface-variant"
          }`}
        >
          <span className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Agendamentos Ativos
            {activeApts.length > 0 && (
              <span className="ml-1 bg-tertiary/20 text-tertiary px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                {activeApts.length}
              </span>
            )}
          </span>
          {activeTab === "active" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-lg py-md font-bold text-sm relative transition-colors ${
            activeTab === "history" ? "text-tertiary" : "text-outline hover:text-on-surface-variant"
          }`}
        >
          <span className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-sm">history</span>
            Histórico Completo
          </span>
          {activeTab === "history" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Lista de Agendamentos */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="flex flex-col items-center gap-sm animate-pulse">
            <span className="material-symbols-outlined text-4xl text-tertiary animate-spin">sync</span>
            <p className="text-outline text-xs uppercase font-bold tracking-wider">Carregando agendamentos...</p>
          </div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="glass-card rounded-2xl p-20 text-center border border-outline-variant/10 space-y-md">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto text-outline">
            <span className="material-symbols-outlined text-3xl">
              {activeTab === "active" ? "event_busy" : "history_toggle_off"}
            </span>
          </div>
          <div className="space-y-xs">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {activeTab === "active" ? "Nenhum agendamento ativo" : "Nenhum histórico registrado"}
            </h3>
            <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
              {activeTab === "active" 
                ? "Você não possui horários agendados para os próximos dias."
                : "Seus atendimentos e agendamentos anteriores aparecerão aqui."}
            </p>
          </div>
          {activeTab === "active" && user.role === "client" && (
            <button
              onClick={() => navigateTo("schedule")}
              className="bg-surface-container-high border border-outline-variant/30 text-tertiary px-lg py-sm rounded-xl font-bold hover:border-tertiary/50 transition-colors"
            >
              Agende seu primeiro horário
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {currentList.map((apt) => {
            const isCancelled = apt.status === "cancelled";
            const isCompleted = apt.status === "completed";
            
            let statusBadge = "Agendado";
            let badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            let statusIcon = "event_available";

            if (isCancelled) {
              statusBadge = "Cancelado";
              badgeStyle = "bg-red-500/10 text-red-400 border border-red-500/20";
              statusIcon = "cancel";
            } else if (isCompleted) {
              statusBadge = "Concluído";
              badgeStyle = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
              statusIcon = "task_alt";
            } else if (apt.status === "absent") {
              statusBadge = "Não Compareceu";
              badgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              statusIcon = "person_off";
            }

            return (
              <div 
                key={apt.id} 
                className={`glass-card rounded-2xl p-md border flex flex-col justify-between space-y-md relative overflow-hidden transition-all ${
                  isCancelled ? "opacity-60 border-outline-variant/10" : "border-outline-variant/20 hover:border-tertiary/20"
                }`}
              >
                {/* Header do Card */}
                <div className="flex justify-between items-start gap-sm">
                  <div className="space-y-[2px]">
                    <div className="flex gap-2 items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-[2px] ${badgeStyle}`}>
                        <span className="material-symbols-outlined text-[10px]">{statusIcon}</span>
                        {statusBadge}
                      </span>
                    </div>
                    
                    <h3 className="font-headline-md text-headline-md text-on-surface pt-1 flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm text-tertiary">person</span>
                      {user.role === "client" ? apt.barberName : apt.clientName}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-xs font-semibold">
                      <span className="material-symbols-outlined text-xs">store</span>
                      {apt.unitName || "Unidade Central"}
                    </p>
                  </div>

                  <div className="bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/10 text-center shrink-0 min-w-[70px]">
                    <span className="block text-[10px] text-outline font-bold uppercase tracking-wider">
                      {new Date(apt.date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                    <span className="block font-display-lg text-headline-lg font-bold text-on-surface leading-tight">
                      {new Date(apt.date + "T00:00:00").getDate()}
                    </span>
                    <span className="block text-[11px] text-tertiary font-bold">
                      {apt.time}
                    </span>
                  </div>
                </div>

                {/* Serviços listados */}
                <div className="border-t border-b border-outline-variant/10 py-sm space-y-1">
                  <span className="text-[9px] text-outline font-bold uppercase tracking-wider block">Serviços</span>
                  <div className="flex flex-wrap gap-xs pt-1">
                    {apt.services.map((srv, idx) => (
                      <span key={idx} className="bg-surface-container-high px-2 py-1 rounded-lg text-xs font-medium text-on-surface-variant border border-outline-variant/20">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer do Card / Ações */}
                <div className="flex justify-between items-center pt-xs">
                  <div className="text-[10px] text-outline">
                    {apt.price ? `R$ ${apt.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Preço sob consulta"}
                  </div>

                  {activeTab === "active" && !isCancelled && !isCompleted && (
                    <button
                      onClick={() => handleCancel(apt)}
                      disabled={cancellingId === apt.id}
                      className="text-xs bg-error/10 hover:bg-error text-error hover:text-on-error border border-error/20 px-sm py-1.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-xs"
                    >
                      {cancellingId === apt.id ? (
                        <>
                          <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">cancel</span>
                          Cancelar Horário
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
