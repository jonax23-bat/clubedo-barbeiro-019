import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";

export default function Home({ user, navigateTo, refreshUser }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [appointments, setAppointments] = useState([]);
  const [rescheduleAppointments, setRescheduleAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [animateWidth, setAnimateWidth] = useState("0%");

  // Estados de simulação de nível
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [lastLevel, setLastLevel] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);

  // Estados do Bolão
  const [bolaoPoints, setBolaoPoints] = useState(0);
  const [bolaoRank, setBolaoRank] = useState(null);

  // Progresso de cortes completed
  const [completedCutsCount, setCompletedCutsCount] = useState(0);
  const [planConfigs, setPlanConfigs] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  useEffect(() => {
    // Carrega dados dinâmicos
    const loadData = async () => {
      const u = await dbService.getUser(user.uid);
      setCurrentUser(u);
      const apts = await dbService.getAppointments(user.uid);
      setAppointments(apts.filter(a => a.status === "scheduled"));
      setRescheduleAppointments(apts.filter(a => a.status === "reschedule_needed"));
      setCompletedCutsCount(apts.filter(a => a.status === "completed").length);
      const bList = await dbService.getBarbers();
      setBarbers(bList);

      try {
        const configs = await dbService.getPlanConfigs();
        setPlanConfigs(configs);
      } catch (err) {
        console.warn("Falha ao buscar planConfigs:", err);
      }

      try {
        const bl = await dbService.getBettingLeaderboard();
        const sortedBl = [...bl].sort((a, b) => b.points - a.points);
        const rankIndex = sortedBl.findIndex(item => item.userUid === user.uid);
        if (rankIndex !== -1) {
          setBolaoPoints(sortedBl[rankIndex].points);
          setBolaoRank(rankIndex + 1);
        } else {
          setBolaoPoints(0);
          setBolaoRank(null);
        }
      } catch (err) {
        console.warn("Falha ao buscar ranking do bolao:", err);
      }
    };
    loadData();

    // Trigger de animação de progresso
    setTimeout(() => {
      setAnimateWidth("65%");
    }, 200);
  }, [user]);

  const getXpRewardValue = (planName) => {
    const defaultReward = 5000;
    if (!planName || !planConfigs) return defaultReward;
    const plan = planConfigs[planName];
    if (!plan) return defaultReward;
    return (parseFloat(plan.price) || 50) * 100;
  };

  const handleRedeemXpReward = async () => {
    if (redeemLoading) return;
    setRedeemLoading(true);
    try {
      const xpReward = getXpRewardValue(currentUser.plan);
      const newRedeemedCycles = (currentUser.redeemedCutsCycles || 0) + 1;
      
      // Concede o XP
      const updatedUser = await dbService.updateUserXP(currentUser.uid, xpReward, 0);
      if (updatedUser) {
        // Salva a nova contagem de ciclos resgatados
        await dbService.updateClient(currentUser.uid, {
          redeemedCutsCycles: newRedeemedCycles
        });
        
        alert(`🎉 Recompensa resgatada com sucesso! +${xpReward.toLocaleString()} XP creditados.`);
        
        // Atualiza os dados na tela
        const freshUser = await dbService.getUser(currentUser.uid);
        setCurrentUser(freshUser);
        if (refreshUser) refreshUser();
        
        const apts = await dbService.getAppointments(currentUser.uid);
        setCompletedCutsCount(apts.filter(a => a.status === "completed").length);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao resgatar recompensa.");
    } finally {
      setRedeemLoading(false);
    }
  };

  // Listener para detectar subida de nível
  useEffect(() => {
    if (currentUser) {
      const lvlInfo = dbService.getUserLevel(currentUser);
      const lvl = lvlInfo.nivel;
      if (lastLevel !== null && lvl > lastLevel) {
        setLevelUpData(lvlInfo);
        setShowLevelUpModal(true);
      }
      setLastLevel(lvl);
    }
  }, [currentUser]);



  const handleRedirectToReschedule = async (aptId) => {
    await dbService.cancelAppointment(aptId);
    navigateTo("schedule");
  };

  const activeBooking = appointments[0] || null;
  const matchedBarber = activeBooking ? barbers.find(b => b.name === activeBooking.barberName || b.uid === activeBooking.barberUid) : null;

  // Calcula nível dinâmico por tempo de assinatura (Módulo 8)
  const userLevel = dbService.getUserLevel(currentUser);

  return (
    <div className="space-y-md">
      {/* Greeting Section */}
      <section className="flex flex-col gap-xs">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Olá, {currentUser.name}
        </h1>
        <div className="flex items-center gap-2">
          <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-tertiary/20 uppercase">
            {currentUser.role === "client" ? "Cliente de Respeito" : "Membro Staff"}
          </span>
          <span className="text-outline text-label-sm font-label-sm">
            Membro há {userLevel.meses} {userLevel.meses === 1 ? "mês" : "meses"} ({userLevel.badge})
          </span>
        </div>
      </section>

      {/* Reschedule Alerts */}
      {rescheduleAppointments.length > 0 && (
        <div className="space-y-sm">
          {rescheduleAppointments.map(apt => (
            <div 
              key={apt.id} 
              className="glass-card p-md rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-md"
            >
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-red-500 text-3xl select-none">warning</span>
                <div className="space-y-1">
                  <h4 className="font-headline-md text-label-md font-bold text-red-400">Reagendamento Necessário</h4>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    Seu agendamento de <strong className="text-on-surface">{apt.services.join(" & ")}</strong> no dia <strong className="text-on-surface">{apt.date}</strong> às <strong className="text-on-surface">{apt.time}</strong> com o profissional <strong className="text-on-surface">{apt.barberName}</strong> precisa ser reagendado porque o profissional não está mais disponível.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleRedirectToReschedule(apt.id)}
                className="w-full md:w-auto bg-red-500 text-white font-bold px-md py-sm rounded-lg text-xs uppercase hover:brightness-110 active:scale-95 transition-all text-center shrink-0"
              >
                Reagendar Agora
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm">
        {/* XP/Level Card */}
        <div className="glass-card p-md rounded-xl flex flex-col justify-between min-h-[140px] hover:border-tertiary/40 transition-colors group cursor-default">
          <div className="flex justify-between items-start">
            <span className="text-outline font-label-md text-label-md uppercase tracking-wider">Nível do Clube</span>
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-headline-lg text-on-surface">Nível {userLevel.nivel} {userLevel.badge}</span>
              <span className="text-outline text-label-sm">{userLevel.nome}</span>
            </div>
            <div className="w-full h-1.5 bg-surface-variant rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-tertiary to-tertiary-fixed-dim rounded-full relative transition-all duration-1000"
                style={{ width: `${userLevel.progress}%` }}
              >
                <div className="absolute right-0 top-0 h-full w-2 bg-white/20 xp-progress-glow"></div>
              </div>
            </div>
            <p className="text-outline text-[11px] mt-2 font-label-sm">
              {userLevel.nivel === 8 
                ? "Nível Máximo!" 
                : `${userLevel.mesesParaProximo} ${userLevel.mesesParaProximo === 1 ? "mês" : "meses"} para o nível ${userLevel.proximoNome}`
              }
            </p>

          </div>
        </div>

        {/* Currency Card */}
        <div className="glass-card p-md rounded-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-outline font-label-md text-label-md uppercase tracking-wider">Clubber Coins</span>
            <span className="material-symbols-outlined text-tertiary">monetization_on</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display-lg text-headline-lg text-on-surface">{currentUser.coins || 0}</span>
              <span className="text-tertiary material-symbols-outlined text-sm">toll</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-outline text-label-sm font-label-sm">
                R$ {(currentUser.coins / 10).toFixed(2)} em prêmios
              </p>
              <button 
                onClick={() => navigateTo("club_store")}
                className="text-tertiary text-xs font-bold hover:underline"
              >
                Converter XP
              </button>
            </div>
          </div>
        </div>

        {/* Bolão Points & Ranking Card */}
        <div className="glass-card p-md rounded-xl flex flex-col justify-between min-h-[140px] hover:border-tertiary/40 transition-colors group cursor-default">
          <div className="flex justify-between items-start">
            <span className="text-outline font-label-md text-label-md uppercase tracking-wider">Pontos no Bolão</span>
            <span className="material-symbols-outlined text-tertiary">emoji_events</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-headline-lg text-on-surface">{bolaoPoints} pts</span>
              <span className="text-outline text-label-sm">
                {bolaoRank ? `${bolaoRank}º no Ranking` : "Sem rank"}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-outline text-[11px]">
                {bolaoRank ? "Disputando o topo!" : "Participe para pontuar!"}
              </p>
              <button 
                onClick={() => {
                  localStorage.setItem("community_active_tab", "ranking_bolao");
                  navigateTo("community");
                }}
                className="text-tertiary text-xs font-bold hover:underline"
              >
                Ver Ranking
              </button>
            </div>
          </div>
        </div>

        {/* Main Booking Card (Large) */}
        <div className="lg:col-span-1 md:col-span-2 glass-card p-md rounded-xl flex flex-col gap-md relative overflow-hidden amber-glow justify-between">
          {activeBooking && activeBooking.isGoldenHour && (
            <div className="absolute top-0 right-0 p-4">
              <div className="bg-tertiary text-on-tertiary text-[10px] font-bold px-2 py-1 rounded-sm flex items-center gap-1 shadow-lg animate-pulse">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                GOLDEN HOUR
              </div>
            </div>
          )}
          <div className="space-y-sm flex flex-col justify-between h-full">
            <div className="space-y-xs">
              <span className="text-outline font-label-md text-label-md uppercase tracking-wider block">Seu Próximo Corte</span>
              {activeBooking ? (
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    {new Date(activeBooking.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}, {activeBooking.time}
                  </h2>
                  <div className="flex items-center gap-xs mt-1 text-on-surface-variant">
                    {matchedBarber?.avatarUrl ? (
                      <img src={matchedBarber.avatarUrl} alt={activeBooking.barberName} className="w-6 h-6 rounded-full object-cover border border-outline-variant/30" />
                    ) : (
                      <span className="material-symbols-outlined text-base">person</span>
                    )}
                    <span className="text-xs">Barbeiro: <strong>{activeBooking.barberName}</strong></span>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface-variant italic">Sem agendamento</h2>
                  <p className="text-outline font-body-md text-body-md">Garanta sua vaga hoje.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center mt-1">
              {activeBooking && activeBooking.xpBonus && (
                <span className="bg-tertiary/20 text-tertiary text-[10px] font-bold px-2 py-0.5 rounded border border-tertiary/30">
                  +{activeBooking.xpBonus} XP
                </span>
              )}
              <span className="bg-surface-variant text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {activeBooking ? activeBooking.services.join(" & ") : "Cabelo & Barba"}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 w-full mt-2">
              <button 
                onClick={() => navigateTo("schedule")}
                className="bg-tertiary text-on-tertiary font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 duration-150 text-xs w-full uppercase"
              >
                <span className="material-symbols-outlined text-sm">edit_calendar</span>
                {activeBooking ? "Mudar" : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress/Rewards Section */}
      {(() => {
        const redeemedCycles = currentUser?.redeemedCutsCycles || 0;
        const rawCutsInCycle = completedCutsCount - (redeemedCycles * 4);
        const cutsInCycle = Math.max(0, Math.min(4, rawCutsInCycle));
        const percent = cutsInCycle * 25;
        const percentLeft = 100 - percent;
        const rewardAvailable = cutsInCycle === 4;
        
        const xpReward = getXpRewardValue(currentUser?.plan);

        return (
          <section className="glass-card p-md rounded-xl space-y-md">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h3 className="font-headline-md text-headline-md text-on-surface">Progresso de Recompensa</h3>
                <p className="text-outline font-label-md text-label-md">
                  {rewardAvailable 
                    ? "Recompensa de XP pronta para ser resgatada!" 
                    : `${percentLeft}% para o próximo bônus de XP`}
                </p>
              </div>
              <div className="hidden md:block">
                <span className="text-tertiary font-bold text-headline-md">{cutsInCycle}/4</span>
                <span className="text-outline font-label-md"> cortes</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-sm">
              {Array.from({ length: 4 }).map((_, idx) => {
                const isFilled = idx < cutsInCycle;
                return (
                  <div 
                    key={idx} 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isFilled ? "bg-tertiary xp-progress-glow" : "bg-surface-variant"
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-md p-sm bg-surface-container rounded-lg border border-outline-variant/10">
              <div className="flex items-center gap-base flex-1">
                <span className={`material-symbols-outlined ${rewardAvailable ? "text-green-400 animate-bounce" : "text-tertiary"}`}>
                  {rewardAvailable ? "celebration" : "military_tech"}
                </span>
                <span className="text-on-surface font-body-md text-body-md text-left leading-snug">
                  {rewardAvailable ? (
                    <>
                      Parabéns! Resgate agora o seu bônus de <strong className="text-green-400">{xpReward.toLocaleString()} XP</strong>! 🎉
                    </>
                  ) : (
                    <>
                      Próxima recompensa: <strong className="text-tertiary">+{xpReward.toLocaleString()} XP</strong> (ao completar 4 cortes)
                    </>
                  )}
                </span>
              </div>
              {rewardAvailable && (
                <button
                  onClick={handleRedeemXpReward}
                  disabled={redeemLoading}
                  className="bg-green-500 hover:brightness-110 active:scale-95 text-white font-bold px-md py-sm rounded-lg text-xs uppercase transition-all shrink-0 flex items-center justify-center gap-xs shadow-md shadow-green-500/10"
                >
                  {redeemLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Resgatando...
                    </>
                  ) : (
                    "Resgatar XP"
                  )}
                </button>
              )}
            </div>
          </section>
        );
      })()}

      {/* Discovery/Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
        <div className="glass-card p-sm rounded-xl aspect-square flex flex-col items-center justify-center gap-2 text-center group cursor-pointer hover:bg-tertiary/5 transition-all">
          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-tertiary/20 transition-colors">
            <span className="material-symbols-outlined text-tertiary">history</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface">Histórico</span>
        </div>
        <div 
          onClick={() => navigateTo("club_store")}
          className="glass-card p-sm rounded-xl aspect-square flex flex-col items-center justify-center gap-2 text-center group cursor-pointer hover:bg-tertiary/5 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-tertiary/20 transition-colors">
            <span className="material-symbols-outlined text-tertiary">shopping_bag</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface">Loja Clubber</span>
        </div>
        <div className="glass-card p-sm rounded-xl aspect-square flex flex-col items-center justify-center gap-2 text-center group cursor-pointer hover:bg-tertiary/5 transition-all">
          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-tertiary/20 transition-colors">
            <span className="material-symbols-outlined text-tertiary">diversity_3</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface">Indicar Amigo</span>
        </div>
        <div className="glass-card p-sm rounded-xl aspect-square flex flex-col items-center justify-center gap-2 text-center group cursor-pointer hover:bg-tertiary/5 transition-all">
          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-tertiary/20 transition-colors">
            <span className="material-symbols-outlined text-tertiary">support_agent</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface">Suporte VIP</span>
        </div>
      </div>

      {/* Level Up Congratulations Modal */}
      {showLevelUpModal && levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-xl rounded-2xl border-2 border-tertiary relative overflow-hidden text-center gold-glow space-y-md">
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-lg opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[120px] text-tertiary select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                stars
              </span>
            </div>

            <div className="flex flex-col items-center gap-sm">
              <div className="w-20 h-20 rounded-full bg-tertiary/20 flex items-center justify-center border border-tertiary shadow-xl animate-bounce">
                <span className="text-4xl">{levelUpData.badge}</span>
              </div>
              
              <span className="bg-tertiary/10 text-tertiary text-xs px-3 py-1 rounded-full border border-tertiary/20 uppercase font-bold tracking-widest mt-md">
                LEVEL UP!
              </span>
              
              <h2 className="font-display-lg text-display-md text-on-surface">
                Parabéns, {currentUser.name}!
              </h2>
              
              <p className="text-on-surface-variant font-body-md text-sm">
                Sua lealdade foi recompensada. Você acaba de subir de nível no clube!
              </p>
            </div>

            <div className="bg-surface-container/50 border border-outline-variant/30 rounded-xl p-md space-y-sm">
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wider block">Novo Nível</span>
                <strong className="text-on-surface text-lg">Nível {levelUpData.nivel} — {levelUpData.nome}</strong>
              </div>
              <div className="w-full bg-outline-variant/10 h-[1px]"></div>
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wider block">Bônus no Bolão</span>
                <strong className="text-tertiary text-lg font-bold">+{levelUpData.bonus} pontos / acerto</strong>
              </div>
            </div>

            <div className="pt-md">
              <button
                onClick={() => setShowLevelUpModal(false)}
                className="w-full bg-tertiary text-on-tertiary font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm uppercase"
              >
                Continuar Conquistando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
