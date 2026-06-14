import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function ShopBranding({ user, navigateTo, onBrandingChange }) {
  // --- Estados do Componente ---
  const [shopName, setShopName] = useState("Clubber Barbershop");
  const [logoUrl, setLogoUrl] = useState("");
  
  // Endereço
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // --- Efeito: Carregar Branding do Banco ---
  useEffect(() => {
    const loadBranding = async () => {
      const data = await dbService.getBranding();
      if (data) {
        setShopName(data.name || "Clubber Barbershop");
        setLogoUrl(data.logoUrl || "");
        if (data.address) {
          setZip(data.address.zip || "");
          setStreet(data.address.street || "");
          setNumber(data.address.number || "");
          setComplement(data.address.complement || "");
          setNeighborhood(data.address.neighborhood || "");
          setCity(data.address.city || "");
          setState(data.address.state || "");
          setPhone(data.address.phone || "");
          setMapsUrl(data.address.mapsUrl || "");
        }
      }
    };
    loadBranding();
  }, []);

  // --- Função para Auto-preencher Endereço pelo CEP ---
  const handleCepLookup = async (cepValue) => {
    const cleanedCep = cepValue.replace(/\D/g, "");
    setZip(cleanedCep);
    if (cleanedCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
        }
      } catch (err) {
        console.error("ViaCEP error", err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // --- Função para Salvar Configurações (com micro-interações) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    const brandingData = {
      name: shopName,
      logoUrl,
      address: {
        zip,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        phone,
        mapsUrl
      }
    };

    try {
      await dbService.updateBranding(brandingData);
      setSaving(false);
      setSaveStatus("success");
      
      // Notifica o componente pai sobre a alteração de branding
      if (onBrandingChange) {
        onBrandingChange(shopName);
      }

      // Limpa a notificação de sucesso após 2 segundos
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      setSaving(false);
      setSaveStatus("error");
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-lg">
      
      {/* Cabeçalho de Introdução */}
      <header className="mb-lg">
        <h2 className="font-headline-lg text-headline-lg mb-xs text-on-surface">Identidade da Loja</h2>
        <p className="text-on-surface-variant font-body-md">
          Personalize o visual, a marca e a localização da sua barbearia exibidos para os assinantes.
        </p>
      </header>

      {/* Grid de Configurações Bento */}
      <form onSubmit={handleSave} className="space-y-md">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          
          {/* Sessão: Upload de Logo */}
          <section className="bg-surface-container p-md rounded-xl border border-outline-variant/10 flex flex-col items-center justify-center text-center">
            <h3 className="font-label-md text-label-md uppercase text-on-surface-variant self-start mb-md">
              Logo da Barbearia
            </h3>
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-2 border-tertiary/20 bg-surface-container-highest flex items-center justify-center overflow-hidden glow-amber transition-transform group-hover:scale-105">
                <img 
                  alt="Logo da Barbearia" 
                  className="w-24 h-24 opacity-90 object-contain" 
                  src={logoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuD7z71xjcPkCJCDD2UbnqI8pW_Z7DgP24dZF2ZDsHmc6-cQQiECH8B050YlsxPup_OqJQE0A7btKsdEQrnUf3kYgwN1-FnVRO8NOXWERPLy-y7Qh4ACudokKPFrlMdm4xnnjgpfVw3IhOBvrjF2MqV38yGT6nd6_p0_-MjoPTQQ-k5j4Zh4ElxtXt7dd22GcvZ5XwD32dHzQxfNDwvvn-bDKzXKjPeHZ9VMWM-e1_u1Z2lDsZ9IWOI7CgqB2M2hAS1Ax5_xAWKVjatp"}
                />
              </div>
            </div>
            <input 
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Cole a URL do Logo aqui"
              className="mt-md w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-sm py-xs text-xs text-on-surface focus:outline-none"
            />
          </section>

          {/* Sessão: Nome do Estabelecimento */}
          <section className="bg-surface-container p-md rounded-xl border border-outline-variant/10 flex flex-col justify-between">
            <div className="space-y-sm">
              <h3 className="font-label-md text-label-md uppercase text-on-surface-variant mb-md">
                Nome da Barbearia
              </h3>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all font-body-lg text-body-lg"
              />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Este nome será exibido para todos os clientes no topo do aplicativo e nas notificações.
              </p>
            </div>
          </section>

        </div>

        {/* Sessão: Localização e Contato */}
        <section className="bg-surface-container p-md rounded-xl border border-outline-variant/10 space-y-md">
          <h3 className="font-label-md text-label-md uppercase text-on-surface-variant">
            Localização e Contato da Matriz
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => handleCepLookup(e.target.value)}
                  placeholder="80020-000"
                  maxLength="9"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
                />
                {loadingCep && (
                  <span className="material-symbols-outlined animate-spin absolute right-2 top-2 text-tertiary text-lg">sync</span>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Rua / Logradouro</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Rua XV de Novembro"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Número</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="100"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Complemento</label>
              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Sala 3"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Bairro</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Centro"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Cidade/UF</label>
              <input
                type="text"
                value={city && state ? `${city} - ${state}` : city || ""}
                readOnly
                placeholder="Curitiba - PR"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface-variant focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Telefone de Contato</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(41) 99999-0000"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
              />
            </div>

            <div className="space-y-xs">
              <label className="text-label-sm text-outline uppercase font-bold text-[10px]">Link do Google Maps</label>
              <div className="flex gap-xs">
                <input
                  type="text"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm text-on-surface focus:outline-none"
                />
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-surface-container-highest border border-outline-variant/30 px-md rounded-lg flex items-center justify-center text-tertiary hover:bg-surface-variant transition-colors"
                    title="Ver no Maps"
                  >
                    <span className="material-symbols-outlined">map</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {street && (
            <div className="p-sm bg-surface-container-lowest rounded-lg border border-outline-variant/10 text-xs text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-tertiary">info</span>
              <span>
                Endereço formatado: <strong>{street}, {number} {complement ? `- ${complement}` : ""} - {neighborhood}, {city} - {state}</strong>
              </span>
            </div>
          )}
        </section>

        {/* Ações e Feedback */}
        <div className="flex flex-col sm:flex-row gap-md pt-md">
          <button
            type="submit"
            disabled={saving}
            className={`flex-1 font-headline-md text-headline-md py-md rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-sm glow-amber ${
              saveStatus === "success" 
                ? "bg-green-100 text-green-800" 
                : "bg-tertiary text-on-tertiary hover:brightness-110"
            }`}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Salvando alterações...
              </>
            ) : saveStatus === "success" ? (
              <>
                <span className="material-symbols-outlined text-green-500">check_circle</span>
                Salvo com sucesso!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                Salvar Alterações
              </>
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => navigateTo("home")}
            className="px-lg py-md border border-outline-variant/30 text-on-surface font-headline-md text-headline-md rounded-xl hover:bg-surface-variant transition-colors active:scale-[0.98]"
          >
            Cancelar
          </button>
        </div>

      </form>

    </div>
  );
}
