// Constantes de Configuração dos Níveis de Assinatura
export const NIVEL_CONFIG = [
  { level: 1, name: "Novato", monthsMin: 0, monthsMax: 1, bonus: 3, pointsMultiplier: 0.5, badge: "🦶" },
  { level: 2, name: "Cria", monthsMin: 1, monthsMax: 3, bonus: 4, pointsMultiplier: 0.6, badge: "✂️" },
  { level: 3, name: "Veterano", monthsMin: 3, monthsMax: 6, bonus: 5, pointsMultiplier: 0.8, badge: "🔥" },
  { level: 4, name: "Fiel", monthsMin: 6, monthsMax: 12, bonus: 6, pointsMultiplier: 1.0, badge: "👑" },
  { level: 5, name: "Elite", monthsMin: 12, monthsMax: 18, bonus: 7, pointsMultiplier: 1.2, badge: "⚡" },
  { level: 6, name: "Lenda", monthsMin: 18, monthsMax: 24, bonus: 8, pointsMultiplier: 1.5, badge: "🌟" },
  { level: 7, name: "Imortal", monthsMin: 24, monthsMax: 36, bonus: 9, pointsMultiplier: 1.8, badge: "💎" },
  { level: 8, name: "Clã Barbeiro", monthsMin: 36, monthsMax: 999, bonus: 10, pointsMultiplier: 2.0, badge: "🔱" }
];

export function calcularDiferencaEmMeses(dataInicioStr) {
  if (!dataInicioStr) return 0;
  const dataInicio = new Date(dataInicioStr);
  const hoje = new Date("2026-06-06T12:00:00.000Z"); // Data de referência da simulação do sistema
  
  const anosDiff = hoje.getFullYear() - dataInicio.getFullYear();
  const mesesDiff = hoje.getMonth() - dataInicio.getMonth();
  
  let totalMeses = (anosDiff * 12) + mesesDiff;
  
  // Ajuste se o dia do mês atual for menor que o dia do mês de início
  if (hoje.getDate() < dataInicio.getDate()) {
    totalMeses--;
  }
  
  return Math.max(0, totalMeses);
}

export function calcularNivel(dataInicioStr) {
  const meses = calcularDiferencaEmMeses(dataInicioStr);
  
  for (const config of NIVEL_CONFIG) {
    if (meses >= config.monthsMin && meses < config.monthsMax) {
      return config;
    }
  }
  
  return NIVEL_CONFIG[NIVEL_CONFIG.length - 1]; // Fallback para o último nível
}

export function getBadgeNivel(nivel) {
  const config = NIVEL_CONFIG.find(c => c.level === nivel);
  return config ? config.badge : "🦶";
}

export function getBonusPorNivel(nivel) {
  const config = NIVEL_CONFIG.find(c => c.level === nivel);
  return config ? config.bonus : 3;
}

export function getMesesParaProximoNivel(nivel, dataInicioStr) {
  const configAtual = NIVEL_CONFIG.find(c => c.level === nivel);
  if (!configAtual || configAtual.level === 8) return 0;
  
  const mesesAtuais = calcularDiferencaEmMeses(dataInicioStr);
  const mesesNecessarios = configAtual.monthsMax;
  
  return Math.max(0, mesesNecessarios - mesesAtuais);
}
