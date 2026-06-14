/**
 * sportsApi.js — Integração com ESPN API (pública, sem chave, CORS habilitado)
 *
 * A ESPN API é completamente gratuita, não exige chave e permite chamadas
 * diretas do browser em qualquer domínio (CORS: Access-Control-Allow-Origin: *)
 *
 * Endpoint base: https://site.api.espn.com/apis/site/v2/sports/soccer/{LIGA}/scoreboard
 *
 * Ligas suportadas:
 *   - Copa do Mundo 2026: fifa.world
 *   - Brasileirão Série A: bra.1
 *   - Champions League: uefa.champions
 */

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

// Mapeamento das nossas ligas para os slugs da ESPN
const LEAGUE_IDS = {
  "league_BSA": { espn: "bra.1",          name: "Brasileirão Série A", country: "Brazil", logo: "🇧🇷" },
  "league_CL":  { espn: "uefa.champions",  name: "Champions League",    country: "Europe", logo: "🏆" },
  "league_WC":  { espn: "fifa.world",      name: "Copa do Mundo",       country: "Mundo",  logo: "🌎" },
};

// ─── Sem API key necessária ──────────────────────────────────────────────────
export function saveApiKey(key) {
  // Mantido para compatibilidade com o painel — não é necessário para a ESPN
  if (key) localStorage.setItem("clubber_football_api_key", key.trim());
}

export function hasApiKey() {
  // ESPN não exige chave — sempre disponível
  return true;
}

// ─── Parse da data UTC do ESPN ───────────────────────────────────────────────
function parseEspnDate(isoDate) {
  const d = new Date(isoDate);
  // Converte a data UTC recebida da ESPN diretamente para o fuso horário de Brasília (-03:00)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  
  const date = `${map.year}-${map.month}-${map.day}`;
  const time = `${map.hour}:${map.minute}`;
  return { date, time };
}

// ─── Parse do status ESPN → nosso formato ───────────────────────────────────
function parseEspnStatus(statusName, state) {
  if (state === "post") return "finished";
  if (state === "in") return "live";
  if (state === "pre") return "scheduled";

  if (!statusName) return "scheduled";
  const name = String(statusName).toUpperCase();
  if (name.includes("FINAL") || name.includes("FULL_TIME") || name.includes("FINISHED")) return "finished";
  if (name.includes("PROGRESS") || name.includes("HALFTIME") || name.includes("LIVE")) return "live";
  return "scheduled"; // STATUS_SCHEDULED, STATUS_POSTPONED, etc.
}

// ─── Busca jogos de uma liga na ESPN ─────────────────────────────────────────
async function espnFetch(leagueSlug, dateFrom, dateTo) {
  const pad = (n) => String(n).padStart(2, "0");
  const fmtEspn = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const from = fmtEspn(new Date(dateFrom));
  const to   = fmtEspn(new Date(dateTo));

  const url = `${ESPN_BASE}/${leagueSlug}/scoreboard?dates=${from}-${to}&limit=100`;
  console.log(`[sportsApi] ESPN fetch: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[sportsApi] ESPN HTTP ${res.status} para ${leagueSlug}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[sportsApi] ESPN falhou para ${leagueSlug}:`, e.message);
    return null;
  }
}

// ─── Converte um evento ESPN para o nosso formato de jogo ────────────────────
function parseEspnEvent(event, leagueId, leagueInfo) {
  const comp    = event.competitions?.[0];
  if (!comp) return null;

  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === "home") || competitors[0];
  const awayComp = competitors.find((c) => c.homeAway === "away") || competitors[1];
  if (!homeComp || !awayComp) return null;

  const { date, time } = parseEspnDate(event.date || comp.date);
  const statusType = comp.status?.type;
  const status     = parseEspnStatus(statusType?.name, statusType?.state);
  const isFinished = status === "finished";

  const homeScore = parseInt(homeComp.score, 10);
  const awayScore = parseInt(awayComp.score, 10);

  return {
    id:            `espn_${leagueInfo.espn}_${event.id}`,
    apiMatchId:    event.id,
    leagueName:    leagueInfo.name,
    leagueId,
    homeTeam:      homeComp.team?.displayName || homeComp.team?.name || "",
    awayTeam:      awayComp.team?.displayName || awayComp.team?.name || "",
    homeLogo:      homeComp.team?.logo || null,
    awayLogo:      awayComp.team?.logo || null,
    date,
    time,
    startTimestamp: event.date || comp.date || null,
    status,
    realScoreHome: isFinished && !isNaN(homeScore) ? homeScore : null,
    realScoreAway: isFinished && !isNaN(awayScore) ? awayScore : null,
    minute:        status === "live" ? comp.status?.displayClock || null : null,
    matchday:      comp.week?.number || null,
    stage:         comp.type?.text || null,
  };
}

// ─── API pública ─────────────────────────────────────────────────────────────
export const sportsApi = {

  /** Retorna as ligas disponíveis para ativação no painel */
  fetchLeagues: async () => {
    return Object.entries(LEAGUE_IDS).map(([id, info]) => ({
      id,
      name: info.name,
      country: info.country,
      logo: info.logo,
    }));
  },

  /**
   * Busca partidas dos próximos 7 dias a partir de hoje (janela rolante).
   * Isso garante que jogos que começam amanhã ou depois de amanhã sempre aparecem.
   * Usa a ESPN API — sem chave, CORS habilitado.
   */
  fetchFixtures: async (leagueId) => {
    const leagueInfo = LEAGUE_IDS[leagueId];
    if (!leagueInfo) return [];

    // Janela rolante: hoje até +7 dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    console.log(`[sportsApi] Buscando ${leagueInfo.name} de ${fmt(today)} a ${fmt(endDate)}`);

    const data = await espnFetch(leagueInfo.espn, fmt(today), fmt(endDate));
    if (!data?.events) {
      console.warn(`[sportsApi] ESPN não retornou eventos para ${leagueInfo.name}`);
      return [];
    }

    const games = data.events
      .map((ev) => parseEspnEvent(ev, leagueId, leagueInfo))
      .filter(Boolean);

    console.log(`[sportsApi] ✅ ${games.length} partidas encontradas para ${leagueInfo.name}`);
    return games;
  },

  /**
   * Busca o resultado de uma partida pelo id ESPN.
   */
  fetchMatchResult: async (apiMatchId, leagueId) => {
    if (!apiMatchId || !leagueId) return null;
    const leagueInfo = LEAGUE_IDS[leagueId];
    if (!leagueInfo) return null;

    try {
      const url = `${ESPN_BASE}/${leagueInfo.espn}/summary?event=${apiMatchId}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      const statusType = data.header?.competitions?.[0]?.status?.type;
      const status = parseEspnStatus(statusType?.name, statusType?.state);
      const comps  = data.header?.competitions?.[0]?.competitors || [];
      const homeC  = comps.find((c) => c.homeAway === "home");
      const awayC  = comps.find((c) => c.homeAway === "away");

      return {
        apiMatchId,
        status,
        scoreHome: (status === "finished" || status === "live") ? (parseInt(homeC?.score, 10) ?? null) : null,
        scoreAway: (status === "finished" || status === "live") ? (parseInt(awayC?.score, 10) ?? null) : null,
        minute:    status === "live" ? (data.header?.competitions?.[0]?.status?.displayClock || null) : null,
      };
    } catch (e) {
      console.warn("[sportsApi] fetchMatchResult ESPN falhou:", e.message);
      return null;
    }
  },

  /**
   * Verifica jogos ao vivo de todas as ligas ativas.
   */
  fetchLiveMatches: async (activeLeagueIds) => {
    if (!activeLeagueIds?.length) return [];
    const allLive = [];

    for (const leagueId of activeLeagueIds) {
      const leagueInfo = LEAGUE_IDS[leagueId];
      if (!leagueInfo) continue;

      try {
        // Busca sem filtro de data — retorna jogos do dia atual
        const url = `${ESPN_BASE}/${leagueInfo.espn}/scoreboard?limit=50`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();

        for (const event of data.events || []) {
          const comp       = event.competitions?.[0];
          const statusType = comp?.status?.type;
          const status     = parseEspnStatus(statusType?.name, statusType?.state);
          if (status !== "live") continue;

          const competitors = comp.competitors || [];
          const homeC = competitors.find((c) => c.homeAway === "home");
          const awayC = competitors.find((c) => c.homeAway === "away");

          allLive.push({
            apiMatchId: event.id,
            leagueId,
            status:     "live",
            scoreHome:  parseInt(homeC?.score, 10) ?? null,
            scoreAway:  parseInt(awayC?.score, 10) ?? null,
            minute:     comp?.status?.displayClock || null,
          });
        }
      } catch (e) {
        console.warn(`[sportsApi] fetchLiveMatches ESPN falhou para ${leagueInfo.espn}:`, e.message);
      }
    }
    return allLive;
  },

  LEAGUE_IDS,
};

// ─── Compatibilidade com getLocalTeamLogo não é necessária na ESPN ───────────
// A ESPN já fornece logos direto nos dados de cada time.
