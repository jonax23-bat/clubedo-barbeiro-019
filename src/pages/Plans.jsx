import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function Plans({ user, navigateTo, refreshUser }) {
  // --- Estados do Componente ---
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(null);
  const [planConfigs, setPlanConfigs] = useState({
    "Plano Classic": { price: 70, xpBonus: 100, benefits: [] },
    "Plano VIP": { price: 120, xpBonus: 500, benefits: [] },
    "Plano Master": { price: 180, xpBonus: 800, benefits: [] }
  });

  const renderBenefitText = (text, xpBonus) => {
    if (!text) return { text: "", isBold: false };
    const cleaned = text.replace("{xpBonus}", xpBonus);
    const isBold = cleaned.startsWith("**") && cleaned.endsWith("**");
    const displayText = isBold ? cleaned.substring(2, cleaned.length - 2) : cleaned;
    return { text: displayText, isBold };
  };

  // --- Carregar Configurações de Planos ---
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const configs = await dbService.getPlanConfigs();
        if (configs) {
          setPlanConfigs(configs);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de planos:", err);
      }
    };
    fetchConfigs();
  }, []);

  // --- Função para Simular Assinatura ---
  const handleSubscribe = async (planName, price, xpBonus) => {
    setLoadingPlan(planName);
    setSubscriptionSuccess(null);

    try {
      // Simula uma chamada de API de 1.5s para processamento
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Credita bônus inicial de XP ao usuário por assinar um plano
      await dbService.subscribeToPlan(user.uid, planName);
      if (xpBonus > 0) {
        await dbService.updateUserXP(user.uid, xpBonus, Math.floor(xpBonus / 10));
      }
      if (refreshUser) refreshUser();

      setSubscriptionSuccess(`Assinatura do ${planName} concluída! Você ganhou +${xpBonus} XP de boas-vindas!`);

      // Redireciona para a home depois de 2.5s para ver os novos dados
      setTimeout(() => {
        navigateTo("home");
      }, 2500);

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-12">
      
      {/* Hero Section */}
      <section className="text-center mb-12 space-y-4">
        <h1 className="font-headline-lg text-headline-lg md:text-display-lg">
          Escolha seu <span className="amber-gradient-text">Lifestyle</span>
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Faça parte do clube de elite. Garanta sua vaga na agenda e acumule XP com nossos planos exclusivos.
        </p>
      </section>

      {/* Feedback de Sucesso */}
      {subscriptionSuccess && (
        <div className="p-md rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-sm max-w-3xl mx-auto">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="font-body-md font-bold">{subscriptionSuccess}</span>
        </div>
      )}

      {/* Pricing Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Plano Classic */}
        <div className="glass-card rounded-xl p-md flex flex-col transition-all duration-300 hover:scale-[1.02] border-t-2 border-t-transparent hover:border-t-outline-variant/50">
          <div className="mb-6">
            <span className="font-label-md text-label-md text-outline uppercase tracking-widest">Entry Level</span>
            <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">Plano Classic</h2>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-headline-md font-bold text-on-surface">R$ {planConfigs["Plano Classic"].price}</span>
              <span className="text-on-surface-variant font-label-md">/mês</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-auto">
            {(planConfigs["Plano Classic"].benefits || []).map((benefit, idx) => {
              const { text, isBold } = renderBenefitText(benefit, planConfigs["Plano Classic"].xpBonus);
              return (
                <li key={idx} className={`flex items-center gap-3 ${isBold ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-tertiary text-[20px]" style={isBold ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    check_circle
                  </span>
                  <span className={`font-body-md text-body-md ${isBold ? 'font-semibold' : ''}`}>
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => handleSubscribe("Plano Classic", planConfigs["Plano Classic"].price, planConfigs["Plano Classic"].xpBonus)}
            disabled={loadingPlan !== null}
            className="mt-8 w-full py-4 rounded-lg bg-surface-container-highest border border-outline-variant/30 font-label-md text-label-md text-on-surface hover:bg-surface-bright transition-colors active:scale-95 duration-150 flex items-center justify-center gap-xs"
          >
            {loadingPlan === "Plano Classic" ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              "Assinar Agora"
            )}
          </button>
        </div>

        {/* Plano VIP (Destaque Popular) */}
        <div className="glass-card rounded-xl p-md flex flex-col relative transition-all duration-300 hover:scale-[1.02] border-t-2 border-tertiary gold-glow overflow-hidden">
          <div className="absolute -right-12 top-6 bg-tertiary text-on-tertiary px-12 py-1 rotate-45 font-label-sm text-label-sm font-bold uppercase tracking-tighter">
            Popular
          </div>
          
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-tertiary/10 border border-tertiary/20 px-3 py-1 rounded-full mb-3">
              <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                workspace_premium
              </span>
              <span className="font-label-sm text-label-sm text-tertiary">O mais assinado</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-tertiary">Plano VIP</h2>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-display-lg font-bold text-on-surface">R$ {planConfigs["Plano VIP"].price}</span>
              <span className="text-on-surface-variant font-label-md">/mês</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-auto">
            {(planConfigs["Plano VIP"].benefits || []).map((benefit, idx) => {
              const { text, isBold } = renderBenefitText(benefit, planConfigs["Plano VIP"].xpBonus);
              return (
                <li key={idx} className={`flex items-center gap-3 ${isBold ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-tertiary text-[20px]" style={isBold ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    check_circle
                  </span>
                  <span className={`font-body-md text-body-md ${isBold ? 'font-semibold' : ''}`}>
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => handleSubscribe("Plano VIP", planConfigs["Plano VIP"].price, planConfigs["Plano VIP"].xpBonus)}
            disabled={loadingPlan !== null}
            className="mt-8 w-full py-4 rounded-lg bg-tertiary font-label-md text-label-md text-on-tertiary font-bold hover:opacity-90 transition-all active:scale-95 duration-150 flex items-center justify-center gap-xs"
          >
            {loadingPlan === "Plano VIP" ? (
              <span className="material-symbols-outlined animate-spin text-on-tertiary">sync</span>
            ) : (
              "Assinar Agora"
            )}
          </button>
        </div>

        {/* Plano Master */}
        <div className="glass-card rounded-xl p-md flex flex-col transition-all duration-300 hover:scale-[1.02] border-t-2 border-t-transparent hover:border-t-outline-variant/50">
          <div className="mb-6">
            <span className="font-label-md text-label-md text-outline uppercase tracking-widest">The Full Experience</span>
            <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">Plano Master</h2>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-headline-md font-bold text-on-surface">R$ {planConfigs["Plano Master"].price}</span>
              <span className="text-on-surface-variant font-label-md">/mês</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-auto">
            {(planConfigs["Plano Master"].benefits || []).map((benefit, idx) => {
              const { text, isBold } = renderBenefitText(benefit, planConfigs["Plano Master"].xpBonus);
              return (
                <li key={idx} className={`flex items-center gap-3 ${isBold ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-tertiary text-[20px]" style={isBold ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    check_circle
                  </span>
                  <span className={`font-body-md text-body-md ${isBold ? 'font-semibold' : ''}`}>
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => handleSubscribe("Plano Master", planConfigs["Plano Master"].price, planConfigs["Plano Master"].xpBonus)}
            disabled={loadingPlan !== null}
            className="mt-8 w-full py-4 rounded-lg bg-surface-container-highest border border-outline-variant/30 font-label-md text-label-md text-on-surface hover:bg-surface-bright transition-colors active:scale-95 duration-150 flex items-center justify-center gap-xs"
          >
            {loadingPlan === "Plano Master" ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              "Assinar Agora"
            )}
          </button>
        </div>

      </div>

      {/* Atmospheric Card Section */}
      <section className="mt-16 relative overflow-hidden rounded-2xl glass-card p-lg flex flex-col md:flex-row items-center gap-8 border-none bg-gradient-to-br from-surface-container-high/40 to-surface-container/20">
        <div className="flex-1 space-y-4">
          <h3 className="font-headline-md text-headline-md text-primary">Por que ser um <span className="text-tertiary">Clubber?</span></h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Mais do que cortes, oferecemos um ecossistema digital. Acumule XP em cada visita, suba de ranking no nosso leaderboard da comunidade e troque seus pontos por serviços premium ou produtos exclusivos da nossa linha.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex flex-col">
              <span className="text-tertiary font-bold text-headline-md">+15k</span>
              <span className="text-label-sm font-label-sm text-outline uppercase">Membros</span>
            </div>
            <div className="w-[1px] bg-outline-variant/30 h-10 self-center"></div>
            <div className="flex flex-col">
              <span className="text-tertiary font-bold text-headline-md">4.9</span>
              <span className="text-label-sm font-label-sm text-outline uppercase">Avaliação</span>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full max-w-[400px]">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-tertiary to-tertiary-fixed-dim blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative rounded-xl overflow-hidden aspect-video border border-outline-variant/30">
              <img 
                className="w-full h-full object-cover grayscale-[20%] brightness-75 group-hover:scale-105 transition-transform duration-700" 
                alt="A cinematic interior of a luxury modern barbershop"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdjAiPdRfPAxY5HEeLh_MmoAe5smw3TK8tMxDw4gjgbtKtU0az5KEEqO4y9CHyouAvrt7VQrvVJr6TDyn880FITpiuejdO6rsBjHOClLUqcjjrRJA2H0aq6E-4lVhPMxZNd4TFmHu9WCgXngu26WJ_eh4NHmTQDooZg6M-O813LD66nKjld2H076RZFAvYvaMQx5aui-hMUZFZM9wgGewr81W3amo0yja_ysufxScytrgIt3PXavjbQkt7_fVlcD86GbWf2uoyVTTo"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
