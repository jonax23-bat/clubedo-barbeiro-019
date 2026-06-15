import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function ClientProfile({ user, navigateTo, refreshUser }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [clients, setClients] = useState([]);
  const [planRequests, setPlanRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("my_profile"); // my_profile | manage_clients | manage_plans | plan_requests
  
  // My profile edit fields
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isEditingSelf, setIsEditingSelf] = useState(false);

  // Client registration fields
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAvatar, setNewClientAvatar] = useState("");
  const [newClientPlan, setNewClientPlan] = useState("");
  const [newClientXp, setNewClientXp] = useState(0);
  const [newClientCoins, setNewClientCoins] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  // Client editing fields
  const [editingClientUid, setEditingClientUid] = useState(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientAvatar, setEditClientAvatar] = useState("");
  const [editClientPlan, setEditClientPlan] = useState("");
  const [editClientXp, setEditClientXp] = useState(0);
  const [editClientCoins, setEditClientCoins] = useState(0);

  // Plan Prices adjustments
  // Plan Prices adjustments
  const [planConfigs, setPlanConfigs] = useState({
    "Plano Classic": { price: 70, xpBonus: 100, benefits: [] },
    "Plano VIP": { price: 120, xpBonus: 500, benefits: [] },
    "Plano Master": { price: 180, xpBonus: 800, benefits: [] }
  });
  const [classicPrice, setClassicPrice] = useState(70);
  const [vipPrice, setVipPrice] = useState(120);
  const [masterPrice, setMasterPrice] = useState(180);

  const [classicXpBonus, setClassicXpBonus] = useState(100);
  const [vipXpBonus, setVipXpBonus] = useState(500);
  const [masterXpBonus, setMasterXpBonus] = useState(800);

  const [newClassicBenefit, setNewClassicBenefit] = useState("");
  const [newVipBenefit, setNewVipBenefit] = useState("");
  const [newMasterBenefit, setNewMasterBenefit] = useState("");

  // Dropdown mapping client.uid -> planName
  const [selectedPlanForClient, setSelectedPlanForClient] = useState({});

  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();

    // Escuta alterações em tempo real dos clientes se Firebase real estiver ativo
    let unsubscribe = null;
    let unsubscribeRequests = null;
    if (dbService.isRealFirebase()) {
      unsubscribe = dbService.listenToClients((clientList) => {
        setClients(clientList);
      });
      unsubscribeRequests = dbService.listenToPlanRequests((requestsList) => {
        setPlanRequests(requestsList);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, [user]);

  const loadData = async () => {
    const u = await dbService.getUser(user.uid);
    if (u) {
      setCurrentUser(u);
      setEditName(u.name || "");
      setEditAvatar(u.avatarUrl || "");
      setEditEmail(u.email || "");
    }
    const allClients = await dbService.getClients();
    setClients(allClients);

    const allRequests = await dbService.getPlanRequests();
    setPlanRequests(allRequests);

    const configs = await dbService.getPlanConfigs();
    if (configs) {
      setPlanConfigs(configs);
      setClassicPrice(configs["Plano Classic"]?.price || 70);
      setVipPrice(configs["Plano VIP"]?.price || 120);
      setMasterPrice(configs["Plano Master"]?.price || 180);
      setClassicXpBonus(configs["Plano Classic"]?.xpBonus || 100);
      setVipXpBonus(configs["Plano VIP"]?.xpBonus || 500);
      setMasterXpBonus(configs["Plano Master"]?.xpBonus || 800);
    }
  };

  // Auto-calculate XP bonuses on price changes (Economic Sustainability Rule)
  useEffect(() => {
    const calculateXp = (p) => {
      const priceVal = parseFloat(p) || 0;
      return Math.max(Math.round(priceVal * 1.5), Math.round(priceVal * 6.4 - 340));
    };
    setClassicXpBonus(calculateXp(classicPrice));
  }, [classicPrice]);

  useEffect(() => {
    const calculateXp = (p) => {
      const priceVal = parseFloat(p) || 0;
      return Math.max(Math.round(priceVal * 1.5), Math.round(priceVal * 6.4 - 340));
    };
    setVipXpBonus(calculateXp(vipPrice));
  }, [vipPrice]);

  useEffect(() => {
    const calculateXp = (p) => {
      const priceVal = parseFloat(p) || 0;
      return Math.max(Math.round(priceVal * 1.5), Math.round(priceVal * 6.4 - 340));
    };
    setMasterXpBonus(calculateXp(masterPrice));
  }, [masterPrice]);

  const getSubscriptionStatus = (client) => {
    if (!client.plan || !client.subscriptionStartDate) {
      return { status: "Inativo", label: "Sem assinatura", daysLeft: 0 };
    }
    const start = new Date(client.subscriptionStartDate);
    const duration = 31 * 24 * 60 * 60 * 1000; // 31 dias em ms
    const expiration = new Date(start.getTime() + duration);
    const now = new Date();
    const diff = expiration.getTime() - now.getTime();

    if (diff <= 0) {
      return { status: "Inativo", label: "Expirado", daysLeft: 0 };
    }

    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return { status: "Ativo", label: `${daysLeft} dia(s) restante(s)`, daysLeft };
  };

  const handleAddBenefit = (planName, text) => {
    if (!text.trim()) return;
    setPlanConfigs(prev => ({
      ...prev,
      [planName]: {
        ...prev[planName],
        benefits: [...(prev[planName]?.benefits || []), text.trim()]
      }
    }));
    if (planName === "Plano Classic") setNewClassicBenefit("");
    else if (planName === "Plano VIP") setNewVipBenefit("");
    else if (planName === "Plano Master") setNewMasterBenefit("");
  };

  const handleRemoveBenefit = (planName, index) => {
    setPlanConfigs(prev => ({
      ...prev,
      [planName]: {
        ...prev[planName],
        benefits: (prev[planName]?.benefits || []).filter((_, idx) => idx !== index)
      }
    }));
  };

  const handleUpdatePlanPrices = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const updated = {
        "Plano Classic": { 
          price: Number(classicPrice), 
          xpBonus: Number(classicXpBonus), 
          benefits: planConfigs["Plano Classic"].benefits || [] 
        },
        "Plano VIP": { 
          price: Number(vipPrice), 
          xpBonus: Number(vipXpBonus), 
          benefits: planConfigs["Plano VIP"].benefits || [] 
        },
        "Plano Master": { 
          price: Number(masterPrice), 
          xpBonus: Number(masterXpBonus), 
          benefits: planConfigs["Plano Master"].benefits || [] 
        }
      };
      await dbService.updatePlanConfigs(updated);
      setPlanConfigs(updated);
      setMessage({ type: "success", text: "Configurações dos planos atualizadas com sucesso!" });
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao atualizar configurações dos planos." });
    }
  };

  const handleUpdateSelf = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await dbService.updateClient(currentUser.uid, {
        name: editName,
        avatarUrl: editAvatar,
        email: editEmail
      });
      setIsEditingSelf(false);
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      loadData();
      if (refreshUser) refreshUser();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao atualizar perfil." });
    }
  };

  const handleRegisterClient = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!newClientName.trim()) return;

    try {
      await dbService.createClient({
        name: newClientName,
        email: newClientEmail,
        avatarUrl: newClientAvatar,
        plan: newClientPlan || null,
        xp: parseInt(newClientXp) || 0,
        coins: parseInt(newClientCoins) || 0
      });
      setNewClientName("");
      setNewClientEmail("");
      setNewClientAvatar("");
      setNewClientPlan("");
      setNewClientXp(0);
      setNewClientCoins(0);
      setShowAddForm(false);
      setMessage({ type: "success", text: "Cliente cadastrado com sucesso!" });
      loadData();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao cadastrar cliente." });
    }
  };

  const handleStartEditClient = (client) => {
    setEditingClientUid(client.uid);
    setEditClientName(client.name || "");
    setEditClientEmail(client.email || "");
    setEditClientAvatar(client.avatarUrl || "");
    setEditClientPlan(client.plan || "");
    setEditClientXp(client.xp || 0);
    setEditClientCoins(client.coins || 0);
  };

  const handleSaveClientEdit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await dbService.updateClient(editingClientUid, {
        name: editClientName,
        email: editClientEmail,
        avatarUrl: editClientAvatar,
        plan: editClientPlan || null,
        xp: parseInt(editClientXp) || 0,
        coins: parseInt(editClientCoins) || 0
      });
      setEditingClientUid(null);
      setMessage({ type: "success", text: "Dados do cliente atualizados!" });
      loadData();
      if (editingClientUid === currentUser.uid && refreshUser) {
        refreshUser();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao atualizar dados do cliente." });
    }
  };

  const renderPlanCard = (planName, price, setPrice, xpBonus, setXpBonus, newBenefitText, setNewBenefitText, borderClass) => {
    const benefits = planConfigs[planName]?.benefits || [];
    return (
      <div className={`glass-card p-md rounded-xl border border-outline-variant/10 flex flex-col justify-between ${borderClass} space-y-md`}>
        <div className="space-y-sm">
          <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">{planName}</h4>
          
          {/* Preço */}
          <div className="space-y-1">
            <label className="text-label-sm text-on-surface-variant block font-semibold">Preço Mensal</label>
            <div className="flex items-center gap-xs">
              <span className="text-xs font-semibold text-outline">R$</span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-sm text-xs font-bold text-on-surface focus:outline-none focus:border-tertiary"
                required
              />
            </div>
          </div>

          {/* XP Bonus */}
          <div className="space-y-1">
            <label className="text-label-sm text-on-surface-variant block font-semibold">Bônus de XP</label>
            <div className="flex items-center gap-xs">
              <input
                type="number"
                min="0"
                value={xpBonus}
                disabled
                className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-sm text-xs font-bold text-on-surface focus:outline-none focus:border-tertiary disabled:opacity-75 disabled:cursor-not-allowed"
                required
              />
              <span className="text-xs font-semibold text-outline">XP</span>
            </div>
            <span className="text-[10px] text-outline mt-1 block leading-tight">
              Calculado automaticamente para sustentabilidade econômica.
            </span>
          </div>

          {/* Benefícios */}
          <div className="space-y-xs pt-sm border-t border-outline-variant/10">
            <label className="text-label-sm text-on-surface block font-bold">Itens do Plano</label>
            
            {benefits.length === 0 ? (
              <p className="text-[11px] text-outline italic">Nenhum benefício cadastrado.</p>
            ) : (
              <ul className="space-y-xs max-h-48 overflow-y-auto pr-xs">
                {benefits.map((benefit, idx) => (
                  <li key={idx} className="flex justify-between items-center gap-sm bg-surface-container-low/50 border border-outline-variant/5 p-xs pl-sm rounded-lg">
                    <span className="text-xs text-on-surface-variant break-words flex-1 pr-1 font-body-sm">
                      {benefit}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(planName, idx)}
                      className="text-error hover:bg-error/10 p-1 rounded transition-colors flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Adicionar Benefício */}
            <div className="flex gap-xs pt-xs">
              <input
                type="text"
                placeholder="Novo benefício..."
                value={newBenefitText}
                onChange={(e) => setNewBenefitText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddBenefit(planName, newBenefitText);
                  }
                }}
                className="flex-1 bg-surface-container border border-outline-variant/30 rounded-lg p-xs pl-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-tertiary"
              />
              <button
                type="button"
                onClick={() => handleAddBenefit(planName, newBenefitText)}
                className="bg-tertiary text-on-tertiary p-xs px-sm rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            <p className="text-[10px] text-outline">
              Use <code className="text-tertiary bg-tertiary/10 px-1 rounded font-mono">**texto**</code> para destacar em negrito.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const isOwner = currentUser.role === "owner";

  return (
    <div className="space-y-md">
      
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            {isOwner ? "Gestão de Clientes" : "Meu Perfil"}
          </h2>
          <p className="text-on-surface-variant font-body-md">
            {isOwner 
              ? "Cadastre, edite e gerencie o perfil dos clientes da barbearia."
              : "Gerencie suas informações de conta, fotos e visualize sua assinatura."}
          </p>
        </div>
      </section>

      {/* Tabs Switcher se for dono */}
      {isOwner && (
        <div className="flex border-b border-outline-variant/20 gap-md">
          <button
            onClick={() => { setActiveTab("my_profile"); setMessage(null); }}
            className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
              activeTab === "my_profile" ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            Meu Perfil Pessoal
            {activeTab === "my_profile" && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("manage_clients"); setMessage(null); }}
            className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
              activeTab === "manage_clients" ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            Gerenciar Clientes ({clients.length})
            {activeTab === "manage_clients" && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("manage_plans"); setMessage(null); }}
            className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
              activeTab === "manage_plans" ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            Ajustar Planos
            {activeTab === "manage_plans" && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("plan_requests"); setMessage(null); }}
            className={`pb-sm font-label-md text-label-md uppercase tracking-wider relative transition-all ${
              activeTab === "plan_requests" ? "text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            Solicitações de Planos ({planRequests.filter(r => r.status === "pending").length})
            {activeTab === "plan_requests" && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-tertiary rounded-full animate-scale-in"></span>
            )}
          </button>
        </div>
      )}

      {/* Feedback Messages */}
      {message && (
        <div className={`p-md rounded-xl border flex items-center gap-sm max-w-3xl ${
          message.type === "success" 
            ? "bg-green-500/10 border-green-500/30 text-green-400" 
            : "bg-error/10 border-error/30 text-error"
        }`}>
          <span className="material-symbols-outlined">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          <span className="font-body-md font-bold">{message.text}</span>
        </div>
      )}

      {/* TABA: MEU PERFIL (Para todos) */}
      {activeTab === "my_profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          
          {/* Card Visual do Perfil */}
          <div className="lg:col-span-5 space-y-md">
            <div className="glass-card p-md rounded-xl flex flex-col items-center text-center space-y-md border border-outline-variant/10">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-tertiary/60">
                  <img 
                    src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60"} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>

              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">{currentUser.name}</h3>
                <p className="text-xs text-outline font-mono">{currentUser.email}</p>
                <span className="inline-block bg-tertiary/10 border border-tertiary/20 text-tertiary text-[10px] px-3 py-1 rounded-full font-bold uppercase mt-sm">
                  {currentUser.role === "client" ? "Cliente" : currentUser.role === "barber" ? "Barbeiro Staff" : "Proprietário"}
                </span>
              </div>

              <div className="w-full border-t border-outline-variant/10 pt-md grid grid-cols-2 gap-sm text-center">
                <div className="bg-surface-container/30 border border-outline-variant/10 p-sm rounded-lg">
                  <span className="text-[10px] text-outline uppercase tracking-wider block">Saldo de XP</span>
                  <strong className="text-tertiary font-mono text-sm">{(currentUser.xp || 0).toLocaleString()} XP</strong>
                </div>
                <div className="bg-surface-container/30 border border-outline-variant/10 p-sm rounded-lg">
                  <span className="text-[10px] text-outline uppercase tracking-wider block">Moedas</span>
                  <strong className="text-on-surface font-mono text-sm">{(currentUser.coins || 0).toLocaleString()} Moedas</strong>
                </div>
              </div>

              <div className="w-full bg-surface-container-low/40 p-md rounded-xl border border-outline-variant/10 text-left space-y-xs">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Assinatura Atual:</span>
                  <strong className={currentUser.plan ? "text-green-400" : "text-error"}>
                    {currentUser.plan || "Sem plano ativo"}
                  </strong>
                </div>
                {currentUser.subscriptionStartDate && (
                  <div className="flex justify-between text-[11px] text-outline">
                    <span>Membro desde:</span>
                    <span>{new Date(currentUser.subscriptionStartDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form de Edição */}
          <div className="lg:col-span-7">
            <div className="glass-card p-md rounded-xl space-y-md">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface">Dados Cadastrais</h3>
                {!isEditingSelf && (
                  <button 
                    onClick={() => setIsEditingSelf(true)}
                    className="text-xs text-tertiary font-bold hover:underline flex items-center gap-[2px]"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span> Editar Perfil
                  </button>
                )}
              </div>

              <form onSubmit={handleUpdateSelf} className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Nome</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={!isEditingSelf}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary disabled:opacity-50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">E-mail</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={!isEditingSelf}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary disabled:opacity-50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm text-on-surface-variant block">URL da Foto de Perfil</label>
                  <input 
                    type="url" 
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    disabled={!isEditingSelf}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary disabled:opacity-50"
                    placeholder="https://exemplo.com/sua-foto.jpg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm text-on-surface-variant block font-semibold">Plano de Assinatura</label>
                  <div className="w-full bg-surface-container/50 border border-outline-variant/30 rounded-lg p-md text-xs text-outline font-semibold select-none">
                    {currentUser.plan ? `${currentUser.plan}` : "Nenhum Plano (Não assinante)"}
                  </div>
                </div>

                {isEditingSelf && (
                  <div className="flex gap-sm justify-end pt-sm">
                    <button 
                      type="button" 
                      onClick={() => { setIsEditingSelf(false); loadData(); }}
                      className="px-md py-2 border border-outline-variant rounded-lg text-xs font-bold uppercase hover:bg-surface-variant"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="bg-tertiary text-on-tertiary px-lg py-2 rounded-lg text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

        </div>
      )}

      {/* TABA: GERENCIAR CLIENTES (Apenas para Owner/Marcus) */}
      {isOwner && activeTab === "manage_clients" && (
        <div className="space-y-md">
          
          {/* Ações Rápidas */}
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Lista de Clientes Cadastrados</h3>
            <button 
              onClick={() => { setShowAddForm(!showAddForm); setEditingClientUid(null); }}
              className="bg-tertiary text-on-tertiary px-md py-sm rounded-lg font-bold hover:brightness-110 transition-all text-xs uppercase flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-xs">{showAddForm ? "close" : "add"}</span>
              {showAddForm ? "Fechar" : "Cadastrar Cliente"}
            </button>
          </div>

          {/* Form para Cadastrar Novo Cliente */}
          {showAddForm && (
            <div className="glass-card p-md md:p-lg rounded-xl border border-tertiary/20 max-w-5xl space-y-md animate-scale-in">
              <h4 className="font-headline-md text-label-md text-tertiary uppercase tracking-wider font-bold">Novo Cliente</h4>
              <form onSubmit={handleRegisterClient} className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Nome do Cliente *</label>
                    <input 
                      type="text" 
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                      placeholder="Ricardo Silva"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">E-mail *</label>
                    <input 
                      type="email" 
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                      placeholder="ricardo.silva@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Plano Inicial</label>
                    <select 
                      value={newClientPlan}
                      onChange={(e) => setNewClientPlan(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    >
                      <option value="">Sem plano ativo (Não assinante)</option>
                      <option value="Plano Classic">Plano Classic</option>
                      <option value="Plano VIP">Plano VIP</option>
                      <option value="Plano Master">Plano Master</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">XP Inicial (Opcional)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newClientXp}
                      onChange={(e) => setNewClientXp(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Coins Inicial (Opcional)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newClientCoins}
                      onChange={(e) => setNewClientCoins(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm text-on-surface-variant block">Foto de Perfil URL (Opcional)</label>
                  <input 
                    type="url" 
                    value={newClientAvatar}
                    onChange={(e) => setNewClientAvatar(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    placeholder="https://exemplo.com/avatar.jpg"
                  />
                </div>

                <div className="flex gap-sm justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="px-md py-2 border border-outline-variant rounded-lg text-xs font-bold uppercase hover:bg-surface-variant"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-tertiary text-on-tertiary px-lg py-2 rounded-lg text-xs font-bold uppercase hover:brightness-110"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Form de Edição de Cliente Selecionado */}
          {editingClientUid && (
            <div className="glass-card p-md md:p-lg rounded-xl border border-tertiary/40 max-w-5xl space-y-md animate-scale-in">
              <h4 className="font-headline-md text-label-md text-tertiary uppercase tracking-wider font-bold">Editar Dados do Cliente</h4>
              <form onSubmit={handleSaveClientEdit} className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Nome do Cliente</label>
                    <input 
                      type="text" 
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">E-mail</label>
                    <input 
                      type="email" 
                      value={editClientEmail}
                      onChange={(e) => setEditClientEmail(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Plano</label>
                    <select 
                      value={editClientPlan}
                      onChange={(e) => setEditClientPlan(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    >
                      <option value="">Sem plano ativo (Não assinante)</option>
                      <option value="Plano Classic">Plano Classic</option>
                      <option value="Plano VIP">Plano VIP</option>
                      <option value="Plano Master">Plano Master</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">XP</label>
                    <input 
                      type="number" 
                      min="0"
                      value={editClientXp}
                      onChange={(e) => setEditClientXp(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-on-surface-variant block">Coins</label>
                    <input 
                      type="number" 
                      min="0"
                      value={editClientCoins}
                      onChange={(e) => setEditClientCoins(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm text-on-surface-variant block">Foto de Perfil URL</label>
                  <input 
                    type="url" 
                    value={editClientAvatar}
                    onChange={(e) => setEditClientAvatar(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-md text-xs text-on-surface focus:outline-none focus:border-tertiary"
                  />
                </div>

                <div className="flex gap-sm justify-end">
                  <button 
                    type="button" 
                    onClick={() => setEditingClientUid(null)}
                    className="px-md py-2 border border-outline-variant rounded-lg text-xs font-bold uppercase hover:bg-surface-variant"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-tertiary text-on-tertiary px-lg py-2 rounded-lg text-xs font-bold uppercase hover:brightness-110"
                  >
                    Salvar Dados
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabela de Clientes (Desktop e Tablet) */}
          <div className="hidden md:block glass-card rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                  <tr>
                    <th className="px-md py-sm">Foto</th>
                    <th className="px-md py-sm">Cliente / E-mail</th>
                    <th className="px-md py-sm">Plano / Status / Validade</th>
                    <th className="px-md py-sm">XP / Coins</th>
                    <th className="px-md py-sm text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {clients.map(client => {
                    const statusInfo = getSubscriptionStatus(client);
                    const currentSelectedPlan = selectedPlanForClient[client.uid] || client.plan || "Plano Classic";

                    return (
                      <tr key={client.uid} className="hover:bg-surface-variant/10 transition-colors">
                        {/* 1. Foto */}
                        <td className="px-md py-md">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/25">
                            <img 
                              src={client.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60"} 
                              alt={client.name} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </td>
                        
                        {/* 2. Cliente e E-mail mesclados */}
                        <td className="px-md py-md">
                          <div className="font-bold text-on-surface flex items-center gap-xs flex-wrap">
                            {client.name}
                            {client.uid === currentUser.uid && (
                              <span className="text-[9px] bg-tertiary/10 border border-tertiary/20 text-tertiary px-2 py-0.5 rounded-full font-bold">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-outline font-mono mt-0.5">{client.email}</div>
                        </td>

                        {/* 3. Plano, Status e Validade mesclados */}
                        <td className="px-md py-md">
                          <div className="flex flex-wrap gap-xs items-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${
                              client.plan 
                                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                : "bg-surface-variant/50 border-outline-variant/20 text-outline"
                            }`}>
                              {client.plan || "Sem plano"}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${
                              statusInfo.status === "Ativo"
                                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                : "bg-error/10 border-error/20 text-error"
                            }`}>
                              {statusInfo.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-on-surface-variant font-semibold mt-1">
                            {statusInfo.label}
                          </div>
                        </td>

                        {/* 4. XP / Coins */}
                        <td className="px-md py-md text-xs">
                          <div className="font-mono text-tertiary font-bold">{client.xp.toLocaleString()} XP</div>
                          <div className="font-mono text-on-surface-variant text-[11px]">{client.coins.toLocaleString()} Coins</div>
                        </td>

                        {/* 5. Ações compactadas */}
                        <td className="px-md py-md text-right">
                          <div className="flex flex-wrap items-center gap-xs justify-end">
                            <div className="flex items-center gap-1">
                              <select
                                value={currentSelectedPlan}
                                onChange={(e) => setSelectedPlanForClient({ ...selectedPlanForClient, [client.uid]: e.target.value })}
                                className="bg-surface-container border border-outline-variant/30 rounded px-1 py-1 text-xs text-on-surface focus:outline-none focus:border-tertiary"
                              >
                                <option value="Plano Classic">Classic</option>
                                <option value="Plano VIP">VIP</option>
                                <option value="Plano Master">Master</option>
                              </select>
                              <button
                                onClick={async () => {
                                  try {
                                    await dbService.subscribeToPlan(client.uid, currentSelectedPlan);
                                    setMessage({ type: "success", text: `Plano ${currentSelectedPlan} liberado por 31 dias para ${client.name}!` });
                                    loadData();
                                    if (refreshUser) refreshUser();
                                  } catch (err) {
                                    setMessage({ type: "error", text: "Erro ao ativar plano para o cliente." });
                                  }
                                }}
                                className="bg-tertiary text-on-tertiary text-[10px] font-bold px-2.5 py-1.5 rounded border border-tertiary/30 uppercase hover:brightness-110 active:scale-95 transition-all shrink-0"
                              >
                                Liberar
                              </button>
                            </div>
                            <button 
                              onClick={() => { handleStartEditClient(client); setShowAddForm(false); }}
                              className="px-2 py-1 bg-surface-container-high border border-outline-variant/30 rounded text-xs font-semibold text-tertiary hover:bg-surface-bright flex items-center gap-[2px] active:scale-95 transition-transform"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista de Clientes em Cards (Mobile) */}
          <div className="block md:hidden space-y-md">
            {clients.map(client => {
              const statusInfo = getSubscriptionStatus(client);
              const currentSelectedPlan = selectedPlanForClient[client.uid] || client.plan || "Plano Classic";
              return (
                <div key={client.uid} className="glass-card rounded-xl p-md border border-outline-variant/10 space-y-sm">
                  <div className="flex items-center gap-sm">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/25 shrink-0">
                      <img 
                        src={client.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60"} 
                        alt={client.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-on-surface text-sm flex items-center gap-xs flex-wrap">
                        {client.name}
                        {client.uid === currentUser.uid && (
                          <span className="text-[9px] bg-tertiary/10 border border-tertiary/20 text-tertiary px-2 py-0.5 rounded-full font-bold">
                            Você
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-outline font-mono truncate">{client.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-sm text-xs pt-xs border-t border-outline-variant/10">
                    <div>
                      <span className="text-[10px] text-outline uppercase tracking-wider block">Plano</span>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-tighter mt-1 ${
                        client.plan 
                          ? "bg-green-500/10 border-green-500/20 text-green-400" 
                          : "bg-surface-variant/50 border-outline-variant/20 text-outline"
                      }`}>
                        {client.plan || "Sem plano"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-outline uppercase tracking-wider block">Status</span>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-tighter mt-1 ${
                        statusInfo.status === "Ativo"
                          ? "bg-green-500/10 border-green-500/20 text-green-400" 
                          : "bg-error/10 border-error/20 text-error"
                      }`}>
                        {statusInfo.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-sm text-xs pt-xs border-t border-outline-variant/10">
                    <div>
                      <span className="text-[10px] text-outline uppercase tracking-wider block">Validade</span>
                      <span className="text-on-surface font-semibold block mt-1">{statusInfo.label}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-outline uppercase tracking-wider block">XP / Coins</span>
                      <span className="text-tertiary font-mono font-bold block mt-1">{client.xp.toLocaleString()} XP</span>
                      <span className="text-on-surface-variant font-mono text-[10px] block">{client.coins.toLocaleString()} Coins</span>
                    </div>
                  </div>

                  <div className="pt-sm border-t border-outline-variant/10 flex flex-col gap-sm">
                    <div className="flex flex-col sm:flex-row gap-xs">
                      <select
                        value={currentSelectedPlan}
                        onChange={(e) => setSelectedPlanForClient({ ...selectedPlanForClient, [client.uid]: e.target.value })}
                        className="bg-surface-container border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary flex-1"
                      >
                        <option value="Plano Classic">Plano Classic</option>
                        <option value="Plano VIP">Plano VIP</option>
                        <option value="Plano Master">Plano Master</option>
                      </select>
                      <button
                        onClick={async () => {
                          try {
                            await dbService.subscribeToPlan(client.uid, currentSelectedPlan);
                            setMessage({ type: "success", text: `Plano ${currentSelectedPlan} liberado por 31 dias para ${client.name}!` });
                            loadData();
                            if (refreshUser) refreshUser();
                          } catch (err) {
                            setMessage({ type: "error", text: "Erro ao ativar plano para o cliente." });
                          }
                        }}
                        className="bg-tertiary text-on-tertiary text-xs font-bold px-md py-sm rounded border border-tertiary/30 uppercase tracking-tighter hover:brightness-110 active:scale-95 transition-all shadow"
                      >
                        Liberar 31 dias
                      </button>
                    </div>
                    <button 
                      onClick={() => { handleStartEditClient(client); setShowAddForm(false); }}
                      className="w-full py-2 bg-surface-container-high border border-outline-variant/30 rounded text-xs font-semibold text-tertiary hover:bg-surface-bright flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      Editar Cadastro
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TABA: AJUSTAR VALORES DOS PLANOS (Apenas para Owner) */}
      {isOwner && activeTab === "manage_plans" && (
        <div className="glass-card p-md rounded-xl border border-outline-variant/10 max-w-5xl space-y-md">
          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface">Configurar Planos de Assinatura</h3>
            <span className="material-symbols-outlined text-tertiary text-2xl">settings_applications</span>
          </div>

          <form onSubmit={handleUpdatePlanPrices} className="space-y-md">
            <p className="text-xs text-on-surface-variant">
              Modifique os valores mensais, o bônus de XP e a lista de benefícios incluídos em cada assinatura. As alterações serão refletidas na tela de planos pública.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              {renderPlanCard(
                "Plano Classic", 
                classicPrice, 
                setClassicPrice, 
                classicXpBonus, 
                setClassicXpBonus, 
                newClassicBenefit, 
                setNewClassicBenefit, 
                "border-l-4 border-l-outline-variant"
              )}
              {renderPlanCard(
                "Plano VIP", 
                vipPrice, 
                setVipPrice, 
                vipXpBonus, 
                setVipXpBonus, 
                newVipBenefit, 
                setNewVipBenefit, 
                "border-l-4 border-l-tertiary"
              )}
              {renderPlanCard(
                "Plano Master", 
                masterPrice, 
                setMasterPrice, 
                masterXpBonus, 
                setMasterXpBonus, 
                newMasterBenefit, 
                setNewMasterBenefit, 
                "border-l-4 border-l-on-surface"
              )}
            </div>

            <div className="flex justify-end pt-md">
              <button
                type="submit"
                className="bg-tertiary text-on-tertiary px-lg py-2 rounded-lg text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs shadow-md shadow-tertiary/15"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABA: SOLICITAÇÕES DE PLANOS PENDENTES (Apenas para Owner) */}
      {isOwner && activeTab === "plan_requests" && (
        <div className="space-y-md animate-scale-in">
          <h3 className="font-headline-md text-headline-md text-on-surface">Solicitações de Planos Pendentes</h3>
          <p className="text-xs text-on-surface-variant">
            Abaixo estão as solicitações de planos enviadas pelos clientes. Valide se o pagamento foi efetuado antes de liberar o plano manualmente.
          </p>

          {planRequests.filter(req => req.status === "pending").length === 0 ? (
            <div className="glass-card p-lg text-center border border-outline-variant/10 rounded-xl">
              <span className="material-symbols-outlined text-4xl text-outline mb-sm">inbox</span>
              <p className="text-on-surface-variant font-body-md">Nenhuma solicitação de plano pendente no momento.</p>
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                    <tr>
                      <th className="p-md text-xs">Cliente</th>
                      <th className="p-md text-xs">E-mail</th>
                      <th className="p-md text-xs">Plano Solicitado</th>
                      <th className="p-md text-xs">Valor</th>
                      <th className="p-md text-xs">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {planRequests.filter(req => req.status === "pending").map((req) => (
                      <tr key={req.id} className="hover:bg-surface-container/20 transition-colors">
                        <td className="p-md text-xs font-semibold text-on-surface">{req.userName}</td>
                        <td className="p-md text-xs font-mono text-on-surface-variant">{req.userEmail}</td>
                        <td className="p-md text-xs">
                          <span className="bg-tertiary/10 border border-tertiary/20 text-tertiary text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                            {req.planName}
                          </span>
                        </td>
                        <td className="p-md text-xs font-mono font-bold text-on-surface">R$ {req.price}</td>
                        <td className="p-md text-xs">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                setMessage(null);
                                try {
                                  await dbService.approvePlanSubscription(req.id);
                                  setMessage({ type: "success", text: `Assinatura do plano ${req.planName} para ${req.userName} liberada com sucesso!` });
                                  loadData();
                                  if (refreshUser) refreshUser();
                                } catch (err) {
                                  setMessage({ type: "error", text: "Erro ao aprovar a solicitação." });
                                }
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] uppercase flex items-center gap-1 shadow"
                            >
                              <span className="material-symbols-outlined text-xs">check</span>
                              Aprovar
                            </button>
                            <button
                              onClick={async () => {
                                setMessage(null);
                                try {
                                  await dbService.rejectPlanSubscription(req.id);
                                  setMessage({ type: "success", text: `Solicitação do plano ${req.planName} para ${req.userName} recusada.` });
                                  loadData();
                                } catch (err) {
                                  setMessage({ type: "error", text: "Erro ao recusar a solicitação." });
                                }
                              }}
                              className="bg-error hover:bg-error/80 text-white px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] uppercase flex items-center gap-1 shadow"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                              Recusar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
