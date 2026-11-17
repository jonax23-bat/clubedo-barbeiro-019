import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function ManageTeam({ user, navigateTo }) {
  // --- Estados do Componente ---
  const [barbers, setBarbers] = useState([]);
  const [units, setUnits] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberRole, setNewBarberRole] = useState("Master Barber");
  const [newBarberAvatar, setNewBarberAvatar] = useState("");
  const [newBarberBio, setNewBarberBio] = useState("");
  const [newBarberPhone, setNewBarberPhone] = useState("");
  const [selectedUnits, setSelectedUnits] = useState([]);
  
  const [savingBarber, setSavingBarber] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [occupancy, setOccupancy] = useState(0);
  const [morningStatus, setMorningStatus] = useState("Carregando...");
  const [onDutyBarbers, setOnDutyBarbers] = useState("Nenhum");
  const [nextAppointment, setNextAppointment] = useState("Carregando...");
  const [alertsCount, setAlertsCount] = useState("Nenhum");
  const [productivityDays, setProductivityDays] = useState([]);

  // --- Efeito: Carregar Dados ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const bList = await dbService.getBarbers();
      const uList = await dbService.getUnits();
      setBarbers(bList);
      setUnits(uList);

      // Fetch all appointments
      const allApts = await dbService.getAllAppointments();
      
      // Get today's date in YYYY-MM-DD
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const todayApts = allApts.filter(a => a.date === todayStr && a.status !== "cancelled");

      // 1. Occupancy Today
      const activeBarbers = bList.filter(b => b.status !== "off-duty");
      const capacity = Math.max(1, activeBarbers.length) * 16; // 16 slots per barber
      const occVal = Math.min(100, Math.round((todayApts.length / capacity) * 100));
      setOccupancy(occVal);

      // 2. Turno Manhã
      const morningApts = todayApts.filter(a => {
        const hour = parseInt(a.time.split(":")[0]);
        return hour < 12;
      });
      const completedMorning = morningApts.filter(a => a.status === "completed");
      if (morningApts.length > 0) {
        setMorningStatus(`Finalizado (${completedMorning.length}/${morningApts.length})`);
      } else {
        setMorningStatus("Sem agendamentos");
      }

      // 3. No Salão Agora
      const onDuty = bList.filter(b => b.status === "online" || b.status === "busy").map(b => b.name.split(" ")[0]);
      setOnDutyBarbers(onDuty.length > 0 ? onDuty.join(", ") : "Nenhum");

      // 4. Próximo Turno / Próximo Agendamento
      const futureApts = todayApts
        .filter(a => a.status === "scheduled" && a.time >= currentHHMM)
        .sort((a, b) => a.time.localeCompare(b.time));
      if (futureApts.length > 0) {
        setNextAppointment(`${futureApts[0].barberName.split(" ")[0]} (${futureApts[0].time})`);
      } else {
        setNextAppointment("Sem agendamentos");
      }

      // 5. Atenção / Alertas (agendamentos do dia que já passaram do horário mas continuam 'scheduled')
      const lateApts = todayApts.filter(a => a.status === "scheduled" && a.time < currentHHMM);
      if (lateApts.length > 0) {
        setAlertsCount(`${lateApts.length} pendentes`);
      } else {
        setAlertsCount("Sem alertas");
      }

      // 6. Produtividade Semanal (Monday to Saturday)
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);

      const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      const computedProdDays = daysOfWeek.map((dayName, index) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + index);
        
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayDd = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${dayDd}`;

        const dayApts = allApts.filter(a => a.date === dateStr && a.status !== "cancelled");
        const dayActiveBarbers = bList.filter(b => b.status !== "off-duty");
        const dayCapacity = Math.max(1, dayActiveBarbers.length) * 16;
        const dayOccVal = Math.min(100, Math.round((dayApts.length / dayCapacity) * 100));

        const isToday = d.getDate() === now.getDate() && 
                        d.getMonth() === now.getMonth() && 
                        d.getFullYear() === now.getFullYear();

        return {
          name: dayName,
          value: dayOccVal,
          isCurrent: isToday
        };
      });
      setProductivityDays(computedProdDays);

    } catch (e) {
      console.error(e);
    }
  };

  const handleUnitToggle = (unitId) => {
    setSelectedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId) 
        : [...prev, unitId]
    );
  };

  // --- Função para Adicionar Profissional ---
  const handleAddBarber = async (e) => {
    e.preventDefault();
    if (!newBarberName.trim()) return;

    setSavingBarber(true);
    try {
      // 1. Gera credenciais de login e senha temporários
      const creds = dbService.generateBarberCredentials(newBarberName);

      // 2. Prepara dados do barbeiro
      const barberData = {
        name: newBarberName,
        role: newBarberRole,
        avatarUrl: newBarberAvatar.trim() || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60",
        bio: newBarberBio,
        phone: newBarberPhone,
        unitIds: selectedUnits,
        login: creds.login,
        password: creds.password
      };

      // 3. Salva no banco/mock
      const created = await dbService.createBarber(barberData);

      // 4. Configura modal de credenciais
      setGeneratedCredentials({
        name: created.name,
        login: created.login,
        password: created.password
      });
      setShowCredentialsModal(true);

      // Limpa formulário
      setNewBarberName("");
      setNewBarberAvatar("");
      setNewBarberBio("");
      setNewBarberPhone("");
      setSelectedUnits([]);
      setShowAddForm(false);
      loadData();

    } catch (err) {
      console.error(err);
    } finally {
      setSavingBarber(false);
    }
  };

  // --- Função para Excluir Profissional ---
  const handleDeleteBarber = async (uid, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o barbeiro "${name}"? Os agendamentos futuros dele serão cancelados e os clientes serão avisados no painel e por mensagem.`)) {
      return;
    }
    try {
      await dbService.deleteBarber(uid);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCredentials = () => {
    if (!generatedCredentials) return;
    const text = `Acesso Barbeiro - Clubber:\nNome: ${generatedCredentials.name}\nUsuário: ${generatedCredentials.login}\nSenha: ${generatedCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-md">
      
      {/* Resumo Estatístico / Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        
        {/* Card Grande de Métricas */}
        <div className="md:col-span-2 glass-card rounded-xl p-md flex flex-col justify-between">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Gestão de Equipe</h2>
            <p className="text-on-surface-variant font-body-md">Monitoramento em tempo real da performance e turnos dos profissionais.</p>
          </div>
          <div className="flex gap-lg mt-md">
            <div className="flex flex-col">
              <span className="text-display-lg font-display-lg text-tertiary">{barbers.length.toString().padStart(2, "0")}</span>
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">Barbeiros Ativos</span>
            </div>
            <div className="flex flex-col">
              <span className="text-display-lg font-display-lg text-on-surface">{occupancy}%</span>
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">Ocupação Hoje</span>
            </div>
          </div>
        </div>

        {/* Card de Adição de Barbeiro */}
        {showAddForm ? (
          <form onSubmit={handleAddBarber} className="glass-card rounded-xl p-md flex flex-col justify-between space-y-sm max-h-[500px] overflow-y-auto custom-scrollbar">
            <h3 className="font-headline-md text-headline-md text-on-surface">Adicionar Profissional</h3>
            
            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider">Nome *</label>
              <input
                type="text"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                placeholder="Ex: Vitor Santos"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-on-surface focus:outline-none focus:border-tertiary"
                required
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider">Cargo</label>
              <select
                value={newBarberRole}
                onChange={(e) => setNewBarberRole(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-on-surface focus:outline-none focus:border-tertiary"
              >
                <option value="Master Barber">Master Barber</option>
                <option value="Fade Specialist">Fade Specialist</option>
                <option value="Classic Cuts">Classic Cuts</option>
              </select>
            </div>

            <div className="space-y-sm bg-surface-container/30 p-sm rounded-xl border border-outline-variant/10">
              <label className="text-label-sm text-outline uppercase tracking-wider block">Foto de Perfil do Barbeiro</label>
              <div className="flex gap-sm items-center">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container shrink-0">
                  <img 
                    src={newBarberAvatar || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60"} 
                    alt="Preview Barbeiro" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                <div className="flex-1 flex flex-col gap-xs">
                  <label className="bg-tertiary text-on-tertiary px-sm py-1.5 rounded-lg font-bold text-[10px] uppercase cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-xs">
                    <span className="material-symbols-outlined text-xs">upload</span>
                    Enviar Foto
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            try {
                              const uploadedUrl = await dbService.uploadImage(reader.result, "new_barber_avatar");
                              setNewBarberAvatar(uploadedUrl);
                            } catch (err) {
                              console.error("Upload error", err);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={newBarberAvatar}
                    onChange={(e) => setNewBarberAvatar(e.target.value)}
                    placeholder="Cole URL da foto"
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-1 text-[10px] text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider">Bio / Apresentação</label>
              <textarea
                value={newBarberBio}
                onChange={(e) => setNewBarberBio(e.target.value)}
                placeholder="Ex: Especialista em fade há 5 anos..."
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-on-surface focus:outline-none"
                rows="2"
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider">Telefone / WhatsApp</label>
              <input
                type="text"
                value={newBarberPhone}
                onChange={(e) => setNewBarberPhone(e.target.value)}
                placeholder="Ex: (19) 99999-9999"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-on-surface focus:outline-none"
              />
            </div>

            {/* Unidades */}
            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider">Unidades Vinculadas</label>
              <div className="space-y-xs pt-xs">
                {units.map(unit => (
                  <label key={unit.id} className="flex items-center gap-xs text-body-md text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUnits.includes(unit.id)}
                      onChange={() => handleUnitToggle(unit.id)}
                      className="rounded border-outline-variant/30 text-tertiary focus:ring-tertiary"
                    />
                    <span>{unit.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit" 
                disabled={savingBarber}
                className="flex-1 bg-tertiary text-on-tertiary font-bold p-2 rounded text-label-md uppercase active:scale-95 transition-transform"
              >
                {savingBarber ? "Salvando..." : "Salvar"}
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="flex-1 border border-outline-variant text-on-surface p-2 rounded text-label-md uppercase"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div 
            onClick={() => setShowAddForm(true)}
            className="glass-card rounded-xl p-md flex flex-col items-center justify-center text-center group cursor-pointer border-dashed border-2 border-outline-variant/30 hover:border-tertiary/50 transition-all min-h-[180px]"
          >
            <div className="w-16 h-16 rounded-full bg-tertiary/10 flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-tertiary text-4xl">person_add</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Adicionar Barbeiro</h3>
            <p className="text-label-sm text-on-surface-variant mt-xs">Expandir a equipe da Royal Blade</p>
          </div>
        )}

      </section>

      {/* Modal de Credenciais Geradas */}
      {showCredentialsModal && generatedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-md">
          <div className="bg-surface-container p-lg rounded-2xl border border-outline-variant/30 max-w-[400px] w-full space-y-md shadow-2xl relative animate-scale-in">
            <h3 className="font-headline-md text-headline-md text-tertiary flex items-center gap-xs">
              <span className="material-symbols-outlined">vpn_key</span>
              Acesso do Profissional
            </h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              O barbeiro <strong>{generatedCredentials.name}</strong> foi cadastrado! Repasse as credenciais geradas abaixo para que ele possa acessar seu perfil e agenda.
            </p>
            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant/20 space-y-sm">
              <div>
                <span className="text-label-sm text-on-surface-variant block uppercase font-bold text-[10px]">Usuário</span>
                <span className="font-mono text-on-surface text-body-lg font-bold select-all">{generatedCredentials.login}</span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block uppercase font-bold text-[10px]">Senha Provisória</span>
                <span className="font-mono text-on-surface text-body-lg font-bold select-all">{generatedCredentials.password}</span>
              </div>
            </div>
            <div className="flex gap-sm pt-sm">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 bg-tertiary text-on-tertiary py-sm rounded-xl font-headline-md text-headline-md flex items-center justify-center gap-xs active:scale-95 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">{copied ? "done" : "content_copy"}</span>
                {copied ? "Copiado!" : "Copiar Acesso"}
              </button>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="px-lg py-sm border border-outline-variant/30 text-on-surface font-headline-md text-headline-md rounded-xl hover:bg-surface-variant transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Status em Tempo Real */}
      <section className="glass-card rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-on-surface">Status de Hoje</h3>
          <div className="flex gap-sm">
            <span className="flex items-center gap-xs text-label-sm text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-green-400 status-glow-online"></span> Online
            </span>
            <span className="flex items-center gap-xs text-label-sm text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary status-glow-busy"></span> Em Serviço
            </span>
          </div>
        </div>
        <div className="p-md grid grid-cols-2 md:grid-cols-4 gap-md">
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">Turno Manhã</span>
            <p className="font-bold text-on-surface">{morningStatus}</p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">No Salão Agora</span>
            <p className="font-bold text-tertiary">{onDutyBarbers}</p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">Próximo Agendamento</span>
            <p className="font-bold text-on-surface">{nextAppointment}</p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">Atenção</span>
            <p className="font-bold text-error">{alertsCount}</p>
          </div>
        </div>
      </section>

      {/* Grid de Barbeiros da Equipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {barbers.map((barber) => {
          const isBusy = barber.status === "busy";
          const isOnline = barber.status === "online";
          const isOff = barber.status === "off-duty";

          const barberUnits = units.filter(u => barber.unitIds && barber.unitIds.includes(u.id));

          return (
            <div key={barber.uid} className="glass-card rounded-xl p-md flex flex-col justify-between space-y-md">
              
              <div className="space-y-sm">
                {/* Header do Card com Status */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-md">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-xl overflow-hidden ${isOff ? "opacity-60" : ""}`}>
                        {barber.avatarUrl ? (
                          <img src={barber.avatarUrl} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline text-3xl">person</span>
                          </div>
                        )}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface-container-high ${
                        isBusy ? "bg-tertiary status-glow-busy" : isOnline ? "bg-green-400 status-glow-online" : "bg-surface-variant"
                      }`}></span>
                    </div>
                    <div>
                      <h4 className="font-headline-md text-headline-md text-on-surface">{barber.name}</h4>
                      <p className="text-label-sm text-tertiary">{barber.role}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 uppercase tracking-tighter ${
                        isBusy ? "bg-tertiary/10 text-tertiary" : isOnline ? "bg-green-400/10 text-green-400" : "bg-surface-variant/30 text-outline"
                      }`}>
                        {isBusy ? "Em Serviço" : isOnline ? "Disponível" : "Off-duty"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBarber(barber.uid, barber.name)}
                    className="text-outline hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-full transition-all duration-200"
                    title="Excluir Barbeiro"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>

                {/* Exibição das Unidades Vinculadas */}
                <div className="flex flex-wrap gap-xs pt-xs">
                  {barberUnits.length > 0 ? (
                    barberUnits.map(bu => (
                      <span key={bu.id} className="bg-surface-container-highest text-on-surface-variant text-[10px] px-2 py-0.5 rounded-md border border-outline-variant/10">
                        📍 {bu.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-on-surface-variant italic">Sem unidades vinculadas</span>
                  )}
                </div>

                {/* Bio do Barbeiro */}
                {barber.bio && (
                  <p className="text-xs text-on-surface-variant font-body-sm italic leading-relaxed pt-xs">
                    "{barber.bio}"
                  </p>
                )}
              </div>

              <div className="space-y-base">
                {/* Estatísticas Rápidas */}
                <div className="grid grid-cols-2 gap-sm pt-base">
                  <div className="bg-surface-container-low p-sm rounded-lg border border-outline-variant/10">
                    <div className="flex items-center gap-xs text-tertiary mb-xs">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-label-md font-bold">{(barber.rating || 5).toFixed(1)}</span>
                    </div>
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-tighter">Avaliação</p>
                  </div>
                  <div className="bg-surface-container-low p-sm rounded-lg border border-outline-variant/10">
                    <p className="text-on-surface font-bold text-lg">{barber.cutsThisMonth || 0}</p>
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-tighter">Cortes / Mês</p>
                  </div>
                </div>

                {/* Progresso de Metas */}
                <div className="space-y-xs">
                  <div className="flex justify-between text-label-sm">
                    <span className="text-on-surface-variant">Progresso Meta Mensal</span>
                    <span className="text-on-surface">{barber.goalProgress || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isOff ? "bg-outline" : "bg-gradient-to-r from-tertiary to-tertiary-fixed xp-bar-glow"}`} 
                      style={{ width: `${barber.goalProgress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Gráfico de Produtividade */}
      <section className="glass-card rounded-xl p-md space-y-md">
        <h3 className="font-headline-md text-headline-md text-on-surface">Produtividade da Semana (Ocupação Média)</h3>
        <div className="h-48 flex items-end justify-between gap-base px-md pt-6">
          {productivityDays.map((day, index) => (
            <div 
              key={index} 
              className="flex-1 bg-surface-variant rounded-t-lg relative group transition-all duration-300 hover:brightness-110"
              style={{ height: `${day.value}%` }}
            >
              <div className={`absolute inset-0 transition-all rounded-t-lg ${
                day.isCurrent ? "bg-tertiary xp-bar-glow" : "bg-tertiary/20 group-hover:bg-tertiary/40"
              }`}></div>
              <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-label-sm ${
                day.isCurrent ? "text-tertiary font-bold" : "text-on-surface-variant"
              }`}>
                {day.name}
              </span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
