const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const fetch = require("node-fetch");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const FOOTBALL_API_BASE = "https://api.football-data.org/v4";

/**
 * Proxy HTTP para football-data.org
 *
 * Chamada: GET /footballProxy?path=/competitions/BSA/matches&dateFrom=2025-06-09&dateTo=2025-06-15&apiKey=SUA_CHAVE
 *
 * A Function encaminha o request para a API real com o header X-Auth-Token
 * e retorna a resposta com headers CORS, resolvendo o bloqueio de browser.
 */
exports.footballProxy = functions.https.onRequest(async (req, res) => {
  // Headers CORS — permite acesso de qualquer origem
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Parâmetro obrigatório: path (ex: /competitions/BSA/matches)
  const pathParam = req.query.path;
  if (!pathParam) {
    res.status(400).json({ error: "Missing 'path' query parameter" });
    return;
  }

  // API key: vem do query param "apiKey"
  const apiKey = req.query.apiKey || "";
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key. Send it as ?apiKey=YOUR_KEY" });
    return;
  }

  // Extrai todos os query params exceto "path" e "apiKey" para repassar à API
  const { path: _path, apiKey: _apiKey, ...restParams } = req.query;
  const queryString = new URLSearchParams(restParams).toString();
  const targetUrl = `${FOOTBALL_API_BASE}${pathParam}${queryString ? "?" + queryString : ""}`;

  console.log(`[footballProxy] Fetching: ${targetUrl}`);

  try {
    const apiRes = await fetch(targetUrl, {
      headers: {
        "X-Auth-Token": apiKey,
        "Accept": "application/json",
      },
    });

    const responseText = await apiRes.text();

    if (!apiRes.ok) {
      console.error(`[footballProxy] API error ${apiRes.status}: ${responseText.substring(0, 200)}`);
    }

    res
      .status(apiRes.status)
      .set("Content-Type", "application/json")
      .send(responseText);
  } catch (err) {
    console.error("[footballProxy] Network error:", err.message);
    res.status(502).json({
      error: "Failed to fetch from football-data.org",
      details: err.message,
    });
  }
});

// ESPN API Configs
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const LEAGUE_SLUGS = {
  "league_BSA": "bra.1",
  "league_CL":  "uefa.champions",
  "league_WC":  "fifa.world",
};

// Auxiliar para converter status ESPN -> Nosso formato
function parseEspnStatus(statusName) {
  if (!statusName) return "scheduled";
  if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_HALFTIME") return "live";
  if (statusName === "STATUS_FINAL" || statusName === "STATUS_FULL_TIME") return "finished";
  return "scheduled";
}

// scheduledScoreSync: roda a cada 2 minutos
exports.scheduledScoreSync = onSchedule({
  schedule: "every 2 minutes",
  timeZone: "America/Sao_Paulo"
}, async (event) => {
    console.log("[Scheduler] Iniciando sincronização automática de placares ao vivo...");

    try {
      // 1. Buscar ligas ativas
      const leaguesSnapshot = await db.collection("monitoredLeagues").get();
      const activeLeagueIds = [];
      leaguesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.active) {
          activeLeagueIds.push(docSnap.id);
        }
      });

      if (activeLeagueIds.length === 0) {
        console.log("[Scheduler] Nenhuma liga ativa para monitoramento.");
        return null;
      }

      // 2. Buscar jogos ao vivo na ESPN para as ligas ativas
      const allLive = [];
      for (const leagueId of activeLeagueIds) {
        const slug = LEAGUE_SLUGS[leagueId];
        if (!slug) continue;

        try {
          const url = `${ESPN_BASE}/${slug}/scoreboard?limit=50`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();

          for (const event of data.events || []) {
            const comp       = event.competitions?.[0];
            const statusName = comp?.status?.type?.name || "";
            if (!["STATUS_IN_PROGRESS", "STATUS_HALFTIME"].includes(statusName)) continue;

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
          console.error(`[Scheduler] Falha ao buscar ESPN para ${leagueId}:`, e.message);
        }
      }

      // 3. Buscar jogos cadastrados que não estão terminados no Firestore
      const gamesSnapshot = await db.collection("bolaoGames").where("status", "!=", "finished").get();
      const gamesToProcess = [];
      gamesSnapshot.forEach(docSnap => {
        gamesToProcess.push({ id: docSnap.id, ...docSnap.data() });
      });

      console.log(`[Scheduler] Encontrados ${gamesToProcess.length} jogos não finalizados para verificar.`);

      for (const g of gamesToProcess) {
        const live = allLive.find(lm => String(lm.apiMatchId) === String(g.apiMatchId));

        if (live) {
          // O jogo está ao vivo no feed geral
          if (g.status !== "live" || g.realScoreHome !== live.scoreHome || g.realScoreAway !== live.scoreAway || g.minute !== live.minute) {
            console.log(`[Scheduler] Atualizando jogo ${g.id} (${g.homeTeam} x ${g.awayTeam}) para AO VIVO: ${live.scoreHome}x${live.scoreAway} (${live.minute}')`);
            await db.collection("bolaoGames").doc(g.id).update({
              status: "live",
              realScoreHome: live.scoreHome,
              realScoreAway: live.scoreAway,
              minute: live.minute
            });
          }
        } else {
          // Jogo não está nos eventos ao vivo do feed geral. Verificamos se passou do kickoff
          const matchStartTime = new Date(`${g.date}T${g.time || "00:00"}:00-03:00`);
          const now = new Date();
          const isPastKickoff = now >= matchStartTime;

          if (g.status === "live" || isPastKickoff) {
            // Buscamos o resumo individual do jogo para atualizações em tempo real instantâneas
            const slug = LEAGUE_SLUGS[g.leagueId];
            if (!slug) continue;

            try {
              const url = `${ESPN_BASE}/${slug}/summary?event=${g.apiMatchId}`;
              const res = await fetch(url);
              if (!res.ok) continue;
              const data = await res.json();

              const statusName = data.header?.competitions?.[0]?.status?.type?.name || "";
              const status = parseEspnStatus(statusName);
              const comps  = data.header?.competitions?.[0]?.competitors || [];
              const homeC  = comps.find((c) => c.homeAway === "home");
              const awayC  = comps.find((c) => c.homeAway === "away");

              if (status === "finished") {
                const scoreHome = parseInt(homeC?.score, 10);
                const scoreAway = parseInt(awayC?.score, 10);

                if (!isNaN(scoreHome) && !isNaN(scoreAway)) {
                  console.log(`[Scheduler] Jogo ${g.id} (${g.homeTeam} x ${g.awayTeam}) TERMINOU! Resultado: ${scoreHome}x${scoreAway}. Processando palpites...`);
                  await processGameResultServer(g, scoreHome, scoreAway);
                }
              } else if (status === "live") {
                // Jogo está rolando (talvez não constava no feed geral)
                const scoreHome = parseInt(homeC?.score, 10) ?? 0;
                const scoreAway = parseInt(awayC?.score, 10) ?? 0;
                const displayClock = data.header?.competitions?.[0]?.status?.displayClock || "Ao vivo";

                if (g.status !== "live" || g.realScoreHome !== scoreHome || g.realScoreAway !== scoreAway || g.minute !== displayClock) {
                  console.log(`[Scheduler] Jogo ${g.id} está ao vivo no summary. Atualizando para ${scoreHome}x${scoreAway} (${displayClock}')...`);
                  await db.collection("bolaoGames").doc(g.id).update({
                    status: "live",
                    realScoreHome: scoreHome,
                    realScoreAway: scoreAway,
                    minute: displayClock
                  });
                }
              }
            } catch (e) {
              console.error(`[Scheduler] Erro ao buscar resumo do jogo ${g.id}:`, e.message);
            }
          }
        }
      }
    } catch (err) {
      console.error("[Scheduler] Erro geral no cron de placares:", err);
    }
    return null;
  });

// Processamento de resultados no Servidor (sem requisições do front/admin)
async function processGameResultServer(gameObj, realScoreHome, realScoreAway) {
  const gameId = gameObj.id;

  try {
    // 1. Atualizar partida para encerrada
    await db.collection("bolaoGames").doc(gameId).update({
      status: "finished",
      realScoreHome,
      realScoreAway
    });

    // 2. Buscar palpites deste jogo
    const betsSnapshot = await db.collection("bets").where("matchId", "==", gameId).get();
    const betsToProcess = [];
    betsSnapshot.forEach(docSnap => {
      betsToProcess.push({ id: docSnap.id, ...docSnap.data() });
    });

    const winners = [];

    // Níveis de XP/Multiplicadores (espelhando levelSystem.js)
    const getMultiplierForXp = (xp) => {
      if (xp >= 15000) return 2.0; // Mestre
      if (xp >= 9000) return 1.7;  // Veterano
      if (xp >= 4500) return 1.5;  // Especialista
      if (xp >= 2000) return 1.3;  // Avançado
      if (xp >= 800) return 1.1;   // Intermediário
      return 1.0;                  // Iniciante
    };

    // 3. Processar palpites
    for (const bet of betsToProcess) {
      const isExact = bet.predA === realScoreHome && bet.predB === realScoreAway;
      const isWinner = (realScoreHome > realScoreAway && bet.predA > bet.predB) ||
                       (realScoreHome < realScoreAway && bet.predA < bet.predB) ||
                       (realScoreHome === realScoreAway && bet.predA === bet.predB);

      const isTrendAndGD = !isExact && isWinner && (bet.predA - bet.predB === realScoreHome - realScoreAway);
      const isWinnerOnly = !isExact && isWinner && (bet.predA - bet.predB !== realScoreHome - realScoreAway);

      // Carregar usuário do Firestore
      const userSnap = await db.collection("users").doc(bet.userUid).get();
      if (userSnap.exists) {
        const userObj = userSnap.data();
        const multiplier = getMultiplierForXp(userObj.xp || 0);

        let basePoints = 0;
        let xpGained = 0;
        let coinsGained = 0;
        let won = false;

        if (isExact) {
          basePoints = 10;
          xpGained = 300;
          coinsGained = 100;
          won = true;
        } else if (isTrendAndGD) {
          basePoints = 5;
          xpGained = 150;
          coinsGained = 50;
          won = true;
        } else if (isWinnerOnly) {
          basePoints = 2;
          xpGained = 80;
          coinsGained = 20;
          won = true;
        }

        const points = Math.max(0, Math.round(basePoints * multiplier));

        // Atualiza o palpite individual
        await db.collection("bets").doc(bet.id).update({
          points,
          isWinner: won
        });

        bet.points = points;
        bet.isWinner = won;

        if (won) {
          winners.push(bet);

          // Atualiza o saldo de moedas e XP do usuário
          await db.collection("users").doc(bet.userUid).update({
            xp: admin.firestore.FieldValue.increment(xpGained),
            coins: admin.firestore.FieldValue.increment(coinsGained)
          });

          // Atualiza tabela de liderança do Bolão
          const lbRef = db.collection("betting_leaderboard").doc(bet.userUid);
          const lbSnap = await lbRef.get();
          if (lbSnap.exists) {
            await lbRef.update({
              correctGuesses: admin.firestore.FieldValue.increment(isExact ? 1 : 0),
              points: admin.firestore.FieldValue.increment(points)
            });
          } else {
            await lbRef.set({
              userUid: bet.userUid,
              name: bet.userName,
              correctGuesses: isExact ? 1 : 0,
              points: points,
              avatar: userObj.avatarUrl || null
            });
          }
        }
      }
    }

    // 4. Post oficial na comunidade informando o resultado
    const winnerNames = winners.length > 0 ? winners.map(w => w.userName).join(", ") : "Nenhum jogador";
    await db.collection("posts").add({
      authorUid: "system",
      authorName: "Clubber Bolão",
      authorAvatar: null,
      content: `Fim de jogo! ⚽ ${gameObj.homeTeam} ${realScoreHome} x ${realScoreAway} ${gameObj.awayTeam}. Parabéns aos ganhadores da rodada que pontuaram: ${winnerNames}! 🎉`,
      imageUrl: null,
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isOfficial: true
    });

    console.log(`[Scheduler] Resultado processado com sucesso para jogo ${gameId}.`);
  } catch (e) {
    console.error(`[Scheduler] Erro ao processar resultado do jogo ${gameId}:`, e);
  }
}
