import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ComboViewer from './components/ComboViewer';
import Analytics from './components/Analytics';
import History from './components/History';
import Settings from './components/Settings';
import axios from 'axios';

interface RouteSummary {
  current: number | null;
  currentScore: number | null;
  min: number;
  max: number;
  avg: number;
  airline: string;
  origin: string;
  recommendation: string;
}

interface AnalyticsData {
  summary: {
    ida: RouteSummary;
    volta: RouteSummary;
  };
  timeline: any[];
  airports: any[];
  platforms: any[];
  heatmap: any[];
}

const BACKEND_BASE = 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [isScraping, setIsScraping] = useState<boolean>(false);

  // Core Data States
  const [serverStatus, setServerStatus] = useState<any>({
    status: 'OFFLINE',
    aggressiveMode: false,
    lastScrapedAt: 'Carregando...',
    databaseRecords: 0,
    totalAlertsSent: 0
  });

  const [prices, setPrices] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>({
    ida: null,
    volta: null
  });

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    summary: {
      ida: { current: null, currentScore: null, min: 0, max: 0, avg: 0, airline: '...', origin: '...', recommendation: '...' },
      volta: { current: null, currentScore: null, min: 0, max: 0, avg: 0, airline: '...', origin: '...', recommendation: '...' }
    },
    timeline: [],
    airports: [],
    platforms: [],
    heatmap: []
  });

  // Pull All Data from REST endpoints
  const fetchAllData = async () => {
    try {
      const [statusRes, pricesRes, analyticsRes, predRes] = await Promise.all([
        axios.get(`${BACKEND_BASE}/api/status`),
        axios.get(`${BACKEND_BASE}/api/prices?limit=150`),
        axios.get(`${BACKEND_BASE}/api/analytics`),
        axios.get(`${BACKEND_BASE}/api/predictions`)
      ]);

      setServerStatus(statusRes.data);
      setPrices(pricesRes.data);
      setAnalytics(analyticsRes.data);
      setPredictions(predRes.data);
      setServerOnline(true);
    } catch (err: any) {
      console.warn('⚠️ Conexão falhou com o servidor de monitoramento:', err.message);
      setServerOnline(false);
    }
  };

  // Setup loop polling every 6 seconds
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Trigger manual Playwright scrape
  const handleTriggerScrape = async () => {
    if (isScraping) return;
    setIsScraping(true);
    
    try {
      await axios.post(`${BACKEND_BASE}/api/scrape/trigger`);
      await fetchAllData(); // reload immediately
    } catch (err: any) {
      console.error('❌ Falha ao acionar varredura:', err.message);
    } finally {
      setIsScraping(false);
    }
  };

  // Toggle Aggressive monitoring mode in DB settings
  const handleToggleAggressiveMode = async () => {
    try {
      const nextMode = !serverStatus.aggressiveMode;
      await axios.post(`${BACKEND_BASE}/api/settings`, { aggressive_mode: nextMode });
      // update status locally immediately
      setServerStatus((prev: any) => ({ ...prev, aggressiveMode: nextMode }));
      fetchAllData();
    } catch (err: any) {
      console.error('❌ Falha ao alterar modo agressivo:', err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-trading-bg">
      {/* Side Navigation panel */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        serverOnline={serverOnline}
        aggressiveMode={serverStatus.aggressiveMode}
        onToggleAggressiveMode={handleToggleAggressiveMode}
        lastScraped={serverStatus.lastScrapedAt}
      />

      {/* Main Content Pane */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {/* Offline Warning Banner */}
        {!serverOnline && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 px-5 py-3 rounded-2xl flex items-center justify-between text-trading-red animate-pulse text-xs">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-trading-red rounded-full"></span>
              <span className="font-semibold uppercase tracking-wider">CONEXÃO INSTÁVEL:</span>
              <span>O servidor de monitoramento Express está offline ou inicializando na porta 5000. Tentando restabelecer conexão...</span>
            </div>
            <span className="text-[10px] font-bold">PORT 5000</span>
          </div>
        )}

        {/* Tab Switcher routers */}
        {activeTab === 'dashboard' && (
          <Dashboard
            summary={analytics.summary}
            lastScrapedAt={serverStatus.lastScrapedAt}
            isScraping={isScraping}
            onTriggerScrape={handleTriggerScrape}
            prices={prices}
          />
        )}

        {activeTab === 'combo' && (
          <ComboViewer />
        )}

        {activeTab === 'analytics' && (
          <Analytics 
            analytics={analytics} 
            predictions={predictions} 
          />
        )}

        {activeTab === 'history' && (
          <History 
            prices={prices} 
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            serverStatus={serverStatus} 
            onRefreshStatus={fetchAllData} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
