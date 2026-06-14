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
  const [selectedUnits, setSelectedUnits] = useState([]);
  
  const [savingBarber, setSavingBarber] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // --- Dados de Produtividade Semanal (Gráfico de Barras) ---
  const productivityDays = [
    { name: "Seg", value: 40, isCurrent: false },
    { name: "Ter", value: 65, isCurrent: false },
    { name: "Qua", value: 85, isCurrent: true },
    { name: "Qui", value: 75, isCurrent: false },
    { name: "Sex", value: 95, isCurrent: false },
    { name: "Sab", value: 100, isCurrent: false }
  ];

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
              <span className="text-display-lg font-display-lg text-on-surface">92%</span>
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

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider">Foto de Perfil (URL)</label>
              <input
                type="text"
                value={newBarberAvatar}
                onChange={(e) => setNewBarberAvatar(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-on-surface focus:outline-none"
              />
              {newBarberAvatar.trim() && (
                <div className="flex justify-center pt-xs">
                  <img src={newBarberAvatar} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-outline-variant/30" />
                </div>
              )}
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
            <p className="font-bold text-on-surface">Finalizado (3/3)</p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">No Salão Agora</span>
            <p className="font-bold text-tertiary">Marcus, Leo, Rodrigo</p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">Próximo Turno</span>
            <p className="font-bold text-on-surface">Vitor (16:00)</p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase text-on-surface-variant">Atenção</span>
            <p className="font-bold text-error">1 Folga Pendente</p>
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
