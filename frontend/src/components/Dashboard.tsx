import React, { useEffect, useState } from 'react';
import { Play, Flame, RefreshCw, ArrowDownRight, Compass, ShieldAlert, BadgePercent, Calendar, HelpCircle } from 'lucide-react';
import LiveActivity from './LiveActivity';
import confetti from 'canvas-confetti';

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

interface DashboardProps {
  summary: {
    ida: RouteSummary;
    volta: RouteSummary;
  };
  lastScrapedAt: string;
  isScraping: boolean;
  onTriggerScrape: () => void;
  prices: any[];
}

const Dashboard: React.FC<DashboardProps> = ({
  summary,
  lastScrapedAt,
  isScraping,
  onTriggerScrape,
  prices
}) => {
  const [liveTime, setLiveTime] = useState('');

  // Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Celebration trigger on low price loads
  useEffect(() => {
    if (
      (summary.ida.current && summary.ida.current <= 715) || 
      (summary.volta.current && summary.volta.current <= 715)
    ) {
      // Trigger subtle fintech celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#0ea5e9', '#10b981', '#f59e0b']
      });
    }
  }, [summary.ida.current, summary.volta.current]);

  const getScoreColorClass = (score: number | null) => {
    if (!score) return 'text-slate-400';
    if (score >= 90) return 'text-trading-green border-trading-green/20 bg-trading-green/5';
    if (score >= 75) return 'text-trading-blue border-trading-blue/20 bg-trading-blue/5';
    if (score >= 50) return 'text-trading-orange border-trading-orange/20 bg-trading-orange/5';
    return 'text-trading-red border-trading-red/20 bg-trading-red/5';
  };

  const getScoreRingClass = (score: number | null) => {
    if (!score) return 'stroke-slate-800';
    if (score >= 90) return 'stroke-emerald-500 glow-green';
    if (score >= 75) return 'stroke-sky-500 glow-blue';
    if (score >= 50) return 'stroke-amber-500 glow-orange';
    return 'stroke-rose-500 glow-red';
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Terminal Operacional de Tarifas</span>
            <span className="bg-trading-blue/10 border border-trading-blue/20 text-trading-blue text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase animate-pulse-slow">
              SAO ⇄ FLN (Jun/2026)
            </span>
          </h2>
          <p className="text-xs text-trading-muted mt-1 leading-relaxed">
            Monitorando tarifas em múltiplos canais de voo. Algoritmo calculando flutuações e desvios padrão em tempo real.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Live digital Clock */}
          <div className="hidden lg:flex flex-col items-end pr-4 border-r border-slate-800/60 font-mono">
            <span className="text-[10px] text-trading-muted tracking-widest uppercase">Hora Local</span>
            <span className="text-sm font-semibold text-slate-200">{liveTime || '00:00:00'}</span>
          </div>

          <button
            onClick={onTriggerScrape}
            disabled={isScraping}
            className={`relative flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 shadow-lg ${
              isScraping
                ? 'bg-slate-800 text-trading-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-trading-blue to-sky-600 hover:from-trading-blue hover:to-sky-500 text-white shadow-trading-blue/10 hover:shadow-trading-blue/20'
            }`}
          >
            {isScraping ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-trading-blue" />
                <span>Varrendo Canais...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Varrer Canais Agora</span>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trading-blue opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-trading-blue"></span>
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Main Flight Leg Cards (Outbound and Return) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Leg (SAO -> FLN) */}
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-trading-blue/5 rounded-full blur-2xl group-hover:bg-trading-blue/10 transition-all duration-500"></div>
          
          <div className="space-y-5">
            {/* Header route */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-trading-blue/10 border border-trading-blue/25 text-trading-blue text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  IDA
                </span>
                <span className="text-xs text-trading-muted flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> 12/06/2026
                </span>
              </div>
              <div className="text-right text-xs text-trading-muted font-mono">
                {summary.ida.origin} ➡️ FLN
              </div>
            </div>

            {/* Price display and gauge */}
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-widest text-trading-muted">Tarifa Atual Encontrada</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    R$ {summary.ida.current ? Math.round(summary.ida.current) : '---'}
                  </span>
                  <span className="text-[10px] text-trading-muted">BRL</span>
                </div>
                {/* Meta alert bounds */}
                <div className="flex items-center space-x-2 text-[10px] pt-1">
                  <span className={`px-2 py-0.5 rounded-md border ${getScoreColorClass(summary.ida.currentScore)}`}>
                    {summary.ida.recommendation}
                  </span>
                  <span className="text-trading-muted truncate">({summary.ida.airline})</span>
                </div>
              </div>

              {/* Score Gauge Ring */}
              <div className="relative flex items-center justify-center w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" className="stroke-slate-800/50 fill-none" strokeWidth="6" />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="38" 
                    className={`fill-none transition-all duration-1000 ${getScoreRingClass(summary.ida.currentScore)}`}
                    strokeWidth="6.5" 
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - (summary.ida.currentScore || 0) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-white leading-none">
                    {summary.ida.currentScore || '--'}
                  </span>
                  <span className="text-[9px] text-trading-muted font-bold tracking-widest uppercase mt-0.5">
                    SCORE
                  </span>
                </div>
              </div>
            </div>

            {/* Target price list comparing */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-800/40 pt-4 text-xs">
              <div className="bg-slate-900/35 border border-slate-800/30 p-2.5 rounded-xl">
                <p className="text-[9px] text-trading-muted font-bold tracking-wider uppercase truncate">Média de Mercado</p>
                <p className="text-sm font-semibold text-slate-200 mt-1">R$ {summary.ida.avg}</p>
              </div>
              <div className="bg-slate-900/35 border border-slate-800/30 p-2.5 rounded-xl border-emerald-500/10">
                <p className="text-[9px] text-trading-green font-bold tracking-wider uppercase truncate">Menor Histórico</p>
                <p className="text-sm font-semibold text-trading-green mt-1">R$ {summary.ida.min}</p>
              </div>
              <div className="bg-slate-900/35 border border-slate-800/30 p-2.5 rounded-xl border-rose-500/10">
                <p className="text-[9px] text-trading-red font-bold tracking-wider uppercase truncate">Maior Histórico</p>
                <p className="text-sm font-semibold text-trading-red mt-1">R$ {summary.ida.max}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Leg (FLN -> SAO) */}
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-trading-blue/5 rounded-full blur-2xl group-hover:bg-trading-blue/10 transition-all duration-500"></div>
          
          <div className="space-y-5">
            {/* Header route */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-trading-blue/10 border border-trading-blue/25 text-trading-blue text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  VOLTA
                </span>
                <span className="text-xs text-trading-muted flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> 26/06/2026
                </span>
              </div>
              <div className="text-right text-xs text-trading-muted font-mono">
                FLN ➡️ SAO ({summary.volta.origin})
              </div>
            </div>

            {/* Price display and gauge */}
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-widest text-trading-muted">Tarifa Atual Encontrada</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    R$ {summary.volta.current ? Math.round(summary.volta.current) : '---'}
                  </span>
                  <span className="text-[10px] text-trading-muted">BRL</span>
                </div>
                {/* Meta alert bounds */}
                <div className="flex items-center space-x-2 text-[10px] pt-1">
                  <span className={`px-2 py-0.5 rounded-md border ${getScoreColorClass(summary.volta.currentScore)}`}>
                    {summary.volta.recommendation}
                  </span>
                  <span className="text-trading-muted truncate">({summary.volta.airline})</span>
                </div>
              </div>

              {/* Score Gauge Ring */}
              <div className="relative flex items-center justify-center w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" className="stroke-slate-800/50 fill-none" strokeWidth="6" />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="38" 
                    className={`fill-none transition-all duration-1000 ${getScoreRingClass(summary.volta.currentScore)}`}
                    strokeWidth="6.5" 
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - (summary.volta.currentScore || 0) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-white leading-none">
                    {summary.volta.currentScore || '--'}
                  </span>
                  <span className="text-[9px] text-trading-muted font-bold tracking-widest uppercase mt-0.5">
                    SCORE
                  </span>
                </div>
              </div>
            </div>

            {/* Target price list comparing */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-800/40 pt-4 text-xs">
              <div className="bg-slate-900/35 border border-slate-800/30 p-2.5 rounded-xl">
                <p className="text-[9px] text-trading-muted font-bold tracking-wider uppercase truncate">Média de Mercado</p>
                <p className="text-sm font-semibold text-slate-200 mt-1">R$ {summary.volta.avg}</p>
              </div>
              <div className="bg-slate-900/35 border border-slate-800/30 p-2.5 rounded-xl border-emerald-500/10">
                <p className="text-[9px] text-trading-green font-bold tracking-wider uppercase truncate">Menor Histórico</p>
                <p className="text-sm font-semibold text-trading-green mt-1">R$ {summary.volta.min}</p>
              </div>
              <div className="bg-slate-900/35 border border-slate-800/30 p-2.5 rounded-xl border-rose-500/10">
                <p className="text-[9px] text-trading-red font-bold tracking-wider uppercase truncate">Maior Histórico</p>
                <p className="text-sm font-semibold text-trading-red mt-1">R$ {summary.volta.max}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Terminal + Recent Alerts logs list */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Console column */}
        <div className="xl:col-span-2">
          <LiveActivity lastScrapedAt={lastScrapedAt} isScraping={isScraping} />
        </div>

        {/* Alerts Column */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between h-[220px]">
          <div className="border-b border-slate-800/80 pb-2.5 mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-trading-red" />
              <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Alarmes de Quedas</span>
            </div>
            <span className="text-[9px] font-semibold text-trading-muted font-mono">Últimos Alertas</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin text-xs">
            {prices.filter(p => p.score >= 75).slice(0, 4).map((alert, idx) => (
              <div 
                key={alert.id || idx}
                className="bg-slate-900/50 border border-slate-800/40 px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 hover:border-trading-red/25 transition-all"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      alert.direction === 'IDA' ? 'bg-trading-blue/10 text-trading-blue' : 'bg-trading-orange/10 text-trading-orange'
                    }`}>
                      {alert.direction}
                    </span>
                    <span className="text-[10px] text-trading-muted font-mono truncate">
                      {alert.origin} ➡️ {alert.destination}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium font-mono">
                    R$ {Math.round(alert.price)} <span className="text-[10px] text-trading-muted font-normal">({alert.airline})</span>
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    alert.score >= 90 ? 'bg-trading-green/10 text-trading-green' : 'bg-trading-blue/10 text-trading-blue'
                  }`}>
                    Score {alert.score}
                  </span>
                  <span className="text-[9px] text-trading-muted mt-1 font-mono">
                    {alert.scraped_at ? alert.scraped_at.substring(11, 16) : '--:--'}
                  </span>
                </div>
              </div>
            ))}
            {prices.filter(p => p.score >= 75).length === 0 && (
              <div className="text-center py-6 text-trading-muted text-xs">
                Nenhum sinal crítico disparado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
