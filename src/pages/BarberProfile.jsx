import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function BarberProfile({ user, navigateTo, refreshUser, initialTab = "overview" }) {
  // --- Estados do Componente ---
  const [activeTab, setActiveTab] = useState(initialTab); // overview | settings
  const [selectedDay, setSelectedDay] = useState("Quarta-feira");
  const [specialties, setSpecialties] = useState([]);
  const [barberData, setBarberData] = useState(user);
  const [appointments, setAppointments] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [retentionRate, setRetentionRate] = useState(0);
  const [cutsThisMonth, setCutsThisMonth] = useState(0);

  // --- Estados de Edição ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState(user.bio || "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(user.avatarUrl || "");

  // --- Estados de Segurança ---
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [editLogin, setEditLogin] = useState(user.login || "");
  const [editPassword, setEditPassword] = useState(user.password || "");

  // --- Estados de Configuração da Agenda (Item 9) ---
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [schedStart, setSchedStart] = useState("09:00");
  const [schedEnd, setSchedEnd] = useState("19:00");
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [schedInterval, setSchedInterval] = useState(15);

  // --- Estados do Chat de Mensagens ---
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState("");

  // --- Estados do Cadastro de Serviços ---
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30 min");
  const [newServiceIcon, setNewServiceIcon] = useState("content_cut");
  const [newServiceType, setNewServiceType] = useState("regular");

  const [saving, setSaving] = useState(false);

  // --- Efeito: Carregar Dados ---
  useEffect(() => {
    if (user && user.uid) {
      loadBarberData();
    }
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadBarberData = async () => {
    try {
      // Puxa do dbService os dados mais recentes do barbeiro
      const barbersList = await dbService.getBarbers();
      const currentBarber = barbersList.find(b => b.uid === user.uid) || user;
      
      setBarberData(currentBarber);
      setEditBio(currentBarber.bio || "");
      setEditAvatarUrl(currentBarber.avatarUrl || "");
      setEditLogin(currentBarber.login || "");
      setEditPassword(currentBarber.password || "");
      
      const config = await dbService.getBarberScheduleConfig(user.uid);
      if (config) {
        setSchedStart(config.start || "09:00");
        setSchedEnd(config.end || "19:00");
        setLunchStart(config.lunchStart || "12:00");
        setLunchEnd(config.lunchEnd || "13:00");
        setSchedInterval(config.interval || 15);
      }

      const specs = await dbService.getBarberSpecialties(user.uid);
      setSpecialties(specs);
      
      const clientList = await dbService.getClients();
      setClients(clientList);

      const allServices = await dbService.getServices();
      const apts = await dbService.getBarberAppointments(user.uid);
      setAppointments(apts);

      // --- Cálculo da Receita Mensal e Cortes do Mês ---
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // ex: "2026-06"
      
      const completedThisMonth = apts.filter(apt => 
        apt.status === "completed" && 
        apt.date && apt.date.startsWith(currentYearMonth)
      );
      
      setCutsThisMonth(completedThisMonth.length);

      let revenueSum = 0;
      for (const apt of completedThisMonth) {
        let aptPrice = 0;
        for (const serviceName of (apt.services || [])) {
          const s = allServices.find(item => item.name === serviceName);
          if (s) {
            aptPrice += s.price || 0;
          } else {
            aptPrice += 80; // fallback
          }
        }
        if (aptPrice === 0) aptPrice = 80;
        revenueSum += aptPrice;
      }
      setMonthlyRevenue(revenueSum);

      // --- Cálculo da Taxa de Retenção ---
      const completedAllTime = apts.filter(apt => apt.status === "completed");
      const clientApptCounts = {};
      completedAllTime.forEach(apt => {
        if (apt.clientUid) {
          clientApptCounts[apt.clientUid] = (clientApptCounts[apt.clientUid] || 0) + 1;
        }
      });
      
      const totalUniqueClients = Object.keys(clientApptCounts).length;
      const recurringClients = Object.values(clientApptCounts).filter(count => count >= 2).length;
      
      let calculatedRetention = 0;
      if (totalUniqueClients > 0) {
        calculatedRetention = Math.round((recurringClients / totalUniqueClients) * 100);
      }
      setRetentionRate(calculatedRetention);

    } catch (e) {
      console.error(e);
    }
  };

  // --- Handlers de Atualização ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dbService.updateBarberProfile(user.uid, {
        bio: editBio,
        avatarUrl: editAvatarUrl
      });
      setIsEditingProfile(false);
      await loadBarberData();
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dbService.updateBarberCredentials(user.uid, {
        login: editLogin,
        password: editPassword
      });
      setIsEditingSecurity(false);
      await loadBarberData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScheduleConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dbService.updateBarberScheduleConfig(user.uid, {
        start: schedStart,
        end: schedEnd,
        lunchStart,
        lunchEnd,
        interval: parseInt(schedInterval)
      });
      setIsEditingSchedule(false);
      await loadBarberData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // --- Handlers para Modal de Mensagens/Chat ---
  const handleOpenMessagesModal = async () => {
    setShowMessagesModal(true);
    const clientList = await dbService.getClients();
    setClients(clientList);
    if (clientList.length > 0) {
      const ricardo = clientList.find(c => c.uid === "ricardo_uid") || clientList[0];
      handleSelectClient(ricardo);
    }
  };

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    const msgHistory = await dbService.getMessages(user.uid, client.uid);
    setChatMessages(msgHistory);
  };

  const handleSendChatMsg = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim() || !selectedClient) return;

    try {
      const sentMsg = await dbService.sendMessage(
        user.uid,
        user.name,
        selectedClient.uid,
        selectedClient.name,
        newMsgText
      );
      setChatMessages(prev => [...prev, sentMsg]);
      setNewMsgText("");
    } catch (err) {
      console.error("Erro ao enviar mensagem", err);
    }
  };

  // --- Handlers para Modal de Cadastro de Serviços ---
  const handleOpenServiceModal = () => {
    setShowServiceModal(true);
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServicePrice) return;

    try {
      const newSpec = {
        name: newServiceName,
        price: parseFloat(newServicePrice),
        time: newServiceDuration,
        icon: newServiceIcon,
        type: newServiceType
      };

      const updatedSpecs = await dbService.addBarberSpecialty(user.uid, newSpec);
      setSpecialties(updatedSpecs);

      await dbService.createService({
        name: newServiceName,
        price: parseFloat(newServicePrice),
        duration: newServiceDuration,
        icon: newServiceIcon,
        type: newServiceType
      });

      setShowServiceModal(false);
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDuration("30 min");
      setNewServiceIcon("content_cut");
      setNewServiceType("regular");
    } catch (err) {
      console.error("Erro ao criar serviço", err);
    }
  };

  const handleConfirmPresence = async (aptId) => {
    try {
      await dbService.confirmClientPresence(aptId);
      await loadBarberData();
      if (refreshUser) refreshUser();
    } catch (err) {
      alert("Erro ao confirmar presença: " + err.message);
    }
  };

  const handleCancelAppointment = async (aptId) => {
    if (window.confirm("Deseja realmente cancelar este agendamento?")) {
      try {
        await dbService.cancelAppointment(aptId);
        await loadBarberData();
      } catch (err) {
        alert("Erro ao cancelar agendamento: " + err.message);
      }
    }
  };

  const weeklySchedule = [
    { day: "Segunda-feira", shift: `${schedStart} - ${schedEnd}`, interval: `${lunchStart} - ${lunchEnd}`, status: "Active" },
    { day: "Terça-feira", shift: `${schedStart} - ${schedEnd}`, interval: `${lunchStart} - ${lunchEnd}`, status: "Active" },
    { day: "Quarta-feira", shift: `${schedStart} - ${schedEnd}`, interval: `${lunchStart} - ${lunchEnd}`, status: "Duty" },
    { day: "Quinta-feira", shift: `${schedStart} - ${schedEnd}`, interval: `${lunchStart} - ${lunchEnd}`, status: "Active" },
    { day: "Sexta-feira", shift: "Folga", interval: "-", status: "Off" }
  ];

  const isOwnProfile = user.uid === barberData.uid;

  return (
    <div className="p-gutter lg:p-lg max-w-container-max mx-auto space-y-lg">
      
      {/* Perfil Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-end">
        <div className="lg:col-span-4 relative group">
          <div className="aspect-square rounded-2xl overflow-hidden border-2 border-outline-variant/30 glow-amber transition-transform duration-500 hover:scale-[1.02]">
            <img 
              alt={barberData.name} 
              className="w-full h-full object-cover" 
              src={barberData.avatarUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60"}
            />
          </div>
          <div className="absolute -bottom-4 -right-4 bg-tertiary text-on-tertiary px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              workspace_premium
            </span>
            <span className="font-label-md uppercase tracking-wider">{barberData.role || "Professional"}</span>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-md pb-xs">
          <div className="space-y-xs">
            <h1 className="font-display-lg text-display-lg text-on-surface mb-2">{barberData.name}</h1>
            {barberData.bio && (
              <p className="text-body-md text-on-surface-variant italic max-w-xl">"{barberData.bio}"</p>
            )}
            <p className="font-body-lg text-on-surface-variant flex items-center gap-2 pt-xs">
              <span className="material-symbols-outlined text-tertiary">location_on</span>
              <span>Expediente: {schedStart} às {schedEnd} (Almoço: {lunchStart} - {lunchEnd})</span>
            </p>
          </div>
          
          <div className="flex gap-sm w-full md:w-auto">
            {isOwnProfile && (
              <button 
                onClick={handleOpenMessagesModal}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-secondary-container/30 border border-outline-variant text-on-surface px-md py-sm rounded-lg font-bold hover:bg-secondary-container/50 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">mail</span>
                Mensagens
              </button>
            )}
            <button 
              onClick={() => navigateTo("schedule")}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-tertiary text-on-tertiary px-md py-sm rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-tertiary/10"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              Agendar
            </button>
          </div>
        </div>
      </section>

      {/* KPI Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="glass-card p-md rounded-xl space-y-base border-l-4 border-tertiary">
          <p className="text-label-sm uppercase text-on-surface-variant font-bold tracking-widest">Receita Mensal</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">R$ {monthlyRevenue}</h3>
            <span className="text-tertiary font-bold text-label-md">Este mês</span>
          </div>
          <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-tertiary to-tertiary-fixed-dim w-[85%] rounded-full xp-bar-glow"></div>
          </div>
        </div>

        <div className="glass-card p-md rounded-xl space-y-base border-l-4 border-primary">
          <p className="text-label-sm uppercase text-on-surface-variant font-bold tracking-widest">Avaliação Média</p>
          <div className="flex items-center gap-2">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">{(barberData.rating || 4.9).toFixed(1)}</h3>
            <div className="flex text-tertiary">
              {[1, 2, 3, 4].map(star => (
                <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              ))}
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
            </div>
          </div>
          <p className="text-label-sm text-on-surface-variant">Baseado em {cutsThisMonth} cortes este mês</p>
        </div>

        <div className="glass-card p-md rounded-xl space-y-base border-l-4 border-outline">
          <p className="text-label-sm uppercase text-on-surface-variant font-bold tracking-widest">Taxa de Retenção</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">{retentionRate}%</h3>
            <span className="material-symbols-outlined text-tertiary">trending_up</span>
          </div>
          <p className="text-label-sm text-on-surface-variant">Fidelidade de clientes recorrentes</p>
        </div>
      </section>

      {/* Abas de Navegação (Apenas para o próprio barbeiro) */}
      {isOwnProfile && (
        <div className="flex border-b border-outline-variant/10 gap-md pb-1 mb-md">
          <button
            type="button"
            onClick={() => navigateTo("barber_profile")}
            className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-xs ${
              activeTab === "overview"
                ? "border-tertiary text-tertiary font-bold"
                : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Agenda e Atendimentos
          </button>
          <button
            type="button"
            onClick={() => navigateTo("barber_settings")}
            className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-xs ${
              activeTab === "settings"
                ? "border-tertiary text-tertiary font-bold"
                : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            Configurações
          </button>
        </div>
      )}

      {/* Seção Principal: Info, Agenda e Configurações */}
      {(!isOwnProfile || activeTab === "overview") ? (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          
          {/* Lado Esquerdo: Escala ou Configurações */}
          <div className="lg:col-span-8 space-y-md">
          
          {/* Agenda de Atendimentos / Confirmação de Presença (Módulo B) */}
          {isOwnProfile && (
            <div className="glass-card p-md rounded-xl space-y-md border border-outline-variant/10">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-tertiary">calendar_today</span>
                Agenda de Atendimentos
              </h3>
              
              {appointments.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic py-sm">Nenhum agendamento encontrado para você.</p>
              ) : (
                <div className="space-y-sm">
                  {appointments.map((apt) => {
                    const isScheduled = apt.status === "scheduled";
                    const isCompleted = apt.status === "completed";
                    const isCancelled = apt.status === "cancelled";
                    
                    return (
                      <div 
                        key={apt.id} 
                        className={`p-sm rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-sm border transition-all ${
                          isCompleted 
                            ? "bg-green-500/5 border-green-500/10 opacity-80" 
                            : isCancelled 
                              ? "bg-red-500/5 border-red-500/10 opacity-60" 
                              : "bg-surface-container border-outline-variant/20 hover:border-tertiary/30"
                        }`}
                      >
                        <div className="space-y-xs">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-on-surface">{apt.clientName}</strong>
                            <span className="text-[10px] text-outline">• {apt.time} ({new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'})})</span>
                          </div>
                          <p className="text-xs text-on-surface-variant">{apt.services.join(", ")}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-tertiary">+{apt.xpBonus || 100} XP</span>
                            {apt.isGoldenHour && (
                              <span className="bg-tertiary/15 text-tertiary px-1 rounded">Golden Hour</span>
                            )}
                            <span className={`px-1 rounded font-semibold ${
                              isCompleted 
                                ? "bg-green-500/20 text-green-400" 
                                : isCancelled 
                                  ? "bg-red-500/20 text-red-400" 
                                  : "bg-blue-500/20 text-blue-400"
                            }`}>
                              {isCompleted ? "Concluído" : isCancelled ? "Cancelado" : "Agendado"}
                            </span>
                          </div>
                        </div>
                        
                        {isScheduled && (
                          <div className="flex gap-xs mt-xs md:mt-0">
                            <button
                              onClick={() => handleConfirmPresence(apt.id)}
                              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-2 rounded transition-colors active:scale-95 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Confirmar Presença
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(apt.id)}
                              className="border border-outline-variant hover:bg-red-500/10 text-on-surface hover:text-red-400 text-xs font-bold px-3 py-2 rounded transition-colors active:scale-95 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}



          {/* Escala Semanal de Trabalho */}
          <div className="space-y-md pt-base">
            <h3 className="font-headline-md text-headline-md text-on-surface">Escala de Expediente</h3>
            <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                    <tr>
                      <th className="px-md py-sm">Dia</th>
                      <th className="px-md py-sm">Turno</th>
                      <th className="px-md py-sm">Intervalo Almoço</th>
                      <th className="px-md py-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {weeklySchedule.map((item, index) => {
                      const isDuty = item.status === "Duty";
                      const isOff = item.status === "Off";

                      return (
                        <tr 
                          key={index} 
                          onClick={() => setSelectedDay(item.day)}
                          className={`hover:bg-surface-variant/20 transition-colors cursor-pointer ${
                            isDuty ? "border-l-4 border-tertiary" : ""
                          } ${selectedDay === item.day ? "bg-surface-variant/30" : ""}`}
                        >
                          <td className={`px-md py-md font-bold ${isDuty ? "text-tertiary" : "text-on-surface"}`}>
                            {item.day} {isDuty && "(Hoje)"}
                          </td>
                          <td className={`px-md py-md ${isOff ? "text-outline" : "text-on-surface-variant"}`}>
                            {item.shift}
                          </td>
                          <td className={`px-md py-md ${isOff ? "text-outline" : "text-on-surface-variant"}`}>
                            {item.interval}
                          </td>
                          <td className="px-md py-md">
                            {isDuty ? (
                              <span className="bg-tertiary text-on-tertiary px-3 py-1 rounded-full text-label-sm font-bold shadow-sm glow-amber">
                                Plantão
                              </span>
                            ) : isOff ? (
                              <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full text-label-sm">
                                Indisponível
                              </span>
                            ) : (
                              <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-label-sm border border-green-500/20">
                                Ativo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Depoimentos e Avaliações Recentes */}
          <div className="space-y-md pt-base">
            <h3 className="font-headline-md text-headline-md text-on-surface">Depoimentos e Avaliações</h3>
            <div className="space-y-sm">
              {[
                {
                  id: "rev_1",
                  clientUid: "ricardo_uid",
                  clientName: "Ricardo",
                  rating: 5,
                  comment: "Melhor corte de Curitiba. O profissional é extremamente detalhista no acabamento e o atendimento é impecável!",
                  date: "2026-06-03"
                },
                {
                  id: "rev_2",
                  clientUid: "rafael_souza",
                  clientName: "Rafael Souza",
                  rating: 5,
                  comment: "Espaço sensacional e profissionais altamente qualificados. O degradê com pigmentação ficou de primeira.",
                  date: "2026-05-28"
                },
                {
                  id: "rev_3",
                  clientUid: "leo_castro",
                  clientName: "Leo Castro",
                  rating: 4,
                  comment: "Muito bom atendimento, horário pontual e cerveja cortesia gelada. Recomendo muito o plano VIP.",
                  date: "2026-05-15"
                }
              ].map((rev) => {
                const clientObj = clients.find(c => c.uid === rev.clientUid);
                const lvlInfo = clientObj ? dbService.getUserLevel(clientObj) : null;

                return (
                  <div key={rev.id} className="glass-card p-md rounded-xl space-y-xs border border-outline-variant/10">
                    <div className="flex justify-between items-start flex-wrap gap-sm">
                      <div className="flex items-center gap-sm">
                        {clientObj?.avatarUrl ? (
                          <img src={clientObj.avatarUrl} alt={rev.clientName} className="w-8 h-8 rounded-full object-cover border border-outline-variant/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/10">
                            <span className="material-symbols-outlined text-[16px]">person</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-xs text-on-surface">{rev.clientName}</strong>
                            {lvlInfo && (
                              <span 
                                className="inline-flex items-center gap-1 bg-tertiary-container/20 text-tertiary border border-tertiary/20 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                title={`${lvlInfo.nome} (Nível ${lvlInfo.nivel})`}
                              >
                                <span>{lvlInfo.badge}</span>
                                <span>{lvlInfo.nome}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-outline">{new Date(rev.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="flex text-tertiary">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                        {Array.from({ length: 5 - rev.rating }).map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-sm">star</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed pl-10">"{rev.comment}"</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Lado Direito: Especialidades / Serviços */}
        <div className="lg:col-span-4 space-y-md">
          <h3 className="font-headline-md text-headline-md text-on-surface">Serviços Habilitados</h3>
          
          <div className="space-y-sm">
            {specialties.map((spec, index) => {
              const isSpecialist = spec.type === "specialist";

              return (
                <div 
                  key={index} 
                  className={`glass-card p-sm rounded-lg flex items-center justify-between group cursor-default hover:border-tertiary/30 transition-colors ${
                    isSpecialist ? "border-l-2 border-tertiary/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-sm">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                      isSpecialist ? "bg-tertiary/10" : "bg-surface-variant"
                    }`}>
                      <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: isSpecialist ? "'FILL' 1" : "'FILL' 0" }}>
                        {spec.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md font-bold text-on-surface">{spec.name}</p>
                      <p className={`text-label-sm ${isSpecialist ? "text-tertiary" : "text-on-surface-variant"}`}>
                        {spec.time} • {typeof spec.price === "number" ? `R$ ${spec.price}` : spec.price}
                      </p>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined ${isSpecialist ? "text-tertiary" : "text-on-surface-variant group-hover:text-tertiary"} transition-colors`}>
                    {isSpecialist ? "stars" : "check_circle"}
                  </span>
                </div>
              );
            })}
          </div>

          {isOwnProfile && (
            <button 
              onClick={handleOpenServiceModal}
              className="w-full py-sm rounded-lg border border-dashed border-outline-variant text-on-surface-variant hover:text-tertiary hover:border-tertiary transition-all text-label-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Cadastrar Novo Serviço
            </button>
          )}
        </div>

      </section>
      ) : (
        /* Seção de Configurações (Apenas para o próprio barbeiro) */
        <section className="space-y-md animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            
            {/* Card 1: Editar Perfil (Bio & Avatar) */}
            <div className="glass-card p-md rounded-xl space-y-md border border-outline-variant/10">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary">edit_square</span>
                  Meu Perfil
                </h3>
                {!isEditingProfile ? (
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="text-tertiary text-label-sm font-bold uppercase hover:underline"
                  >
                    Editar
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="text-outline text-label-sm uppercase hover:underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="space-y-sm text-body-md text-on-surface-variant">
                  <p><strong>Bio:</strong> {barberData.bio || "Nenhuma biografia cadastrada."}</p>
                  <p className="truncate"><strong>Foto:</strong> <span className="text-xs text-outline">{barberData.avatarUrl}</span></p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-sm">
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Biografia</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Escreva sobre sua experiência..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      rows="3"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">URL da Foto de Perfil</label>
                    <input
                      type="text"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg"
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-tertiary text-on-tertiary font-bold py-2 rounded text-label-sm uppercase shadow-md active:scale-95 transition-transform"
                  >
                    {saving ? "Salvando..." : "Salvar Perfil"}
                  </button>
                </form>
              )}
            </div>

            {/* Card 2: Segurança & Acesso */}
            <div className="glass-card p-md rounded-xl space-y-md border border-outline-variant/10">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary">lock</span>
                  Segurança
                </h3>
                {!isEditingSecurity ? (
                  <button 
                    onClick={() => setIsEditingSecurity(true)}
                    className="text-tertiary text-label-sm font-bold uppercase hover:underline"
                  >
                    Alterar
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingSecurity(false)}
                    className="text-outline text-label-sm uppercase hover:underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {!isEditingSecurity ? (
                <div className="space-y-sm text-body-md text-on-surface-variant">
                  <p><strong>Usuário de Acesso:</strong> <span className="font-mono">{barberData.login}</span></p>
                  <p><strong>Senha:</strong> <span className="font-mono">••••••••</span></p>
                </div>
              ) : (
                <form onSubmit={handleSaveSecurity} className="space-y-sm">
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Usuário</label>
                    <input
                      type="text"
                      value={editLogin}
                      onChange={(e) => setEditLogin(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Nova Senha</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-tertiary text-on-tertiary font-bold py-2 rounded text-label-sm uppercase shadow-md active:scale-95 transition-transform"
                  >
                    {saving ? "Salvando..." : "Atualizar Acesso"}
                  </button>
                </form>
              )}
            </div>

            {/* Card 3: Configuração de Agenda */}
            <div className="glass-card p-md rounded-xl space-y-md border border-outline-variant/10 md:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary">schedule</span>
                  Configuração de Agenda (Motor Inteligente)
                </h3>
                {!isEditingSchedule ? (
                  <button 
                    onClick={() => setIsEditingSchedule(true)}
                    className="text-tertiary text-label-sm font-bold uppercase hover:underline"
                  >
                    Configurar
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingSchedule(false)}
                    className="text-outline text-label-sm uppercase hover:underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {!isEditingSchedule ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-body-md text-on-surface-variant">
                  <div>
                    <span className="text-[10px] text-outline block uppercase tracking-wider">Início Expediente</span>
                    <strong className="text-on-surface text-body-lg">{schedStart}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block uppercase tracking-wider">Fim Expediente</span>
                    <strong className="text-on-surface text-body-lg">{schedEnd}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block uppercase tracking-wider">Intervalo Almoço</span>
                    <strong className="text-on-surface text-body-lg">{lunchStart} - {lunchEnd}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block uppercase tracking-wider">Slot (Minutos)</span>
                    <strong className="text-on-surface text-body-lg">{schedInterval} min</strong>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveScheduleConfig} className="grid grid-cols-1 md:grid-cols-5 gap-sm items-end">
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Início Expediente</label>
                    <select value={schedStart} onChange={(e) => setSchedStart(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-xs text-xs text-on-surface focus:outline-none">
                      {["07:00", "08:00", "09:00", "10:00", "11:00"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Fim Expediente</label>
                    <select value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-xs text-xs text-on-surface focus:outline-none">
                      {["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Início Almoço</label>
                    <select value={lunchStart} onChange={(e) => setLunchStart(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-xs text-xs text-on-surface focus:outline-none">
                      {["11:30", "12:00", "12:30", "13:00", "13:30", "14:00"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Fim Almoço</label>
                    <select value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-xs text-xs text-on-surface focus:outline-none">
                      {["12:30", "13:00", "13:30", "14:00", "14:30", "15:00"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Intervalo (Mins)</label>
                    <select value={schedInterval} onChange={(e) => setSchedInterval(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-xs text-xs text-on-surface focus:outline-none">
                      {[15, 30, 45, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-5 pt-xs">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="w-full bg-tertiary text-on-tertiary font-bold py-2 rounded text-label-sm uppercase shadow-md active:scale-95 transition-transform"
                    >
                      {saving ? "Salvando..." : "Salvar Configuração de Agenda"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Card 4: Serviços Habilitados */}
            <div className="glass-card p-md rounded-xl space-y-md border border-outline-variant/10 md:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary">content_cut</span>
                  Serviços Habilitados
                </h3>
                {isOwnProfile && (
                  <button 
                    onClick={handleOpenServiceModal}
                    className="text-tertiary text-label-sm font-bold uppercase hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Cadastrar Novo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                {specialties.map((spec, index) => {
                  const isSpecialist = spec.type === "specialist";

                  return (
                    <div 
                      key={index} 
                      className={`p-sm rounded-lg flex items-center justify-between group bg-surface-container border border-outline-variant/20 hover:border-tertiary/30 transition-colors ${
                        isSpecialist ? "border-l-2 border-tertiary/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-sm">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                          isSpecialist ? "bg-tertiary/10" : "bg-surface-variant"
                        }`}>
                          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: isSpecialist ? "'FILL' 1" : "'FILL' 0" }}>
                            {spec.icon}
                          </span>
                        </div>
                        <div>
                          <p className="font-body-md font-bold text-on-surface">{spec.name}</p>
                          <p className={`text-label-sm ${isSpecialist ? "text-tertiary" : "text-on-surface-variant"}`}>
                            {spec.time} • {typeof spec.price === "number" ? `R$ ${spec.price}` : spec.price}
                          </p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined ${isSpecialist ? "text-tertiary" : "text-on-surface-variant group-hover:text-tertiary"} transition-colors`}>
                        {isSpecialist ? "stars" : "check_circle"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* Modal de Mensagens / Chat com Clientes */}
      {showMessagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col md:flex-row overflow-hidden border border-outline-variant/30">
            
            {/* Barra lateral - Lista de Clientes */}
            <div className="w-full md:w-80 border-r border-outline-variant/20 flex flex-col bg-surface-container-low h-1/3 md:h-full">
              <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-high">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Conversas</h3>
                <span className="bg-tertiary/20 text-tertiary px-2 py-0.5 rounded text-xs font-bold">{clients.length} Clientes</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/10">
                {clients.map((client) => {
                  const isSelected = selectedClient?.uid === client.uid;
                  return (
                    <button
                      key={client.uid}
                      onClick={() => handleSelectClient(client)}
                      className={`w-full p-md text-left flex items-center gap-sm transition-all hover:bg-surface-variant/20 ${
                        isSelected ? "bg-tertiary/10 border-l-4 border-tertiary" : ""
                      }`}
                    >
                      <img src={client.avatarUrl} alt={client.name} className="w-10 h-10 rounded-full object-cover border border-outline-variant/15" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-label-md font-bold truncate ${isSelected ? "text-tertiary" : "text-on-surface"}`}>{client.name}</p>
                        <p className="text-xs text-on-surface-variant truncate">{client.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Container Principal do Chat */}
            <div className="flex-1 flex flex-col h-2/3 md:h-full bg-surface-container-lowest">
              {selectedClient ? (
                <>
                  {/* Cabeçalho do Chat */}
                  <div className="p-md border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
                    <div className="flex items-center gap-sm">
                      <img src={selectedClient.avatarUrl} alt={selectedClient.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="font-label-md font-bold text-on-surface">{selectedClient.name}</h4>
                        <span className="text-[10px] text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Conectado
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowMessagesModal(false)}
                      className="text-on-surface-variant hover:text-tertiary p-1 rounded-full hover:bg-surface-variant/20"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Histórico de Mensagens */}
                  <div className="flex-1 p-md overflow-y-auto custom-scrollbar space-y-md bg-gradient-to-b from-surface/20 to-surface-variant/5">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-xs text-on-surface-variant italic pt-lg">Nenhuma mensagem trocada ainda. Comece a conversa abaixo!</p>
                    ) : (
                      chatMessages.map((msg) => {
                        const isBarber = msg.senderUid === user.uid;
                        return (
                          <div key={msg.id} className={`flex ${isBarber ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl p-md shadow-md text-xs relative ${
                              isBarber 
                                ? "bg-tertiary text-on-tertiary rounded-tr-none" 
                                : "bg-surface-container-high text-on-surface rounded-tl-none border border-outline-variant/10"
                            }`}>
                              <p className="font-bold text-[10px] opacity-75 mb-1">{isBarber ? "Você" : msg.senderName}</p>
                              <p className="body-sm leading-relaxed">{msg.content}</p>
                              <p className="text-[9px] opacity-60 text-right mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Form de Input */}
                  <form onSubmit={handleSendChatMsg} className="p-md border-t border-outline-variant/20 flex gap-sm bg-surface-container-low">
                    <input
                      type="text"
                      placeholder="Digite sua mensagem para o cliente..."
                      value={newMsgText}
                      onChange={(e) => setNewMsgText(e.target.value)}
                      className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-md py-3 text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-tertiary text-on-tertiary px-lg rounded-xl font-bold hover:brightness-110 active:scale-95 duration-150 transition-all flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-lg text-center">
                  <span className="material-symbols-outlined text-outline text-6xl mb-md">chat</span>
                  <p className="text-on-surface-variant font-label-md">Selecione um cliente ao lado para iniciar o atendimento</p>
                  <button 
                    onClick={() => setShowMessagesModal(false)}
                    className="text-tertiary font-bold hover:underline mt-sm"
                  >
                    Fechar Conversas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novos Serviços */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden border border-outline-variant/30">
            <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-high">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Gerar Novo Serviço</h3>
              <button 
                onClick={() => setShowServiceModal(false)}
                className="text-on-surface-variant hover:text-tertiary p-1 rounded-full hover:bg-surface-variant/20"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-md space-y-md bg-surface-container-lowest">
              <div className="space-y-xs">
                <label className="text-xs font-bold text-outline uppercase">Nome do Serviço</label>
                <input
                  type="text"
                  placeholder="Ex: Degradê Navalhado com Toalha Quente"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <label className="text-xs font-bold text-outline uppercase">Preço (R$)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="70"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    required
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-xs font-bold text-outline uppercase">Duração</label>
                  <select
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                  >
                    <option value="15 min">15 min</option>
                    <option value="25 min">25 min</option>
                    <option value="30 min">30 min</option>
                    <option value="45 min">45 min</option>
                    <option value="50 min">50 min</option>
                    <option value="60 min">60 min</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <label className="text-xs font-bold text-outline uppercase">Tipo</label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                  >
                    <option value="regular">Regular</option>
                    <option value="specialist">Especialista</option>
                  </select>
                </div>
                <div className="space-y-xs">
                  <label className="text-xs font-bold text-outline uppercase">Ícone</label>
                  <select
                    value={newServiceIcon}
                    onChange={(e) => setNewServiceIcon(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                  >
                    <option value="content_cut">Tesoura</option>
                    <option value="face">Rosto</option>
                    <option value="brush">Pincel</option>
                    <option value="clean_hands">Mãos</option>
                    <option value="local_bar">Copo/Cerveja</option>
                  </select>
                </div>
              </div>

              <div className="pt-sm flex gap-sm">
                <button
                  type="submit"
                  className="flex-1 bg-tertiary text-on-tertiary font-bold py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase"
                >
                  Salvar Serviço
                </button>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface font-bold py-3 rounded-lg hover:bg-surface-variant active:scale-95 transition-all text-xs uppercase"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
