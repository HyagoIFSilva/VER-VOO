import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

import { initDb, dbAll, dbRun, dbGet } from './db.js';
import { runScrapingCycle } from './scraping-engine.js';
import { startScheduler } from './scheduler.js';
import { getPredictiveInsights } from './opportunity-scorer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static screenshots folder
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// API: Get current operational status
app.get('/api/status', async (req, res) => {
  try {
    const aggSetting = await dbGet(`SELECT value FROM settings WHERE key = 'aggressive_mode'`);
    const discordSetting = await dbGet(`SELECT value FROM settings WHERE key = 'discord_webhook'`);
    const telegramSetting = await dbGet(`SELECT value FROM settings WHERE key = 'telegram_token'`);
    const lastScrapedSetting = await dbGet(`SELECT value FROM settings WHERE key = 'last_scraped_at'`);
    
    const countPrices = await dbGet(`SELECT COUNT(*) as count FROM prices`);
    const countAlerts = await dbGet(`SELECT COUNT(*) as count FROM alerts`);

    res.json({
      status: 'ONLINE',
      aggressiveMode: aggSetting?.value === '1',
      lastScrapedAt: lastScrapedSetting?.value || 'Nenhuma consulta realizada',
      databaseRecords: countPrices.count,
      totalAlertsSent: countAlerts.count,
      discordConfigured: !!discordSetting?.value,
      telegramConfigured: !!telegramSetting?.value,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: List and filter flight price history
app.get('/api/prices', async (req, res) => {
  try {
    const { direction, origin, airline, maxPrice, limit = 100 } = req.query;
    
    let query = `SELECT * FROM prices WHERE 1=1`;
    const params = [];

    if (direction) {
      query += ` AND direction = ?`;
      params.push(direction.toUpperCase());
    }
    if (origin) {
      query += ` AND origin = ?`;
      params.push(origin.toUpperCase());
    }
    if (airline) {
      query += ` AND airline = ?`;
      params.push(airline.toUpperCase());
    }
    if (maxPrice) {
      query += ` AND price <= ?`;
      params.push(parseFloat(maxPrice));
    }

    query += ` ORDER BY scraped_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const prices = await dbAll(query, params);
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Deep Aggregations for Charts & Graphs
app.get('/api/analytics', async (req, res) => {
  try {
    // 1. Core aggregates
    const currentPriceIda = await dbGet(`SELECT * FROM prices WHERE direction = 'IDA' ORDER BY id DESC LIMIT 1`);
    const currentPriceVolta = await dbGet(`SELECT * FROM prices WHERE direction = 'VOLTA' ORDER BY id DESC LIMIT 1`);
    
    const minIda = await dbGet(`SELECT MIN(price) as minPrice, MAX(price) as maxPrice, AVG(price) as avgPrice FROM prices WHERE direction = 'IDA'`);
    const minVolta = await dbGet(`SELECT MIN(price) as minPrice, MAX(price) as maxPrice, AVG(price) as avgPrice FROM prices WHERE direction = 'VOLTA'`);

    // 2. Timeline chart data (last 30 scraping records aggregated)
    const timelineData = await dbAll(`
      SELECT scraped_at, direction, MIN(price) as min_price, AVG(price) as avg_price 
      FROM prices 
      GROUP BY scraped_at, direction 
      ORDER BY scraped_at ASC 
      LIMIT 60
    `);

    // 3. Airport comparison
    const airportStats = await dbAll(`
      SELECT origin, direction, MIN(price) as min_price, AVG(price) as avg_price 
      FROM prices 
      GROUP BY origin, direction
    `);

    // 4. Platform comparison
    const platformStats = await dbAll(`
      SELECT source, MIN(price) as min_price, AVG(price) as avg_price 
      FROM prices 
      GROUP BY source
    `);

    // 5. Heatmap matrix data (Day of Week vs Hour of Day)
    // In SQLite: strftime('%w', scraped_at) returns 0-6 (Sunday to Saturday)
    // strftime('%H', scraped_at) returns hour 00-23
    const heatmapRaw = await dbAll(`
      SELECT 
        CAST(strftime('%w', scraped_at) AS INTEGER) as day_of_week,
        CAST(strftime('%H', scraped_at) AS INTEGER) as hour_of_day,
        MIN(price) as min_price
      FROM prices
      GROUP BY day_of_week, hour_of_day
    `);

    res.json({
      summary: {
        ida: {
          current: currentPriceIda?.price || null,
          currentScore: currentPriceIda?.score || null,
          min: minIda.minPrice || 0,
          max: minIda.maxPrice || 0,
          avg: Math.round(minIda.avgPrice || 0),
          airline: currentPriceIda?.airline || 'LATAM',
          origin: currentPriceIda?.origin || 'CGH',
          recommendation: currentPriceIda?.recommendation || 'AGUARDAR',
          departureDate: currentPriceIda?.departure_date || null
        },
        volta: {
          current: currentPriceVolta?.price || null,
          currentScore: currentPriceVolta?.score || null,
          min: minVolta.minPrice || 0,
          max: minVolta.maxPrice || 0,
          avg: Math.round(minVolta.avgPrice || 0),
          airline: currentPriceVolta?.airline || 'LATAM',
          origin: currentPriceVolta?.origin || 'CGH',
          recommendation: currentPriceVolta?.recommendation || 'AGUARDAR',
          departureDate: currentPriceVolta?.departure_date || null
        }
      },
      timeline: timelineData,
      airports: airportStats,
      platforms: platformStats,
      heatmap: heatmapRaw
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Live Predictive Engine Insights
app.get('/api/predictions', async (req, res) => {
  try {
    const idaPred = await getPredictiveInsights('IDA');
    const voltaPred = await getPredictiveInsights('VOLTA');
    res.json({ ida: idaPred, volta: voltaPred });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Calculate the cheapest combined flight combo over ranges
app.get('/api/best-combination', async (req, res) => {
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

    // 3. Pair up to find absolute cheapest combo
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

    // Compile step-by-step purchase guidelines
    let guide = '';
    if (bestCombo) {
      const { ida, volta } = bestCombo;
      guide = `Para garantir a tarifa combinada de R$ ${Math.round(bestTotalPrice)}:\n\n` +
              `1. 🛫 IDA: Compre o trecho de saída de ${ida.origin} no dia ${ida.departure_date}. Selecione a companhia **${ida.airline}** (${ida.stops === 0 ? 'Direto' : 'Com escala'}).\n` +
              `2. 🛬 VOLTA: Compre o retorno saindo de FLN no dia ${volta.departure_date} pousando em ${volta.destination}. Selecione a companhia **${volta.airline}** (${volta.stops === 0 ? 'Direto' : 'Com escala'}).\n` +
              `3. 🎒 BAGAGEM: Esta oferta ${ida.baggage_included && volta.baggage_included ? 'INCLUI bagagem de porão' : 'pode conter apenas mala de mão de 10kg'}.\n` +
              `4. 🧭 PORTAL: Clique nos botões "Ir para Voo" ao lado para abrir os parceiros oficiais (${ida.source} / ${volta.source}) e consolidar a compra!`;
    }

    // 4. Compile a 5x5 combination matrix for date grid
    const grid = [];
    for (const idaDate of datesIda) {
      const row = { idaDate, prices: {} };
      for (const voltaDate of datesVolta) {
        const idaMatch = idaPrices.find(p => p.departure_date === idaDate);
        const voltaMatch = voltaPrices.find(p => p.departure_date === voltaDate);
        row.prices[voltaDate] = (idaMatch && voltaMatch) ? Math.round(idaMatch.price + voltaMatch.price) : null;
      }
      grid.push(row);
    }

    res.json({
      bestCombo,
      totalPrice: bestTotalPrice === Infinity ? null : bestTotalPrice,
      guide,
      grid,
      idaPrices,
      voltaPrices
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Manual Varredura Trigger
app.post('/api/scrape/trigger', async (req, res) => {
  try {
    console.log('⚡ Solicitação manual de varredura recebida.');
    
    // Add realistic delay for mock to make console feel alive and satisfying
    if (process.env.MOCK_SCRAPING === 'true') {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const results = await runScrapingCycle();
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Retrieve active configuration settings
app.get('/api/settings', async (req, res) => {
  try {
    const discordSetting = await dbGet(`SELECT value FROM settings WHERE key = 'discord_webhook'`);
    const telegramSetting = await dbGet(`SELECT value FROM settings WHERE key = 'telegram_token'`);
    const telegramChatSetting = await dbGet(`SELECT value FROM settings WHERE key = 'telegram_chat_id'`);

    res.json({
      discord_webhook: discordSetting?.value || '',
      telegram_token: telegramSetting?.value || '',
      telegram_chat_id: telegramChatSetting?.value || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Save and update alert settings
app.post('/api/settings', async (req, res) => {
  try {
    const { aggressive_mode, discord_webhook, telegram_token, telegram_chat_id } = req.body;

    if (aggressive_mode !== undefined) {
      await dbRun(`UPDATE settings SET value = ? WHERE key = 'aggressive_mode'`, [aggressive_mode ? '1' : '0']);
    }
    if (discord_webhook !== undefined) {
      await dbRun(`UPDATE settings SET value = ? WHERE key = 'discord_webhook'`, [discord_webhook]);
      process.env.DISCORD_WEBHOOK_URL = discord_webhook;
    }
    if (telegram_token !== undefined) {
      await dbRun(`UPDATE settings SET value = ? WHERE key = 'telegram_token'`, [telegram_token]);
      process.env.TELEGRAM_BOT_TOKEN = telegram_token;
    }
    if (telegram_chat_id !== undefined) {
      await dbRun(`UPDATE settings SET value = ? WHERE key = 'telegram_chat_id'`, [telegram_chat_id]);
      process.env.TELEGRAM_CHAT_ID = telegram_chat_id;
    }

    res.json({ success: true, message: 'Configurações salvas com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Test Webhook Connection (Bypasses filters to prove delivery immediately)
app.post('/api/settings/test', async (req, res) => {
  try {
    const { discord_webhook, telegram_token, telegram_chat_id } = req.body;
    
    const discordUrl = discord_webhook || process.env.DISCORD_WEBHOOK_URL;
    const telegramToken = telegram_token || process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    let discordSent = false;
    let telegramSent = false;

    // Send Discord test message
    if (discordUrl) {
      await axios.post(discordUrl, {
        embeds: [{
          title: '🔄 TESTE DE CONEXÃO - RADAR DE OPORTUNIDADES ✈️',
          description: 'Parabéns! Se você está lendo esta mensagem, o seu webhook do Discord está **100% configurado e ativo**.\n\n' +
                      'O sistema agora monitorará as rotas nos bastidores e alertará aqui quando houver quedas tarifárias reais baseadas em suas regras de negócio!',
          color: 3447003, // Blue
          fields: [
            { name: 'Canal de Teste', value: 'Discord Webhook', inline: true },
            { name: 'Status', value: '🟢 Operando em Alta Performance', inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      });
      discordSent = true;
    }

    // Send Telegram test message
    if (telegramToken && telegramChatId) {
      const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      await axios.post(telegramUrl, {
        chat_id: telegramChatId,
        text: `✈️ *TESTE DE CONEXÃO - RADAR DE OPORTUNIDADES*\n\nParabéns! Se seu bot do Telegram está ativo, o envio está operando com sucesso.`,
        parse_mode: 'Markdown'
      });
      telegramSent = true;
    }

    res.json({
      success: true,
      message: 'Alerta de teste disparado com sucesso.',
      channels: { discord: discordSent, telegram: telegramSent }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start service
const startServer = async () => {
  await initDb();
  
  app.listen(PORT, () => {
    console.log(`📡 Servidor Express operando na porta: http://localhost:${PORT}`);
  });

  // Start the intelligent scheduler thread
  startScheduler();
};

startServer();
