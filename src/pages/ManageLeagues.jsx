import { useState, useEffect, useCallback, useRef } from "react";
import { dbService } from "../firebase/dbService";
import { sportsApi } from "../services/sportsApi";

export default function ManageLeagues() {
  const [leagues, setLeagues]               = useState([]);
  const [syncedGames, setSyncedGames]       = useState([]);
  const [syncing, setSyncing]               = useState(false);
  const [message, setMessage]               = useState(null);
  const [apiConfigured]                     = useState(true); // ESPN API: sem chave necessária
  const [lastSync, setLastSync]             = useState(null);
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);
  const [filterTab, setFilterTab]           = useState("upcoming"); // upcoming | finished | all
  const pollRef                             = useRef(null);

  const showMsg = (type, text, duration = 5000) => {
    setMessage({ type, text });
    if (duration) setTimeout(() => setMessage(null), duration);
  };

  // --- Carrega ligas e jogos ---
  const loadData = useCallback(async () => {
    try {
      const apiLeagues  = await sportsApi.fetchLeagues();
      const monitored   = await dbService.getMonitoredLeagues();

      const mapped = apiLeagues.map(l => {
        const mon = monitored.find(m => m.id === l.id);
        return { ...l, active: mon ? mon.active : false };
      });
      setLeagues(mapped);

      const games = await dbService.getBolaoGames();
      setSyncedGames(games);
      return games;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  // --- Polling de placares ao vivo ---
  const refreshLive = useCallback(async () => {
    try {
      const updated = await dbService.refreshLiveScores();
      if (updated) {
        setSyncedGames([...updated]);
      }
    } catch (e) {
      console.warn("[live] erro no refresh:", e.message);
    }
  }, []);

  // Configura o intervalo de polling baseado nos jogos ao vivo
  const setupPolling = useCallback((games) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const hasLive      = games.some(g => g.status === "live");
    const hasScheduled = games.some(g => g.status === "scheduled");

    if (hasLive) {
      // Jogo ao vivo: atualiza a cada 30 segundos
      setIsLiveMonitoring(true);
      pollRef.current = setInterval(refreshLive, 30_000);
      console.log("[live] Polling ativado: 30s (jogos ao vivo)");
    } else if (hasScheduled) {
      // Apenas agendados: verifica a cada 5 minutos se algum iniciou
      setIsLiveMonitoring(false);
      pollRef.current = setInterval(refreshLive, 5 * 60_000);
      console.log("[live] Polling ativado: 5min (aguardando jogos)");
    } else {
      setIsLiveMonitoring(false);
      console.log("[live] Polling desativado (nenhum jogo ativo)");
    }
  }, [refreshLive]);

  useEffect(() => {
    loadData().then(games => {
      if (games?.length) setupPolling(games);
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadData, setupPolling]);

  // Quando jogos são atualizados, reconfigura o polling
  useEffect(() => {
    if (syncedGames.length > 0) setupPolling(syncedGames);
  }, [syncedGames, setupPolling]);

  // --- Toggle liga ativada/desativada ---
  const handleToggle = async (leagueId, currentActive) => {
    try {
      await dbService.toggleLeague(leagueId, !currentActive);
      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, active: !currentActive } : l));
    } catch (e) {
      console.error(e);
      showMsg("error", "Erro ao salvar configuração da liga.");
    }
  };

  // --- Sincronizar jogos reais da API ---
  const handleForceSync = async () => {
    const activeCount = leagues.filter(l => l.active).length;
    if (activeCount === 0) {
      showMsg("error", "Ative pelo menos uma liga antes de sincronizar.");
      return;
    }

    setSyncing(true);
    setMessage(null);
    try {
      const games = await dbService.syncGamesFromApi();
      const newCount = games.filter(g => g.apiMatchId).length;
      setLastSync(new Date().toLocaleTimeString("pt-BR"));
      setSyncedGames(games);
      setupPolling(games); // reinicia o polling com os novos jogos
      showMsg("success", `✅ ${newCount} partidas encontradas! Monitoramento em tempo real ativado.`);
    } catch (e) {
      if (e.message === "NO_ACTIVE_LEAGUES") {
        showMsg("error", "Ative pelo menos uma liga antes de sincronizar.");
      } else {
        showMsg("error", `Erro ao buscar partidas: ${e.message}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  // --- Processar resultado real (admin) ---
  const handleProcessResult = async (gameId, scoreHome, scoreAway) => {
    try {
      await dbService.processGameResult(gameId, parseInt(scoreHome), parseInt(scoreAway));
      showMsg("success", `Resultado registrado: ${scoreHome} x ${scoreAway}. Palpites computados!`);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const activeLeaguesCount = leagues.filter(l => l.active).length;
  const liveGames          = syncedGames.filter(g => g.status === "live");
  const scheduledGames     = syncedGames.filter(g => g.status === "scheduled");
  const finishedGames      = syncedGames.filter(g => g.status === "finished");

  return (
    <div className="space-y-md">

      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            Monitoramento de Jogos (Bolão)
          </h2>
        <p className="text-on-surface-variant font-body-md text-sm">
            Ative as ligas e clique em <strong>Sincronizar Agora</strong> para buscar partidas reais.
            {lastSync && <span className="ml-2 text-tertiary font-bold">Última sync: {lastSync}</span>}
          </p>
        </div>

        <div className="flex items-center gap-sm flex-wrap">
            {/* Badge ESPN */}
            <span className="bg-surface-container text-tertiary border border-tertiary/20 font-bold px-md py-sm rounded-lg text-xs uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              ESPN API
            </span>

            {/* Badge ao vivo */}
            {isLiveMonitoring && (
              <span className="bg-red-500/10 text-red-400 border border-red-500/30 font-bold px-md py-sm rounded-lg text-xs uppercase flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                Ao Vivo — atualizando
              </span>
            )}

          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="bg-tertiary text-on-tertiary font-bold px-md py-sm rounded-lg text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-tertiary/15 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${syncing ? "animate-spin" : ""}`}>sync</span>
            {syncing ? "Buscando..." : "Sincronizar Agora"}
          </button>
        </div>
      </section>


      {/* Alertas */}
      {message && (
        <div className={`p-md rounded-xl border flex items-center gap-sm transition-all duration-300 ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-error-container/20 border-error/20 text-error"
        }`}>
          <span className="material-symbols-outlined">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          <span className="font-body-md text-xs flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Stats rápidos */}
      {syncedGames.length > 0 && (
        <div className="grid grid-cols-3 gap-sm">
          {[
            { label: "Ao Vivo", count: liveGames.length, color: "text-red-400", bg: "bg-red-500/10", icon: "sports_soccer" },
            { label: "Agendados", count: scheduledGames.length, color: "text-tertiary", bg: "bg-tertiary/10", icon: "calendar_today" },
            { label: "Encerrados", count: finishedGames.length, color: "text-on-surface-variant", bg: "bg-surface-container", icon: "check_circle" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-sm border border-outline-variant/10 flex items-center gap-sm`}>
              <span className={`material-symbols-outlined ${s.color} text-xl`}>{s.icon}</span>
              <div>
                <div className={`font-black text-lg ${s.color}`}>{s.count}</div>
                <div className="text-xs text-on-surface-variant">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid de Campeonatos */}
      <section className="glass-card p-md rounded-xl space-y-sm">
        <h3 className="font-bold text-on-surface text-sm flex items-center gap-xs mb-sm">
          <span className="material-symbols-outlined text-tertiary">trophy</span>
          Campeonatos Disponíveis
          <span className="ml-auto text-xs text-on-surface-variant font-normal">{activeLeaguesCount} ativo(s)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {leagues.map(l => (
            <div
              key={l.id}
              className={`flex items-center justify-between p-sm rounded-xl border transition-all ${
                l.active
                  ? "bg-tertiary/8 border-tertiary/30"
                  : "bg-surface-container-low/40 border-outline-variant/10"
              }`}
            >
              <div className="flex items-center gap-sm">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xl shrink-0">
                  {l.logo}
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">{l.name}</h4>
                  <p className="text-xs text-on-surface-variant">{l.country}</p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(l.id, l.active)}
                className={`w-12 h-6 rounded-full relative transition-all duration-200 shrink-0 ${
                  l.active ? "bg-tertiary shadow-sm shadow-tertiary/30" : "bg-surface-variant border border-outline-variant/30"
                }`}
                title={l.active ? "Desativar monitoramento" : "Ativar monitoramento"}
              >
                <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-sm ${
                  l.active ? "right-0.5" : "left-0.5"
                }`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Tabela de Partidas */}
      <section className="glass-card p-md rounded-xl space-y-md">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
          <span className="material-symbols-outlined text-tertiary">sports_soccer</span>
          Partidas — Tempo Real
          {!apiConfigured && (
            <span className="ml-auto text-xs text-on-surface-variant font-normal bg-surface-container px-2 py-0.5 rounded-full">
              Configure a API para dados reais
            </span>
          )}
        </h3>

        {/* Abas de Filtro */}
        <div className="flex border-b border-outline-variant/10 gap-sm pb-1 mb-md">
          <button
            type="button"
            onClick={() => setFilterTab("upcoming")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              filterTab === "upcoming"
                ? "border-tertiary text-tertiary font-bold"
                : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            Próximas Partidas (Em andamento/Agendados) ({liveGames.length + scheduledGames.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("finished")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              filterTab === "finished"
                ? "border-tertiary text-tertiary font-bold"
                : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            Resultados Recentes (60 dias) (Encerrados) ({finishedGames.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              filterTab === "all"
                ? "border-tertiary text-tertiary font-bold"
                : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            Todas (Listagem unificada) ({syncedGames.length})
          </button>
        </div>

        <div className="overflow-x-auto border border-outline-variant/10 rounded-xl">
          {(() => {
            const filteredGames = syncedGames.filter(g => {
              if (filterTab === "upcoming") return g.status === "live" || g.status === "scheduled";
              if (filterTab === "finished") return g.status === "finished";
              return true;
            });

            if (filteredGames.length === 0) {
              return (
                <div className="py-xl text-center bg-surface-container-low/30">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-sm">sports_soccer</span>
                  <p className="text-sm text-on-surface-variant font-bold mb-xs">Nenhuma partida encontrada</p>
                  <p className="text-xs text-on-surface-variant/60">
                    Não há partidas registradas para o filtro selecionado.
                  </p>
                </div>
              );
            }

            return (
              <table className="w-full text-left">
                <thead className="bg-surface-variant/50 text-label-sm uppercase font-bold text-on-surface-variant">
                  <tr>
                    <th className="px-md py-sm">Liga</th>
                    <th className="px-md py-sm">Partida</th>
                    <th className="px-md py-sm">Data/Hora</th>
                    <th className="px-md py-sm">Status / Placar</th>
                    <th className="px-md py-sm text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredGames.map(g => {
                    const isFinished = g.status === "finished";
                    const isLive     = g.status === "live";
                    return (
                      <tr key={g.id} className={`hover:bg-surface-variant/15 transition-colors ${isLive ? "bg-red-500/5" : ""}`}>
                        <td className="px-md py-sm text-xs text-on-surface-variant font-bold whitespace-nowrap">
                          {g.leagueName}
                          {g.matchday && <span className="ml-1 text-outline font-normal">R{g.matchday}</span>}
                        </td>
                        <td className="px-md py-sm font-bold text-on-surface">
                          <div className="flex items-center gap-xs flex-wrap">
                            <TeamCrest logo={g.homeLogo} name={g.homeTeam} />
                            <span className="text-sm">{g.homeTeam}</span>
                            <span className="text-outline text-xs px-1">vs</span>
                            <span className="text-sm">{g.awayTeam}</span>
                            <TeamCrest logo={g.awayLogo} name={g.awayTeam} />
                          </div>
                        </td>
                        <td className="px-md py-sm text-xs text-on-surface-variant font-mono whitespace-nowrap">
                          {g.date ? new Date(g.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                          {g.time ? ` às ${g.time}` : ""}
                        </td>
                        <td className="px-md py-sm">
                          {isLive ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse w-fit">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                              AO VIVO {g.realScoreHome ?? "–"} x {g.realScoreAway ?? "–"}
                              {g.minute && <span className="ml-1">({g.minute}')</span>}
                            </span>
                          ) : isFinished ? (
                            <span className="font-mono text-tertiary font-bold text-sm bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded">
                              {g.realScoreHome} x {g.realScoreAway}
                            </span>
                          ) : (
                            <span className="text-xs text-outline bg-surface-container px-2 py-0.5 rounded uppercase">
                              Agendado
                            </span>
                          )}
                        </td>
                        <td className="px-md py-sm text-right">
                          {!isFinished && (
                            <ResultInputCell gameId={g.id} onProcess={handleProcessResult} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      </section>
    </div>
  );
}

// --- Sub-componentes locais ---

function TeamCrest({ logo, name }) {
  const [err, setErr] = useState(false);
  if (!logo || err) return null;
  return (
    <img
      src={logo}
      alt={name}
      className="w-5 h-5 object-contain rounded bg-surface-container-lowest shrink-0"
      onError={() => setErr(true)}
    />
  );
}

function ResultInputCell({ gameId, onProcess }) {
  const [open, setOpen]   = useState(false);
  const [sA, setSA]       = useState("");
  const [sB, setSB]       = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-secondary-container text-tertiary text-[10px] font-bold px-2 py-1 rounded border border-tertiary/30 uppercase tracking-tighter hover:brightness-110 active:scale-95"
      >
        Inserir Resultado
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <input
        type="number" min="0" max="99"
        value={sA} onChange={e => setSA(e.target.value)}
        className="w-10 h-7 bg-surface-container border border-outline-variant/40 rounded text-center text-xs font-bold focus:outline-none focus:border-tertiary"
        placeholder="0"
      />
      <span className="text-outline text-[10px]">x</span>
      <input
        type="number" min="0" max="99"
        value={sB} onChange={e => setSB(e.target.value)}
        className="w-10 h-7 bg-surface-container border border-outline-variant/40 rounded text-center text-xs font-bold focus:outline-none focus:border-tertiary"
        placeholder="0"
      />
      <button
        onClick={() => { if (sA !== "" && sB !== "") { onProcess(gameId, sA, sB); setOpen(false); } }}
        disabled={sA === "" || sB === ""}
        className="bg-tertiary text-on-tertiary text-[10px] font-bold px-2 py-1 rounded uppercase disabled:opacity-40 hover:brightness-110 active:scale-95"
      >
        OK
      </button>
      <button onClick={() => setOpen(false)} className="text-outline text-[10px] px-1">✕</button>
    </div>
  );
}
