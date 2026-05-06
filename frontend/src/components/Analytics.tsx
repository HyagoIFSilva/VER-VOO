import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { Sparkles, TrendingDown, Eye, Lightbulb, Clock, Info } from 'lucide-react';

interface AnalyticsProps {
  analytics: {
    summary: any;
    timeline: any[];
    airports: any[];
    platforms: any[];
    heatmap: any[];
  };
  predictions: {
    ida: any;
    volta: any;
  };
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS_AXIS = [0, 1, 5, 7, 12, 15, 18, 21];

const Analytics: React.FC<AnalyticsProps> = ({ analytics, predictions }) => {
  const [selectedDirection, setSelectedDirection] = useState<'IDA' | 'VOLTA'>('IDA');

  // Filter timeline records for the selected direction
  const rawTimeline = analytics.timeline || [];
  const chartData = rawTimeline
    .filter(item => item.direction === selectedDirection)
    .map(item => {
      const date = new Date(item.scraped_at);
      const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return {
        timestamp: formattedDate,
        'Preço Mínimo': Math.round(item.min_price),
        'Média Móvel': Math.round(item.avg_price)
      };
    });

  // Prepare airport comparison data
  const rawAirports = analytics.airports || [];
  const airportData = rawAirports
    .filter(item => item.direction === selectedDirection)
    .map(item => ({
      name: item.origin,
      'Preço Médio': Math.round(item.avg_price),
      'Menor Tarifa': Math.round(item.min_price)
    }));

  // Prepare platform comparison data
  const rawPlatforms = analytics.platforms || [];
  const platformData = rawPlatforms.map(item => ({
    name: item.source,
    'Preço Médio': Math.round(item.avg_price),
    'Menor Tarifa': Math.round(item.min_price)
  }));

  // Fetch target prediction
  const activePrediction = selectedDirection === 'IDA' ? predictions.ida : predictions.volta;

  // Render heat color depending on price range
  const getHeatColor = (price: number | null) => {
    if (!price) return 'bg-slate-900/20 text-slate-800';
    if (price <= 700) return 'bg-emerald-500/80 text-white glow-green';
    if (price <= 820) return 'bg-sky-500/60 text-slate-100';
    if (price <= 920) return 'bg-amber-500/40 text-amber-200';
    return 'bg-rose-500/10 text-rose-300';
  };

  // Helper matrix generator for the heatmap representation
  const getHeatmapPrice = (dayIndex: number, hour: number) => {
    const rawHeat = analytics.heatmap || [];
    const record = rawHeat.find(r => r.day_of_week === dayIndex && r.hour_of_day === hour);
    return record ? Math.round(record.min_price) : null;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Tab Toggles */}
      <div className="flex items-center justify-between border-b border-slate-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Inteligência de Mercado</span>
            <Sparkles className="h-4.5 w-4.5 text-trading-blue animate-pulse" />
          </h2>
          <p className="text-xs text-trading-muted mt-0.5">Analise gráficos temporais, heatmap de tarifas e previsões analíticas.</p>
        </div>

        <div className="bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 flex space-x-1">
          <button
            onClick={() => setSelectedDirection('IDA')}
            className={`px-4.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              selectedDirection === 'IDA'
                ? 'bg-trading-blue text-white shadow-lg shadow-trading-blue/15'
                : 'text-trading-muted hover:text-white'
            }`}
          >
            Ida (SAO ➡️ FLN)
          </button>
          <button
            onClick={() => setSelectedDirection('VOLTA')}
            className={`px-4.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              selectedDirection === 'VOLTA'
                ? 'bg-trading-blue text-white shadow-lg shadow-trading-blue/15'
                : 'text-trading-muted hover:text-white'
            }`}
          >
            Volta (FLN ➡️ SAO)
          </button>
        </div>
      </div>

      {/* Main Grid: Temporal Graph & Predictions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="glass-panel p-5 rounded-2xl xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Gráfico Histórico de Tarifação</h3>
            <span className="text-[10px] text-trading-muted font-mono uppercase">Timeline de Coleta</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} domain={['auto', 'auto']} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#091120', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Area type="monotone" dataKey="Preço Mínimo" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMin)" />
                <Area type="monotone" dataKey="Média Móvel" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorAvg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Predictive Panel */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-trading-blue/5 rounded-full blur-2xl group-hover:bg-trading-blue/10 transition-all"></div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-trading-orange animate-bounce" />
              <h3 className="text-sm font-semibold text-slate-200">Insights de Inteligência Preditiva</h3>
            </div>

            {/* Odds dials */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/60 p-3.5 rounded-xl text-center">
                <span className="text-[10px] text-trading-muted font-bold tracking-wider uppercase">Chance de Queda</span>
                <p className="text-2xl font-black text-trading-green mt-1">
                  {activePrediction?.changeProbabilityDown || 45}%
                </p>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-trading-green h-full rounded-full" style={{ width: `${activePrediction?.changeProbabilityDown || 45}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/60 p-3.5 rounded-xl text-center">
                <span className="text-[10px] text-trading-muted font-bold tracking-wider uppercase">Chance de Alta</span>
                <p className="text-2xl font-black text-trading-red mt-1">
                  {activePrediction?.changeProbabilityUp || 35}%
                </p>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-trading-red h-full rounded-full" style={{ width: `${activePrediction?.changeProbabilityUp || 35}%` }}></div>
                </div>
              </div>
            </div>

            {/* Explanation box */}
            <div className="bg-slate-900/30 border border-slate-800/40 p-4 rounded-xl space-y-1.5">
              <p className="text-[10px] text-trading-muted font-bold uppercase tracking-wider flex items-center">
                <Clock className="h-3 w-3 mr-1 text-trading-blue" /> Janela Estatística
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {activePrediction?.recommendedWindow}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl flex items-start space-x-2.5">
            <Info className="h-4.5 w-4.5 text-trading-blue flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
              {activePrediction?.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Heatmap + Comparatives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap Grid */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Heatmap de Melhores Horários (Tarifa Mínima)</h3>
            <span className="text-[9px] text-trading-muted font-bold uppercase tracking-widest">Matriz de Otimização</span>
          </div>

          {/* Matrix render */}
          <div className="space-y-1.5 overflow-x-auto select-none">
            <div className="grid grid-cols-9 gap-1.5 text-center text-[9px] text-trading-muted font-bold pb-1 min-w-[340px]">
              <div>D/H</div>
              {HOURS_AXIS.map(h => <div key={h}>{h}h</div>)}
            </div>

            {DAYS_OF_WEEK.map((day, dIdx) => (
              <div key={day} className="grid grid-cols-9 gap-1.5 items-center min-w-[340px]">
                <div className="text-[9px] font-bold text-trading-muted text-left">{day}</div>
                {HOURS_AXIS.map(hour => {
                  const val = getHeatmapPrice(dIdx, hour);
                  return (
                    <div 
                      key={hour}
                      className={`h-7 rounded-md text-[9px] font-mono font-bold flex items-center justify-center transition-all ${getHeatColor(val)}`}
                      title={`${day} às ${hour}h - Tarifa: ${val ? 'R$ ' + val : 'Sem dados'}`}
                    >
                      {val ? `R$${val}` : '--'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-end space-x-4 text-[9px] font-semibold text-trading-muted pt-2 border-t border-slate-800/20">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/80"></span>
              <span>Excelente (≤ R$700)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-sky-500/60"></span>
              <span>Bom (≤ R$820)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/40"></span>
              <span>Aceitável (≤ R$920)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/10 border border-rose-500/10"></span>
              <span>Ruim (﹥ R$950)</span>
            </div>
          </div>
        </div>

        {/* Airport and Platform comparisons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Airport comparing */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200">Aeroportos de Partida (Média)</h3>
              <span className="text-[9px] text-trading-muted font-mono uppercase">CGH | GRU | VCP</span>
            </div>

            <div className="h-[140px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={airportData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#091120', borderColor: '#1e293b', fontSize: '10px' }} />
                  <Bar dataKey="Preço Médio" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                    {airportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : (index === 1 ? '#0ea5e9' : '#f59e0b')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform comparing */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200">Comparativo entre Portais</h3>
              <span className="text-[9px] text-trading-muted font-mono uppercase">Google | Sky | Decolar | Kayak</span>
            </div>

            <div className="h-[140px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#091120', borderColor: '#1e293b', fontSize: '10px' }} />
                  <Bar dataKey="Preço Médio" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
