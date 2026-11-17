import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function SelectUnit({ user, onUnitSelected }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const list = await dbService.getUnits();
        setUnits(list);
      } catch (e) {
        console.error("Erro ao carregar unidades:", e);
        setError("Não foi possível carregar as unidades. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    loadUnits();
  }, []);

  const handleSelectUnit = async (unit) => {
    if (savingId) return;
    setSavingId(unit.id);
    try {
      await dbService.setUserUnit(user.uid, unit.id);
      onUnitSelected({ ...user, unitId: unit.id }, unit);
    } catch (e) {
      console.error("Erro ao vincular unidade:", e);
      setError("Falha ao escolher a unidade. Tente novamente.");
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-gutter py-16 relative overflow-hidden">
      
      {/* Background decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-tertiary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-tertiary/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-tertiary/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">

        {/* Hero */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-tertiary flex items-center justify-center shadow-2xl shadow-tertiary/30">
              <span className="material-symbols-outlined text-on-tertiary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                content_cut
              </span>
            </div>
          </div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface">
            Bem-vindo, <span className="text-tertiary">{user?.name?.split(" ")[0]}!</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
            Escolha a unidade mais próxima de você. Você verá os planos, barbeiros e agenda desta unidade.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-12 h-12 rounded-full border-2 border-tertiary/20 border-t-tertiary animate-spin" />
            <p className="text-on-surface-variant text-sm">Carregando unidades...</p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-2xl p-4 text-error text-center mb-6">
            <span className="material-symbols-outlined align-middle mr-2">error</span>
            {error}
          </div>
        )}

        {/* Sem unidades */}
        {!loading && !error && units.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl">store</span>
            </div>
            <p className="text-on-surface-variant">
              Nenhuma unidade cadastrada ainda. Aguarde o administrador configurar as lojas.
            </p>
          </div>
        )}

        {/* Lista de unidades */}
        {!loading && units.length > 0 && (
          <div className="space-y-4">
            {units.map((unit, idx) => (
              <button
                key={unit.id}
                onClick={() => handleSelectUnit(unit)}
                disabled={!!savingId}
                className="w-full group relative text-left rounded-2xl border border-outline-variant/30 bg-surface-container/60 backdrop-blur-xl p-5 transition-all duration-300 hover:border-tertiary/50 hover:bg-surface-container hover:shadow-xl hover:shadow-tertiary/10 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  
                  {/* Logo da unidade */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-high">
                    {unit.logoUrl ? (
                      <img
                        src={unit.logoUrl}
                        alt={unit.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>content_cut</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-title-lg font-bold text-on-surface group-hover:text-tertiary transition-colors truncate">
                      {unit.name}
                    </h2>
                    {unit.address && (
                      <p className="font-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs text-tertiary/70" style={{ fontSize: "14px" }}>location_on</span>
                        <span className="truncate">{unit.address}</span>
                      </p>
                    )}
                    {unit.phone && (
                      <p className="font-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-tertiary/70" style={{ fontSize: "14px" }}>phone</span>
                        {unit.phone}
                      </p>
                    )}
                  </div>

                  {/* Seta / Loading */}
                  <div className="flex-shrink-0">
                    {savingId === unit.id ? (
                      <div className="w-8 h-8 rounded-full border-2 border-tertiary/20 border-t-tertiary animate-spin" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center group-hover:bg-tertiary transition-colors">
                        <span className="material-symbols-outlined text-tertiary group-hover:text-on-tertiary transition-colors" style={{ fontSize: "20px" }}>
                          arrow_forward
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-on-surface-variant text-xs mt-10 opacity-60">
          Você poderá trocar de unidade a qualquer momento no seu perfil.
        </p>
      </div>
    </div>
  );
}
