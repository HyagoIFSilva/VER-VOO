import React from 'react';
import { LayoutDashboard, BarChart3, History, Settings, Plane, Flame, ShieldCheck, ShieldAlert, Layers } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  serverOnline: boolean;
  aggressiveMode: boolean;
  onToggleAggressiveMode: () => void;
  lastScraped: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  serverOnline,
  aggressiveMode,
  onToggleAggressiveMode,
  lastScraped
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'combo', label: 'Combo de Viagem', icon: Layers },
    { id: 'analytics', label: 'Análise Avançada', icon: BarChart3 },
    { id: 'history', label: 'Histórico de Voos', icon: History },
    { id: 'settings', label: 'Alertas & Ajustes', icon: Settings }
  ];

  return (
    <aside className="w-64 border-r border-slate-800/60 bg-slate-950/80 p-6 flex flex-col justify-between h-screen sticky top-0">
      <div className="space-y-8">
        {/* Logo / Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-trading-blue/15 p-2 rounded-xl border border-trading-blue/30 animate-pulse-slow">
            <Plane className="h-6 w-6 text-trading-blue transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-white via-slate-200 to-trading-blue bg-clip-text text-transparent">
              RADAR VOO
            </h1>
            <p className="text-[10px] text-trading-muted font-mono tracking-widest uppercase">
              AGRESSIVE HUNTER
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-trading-blue/20 to-transparent text-white border-l-2 border-trading-blue'
                    : 'text-trading-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-trading-blue' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Details: Server Status and Aggressive mode */}
      <div className="space-y-5 border-t border-slate-800/60 pt-6">
        {/* Aggressive Mode Panel */}
        <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-2xl flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className={`h-4 w-4 ${aggressiveMode ? 'text-trading-red animate-bounce' : 'text-trading-muted'}`} />
              <span className="text-xs font-semibold text-slate-200">Modo Agressivo</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={aggressiveMode}
                onChange={onToggleAggressiveMode}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-trading-red peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
            </label>
          </div>
          <p className="text-[10px] text-trading-muted leading-relaxed">
            {aggressiveMode 
              ? 'Verificações agressivas de preços agendadas a cada 10 minutos.' 
              : 'Verificando em horários programados. Ative para loop de 10 min.'
            }
          </p>
        </div>

        {/* Server status indicator */}
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-trading-muted">Status do Motor:</span>
          {serverOnline ? (
            <div className="flex items-center space-x-1.5 text-trading-green font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trading-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-trading-green"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wide font-semibold">ON</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-trading-red font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trading-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-trading-red"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wide font-semibold">OFF</span>
            </div>
          )}
        </div>

        <div className="px-2 text-[10px] text-trading-muted font-mono leading-none flex flex-col space-y-1">
          <span>Último Scrape:</span>
          <span className="text-slate-300 truncate">{lastScraped}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
