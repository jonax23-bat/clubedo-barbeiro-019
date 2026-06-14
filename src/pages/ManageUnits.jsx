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
  
  // Barber assignment state
  const [selectedUnitForBarbers, setSelectedUnitForBarbers] = useState(null);
  const [saving, setSaving] = useState(false);

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
        logoUrl: logoUrl.trim() || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60"
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

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase tracking-wider text-[10px]">Foto / Logo URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.jpg"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-sm text-xs text-on-surface focus:outline-none"
              />
              {logoUrl.trim() && (
                <div className="flex justify-center pt-xs">
                  <img src={logoUrl} alt="Preview Logo" className="w-12 h-12 rounded-xl object-cover border border-outline-variant/30" />
                </div>
              )}
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
                    <h3 className="font-headline-md text-headline-md text-on-surface truncate">{unit.name}</h3>
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
                </div>
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
                          <button
                            key={b.uid}
                            type="button"
                            onClick={() => handleAssignBarber(b.uid, unit.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-xs ${
                              isAllocated 
                                ? "bg-tertiary/10 border-tertiary/30 text-tertiary font-bold" 
                                : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant"
                            }`}
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
                    {unitBarbers.length > 0 ? (
                      unitBarbers.map(b => (
                        <div key={b.uid} className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/20">
                          <img src={b.avatarUrl} alt={b.name} className="w-4 h-4 rounded-full object-cover" />
                          <span className="text-[10px] text-on-surface">{b.name}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-on-surface-variant italic">Nenhum profissional alocado</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
