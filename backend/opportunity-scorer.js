import { dbAll } from './db.js';

// Fallback baseline statistics if database is empty initially
const BASELINE_STATS = {
  IDA: { avg: 850, min: 614, max: 1200 },
  VOLTA: { avg: 850, min: 614, max: 1200 }
};

/**
 * Calculates Opportunity Score (0 to 100) and Recommendation
 */
export async function calculateOpportunityScore(flight) {
  const { direction, origin, destination, price, stops, baggage_included } = flight;

  // 1. Fetch historical data for this route
  const history = await dbAll(
    `SELECT price FROM prices WHERE direction = ? AND origin = ? AND destination = ? ORDER BY scraped_at DESC LIMIT 100`,
    [direction, origin, destination]
  );

  let avgPrice = BASELINE_STATS[direction]?.avg || 850;
  let minPrice = BASELINE_STATS[direction]?.min || 614;
  let maxPrice = BASELINE_STATS[direction]?.max || 1200;

  if (history.length > 5) {
    const prices = history.map(h => h.price);
    avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
  }

  // 2. Base Score based on Absolute Tiers (Business Rules)
  let baseScore = 50;
  if (price <= 700) {
    baseScore = 90; // Excelente
  } else if (price <= 820) {
    baseScore = 75; // Bom
  } else if (price <= 920) {
    baseScore = 55; // Aceitável
  } else if (price > 950) {
    baseScore = 15; // Ruim
  }

  // 3. Adjust Score dynamically using Historical Stats
  let scoreAdjustment = 0;

  // Price deviation from moving average
  const percentBelowAvg = (avgPrice - price) / avgPrice;
  scoreAdjustment += percentBelowAvg * 40; // up to +40 points if way below average, or negative if above

  // Proximity to all-time low (minPrice)
  if (price <= minPrice * 1.03) {
    scoreAdjustment += 20; // 20-point bonus for historical low range
  } else if (price >= maxPrice * 0.95) {
    scoreAdjustment -= 15; // Penalty for near maximum pricing
  }

  // Quality of service modifiers (Direct vs Stops, Baggage)
  if (stops === 0) {
    scoreAdjustment += 5; // Direct flight is better
  } else if (stops >= 2) {
    scoreAdjustment -= 10; // Multiple stops is worse
  }

  if (baggage_included === 1) {
    scoreAdjustment += 5; // Free baggage included adds value
  }

  // 4. Calculate Final Score (clamped between 5 and 100)
  let finalScore = Math.round(baseScore + scoreAdjustment);
  finalScore = Math.max(5, Math.min(100, finalScore));

  // 5. Generate Recommendation String
  let recommendation = 'AGUARDAR';
  if (finalScore >= 90) {
    recommendation = 'COMPRAR IMEDIATAMENTE';
  } else if (finalScore >= 75) {
    recommendation = 'OPORTUNIDADE BOA';
  } else if (finalScore >= 50) {
    recommendation = 'PREÇO ACEITÁVEL';
  } else {
    recommendation = 'PREÇO RUIM';
  }

  return {
    score: finalScore,
    recommendation,
    stats: {
      avgPrice: Math.round(avgPrice),
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice)
    }
  };
}

/**
 * Statistical engine to generate predictive insights for the dashboard
 */
export async function getPredictiveInsights(direction) {
  const history = await dbAll(
    `SELECT price, scraped_at FROM prices WHERE direction = ? ORDER BY scraped_at DESC LIMIT 50`,
    [direction]
  );

  // Default values if history is insufficient
  let trend = 'ESTÁVEL';
  let changeProbabilityDown = 45;
  let changeProbabilityUp = 35;
  let recommendedWindow = 'Janela de compra ideal: 45 a 60 dias antes do embarque.';
  let explanation = 'Aguardando mais dados históricos para refinar as previsões de inteligência.';

  if (history.length >= 5) {
    const prices = history.map(h => h.price).reverse(); // Oldest to newest
    const count = prices.length;

    // 1. Calculate Simple Linear Regression Slope to find trend
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < count; i++) {
      sumX += i;
      sumY += prices[i];
      sumXY += i * prices[i];
      sumXX += i * i;
    }
    const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);

    // 2. Trend classification
    if (slope < -1.5) {
      trend = 'QUEDA';
    } else if (slope > 1.5) {
      trend = 'ALTA';
    } else {
      trend = 'ESTÁVEL';
    }

    // 3. Compute mean and standard deviation
    const mean = prices.reduce((a, b) => a + b, 0) / count;
    const variance = prices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance) || 1;

    const currentPrice = prices[prices.length - 1];

    // 4. Calculate probabilities based on current deviation
    if (currentPrice > mean + stdDev) {
      // Artificial peak: price is highly likely to drop back to mean
      changeProbabilityDown = Math.round(Math.min(95, 70 + (currentPrice - mean) / stdDev * 15));
      changeProbabilityUp = Math.round(100 - changeProbabilityDown - 10);
      explanation = 'O preço atual está significativamente acima da média móvel histórica. Este é um pico artificial ou um reset de lote. Recomendamos FORTEMENTE aguardar a queda.';
    } else if (currentPrice < mean - stdDev) {
      // Historical drop: price is low and highly likely to jump back up
      changeProbabilityUp = Math.round(Math.min(95, 75 + (mean - currentPrice) / stdDev * 15));
      changeProbabilityDown = Math.round(100 - changeProbabilityUp - 10);
      explanation = 'O preço atual rompeu o desvio padrão histórico para baixo! É provável que as passagens desse lote se esgotem rapidamente e o preço suba. Compre agora antes do reajuste.';
    } else {
      // Normal range
      if (trend === 'QUEDA') {
        changeProbabilityDown = 60;
        changeProbabilityUp = 30;
        explanation = 'O preço está estável com tendência de queda gradual nas últimas consultas. Monitore de perto nas próximas horas por oportunidades relâmpago.';
      } else if (trend === 'ALTA') {
        changeProbabilityDown = 30;
        changeProbabilityUp = 65;
        explanation = 'O preço apresenta comportamento de alta consistente. Se precisar comprar com urgência, faça-o, caso contrário, espere pelo próximo reset de lote.';
      } else {
        changeProbabilityDown = 45;
        changeProbabilityUp = 45;
        explanation = 'O mercado de tarifas está lateralizado e estável. Ótimo momento para aguardar variações fora do padrão.';
      }
    }

    // Recommended Window (June 2026 travel date vs today in 2026)
    // Travel date is around Jun 12, 2026.
    const travelDate = new Date('2026-06-12T00:00:00');
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.round((travelDate - today) / msPerDay);

    if (daysRemaining > 90) {
      recommendedWindow = `Faltam ${daysRemaining} dias. Janela ideal recomendada: Entre 45 e 60 dias antes (metade de Abril a Maio de 2026). Aguarde resets de lote tarifários.`;
    } else if (daysRemaining >= 30) {
      recommendedWindow = `Faltam ${daysRemaining} dias. Janela crítica atual de compras! Oportunidades podem durar menos de 2 horas. Ative o monitoramento agressivo.`;
    } else {
      recommendedWindow = `Faltam apenas ${daysRemaining} dias para o voo. Janela de última hora! Preços tendem a disparar. Se surgir um score >= 75, compre imediatamente.`;
    }
  }

  return {
    direction,
    trend,
    changeProbabilityDown: Math.max(5, Math.min(95, changeProbabilityDown)),
    changeProbabilityUp: Math.max(5, Math.min(95, changeProbabilityUp)),
    recommendedWindow,
    explanation
  };
}
