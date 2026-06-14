import React, { useState, useEffect } from "react";
import { dbService, getLocalTeamLogo } from "../firebase/dbService";
import { sportsApi } from "../services/sportsApi";

function TeamLogo({ logoUrl, teamName }) {
  const [imgError, setImgError] = useState(false);

  // Prioriza logo local baixado; só usa CDN se não tiver local
  const localLogo = getLocalTeamLogo(teamName);
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

export default function Community({ user, navigateTo, refreshUser }) {
  // --- Estados do Componente ---
  const [posts, setPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [usersMap, setUsersMap] = useState({});
  
  // Bolão e Partidas
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [bettingLeaderboard, setBettingLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("community_active_tab");
    if (saved) {
      localStorage.removeItem("community_active_tab");
      return saved;
    }
    return "feed";
  }); // feed | ranking_bolao
  const [bolaoSubTab, setBolaoSubTab] = useState("upcoming"); // upcoming | finished | all
  const [expandedMatchBets, setExpandedMatchBets] = useState(null); // ID do jogo para ver palpites
  const [betFeedback, setBetFeedback] = useState(null);

  // Estados de comentários
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [activePostComments, setActivePostComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");

  // --- Efeito: Carrega dados do Banco/LocalStorage ---
  const loadAllData = async () => {
    const p = await dbService.getPosts();
    setPosts(p);
    
    const l = await dbService.getLeaderboard();
    setLeaderboard(l);

    // Carrega o ranking mensal dos palpites
    const bl = await dbService.getBettingLeaderboard();
    setBettingLeaderboard(bl.sort((a, b) => b.points - a.points));

    // Carrega todos os palpites gerais
    const b = await dbService.getAllBets();
    setBets(b);

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
    } catch (e) {
      console.error("Erro ao carregar usuários e níveis", e);
    }

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
  };

  useEffect(() => {
    loadAllData();

    let unsubscribe = null;
    let pollInterval = null;

    if (dbService.isRealFirebase()) {
      unsubscribe = dbService.listenToBolaoGames(async (updatedGames) => {
        const b = await dbService.getAllBets();
        setMatches(prev => {
          return updatedGames.map(g => {
            const current = prev.find(p => p.id === g.id);
            const existingBet = b.find(bet => bet.matchId === g.id && bet.userUid === user.uid);
            return {
              ...g,
              predA: current && current.predA !== "" ? current.predA : (existingBet ? String(existingBet.predA) : ""),
              predB: current && current.predB !== "" ? current.predB : (existingBet ? String(existingBet.predB) : "")
            };
          });
        });
      });

      // Apenas o proprietário (owner) atualiza o banco real do Firebase com placares ao vivo
      if (user && user.role === "owner") {
        const runFirebasePoll = async () => {
          try {
            const oldGames = await dbService.getBolaoGames();
            await dbService.refreshLiveScores();
            const activeGames = await dbService.getBolaoGames();
            
            const oldGamesStr = JSON.stringify(oldGames.map(g => ({ id: g.id, status: g.status, scoreH: g.realScoreHome, scoreA: g.realScoreAway })));
            const newGamesStr = JSON.stringify(activeGames.map(g => ({ id: g.id, status: g.status, scoreH: g.realScoreHome, scoreA: g.realScoreAway })));
            
            if (oldGamesStr !== newGamesStr) {
              const freshPosts = await dbService.getPosts();
              setPosts(freshPosts);
              const bl = await dbService.getBettingLeaderboard();
              setBettingLeaderboard(bl.sort((a, b) => b.points - a.points));
            }
          } catch (e) {
            console.warn("Erro ao atualizar placares ao vivo no Firebase:", e);
          }
        };
        runFirebasePoll();
        pollInterval = setInterval(runFirebasePoll, 30_000);
      } else {
        // Se for cliente comum, atualiza APENAS localmente na tela para ver o "Ao Vivo" e placares
        const runLocalPoll = async () => {
          try {
            const leagues = await dbService.getMonitoredLeagues();
            const activeIds = leagues.filter(l => l.active).map(l => l.id);
            if (!activeIds.length) return;

            const liveMatches = await sportsApi.fetchLiveMatches(activeIds);
            const currentGames = await dbService.getBolaoGames();

            const now = new Date();
            const promises = currentGames.map(async (g) => {
              if (g.status === "finished") return null;

              const matchStartTime = new Date(`${g.date}T${g.time || "00:00"}:00-03:00`);
              const isPastKickoff = now >= matchStartTime;

              if (g.status === "live" || isPastKickoff) {
                const live = liveMatches.find(lm => String(lm.apiMatchId) === String(g.apiMatchId));
                if (live) return null;

                const res = await sportsApi.fetchMatchResult(g.apiMatchId, g.leagueId);
                if (res) {
                  return {
                    apiMatchId: g.apiMatchId,
                    status: res.status,
                    scoreHome: res.scoreHome,
                    scoreAway: res.scoreAway,
                    minute: res.minute || (res.status === "live" ? "Ao vivo" : null)
                  };
                }
              }
              return null;
            });

            const results = await Promise.all(promises);
            const validResults = results.filter(Boolean);
            const b = await dbService.getAllBets();

            setMatches(prev => {
              return currentGames.map(g => {
                const existingBet = b.find(bet => bet.matchId === g.id && bet.userUid === user.uid);
                
                const live = liveMatches.find(lm => String(lm.apiMatchId) === String(g.apiMatchId));
                let updatedGame = { ...g };
                
                if (live) {
                  updatedGame.status = "live";
                  updatedGame.realScoreHome = live.scoreHome;
                  updatedGame.realScoreAway = live.scoreAway;
                  updatedGame.minute = live.minute || "Ao vivo";
                } else {
                  const matchStartTime = new Date(`${g.date}T${g.time || "00:00"}:00-03:00`);
                  const isPastKickoff = now >= matchStartTime;
                  if (g.status === "live" || isPastKickoff) {
                    const indResult = validResults.find(r => String(r.apiMatchId) === String(g.apiMatchId));
                    if (indResult) {
                      updatedGame.status = indResult.status;
                      updatedGame.realScoreHome = indResult.scoreHome;
                      updatedGame.realScoreAway = indResult.scoreAway;
                      updatedGame.minute = indResult.minute || (indResult.status === "live" ? "Ao vivo" : null);
                    }
                  }
                }

                const current = prev.find(p => p.id === g.id);
                return {
                  ...updatedGame,
                  predA: current && current.predA !== "" ? current.predA : (existingBet ? String(existingBet.predA) : ""),
                  predB: current && current.predB !== "" ? current.predB : (existingBet ? String(existingBet.predB) : "")
                };
              });
            });
          } catch (e) {
            console.warn("Erro no poll local de placares ao vivo:", e);
          }
        };
        runLocalPoll();
        pollInterval = setInterval(runLocalPoll, 30_000);
      }
    } else {
      const runPoll = async () => {
        const oldGames = await dbService.getBolaoGames();
        await dbService.refreshLiveScores();
        const activeGames = await dbService.getBolaoGames();
        const b = await dbService.getAllBets();

        const oldGamesStr = JSON.stringify(oldGames.map(g => ({ id: g.id, status: g.status, scoreH: g.realScoreHome, scoreA: g.realScoreAway })));
        const newGamesStr = JSON.stringify(activeGames.map(g => ({ id: g.id, status: g.status, scoreH: g.realScoreHome, scoreA: g.realScoreAway })));

        if (oldGamesStr !== newGamesStr) {
          const freshPosts = await dbService.getPosts();
          setPosts(freshPosts);
          const bl = await dbService.getBettingLeaderboard();
          setBettingLeaderboard(bl.sort((a, b) => b.points - a.points));
          const l = await dbService.getLeaderboard();
          setLeaderboard(l);
          if (refreshUser) refreshUser();
        }

        setMatches(prev => {
          return activeGames.map(g => {
            const current = prev.find(p => p.id === g.id);
            const existingBet = b.find(bet => bet.matchId === g.id && bet.userUid === user.uid);
            return {
              ...g,
              predA: current && current.predA !== "" ? current.predA : (existingBet ? String(existingBet.predA) : ""),
              predB: current && current.predB !== "" ? current.predB : (existingBet ? String(existingBet.predB) : "")
            };
          });
        });
      };
      
      pollInterval = setInterval(runPoll, 15_000);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user]);

  const renderUserLevelBadge = (authorId, authorName) => {
    const info = usersMap[authorId] || usersMap[authorName];
    if (!info) return null;
    return (
      <span className="inline-flex items-center gap-1 bg-tertiary-container/20 text-tertiary border border-tertiary/20 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">
        <span>{info.badge}</span>
        <span>{info.nome}</span>
      </span>
    );
  };

  // --- Função para Curtir Post ---
  const handleLike = async (postId) => {
    try {
      const updatedLikes = await dbService.likePost(postId, user.uid);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: updatedLikes } : p));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Função para Reagir ao Post com Emojis ---
  const handleReactToPost = async (postId, reactionType) => {
    try {
      const localPosts = localStorage.getItem("clubber_posts") ? JSON.parse(localStorage.getItem("clubber_posts")) : posts;
      const updated = localPosts.map(p => {
        if (p.id === postId) {
          const reactions = p.reactions || {};
          const uids = reactions[reactionType] || [];
          const updatedUids = uids.includes(user.uid)
            ? uids.filter(uid => uid !== user.uid)
            : [...uids, user.uid];
          return {
            ...p,
            reactions: {
              ...reactions,
              [reactionType]: updatedUids
            }
          };
        }
        return p;
      });
      localStorage.setItem("clubber_posts", JSON.stringify(updated));
      setPosts(prev => prev.map(p => {
        const matching = updated.find(item => item.id === p.id);
        return matching ? matching : p;
      }));
    } catch (e) {
      console.error("Erro ao reagir ao post:", e);
    }
  };

  // --- Função para Reagir ao Comentário com Emojis ---
  const handleReactToComment = async (commentId, reactionType) => {
    try {
      const localComments = localStorage.getItem("clubber_comments") ? JSON.parse(localStorage.getItem("clubber_comments")) : [];
      const updated = localComments.map(c => {
        if (c.id === commentId) {
          const reactions = c.reactions || {};
          const uids = reactions[reactionType] || [];
          const updatedUids = uids.includes(user.uid)
            ? uids.filter(uid => uid !== user.uid)
            : [...uids, user.uid];
          return {
            ...c,
            reactions: {
              ...reactions,
              [reactionType]: updatedUids
            }
          };
        }
        return c;
      });
      localStorage.setItem("clubber_comments", JSON.stringify(updated));

      // Atualiza o estado local dos comentários do post aberto
      setActivePostComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const reactions = c.reactions || {};
          const uids = reactions[reactionType] || [];
          const updatedUids = uids.includes(user.uid)
            ? uids.filter(uid => uid !== user.uid)
            : [...uids, user.uid];
          return {
            ...c,
            reactions: {
              ...reactions,
              [reactionType]: updatedUids
            }
          };
        }
        return c;
      }));
    } catch (e) {
      console.error("Erro ao reagir ao comentário:", e);
    }
  };

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
      // Salva o palpite do usuário usando a API nova
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



  // --- Funções de Comentários ---
  const handleToggleComments = async (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      setActivePostComments([]);
    } else {
      setActiveCommentsPostId(postId);
      const comments = await dbService.getComments(postId);
      setActivePostComments(comments);
      setNewCommentText("");
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const newComment = await dbService.createComment(
        postId,
        user.uid,
        user.name,
        user.avatarUrl,
        newCommentText
      );
      setActivePostComments(prev => [...prev, newComment]);
      setNewCommentText("");

      // Atualiza o commentsCount na lista de posts local
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
        }
        return p;
      }));
    } catch (err) {
      console.error("Erro ao adicionar comentário", err);
    }
  };

  // --- Criar Postagem no Feed ---
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    setCreatingPost(true);
    try {
      const newPost = await dbService.createPost({
        authorUid: user.uid,
        authorName: user.name,
        authorAvatar: user.avatarUrl || null,
        content: newPostText,
        isOfficial: false
      });
      setPosts(prev => [newPost, ...prev]);
      setNewPostText("");
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingPost(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-md">
      
      {/* Coluna Esquerda: Bolão & Feed Principal */}
      <div className="lg:col-span-8 space-y-md">
        
        {/* Widget do Bolão da Rodada */}
        <section className="glass-card rounded-xl p-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-md opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <span className="material-symbols-outlined text-[80px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              sports_soccer
            </span>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="bg-tertiary/10 text-tertiary text-[10px] px-sm py-1 rounded-full border border-tertiary/20 uppercase font-bold tracking-widest">
                  Bolão Clubber
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface mt-2">Jogos da Rodada & Placar</h2>
              </div>
              <span className="text-tertiary text-xs font-semibold bg-tertiary-container/30 px-3 py-1 rounded-full border border-tertiary/20">
                Acerto = 3 pontos
              </span>
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
                Próximas Partidas (Em andamento/Agendados)
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
                Resultados Recentes (60 dias) (Encerrados)
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
                Todas (Listagem unificada)
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
                  const matchBets = bets.filter(b => b.matchId === match.id);
                  const hasPredicted = !!userBet;

                  // Ganhadores específicos desse jogo
                  const gameWinners = bets.filter(b => b.matchId === match.id && b.isWinner);

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

                      {/* 2. O resto que está embaixo dele no meio dele (Status e Palpite centralizados) */}
                      <div className="flex flex-col items-center gap-sm w-full text-center">
                        
                        {/* Status / Live Tracker */}
                        <div className="flex flex-col items-center">
                          {match.status === "live" ? (
                            <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> AO VIVO ({match.minute}')
                            </span>
                          ) : match.status === "finished" ? (
                            <span className="bg-surface-variant text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ENCERRADO
                            </span>
                          ) : (
                            <span className="bg-tertiary/10 border border-tertiary/20 text-tertiary text-[10px] font-bold px-2 py-0.5 rounded-full">
                              AGENDADO
                            </span>
                          )}
                          <span className="text-xs text-outline mt-1">{match.date} {match.time ? `às ${match.time}` : ""}</span>
                        </div>

                        {/* Entrada de Palpites ou Feedback */}
                        <div className="flex items-center justify-center w-full">
                          {match.status === "finished" ? (
                            <div className="flex flex-col items-center gap-1">
                              {hasPredicted ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-xs px-3 py-1 rounded font-bold ${
                                    userBet.isWinner 
                                      ? "bg-green-500/15 border border-green-500/30 text-green-400" 
                                      : "bg-surface-variant/50 border border-outline-variant/20 text-outline"
                                  }`}>
                                    Seu Palpite: {userBet.predA} x {userBet.predB}
                                  </span>
                                  <span className={`text-[11px] font-bold ${
                                    userBet.isWinner ? "text-tertiary" : "text-outline"
                                  }`}>
                                    {userBet.isWinner ? `🎉 Ganhou +${userBet.points || 0} pts!` : "Pontuação: 0 pts"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-outline italic">Não palpitou</span>
                              )}
                              {gameWinners.length > 0 && (
                                <span className="text-[10px] text-tertiary font-semibold mt-1">
                                  {gameWinners.length} acertaram o placar
                                </span>
                              )}
                            </div>
                          ) : isBettingClosed ? (
                            <div className="flex flex-col items-center">
                              {hasPredicted ? (
                                <span className="bg-green-500/15 border border-green-500/30 text-green-400 text-xs px-3 py-1 rounded font-bold">
                                  Seu Palpite: {userBet.predA} x {userBet.predB}
                                </span>
                              ) : (
                                <span className="text-[11px] text-outline font-semibold italic flex items-center gap-[2px] bg-surface-variant/40 border border-outline-variant/10 px-sm py-1 rounded">
                                  <span className="material-symbols-outlined text-[12px] font-bold">lock_clock</span>
                                  Apostas Encerradas
                                </span>
                              )}
                            </div>
                          ) : hasPredicted ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="bg-green-500/15 border border-green-500/30 text-green-400 text-xs px-3 py-1 rounded font-bold">
                                Seu Palpite: {userBet.predA} x {userBet.predB}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 justify-center">
                              {(!user || !user.plan) ? (
                                <span className="text-[11px] text-error font-semibold italic flex items-center gap-[2px] bg-error/5 border border-error/10 px-sm py-1 rounded">
                                  <span className="material-symbols-outlined text-[12px] font-bold">lock</span>
                                  Assinatura Necessária
                                </span>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={match.predA}
                                    onChange={(e) => handlePredictionChange(match.id, "A", e.target.value)}
                                    className="w-14 h-9 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-center font-bold text-sm text-on-surface focus:outline-none focus:border-tertiary"
                                  />
                                  <span className="text-[10px] text-outline">x</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={match.predB}
                                    onChange={(e) => handlePredictionChange(match.id, "B", e.target.value)}
                                    className="w-14 h-9 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-center font-bold text-sm text-on-surface focus:outline-none focus:border-tertiary"
                                  />
                                  <button
                                    onClick={() => handleBetSubmit(match.id)}
                                    disabled={match.predA === "" || match.predB === ""}
                                    className="bg-tertiary text-on-tertiary px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all uppercase shadow"
                                  >
                                    Palpitar
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rodapé do Jogo: Mostrar Palpites dos Membros & Ganhadores da Rodada */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-xs justify-between items-center text-xs border-t border-outline-variant/5 w-full">
                        <button
                          type="button"
                          onClick={() => setExpandedMatchBets(expandedMatchBets === match.id ? null : match.id)}
                          className="text-on-surface-variant hover:text-tertiary flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          {expandedMatchBets === match.id ? "Ocultar Palpites" : `Ver Palpites (${matchBets.length})`}
                        </button>

                        {match.status === "finished" && gameWinners.length > 0 && (
                          <div className="text-green-400 flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                            Acertaram: {gameWinners.map(w => w.userName).join(", ")}
                          </div>
                        )}
                      </div>

                      {/* Painel Expansível de Palpites dos Membros */}
                      {expandedMatchBets === match.id && (
                        <div className="p-sm bg-surface-container-low rounded-lg space-y-sm text-xs mt-2 border border-outline-variant/15 w-full text-left">
                          <p className="font-bold text-outline uppercase tracking-wider">Palpites Recebidos:</p>
                          {matchBets.length === 0 ? (
                            <p className="text-on-surface-variant italic">Nenhum palpite registrado para este jogo.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {matchBets.map((b) => (
                                <div key={b.id} className="flex flex-col p-xs bg-surface-container rounded border border-outline-variant/5 gap-1">
                                  <div className="flex items-center flex-wrap">
                                    <span className="font-semibold text-on-surface">{b.userName}</span>
                                    {renderUserLevelBadge(b.userUid, b.userName)}
                                  </div>
                                  <span className={`font-bold px-2 py-0.5 rounded text-center ${
                                    b.isWinner ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-surface-variant text-outline"
                                  }`}>
                                    {b.predA} x {b.predB} {b.isWinner && "(Acertou!)"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </section>

        {/* Abas e Listas de Feed/Ranking de Palpites */}
        <div className="flex border-b border-outline-variant/20">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-lg py-sm font-headline-md text-headline-md transition-all ${
              activeTab === "feed" ? "border-b-2 border-tertiary text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            Comunidade
          </button>
          <button
            onClick={() => setActiveTab("ranking_bolao")}
            className={`px-lg py-sm font-headline-md text-headline-md transition-all flex items-center gap-sm ${
              activeTab === "ranking_bolao" ? "border-b-2 border-tertiary text-tertiary font-bold" : "text-outline hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "ranking_bolao" ? "'FILL' 1" : "'FILL' 0" }}>emoji_events</span>
            Ranking do Bolão
          </button>
        </div>

        {activeTab === "feed" ? (
          <>
            {/* Escrever Nova Publicação */}
            <section className="glass-card rounded-xl p-md">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Compartilhe na Comunidade</h3>
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="O que está pensando hoje sobre o estilo?"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md text-on-surface focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all"
                  rows="3"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingPost || !newPostText.trim()}
                    className="bg-surface-container-highest border border-outline-variant/30 text-on-surface hover:bg-surface-bright px-md py-2 rounded-lg font-label-md text-label-md active:scale-95 duration-150 transition-all flex items-center gap-xs disabled:opacity-50"
                  >
                    {creatingPost ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </form>
            </section>

            {/* Feed de Posts */}
            <div className="space-y-md">
              {posts.map((post) => {
                const hasLiked = post.likes && Array.isArray(post.likes) ? post.likes.includes(user.uid) : false;

                return (
                  <article key={post.id} className="glass-card rounded-xl overflow-hidden">
                    <div className="p-md flex items-center gap-sm">
                      {post.authorAvatar ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
                          <span className="material-symbols-outlined">
                            {post.isOfficial ? "content_cut" : "person"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold flex items-center flex-wrap">
                          <span>{post.authorName}</span>
                          {!post.isOfficial && renderUserLevelBadge(post.authorUid, post.authorName)}
                          <span className="text-on-surface-variant font-normal ml-2">
                            • {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </p>
                        {post.isOfficial && <p className="text-tertiary text-xs">Atualização Oficial</p>}
                      </div>
                    </div>

                    <div className="px-md pb-md">
                      <p className="font-body-md text-on-surface-variant">{post.content}</p>
                    </div>

                    {post.imageUrl && (
                      <div className="relative h-64 overflow-hidden border-t border-b border-outline-variant/10">
                        <img src={post.imageUrl} alt="Post media" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="p-md flex items-center justify-between border-t border-outline-variant/20">
                      <div className="flex gap-md items-center flex-wrap">
                        {/* Botões de Reações com Emojis */}
                        {[
                          { type: "like", emoji: "👍", label: "Gostei" },
                          { type: "love", emoji: "❤️", label: "Amei" },
                          { type: "fire", emoji: "🔥", label: "Brabo" },
                          { type: "style", emoji: "✂️", label: "Estilo" }
                        ].map(react => {
                          const pReactions = post.reactions || {};
                          const usersList = pReactions[react.type] || [];
                          const hasReacted = usersList.includes(user.uid);
                          return (
                            <button
                              key={react.type}
                              onClick={() => handleReactToPost(post.id, react.type)}
                              className={`flex items-center gap-xs px-2.5 py-1 rounded-full text-xs transition-all border ${
                                hasReacted 
                                  ? "bg-tertiary/15 border-tertiary text-tertiary font-bold" 
                                  : "bg-surface-variant/40 border-transparent text-on-surface-variant hover:bg-surface-variant"
                              }`}
                              title={react.label}
                            >
                              <span>{react.emoji}</span>
                              {usersList.length > 0 && <span className="text-[10px]">{usersList.length}</span>}
                            </button>
                          );
                        })}

                        <div className="w-[1px] bg-outline-variant/30 h-4 mx-xs"></div>
                        
                        <button 
                          onClick={() => handleToggleComments(post.id)}
                          className={`flex items-center gap-xs hover:text-tertiary transition-colors ${
                            activeCommentsPostId === post.id ? "text-tertiary" : "text-on-surface-variant"
                          }`}
                        >
                          <span className="material-symbols-outlined text-md">chat_bubble</span>
                          <span className="font-label-sm">{post.commentsCount || 0}</span>
                        </button>
                      </div>
                      
                      <button className="text-on-surface-variant hover:text-tertiary transition-colors">
                        <span className="material-symbols-outlined">share</span>
                      </button>
                    </div>

                    {/* Painel de Comentários */}
                    {activeCommentsPostId === post.id && (
                      <div className="border-t border-outline-variant/20 p-md bg-surface-container-low/40 space-y-md">
                        <h4 className="font-label-sm font-bold text-outline uppercase tracking-wider text-xs">
                          Comentários
                        </h4>
                        
                        <div className="space-y-sm max-h-60 overflow-y-auto custom-scrollbar pr-xs">
                          {activePostComments.length === 0 ? (
                            <p className="text-xs text-on-surface-variant italic">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                          ) : (
                            activePostComments.map((comment) => (
                              <div key={comment.id} className="flex gap-sm items-start text-xs bg-surface-container/50 p-sm rounded-lg border border-outline-variant/5">
                                {comment.authorAvatar ? (
                                  <img src={comment.authorAvatar} alt={comment.authorName} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                  </div>
                                )}
                                <div className="flex-1 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-on-surface flex items-center flex-wrap">
                                      <span>{comment.authorName}</span>
                                      {renderUserLevelBadge(comment.authorUid, comment.authorName)}
                                    </span>
                                    <span className="text-[10px] text-outline">
                                      {new Date(comment.createdAt).toLocaleDateString("pt-BR")} às {new Date(comment.createdAt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                  <p className="text-on-surface-variant text-xs">{comment.content}</p>
                                  
                                  {/* Reações nos Comentários */}
                                  <div className="flex gap-xs items-center pt-xs flex-wrap">
                                    {[
                                      { type: "like", emoji: "👍" },
                                      { type: "love", emoji: "❤️" },
                                      { type: "fire", emoji: "🔥" }
                                    ].map(react => {
                                      const cReactions = comment.reactions || {};
                                      const usersList = cReactions[react.type] || [];
                                      const hasReacted = usersList.includes(user.uid);
                                      return (
                                        <button
                                          key={react.type}
                                          onClick={() => handleReactToComment(comment.id, react.type)}
                                          className={`flex items-center justify-center gap-[2px] px-2 py-0.5 rounded-full text-[10px] transition-all border ${
                                            hasReacted 
                                              ? "bg-tertiary/20 border-tertiary text-tertiary font-bold" 
                                              : "bg-surface-container-low border-transparent text-outline hover:bg-surface-container-high"
                                          }`}
                                        >
                                          <span>{react.emoji}</span>
                                          {usersList.length > 0 && <span>{usersList.length}</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Formulário de Envio de Comentário */}
                        <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-sm">
                          <input
                            type="text"
                            placeholder="Escreva um comentário..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-2 text-xs text-on-surface focus:outline-none focus:border-tertiary"
                            required
                          />
                          <button
                            type="submit"
                            className="bg-tertiary text-on-tertiary px-md py-2 rounded-lg text-xs font-bold uppercase hover:brightness-110 active:scale-95 transition-all"
                          >
                            Comentar
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          /* Ranking Mensal do Bolão */
          <section className="glass-card rounded-xl p-md space-y-md">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">Ranking do Mês (Bolão)</h3>
              <span className="text-xs text-outline italic">Atualizado após o encerramento de cada partida</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                  <tr>
                    <th className="px-md py-sm">Posição</th>
                    <th className="px-md py-sm">Jogador</th>
                    <th className="px-md py-sm text-center">Acertos Exatos</th>
                    <th className="px-md py-sm text-right">Pontos Totais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {bettingLeaderboard.map((lb, index) => {
                    const isUser = lb.userUid === user.uid;
                    return (
                      <tr key={lb.userUid} className={`hover:bg-surface-variant/20 transition-colors ${isUser ? "bg-tertiary/5 border-l-2 border-tertiary" : ""}`}>
                        <td className="px-md py-md font-bold text-on-surface">{index + 1}º</td>
                        <td className="px-md py-md font-semibold text-on-surface flex items-center gap-sm">
                          {lb.avatar ? (
                            <img src={lb.avatar} alt={lb.name} className="w-8 h-8 rounded-full object-cover border border-outline-variant/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/10">
                              <span className="material-symbols-outlined text-[18px]">person</span>
                            </div>
                          )}
                          <span className="flex items-center flex-wrap gap-xs">
                            <span>{lb.name} {isUser && "(Você)"}</span>
                            {renderUserLevelBadge(lb.userUid, lb.name)}
                          </span>
                        </td>
                        <td className="px-md py-md text-center font-bold text-on-surface">{lb.correctGuesses}</td>
                        <td className="px-md py-md text-right font-display-lg text-headline-md text-tertiary">{lb.points} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* Coluna Direita: Ranking Geral de XP (Leaderboard) */}
      <div className="lg:col-span-4 space-y-md sticky top-24 h-fit">
        <section className="glass-card rounded-xl p-md space-y-lg">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            Ranking de XP (Geral)
          </h3>

          <div className="space-y-lg">
            {leaderboard.map((member, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;

              return (
                <div key={index} className="relative flex items-center gap-md group cursor-default">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full p-1 border ${
                      isFirst ? "border-tertiary w-14 h-14" : "border-outline-variant"
                    }`}>
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-outline">person</span>
                        </div>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isFirst ? "bg-tertiary text-on-tertiary w-6 h-6 -top-2" : "bg-outline-variant text-on-surface"
                    }`}>
                      {rank}º
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-label-md text-label-md text-on-surface font-semibold flex items-center flex-wrap">
                      <span>{member.name}</span>
                      {renderUserLevelBadge(member.uid, member.name)}
                    </p>
                    <div className="w-full bg-surface-variant h-1 rounded-full mt-xs overflow-hidden">
                      <div 
                        className={`h-full ${isFirst ? "bg-gradient-to-r from-tertiary to-tertiary-fixed-dim xp-glow" : "bg-outline"}`}
                        style={{ width: `${85 - rank * 15}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-label-md ${isFirst ? "text-tertiary" : "text-on-surface"}`}>{member.xp.toLocaleString()}</p>
                    <p className="text-[10px] text-on-surface-variant">XP</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full py-sm border border-outline-variant/30 rounded-lg text-label-sm font-label-sm hover:bg-surface-variant transition-colors">
            Ver Ranking Completo
          </button>
        </section>

        {/* Trending */}
        <section className="glass-card rounded-xl p-md space-y-md">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Trending</h3>
          <div className="flex flex-wrap gap-xs">
            <span className="bg-surface-variant px-sm py-1 rounded-full text-xs hover:text-tertiary transition-colors cursor-pointer">
              #EstiloClubber
            </span>
            <span className="bg-surface-variant px-sm py-1 rounded-full text-xs hover:text-tertiary transition-colors cursor-pointer">
              #SharpEdgeIPA
            </span>
            <span className="bg-surface-variant px-sm py-1 rounded-full text-xs hover:text-tertiary transition-colors cursor-pointer">
              #GoldenHour
            </span>
          </div>
        </section>
      </div>

    </div>
  );
}
