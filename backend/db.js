import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database.sqlite');

// Open the SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco de dados SQLite:', err.message);
  } else {
    console.log('⚡ Conectado com sucesso ao banco de dados SQLite.');
  }
});

// Helper to run query with Promise
export const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Helper to get all rows with Promise
export const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to get a single row with Promise
export const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize database schema
export const initDb = async () => {
  // Create prices table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT CHECK(direction IN ('IDA', 'VOLTA')),
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      price REAL NOT NULL,
      airline TEXT,
      stops INTEGER DEFAULT 0,
      baggage_included INTEGER DEFAULT 0,
      duration TEXT,
      score INTEGER DEFAULT 50,
      recommendation TEXT,
      screenshot_path TEXT,
      source TEXT NOT NULL,
      link TEXT,
      scraped_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // Create alerts table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price_id INTEGER,
      direction TEXT,
      previous_price REAL,
      new_price REAL,
      score INTEGER,
      triggered_at TEXT DEFAULT (datetime('now', 'localtime')),
      channels_sent TEXT,
      FOREIGN KEY(price_id) REFERENCES prices(id)
    )
  `);

  // Create settings table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Indexing for faster charts and search
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_prices_scraped ON prices(scraped_at)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_prices_score ON prices(score)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_prices_route ON prices(origin, destination)`);

  // Default Settings Init
  const settingsCount = await dbGet(`SELECT COUNT(*) as count FROM settings`);
  if (settingsCount.count === 0) {
    await dbRun(`INSERT INTO settings (key, value) VALUES ('aggressive_mode', '0')`);
    await dbRun(`INSERT INTO settings (key, value) VALUES ('discord_webhook', ?)`, [process.env.DISCORD_WEBHOOK_URL || '']);
    await dbRun(`INSERT INTO settings (key, value) VALUES ('telegram_token', ?)`, [process.env.TELEGRAM_BOT_TOKEN || '']);
    await dbRun(`INSERT INTO settings (key, value) VALUES ('telegram_chat_id', ?)`, [process.env.TELEGRAM_CHAT_ID || '']);
    await dbRun(`INSERT INTO settings (key, value) VALUES ('last_scraped_at', '')`);
    await dbRun(`INSERT INTO settings (key, value) VALUES ('last_combo_alert_price', '999999')`);
    console.log('⚙️ Configurações iniciais inseridas no banco de dados (sincronizadas com .env).');
  }

  // Load and sync database settings with process.env on boot
  const dbDiscord = await dbGet(`SELECT value FROM settings WHERE key = 'discord_webhook'`);
  const dbTelegramToken = await dbGet(`SELECT value FROM settings WHERE key = 'telegram_token'`);
  const dbTelegramChatId = await dbGet(`SELECT value FROM settings WHERE key = 'telegram_chat_id'`);

  if (dbDiscord?.value) process.env.DISCORD_WEBHOOK_URL = dbDiscord.value;
  if (dbTelegramToken?.value) process.env.TELEGRAM_BOT_TOKEN = dbTelegramToken.value;
  if (dbTelegramChatId?.value) process.env.TELEGRAM_CHAT_ID = dbTelegramChatId.value;
  
  console.log('🔄 Variáveis de ambiente (Discord/Telegram) re-sincronizadas com o banco SQLite.');

  // Auto Seeding if Empty
  const pricesCount = await dbGet(`SELECT COUNT(*) as count FROM prices`);
  if (pricesCount.count === 0) {
    console.log('🌱 Banco de dados vazio. Gerando dados de histórico ricos...');
    const airlines = ['LATAM', 'GOL', 'Azul'];
    const airports = ['CGH', 'GRU', 'VCP'];
    const platforms = ['Google Flights', 'Skyscanner', 'Decolar', 'Kayak'];

    const DATES_IDA = ['09/06/2026', '10/06/2026', '11/06/2026', '12/06/2026', '13/06/2026'];
    const DATES_VOLTA = ['23/06/2026', '24/06/2026', '25/06/2026', '26/06/2026', '27/06/2026'];

    // Seed 10 days of history
    for (let day = 10; day >= 0; day--) {
      const hours = [5, 12, 21];
      for (const hour of hours) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(hour, 0, 0, 0);
        // Format to SQLite compatible datetime string
        const dateStr = date.toISOString().replace('T', ' ').substring(0, 19);

        // IDA (SAO -> FLN)
        for (const depDate of DATES_IDA) {
          for (const origin of airports) {
            const dayFactor = Math.sin((10 - day) * 0.6);
            const hourFactor = hour === 5 ? -70 : (hour === 12 ? 50 : 0);
            const dateFactor = DATES_IDA.indexOf(depDate) * 15; // different price per date
            
            let price = 820 + (dayFactor * 130) + hourFactor - dateFactor + (Math.random() * 25 - 12);

            // Inject specific targets for perfect alerts demonstration
            if (day === 8 && hour === 5 && origin === 'CGH' && depDate === '11/06/2026') price = 614; // All-time low
            if (day === 5 && origin === 'GRU' && depDate === '12/06/2026') price = 699; // Excellent
            if (day === 2 && origin === 'VCP' && depDate === '09/06/2026') price = 998; // Spike
            if (day === 0 && hour === 5 && origin === 'CGH' && depDate === '12/06/2026') price = 712; // Live Opportunity

            price = Math.round(Math.max(580, Math.min(1250, price)));

            let score = 50;
            let rec = 'PREÇO ACEITÁVEL';
            if (price <= 700) { score = 95; rec = 'COMPRAR IMEDIATAMENTE'; }
            else if (price <= 820) { score = 80; rec = 'OPORTUNIDADE BOA'; }
            else if (price <= 920) { score = 60; rec = 'PREÇO ACEITÁVEL'; }
            else { score = 20; rec = 'PREÇO RUIM'; }

            await dbRun(`
              INSERT INTO prices (direction, origin, destination, departure_date, price, airline, stops, baggage_included, duration, score, recommendation, source, link, scraped_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              'IDA', origin, 'FLN', depDate, price, 
              airlines[Math.floor(Math.random() * airlines.length)],
              Math.random() > 0.85 ? 1 : 0,
              Math.random() > 0.5 ? 1 : 0,
              '1h 10m', score, rec, 
              platforms[Math.floor(Math.random() * platforms.length)],
              'https://www.google.com/travel/flights', dateStr
            ]);
          }
        }

        // VOLTA (FLN -> SAO)
        for (const retDate of DATES_VOLTA) {
          for (const destination of airports) {
            const dayFactor = Math.cos((10 - day) * 0.6);
            const hourFactor = hour === 5 ? -60 : (hour === 12 ? 40 : 0);
            const dateFactor = DATES_VOLTA.indexOf(retDate) * 12; // different price per date
            
            let price = 810 + (dayFactor * 120) + hourFactor - dateFactor + (Math.random() * 25 - 12);

            if (day === 7 && hour === 5 && destination === 'CGH' && retDate === '25/06/2026') price = 614;
            if (day === 4 && destination === 'GRU' && retDate === '26/06/2026') price = 699;
            if (day === 1 && destination === 'VCP' && retDate === '23/06/2026') price = 998;

            price = Math.round(Math.max(580, Math.min(1250, price)));

            let score = 50;
            let rec = 'PREÇO ACEITÁVEL';
            if (price <= 700) { score = 95; rec = 'COMPRAR IMEDIATAMENTE'; }
            else if (price <= 820) { score = 80; rec = 'OPORTUNIDADE BOA'; }
            else if (price <= 920) { score = 60; rec = 'PREÇO ACEITÁVEL'; }
            else { score = 20; rec = 'PREÇO RUIM'; }

            await dbRun(`
              INSERT INTO prices (direction, origin, destination, departure_date, price, airline, stops, baggage_included, duration, score, recommendation, source, link, scraped_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              'VOLTA', 'FLN', destination, retDate, price, 
              airlines[Math.floor(Math.random() * airlines.length)],
              Math.random() > 0.85 ? 1 : 0,
              Math.random() > 0.5 ? 1 : 0,
              '1h 15m', score, rec, 
              platforms[Math.floor(Math.random() * platforms.length)],
              'https://www.google.com/travel/flights', dateStr
            ]);
          }
        }
      }
    }
    console.log('🌱 Seeding completo. Banco de dados inicializado com histórico completo.');
  }

  console.log('✅ Banco de dados inicializado com sucesso.');
};

export default db;
