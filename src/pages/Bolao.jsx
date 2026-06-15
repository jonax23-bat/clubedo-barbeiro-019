import React, { useState, useEffect } from "react";
import { dbService } from "../firebase/dbService";
import { sportsApi } from "../services/sportsApi";

function TeamLogo({ logoUrl, teamName }) {
  const [imgError, setImgError] = useState(false);

  // Prioriza logo local; só usa CDN se não tiver local
  const localLogo = dbService.getLocalTeamLogo ? dbService.getLocalTeamLogo(teamName) : null;
  const effectiveLogo = localLogo || logoUrl;

  useEffect(() => {
    setImgError(false);
  }, [effectiveLogo]);

  const initial = teamName ? teamName.charAt(0).toUpperCase() : "?";
  const charCode = teamName ? teamName.charCodeAt(0) : 0;
  const colors = [
    "from-red-600 to-amber-500 text-white",
    "from-emerald-600 to-teal-400 text-white",
    "from-blue-600 to-indigo-400 text-white",
    "from-purple-600 to-pink-500 text-white",
    "from-amber-600 to-yellow-400 text-white",
  ];
  const gradient = colors[charCode % colors.length];

  return (
    <div 
      className={`relative w-9 h-9 rounded-full bg-gradient-to-tr ${gradient} border border-outline-variant/20 shadow-md shrink-0 select-none flex items-center justify-center font-black text-sm uppercase`}
      title={teamName}
    >
      <span>{initial}</span>
      {effectiveLogo && !imgError && (
        <img
          src={effectiveLogo}
          alt=""
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-contain p-1 rounded-full bg-surface-container-lowest"
        />
      )}
    </div>
  );
}

export default function Bolao({ user, navigateTo, refreshUser }) {
  // --- Estados do Componente ---
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [bettingLeaderboard, setBettingLeaderboard] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [bolaoSubTab, setBolaoSubTab] = useState("upcoming"); // upcoming | finished | all
  const [betFeedback, setBetFeedback] = useState(null);

  // --- Efeito: Carrega dados do Banco/LocalStorage ---
  const loadAllData = async () => {
    // Carrega o ranking mensal dos palpites
    const bl = await dbService.getBettingLeaderboard();
    setBettingLeaderboard(bl.sort((a, b) => b.points - a.points));

    // Carrega todos os palpites gerais
    const b = await dbService.getAllBets();
    setBets(b);

    // Carrega as partidas de bolão do banco
    try {
      const activeGames = await dbService.getBolaoGames();
      const gamesWithPreds = activeGames.map(g => {
        const existingBet = b.find(bet => bet.matchId === g.id && bet.userUid === user.uid);
        return {
          ...g,
          predA: existingBet ? String(existingBet.predA) : "",
          predB: existingBet ? String(existingBet.predB) : ""
        };
      });
      setMatches(gamesWithPreds);
    } catch (e) {
      console.error("Erro ao carregar bolaoGames", e);
    }

    // Carrega os dados de nível de todos os usuários para exibição de badges
    try {
      const allUsers = await dbService.getUsers();
      const map = {};
      allUsers.forEach(u => {
        const lvlInfo = dbService.getUserLevel(u);
        map[u.uid] = lvlInfo;
        map[u.name] = lvlInfo;
      });
      setUsersMap(map);
    } catch(e) {}
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      if (dbService.isRealFirebase()) {
        if (user && user.role === "owner") {
          await dbService.syncGamesFromApi();
        } else {
          await dbService.refreshLiveScores();
        }
      } else {
        await dbService.refreshLiveScores();
      }
      await loadAllData();
    } catch (e) {
      console.warn("Erro ao atualizar manualmente:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Sincroniza em background ao entrar na página
    const initBgSync = async () => {
      setRefreshing(true);
      try {
        if (dbService.isRealFirebase()) {
          if (user && user.role === "owner") {
            await dbService.syncGamesFromApi();
          } else {
            await dbService.refreshLiveScores();
          }
        } else {
          await dbService.refreshLiveScores();
        }
        await loadAllData();
      } catch (e) {
        console.warn("Erro ao atualizar background:", e);
      } finally {
        setRefreshing(false);
      }
    };
    initBgSync();
  }, [user]);

  // --- Função para Atualizar Campos de Palpite ---
  const handlePredictionChange = (matchId, team, val) => {
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return team === "A" ? { ...m, predA: val } : { ...m, predB: val };
      }
      return m;
    }));
  };

  // --- Enviar Palpite do Usuário Logado ---
  const handleBetSubmit = async (matchId) => {
    if (!user || !user.plan) {
      setBetFeedback("Apenas membros assinantes podem participar do bolão!");
      setTimeout(() => setBetFeedback(null), 3500);
      return;
    }

    const match = matches.find(m => m.id === matchId);
    if (!match || match.predA === "" || match.predB === "") return;

    try {
      // Salva o palpite do usuário usando a API
      await dbService.submitPalpite(matchId, user.uid, user.name, match.predA, match.predB);
      
      // Atualiza os palpites exibidos localmente
      const allBets = await dbService.getAllBets();
      setBets(allBets);

      setBetFeedback(`Palpite enviado com sucesso! Aguarde o resultado do jogo.`);
      setTimeout(() => setBetFeedback(null), 3000);
      loadAllData();
    } catch (err) {
      console.error(err);
      setBetFeedback(err.message || "Erro ao enviar palpite.");
      setTimeout(() => setBetFeedback(null), 4000);
    }
  };

  // Badge de nível
  const renderUserLevelBadge = (uid, name) => {
    const info = usersMap[uid] || usersMap[name];
    if (!info) return null;
    return (
      <span className="inline-flex items-center gap-[2px] bg-tertiary-container/30 border border-tertiary/20 text-tertiary text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1 font-mono uppercase">
        LVL {info.nivel}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
      
      {/* Coluna Esquerda: Bolão da Rodada (8 colunas no desktop) */}
      <div className="lg:col-span-8 space-y-md">
        
        <section className="glass-card rounded-xl p-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-md opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <span className="material-symbols-outlined text-[80px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              sports_soccer
            </span>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-sm">
              <div>
                <span className="bg-tertiary/10 text-tertiary text-[10px] px-sm py-1 rounded-full border border-tertiary/20 uppercase font-bold tracking-widest">
                  Bolão Clubber
                </span>
                <div className="flex items-center gap-xs mt-2">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Jogos da Rodada & Placar</h2>
                  {refreshing && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-full animate-pulse">
                      <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>
                      Atualizando...
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                  title="Atualizar placares agora"
                >
                  <span className={`material-symbols-outlined text-sm ${refreshing ? "animate-spin" : ""}`}>sync</span>
                </button>
                <span className="text-tertiary text-xs font-semibold bg-tertiary-container/30 px-3 py-1 rounded-full border border-tertiary/20">
                  Acerto = 3 pontos
                </span>
              </div>
            </div>

            {betFeedback && (
              <div className="p-sm rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 font-label-md">
                {betFeedback}
              </div>
            )}

            {/* Abas Internas do Bolão */}
            <div className="flex border-b border-outline-variant/10 gap-sm pb-1 mb-md">
              <button
                type="button"
                onClick={() => setBolaoSubTab("upcoming")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  bolaoSubTab === "upcoming"
                    ? "border-tertiary text-tertiary font-bold"
                    : "border-transparent text-outline hover:text-on-surface"
                }`}
              >
                Próximas Partidas
              </button>
              <button
                type="button"
                onClick={() => setBolaoSubTab("finished")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  bolaoSubTab === "finished"
                    ? "border-tertiary text-tertiary font-bold"
                    : "border-transparent text-outline hover:text-on-surface"
                }`}
              >
                Resultados Recentes
              </button>
              <button
                type="button"
                onClick={() => setBolaoSubTab("all")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  bolaoSubTab === "all"
                    ? "border-tertiary text-tertiary font-bold"
                    : "border-transparent text-outline hover:text-on-surface"
                }`}
              >
                Todas as Partidas
              </button>
            </div>

            {/* Listagem dos Jogos */}
            <div className="space-y-4">
              {(() => {
                const filteredMatches = matches.filter(m => {
                  if (bolaoSubTab === "upcoming") {
                    return m.status === "scheduled" || m.status === "live";
                  } else if (bolaoSubTab === "finished") {
                    return m.status === "finished";
                  }
                  return true;
                });

                if (filteredMatches.length === 0) {
                  return (
                    <div className="py-xl text-center bg-surface-container-low/30 rounded-2xl border border-outline-variant/15">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-sm">sports_soccer</span>
                      <p className="text-xs text-on-surface-variant font-bold">
                        {bolaoSubTab === "upcoming"
                          ? "Nenhuma partida agendada no momento."
                          : bolaoSubTab === "finished"
                          ? "Nenhum resultado registrado nos últimos 60 dias."
                          : "Nenhum jogo cadastrado."
                        }
                      </p>
                    </div>
                  );
                }

                return filteredMatches.map((match) => {
                  const userBet = bets.find(b => b.matchId === match.id && b.userUid === user.uid);
                  const hasPredicted = !!userBet;

                  // Trava de 5 minutos antes do jogo começar
                  const matchStartTime = match.startTimestamp 
                    ? new Date(match.startTimestamp.seconds ? match.startTimestamp.seconds * 1000 : match.startTimestamp)
                    : new Date(`${match.date}T${match.time || "00:00"}:00-03:00`);
                  const timeDiffMs = matchStartTime.getTime() - new Date().getTime();
                  const isLockedByTime = isNaN(timeDiffMs) ? true : timeDiffMs <= 5 * 60 * 1000;
                  const isBettingClosed = match.status === "finished" || match.status === "live" || isLockedByTime;

                  return (
                    <div key={match.id} className="p-md bg-surface-container-low/40 rounded-2xl border border-outline-variant/10 space-y-md flex flex-col items-center justify-center">
                      
                      {/* 1. Confronto e Placar Oficial (Centro) */}
                      <div className="flex items-center gap-base bg-surface-container/20 p-sm rounded-xl border border-outline-variant/5 w-full max-w-md justify-center">
                        <div className="flex items-center gap-xs justify-end w-28 md:w-32 text-right">
                          <span className="font-label-md text-on-surface font-semibold text-xs truncate max-w-[80px] md:max-w-[100px]" title={match.homeTeam}>
                            {match.homeTeam}
                          </span>
                          <TeamLogo logoUrl={match.homeLogo} teamName={match.homeTeam} />
                        </div>
                        
                        <div className="flex items-center gap-[4px] shrink-0">
                          <div className="bg-surface-container-high rounded-lg font-bold text-base text-on-surface w-9 h-9 flex items-center justify-center border border-outline-variant/20">
                            {match.realScoreHome !== null && match.realScoreHome !== undefined ? match.realScoreHome : "-"}
                          </div>
                          <span className="text-outline-variant font-bold text-[10px]">x</span>
                          <div className="bg-surface-container-high rounded-lg font-bold text-base text-on-surface w-9 h-9 flex items-center justify-center border border-outline-variant/20">
                            {match.realScoreAway !== null && match.realScoreAway !== undefined ? match.realScoreAway : "-"}
                          </div>
                        </div>

                        <div className="flex items-center gap-xs justify-start w-28 md:w-32 text-left">
                          <TeamLogo logoUrl={match.awayLogo} teamName={match.awayTeam} />
                          <span className="font-label-md text-on-surface font-semibold text-xs truncate max-w-[80px] md:max-w-[100px]" title={match.awayTeam}>
                            {match.awayTeam}
                          </span>
                        </div>
                      </div>

                      {/* 2. Status e Palpite centralizados */}
                      <div className="flex flex-col items-center gap-sm w-full text-center">
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px]">
                          <span className="text-outline font-semibold">
                            {new Date(`${match.date}T12:00:00`).toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})} às {match.time || "16:00"}
                          </span>
                          <span className="text-outline-variant">•</span>
                          <span className="text-outline font-medium truncate max-w-[100px]">{match.leagueName}</span>
                          <span className="text-outline-variant">•</span>
                          {match.status === "live" ? (
                            <span className="bg-red-500/10 border border-red-500/30 text-red-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-[2px] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                              AO VIVO {match.minute ? `- ${match.minute}` : ""}
                            </span>
                          ) : match.status === "finished" ? (
                            <span className="bg-surface-variant text-outline font-bold px-2 py-0.5 rounded-full">
                              ENCERRADO
                            </span>
                          ) : (
                            <span className="bg-tertiary/10 border border-tertiary/20 text-tertiary font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              Agendado
                            </span>
                          )}
                        </div>

                        {/* Box de Digitação de Palpites */}
                        <div className="w-full max-w-sm bg-surface-container-high/30 border border-outline-variant/10 rounded-xl p-sm space-y-xs">
                          <p className="text-[10px] text-outline font-bold uppercase tracking-wider">
                            {isBettingClosed ? "Palpites Encerrados" : "Seu Palpite para esta partida"}
                          </p>

                          <div className="flex items-center justify-center gap-sm">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={match.predA}
                              disabled={isBettingClosed}
                              onChange={(e) => handlePredictionChange(match.id, "A", e.target.value)}
                              placeholder="-"
                              className="w-12 h-10 bg-surface-container border border-outline-variant/30 rounded-lg text-center font-bold text-sm text-on-surface focus:outline-none focus:border-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-outline-variant font-bold text-xs">x</span>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={match.predB}
                              disabled={isBettingClosed}
                              onChange={(e) => handlePredictionChange(match.id, "B", e.target.value)}
                              placeholder="-"
                              className="w-12 h-10 bg-surface-container border border-outline-variant/30 rounded-lg text-center font-bold text-sm text-on-surface focus:outline-none focus:border-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                            />

                            {!isBettingClosed && (
                              <button
                                type="button"
                                onClick={() => handleBetSubmit(match.id)}
                                disabled={match.predA === "" || match.predB === ""}
                                className="bg-tertiary text-on-tertiary text-xs font-bold px-md h-10 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 shadow-md shadow-tertiary/15"
                              >
                                {hasPredicted ? "Salvar" : "Palpitar"}
                              </button>
                            )}
                          </div>

                          {hasPredicted && (
                            <div className="flex items-center justify-center gap-xs text-[10px] pt-1 text-green-400 font-semibold">
                              <span className="material-symbols-outlined text-xs">done_all</span>
                              <span>Palpite Registrado: {userBet.predA} x {userBet.predB}</span>
                              {match.status === "finished" && (
                                <span className={`ml-1 px-2 py-0.5 rounded font-bold ${
                                  userBet.isWinner 
                                    ? "bg-green-500/20 text-green-400 border border-green-500/35" 
                                    : "bg-error/10 text-error border border-error/20"
                                }`}>
                                  {userBet.isWinner ? "+3 pts" : "0 pts"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </section>

      </div>

      {/* Coluna Direita: Ranking Mensal do Bolão (4 colunas no desktop) */}
      <div className="lg:col-span-4 space-y-md">
        
        <section className="glass-card rounded-xl p-md space-y-md">
          <div className="border-b border-outline-variant/10 pb-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
              Ranking do Bolão
            </h3>
            <p className="text-[10px] text-outline mt-1 leading-tight">
              Ranking acumulado do mês. Atualizado automaticamente ao fim de cada partida.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-variant/30 text-label-sm uppercase font-bold text-on-surface-variant">
                <tr>
                  <th className="px-sm py-2 text-[10px]">Pos</th>
                  <th className="px-sm py-2 text-[10px]">Jogador</th>
                  <th className="px-sm py-2 text-[10px] text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-xs">
                {bettingLeaderboard.map((lb, index) => {
                  const isUser = lb.userUid === user.uid;
                  return (
                    <tr key={lb.userUid} className={`hover:bg-surface-variant/20 transition-colors ${isUser ? "bg-tertiary/5 border-l-2 border-tertiary font-bold" : ""}`}>
                      <td className="px-sm py-3 font-bold text-on-surface">{index + 1}º</td>
                      <td className="px-sm py-3 text-on-surface flex items-center gap-sm">
                        {lb.avatar ? (
                          <img src={lb.avatar} alt={lb.name} className="w-6 h-6 rounded-full object-cover border border-outline-variant/10" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/10 text-outline">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                          </div>
                        )}
                        <span className="truncate max-w-[80px] md:max-w-[100px] flex items-center">
                          {lb.name.split(" ")[0]} {isUser && "(Você)"}
                          {renderUserLevelBadge(lb.userUid, lb.name)}
                        </span>
                      </td>
                      <td className="px-sm py-3 text-right font-bold text-tertiary">{lb.points} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>

    </div>
  );
}
