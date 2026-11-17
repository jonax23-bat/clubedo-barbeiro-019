import { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function ManageUnits() {
  const [units, setUnits] = useState([]);
  const [barbers, setBarbers] = useState([]);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [hidePlans, setHidePlans] = useState(false);
  
  // Barber assignment state
  const [selectedUnitForBarbers, setSelectedUnitForBarbers] = useState(null);
  const [saving, setSaving] = useState(false);

  // Plans per unit state
  const [editingPlansForUnit, setEditingPlansForUnit] = useState(null);
  const [unitPlanData, setUnitPlanData] = useState({});
  const [savingPlans, setSavingPlans] = useState(false);

  const DEFAULT_PLANS = {
    "Plano Classic": { price: 70, xpBonus: 100 },
    "Plano VIP":     { price: 120, xpBonus: 500 },
    "Plano Master":  { price: 180, xpBonus: 800 }
  };

  const loadData = async () => {
    try {
      const uList = await dbService.getUnits();
      const bList = await dbService.getBarbers();
      setUnits(uList);
      setBarbers(bList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setSaving(true);
    try {
      const unitData = {
        name,
        address,
        phone,
        instagram,
        logoUrl: logoUrl.trim() || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60",
        hidePlans
      };

      if (editingUnitId) {
        await dbService.updateUnit(editingUnitId, unitData);
      } else {
        await dbService.createUnit(unitData);
      }

      // Reset
      setName("");
      setAddress("");
      setPhone("");
      setLogoUrl("");
      setInstagram("");
      setHidePlans(false);
      setEditingUnitId(null);
      setShowAddForm(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (unit) => {
    setName(unit.name);
    setAddress(unit.address);
    setPhone(unit.phone || "");
    setLogoUrl(unit.logoUrl || "");
    setInstagram(unit.instagram || "");
    setHidePlans(!!unit.hidePlans);
    setEditingUnitId(unit.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id, unitName) => {
    if (!window.confirm(`Tem certeza que deseja remover a unidade "${unitName}"?`)) return;
    try {
      await dbService.deleteUnit(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignBarber = async (barberUid, unitId) => {
    try {
      await dbService.assignBarberToUnit(barberUid, unitId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const loadUnitPlans = async (unitId) => {
    try {
      const configs = await dbService.getPlanConfigsByUnit(unitId);
      setUnitPlanData(prev => ({
        ...prev,
        [unitId]: {
          classicPrice: configs["Plano Classic"]?.price ?? DEFAULT_PLANS["Plano Classic"].price,
          classicXp:    configs["Plano Classic"]?.xpBonus ?? DEFAULT_PLANS["Plano Classic"].xpBonus,
          vipPrice:     configs["Plano VIP"]?.price ?? DEFAULT_PLANS["Plano VIP"].price,
          vipXp:        configs["Plano VIP"]?.xpBonus ?? DEFAULT_PLANS["Plano VIP"].xpBonus,
          masterPrice:  configs["Plano Master"]?.price ?? DEFAULT_PLANS["Plano Master"].price,
          masterXp:     configs["Plano Master"]?.xpBonus ?? DEFAULT_PLANS["Plano Master"].xpBonus,
        }
      }));
    } catch (e) {
      console.error("Erro ao carregar planos da unidade:", e);
    }
  };

  const handleTogglePlans = async (unitId) => {
    if (editingPlansForUnit === unitId) {
      setEditingPlansForUnit(null);
    } else {
      setEditingPlansForUnit(unitId);
      if (!unitPlanData[unitId]) {
        await loadUnitPlans(unitId);
      }
    }
  };

  const handlePlanChange = (unitId, field, value) => {
    setUnitPlanData(prev => ({
      ...prev,
      [unitId]: { ...(prev[unitId] || {}), [field]: value }
    }));
  };

  const handleSavePlans = async (unitId) => {
    const d = unitPlanData[unitId];
    if (!d) return;
    setSavingPlans(true);
    try {
      // Preserva benefícios existentes ao salvar
      const existingConfigs = await dbService.getPlanConfigsByUnit(unitId);
      const configs = {
        "Plano Classic": { price: Number(d.classicPrice), xpBonus: Number(d.classicXp), benefits: existingConfigs?.["Plano Classic"]?.benefits || [] },
        "Plano VIP":     { price: Number(d.vipPrice),     xpBonus: Number(d.vipXp),     benefits: existingConfigs?.["Plano VIP"]?.benefits || [] },
        "Plano Master":  { price: Number(d.masterPrice),  xpBonus: Number(d.masterXp),  benefits: existingConfigs?.["Plano Master"]?.benefits || [] },
      };
      await dbService.updatePlanConfigsByUnit(unitId, configs);
      setEditingPlansForUnit(null);
    } catch (e) {
      console.error("Erro ao salvar planos da unidade:", e);
    } finally {
      setSavingPlans(false);
    }
  };

  return (
    <div className="space-y-md">
      
      {/* Header / Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="md:col-span-2 glass-card rounded-xl p-md flex flex-col justify-between">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Gestão de Unidades</h2>
            <p className="text-on-surface-variant font-body-md">Gerencie filiais, endereços, logotipos individuais e equipes associadas.</p>
          </div>
          <div className="flex gap-lg mt-md">
            <div className="flex flex-col">
              <span className="text-display-lg font-display-lg text-tertiary">{units.length.toString().padStart(2, "0")}</span>
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">Lojas Cadastradas</span>
            </div>
            <div className="flex flex-col">
              <span className="text-display-lg font-display-lg text-on-surface">
                {barbers.filter(b => b.unitIds && b.unitIds.length > 0).length}
              </span>
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">Barbeiros Alocados</span>
            </div>
          </div>
        </div>

        {/* Adicionar ou Editar Formulário */}
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-md flex flex-col justify-between space-y-sm max-h-[500px] overflow-y-auto custom-scrollbar border border-tertiary/20">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {editingUnitId ? "Editar Unidade" : "Nova Unidade"}
            </h3>
            
            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Nome da Loja *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Royal Blade Batel"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                required
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Endereço Completo *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, Número, Bairro, Cidade"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                required
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Telefone de Contato</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(41) 99999-0000"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
              />
            </div>

            <div className="space-y-sm bg-surface-container/30 p-sm rounded-xl border border-outline-variant/10">
              <label className="text-label-sm text-outline uppercase tracking-wider text-[10px] block">Foto / Logo da Unidade</label>
              <div className="flex gap-sm items-center">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container shrink-0">
                  <img 
                    src={logoUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60"} 
                    alt="Logo Unidade" 
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
                              const uploadedUrl = await dbService.uploadImage(reader.result, "unit_logo");
                              setLogoUrl(uploadedUrl);
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
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Cole URL da foto"
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-1 text-[10px] text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Instagram</label>
              <div className="flex items-center gap-xs">
                <span className="text-xs text-outline font-mono">@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="royalbladebatel"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none focus:border-tertiary"
                />
              </div>
            </div>

            <div className="flex items-center gap-xs py-1">
              <input
                type="checkbox"
                id="hidePlans"
                checked={hidePlans}
                onChange={(e) => setHidePlans(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant/30 text-tertiary focus:ring-tertiary"
              />
              <label htmlFor="hidePlans" className="text-label-sm text-on-surface font-semibold cursor-pointer select-none">
                Apenas Agenda (Ocultar Planos e outros recursos para clientes)
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit" 
                disabled={saving}
                className="flex-1 bg-tertiary text-on-tertiary font-bold p-2 rounded text-label-md uppercase active:scale-95 transition-transform"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingUnitId(null);
                  setName("");
                  setAddress("");
                  setPhone("");
                  setLogoUrl("");
                  setInstagram("");
                }}
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
              <span className="material-symbols-outlined text-tertiary text-4xl">add_home</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Adicionar Unidade</h3>
            <p className="text-label-sm text-on-surface-variant mt-xs">Cadastrar uma nova filial/loja no sistema</p>
          </div>
        )}
      </section>

      {/* Grid de Filiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {units.map(unit => {
          const unitBarbers = barbers.filter(b => b.unitIds && b.unitIds.includes(unit.id));
          return (
            <div key={unit.id} className="glass-card rounded-xl p-md flex flex-col justify-between space-y-md border border-outline-variant/10 relative overflow-hidden">
              
              <div className="flex gap-md items-start">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-outline-variant/20 bg-surface-container">
                  <img src={unit.logoUrl} alt={unit.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-xs min-w-0">
                      <h3 className="font-headline-md text-headline-md text-on-surface truncate">{unit.name}</h3>
                      {unit.hidePlans && (
                        <span className="bg-tertiary/10 text-tertiary text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border border-tertiary/20">
                          Apenas Agenda
                        </span>
                      )}
                    </div>
                    <div className="flex gap-xs">
                      <button 
                        onClick={() => handleEdit(unit)} 
                        className="text-outline hover:text-tertiary p-1 rounded-full hover:bg-surface-variant/20"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(unit.id, unit.name)} 
                        className="text-outline hover:text-red-500 p-1 rounded-full hover:bg-surface-variant/20"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant flex items-center gap-xs mt-1">
                    <span className="material-symbols-outlined text-xs text-tertiary">location_on</span>
                    <span className="truncate">{unit.address}</span>
                  </p>
                  {unit.phone && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-xs mt-0.5">
                      <span className="material-symbols-outlined text-xs">phone</span>
                      <span>{unit.phone}</span>
                    </p>
                  )}
                  {unit.instagram && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-xs mt-0.5">
                      <span className="material-symbols-outlined text-xs text-[#E4405F]">photo_camera</span>
                      <a
                        href={`https://instagram.com/${unit.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#E4405F] transition-colors"
                      >
                        @{unit.instagram}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Controle de Modo Apenas Agenda */}
              <div className="flex justify-between items-center bg-surface-container/20 px-sm py-2 rounded-lg border border-outline-variant/10">
                <span className="text-[10px] font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-xs text-tertiary">
                    {unit.hidePlans ? "lock" : "lock_open"}
                  </span>
                  Modo Apenas Agenda
                </span>
                
                <button
                  onClick={async () => {
                    try {
                      await dbService.updateUnit(unit.id, { hidePlans: !unit.hidePlans });
                      loadData();
                    } catch (e) {
                      console.error("Erro ao atualizar unidade:", e);
                    }
                  }}
                  className={`px-sm py-1 rounded-md font-bold text-[9px] uppercase tracking-wider border transition-all active:scale-95 ${
                    unit.hidePlans 
                      ? "bg-tertiary text-on-tertiary border-transparent hover:brightness-110" 
                      : "bg-surface-container border-outline-variant/30 text-outline hover:text-on-surface"
                  }`}
                >
                  {unit.hidePlans ? "Ativado" : "Desativado"}
                </button>
              </div>

              {/* Equipe Vinculada */}
              <div className="bg-surface-container-low p-sm rounded-lg border border-outline-variant/10">
                <div className="flex justify-between items-center mb-xs">
                  <span className="text-label-sm uppercase text-outline text-[10px] font-bold">Equipe da Loja ({unitBarbers.length})</span>
                  <button 
                    onClick={() => setSelectedUnitForBarbers(selectedUnitForBarbers === unit.id ? null : unit.id)}
                    className="text-tertiary text-[10px] font-bold hover:underline uppercase"
                  >
                    {selectedUnitForBarbers === unit.id ? "Fechar" : "+ Alocar"}
                  </button>
                </div>
                {selectedUnitForBarbers === unit.id ? (
                  <div className="pt-2 space-y-sm animate-scale-in">
                    <p className="text-[10px] text-outline">Selecione profissionais para alocar nesta unidade:</p>
                    <div className="grid grid-cols-2 gap-xs max-h-[120px] overflow-y-auto custom-scrollbar">
                      {barbers.map(b => {
                        const isAllocated = b.unitIds && b.unitIds.includes(unit.id);
                        return (
                          <button key={b.uid} type="button" onClick={() => handleAssignBarber(b.uid, unit.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-xs ${isAllocated ? "bg-tertiary/10 border-tertiary/30 text-tertiary font-bold" : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant"}`}
                          >
                            <img src={b.avatarUrl} alt={b.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="truncate">{b.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-xs pt-xs">
                    {unitBarbers.length > 0 ? unitBarbers.map(b => (
                      <div key={b.uid} className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/20">
                        <img src={b.avatarUrl} alt={b.name} className="w-4 h-4 rounded-full object-cover" />
                        <span className="text-[10px] text-on-surface">{b.name}</span>
                      </div>
                    )) : <span className="text-[10px] text-on-surface-variant italic">Nenhum profissional alocado</span>}
                  </div>
                )}
              </div>

              {/* Planos desta Loja */}
              <div className="bg-surface-container-low p-sm rounded-lg border border-outline-variant/10">
                <div className="flex justify-between items-center mb-xs">
                  <span className="text-label-sm uppercase text-outline text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px] align-middle mr-1 text-tertiary">workspace_premium</span>
                    Planos desta Loja
                  </span>
                  <button 
                    onClick={() => handleTogglePlans(unit.id)}
                    className="text-tertiary text-[10px] font-bold hover:underline uppercase"
                  >
                    {editingPlansForUnit === unit.id ? "Fechar" : "Configurar"}
                  </button>
                </div>
                
                {editingPlansForUnit === unit.id && unitPlanData[unit.id] && (
                  <div className="pt-2 space-y-sm animate-scale-in">
                    <p className="text-[10px] text-outline mb-2">Defina preços e bônus de XP exclusivos para esta unidade:</p>
                    {[
                      { label: "Classic",  priceKey: "classicPrice", xpKey: "classicXp" },
                      { label: "VIP",      priceKey: "vipPrice",     xpKey: "vipXp"     },
                      { label: "Master",   priceKey: "masterPrice",  xpKey: "masterXp"  },
                    ].map(({ label, priceKey, xpKey }) => (
                      <div key={label} className="grid grid-cols-3 gap-xs items-center">
                        <span className="text-[10px] font-bold text-on-surface">{label}</span>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[9px] text-outline">Preço R$</label>
                          <input
                            type="number"
                            min="0"
                            value={unitPlanData[unit.id]?.[priceKey] || ""}
                            onChange={(e) => handlePlanChange(unit.id, priceKey, e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-1 text-[11px] text-on-surface focus:outline-none focus:border-tertiary"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[9px] text-outline">XP Bônus</label>
                          <input
                            type="number"
                            min="0"
                            value={unitPlanData[unit.id]?.[xpKey] || ""}
                            onChange={(e) => handlePlanChange(unit.id, xpKey, e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-1 text-[11px] text-on-surface focus:outline-none focus:border-tertiary"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => handleSavePlans(unit.id)}
                      disabled={savingPlans}
                      className="w-full mt-2 bg-tertiary text-on-tertiary font-bold p-1.5 rounded text-[11px] uppercase active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {savingPlans ? "Salvando..." : "Salvar Planos"}
                    </button>
                  </div>
                )}

                {editingPlansForUnit !== unit.id && (
                  <p className="text-[10px] text-on-surface-variant italic">Clique em Configurar para definir preços exclusivos.</p>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
