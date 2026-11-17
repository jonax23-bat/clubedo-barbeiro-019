import { auth, db } from "./config";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
  query, where, orderBy, limit, addDoc, arrayUnion, arrayRemove, serverTimestamp,
  onSnapshot, runTransaction
} from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { calcularNivel, calcularDiferencaEmMeses, getMesesParaProximoNivel, NIVEL_CONFIG } from "../utils/levelSystem";

// --- Dados Mockados Iniciais ---

// Mapa de logos locais: nome do time → arquivo em /public/logos/
// Cobre Brasileirão Série A 2025 (20 times), UCL 2024-25 (36 times), Copa do Mundo 2026 (48 seleções)
const TEAM_LOGO_MAP = {
  // ========== BRASILEIRÃO SÉRIE A ==========
  "Flamengo": "/logos/flamengo.png",
  "Clube de Regatas do Flamengo": "/logos/flamengo.png",
  "Palmeiras": "/logos/palmeiras.png",
  "SE Palmeiras": "/logos/palmeiras.png",
  "Corinthians": "/logos/corinthians.png",
  "Sport Club Corinthians Paulista": "/logos/corinthians.png",
  "São Paulo": "/logos/sao-paulo.png",
  "São Paulo FC": "/logos/sao-paulo.png",
  "Grêmio": "/logos/gremio.png",
  "Grêmio FBPA": "/logos/gremio.png",
  "Internacional": "/logos/internacional.png",
  "Sport Club Internacional": "/logos/internacional.png",
  "Atlético-MG": "/logos/atletico-mg.png",
  "Clube Atlético Mineiro": "/logos/atletico-mg.png",
  "Atletico Mineiro": "/logos/atletico-mg.png",
  "Cruzeiro": "/logos/cruzeiro.png",
  "Cruzeiro EC": "/logos/cruzeiro.png",
  "Botafogo": "/logos/botafogo.png",
  "Botafogo FR": "/logos/botafogo.png",
  "Botafogo de Futebol e Regatas": "/logos/botafogo.png",
  "Fluminense": "/logos/fluminense.png",
  "Fluminense FC": "/logos/fluminense.png",
  "Vasco": "/logos/vasco.png",
  "Vasco da Gama": "/logos/vasco.png",
  "CR Vasco da Gama": "/logos/vasco.png",
  "Athletico-PR": "/logos/athletico-pr.png",
  "Athletico Paranaense": "/logos/athletico-pr.png",
  "Club Athletico Paranaense": "/logos/athletico-pr.png",
  "Fortaleza": "/logos/fortaleza.png",
  "Fortaleza EC": "/logos/fortaleza.png",
  "Bahia": "/logos/bahia.png",
  "Esporte Clube Bahia": "/logos/bahia.png",
  "Bragantino": "/logos/bragantino.png",
  "RB Bragantino": "/logos/bragantino.png",
  "Red Bull Bragantino": "/logos/bragantino.png",
  "Goiás": "/logos/goias.png",
  "Goiás EC": "/logos/goias.png",
  "Santos": "/logos/santos.png",
  "Santos FC": "/logos/santos.png",
  "Ceará": "/logos/ceara.png",
  "Ceará SC": "/logos/ceara.png",
  "Sport": "/logos/sport.png",
  "Sport Club do Recife": "/logos/sport.png",
  "Juventude": "/logos/juventude.png",
  "EC Juventude": "/logos/juventude.png",
  // Brasileirão 2025 (promovidos/novos)
  "Mirassol": "/logos/mirassol.png",
  "Esporte Clube Mirassol": "/logos/mirassol.png",
  "Vitória": "/logos/vitoria.png",
  "EC Vitória": "/logos/vitoria.png",
  // Outras equipes da Série A recentes
  "Athletico-PR": "/logos/athletico-pr.png",
  "Athletico Paranaense": "/logos/athletico-pr.png",
  "Goiás": "/logos/goias.png",
  "Goiás EC": "/logos/goias.png",

  // ========== UEFA CHAMPIONS LEAGUE ==========
  "Real Madrid": "/logos/real-madrid.png",
  "Real Madrid CF": "/logos/real-madrid.png",
  "Manchester City": "/logos/manchester-city.png",
  "Manchester City FC": "/logos/manchester-city.png",
  "Barcelona": "/logos/barcelona.png",
  "FC Barcelona": "/logos/barcelona.png",
  "Bayern de Munique": "/logos/bayern-munique.png",
  "FC Bayern München": "/logos/bayern-munique.png",
  "Bayern Munich": "/logos/bayern-munique.png",
  "Paris Saint-Germain": "/logos/psg.png",
  "PSG": "/logos/psg.png",
  "Paris SG": "/logos/psg.png",
  "Liverpool": "/logos/liverpool.png",
  "Liverpool FC": "/logos/liverpool.png",
  "Chelsea": "/logos/chelsea.png",
  "Chelsea FC": "/logos/chelsea.png",
  "Arsenal": "/logos/arsenal.png",
  "Arsenal FC": "/logos/arsenal.png",
  "Juventus": "/logos/juventus.png",
  "Juventus FC": "/logos/juventus.png",
  "Inter de Milão": "/logos/inter-milao.png",
  "Inter Milan": "/logos/inter-milao.png",
  "FC Internazionale Milano": "/logos/inter-milao.png",
  "Internazionale": "/logos/inter-milao.png",
  "AC Milan": "/logos/ac-milan.png",
  "Milan": "/logos/ac-milan.png",
  "Borussia Dortmund": "/logos/borussia-dortmund.png",
  "BVB": "/logos/borussia-dortmund.png",
  "Atlético de Madrid": "/logos/atletico-madrid.png",
  "Atletico Madrid": "/logos/atletico-madrid.png",
  "Club Atlético de Madrid": "/logos/atletico-madrid.png",
  "Benfica": "/logos/benfica.png",
  "SL Benfica": "/logos/benfica.png",
  "Porto": "/logos/porto.png",
  "FC Porto": "/logos/porto.png",
  "Ajax": "/logos/ajax.png",
  "AFC Ajax": "/logos/ajax.png",
  // UCL 2024-25 - Times adicionais (36 times no novo formato)
  "Aston Villa": "/logos/aston-villa.png",
  "Aston Villa FC": "/logos/aston-villa.png",
  "Manchester United": "/logos/manchester-united.png",
  "Man United": "/logos/manchester-united.png",
  "Tottenham": "/logos/tottenham.png",
  "Tottenham Hotspur": "/logos/tottenham.png",
  "Girona": "/logos/girona.png",
  "Girona FC": "/logos/girona.png",
  "Bayer Leverkusen": "/logos/bayer-leverkusen.png",
  "Bayer 04 Leverkusen": "/logos/bayer-leverkusen.png",
  "RB Leipzig": "/logos/rb-leipzig.png",
  "Rasenballsport Leipzig": "/logos/rb-leipzig.png",
  "VfB Stuttgart": "/logos/vfb-stuttgart.png",
  "Stuttgart": "/logos/vfb-stuttgart.png",
  "Atalanta": "/logos/atalanta.png",
  "Atalanta BC": "/logos/atalanta.png",
  "Bologna": "/logos/bologna.png",
  "Bologna FC": "/logos/bologna.png",
  "Monaco": "/logos/monaco.png",
  "AS Monaco": "/logos/monaco.png",
  "Brest": "/logos/brest.png",
  "Stade Brestois": "/logos/brest.png",
  "Sporting CP": "/logos/sporting-cp.png",
  "Sporting Lisboa": "/logos/sporting-cp.png",
  "PSV Eindhoven": "/logos/psv-eindhoven.png",
  "PSV": "/logos/psv-eindhoven.png",
  "Feyenoord": "/logos/feyenoord.png",
  "Club Brugge": "/logos/club-brugge.png",
  "Celtic": "/logos/celtic.png",
  "Celtic FC": "/logos/celtic.png",
  "Sturm Graz": "/logos/sturm-graz.png",
  "Shakhtar Donetsk": "/logos/shakhtar.png",
  "Red Star Belgrade": "/logos/red-star-belgrade.png",
  "Estrela Vermelha": "/logos/red-star-belgrade.png",
  "Red Bull Salzburg": "/logos/salzburg.png",
  "FC Salzburg": "/logos/salzburg.png",
  "Slovan Bratislava": "/logos/slovan-bratislava.png",
  "Dinamo Zagreb": "/logos/dinamo-zagreb.png",
  "Sparta Praga": "/logos/sparta-praga.png",
  "AC Sparta Praha": "/logos/sparta-praga.png",
  "Young Boys": "/logos/young-boys.png",
  "BSC Young Boys": "/logos/young-boys.png",
  "Slavia Praga": "/logos/slavia-praga.png",
  "SK Slavia Praha": "/logos/slavia-praga.png",

  // ========== COPA DO MUNDO ==========
  "Brasil": "/logos/brasil.png",
  "Brazil": "/logos/brasil.png",
  "Argentina": "/logos/argentina.png",
  "França": "/logos/franca.png",
  "France": "/logos/franca.png",
  "Alemanha": "/logos/alemanha.png",
  "Germany": "/logos/alemanha.png",
  "Espanha": "/logos/espanha.png",
  "Spain": "/logos/espanha.png",
  "Portugal": "/logos/portugal.png",
  "Inglaterra": "/logos/inglaterra.png",
  "England": "/logos/inglaterra.png",
  "Uruguai": "/logos/uruguai.png",
  "Uruguay": "/logos/uruguai.png",
  "Itália": "/logos/italia.png",
  "Italy": "/logos/italia.png",
  "Holanda": "/logos/holanda.png",
  "Netherlands": "/logos/holanda.png",
  "Países Baixos": "/logos/holanda.png",
  "Bélgica": "/logos/belgica.png",
  "Belgium": "/logos/belgica.png",
  "Croácia": "/logos/croacia.png",
  "Croatia": "/logos/croacia.png",
  "México": "/logos/mexico.png",
  "Mexico": "/logos/mexico.png",
  "EUA": "/logos/eua.png",
  "USA": "/logos/eua.png",
  "United States": "/logos/eua.png",
  "Estados Unidos": "/logos/eua.png",
  "Canadá": "/logos/canada.png",
  "Canada": "/logos/canada.png",
  "Japão": "/logos/japao.png",
  "Japan": "/logos/japao.png",
  "Coreia do Sul": "/logos/coreia-do-sul.png",
  "South Korea": "/logos/coreia-do-sul.png",
  "Korea Republic": "/logos/coreia-do-sul.png",
  "Marrocos": "/logos/marrocos.png",
  "Morocco": "/logos/marrocos.png",
  "Senegal": "/logos/senegal.png",
  "Camarões": "/logos/camaroes.png",
  "Cameroon": "/logos/camaroes.png",
  "Equador": "/logos/equador.png",
  "Ecuador": "/logos/equador.png",
  "Colômbia": "/logos/colombia.png",
  "Colombia": "/logos/colombia.png",
  "Chile": "/logos/chile.png",
  "Austrália": "/logos/australia.png",
  "Australia": "/logos/australia.png",

  // -- Copa 2026 CONMEBOL (extra) --
  "Polônia": "/logos/polonia.png",
  "Poland": "/logos/polonia.png",
  "Suíça": "/logos/suica.png",
  "Switzerland": "/logos/suica.png",
  "Dinamarca": "/logos/dinamarca.png",
  "Denmark": "/logos/dinamarca.png",
  "Sérvia": "/logos/servia.png",
  "Serbia": "/logos/servia.png",
  "Gana": "/logos/gana.png",
  "Ghana": "/logos/gana.png",
  "Tunísia": "/logos/tunisia.png",
  "Tunisia": "/logos/tunisia.png",
  "Costa Rica": "/logos/costa-rica.png",
  "Arábia Saudita": "/logos/arabia-saudita.png",
  "Saudi Arabia": "/logos/arabia-saudita.png",
  "Catar": "/logos/catar.png",
  "Qatar": "/logos/catar.png",
  "Irã": "/logos/iran.png",
  "Iran": "/logos/iran.png",
  "Quênia": "/logos/quenia.png",
  "Kenya": "/logos/quenia.png",
  "Nigéria": "/logos/nigeria.png",
  "Nigeria": "/logos/nigeria.png",
  "Venezuela": "/logos/venezuela.png",
  "Paraguai": "/logos/paraguai.png",
  "Paraguay": "/logos/paraguai.png",
  "Peru": "/logos/peru.png",
  "Bolívia": "/logos/bolivia.png",
  "Bolivia": "/logos/bolivia.png",

  // -- Copa 2026 UEFA (extra) --
  "Áustria": "/logos/austria.png",
  "Austria": "/logos/austria.png",
  "Turquia": "/logos/turquia.png",
  "Turkey": "/logos/turquia.png",
  "Hungria": "/logos/hungria.png",
  "Hungary": "/logos/hungria.png",
  "Escócia": "/logos/escocia.png",
  "Scotland": "/logos/escocia.png",
  "Romênia": "/logos/romenia.png",
  "Romania": "/logos/romenia.png",
  "Ucrânia": "/logos/ucrania.png",
  "Ukraine": "/logos/ucrania.png",
  "Eslováquia": "/logos/eslovaquia.png",
  "Slovakia": "/logos/eslovaquia.png",
  "Noruega": "/logos/noruega.png",
  "Norway": "/logos/noruega.png",
  "Grécia": "/logos/grecia.png",
  "Greece": "/logos/grecia.png",
  "República Checa": "/logos/republica-checa.png",
  "Czech Republic": "/logos/republica-checa.png",
  "Finlândia": "/logos/finlandia.png",
  "Finland": "/logos/finlandia.png",
  "Albânia": "/logos/albania.png",
  "Albania": "/logos/albania.png",

  // -- Copa 2026 CAF (África extra) --
  "Costa do Marfim": "/logos/costa-do-marfim.png",
  "Ivory Coast": "/logos/costa-do-marfim.png",
  "Côte d'Ivoire": "/logos/costa-do-marfim.png",
  "Argélia": "/logos/argelia.png",
  "Algeria": "/logos/argelia.png",
  "Egito": "/logos/egito.png",
  "Egypt": "/logos/egito.png",
  "África do Sul": "/logos/africa-do-sul.png",
  "South Africa": "/logos/africa-do-sul.png",
  "Mali": "/logos/mali.png",
  "Congo RD": "/logos/congo.png",
  "DR Congo": "/logos/congo.png",
  "Moçambique": "/logos/mocambique.png",
  "Mozambique": "/logos/mocambique.png",

  // -- Copa 2026 AFC (Ásia extra) --
  "Iraque": "/logos/iraque.png",
  "Iraq": "/logos/iraque.png",
  "Jordânia": "/logos/jordania.png",
  "Jordan": "/logos/jordania.png",
  "Uzbequistão": "/logos/uzbequistao.png",
  "Uzbekistan": "/logos/uzbequistao.png",
  "China": "/logos/china.png",
  "Omã": "/logos/oma.png",
  "Oman": "/logos/oma.png",
  "Emirados Árabes": "/logos/emirados.png",
  "UAE": "/logos/emirados.png",
  "United Arab Emirates": "/logos/emirados.png",

  // -- Copa 2026 CONCACAF (extra) --
  "Panamá": "/logos/panama.png",
  "Panama": "/logos/panama.png",
  "Honduras": "/logos/honduras.png",
  "Jamaica": "/logos/jamaica.png",
  "Cuba": "/logos/cuba.png",

  // -- Copa 2026 OFC --
  "Nova Zelândia": "/logos/nova-zelandia.png",
  "New Zealand": "/logos/nova-zelandia.png",
};

// Retorna o logo local para um time/seleção, ou null se não encontrado
export function getLocalTeamLogo(teamName) {
  if (!teamName) return null;
  // Busca exata
  if (TEAM_LOGO_MAP[teamName]) return TEAM_LOGO_MAP[teamName];
  // Busca case-insensitive
  const lc = teamName.toLowerCase();
  for (const [key, val] of Object.entries(TEAM_LOGO_MAP)) {
    if (key.toLowerCase() === lc) return val;
  }
  // Busca parcial (inclui o nome)
  for (const [key, val] of Object.entries(TEAM_LOGO_MAP)) {
    if (lc.includes(key.toLowerCase()) || key.toLowerCase().includes(lc)) return val;
  }
  return null;
};

const INITIAL_MOCK_DATA = {
  users: {
    "admin": {
      uid: "admin",
      name: "Administrador",
      email: "admin@royalblade.com",
      password: "admin",
      role: "owner",
      xp: 0,
      coins: 0,
      plan: "Plano Master",
      subscriptionStartDate: "2026-06-01T12:00:00.000Z",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60"
    },
    "dono": {
      uid: "dono",
      name: "Dono da Barbearia",
      email: "dono@royalblade.com",
      password: "dono123",
      role: "owner",
      xp: 0,
      coins: 0,
      plan: "Plano Master",
      subscriptionStartDate: "2026-06-01T12:00:00.000Z",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60"
    }
  },
  appointments: [],
  barbers: [],
  posts: [],
  leaderboard: [],
  bets: [],
  betting_leaderboard: [],
  comments: [],
  messages: [],
  services: [],
  units: [],
  branding: {
    name: "AliJoy Studio",
    logoUrl: "/logo-alijoy.jpg",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      mapsUrl: ""
    }
  },
  transactions: [],
  expenses: [],
  storeItems: [],
  redemptions: [],
  monitoredLeagues: [
    { id: "league_BSA", name: "Brasileirão Série A", active: true },
    { id: "league_CL", name: "Champions League", active: true },
    { id: "league_WC", name: "Copa do Mundo", active: true }
  ],
  bolaoGames: [],
  conversionHistory: [],
  planConfigs: {
    "Plano Classic": {
      price: 70,
      xpBonus: 100,
      benefits: [
        "Acesso ao Clube Stitch Clubber",
        "1 corte por mês",
        "Agendamento via App"
      ]
    },
    "Plano VIP": {
      price: 120,
      xpBonus: 500,
      benefits: [
        "Acesso ao Clube Stitch Clubber",
        "**Cortes ilimitados**",
        "Prioridade na agenda",
        "Bônus de {xpBonus} XP/mês"
      ]
    },
    "Plano Master": {
      price: 180,
      xpBonus: 800,
      benefits: [
        "Acesso ao Clube Stitch Clubber",
        "Cabelo + Barba",
        "1 Bebida Cortesia",
        "Acesso ao Lounge VIP"
      ]
    }
  }
};

const getLocalStorage = (key) => {
  const data = localStorage.getItem(`clubber_${key}`);
  return data ? JSON.parse(data) : null;
};

const setLocalStorage = (key, value) => {
  localStorage.setItem(`clubber_${key}`, JSON.stringify(value));
};

const initMockStorage = () => {
  // Força reset total para a versão de produção (limpa dados de testes antigos do local storage)
  if (!getLocalStorage("production_release_v2")) {
    setLocalStorage("users", INITIAL_MOCK_DATA.users);
    setLocalStorage("appointments", INITIAL_MOCK_DATA.appointments);
    setLocalStorage("barbers", INITIAL_MOCK_DATA.barbers);
    setLocalStorage("posts", INITIAL_MOCK_DATA.posts);
    setLocalStorage("leaderboard", INITIAL_MOCK_DATA.leaderboard);
    setLocalStorage("bets", INITIAL_MOCK_DATA.bets);
    setLocalStorage("betting_leaderboard", INITIAL_MOCK_DATA.betting_leaderboard);
    setLocalStorage("comments", INITIAL_MOCK_DATA.comments);
    setLocalStorage("messages", INITIAL_MOCK_DATA.messages);
    setLocalStorage("services", INITIAL_MOCK_DATA.services);
    setLocalStorage("units", INITIAL_MOCK_DATA.units);
    setLocalStorage("branding", INITIAL_MOCK_DATA.branding);
    setLocalStorage("transactions", INITIAL_MOCK_DATA.transactions);
    setLocalStorage("expenses", INITIAL_MOCK_DATA.expenses);
    setLocalStorage("storeItems", INITIAL_MOCK_DATA.storeItems);
    setLocalStorage("redemptions", INITIAL_MOCK_DATA.redemptions);
    setLocalStorage("monitoredLeagues", INITIAL_MOCK_DATA.monitoredLeagues);
    setLocalStorage("bolaoGames", INITIAL_MOCK_DATA.bolaoGames);
    setLocalStorage("conversionHistory", INITIAL_MOCK_DATA.conversionHistory);
    setLocalStorage("planConfigs", INITIAL_MOCK_DATA.planConfigs);
    setLocalStorage("initialized", true);
    setLocalStorage("production_release_v2", true);
  }

  // Inicializa se não estiver setado (fallback adicional)
  if (!getLocalStorage("initialized")) {
    setLocalStorage("users", INITIAL_MOCK_DATA.users);
    setLocalStorage("appointments", INITIAL_MOCK_DATA.appointments);
    setLocalStorage("barbers", INITIAL_MOCK_DATA.barbers);
    setLocalStorage("posts", INITIAL_MOCK_DATA.posts);
    setLocalStorage("leaderboard", INITIAL_MOCK_DATA.leaderboard);
    setLocalStorage("bets", INITIAL_MOCK_DATA.bets);
    setLocalStorage("betting_leaderboard", INITIAL_MOCK_DATA.betting_leaderboard);
    setLocalStorage("comments", INITIAL_MOCK_DATA.comments);
    setLocalStorage("messages", INITIAL_MOCK_DATA.messages);
    setLocalStorage("services", INITIAL_MOCK_DATA.services);
    setLocalStorage("units", INITIAL_MOCK_DATA.units);
    setLocalStorage("branding", INITIAL_MOCK_DATA.branding);
    setLocalStorage("transactions", INITIAL_MOCK_DATA.transactions);
    setLocalStorage("expenses", INITIAL_MOCK_DATA.expenses);
    setLocalStorage("storeItems", INITIAL_MOCK_DATA.storeItems);
    setLocalStorage("redemptions", INITIAL_MOCK_DATA.redemptions);
    setLocalStorage("monitoredLeagues", INITIAL_MOCK_DATA.monitoredLeagues);
    setLocalStorage("bolaoGames", INITIAL_MOCK_DATA.bolaoGames);
    setLocalStorage("conversionHistory", INITIAL_MOCK_DATA.conversionHistory);
    setLocalStorage("planConfigs", INITIAL_MOCK_DATA.planConfigs);
    setLocalStorage("initialized", true);
  } else {
    // Garante que chaves novas de atualizações do sistema sejam criadas se não existirem
    if (!getLocalStorage("comments")) setLocalStorage("comments", INITIAL_MOCK_DATA.comments);
    if (!getLocalStorage("messages")) setLocalStorage("messages", INITIAL_MOCK_DATA.messages);
    if (!getLocalStorage("services")) setLocalStorage("services", INITIAL_MOCK_DATA.services);
    if (!getLocalStorage("units")) setLocalStorage("units", INITIAL_MOCK_DATA.units);
    if (!getLocalStorage("branding")) setLocalStorage("branding", INITIAL_MOCK_DATA.branding);
    if (!getLocalStorage("transactions")) setLocalStorage("transactions", INITIAL_MOCK_DATA.transactions);
    if (!getLocalStorage("expenses")) setLocalStorage("expenses", INITIAL_MOCK_DATA.expenses);
    if (!getLocalStorage("storeItems")) setLocalStorage("storeItems", INITIAL_MOCK_DATA.storeItems);
    if (!getLocalStorage("redemptions")) setLocalStorage("redemptions", INITIAL_MOCK_DATA.redemptions);
    if (!getLocalStorage("monitoredLeagues")) setLocalStorage("monitoredLeagues", INITIAL_MOCK_DATA.monitoredLeagues);
    if (!getLocalStorage("bolaoGames")) setLocalStorage("bolaoGames", INITIAL_MOCK_DATA.bolaoGames);
    if (!getLocalStorage("conversionHistory")) setLocalStorage("conversionHistory", INITIAL_MOCK_DATA.conversionHistory);
    if (!getLocalStorage("planConfigs")) setLocalStorage("planConfigs", INITIAL_MOCK_DATA.planConfigs);
  }

  // --- MIGRAÇÃO DE DADOS EM SEGUNDO PLANO (MOCK LOCAL) ---
  try {
    // 1. Migrar ligas monitoradas
    let monitored = getLocalStorage("monitoredLeagues") || [];
    let updatedMonitored = false;
    monitored = monitored.map(l => {
      if (l.id === "league_71" || l.id === "league_1" || l.id === "league_2") {
        updatedMonitored = true;
        if (l.id === "league_71") return { ...l, id: "league_BSA" };
        if (l.id === "league_1") return { ...l, id: "league_WC" };
        if (l.id === "league_2") return { ...l, id: "league_CL" };
      }
      return l;
    });
    // Remover duplicadas se houver
    const uniqueMonitored = [];
    const idsSeen = new Set();
    for (const l of monitored) {
      if (!idsSeen.has(l.id)) {
        idsSeen.add(l.id);
        uniqueMonitored.push(l);
      } else {
        updatedMonitored = true;
      }
    }
    if (updatedMonitored) {
      setLocalStorage("monitoredLeagues", uniqueMonitored);
    }

    // 2. Limpar e migrar bolaoGames
    let games = getLocalStorage("bolaoGames") || [];
    let updatedGames = false;

    // Remove jogos mockados (id começa com "game_" ou sem apiMatchId)
    const originalLength = games.length;
    games = games.filter(g => g.apiMatchId && !g.id.startsWith("game_"));
    if (games.length !== originalLength) {
      updatedGames = true;
    }

    // Converte os brasões para caminhos locais (apenas para jogos válidos)
    games = games.map(g => {
      const homeKey = g.homeTeam;
      const awayKey = g.awayTeam;
      if (TEAM_LOGO_MAP[homeKey] && g.homeLogo !== TEAM_LOGO_MAP[homeKey]) {
        g.homeLogo = TEAM_LOGO_MAP[homeKey];
        updatedGames = true;
      }
      if (TEAM_LOGO_MAP[awayKey] && g.awayLogo !== TEAM_LOGO_MAP[awayKey]) {
        g.awayLogo = TEAM_LOGO_MAP[awayKey];
        updatedGames = true;
      }
      return g;
    });

    if (updatedGames) {
      setLocalStorage("bolaoGames", games);
    }

    let users = getLocalStorage("users") || {};
    let updatedUsers = false;
    if (users["ricardo_uid"] && !users["ricardo_uid"].plan) {
      users["ricardo_uid"].plan = "Plano VIP";
      updatedUsers = true;
    }
    if (users["rafael_souza"] && !users["rafael_souza"].plan) {
      users["rafael_souza"].plan = "Plano Classic";
      updatedUsers = true;
    }
    if (users["leo_castro"] && !users["leo_castro"].plan) {
      users["leo_castro"].plan = "Plano Master";
      updatedUsers = true;
    }
    if (users["beatriz_o"] && users["beatriz_o"].subscriptionStartDate !== null) {
      users["beatriz_o"].plan = null;
      users["beatriz_o"].subscriptionStartDate = null;
      updatedUsers = true;
    }

    // Ensure all initial mock users exist in local storage (including new barbers)
    for (const [key, defaultUser] of Object.entries(INITIAL_MOCK_DATA.users)) {
      if (!users[key]) {
        users[key] = defaultUser;
        updatedUsers = true;
      }
    }

    // Ensure dono password is sync to dono123
    if (users["dono"] && users["dono"].password !== "dono123") {
      users["dono"].password = "dono123";
      updatedUsers = true;
    }

    // Ensure all users have a password set to default
    for (const uid in users) {
      if (!users[uid].password) {
        users[uid].password = "Club@2026";
        updatedUsers = true;
      }
    }

    if (updatedUsers) {
      setLocalStorage("users", users);
    }
    // 3. Sincronizar especialidades dos barbeiros com a coleção global de serviços
    try {
      const barbers = getLocalStorage("barbers") || [];
      const existingServices = getLocalStorage("services") || [];
      let updatedServices = [...existingServices];
      let needsSave = false;

      for (const barber of barbers) {
        const specs = barber.specialties || [];
        for (const spec of specs) {
          const alreadyExists = updatedServices.some(s => s.name === spec.name);
          if (!alreadyExists) {
            updatedServices.push({
              id: "service_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
              name: spec.name,
              price: spec.price,
              duration: spec.time || "30 min",
              icon: spec.icon || "content_cut",
              type: spec.type || "regular",
              xp: parseInt(spec.price) || 50
            });
            needsSave = true;
          }
        }
      }

      if (needsSave) {
        setLocalStorage("services", updatedServices);
        console.log(`Migração: ${updatedServices.length - existingServices.length} serviço(s) sincronizado(s) da especialidade dos barbeiros para a coleção global.`);
      }
    } catch (err) {
      console.warn("Falha ao migrar especialidades dos barbeiros:", err);
    }
  } catch (err) {
    console.warn("Falha ao migrar dados de local storage:", err);
  }
};

const isRealFirebase = () => {
  return true;
};

// --- SERVIÇO DE BANCO DE DADOS UNIFICADO ---
export const dbService = {
  // Inicialização
  init: async () => {
    initMockStorage();

    // Sincroniza dados locais iniciais com o Firestore caso ele esteja vazio
    if (isRealFirebase()) {
      try {
        // 1. Sincronizar Usuários e Leaderboard
        const usersSnap = await getDocs(collection(db, "users"));
        if (usersSnap.empty) {
          console.log("[Firebase Sync] Sincronizando usuários iniciais...");
          const localUsers = getLocalStorage("users") || {};
          for (const [uid, userObj] of Object.entries(localUsers)) {
            const { password: _, ...firestoreUser } = userObj;
            if (firestoreUser.role === "client" && firestoreUser.unitId === undefined) {
              firestoreUser.unitId = null;
            }
            await setDoc(doc(db, "users", uid), firestoreUser);
            await setDoc(doc(db, "leaderboard", uid), {
              name: userObj.name,
              xp: userObj.xp || 0,
              avatar: userObj.avatarUrl || ""
            });
          }
        }

        // 2. Sincronizar Barbeiros
        const barbersSnap = await getDocs(collection(db, "barbers"));
        if (barbersSnap.empty) {
          console.log("[Firebase Sync] Sincronizando barbeiros iniciais...");
          const localBarbers = getLocalStorage("barbers") || [];
          for (const barber of localBarbers) {
            await setDoc(doc(db, "barbers", barber.uid), barber);
          }
        }

        // 3. Sincronizar Unidades
        const unitsSnap = await getDocs(collection(db, "units"));
        if (unitsSnap.empty) {
          console.log("[Firebase Sync] Sincronizando unidades iniciais...");
          const localUnits = getLocalStorage("units") || [];
          for (const unit of localUnits) {
            await setDoc(doc(db, "units", unit.id), unit);
          }
        }

        // 4. Sincronizar Serviços
        const servicesSnap = await getDocs(collection(db, "services"));
        if (servicesSnap.empty) {
          console.log("[Firebase Sync] Sincronizando serviços iniciais...");
          const localServices = getLocalStorage("services") || [];
          for (const service of localServices) {
            await setDoc(doc(db, "services", service.id), service);
          }
        }

        // 5. Sincronizar Configurações de Planos
        const plansDoc = await getDoc(doc(db, "configs", "plans"));
        if (!plansDoc.exists()) {
          console.log("[Firebase Sync] Sincronizando planConfigs iniciais...");
          const localPlanConfigs = getLocalStorage("planConfigs") || INITIAL_MOCK_DATA.planConfigs;
          await setDoc(doc(db, "configs", "plans"), localPlanConfigs);
        }

        // 5b. Sincronizar Ligas Monitoradas
        const monitoredLeaguesSnap = await getDocs(collection(db, "monitoredLeagues"));
        if (monitoredLeaguesSnap.empty) {
          console.log("[Firebase Sync] Sincronizando monitoredLeagues iniciais...");
          const localLeagues = getLocalStorage("monitoredLeagues") || INITIAL_MOCK_DATA.monitoredLeagues || [];
          for (const league of localLeagues) {
            await setDoc(doc(db, "monitoredLeagues", league.id), { active: league.active });
          }
        }

        // 6. Sincronização automática do Google desativada na entrega
        console.log("[Firebase Sync] Usuário pré-existente do Google desativado para a entrega limpa.");
        
        console.log("[Firebase Sync] Sincronização de inicialização concluída.");
      } catch (e) {
        console.warn("[Firebase Sync] Falha ao sincronizar dados com o Firestore:", e);
      }
    }
  },

  isRealFirebase: () => {
    return isRealFirebase();
  },

  subscribeToAuth: (callback) => {
    if (isRealFirebase()) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  },

  logout: async () => {
    if (isRealFirebase()) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Erro ao fazer logout no Firebase:", e);
      }
    }
  },

  // Login via Google
  loginWithGoogle: async () => {
    if (isRealFirebase()) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verifica se o usuário já existe no Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        let userObj;

        if (docSnap.exists()) {
          userObj = docSnap.data();
        } else {
          // Registra como um novo cliente
          userObj = {
            uid: user.uid,
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            role: "client",
            xp: 0,
            coins: 0,
            plan: null,
            unitId: null,
            subscriptionStartDate: null,
            avatarUrl: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60",
            createdAt: new Date().toISOString()
          };
          await setDoc(docRef, userObj);

          // Adiciona ao leaderboard de XP
          await setDoc(doc(db, "leaderboard", user.uid), {
            name: userObj.name,
            xp: userObj.xp,
            avatar: userObj.avatarUrl
          });
        }

        // Sincroniza o usuário logado com o LocalStorage
        try {
          const users = getLocalStorage("users") || {};
          users[user.uid] = userObj;
          setLocalStorage("users", users);

          // Atualiza leaderboard localmente
          const leaderboard = getLocalStorage("leaderboard") || [];
          if (!leaderboard.some(l => l.name === userObj.name)) {
            leaderboard.push({ name: userObj.name, xp: userObj.xp, avatar: userObj.avatarUrl });
            setLocalStorage("leaderboard", leaderboard);
          }
        } catch (storageErr) {
          console.warn("Erro ao sincronizar login do Google com LocalStorage:", storageErr);
        }

        return userObj;
      } catch (e) {
        console.error("Erro no Login com Google (Firebase), caindo para Mock Auth", e);
        throw e;
      }
    }

    // Mock Google Login
    const googleMockUid = "google_mock_user";
    const users = getLocalStorage("users") || {};
    
    if (!users[googleMockUid]) {
      users[googleMockUid] = {
        uid: googleMockUid,
        name: "Membro Google Teste",
        email: "google.member@gmail.com",
        role: "client",
        xp: 1500,
        coins: 150,
        plan: "Plano Classic",
        subscriptionStartDate: new Date().toISOString(),
        avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_7VmemAsju7rKT9OMZo9i5ei905THnV-DThsOirKJLzVfTqkuynK6knXCPEHijk6X2WMcQQhcGLdMwJ1pi6mcUXdFOZbupd8XvAoNe4ff4vvcJgF6f4Uhxz30PaNFzDVRmpqfiAC31C6OdAUoSgZLMsCU1pMuQtc4UhEeCPaHSfc5_PMiNyQxQ0U0FOrj5OjOQBSL4L58mKfEKmIIy1QWZNKdgG4YX77LjKiwROKH2G1uIKxyaiD1JqWCZmcMNe_vzYcZwPy7_GT2",
        createdAt: new Date().toISOString()
      };
      setLocalStorage("users", users);

      const leaderboard = getLocalStorage("leaderboard") || [];
      const userExistsInLeaderboard = leaderboard.some(l => l.name === users[googleMockUid].name);
      if (!userExistsInLeaderboard) {
        leaderboard.push({ name: users[googleMockUid].name, xp: users[googleMockUid].xp, avatar: users[googleMockUid].avatarUrl });
        setLocalStorage("leaderboard", leaderboard);
      }
    }
    
    return users[googleMockUid];
  },

  // Usuários
  getUser: async (uid) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data();
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const users = getLocalStorage("users") || {};
    return users[uid] || null;
  },

  createUserDocument: async (uid, userObj) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, userObj);
        
        // Também adiciona no leaderboard
        await setDoc(doc(db, "leaderboard", uid), {
          name: userObj.name,
          xp: userObj.xp,
          avatar: userObj.avatarUrl
        });
      } catch (e) {
        console.error("Erro ao criar documento do usuário no Firestore:", e);
        throw e;
      }
    }
    // Sincroniza localmente
    const users = getLocalStorage("users") || {};
    users[uid] = userObj;
    setLocalStorage("users", users);
    
    const leaderboard = getLocalStorage("leaderboard") || [];
    if (!leaderboard.some(l => l.name === userObj.name)) {
      leaderboard.push({ name: userObj.name, xp: userObj.xp, avatar: userObj.avatarUrl });
      setLocalStorage("leaderboard", leaderboard);
    }
  },

  login: async (loginOrEmail, password) => {
    const queryStr = String(loginOrEmail || '').trim().toLowerCase();
    const users = getLocalStorage("users") || {};
    const barbers = getLocalStorage("barbers") || [];

    if (isRealFirebase()) {
      // 1. Resolve o e-mail de autenticação correto para Firebase Auth
      let targetEmail = "";
      let matchedLocalUser = null;

      if (queryStr.includes("@")) {
        targetEmail = queryStr;
      } else if (queryStr === "dono") {
        targetEmail = "dono@royalblade.com";
      } else if (queryStr === "admin") {
        targetEmail = "admin@royalblade.com";
      } else {
        // Tenta achar em barbers
        const barber = barbers.find(b =>
          String(b.login || '').toLowerCase() === queryStr ||
          String(b.email || '').toLowerCase() === queryStr
        );
        if (barber) {
          targetEmail = barber.email || `${barber.login}@royalblade.com`;
        } else {
          // Tenta achar em users
          const u = Object.values(users).find(u =>
            String(u.email || '').toLowerCase() === queryStr ||
            String(u.uid || '').toLowerCase() === queryStr ||
            String(u.login || '').toLowerCase() === queryStr
          );
          if (u && u.email) {
            targetEmail = u.email;
            matchedLocalUser = u;
          } else {
            targetEmail = `${queryStr}@royalblade.com`;
          }
        }
      }

      // Senha do Firebase (mínimo 6 caracteres)
      const firebasePassword = password.length >= 6 ? password : password + "_Cb!26";

      try {
        let userCredential = null;
        try {
          userCredential = await signInWithEmailAndPassword(auth, targetEmail, firebasePassword);
        } catch (signInErr) {
          // Se falhou e a senha testada tinha sufixo, tenta a senha crua
          if ((signInErr.code === "auth/invalid-credential" || signInErr.code === "auth/wrong-password") && firebasePassword !== password) {
            try {
              userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
            } catch (retryErr) {
              throw new Error("INCORRECT_PASSWORD");
            }
          } else if (signInErr.code === "auth/invalid-credential" || signInErr.code === "auth/wrong-password") {
            throw new Error("INCORRECT_PASSWORD");
          } else if (signInErr.code === "auth/user-not-found") {
            // Auto-cria conta no Auth para usuários padrão se ainda não existirem
            const fallbackUser = Object.values(users).find(u =>
              String(u.email || '').toLowerCase() === targetEmail.toLowerCase()
            ) || (targetEmail === "dono@royalblade.com" ? INITIAL_MOCK_DATA.users.dono : null)
              || (targetEmail === "admin@royalblade.com" ? INITIAL_MOCK_DATA.users.admin : null);

            if (fallbackUser) {
              try {
                userCredential = await createUserWithEmailAndPassword(auth, targetEmail, firebasePassword);
                await updateProfile(userCredential.user, { displayName: fallbackUser.name });
              } catch (crErr) {
                throw new Error("USER_NOT_FOUND");
              }
            } else {
              throw new Error("USER_NOT_FOUND");
            }
          } else if (signInErr.code === "auth/invalid-email") {
            throw new Error("USER_NOT_FOUND");
          } else {
            throw signInErr;
          }
        }

        if (userCredential) {
          const firebaseUid = userCredential.user.uid;
          const docRef = doc(db, "users", firebaseUid);
          const docSnap = await getDoc(docRef);
          let finalUser;

          if (docSnap.exists()) {
            finalUser = docSnap.data();
            // Garante role correta para dono ou admin
            if ((targetEmail === "dono@royalblade.com" || targetEmail === "admin@royalblade.com") && finalUser.role !== "owner") {
              finalUser.role = "owner";
              await updateDoc(docRef, { role: "owner" });
            }
          } else {
            const role = (targetEmail === "dono@royalblade.com" || targetEmail === "admin@royalblade.com")
              ? "owner"
              : (matchedLocalUser?.role || "client");

            finalUser = {
              uid: firebaseUid,
              name: userCredential.user.displayName || (matchedLocalUser?.name) || (targetEmail === "dono@royalblade.com" ? "Dono da Barbearia" : "Administrador"),
              email: targetEmail,
              role: role,
              xp: 0,
              coins: 0,
              plan: "Plano Master",
              avatarUrl: userCredential.user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
              createdAt: new Date().toISOString()
            };
            await setDoc(docRef, finalUser);
            await setDoc(doc(db, "leaderboard", firebaseUid), {
              name: finalUser.name,
              xp: finalUser.xp || 0,
              avatar: finalUser.avatarUrl || ""
            });
          }

          // Sincroniza localmente
          const localUsers = getLocalStorage("users") || {};
          localUsers[firebaseUid] = finalUser;
          setLocalStorage("users", localUsers);
          localStorage.setItem("clubber_current_user", JSON.stringify(finalUser));

          return finalUser;
        }
      } catch (authErr) {
        console.error("Erro na autenticação Firebase no login:", authErr);
        if (authErr.message === "INCORRECT_PASSWORD" || authErr.code === "auth/wrong-password" || authErr.code === "auth/invalid-credential") {
          throw new Error("INCORRECT_PASSWORD");
        }
        if (authErr.message === "USER_NOT_FOUND" || authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-email") {
          throw new Error("USER_NOT_FOUND");
        }
        throw authErr;
      }
    }

    // Modo Mock Offline (fallback)
    let user = Object.values(users).find(u => 
      String(u.email || '').toLowerCase() === queryStr || 
      String(u.uid || '').toLowerCase() === queryStr
    );
    if (!user) {
      const barber = barbers.find(b => 
        String(b.login || '').toLowerCase() === queryStr || 
        String(b.email || '').toLowerCase() === queryStr
      );
      if (barber) user = users[barber.uid] || barber;
    }
    if (!user) throw new Error("USER_NOT_FOUND");
    const userPassword = user.password || "Club@2026";
    if (userPassword !== password) throw new Error("INCORRECT_PASSWORD");
    localStorage.setItem("clubber_current_user", JSON.stringify(user));
    return user;
  },

  getUsers: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data());
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const users = getLocalStorage("users") || {};
    return Object.values(users);
  },

  updateUserXP: async (uid, xpEarned, coinsEarned) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const newXp = (data.xp || 0) + xpEarned;
          const newCoins = (data.coins || 0) + coinsEarned;
          const newLevel = Math.floor(newXp / 1000) + 1;
          await updateDoc(docRef, { xp: newXp, coins: newCoins, level: newLevel });
          return { xp: newXp, coins: newCoins, level: newLevel };
        }
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const users = getLocalStorage("users") || {};
    // Procura por ID ou assume ricardo_uid
    let userKey = users[uid] ? uid : "ricardo_uid";
    if (users[userKey]) {
      users[userKey].xp += xpEarned;
      users[userKey].coins += coinsEarned;
      users[userKey].level = Math.floor(users[userKey].xp / 1000) + 1;
      setLocalStorage("users", users);
      return users[userKey];
    }
    return null;
  },

  // Agendamentos
  getAppointments: async (clientUid) => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "appointments"), where("clientUid", "==", clientUid));
        const querySnapshot = await getDocs(q);
        const apts = [];
        querySnapshot.forEach((doc) => {
          apts.push({ id: doc.id, ...doc.data() });
        });
        return apts;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const appointments = getLocalStorage("appointments") || [];
    return appointments.filter(a => a.clientUid === clientUid);
  },

  getBarberAppointments: async (barberUid) => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "appointments"), where("barberUid", "==", barberUid));
        const querySnapshot = await getDocs(q);
        const apts = [];
        querySnapshot.forEach((doc) => {
          apts.push({ id: doc.id, ...doc.data() });
        });
        return apts;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const appointments = getLocalStorage("appointments") || [];
    return appointments.filter(a => a.barberUid === barberUid);
  },

  getAllAppointments: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "appointments"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return getLocalStorage("appointments") || [];
  },

  confirmClientPresence: async (appointmentId) => {
    let appointment = null;
    let isMock = true;

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "appointments", appointmentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          appointment = { id: docSnap.id, ...docSnap.data() };
          isMock = false;
        }
      } catch (e) {
        console.warn("Firestore error reading appointment, falling back to mock", e);
      }
    }

    if (!appointment) {
      let appointments = getLocalStorage("appointments") || [];
      const aptIndex = appointments.findIndex(a => a.id === appointmentId);
      if (aptIndex === -1) {
        throw new Error("Agendamento não encontrado.");
      }
      appointment = appointments[aptIndex];
    }

    if (appointment.status === "completed") {
      return appointment;
    }

    appointment.status = "completed";

    if (!isMock) {
      try {
        const docRef = doc(db, "appointments", appointmentId);
        await updateDoc(docRef, { status: "completed" });
      } catch (e) {
        console.warn("Firestore error updating appointment", e);
      }
    } else {
      let appointments = getLocalStorage("appointments") || [];
      const aptIndex = appointments.findIndex(a => a.id === appointmentId);
      if (aptIndex !== -1) {
        appointments[aptIndex] = appointment;
        setLocalStorage("appointments", appointments);
      }
    }

    // XP and Coins awards
    const services = appointment.services || [];
    const servicesList = await dbService.getServices();
    let xpEarned = appointment.xpBonus || 0;
    let priceSum = 0;

    for (const serviceName of services) {
      const s = servicesList.find(item => item.name === serviceName);
      if (s) {
        xpEarned += s.xp || s.price || 50;
        priceSum += s.price || 50;
      } else {
        xpEarned += 50;
        priceSum += 50;
      }
    }
    if (priceSum === 0) priceSum = 80;

    const coinsEarned = Math.floor(xpEarned * 0.10);

    await dbService.updateUserXP(appointment.clientUid, xpEarned, coinsEarned);

    // Register finance revenue
    await dbService.createTransaction({
      type: "revenue",
      amount: priceSum,
      description: `${services.join(", ")} - Presença Confirmada (${appointment.clientName})`,
      category: "appointment"
    });

    // --- Gatilho de Notificação de Presença ---
    try {
      await dbService.createNotification({
        recipientUid: appointment.clientUid,
        title: "Presença Confirmada! 🎉",
        body: `Sua presença com o profissional ${appointment.barberName} no dia ${appointment.date} às ${appointment.time} foi confirmada! Você ganhou +${xpEarned} XP e +${coinsEarned} Coins.`,
        type: "presence_confirmed",
        metadata: { appointmentId: appointment.id, date: appointment.date, time: appointment.time }
      });
    } catch (errNotif) {
      console.warn("Erro ao gerar notificação de presença confirmada:", errNotif);
    }

    return appointment;
  },

  createAppointment: async (appointmentData) => {
    const newApt = {
      id: "apt_" + Date.now(),
      status: "scheduled",
      ...appointmentData
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "appointments", newApt.id), newApt);
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
        const appointments = getLocalStorage("appointments") || [];
        appointments.push(newApt);
        setLocalStorage("appointments", appointments);
      }
    } else {
      const appointments = getLocalStorage("appointments") || [];
      appointments.push(newApt);
      setLocalStorage("appointments", appointments);
    }

    // --- Gatilhos de Notificação ---
    try {
      // 1. Notificar Barbeiro
      await dbService.createNotification({
        recipientUid: newApt.barberUid,
        title: "Novo Agendamento! 📅",
        body: `Cliente ${newApt.clientName} agendou ${newApt.services.join(", ")} para o dia ${newApt.date} às ${newApt.time}.`,
        type: "booking_created",
        metadata: { appointmentId: newApt.id, date: newApt.date, time: newApt.time }
      });

      // 2. Notificar Cliente
      await dbService.createNotification({
        recipientUid: newApt.clientUid,
        title: "Agendamento Confirmado! ✅",
        body: `Seu agendamento de ${newApt.services.join(", ")} com o profissional ${newApt.barberName} no dia ${newApt.date} às ${newApt.time} foi registrado.`,
        type: "booking_created",
        metadata: { appointmentId: newApt.id, date: newApt.date, time: newApt.time }
      });
    } catch (errNotif) {
      console.warn("Erro ao gerar notificações de agendamento:", errNotif);
    }

    return newApt;
  },

  cancelAppointment: async (id) => {
    let appointment = null;
    let isMock = true;

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "appointments", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          appointment = { id: docSnap.id, ...docSnap.data() };
          isMock = false;
        }
      } catch (e) {
        console.warn("Firestore error reading appointment for cancel, falling back to mock", e);
      }
    }

    if (!appointment) {
      const appointments = getLocalStorage("appointments") || [];
      appointment = appointments.find(a => a.id === id);
    }

    if (!appointment) return false;

    const currentUserStr = localStorage.getItem("clubber_current_user");
    if (!currentUserStr) return false;
    const parsedUser = JSON.parse(currentUserStr);

    if (parsedUser.role !== "owner" && 
        parsedUser.uid !== appointment.clientUid && 
        parsedUser.uid !== appointment.barberUid) {
      console.warn("[cancelAppointment] Acesso negado: Usuário não tem permissão para cancelar.");
      return false;
    }

    appointment.status = "cancelled";

    if (!isMock) {
      try {
        const docRef = doc(db, "appointments", id);
        await updateDoc(docRef, { status: "cancelled" });
      } catch (e) {
        console.warn("Firestore error updating appointment to cancelled", e);
      }
    } else {
      const appointments = getLocalStorage("appointments") || [];
      const updated = appointments.map(a => a.id === id ? { ...a, status: "cancelled" } : a);
      setLocalStorage("appointments", updated);
    }

    // --- Gatilho de Notificação de Cancelamento ---
    try {
      const currentUserStr = localStorage.getItem("clubber_current_user");
      let cancellerUid = "";
      let cancellerRole = "";
      if (currentUserStr) {
        const parsed = JSON.parse(currentUserStr);
        cancellerUid = parsed.uid;
        cancellerRole = parsed.role;
      }

      if (cancellerUid === appointment.clientUid || cancellerRole === "client") {
        await dbService.createNotification({
          recipientUid: appointment.barberUid,
          title: "Agendamento Cancelado ❌",
          body: `O cliente ${appointment.clientName} cancelou o agendamento de ${appointment.services.join(", ")} no dia ${appointment.date} às ${appointment.time}.`,
          type: "booking_cancelled",
          metadata: { appointmentId: appointment.id, date: appointment.date, time: appointment.time }
        });
      } else {
        await dbService.createNotification({
          recipientUid: appointment.clientUid,
          title: "Agendamento Cancelado ❌",
          body: `Seu agendamento de ${appointment.services.join(", ")} no dia ${appointment.date} às ${appointment.time} com o profissional ${appointment.barberName} foi cancelado pela barbearia.`,
          type: "booking_cancelled",
          metadata: { appointmentId: appointment.id, date: appointment.date, time: appointment.time }
        });
      }
    } catch (errNotif) {
      console.warn("Erro ao gerar notificações de cancelamento:", errNotif);
    }

    return true;
  },

  deleteAppointment: async (id) => {
    if (isRealFirebase()) {
      try {
        await deleteDoc(doc(db, "appointments", id));
      } catch (e) {
        console.warn("Firestore error deleting appointment, falling back to mock", e);
      }
    }
    const appointments = getLocalStorage("appointments") || [];
    const updated = appointments.filter(a => a.id !== id);
    setLocalStorage("appointments", updated);
    return true;
  },

  createBlockedAppointment: async (blockData) => {
    const newBlock = {
      id: "block_" + Date.now(),
      clientUid: "blocked",
      clientName: "Horário Bloqueado",
      status: "scheduled",
      isBlocked: true,
      services: ["Bloqueio"],
      ...blockData
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "appointments", newBlock.id), newBlock);
      } catch (e) {
        console.warn("Firestore error creating block, falling back to mock", e);
        const appointments = getLocalStorage("appointments") || [];
        appointments.push(newBlock);
        setLocalStorage("appointments", appointments);
      }
    } else {
      const appointments = getLocalStorage("appointments") || [];
      appointments.push(newBlock);
      setLocalStorage("appointments", appointments);
    }
    return newBlock;
  },

  // Barbeiros
  getBarbers: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "barbers"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return getLocalStorage("barbers") || [];
  },

  // Feed de Comunidade
  getPosts: async () => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const posts = getLocalStorage("posts") || [];
    return posts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  createPost: async (postData) => {
    const newPost = {
      id: "post_" + Date.now(),
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      ...postData
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "posts", newPost.id), newPost);
        return newPost;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const posts = getLocalStorage("posts") || [];
    posts.unshift(newPost);
    setLocalStorage("posts", posts);
    return newPost;
  },

  likePost: async (postId, userUid) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "posts", postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const likes = docSnap.data().likes || [];
          const updatedLikes = likes.includes(userUid) 
            ? likes.filter(uid => uid !== userUid)
            : [...likes, userUid];
          await updateDoc(docRef, { likes: updatedLikes });
          return updatedLikes;
        }
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const posts = getLocalStorage("posts") || [];
    let updatedLikes = [];
    const updated = posts.map(p => {
      if (p.id === postId) {
        const likes = p.likes || [];
        const isLiked = likes.includes(userUid);
        updatedLikes = isLiked ? likes.filter(uid => uid !== userUid) : [...likes, userUid];
        return { ...p, likes: updatedLikes };
      }
      return p;
    });
    setLocalStorage("posts", updated);
    return updatedLikes;
  },

  getLeaderboard: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "leaderboard"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data());
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return getLocalStorage("leaderboard") || [];
  },

  // --- REGRAS E FUNÇÕES DO BOLÃO ---
  getBets: async (matchId) => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "bets"), where("matchId", "==", matchId));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (e) {
        console.warn("Firestore error reading bets, falling back to mock", e);
      }
    }
    // Retorna os palpites de um determinado jogo
    const bets = getLocalStorage("bets") || [];
    return bets.filter(b => b.matchId === matchId);
  },

  createBet: async (matchId, userUid, userName, predA, predB) => {
    const newBet = {
      id: `bet_${matchId}_${userUid}`,
      matchId,
      userUid,
      userName,
      predA: parseInt(predA),
      predB: parseInt(predB),
      points: 0,
      isWinner: false,
      createdAt: new Date().toISOString()
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "bets", newBet.id), newBet);
        return newBet;
      } catch (e) {
        console.warn("Firestore error creating bet, falling back to mock", e);
      }
    }

    const bets = getLocalStorage("bets") || [];
    // Evita duplicados para o mesmo jogo e mesmo usuário
    const filtered = bets.filter(b => !(b.matchId === matchId && b.userUid === userUid));
    filtered.push(newBet);
    setLocalStorage("bets", filtered);
    return newBet;
  },

  getBettingLeaderboard: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "betting_leaderboard"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data());
        });
        return list;
      } catch (e) {
        console.warn("Firestore error reading betting_leaderboard, falling back to mock", e);
      }
    }
    // Retorna o ranking mensal dos palpites
    return getLocalStorage("betting_leaderboard") || [];
  },

  resolveMatch: async (matchId, finalScoreA, finalScoreB) => {
    const bets = getLocalStorage("bets") || [];
    const users = getLocalStorage("users") || {};
    const bettingLeaderboard = getLocalStorage("betting_leaderboard") || [];
    const winners = [];

    const updatedBets = bets.map(bet => {
      if (bet.matchId === matchId) {
        const isExact = bet.predA === finalScoreA && bet.predB === finalScoreB;
        const isWinner = (finalScoreA > finalScoreB && bet.predA > bet.predB) ||
                         (finalScoreA < finalScoreB && bet.predA < bet.predB) ||
                         (finalScoreA === finalScoreB && bet.predA === bet.predB);
        
        const isTrendAndGD = !isExact && isWinner && (bet.predA - bet.predB === finalScoreA - finalScoreB);
        const isWinnerOnly = !isExact && isWinner && (bet.predA - bet.predB !== finalScoreA - finalScoreB);

        const userKey = users[bet.userUid] ? bet.userUid : "ricardo_uid";
        const userObj = users[userKey];
        const userLevelInfo = dbService.getUserLevel(userObj);
        const multiplier = userLevelInfo.pointsMultiplier || 1.0;

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
        bet.points = points;
        bet.isWinner = won;

        if (userObj && won) {
          winners.push(bet);
          userObj.xp = (userObj.xp || 0) + xpGained;
          userObj.coins = (userObj.coins || 0) + coinsGained;
          userObj.level = Math.floor(userObj.xp / 1000) + 1;
          users[userKey] = userObj;

          let found = false;
          const updatedLeaderboard = bettingLeaderboard.map(lb => {
            if (lb.userUid === bet.userUid) {
              lb.correctGuesses += isExact ? 1 : 0;
              lb.points += points;
              found = true;
            }
            return lb;
          });

          if (!found) {
            updatedLeaderboard.push({
              userUid: bet.userUid,
              name: bet.userName,
              correctGuesses: isExact ? 1 : 0,
              points: points,
              avatar: userObj.avatarUrl || null
            });
          }
          setLocalStorage("betting_leaderboard", updatedLeaderboard);
        }
      }
      return bet;
    });

    setLocalStorage("bets", updatedBets);
    setLocalStorage("users", users);
    
    // Retorna os ganhadores específicos dessa partida resolvida
    return winners;
  },

  // --- MÉTODOS DE COMENTÁRIOS DA COMUNIDADE ---
  getComments: async (postId) => {
    const comments = getLocalStorage("comments") || [];
    return comments
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  createComment: async (postId, userUid, userName, userAvatar, content) => {
    const comments = getLocalStorage("comments") || [];
    const newComment = {
      id: "comment_" + Date.now(),
      postId,
      authorUid: userUid,
      authorName: userName,
      authorAvatar: userAvatar || null,
      content,
      createdAt: new Date().toISOString()
    };
    comments.push(newComment);
    setLocalStorage("comments", comments);

    // Incrementa commentsCount no post correspondente
    const posts = getLocalStorage("posts") || [];
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
      }
      return p;
    });
    setLocalStorage("posts", updatedPosts);

    return newComment;
  },

  // --- MÉTODOS DE CHAT E MENSAGENS ---
  getClients: async () => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "users"), where("role", "==", "client"));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach(docSnap => {
          list.push({ uid: docSnap.id, ...docSnap.data() });
        });
        return list;
      } catch (e) {
        console.error("Erro ao buscar clientes no Firebase:", e);
      }
    }
    const users = getLocalStorage("users") || {};
    return Object.values(users).filter(u => u.role === "client");
  },

  getMessages: async (userUid, otherUid) => {
    const messages = getLocalStorage("messages") || [];
    return messages
      .filter(m => 
        (m.senderUid === userUid && m.receiverUid === otherUid) ||
        (m.senderUid === otherUid && m.receiverUid === userUid)
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  sendMessage: async (senderUid, senderName, receiverUid, receiverName, content) => {
    const messages = getLocalStorage("messages") || [];
    const newMsg = {
      id: "msg_" + Date.now(),
      senderUid,
      senderName,
      receiverUid,
      receiverName,
      content,
      createdAt: new Date().toISOString()
    };
    messages.push(newMsg);
    setLocalStorage("messages", messages);
    return newMsg;
  },

  // --- MÉTODOS DE SERVIÇOS E ESPECIALIDADES ---
  getServices: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "services"));
        const firestoreServices = [];
        querySnapshot.forEach((doc) => {
          firestoreServices.push({ id: doc.id, ...doc.data() });
        });
        console.log("[dbService] getServices from Firestore:", firestoreServices);
        setLocalStorage("services", firestoreServices);
        return firestoreServices;
      } catch (e) {
        console.warn("Firestore error fetching services, falling back to local cache", e);
      }
    }
    const local = getLocalStorage("services") || [];
    console.log("[dbService] getServices from local cache:", local);
    return local;
  },

  createService: async (serviceData) => {
    console.log("[dbService] createService called with:", serviceData);
    const newService = {
      xp: parseInt(serviceData.price), // XP base = valor do preço para simplificar
      duration: serviceData.duration || "30 min",
      icon: serviceData.icon || "content_cut",
      type: serviceData.type || "regular",
      ...serviceData
    };

    if (isRealFirebase()) {
      try {
        console.log("[dbService] Firestore creating service:", newService);
        const docRef = await addDoc(collection(db, "services"), newService);
        const created = { id: docRef.id, ...newService };
        console.log("[dbService] Firestore create success:", created);
        
        // Atualiza cache local
        const services = getLocalStorage("services") || [];
        services.push(created);
        setLocalStorage("services", services);
        return created;
      } catch (e) {
        console.error("[dbService] Firestore error creating service:", e);
      }
    }

    const services = getLocalStorage("services") || [];
    const localService = { id: "service_" + Date.now(), ...newService };
    services.push(localService);
    setLocalStorage("services", services);
    return localService;
  },

  getBarberSpecialties: async (barberUid) => {
    const barbers = getLocalStorage("barbers") || [];
    const barber = barbers.find(b => b.uid === barberUid);
    if (barber && barber.specialties) {
      return barber.specialties;
    }
    // Fallback padrão se não encontrar
    return [
      { name: "Corte Royal", time: "45 min", price: 90, icon: "content_cut", type: "regular" },
      { name: "Barba Terapia", time: "30 min", price: 60, icon: "face", type: "regular" },
      { name: "Pigmentação Premium", time: "Especialista Gold", price: 120, icon: "brush", type: "specialist" },
      { name: "Sobrancelha", time: "15 min", price: 30, icon: "clean_hands", type: "regular" }
    ];
  },

  updateService: async (serviceId, serviceData) => {
    console.log("[dbService] updateService called with:", serviceId, serviceData);
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "services", serviceId);
        console.log("[dbService] Firestore updating service doc:", serviceId);
        await updateDoc(docRef, serviceData);
        console.log("[dbService] Firestore update success");
        
        // Atualiza cache local
        const services = getLocalStorage("services") || [];
        const updated = services.map(s => s.id === serviceId ? { ...s, ...serviceData } : s);
        setLocalStorage("services", updated);
        return { id: serviceId, ...serviceData };
      } catch (e) {
        console.error("[dbService] Firestore error updating service:", e);
      }
    }
    const services = getLocalStorage("services") || [];
    const updated = services.map(s => s.id === serviceId ? { ...s, ...serviceData } : s);
    setLocalStorage("services", updated);
    return { id: serviceId, ...serviceData };
  },

  deleteService: async (serviceId) => {
    console.log("[dbService] deleteService called with:", serviceId);
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "services", serviceId);
        await deleteDoc(docRef);
        console.log("[dbService] Firestore delete success for doc:", serviceId);
        
        // Atualiza cache local
        const services = getLocalStorage("services") || [];
        const updated = services.filter(s => s.id !== serviceId);
        setLocalStorage("services", updated);
        return true;
      } catch (e) {
        console.error("[dbService] Firestore error deleting service:", e);
      }
    }
    const services = getLocalStorage("services") || [];
    const updated = services.filter(s => s.id !== serviceId);
    setLocalStorage("services", updated);
    return true;
  },

  updateBarberSpecialty: async (barberUid, index, specialty) => {
    const barbers = getLocalStorage("barbers") || [];
    let updatedSpecialties = [];
    const updatedBarbers = barbers.map(b => {
      if (b.uid === barberUid) {
        const specs = b.specialties || [];
        if (specs[index]) {
          specs[index] = { ...specs[index], ...specialty };
        }
        b.specialties = specs;
        updatedSpecialties = b.specialties;
      }
      return b;
    });
    setLocalStorage("barbers", updatedBarbers);
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "barbers", barberUid);
        await updateDoc(docRef, { specialties: updatedSpecialties });
      } catch (e) {
        console.warn("Firestore error updating barber specialty", e);
      }
    }
    return updatedSpecialties;
  },

  cleanupOrphanServices: async () => {
    if (!isRealFirebase()) return;
    try {
      console.log("[dbService] Starting orphan services cleanup...");
      // 1. Purgar manualmente os IDs antigos solicitados pelo usuário
      const servicesToPurge = ["barba", "cabelo", "cabelo_barba"];
      for (const pid of servicesToPurge) {
        try {
          const docRef = doc(db, "services", pid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log("[dbService Sync] Purgando serviço antigo por ID:", pid);
            await deleteDoc(docRef);
          }
        } catch (e) {
          console.warn("Erro ao purgar serviço por ID:", pid, e);
        }
      }

      // 2. Buscar todos os barbeiros para mapear as especialidades ativas
      const barbersSnap = await getDocs(collection(db, "barbers"));
      const activeSpecialtyNames = new Set();
      barbersSnap.forEach(barberDoc => {
        const barber = { id: barberDoc.id, ...barberDoc.data() };
        const specs = barber.specialties || [];
        for (const spec of specs) {
          activeSpecialtyNames.add(spec.name);
        }
      });

      // 3. Buscar todos os serviços globais e deletar os órfãos ou de teste
      const servicesSnap = await getDocs(collection(db, "services"));
      for (const sDoc of servicesSnap.docs) {
        const sData = sDoc.data();
        const nameLower = (sData.name || "").toLowerCase();
        const idLower = sDoc.id.toLowerCase();
        
        // Critério 1: nome ou ID contém teste/texte
        const isTestService = nameLower.includes("texte") || nameLower.includes("teste") || idLower.includes("texte") || idLower.includes("teste");
        
        // Critério 2: órfão (não está nas especialidades de nenhum barbeiro)
        const isOrphan = !activeSpecialtyNames.has(sData.name);

        if (isTestService || isOrphan) {
          console.log("[dbService Sync] Deletando serviço (teste ou órfão) da coleção global:", sData.name || sDoc.id);
          await deleteDoc(doc(db, "services", sDoc.id));
        }
      }

      // 4. Garantir que as especialidades ativas de todos os barbeiros estejam cadastradas como serviços globais
      const currentServicesSnap = await getDocs(collection(db, "services"));
      const currentServices = [];
      currentServicesSnap.forEach(docSnap => currentServices.push({ id: docSnap.id, ...docSnap.data() }));

      barbersSnap.forEach(async (barberDoc) => {
        const barber = { id: barberDoc.id, ...barberDoc.data() };
        const specs = barber.specialties || [];
        for (const spec of specs) {
          const alreadyExists = currentServices.some(s => s.name === spec.name);
          if (!alreadyExists) {
            console.log("[dbService Sync] Criando serviço global para especialidade ativa:", spec.name);
            const newService = {
              id: "service_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
              name: spec.name,
              price: spec.price,
              duration: spec.time || "30 min",
              icon: spec.icon || "content_cut",
              type: spec.type || "regular",
              xp: parseInt(spec.price) || 50
            };
            await setDoc(doc(db, "services", newService.id), newService);
            currentServices.push(newService);
          }
        }
      });

      console.log("[dbService] Orphan services cleanup completed.");
    } catch (err) {
      console.warn("Erro durante limpeza de serviços órfãos:", err);
    }
  },

  addBarberSpecialty: async (barberUid, specialty) => {
    const barbers = getLocalStorage("barbers") || [];
    let updatedSpecialties = [];
    
    const updatedBarbers = barbers.map(b => {
      if (b.uid === barberUid) {
        const specs = b.specialties || [];
        // Se a especialidade for um objeto, adiciona direto
        const specObj = typeof specialty === "string" 
          ? { name: specialty, time: "30 min", price: 50, icon: "content_cut", type: "regular" } 
          : specialty;
        
        b.specialties = [...specs, specObj];
        updatedSpecialties = b.specialties;
      }
      return b;
    });

    setLocalStorage("barbers", updatedBarbers);
    return updatedSpecialties;
  },

  deleteBarber: async (barberUid) => {
    const barbers = getLocalStorage("barbers") || [];
    const barberToDelete = barbers.find(b => b.uid === barberUid);
    if (!barberToDelete) return false;

    // 1. Remove o barbeiro
    const updatedBarbers = barbers.filter(b => b.uid !== barberUid);
    setLocalStorage("barbers", updatedBarbers);

    // 2. Altera o status dos agendamentos futuros deste barbeiro para "reschedule_needed"
    const appointments = getLocalStorage("appointments") || [];
    const updatedAppointments = appointments.map(apt => {
      // Compara se o agendamento era com este barbeiro (ignora case e aproxima)
      if (apt.barberName && barberToDelete.name && 
          (apt.barberName.toLowerCase().includes(barberToDelete.name.toLowerCase()) || 
           barberToDelete.name.toLowerCase().includes(apt.barberName.toLowerCase()))) {
        
        if (apt.status === "scheduled") {
          apt.status = "reschedule_needed";
          
          // 3. Cria uma mensagem automática de notificação do sistema
          const messages = getLocalStorage("messages") || [];
          const systemMsg = {
            id: "msg_sys_" + Date.now() + "_" + apt.id,
            senderUid: "system_admin",
            senderName: "Administração Clubber",
            receiverUid: apt.clientUid,
            receiverName: apt.clientName,
            content: `⚠️ Atenção! Seu agendamento de '${apt.services.join(", ")}' no dia ${apt.date} às ${apt.time} com o profissional ${barberToDelete.name} precisa ser reagendado, pois o profissional não está mais disponível.`,
            createdAt: new Date().toISOString()
          };
          messages.push(systemMsg);
          setLocalStorage("messages", messages);
        }
      }
      return apt;
    });
    
    setLocalStorage("appointments", updatedAppointments);
    return true;
  },

  // --- MÓDULO 1 & 2 & 3: BARBEIROS E UNIDADES ---
  createBarber: async (barberData) => {
    const defaultSpecialties = [
      { name: "Corte Royal", time: "30 min", price: 90, icon: "content_cut", type: "regular" },
      { name: "Barba Terapia", time: "30 min", price: 60, icon: "face", type: "regular" }
    ];

    const newBarber = {
      uid: "barber_" + Date.now(),
      rating: 5.0,
      cutsThisMonth: 0,
      goalProgress: 0,
      status: "online",
      bio: barberData.bio || "",
      avatarUrl: barberData.avatarUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=60",
      unitIds: barberData.unitIds || [],
      specialties: barberData.specialties || defaultSpecialties,
      scheduleConfig: {
        start: "09:00",
        end: "19:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        interval: 15
      },
      ...barberData
    };

    // Garante que os serviços padrão existam na coleção global
    const specs = newBarber.specialties;
    const existingServices = await dbService.getServices();
    for (const spec of specs) {
      const alreadyExists = existingServices.some(s => s.name === spec.name);
      if (!alreadyExists) {
        const services = getLocalStorage("services") || [];
        const newService = {
          id: "service_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          name: spec.name,
          price: spec.price,
          duration: spec.time || "30 min",
          icon: spec.icon || "content_cut",
          type: spec.type || "regular",
          xp: parseInt(spec.price) || 50
        };
        services.push(newService);
        setLocalStorage("services", services);
      }
    }

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "barbers", newBarber.uid), newBarber);
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const barbers = getLocalStorage("barbers") || [];
    barbers.push(newBarber);
    setLocalStorage("barbers", barbers);
    return newBarber;
  },

  updateBarberProfile: async (barberUid, profileData) => {
    const barbers = getLocalStorage("barbers") || [];
    const updated = barbers.map(b => b.uid === barberUid ? { ...b, ...profileData } : b);
    setLocalStorage("barbers", updated);

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "barbers", barberUid);
        await updateDoc(docRef, profileData);
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return true;
  },

  generateBarberCredentials: (name) => {
    const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return {
      login: `${cleanName}${randomSuffix}`,
      password: `Club@${new Date().getFullYear()}`
    };
  },

  updateBarberCredentials: async (barberUid, { login, password }) => {
    const barbers = getLocalStorage("barbers") || [];
    const updated = barbers.map(b => b.uid === barberUid ? { ...b, login, password } : b);
    setLocalStorage("barbers", updated);

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "barbers", barberUid);
        await updateDoc(docRef, { login, password });
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return true;
  },

  getUnits: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "units"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return getLocalStorage("units") || [];
  },

  createUnit: async (unitData) => {
    const newUnit = {
      id: "unit_" + Date.now(),
      ...unitData
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "units", newUnit.id), newUnit);
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const units = getLocalStorage("units") || [];
    units.push(newUnit);
    setLocalStorage("units", units);
    return newUnit;
  },

  updateUnit: async (id, unitData) => {
    const units = getLocalStorage("units") || [];
    const updated = units.map(u => u.id === id ? { ...u, ...unitData } : u);
    setLocalStorage("units", updated);

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "units", id);
        await updateDoc(docRef, unitData);
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return { id, ...unitData };
  },

  deleteUnit: async (id) => {
    const units = getLocalStorage("units") || [];
    const filtered = units.filter(u => u.id !== id);
    setLocalStorage("units", filtered);

    // Também atualiza os barbeiros removendo essa unidade
    const barbers = getLocalStorage("barbers") || [];
    const updatedBarbers = barbers.map(b => {
      if (b.unitIds && b.unitIds.includes(id)) {
        return { ...b, unitIds: b.unitIds.filter(uid => uid !== id) };
      }
      return b;
    });
    setLocalStorage("barbers", updatedBarbers);

    if (isRealFirebase()) {
      try {
        // Excluir do firebase real...
      } catch (e) {
        console.warn("Firestore error", e);
      }
    }
    return true;
  },

  assignBarberToUnit: async (barberUid, unitId) => {
    const barbers = getLocalStorage("barbers") || [];
    const updated = barbers.map(b => {
      if (b.uid === barberUid) {
        const unitIds = b.unitIds || [];
        if (!unitIds.includes(unitId)) {
          return { ...b, unitIds: [...unitIds, unitId] };
        }
      }
      return b;
    });
    setLocalStorage("barbers", updated);

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "barbers", barberUid);
        await updateDoc(docRef, {
          unitIds: arrayUnion(unitId)
        });
      } catch (e) {
        console.warn("Firestore error", e);
      }
    }
    return true;
  },

  updateBranding: async (brandingData) => {
    const branding = getLocalStorage("branding") || {};
    const updatedBranding = { ...branding, ...brandingData };
    setLocalStorage("branding", updatedBranding);

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "branding", "shop");
        await setDoc(docRef, updatedBranding, { merge: true });
      } catch (e) {
        console.warn("Firestore error", e);
      }
    }
    return updatedBranding;
  },

  getBranding: async () => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "branding", "shop");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data();
      } catch (e) {
        console.warn("Firestore error", e);
      }
    }
    return getLocalStorage("branding") || {};
  },

  // --- MÓDULO 4: FINANCEIRO ---
  getTransactions: async (filters = {}) => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) {
          return list.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const txs = getLocalStorage("transactions") || [];
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  createTransaction: async (txData) => {
    const newTx = {
      date: new Date().toISOString().split("T")[0],
      ...txData
    };

    if (isRealFirebase()) {
      try {
        const docRef = await addDoc(collection(db, "transactions"), newTx);
        return { id: docRef.id, ...newTx };
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const txs = getLocalStorage("transactions") || [];
    const localTx = { id: "tx_" + Date.now(), ...newTx };
    txs.push(localTx);
    setLocalStorage("transactions", txs);
    return localTx;
  },

  getExpenses: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "expenses"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return getLocalStorage("expenses") || [];
  },

  createExpense: async (expData) => {
    const newExp = {
      date: new Date().toISOString().split("T")[0],
      ...expData
    };

    if (isRealFirebase()) {
      try {
        const docRef = await addDoc(collection(db, "expenses"), newExp);
        return { id: docRef.id, ...newExp };
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const exps = getLocalStorage("expenses") || [];
    const localExp = { id: "exp_" + Date.now(), ...newExp };
    exps.push(localExp);
    setLocalStorage("expenses", exps);
    return localExp;
  },

  getFinancialSummary: async (period = "month") => {
    const txs = await dbService.getTransactions();
    const exps = await dbService.getExpenses();
    const barbers = await dbService.getBarbers();

    const revenue = txs.reduce((sum, t) => sum + (t.amount || 0), 0);
    const expenses = exps.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = revenue - expenses;

    const fixedExpenses = exps.filter(e => e.category === "fixed").reduce((sum, e) => sum + (e.amount || 0), 0);
    const variableExpenses = exps.filter(e => e.category === "variable").reduce((sum, e) => sum + (e.amount || 0), 0);

    const barberRanking = barbers.map(b => ({
      name: b.name,
      revenue: (b.cutsThisMonth || 0) * 80,
      cuts: b.cutsThisMonth || 0
    })).sort((a, b) => b.revenue - a.revenue);

    // Gera dados dos últimos 6 meses
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonthIndex = new Date().getMonth();
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      let mIndex = currentMonthIndex - i;
      if (mIndex < 0) mIndex += 12;
      const monthLabel = months[mIndex];
      if (i === 0) {
        chartData.push({
          month: monthLabel,
          revenue: revenue,
          expenses: expenses
        });
      } else {
        // Valores mockados bonitos para os meses anteriores
        const factor = (6 - i);
        chartData.push({
          month: monthLabel,
          revenue: 9000 + factor * 800 - Math.floor(Math.random() * 500),
          expenses: 3000 + factor * 200 - Math.floor(Math.random() * 200)
        });
      }
    }

    return {
      revenue,
      expenses,
      fixedExpenses,
      variableExpenses,
      netProfit,
      barberRanking,
      chartData,
      ticketAverage: revenue / (txs.length || 1),
      projection: revenue * 1.2
    };
  },

  // --- MÓDULO 5: LOJA ---
  getStoreItems: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "storeItems"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    return getLocalStorage("storeItems") || [];
  },

  createStoreItem: async (itemData) => {
    const newItem = {
      active: true,
      ...itemData
    };

    if (isRealFirebase()) {
      try {
        const docRef = await addDoc(collection(db, "storeItems"), newItem);
        return { id: docRef.id, ...newItem };
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }

    const items = getLocalStorage("storeItems") || [];
    const localItem = { id: "item_" + Date.now(), ...newItem };
    items.push(localItem);
    setLocalStorage("storeItems", items);
    return localItem;
  },

  updateStoreItem: async (id, itemData) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "storeItems", id);
        await updateDoc(docRef, itemData);
        return { id, ...itemData };
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const items = getLocalStorage("storeItems") || [];
    const updated = items.map(i => i.id === id ? { ...i, ...itemData } : i);
    setLocalStorage("storeItems", updated);
    return { id, ...itemData };
  },

  redeemItem: async (itemId, userUid) => {
    if (isRealFirebase()) {
      try {
        const userRef = doc(db, "users", userUid);
        const itemRef = doc(db, "storeItems", itemId);
        const redemptionId = "red_" + Date.now();
        const redemptionRef = doc(db, "redemptions", redemptionId);

        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) {
            throw new Error("Usuário não encontrado");
          }
          const userData = userSnap.data();

          const itemSnap = await transaction.get(itemRef);
          if (!itemSnap.exists()) {
            throw new Error("Item não encontrado");
          }
          const itemData = itemSnap.data();

          if (itemData.stock <= 0) {
            throw new Error("Item esgotado");
          }
          if ((userData.coins || 0) < itemData.price) {
            throw new Error("Saldo insuficiente de Coins");
          }

          // Updates
          const newCoins = userData.coins - itemData.price;
          transaction.update(userRef, { coins: newCoins });

          if (itemData.stock < 999) {
            transaction.update(itemRef, { stock: itemData.stock - 1 });
          }

          const newRedemption = {
            itemId,
            itemName: itemData.name,
            itemPrice: itemData.price,
            userUid,
            userName: userData.name,
            status: "pending",
            date: new Date().toISOString()
          };
          transaction.set(redemptionRef, newRedemption);
        });

        return { id: redemptionId };
      } catch (e) {
        console.error("Erro no resgate com Firestore transaction:", e);
        throw e;
      }
    }

    // Mock
    const items = getLocalStorage("storeItems") || [];
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error("Item não encontrado");
    if (item.stock <= 0) throw new Error("Item esgotado");

    const users = getLocalStorage("users") || {};
    const user = users[userUid];
    if (!user) throw new Error("Usuário não encontrado");
    if ((user.coins || 0) < item.price) throw new Error("Saldo insuficiente de Coins");

    user.coins -= item.price;
    if (item.stock < 999) item.stock -= 1;

    const redemptions = getLocalStorage("redemptions") || [];
    const newRedemption = {
      id: "red_" + Date.now(),
      itemId,
      itemName: item.name,
      itemPrice: item.price,
      userUid,
      userName: user.name,
      status: "pending",
      date: new Date().toISOString()
    };

    redemptions.push(newRedemption);
    
    setLocalStorage("users", users);
    setLocalStorage("storeItems", items);
    setLocalStorage("redemptions", redemptions);

    return newRedemption;
  },

  getRedemptions: async (filters = {}) => {
    if (isRealFirebase()) {
      try {
        let q = collection(db, "redemptions");
        if (filters.userUid) {
          q = query(q, where("userUid", "==", filters.userUid));
        }
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const redemptions = getLocalStorage("redemptions") || [];
    if (filters.userUid) {
      return redemptions.filter(r => r.userUid === filters.userUid);
    }
    return redemptions;
  },

  confirmDelivery: async (redemptionId) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "redemptions", redemptionId);
        await updateDoc(docRef, { status: "delivered" });
      } catch (e) {
        console.warn("Firestore error, falling back to mock", e);
      }
    }
    const redemptions = getLocalStorage("redemptions") || [];
    const updated = redemptions.map(r => r.id === redemptionId ? { ...r, status: "delivered" } : r);
    setLocalStorage("redemptions", updated);
    return true;
  },

  // --- MÓDULO 6: MOTOR DE AGENDAMENTO INTELIGENTE ---
  getBarberScheduleConfig: async (barberId) => {
    const barbers = getLocalStorage("barbers") || [];
    const barber = barbers.find(b => b.uid === barberId);
    return barber?.scheduleConfig || { start: "09:00", end: "19:00", lunchStart: "12:00", lunchEnd: "13:00", interval: 15 };
  },

  updateBarberScheduleConfig: async (barberId, config) => {
    const barbers = getLocalStorage("barbers") || [];
    const updated = barbers.map(b => b.uid === barberId ? { ...b, scheduleConfig: config } : b);
    setLocalStorage("barbers", updated);
    return config;
  },

  getAvailableSlots: async (barberId, date, serviceDurationMinutes) => {
    const config = await dbService.getBarberScheduleConfig(barberId);
    let dayApts = [];

    if (isRealFirebase()) {
      try {
        const q = query(
          collection(db, "appointments"),
          where("barberUid", "==", barberId),
          where("date", "==", date),
          where("status", "==", "scheduled")
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          dayApts.push({ id: doc.id, ...doc.data() });
        });
      } catch (e) {
        console.warn("Error loading appointments from Firestore, falling back to mock", e);
      }
    }

    if (dayApts.length === 0) {
      const appointments = getLocalStorage("appointments") || [];
      dayApts = appointments.filter(a => a.barberUid === barberId && a.date === date && a.status === "scheduled");
    }

    const slots = [];
    let current = new Date(`${date}T${config.start}`);
    const end = new Date(`${date}T${config.end}`);
    const lunchStart = new Date(`${date}T${config.lunchStart}`);
    const lunchEnd = new Date(`${date}T${config.lunchEnd}`);

    const pad = (n) => String(n).padStart(2, '0');

    while (current < end) {
      const slotTimeStr = `${pad(current.getHours())}:${pad(current.getMinutes())}`;
      const slotStart = new Date(current);
      const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60000);

      let available = true;
      let reason = "";

      if (slotEnd > end) {
        available = false;
        reason = "Expediente encerrado";
      }

      if (available) {
        const isLunchOverlapping = (slotStart < lunchEnd && slotEnd > lunchStart);
        if (isLunchOverlapping) {
          available = false;
          reason = "Horário de almoço";
        }
      }

      if (available) {
        for (const apt of dayApts) {
          let duration = apt.duration || 45;
          if (!apt.duration && apt.services && apt.services.length > 0) {
            const servicesList = await dbService.getServices();
            const matchingService = servicesList.find(s => apt.services.includes(s.name));
            if (matchingService) {
              duration = parseInt(matchingService.duration) || 30;
            }
          }
          const aptStart = new Date(`${date}T${apt.time}`);
          const aptEnd = new Date(aptStart.getTime() + duration * 60000);

          const isOverlapping = (slotStart < aptEnd && slotEnd > aptStart);
          if (isOverlapping) {
            available = false;
            reason = apt.isBlocked ? (apt.blockReason || "Horário Bloqueado") : "Horário ocupado";
            break;
          }
        }
      }

      slots.push({
        time: slotTimeStr,
        available,
        reason
      });

      current = new Date(current.getTime() + config.interval * 60000);
    }

    return slots;
  },
  getCoinConversionRatio: async () => {
    let planConfigs = {};
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "configs", "planConfigs");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          planConfigs = docSnap.data();
        }
      } catch (e) {
        console.warn("Erro ao buscar configs no Firebase:", e);
      }
    }
    
    if (Object.keys(planConfigs).length === 0) {
      planConfigs = getLocalStorage("planConfigs") || INITIAL_MOCK_DATA.planConfigs || {};
    }
    
    const plans = Object.values(planConfigs);
    if (plans.length === 0) return 12.5;
    
    const totalPrice = plans.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    const totalXp = plans.reduce((sum, p) => sum + (parseFloat(p.xpBonus) || 0), 0);
    
    if (totalPrice === 0) return 12.5;
    
    const avgPrice = totalPrice / plans.length;
    const avgXp = totalXp / plans.length;
    
    const calculatedRatio = (avgXp / avgPrice) * 3.3;
    return Math.max(5.0, Math.min(30.0, parseFloat(calculatedRatio.toFixed(2))));
  },

  // --- MÓDULO 7: BOLÃO ---
  getMonitoredLeagues: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "monitoredLeagues"));
        const list = [];
        querySnapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.error("Erro ao buscar monitoredLeagues no Firestore:", e);
      }
    }
    return getLocalStorage("monitoredLeagues") || [];
  },

  // CORRIGIDO: usa upsert — adiciona a liga se ela ainda não existir no localStorage e sincroniza com Firestore se real
  toggleLeague: async (leagueId, active) => {
    const leagues = getLocalStorage("monitoredLeagues") || [];
    const exists = leagues.find(l => l.id === leagueId);
    let updated;
    if (exists) {
      // Atualiza existente
      updated = leagues.map(l => l.id === leagueId ? { ...l, active } : l);
    } else {
      // Cria novo registro para a liga
      updated = [...leagues, { id: leagueId, active }];
    }
    setLocalStorage("monitoredLeagues", updated);

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "monitoredLeagues", leagueId);
        await setDoc(docRef, { active }, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar monitoredLeagues no Firestore:", e);
      }
    }
    return true;
  },

  getBolaoGames: async (status = null) => {
    let games = [];
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "bolaoGames"));
        querySnapshot.forEach(docSnap => {
          games.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Cache local para consultas rápidas ou offline
        if (games.length > 0) {
          setLocalStorage("bolaoGames", games);
        }
      } catch (e) {
        console.error("Erro ao buscar bolaoGames no Firebase:", e);
        games = getLocalStorage("bolaoGames") || [];
      }
    } else {
      games = getLocalStorage("bolaoGames") || [];
    }

    if (status) return games.filter(g => g.status === status);
    // Ordena: ao vivo primeiro, depois agendados, encerrados por último
    return games.sort((a, b) => {
      const order = { live: 0, scheduled: 1, finished: 2 };
      const oa = order[a.status] ?? 1;
      const ob = order[b.status] ?? 1;
      if (oa !== ob) return oa - ob;
      
      const timeA = a.startTimestamp ? new Date(a.startTimestamp.seconds ? a.startTimestamp.seconds * 1000 : a.startTimestamp).getTime() : new Date(`${a.date}T${a.time || "00:00"}:00-03:00`).getTime();
      const timeB = b.startTimestamp ? new Date(b.startTimestamp.seconds ? b.startTimestamp.seconds * 1000 : b.startTimestamp).getTime() : new Date(`${b.date}T${b.time || "00:00"}:00-03:00`).getTime();
      return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    });
  },
  submitPalpite: async (gameId, userUid, userName, scoreHome, scoreAway) => {
    // Validação de segurança: apostas só abertas até 5 minutos antes do jogo começar
    let game = null;
    if (isRealFirebase()) {
      try {
        const gameRef = doc(db, "bolaoGames", gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
          game = gameSnap.data();
        }
      } catch (e) {
        console.error("Erro ao obter jogo no Firebase:", e);
      }
    } else {
      const games = getLocalStorage("bolaoGames") || [];
      game = games.find(g => g.id === gameId);
    }

    if (game) {
      if (game.status === "finished" || game.status === "live") {
        throw new Error("Apostas encerradas para este jogo.");
      }
      const matchStartTime = game.startTimestamp 
        ? new Date(game.startTimestamp.seconds ? game.startTimestamp.seconds * 1000 : game.startTimestamp)
        : new Date(`${game.date}T${game.time || "00:00"}:00-03:00`);
      const now = new Date();
      const timeDiffMs = matchStartTime.getTime() - now.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;
      if (isNaN(timeDiffMs) || timeDiffMs <= fiveMinutesInMs) {
        throw new Error("Apostas bloqueadas. O jogo começa em menos de 5 minutos!");
      }
    }

    const newBet = {
      id: `bet_${gameId}_${userUid}`,
      matchId: gameId,
      userUid,
      userName,
      predA: parseInt(scoreHome),
      predB: parseInt(scoreAway),
      points: 0,
      isWinner: false,
      createdAt: new Date().toISOString()
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "bets", newBet.id), newBet);
        return newBet;
      } catch (e) {
        console.warn("Firestore error saving bet, falling back to mock", e);
      }
    }

    const bets = getLocalStorage("bets") || [];
    const filtered = bets.filter(b => !(b.matchId === gameId && b.userUid === userUid));
    filtered.push(newBet);
    setLocalStorage("bets", filtered);
    return newBet;
  },

  // Rotina de limpeza automática para manter palpites e resultados encerrados por no máximo 60 dias
  pruneOldBetsAndGames: async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();

    console.log(`[dbService] Iniciando limpeza de jogos e palpites anteriores a: ${sixtyDaysAgoStr}`);

    if (isRealFirebase()) {
      try {
        // 1. Busca e remove jogos encerrados há mais de 60 dias
        const gamesRef = collection(db, "bolaoGames");
        const qGames = query(gamesRef, where("status", "==", "finished"), where("date", "<", sixtyDaysAgoStr));
        const gameSnaps = await getDocs(qGames);
        
        const deletedGameIds = [];
        const batch = writeBatch(db);
        let batchCount = 0;

        gameSnaps.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          deletedGameIds.push(docSnap.id);
          batchCount++;
        });

        // 2. Busca e remove palpites criados há mais de 60 dias
        const betsRef = collection(db, "bets");
        const qBets = query(betsRef, where("createdAt", "<", sixtyDaysAgoIso));
        const betSnaps = await getDocs(qBets);

        betSnaps.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          batchCount++;
        });

        if (batchCount > 0) {
          await batch.commit();
        }
        console.log(`[dbService] Firebase: removidos ${deletedGameIds.length} jogos e palpites com mais de 60 dias.`);
      } catch (e) {
        console.warn("Erro no Firestore durante a limpeza, caindo para Mock", e);
      }
    }

    // Limpeza no LocalStorage Mock
    try {
      let games = getLocalStorage("bolaoGames") || [];
      let bets = getLocalStorage("bets") || [];

      const initialGamesCount = games.length;
      const initialBetsCount = bets.length;

      // Mantém apenas jogos que não estão encerrados ou que têm menos de 60 dias
      games = games.filter(g => {
        if (g.status === "finished") {
          return g.date >= sixtyDaysAgoStr;
        }
        return true;
      });

      // Mantém palpites que têm menos de 60 dias e pertencem a jogos ainda ativos
      const activeGameIds = new Set(games.map(g => g.id));
      bets = bets.filter(b => {
        if (b.createdAt) {
          return b.createdAt >= sixtyDaysAgoIso;
        }
        return activeGameIds.has(b.matchId);
      });

      if (games.length !== initialGamesCount) {
        setLocalStorage("bolaoGames", games);
      }
      if (bets.length !== initialBetsCount) {
        setLocalStorage("bets", bets);
      }

      console.log(`[dbService] Mock: removidos ${initialGamesCount - games.length} jogos e ${initialBetsCount - bets.length} palpites.`);
    } catch (e) {
      console.warn("Limpeza mock falhou:", e);
    }
  },

  // MELHORADO: sincroniza APENAS jogos da API real; mescla com jogos existentes sem descartar agendados antigos
  syncGamesFromApi: async () => {
    // Roda a rotina de limpeza de 60 dias antes de sincronizar novos jogos
    await dbService.pruneOldBetsAndGames();

    const { sportsApi, hasApiKey } = await import("../services/sportsApi");

    if (!hasApiKey()) {
      throw new Error("NO_API_KEY");
    }

    const leagues = getLocalStorage("monitoredLeagues") || [];
    const activeLeagues = leagues.filter(l => l.active);

    if (activeLeagues.length === 0) {
      throw new Error("NO_ACTIVE_LEAGUES");
    }

    // Carrega jogos salvos localmente
    let savedGames = getLocalStorage("bolaoGames") || [];

    // Se for Firebase real, tenta buscar os jogos mais recentes do Firestore para mesclar de forma consistente
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "bolaoGames"));
        const fbGames = [];
        querySnapshot.forEach(docSnap => {
          fbGames.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (fbGames.length > 0) {
          savedGames = fbGames;
        }
      } catch (e) {
        console.warn("Erro ao buscar bolaoGames do Firestore para mesclagem:", e);
      }
    }

    // Mapeia por ID para evitar duplicatas e preservar histórico
    const gamesMap = {};
    for (const g of savedGames) {
      // Garante que o startTimestamp seja mantido como string ISO se for objeto Date do Firestore
      const startTimestampStr = g.startTimestamp && typeof g.startTimestamp === 'object' && g.startTimestamp.toDate
        ? g.startTimestamp.toDate().toISOString()
        : (g.startTimestamp?.seconds ? new Date(g.startTimestamp.seconds * 1000).toISOString() : g.startTimestamp);

      gamesMap[g.id] = {
        ...g,
        startTimestamp: startTimestampStr
      };
    }

    // Mescla com os jogos recebidos da API ESPN
    for (const league of activeLeagues) {
      const fixtures = await sportsApi.fetchFixtures(league.id);
      for (const fix of fixtures) {
        const existing = gamesMap[fix.id];
        if (existing) {
          // Atualiza dados mantendo a data de criação.
          // Só atualiza resultados/placar se o jogo existente não estiver encerrado manualmente ou se o novo status for finished
          if (existing.status !== "finished" || fix.status === "finished") {
            gamesMap[fix.id] = {
              ...existing,
              ...fix,
              status: fix.status,
              realScoreHome: fix.realScoreHome !== null ? fix.realScoreHome : existing.realScoreHome,
              realScoreAway: fix.realScoreAway !== null ? fix.realScoreAway : existing.realScoreAway,
              minute: fix.minute,
            };
          }
        } else {
          // Insere novo jogo
          gamesMap[fix.id] = {
            ...fix,
            createdAt: new Date().toISOString()
          };
        }
      }
    }

    const merged = Object.values(gamesMap);
    setLocalStorage("bolaoGames", merged);

    if (isRealFirebase()) {
      try {
        const batch = writeBatch(db);
        for (const g of merged) {
          const gameRef = doc(db, "bolaoGames", g.id);
          // Converter startTimestamp (string ISO) para objeto Date para salvar como Timestamp no Firestore
          const gameToSave = {
            ...g,
            startTimestamp: g.startTimestamp ? new Date(g.startTimestamp) : null
          };
          batch.set(gameRef, gameToSave, { merge: true });
        }
        await batch.commit();
        console.log(`[dbService] Sincronizados ${merged.length} jogos no Firestore.`);
      } catch (e) {
        console.error("Erro ao salvar jogos sincronizados no Firebase:", e);
      }
    }

    return merged;
  },

  // Atualiza placares ao vivo dos jogos em andamento (polling)
  refreshLiveScores: async () => {
    const { sportsApi, hasApiKey } = await import("../services/sportsApi");
    if (!hasApiKey()) return [];

    // 1. Obter ligas ativas
    let leagues = [];
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "monitoredLeagues"));
        querySnapshot.forEach(docSnap => {
          leagues.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (e) {
        console.error("Erro ao buscar monitoredLeagues no Firebase:", e);
      }
    } else {
      leagues = getLocalStorage("monitoredLeagues") || [];
    }

    const activeIds = leagues.filter(l => l.active).map(l => l.id);
    if (!activeIds.length) return [];

    // 2. Buscar jogos ao vivo da ESPN
    const liveMatches = await sportsApi.fetchLiveMatches(activeIds);

    // 3. Buscar jogos do banco
    let games = [];
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "bolaoGames"));
        querySnapshot.forEach(docSnap => {
          games.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (e) {
        console.error("Erro ao buscar bolaoGames no Firebase:", e);
      }
    } else {
      games = getLocalStorage("bolaoGames") || [];
    }

    let changed = false;
    const updatedGames = [...games];

    for (let i = 0; i < updatedGames.length; i++) {
      const g = updatedGames[i];
      if (g.status === "finished") continue;

      const live = liveMatches.find(lm => String(lm.apiMatchId) === String(g.apiMatchId));

      if (live) {
        // Jogo está rolando ao vivo!
        if (g.status !== "live" || g.realScoreHome !== live.scoreHome || g.realScoreAway !== live.scoreAway || g.minute !== live.minute) {
          g.status = "live";
          g.realScoreHome = live.scoreHome;
          g.realScoreAway = live.scoreAway;
          g.minute = live.minute;
          changed = true;
          
          if (isRealFirebase()) {
            try {
              await updateDoc(doc(db, "bolaoGames", g.id), {
                status: "live",
                realScoreHome: live.scoreHome,
                realScoreAway: live.scoreAway,
                minute: live.minute
              });
            } catch (e) {
              console.error("Erro ao atualizar jogo para AO VIVO no Firebase:", e);
            }
          }
        }
      } else {
        // Jogo não está nos eventos ao vivo da ESPN. Verificamos se passou do kickoff
        const matchStartTime = new Date(`${g.date}T${g.time || "00:00"}:00-03:00`);
        const now = new Date();
        const isPastKickoff = now >= matchStartTime;

        if (g.status === "live" || isPastKickoff) {
          // Vamos checar o resumo individual do jogo para atualizações em tempo real
          const result = await sportsApi.fetchMatchResult(g.apiMatchId, g.leagueId);
          if (result) {
            if (result.status === "finished") {
              // O jogo terminou! Processar resultado automaticamente
              await dbService.processGameResult(g.id, result.scoreHome, result.scoreAway);
              changed = true;

              // Recarregar os dados do jogo atualizados
              if (isRealFirebase()) {
                try {
                  const snap = await getDoc(doc(db, "bolaoGames", g.id));
                  if (snap.exists()) {
                    updatedGames[i] = { id: snap.id, ...snap.data() };
                  }
                } catch (e) {
                  console.error(e);
                }
              } else {
                const freshGames = getLocalStorage("bolaoGames") || [];
                const freshG = freshGames.find(fg => fg.id === g.id);
                if (freshG) {
                  updatedGames[i] = freshG;
                }
              }
            } else if (result.status === "live") {
              // Jogo está rolando (talvez não constava no feed ao vivo geral)
              if (g.status !== "live" || g.realScoreHome !== result.scoreHome || g.realScoreAway !== result.scoreAway || g.minute !== result.minute) {
                g.status = "live";
                g.realScoreHome = result.scoreHome;
                g.realScoreAway = result.scoreAway;
                g.minute = result.minute || "Ao vivo";
                changed = true;
                if (isRealFirebase()) {
                  try {
                    await updateDoc(doc(db, "bolaoGames", g.id), {
                      status: "live",
                      realScoreHome: result.scoreHome,
                      realScoreAway: result.scoreAway,
                      minute: result.minute || "Ao vivo"
                    });
                  } catch (e) {
                    console.error("Erro ao atualizar jogo para AO VIVO no Firebase:", e);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (changed) {
      setLocalStorage("bolaoGames", updatedGames);
    }

    return updatedGames;
  },

  processGameResult: async (gameId, realScoreHome, realScoreAway) => {
    let games = [];
    let bets = [];
    let users = {};
    let bettingLeaderboard = [];

    if (isRealFirebase()) {
      try {
        // --- Firebase Real ---
        // 1. Atualizar partida
        const gameRef = doc(db, "bolaoGames", gameId);
        const gameSnap = await getDoc(gameRef);
        let gameObj = null;
        if (gameSnap.exists()) {
          gameObj = gameSnap.data();
          await updateDoc(gameRef, {
            status: "finished",
            realScoreHome,
            realScoreAway
          });
        }

        // 2. Buscar palpites
        const qBets = query(collection(db, "bets"), where("matchId", "==", gameId));
        const querySnapshot = await getDocs(qBets);
        const betsToProcess = [];
        querySnapshot.forEach(docSnap => {
          betsToProcess.push({ id: docSnap.id, ...docSnap.data() });
        });

        const winners = [];

        // 3. Processar cada palpite
        for (const bet of betsToProcess) {
          const isExact = bet.predA === realScoreHome && bet.predB === realScoreAway;
          const isWinner = (realScoreHome > realScoreAway && bet.predA > bet.predB) ||
                           (realScoreHome < realScoreAway && bet.predA < bet.predB) ||
                           (realScoreHome === realScoreAway && bet.predA === bet.predB);

          const isTrendAndGD = !isExact && isWinner && (bet.predA - bet.predB === realScoreHome - realScoreAway);
          const isWinnerOnly = !isExact && isWinner && (bet.predA - bet.predB !== realScoreHome - realScoreAway);

          // Carrega usuário para calcular nível e somar pontos
          const userRef = doc(db, "users", bet.userUid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userObj = userSnap.data();
            const userLevelInfo = dbService.getUserLevel(userObj);
            const multiplier = userLevelInfo.pointsMultiplier || 1.0;

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

            // Atualiza palpite
            const betRef = doc(db, "bets", bet.id);
            await updateDoc(betRef, {
              points,
              isWinner: won
            });
            bet.points = points;
            bet.isWinner = won;

            if (won) {
              winners.push(bet);
              // Atualiza usuário
              await updateDoc(userRef, {
                xp: (userObj.xp || 0) + xpGained,
                coins: (userObj.coins || 0) + coinsGained
              });

              // Atualiza ranking mensal
              const lbRef = doc(db, "betting_leaderboard", bet.userUid);
              const lbSnap = await getDoc(lbRef);
              if (lbSnap.exists()) {
                const lbData = lbSnap.data();
                await updateDoc(lbRef, {
                  correctGuesses: lbData.correctGuesses + (isExact ? 1 : 0),
                  points: lbData.points + points
                });
              } else {
                await setDoc(lbRef, {
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

        // 4. Criação de postagem oficial no feed (Firebase)
        const homeTeamName = gameObj ? gameObj.homeTeam : "Time Casa";
        const awayTeamName = gameObj ? gameObj.awayTeam : "Time Fora";
        const winnerNames = winners.length > 0 ? winners.map(w => w.userName).join(", ") : "Nenhum jogador";
        await addDoc(collection(db, "posts"), {
          authorUid: auth.currentUser?.uid || "system",
          authorName: "Clubber Bolão",
          authorAvatar: null,
          content: `Fim de jogo! ⚽ ${homeTeamName} ${realScoreHome} x ${realScoreAway} ${awayTeamName}. Parabéns aos ganhadores da rodada que pontuaram: ${winnerNames}! 🎉`,
          imageUrl: null,
          likes: [],
          commentsCount: 0,
          createdAt: new Date().toISOString(),
          isOfficial: true
        });

        return winners;

      } catch (e) {
        console.error("Erro ao processar resultado no Firebase:", e);
        throw e;
      }
    }

    // --- Modo Mock (LocalStorage) ---
    games = getLocalStorage("bolaoGames") || [];
    const targetGame = games.find(g => g.id === gameId);
    const updatedGames = games.map(g => g.id === gameId ? { ...g, status: "finished", realScoreHome, realScoreAway } : g);
    setLocalStorage("bolaoGames", updatedGames);

    bets = getLocalStorage("bets") || [];
    users = getLocalStorage("users") || {};
    bettingLeaderboard = getLocalStorage("betting_leaderboard") || [];

    const winners = [];
    const updatedBets = bets.map(bet => {
      if (bet.matchId === gameId) {
        const isExact = bet.predA === realScoreHome && bet.predB === realScoreAway;
        const isWinner = (realScoreHome > realScoreAway && bet.predA > bet.predB) ||
                         (realScoreHome < realScoreAway && bet.predA < bet.predB) ||
                         (realScoreHome === realScoreAway && bet.predA === bet.predB);

        const userKey = users[bet.userUid] ? bet.userUid : "ricardo_uid";
        const userObj = users[userKey];
        
        // Bônus do nível por tempo
        const userLevelInfo = dbService.getUserLevel(userObj);
        const levelBonus = userLevelInfo.bonus;

        let xpGained = 0;
        let coinsGained = 0;

        if (isExact) {
          xpGained = 300;
          coinsGained = 100;
          bet.points = levelBonus;
          bet.isWinner = true;
        } else if (isWinner) {
          xpGained = 150;
          coinsGained = 50;
          bet.points = Math.max(1, Math.floor(levelBonus / 2));
          bet.isWinner = true;
        } else {
          bet.points = 0;
          bet.isWinner = false;
        }

        if (userObj && (isExact || isWinner)) {
          winners.push(bet);
          userObj.xp = (userObj.xp || 0) + xpGained;
          userObj.coins = (userObj.coins || 0) + coinsGained;
          users[userKey] = userObj;
          
          let found = false;
          const updatedLeaderboard = bettingLeaderboard.map(lb => {
            if (lb.userUid === bet.userUid) {
              lb.correctGuesses += isExact ? 1 : 0;
              lb.points += bet.points;
              found = true;
            }
            return lb;
          });

          if (!found) {
            updatedLeaderboard.push({
              userUid: bet.userUid,
              name: bet.userName,
              correctGuesses: isExact ? 1 : 0,
              points: bet.points,
              avatar: userObj.avatarUrl || null
            });
          }
          setLocalStorage("betting_leaderboard", updatedLeaderboard);
        }
      }
      return bet;
    });

    setLocalStorage("bets", updatedBets);
    setLocalStorage("users", users);

    // Cria postagem oficial no feed (Mock)
    const posts = getLocalStorage("posts") || [];
    const homeTeamName = targetGame ? targetGame.homeTeam : "Time Casa";
    const awayTeamName = targetGame ? targetGame.awayTeam : "Time Fora";
    const winnerNames = winners.length > 0 ? winners.map(w => w.userName).join(", ") : "Nenhum jogador";
    const newPost = {
      id: "post_bolao_" + Date.now(),
      authorUid: auth.currentUser?.uid || "system",
      authorName: "Clubber Bolão",
      authorAvatar: null,
      content: `Fim de jogo! ⚽ ${homeTeamName} ${realScoreHome} x ${realScoreAway} ${awayTeamName}. Parabéns aos ganhadores da rodada que pontuaram: ${winnerNames}! 🎉`,
      imageUrl: null,
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isOfficial: true
    };
    posts.unshift(newPost);
    setLocalStorage("posts", posts);

    return winners;
  },



  // --- MÓDULO 8: SISTEMA DE NÍVEIS ---
  getUserLevel: (user) => {
    if (!user || !user.subscriptionStartDate) {
      return { nivel: 1, nome: "Novato", badge: "🦶", bonus: 3, progress: 0, meses: 0, mesesParaProximo: 0, proximoNome: "" };
    }
    const config = calcularNivel(user.subscriptionStartDate);
    const meses = calcularDiferencaEmMeses(user.subscriptionStartDate);
    const mesesParaProximo = getMesesParaProximoNivel(config.level, user.subscriptionStartDate);
    
    const nextConfig = NIVEL_CONFIG.find(c => c.level === config.level + 1);
    const proximoNome = nextConfig ? nextConfig.name : "";

    // Calcula porcentagem do progresso do nível atual
    let progress = 0;
    if (config.level === 8) {
      progress = 100;
    } else {
      const range = config.monthsMax - config.monthsMin;
      const progressInMonths = meses - config.monthsMin;
      progress = (progressInMonths / range) * 100;
    }

    return {
      nivel: config.level,
      nome: config.name,
      badge: config.badge,
      bonus: config.bonus,
      meses,
      mesesParaProximo,
      proximoNome,
      progress: Math.min(100, Math.max(0, progress))
    };
  },

  // --- MÓDULO 9: CONVERSÃO XP EM COINS ---
  convertXpToCoins: async (uid, xpAmount) => {
    if (xpAmount < 10000 || xpAmount % 10000 !== 0) {
      throw new Error("Mínimo de 10.000 XP em múltiplos de 10.000 para converter.");
    }

    const coinsEarned = (xpAmount / 10000) * 100;
    const dateStr = new Date().toISOString().split("T")[0];
    const recordId = "conv_" + Date.now();

    if (isRealFirebase()) {
      try {
        const userRef = doc(db, "users", uid);
        const recordRef = doc(db, "conversionHistory", recordId);

        let finalXp = 0;
        let finalCoins = 0;

        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) {
            throw new Error("Usuário não encontrado.");
          }
          const userData = userSnap.data();
          if ((userData.xp || 0) < xpAmount) {
            throw new Error("XP insuficiente para a conversão.");
          }

          finalXp = userData.xp - xpAmount;
          finalCoins = (userData.coins || 0) + coinsEarned;

          transaction.update(userRef, {
            xp: finalXp,
            coins: finalCoins
          });

          transaction.set(recordRef, {
            userUid: uid,
            date: dateStr,
            xpDeducted: xpAmount,
            coinsAdded: coinsEarned
          });
        });

        return { xp: finalXp, coins: finalCoins, record: { id: recordId, date: dateStr, xpDeducted: xpAmount, coinsAdded: coinsEarned } };
      } catch (e) {
        console.error("Erro na conversão de XP com Firestore transaction:", e);
        throw e;
      }
    }

    // Mock
    const users = getLocalStorage("users") || {};
    const user = users[uid] || users["ricardo_uid"];
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.xp < xpAmount) throw new Error("XP insuficiente para a conversão.");

    user.xp -= xpAmount;
    user.coins = (user.coins || 0) + coinsEarned;

    const conversionHistory = getLocalStorage("conversionHistory") || [];
    const record = {
      id: recordId,
      date: dateStr,
      xpDeducted: xpAmount,
      coinsAdded: coinsEarned
    };
    conversionHistory.unshift(record);

    setLocalStorage("users", users);
    setLocalStorage("conversionHistory", conversionHistory);

    return { xp: user.xp, coins: user.coins, record };
  },

  getConversionHistory: async (uid) => {
    if (isRealFirebase()) {
      try {
        const q = query(
          collection(db, "conversionHistory"),
          where("userUid", "==", uid),
          orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (e) {
        // Se der erro de index por conta do orderBy, tenta sem orderBy e ordena em memória
        try {
          const q = query(
            collection(db, "conversionHistory"),
            where("userUid", "==", uid)
          );
          const querySnapshot = await getDocs(q);
          const list = [];
          querySnapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          return list.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (err) {
          console.warn("Firestore error getting conversion history, falling back to mock", err);
        }
      }
    }
    return getLocalStorage("conversionHistory") || [];
  },

  getAllBets: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "bets"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (e) {
        console.warn("Firestore error reading bets, falling back to mock", e);
      }
    }
    return getLocalStorage("bets") || [];
  },

  updateUserSubscriptionDate: async (uid, dateStr) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, { subscriptionStartDate: dateStr });
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() : null;
      } catch (e) {
        console.error("Erro ao atualizar data de assinatura no Firebase:", e);
        throw e;
      }
    }
    const users = getLocalStorage("users") || {};
    let userKey = users[uid] ? uid : "ricardo_uid";
    if (users[userKey]) {
      users[userKey].subscriptionStartDate = dateStr;
      setLocalStorage("users", users);
      return users[userKey];
    }
    return null;
  },

  subscribeToPlan: async (uid, planName) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        const data = {
          plan: planName,
          subscriptionStartDate: new Date().toISOString()
        };
        await updateDoc(docRef, data);
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() : null;
      } catch (e) {
        console.error("Erro ao assinar plano no Firebase:", e);
        throw e;
      }
    }
    const users = getLocalStorage("users") || {};
    let userKey = users[uid] ? uid : "ricardo_uid";
    if (users[userKey]) {
      users[userKey].plan = planName;
      users[userKey].subscriptionStartDate = new Date().toISOString();
      setLocalStorage("users", users);
      return users[userKey];
    }
    return null;
  },

  requestPlanSubscription: async (uid, userName, userEmail, planName, price, xpBonus) => {
    const reqId = `req_${uid}_${Date.now()}`;
    const newRequest = {
      id: reqId,
      userId: uid,
      userName: userName,
      userEmail: userEmail,
      planName: planName,
      price: price,
      xpBonus: xpBonus,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "planRequests", reqId);
        await setDoc(docRef, newRequest);
        return newRequest;
      } catch (e) {
        console.error("Erro ao criar solicitação de plano no Firestore:", e);
        throw e;
      }
    }

    const requests = getLocalStorage("planRequests") || [];
    requests.push(newRequest);
    setLocalStorage("planRequests", requests);
    return newRequest;
  },

  getPlanRequests: async () => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "planRequests"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        return list;
      } catch (e) {
        console.error("Erro ao buscar solicitações no Firebase:", e);
        return [];
      }
    }
    return getLocalStorage("planRequests") || [];
  },

  listenToPlanRequests: (callback) => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "planRequests"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot) => {
          const list = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          callback(list);
        }, (error) => {
          console.error("Erro no onSnapshot das solicitações de planos:", error);
        });
      } catch (e) {
        console.error("Erro ao escutar solicitações de planos no Firebase:", e);
      }
    }
    return null;
  },

  approvePlanSubscription: async (requestId) => {
    let requestObj = null;

    if (isRealFirebase()) {
      try {
        const reqRef = doc(db, "planRequests", requestId);
        const reqSnap = await getDoc(reqRef);
        if (reqSnap.exists()) {
          requestObj = reqSnap.data();
          
          // 1. Atualiza o status da solicitação
          await updateDoc(reqRef, { status: "approved" });

          // 2. Assina o plano do usuário (usa o método já existente subscribeToPlan)
          await dbService.subscribeToPlan(requestObj.userId, requestObj.planName);

          // 3. Credita o bônus de XP se houver
          if (requestObj.xpBonus > 0) {
            await dbService.updateUserXP(requestObj.userId, requestObj.xpBonus, Math.floor(requestObj.xpBonus / 10));
          }
        }
      } catch (e) {
        console.error("Erro ao aprovar solicitação no Firebase:", e);
        throw e;
      }
    } else {
      const requests = getLocalStorage("planRequests") || [];
      const idx = requests.findIndex(r => r.id === requestId);
      if (idx !== -1) {
        requests[idx].status = "approved";
        requestObj = requests[idx];
        setLocalStorage("planRequests", requests);
        
        // Assina plano localmente
        await dbService.subscribeToPlan(requestObj.userId, requestObj.planName);
        
        // Credita bônus localmente
        if (requestObj.xpBonus > 0) {
          await dbService.updateUserXP(requestObj.userId, requestObj.xpBonus, Math.floor(requestObj.xpBonus / 10));
        }
      }
    }
  },

  rejectPlanSubscription: async (requestId) => {
    if (isRealFirebase()) {
      try {
        const reqRef = doc(db, "planRequests", requestId);
        await updateDoc(reqRef, { status: "rejected" });
      } catch (e) {
        console.error("Erro ao recusar solicitação no Firebase:", e);
        throw e;
      }
    } else {
      const requests = getLocalStorage("planRequests") || [];
      const idx = requests.findIndex(r => r.id === requestId);
      if (idx !== -1) {
        requests[idx].status = "rejected";
        setLocalStorage("planRequests", requests);
      }
    }
  },

  getPlanConfigs: async () => {
    let configs = null;
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "configs", "plans");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          configs = snap.data();
        }
      } catch (e) {
        console.error("Erro ao buscar planConfigs no Firebase:", e);
      }
    }
    if (!configs) {
      configs = getLocalStorage("planConfigs");
    }
    if (!configs) {
      configs = INITIAL_MOCK_DATA.planConfigs;
      setLocalStorage("planConfigs", configs);
    } else {
      // Garantir que os campos ausentes (como benefits ou xpBonus) sejam preenchidos
      const defaultConfigs = INITIAL_MOCK_DATA.planConfigs;
      let updated = false;
      for (const planName of Object.keys(defaultConfigs)) {
        if (!configs[planName]) {
          configs[planName] = { ...defaultConfigs[planName] };
          updated = true;
        } else {
          if (!configs[planName].benefits) {
            configs[planName].benefits = [...defaultConfigs[planName].benefits];
            updated = true;
          }
          if (configs[planName].xpBonus === undefined) {
            configs[planName].xpBonus = defaultConfigs[planName].xpBonus;
            updated = true;
          }
        }
      }
      if (updated && !isRealFirebase()) {
        setLocalStorage("planConfigs", configs);
      }
    }
    return configs;
  },

  updatePlanConfigs: async (configs) => {
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "configs", "plans");
        await setDoc(docRef, configs, { merge: true });
        return configs;
      } catch (e) {
        console.error("Erro ao salvar planConfigs no Firebase:", e);
        throw e;
      }
    }
    setLocalStorage("planConfigs", configs);
    return configs;
  },

  listenToBolaoGames: (callback) => {
    if (isRealFirebase()) {
      const q = query(collection(db, "bolaoGames"));
      return onSnapshot(q, (snapshot) => {
        const games = [];
        snapshot.forEach((docSnap) => {
          games.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(games);
      }, (error) => {
        console.error("Erro no onSnapshot do bolaoGames:", error);
      });
    }
    return null;
  },

  createClient: async (clientData) => {
    const users = getLocalStorage("users") || {};
    const uid = "client_" + Date.now();
    const newClient = {
      uid,
      role: "client",
      xp: 0,
      coins: 0,
      subscriptionStartDate: new Date().toISOString(),
      avatarUrl: clientData.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60",
      plan: null,
      ...clientData
    };
    users[uid] = newClient;
    setLocalStorage("users", users);

    // Atualiza leaderboard
    const leaderboard = getLocalStorage("leaderboard") || [];
    leaderboard.push({ name: newClient.name, xp: newClient.xp, avatar: newClient.avatarUrl });
    setLocalStorage("leaderboard", leaderboard);

    // Salva no Firestore se real Firebase ativo
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, newClient);

        // Adiciona ao leaderboard de XP no Firestore
        await setDoc(doc(db, "leaderboard", uid), {
          name: newClient.name,
          xp: newClient.xp,
          avatar: newClient.avatarUrl
        });
      } catch (e) {
        console.error("Erro ao cadastrar cliente no Firestore:", e);
      }
    }

    return newClient;
  },

  updateClient: async (uid, clientData) => {
    const users = getLocalStorage("users") || {};
    if (users[uid]) {
      const oldAvatar = users[uid].avatarUrl;
      const oldName = users[uid].name;

      users[uid] = { ...users[uid], ...clientData };
      setLocalStorage("users", users);

      // Atualiza leaderboard se nome ou foto mudarem
      if (oldName !== users[uid].name || oldAvatar !== users[uid].avatarUrl) {
        const leaderboard = getLocalStorage("leaderboard") || [];
        const updatedL = leaderboard.map(l => l.name === oldName ? { ...l, name: users[uid].name, avatar: users[uid].avatarUrl } : l);
        setLocalStorage("leaderboard", updatedL);

        const bettingLeaderboard = getLocalStorage("betting_leaderboard") || [];
        const updatedBL = bettingLeaderboard.map(lb => lb.userUid === uid ? { ...lb, name: users[uid].name, avatar: users[uid].avatarUrl } : lb);
        setLocalStorage("betting_leaderboard", updatedBL);
      }

      // Salva no Firestore se real Firebase ativo
      if (isRealFirebase()) {
        try {
          const docRef = doc(db, "users", uid);
          await setDoc(docRef, clientData, { merge: true });

          // Se o nome ou avatar mudarem, atualiza no leaderboard do Firestore também
          if (oldName !== clientData.name || oldAvatar !== clientData.avatarUrl) {
            const leaderboardRef = doc(db, "leaderboard", uid);
            const leaderboardSnap = await getDoc(leaderboardRef);
            if (leaderboardSnap.exists()) {
              await setDoc(leaderboardRef, {
                name: clientData.name !== undefined ? clientData.name : oldName,
                avatar: clientData.avatarUrl !== undefined ? clientData.avatarUrl : oldAvatar
              }, { merge: true });
            }
          }
        } catch (e) {
          console.error("Erro ao atualizar cliente no Firestore:", e);
        }
      }

      return users[uid];
    }

    // Se o cliente não existir no LocalStorage local, mas estiver usando Firebase Real,
    // atualizamos diretamente no Firestore.
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const oldData = docSnap.data();
          const updatedData = { ...oldData, ...clientData };
          await setDoc(docRef, clientData, { merge: true });

          // Atualiza leaderboard do Firestore se mudou nome/avatar
          if (oldData.name !== updatedData.name || oldData.avatarUrl !== updatedData.avatarUrl) {
            await setDoc(doc(db, "leaderboard", uid), {
              name: updatedData.name,
              avatar: updatedData.avatarUrl
            }, { merge: true });
          }

          // Atualiza localmente para manter sincronizado
          const users = getLocalStorage("users") || {};
          users[uid] = updatedData;
          setLocalStorage("users", users);

          return updatedData;
        }
      } catch (e) {
        console.error("Erro ao atualizar cliente externo no Firestore:", e);
      }
    }

    return null;
  },

  listenToClients: (callback) => {
    if (isRealFirebase()) {
      try {
        const q = query(collection(db, "users"), where("role", "==", "client"));
        return onSnapshot(q, (snapshot) => {
          const list = [];
          snapshot.forEach(docSnap => {
            list.push({ uid: docSnap.id, ...docSnap.data() });
          });
          callback(list);
        }, (error) => {
          console.error("Erro no onSnapshot dos clientes:", error);
        });
      } catch (e) {
        console.error("Erro ao escutar clientes no Firebase:", e);
      }
    }
    return null;
  },

  uploadImage: async (base64Data, userUid) => {
    const id = "img_" + Date.now();
    const docData = {
      id,
      url: base64Data,
      uploadedBy: userUid || "anonymous",
      createdAt: new Date().toISOString()
    };

    if (isRealFirebase()) {
      try {
        const { getFirestore, doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "uploadedImages", id), docData);
      } catch (e) {
        console.warn("Firestore error saving image", e);
      }
    }

    // Sincroniza localmente
    const images = getLocalStorage("uploadedImages") || [];
    images.push(docData);
    setLocalStorage("uploadedImages", images);

    return docData.url;
  },

  register: async (name, email, password, phone) => {
    const emailStr = String(email).trim().toLowerCase();
    
    // Verifica se e-mail já existe localmente
    const users = getLocalStorage("users") || {};
    const exists = Object.values(users).some(u => String(u.email).toLowerCase() === emailStr);
    if (exists) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    let uid = "client_" + Date.now();
    const newUser = {
      uid,
      name,
      email: emailStr,
      password,
      phone: phone || "",
      role: "client",
      xp: 0,
      coins: 0,
      plan: null,
      unitId: null,
      subscriptionStartDate: null,
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60",
      createdAt: new Date().toISOString()
    };

    // Salva localmente
    users[uid] = newUser;
    setLocalStorage("users", users);

    // Atualiza leaderboard localmente
    const leaderboard = getLocalStorage("leaderboard") || [];
    leaderboard.push({ name: newUser.name, xp: newUser.xp, avatar: newUser.avatarUrl });
    setLocalStorage("leaderboard", leaderboard);

    // Se Firebase real estiver ativo, salva no Firestore e opcionalmente no Auth
    if (isRealFirebase()) {
      try {
        try {
          const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
          const userCredential = await createUserWithEmailAndPassword(auth, emailStr, password);
          newUser.uid = userCredential.user.uid;
          uid = userCredential.user.uid;
          await updateProfile(userCredential.user, { displayName: name });
        } catch (authErr) {
          console.warn("Firebase Auth registration skipped or failed, using custom Firestore uid:", authErr.message);
        }

        // Salva coleção "users" do Firestore
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, {
          uid,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone || "",
          role: newUser.role,
          xp: newUser.xp,
          coins: newUser.coins,
          plan: newUser.plan,
          subscriptionStartDate: newUser.subscriptionStartDate,
          avatarUrl: newUser.avatarUrl,
          createdAt: newUser.createdAt
        });

        // Salva coleção "leaderboard" do Firestore
        await setDoc(doc(db, "leaderboard", uid), {
          name: newUser.name,
          xp: newUser.xp,
          avatar: newUser.avatarUrl
        });

        // Atualiza uid local caso tenha sido gerado pelo Auth do Firebase
        if (newUser.uid !== uid) {
          delete users[newUser.uid];
          newUser.uid = uid;
          users[uid] = newUser;
          setLocalStorage("users", users);
        }
      } catch (e) {
        console.error("Erro ao sincronizar registro no Firestore:", e);
      }
    }

    return newUser;
  },

  // --- MÓDULO: UNIDADES ---
  getUnits: async () => {
    if (isRealFirebase()) {
      try {
        const querySnapshot = await getDocs(collection(db, "units"));
        const list = [];
        querySnapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) {
          setLocalStorage("units", list);
          return list;
        }
      } catch (e) {
        console.warn("Firestore error fetching units, falling back to mock", e);
      }
    }
    return getLocalStorage("units") || [];
  },

  createUnit: async (unitData) => {
    const id = "unit_" + Date.now();
    const newUnit = { id, ...unitData };
    const units = getLocalStorage("units") || [];
    units.push(newUnit);
    setLocalStorage("units", units);
    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "units", id), newUnit);
      } catch (e) {
        console.error("Erro ao criar unidade no Firestore:", e);
      }
    }
    return newUnit;
  },

  updateUnit: async (id, unitData) => {
    const units = getLocalStorage("units") || [];
    const idx = units.findIndex(u => u.id === id);
    if (idx !== -1) {
      units[idx] = { ...units[idx], ...unitData };
      setLocalStorage("units", units);
    }
    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "units", id), unitData, { merge: true });
      } catch (e) {
        console.error("Erro ao atualizar unidade no Firestore:", e);
      }
    }
  },

  deleteUnit: async (id) => {
    const units = getLocalStorage("units") || [];
    setLocalStorage("units", units.filter(u => u.id !== id));
    if (isRealFirebase()) {
      try {
        await deleteDoc(doc(db, "units", id));
      } catch (e) {
        console.error("Erro ao deletar unidade no Firestore:", e);
      }
    }
  },

  // --- MÓDULO: VINCULAÇÃO CLIENTE ↔ UNIDADE ---

  setUserUnit: async (uid, unitId) => {
    // Salva localmente
    const users = getLocalStorage("users") || {};
    if (users[uid]) {
      users[uid].unitId = unitId;
      setLocalStorage("users", users);
    }
    // Salva localStorage da sessão atual
    try {
      const saved = localStorage.getItem("clubber_current_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.uid === uid) {
          parsed.unitId = unitId;
          localStorage.setItem("clubber_current_user", JSON.stringify(parsed));
        }
      }
    } catch (e) {}
    // Salva no Firestore
    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "users", uid), { unitId }, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar unitId do usuário no Firestore:", e);
        throw e;
      }
    }
  },

  // --- MÓDULO: PLANOS POR UNIDADE ---

  getPlanConfigsByUnit: async (unitId) => {
    if (!unitId) {
      // Se não tiver unidade, retorna os planos globais
      return dbService.getPlanConfigs();
    }
    // Tenta buscar planos específicos da unidade
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "units", unitId, "plans", "configs");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data();
        }
      } catch (e) {
        console.warn("Erro ao buscar planos da unidade no Firestore:", e);
      }
    }
    // Fallback: tenta no localStorage
    const key = `planConfigs_unit_${unitId}`;
    const local = getLocalStorage(key);
    if (local) return local;
    // Fallback final: planos globais
    return dbService.getPlanConfigs();
  },

  updatePlanConfigsByUnit: async (unitId, configs) => {
    if (!unitId) {
      return dbService.updatePlanConfigs(configs);
    }
    const key = `planConfigs_unit_${unitId}`;
    setLocalStorage(key, configs);
    if (isRealFirebase()) {
      try {
        const docRef = doc(db, "units", unitId, "plans", "configs");
        await setDoc(docRef, configs, { merge: true });
        return configs;
      } catch (e) {
        console.error("Erro ao salvar planos da unidade no Firestore:", e);
        throw e;
      }
    }
    return configs;
  },

  // --- MÓDULO: CENTRAL DE NOTIFICAÇÕES IN-APP & FCM ---

  getNotifications: async (userUid) => {
    if (isRealFirebase()) {
      try {
        const q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", userUid)
        );
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return list;
      } catch (e) {
        console.warn("Firestore error getting notifications, falling back to mock", e);
      }
    }
    const list = getLocalStorage("notifications") || [];
    return list
      .filter(n => n.recipientUid === userUid)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  createNotification: async (notificationData) => {
    const newNotif = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      read: false,
      createdAt: new Date().toISOString(),
      ...notificationData
    };

    if (isRealFirebase()) {
      try {
        await setDoc(doc(db, "notifications", newNotif.id), newNotif);
        return newNotif;
      } catch (e) {
        console.warn("Firestore error creating notification, falling back to mock", e);
      }
    }

    const list = getLocalStorage("notifications") || [];
    list.push(newNotif);
    setLocalStorage("notifications", list);
    return newNotif;
  },

  markNotificationAsRead: async (notificationId) => {
    if (isRealFirebase()) {
      try {
        await updateDoc(doc(db, "notifications", notificationId), { read: true });
      } catch (e) {
        console.warn("Firestore error marking notification as read", e);
      }
    }
    const list = getLocalStorage("notifications") || [];
    const updated = list.map(n => n.id === notificationId ? { ...n, read: true } : n);
    setLocalStorage("notifications", updated);
    return true;
  },

  markAllNotificationsAsRead: async (userUid) => {
    if (isRealFirebase()) {
      try {
        const q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", userUid),
          where("read", "==", false)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
          batch.update(docSnap.ref, { read: true });
        });
        await batch.commit();
      } catch (e) {
        console.warn("Firestore error marking all notifications as read", e);
      }
    }
    const list = getLocalStorage("notifications") || [];
    const updated = list.map(n => n.recipientUid === userUid ? { ...n, read: true } : n);
    setLocalStorage("notifications", updated);
    return true;
  },

  clearAllNotifications: async (userUid) => {
    if (isRealFirebase()) {
      try {
        const q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", userUid)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (e) {
        console.warn("Firestore error clearing notifications", e);
      }
    }
    const list = getLocalStorage("notifications") || [];
    const updated = list.filter(n => n.recipientUid !== userUid);
    setLocalStorage("notifications", updated);
    return true;
  },

  saveFcmToken: async (userUid, token) => {
    if (!token || !userUid) return false;
    
    // Salva localmente
    const users = getLocalStorage("users") || {};
    if (users[userUid]) {
      const tokens = users[userUid].fcmTokens || [];
      if (!tokens.includes(token)) {
        tokens.push(token);
        users[userUid].fcmTokens = tokens;
        setLocalStorage("users", users);
      }
    }
    
    // Salva também no currentUser do localStorage se for o mesmo
    try {
      const saved = localStorage.getItem("clubber_current_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.uid === userUid) {
          const tokens = parsed.fcmTokens || [];
          if (!tokens.includes(token)) {
            tokens.push(token);
            parsed.fcmTokens = tokens;
            localStorage.setItem("clubber_current_user", JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {}

    // Salva no Firestore
    if (isRealFirebase()) {
      try {
        await updateDoc(doc(db, "users", userUid), {
          fcmTokens: arrayUnion(token)
        });
      } catch (e) {
        console.warn("Firestore error updating FCM tokens", e);
      }
    }
    return true;
  }
};

