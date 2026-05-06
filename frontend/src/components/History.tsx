import React, { useState } from 'react';
import { Download, Search, Filter, Camera, X, ExternalLink, Calendar, RefreshCcw } from 'lucide-react';

interface FlightRecord {
  id: number;
  direction: 'IDA' | 'VOLTA';
  origin: string;
  destination: string;
  departure_date: string;
  price: number;
  airline: string;
  stops: number;
  baggage_included: number;
  duration: string;
  score: number;
  recommendation: string;
  screenshot_path: string | null;
  source: string;
  link: string;
  scraped_at: string;
}

interface HistoryProps {
  prices: FlightRecord[];
}

const History: React.FC<HistoryProps> = ({ prices = [] }) => {
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [filterAirline, setFilterAirline] = useState<string>('ALL');
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(1300);
  
  // Modal State for Screenshot Proof Lightbox
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedFlightInfo, setSelectedFlightInfo] = useState<string>('');

  // 1. Filtering Logic
  const filteredPrices = prices.filter((item) => {
    const matchesDirection = filterDirection === 'ALL' || item.direction === filterDirection;
    const matchesOrigin = filterOrigin === 'ALL' || item.origin === filterOrigin;
    const matchesAirline = filterAirline === 'ALL' || item.airline === filterAirline;
    const matchesPrice = item.price <= filterMaxPrice;
    return matchesDirection && matchesOrigin && matchesAirline && matchesPrice;
  });

  // 2. CSV Export Engine
  const handleExportCSV = () => {
    if (filteredPrices.length === 0) return;
    
    const headers = ['ID', 'Direcao', 'Origem', 'Destino', 'Data Voo', 'Preco (R$)', 'Companhia', 'Paradas', 'Bagagem', 'Score', 'Recomendacao', 'Fonte', 'Link', 'Data Consulta'];
    const rows = filteredPrices.map((item) => [
      item.id,
      item.direction,
      item.origin,
      item.destination,
      item.departure_date,
      item.price,
      item.airline,
      item.stops,
      item.baggage_included ? 'Sim' : 'Nao',
      item.score,
      item.recommendation,
      item.source,
      item.link,
      item.scraped_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `radar_historico_voos_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (score >= 75) return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    if (score >= 50) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Histórico Geral de Consultas</span>
          </h2>
          <p className="text-xs text-trading-muted mt-0.5">Filtre, verifique capturas de tela das oportunidades e exporte logs em CSV.</p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredPrices.length === 0}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Filtro em CSV</span>
        </button>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Filter Direction */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider">Direção</label>
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-trading-blue/50"
          >
            <option value="ALL">Todas as Direções</option>
            <option value="IDA">Ida (SAO ➡️ FLN)</option>
            <option value="VOLTA">Volta (FLN ➡️ SAO)</option>
          </select>
        </div>

        {/* Filter Origin Airport */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider">Aeroporto Partida</label>
          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-trading-blue/50"
          >
            <option value="ALL">Todos os Aeroportos</option>
            <option value="CGH">Congonhas (CGH)</option>
            <option value="GRU">Guarulhos (GRU)</option>
            <option value="VCP">Campinas (VCP)</option>
            <option value="FLN">Florianópolis (FLN)</option>
          </select>
        </div>

        {/* Filter Airline */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider">Companhia Aérea</label>
          <select
            value={filterAirline}
            onChange={(e) => setFilterAirline(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-trading-blue/50"
          >
            <option value="ALL">Todas as Cias</option>
            <option value="LATAM">LATAM</option>
            <option value="GOL">GOL</option>
            <option value="AZUL">Azul</option>
          </select>
        </div>

        {/* Slider Price range */}
        <div className="space-y-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider">Preço Máximo</label>
            <span className="text-xs font-mono font-bold text-trading-blue">R$ {filterMaxPrice}</span>
          </div>
          <input
            type="range"
            min="580"
            max="1300"
            value={filterMaxPrice}
            onChange={(e) => setFilterMaxPrice(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-trading-blue"
          />
        </div>
      </div>

      {/* Main Table view */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800/80 text-trading-muted uppercase tracking-wider text-[10px] font-bold">
                <th className="p-4">Rota</th>
                <th className="p-4">Tarifa</th>
                <th className="p-4">Companhia</th>
                <th className="p-4">Escalas / Bagagem</th>
                <th className="p-4">Análise</th>
                <th className="p-4">Data Consulta</th>
                <th className="p-4 text-center">Screenshot</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
              {filteredPrices.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="p-4">
                    <div className="flex items-center space-x-2.5 font-sans">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        row.direction === 'IDA' ? 'bg-trading-blue/10 text-trading-blue' : 'bg-trading-orange/10 text-trading-orange'
                      }`}>
                        {row.direction}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {row.origin} ➡️ {row.destination}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-white text-sm">
                    R$ {Math.round(row.price)}
                  </td>
                  <td className="p-4 font-sans font-medium text-slate-300">
                    {row.airline}
                  </td>
                  <td className="p-4 font-sans text-trading-muted text-[11px]">
                    <div className="flex flex-col space-y-0.5">
                      <span>{row.stops === 0 ? 'Direto' : `${row.stops} parada(s)`}</span>
                      <span>Bagagem: {row.baggage_included ? 'Inclusa' : 'Não inclusa'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getScoreBadgeClass(row.score)}`}>
                      Score {row.score}
                    </span>
                  </td>
                  <td className="p-4 text-trading-muted text-[11px]">
                    {row.scraped_at ? row.scraped_at.replace(' ', ' - ') : '---'}
                  </td>
                  <td className="p-4 text-center">
                    {row.screenshot_path ? (
                      <button
                        onClick={() => {
                          // Standard server base URL path fallback
                          setSelectedScreenshot(`http://localhost:5000${row.screenshot_path}`);
                          setSelectedFlightInfo(`${row.origin} ➡️ ${row.destination} (${row.airline}) - R$ ${Math.round(row.price)}`);
                        }}
                        className="p-2 bg-trading-blue/10 hover:bg-trading-blue/20 rounded-lg border border-trading-blue/20 transition group"
                        title="Ver Prova Visual"
                      >
                        <Camera className="h-4 w-4 text-trading-blue group-hover:scale-110 transition" />
                      </button>
                    ) : (
                      <span className="text-slate-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <a
                      href={row.link || 'https://www.google.com/travel/flights'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-300 hover:text-white transition font-sans"
                    >
                      <span>Ir</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
              {filteredPrices.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-trading-muted font-sans text-xs">
                    Nenhuma tarifa atende aos critérios dos filtros ativos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Proof Modal Overlay */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel max-w-4xl w-full rounded-3xl border border-slate-700/50 bg-slate-950 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
              <Camera className="h-5 w-5 text-trading-blue" />
              <div>
                <h4 className="text-sm font-semibold text-white">Prova Visual de Oportunidade</h4>
                <p className="text-[10px] text-trading-muted font-mono">{selectedFlightInfo}</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 max-h-[500px] flex items-center justify-center relative">
              {/* If is mock, show a premium cyber flyer representing ticket info */}
              {selectedScreenshot.includes('mock') ? (
                <div className="py-20 px-10 text-center space-y-6 flex flex-col items-center justify-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl text-trading-green animate-pulse flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest">Screenshot Simulada com Sucesso</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-4xl font-extrabold tracking-tight text-white">{selectedFlightInfo.split('(')[0]}</p>
                    <p className="text-sm text-trading-muted">Playwright automatizou o navegador e gravou a prova de compra em arquivo.</p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl px-8 py-5 text-xs text-slate-300 font-mono space-y-2">
                    <p>🌐 NAVEGADOR: Google Chrome Stealth 124.0.0.0</p>
                    <p>📸 FILEPATH: backend/public/screenshots/opportunity_id.png</p>
                    <p>⏱️ TIMING: 1h 10m voo direto | Bagagem inclusa</p>
                  </div>
                </div>
              ) : (
                <img 
                  src={selectedScreenshot} 
                  alt="Captura de Voo" 
                  className="w-full object-contain"
                  onError={(e) => {
                    // Failover if file not found on dev paths
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
