import { dbGet, dbRun } from './db.js';
import { runScrapingCycle } from './scraping-engine.js';

let isScrapingRunning = false;
let lastScrapedTime = null;
let lastHourTriggered = null;

const SCHEDULED_HOURS = [0, 1, 5, 7, 12, 15, 18, 21];

/**
 * Main cron-tick function evaluating schedule conditions
 */
async function schedulerTick() {
  if (isScrapingRunning) return;

  try {
    // 1. Fetch current settings from DB
    const modeSetting = await dbGet(`SELECT value FROM settings WHERE key = 'aggressive_mode'`);
    const isAggressive = modeSetting && modeSetting.value === '1';

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMs = now.getTime();

    let shouldTrigger = false;

    if (isAggressive) {
      // Aggressive Mode: Every 10 minutes
      const tenMinutesInMs = 10 * 60 * 1000;
      if (!lastScrapedTime || (currentTimeMs - lastScrapedTime >= tenMinutesInMs)) {
        console.log(`⏱️ Modo Agressivo ativo: Disparando varredura recorrente de 10 minutos.`);
        shouldTrigger = true;
      }
    } else {
      // Standard Mode: Check specific hours
      if (SCHEDULED_HOURS.includes(currentHour)) {
        if (lastHourTriggered !== currentHour) {
          console.log(`⏰ Cronograma padrão alcançado: Hora atual: ${currentHour}h00.`);
          shouldTrigger = true;
        }
      }
    }

    if (shouldTrigger) {
      isScrapingRunning = true;
      lastScrapedTime = currentTimeMs;
      if (!isAggressive) {
        lastHourTriggered = currentHour;
      }
      
      await runScrapingCycle();
    }
  } catch (error) {
    console.error('❌ Falha ao processar ciclo de agendamento:', error.message);
  } finally {
    isScrapingRunning = false;
  }
}

/**
 * Initializes and starts the tick loops
 */
export function startScheduler() {
  console.log('⚙️ Inicializando Agendador de Oportunidades...');
  
  // Tick every 30 seconds to evaluate conditions
  const THIRTY_SECONDS = 30 * 1000;
  setInterval(schedulerTick, THIRTY_SECONDS);

  // Trigger initial check immediately in background
  setTimeout(() => {
    console.log('🔄 Executando verificação de inicialização rápida...');
    schedulerTick();
  }, 1000);

  console.log(`📡 Agendador de Oportunidades ativo. Horários padrão monitorados: ${SCHEDULED_HOURS.map(h => h + 'h').join(', ')}.`);
}
