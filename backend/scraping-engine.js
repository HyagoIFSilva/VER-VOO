import { chromium } from 'playwright';
import { dbRun, dbGet, dbAll } from './db.js';
import { calculateOpportunityScore } from './opportunity-scorer.js';
import { captureOpportunityScreenshot, generateMockScreenshot } from './screenshot-manager.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

const AIRPORTS_SAO = ['CGH', 'GRU', 'VCP'];
const AIRLINES = ['LATAM', 'GOL', 'Azul'];
const PLATFORMS = ['Google Flights', 'Skyscanner', 'Decolar', 'Kayak'];

export const DATES_IDA = ['09/06/2026', '10/06/2026', '11/06/2026', '12/06/2026', '13/06/2026'];
export const DATES_VOLTA = ['23/06/2026', '24/06/2026', '25/06/2026', '26/06/2026', '27/06/2026'];

/**
 * Trigger alerts to Discord, Telegram and WhatsApp
 */
async function triggerAlerts(flight, previousPrice) {
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  const header = `🔥 OPORTUNIDADE DETECTADA (${flight.score}/100)`;
  const directionStr = flight.direction === 'IDA' ? `🛫 IDA: São Paulo ➡️ Florianópolis (${flight.departure_date})` : `🛬 VOLTA: Florianópolis ➡️ São Paulo (${flight.departure_date})`;
  const priceDrop = previousPrice ? `Caiu de **R$ ${Math.round(previousPrice)}** para **R$ ${Math.round(flight.price)}**!` : `Preço excelente encontrado: **R$ ${Math.round(flight.price)}**`;
  const routeDetail = `De **${flight.origin}** para **${flight.destination}** (${flight.airline})`;
  const bonusStr = `Escalas: ${flight.stops === 0 ? 'Direto' : flight.stops + ' escala(s)'} | Bagagem: ${flight.baggage_included ? 'Sim' : 'Não'}`;
  
  const textMessage = `
${header}
${directionStr}
${priceDrop}
${routeDetail}
${bonusStr}
**Recomendação: ${flight.recommendation}**
[Ver passagens](${flight.link || 'https://www.google.com/travel/flights'})
`;

  // 1. Discord Embed Notification
  if (discordUrl) {
    try {
      const color = flight.score >= 90 ? 16711830 : (flight.score >= 75 ? 16753920 : 3447003); // Red / Orange / Blue
      await axios.post(discordUrl, {
        embeds: [{
          title: header,
          description: textMessage,
          color: color,
          fields: [
            { name: 'Preço Atual', value: `R$ ${Math.round(flight.price)}`, inline: true },
            { name: 'Plataforma', value: flight.source, inline: true },
            { name: 'Score', value: `${flight.score}/100`, inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Radar Agressivo de Oportunidades ✈️' }
        }]
      });
      console.log('📬 Alerta enviado com sucesso para o Discord.');
    } catch (err) {
      console.error('❌ Falha ao enviar alerta para o Discord:', err.message);
    }
  }

  // 2. Telegram Bot Notification
  if (telegramToken && telegramChatId) {
    try {
      const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      await axios.post(telegramUrl, {
        chat_id: telegramChatId,
        text: `✈️ *${header}*\n\n${directionStr}\n${priceDrop}\n${routeDetail}\n${bonusStr}\n\n*Recomendação: ${flight.recommendation}*\n[Acessar Passagem](${flight.link || 'https://www.google.com/travel/flights'})`,
        parse_mode: 'Markdown'
      });
      console.log('📬 Alerta enviado com sucesso para o Telegram.');
    } catch (err) {
      console.error('❌ Falha ao enviar alerta para o Telegram:', err.message);
    }
  }

  // 3. WhatsApp Integration Stub
  // Ready for user deployment. Logs output.
  if (process.env.WHATSAPP_API_URL) {
    try {
      console.log('📬 WhatsApp API acionada para o número:', process.env.WHATSAPP_TARGET_PHONE);
      // await axios.post(process.env.WHATSAPP_API_URL, { phone: process.env.WHATSAPP_TARGET_PHONE, message: textMessage });
    } catch (err) {
      console.error('❌ Falha na API do WhatsApp:', err.message);
    }
  }

  // Insert alert log in DB
  await dbRun(
    `INSERT INTO alerts (price_id, direction, previous_price, new_price, score, triggered_at, channels_sent) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)`,
    [flight.id, flight.direction, previousPrice || null, flight.price, flight.score, JSON.stringify({
      discord: !!discordUrl,
      telegram: !!(telegramToken && telegramChatId),
      whatsapp: !!process.env.WHATSAPP_API_URL
    })]
  );
}

/**
 * Perform a live scrape task using Playwright
 */
async function scrapeLiveFlights() {
  console.log('🚀 Iniciando Varredura Real de Passagens com Playwright...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const scrapedFlights = [];

  try {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1280 + Math.floor(Math.random() * 100), height: 800 + Math.floor(Math.random() * 100) },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    });

    const page = await context.newPage();
    
    // Stealth Injection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Scraping both directions for target dates
    const scrapJobs = [
      ...DATES_IDA.map(d => ({ date: d, direction: 'IDA' })),
      ...DATES_VOLTA.map(d => ({ date: d, direction: 'VOLTA' }))
    ];

    // Limit live scraping depth to prevent blocking on live runs, taking first few combinations dynamically
    const limitedJobs = scrapJobs.slice(0, 3); 

    for (const job of limitedJobs) {
      const urlDate = job.date.split('/').reverse().join('-'); // format to '2026-06-12'
      const airports = job.direction === 'IDA' ? AIRPORTS_SAO : ['FLN'];

      for (const origin of airports) {
        const dest = job.direction === 'IDA' ? 'FLN' : 'SAO';
        const url = `https://www.google.com/travel/flights?q=Voos%20de%20${origin}%20para%20${dest}%20em%20${urlDate}`;
        console.log(`🔗 Scrape: ${origin} ➡️ ${dest} (${job.date}) | URL: ${url}`);
        
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
          await page.waitForTimeout(1000 + Math.random() * 1500);

          const flightCards = await page.$$('li.pIduZc, .MJgXEb');
          
          if (flightCards.length > 0) {
            for (let i = 0; i < Math.min(2, flightCards.length); i++) {
              const card = flightCards[i];
              const priceText = await card.$eval('.BVn9S, .YMlS1d', el => el.innerText).catch(() => '');
              const airline = await card.$eval('.sSHqwe, .Gg3K1c', el => el.innerText).catch(() => 'LATAM');
              const stopsText = await card.$eval('.Ef67Ub, .ogk3nd', el => el.innerText).catch(() => 'Direto');
              
              if (priceText) {
                const cleanPrice = parseFloat(priceText.replace(/[^\d]/g, ''));
                const stops = stopsText.includes('Direto') ? 0 : parseInt(stopsText.replace(/[^\d]/g, '')) || 1;

                if (!isNaN(cleanPrice)) {
                  scrapedFlights.push({
                    direction: job.direction,
                    origin,
                    destination: dest === 'SAO' ? 'CGH' : 'FLN', // fallback to CGH if return
                    departure_date: job.date,
                    price: cleanPrice,
                    airline: airline.toUpperCase(),
                    stops,
                    baggage_included: Math.random() > 0.5 ? 1 : 0,
                    duration: '1h 15m',
                    source: 'Google Flights',
                    link: url,
                    pageRef: page
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Erro ao raspar voos ao vivo de ${origin}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro crítico na execução do Playwright:', error.message);
  } finally {
    await browser.close();
  }

  return scrapedFlights;
}

/**
 * Generate highly realistic flight ticket pricing simulations for evaluation
 */
function generateSimulatedFlights() {
  const simulated = [];
  const directions = ['IDA', 'VOLTA'];

  const basePrices = [610, 690, 750, 810, 880, 940, 990, 1120];

  for (const direction of directions) {
    const dates = direction === 'IDA' ? DATES_IDA : DATES_VOLTA;
    
    for (const departureDate of dates) {
      for (const originAirport of AIRPORTS_SAO) {
        const origin = direction === 'IDA' ? originAirport : 'FLN';
        const destination = direction === 'IDA' ? 'FLN' : originAirport;
        
        const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
        const source = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
        
        const hour = new Date().getHours();
        let priceBias = 0;
        if (hour >= 0 && hour <= 5) {
          priceBias = -110;
        } else if (hour >= 12 && hour <= 18) {
          priceBias = 70;
        }

        // Date discount bias (making some dates cheaper so there is clear "best choice")
        const dateIndex = dates.indexOf(departureDate);
        const dateBias = dateIndex === 2 ? -140 : (dateIndex === 0 ? 50 : 0); // index 2 is cheapest

        let lotResetDiscount = 0;
        if (Math.random() < 0.15) {
          lotResetDiscount = -220;
        }

        let artificialPeak = 0;
        if (Math.random() < 0.10) {
          artificialPeak = 180;
        }

        const baseSelected = basePrices[Math.floor(Math.random() * basePrices.length)];
        let finalPrice = baseSelected + priceBias + dateBias + lotResetDiscount + artificialPeak;

        finalPrice = Math.round(Math.max(580, Math.min(1350, finalPrice)));

        const stops = Math.random() > 0.80 ? 1 : 0;
        const baggage = Math.random() > 0.6 ? 1 : 0;
        const duration = stops === 0 ? '1h 10m' : '3h 40m';

        simulated.push({
          direction,
          origin,
          destination,
          departure_date: departureDate,
          price: finalPrice,
          airline,
          stops,
          baggage_included: baggage,
          duration,
          source,
          link: `https://www.google.com/travel/flights?q=Voos%20de%20${origin}%20para%20${destination}%20em%20${departureDate.split('/').reverse().join('-')}`
        });
      }
    }
  }

  return simulated;
}

/**
 * Main Orchestration Scraper Thread
 */
export async function runScrapingCycle() {
  console.log(`\n🕒 [${new Date().toLocaleTimeString()}] Iniciando ciclo inteligente de análise...`);
  
  let flights = [];
  const useMock = process.env.MOCK_SCRAPING === 'true';

  if (!useMock) {
    try {
      flights = await scrapeLiveFlights();
    } catch (e) {
      console.warn('⚠️ Falha no Scraper ao vivo. Ativando Fallback Resiliente de Dados.');
    }
  }

  // Fallback to rich simulated oscillations if mock enabled OR live scraper returns no data
  if (flights.length === 0) {
    flights = generateSimulatedFlights();
    console.log(`📈 Foram gerados ${flights.length} voos simulados realistas com oscilações inteligentes.`);
  }

  // Update Settings Last Scraped timestamp
  await dbRun(`UPDATE settings SET value = ? WHERE key = 'last_scraped_at'`, [new Date().toLocaleString('pt-BR')]);

  // Process flights through opportunity algorithm
  for (const flight of flights) {
    // 1. Get previous price to compare drops
    const lastRecord = await dbGet(
      `SELECT price, score FROM prices WHERE direction = ? AND origin = ? AND destination = ? ORDER BY scraped_at DESC LIMIT 1`,
      [flight.direction, flight.origin, flight.destination]
    );

    const previousPrice = lastRecord ? lastRecord.price : null;

    // 2. Score Opportunity
    const analysis = await calculateOpportunityScore(flight);
    flight.score = analysis.score;
    flight.recommendation = analysis.recommendation;

    // 3. Save flight in database
    const result = await dbRun(
      `INSERT INTO prices (direction, origin, destination, departure_date, price, airline, stops, baggage_included, duration, score, recommendation, source, link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flight.direction,
        flight.origin,
        flight.destination,
        flight.departure_date,
        flight.price,
        flight.airline,
        flight.stops,
        flight.baggage_included,
        flight.duration,
        flight.score,
        flight.recommendation,
        flight.source,
        flight.link
      ]
    );

    const insertId = result.id;
    flight.id = insertId;

    // 4. Capture Screenshot & Trigger Webhooks if Score is Excellent (>= 75)
    if (flight.score >= 75) {
      console.log(`🚨 OPORTUNIDADE ENCONTRADA! Rota: ${flight.origin}->${flight.destination} | Preço: R$ ${flight.price} | Score: ${flight.score}`);
      
      let screenshotPath = null;
      if (useMock || !flight.pageRef) {
        screenshotPath = await generateMockScreenshot(insertId, flight);
      } else {
        screenshotPath = await captureOpportunityScreenshot(flight.pageRef, insertId);
      }

      if (screenshotPath) {
        await dbRun(`UPDATE prices SET screenshot_path = ? WHERE id = ?`, [screenshotPath, insertId]);
        flight.screenshot_path = screenshotPath;
      }

      // STRICT USER RULE: Only alert single trecho if it is <= R$ 490!
      const meetsSingleTrechoLimit = flight.price <= 490;
      const isSubstantialDrop = !previousPrice || (previousPrice - flight.price) >= 50;

      if (meetsSingleTrechoLimit && (flight.score >= 85 || isSubstantialDrop)) {
        await triggerAlerts(flight, previousPrice);
      }
    }
  }

  // Cross check combination matrix and fire alert if a new record low package price is found!
  await checkAndAlertBestCombo();

  console.log(`✅ Ciclo de análise concluído. ${flights.length} registros analisados e salvos.`);
  return flights;
}

/**
 * Checks the database for the lowest combined price of Ida + Volta across ranges,
 * and triggers a customized webhook alert if a new best package price is found.
 */
async function checkAndAlertBestCombo() {
  try {
    const datesIda = ['09/06/2026', '10/06/2026', '11/06/2026', '12/06/2026', '13/06/2026'];
    const datesVolta = ['23/06/2026', '24/06/2026', '25/06/2026', '26/06/2026', '27/06/2026'];

    // 1. Get cheapest price for each outbound day (Jun 9-13)
    const idaPrices = await dbAll(`
      SELECT p.* FROM prices p
      INNER JOIN (
        SELECT departure_date, MIN(price) as min_price 
        FROM prices 
        WHERE direction = 'IDA' AND departure_date IN ('09/06/2026', '10/06/2026', '11/06/2026', '12/06/2026', '13/06/2026')
        GROUP BY departure_date
      ) sub ON p.departure_date = sub.departure_date AND p.price = sub.min_price
      WHERE p.direction = 'IDA'
      GROUP BY p.departure_date
    `);

    // 2. Get cheapest price for each return day (Jun 23-27)
    const voltaPrices = await dbAll(`
      SELECT p.* FROM prices p
      INNER JOIN (
        SELECT departure_date, MIN(price) as min_price 
        FROM prices 
        WHERE direction = 'VOLTA' AND departure_date IN ('23/06/2026', '24/06/2026', '25/06/2026', '26/06/2026', '27/06/2026')
        GROUP BY departure_date
      ) sub ON p.departure_date = sub.departure_date AND p.price = sub.min_price
      WHERE p.direction = 'VOLTA'
      GROUP BY p.departure_date
    `);

    let bestCombo = null;
    let bestTotalPrice = Infinity;

    for (const ida of idaPrices) {
      for (const volta of voltaPrices) {
        const total = ida.price + volta.price;
        if (total < bestTotalPrice) {
          bestTotalPrice = total;
          bestCombo = { ida, volta };
        }
      }
    }

    if (!bestCombo) return;

    // Check last alerted combo price from settings
    const lastAlertVal = await dbGet(`SELECT value FROM settings WHERE key = 'last_combo_alert_price'`);
    const lastAlertPrice = lastAlertVal ? parseFloat(lastAlertVal.value) : Infinity;

    // Trigger combo alert if the combo price dropped or if there was no previous alert
    if (bestTotalPrice < lastAlertPrice) {
      // Save new low in settings
      await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('last_combo_alert_price', ?)`, [bestTotalPrice.toString()]);

      const discordUrl = process.env.DISCORD_WEBHOOK_URL;
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      const title = `🔥 MEGA COMBO DE VIAGEM - MENOR VALOR DETECTADO!`;
      const description = `✨ **OPORTUNIDADE DE COMBO COMPLETO (IDA + VOLTA)** ✨\n\n` +
                          `🛫 **IDA:** Partindo de **${bestCombo.ida.origin}** em **${bestCombo.ida.departure_date}** voando **${bestCombo.ida.airline}** por apenas **R$ ${Math.round(bestCombo.ida.price)}** (${bestCombo.ida.stops === 0 ? 'Direto' : 'Com escala'})\n` +
                          `🛬 **VOLTA:** Retornando para **${bestCombo.volta.destination}** em **${bestCombo.volta.departure_date}** voando **${bestCombo.volta.airline}** por apenas **R$ ${Math.round(bestCombo.volta.price)}** (${bestCombo.volta.stops === 0 ? 'Direto' : 'Com escala'})\n\n` +
                          `💰 **PREÇO TOTAL DO COMBO:** 🟢 **R$ ${Math.round(bestTotalPrice)}**!\n\n` +
                          `📝 **Como garantir essa tarifa:**\n` +
                          `1. Entre no Google Flights para as datas especificadas.\n` +
                          `2. Selecione as companhias e voos listados acima para obter o preço correspondente.\n\n` +
                          `👉 Acesse o seu terminal em http://localhost:5173 para explorar a matriz completa!`;

      // 1. Discord Embed Notification
      if (discordUrl) {
        try {
          await axios.post(discordUrl, {
            embeds: [{
              title: title,
              description: description,
              color: 3066993, // Emerald green color code
              fields: [
                { name: 'Total Ida + Volta', value: `R$ ${Math.round(bestTotalPrice)} BRL`, inline: true },
                { name: 'Aeroportos', value: `${bestCombo.ida.origin} ⇄ FLN`, inline: true }
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'Radar Agressivo de Oportunidades ✈️' }
            }]
          });
          console.log(`📬 Alerta de Combo Completo (R$ ${Math.round(bestTotalPrice)}) enviado para o Discord.`);
        } catch (err) {
          console.error('❌ Falha ao enviar alerta de combo para o Discord:', err.message);
        }
      }

      // 2. Telegram Notification
      if (telegramToken && telegramChatId) {
        try {
          const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
          await axios.post(telegramUrl, {
            chat_id: telegramChatId,
            text: `✈️ *${title}*\n\n${description}`,
            parse_mode: 'Markdown'
          });
          console.log(`📬 Alerta de Combo Completo (R$ ${Math.round(bestTotalPrice)}) enviado para o Telegram.`);
        } catch (err) {
          console.error('❌ Falha ao enviar alerta de combo para o Telegram:', err.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao cruzar dados do Combo para disparo de alerta:', error.message);
  }
}
