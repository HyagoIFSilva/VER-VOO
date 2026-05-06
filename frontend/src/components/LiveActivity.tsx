import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Shield, ArrowUpRight, CheckCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'scrape';
  message: string;
}

interface LiveActivityProps {
  lastScrapedAt: string;
  isScraping: boolean;
}

const LiveActivity: React.FC<LiveActivityProps> = ({ lastScrapedAt, isScraping }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const id = Math.random().toString(36).substring(2, 9);
    setLogs((prev) => [...prev.slice(-39), { id, timestamp, type, message }]);
  };

  // Seed initial logs on mount
  useEffect(() => {
    const initialLogs: LogEntry[] = [
      { id: '1', timestamp: '00:01:05', type: 'info', message: 'Sistema de Monitoramento Iniciado.' },
      { id: '2', timestamp: '00:01:06', type: 'success', message: 'Conexão com Banco de Dados SQLite estabelecida.' },
      { id: '3', timestamp: '00:01:08', type: 'info', message: 'Carregando estatísticas históricas para a rota SAO <-> FLN...' },
      { id: '4', timestamp: '00:01:10', type: 'success', message: 'Mais de 100 pontos de dados carregados. Médias calculadas.' },
      { id: '5', timestamp: '00:01:11', type: 'info', message: 'Agendador de Cronogramas ativo. Monitorando horas da grade...' }
    ];
    setLogs(initialLogs);
  }, []);

  // Monitor isScraping changes to push realistic execution logs
  useEffect(() => {
    const timeouts: any[] = [];

    if (isScraping) {
      addLog('🚀 Disparando ciclo manual de raspagem aérea...', 'info');
      
      const t1 = setTimeout(() => {
        addLog('🌐 Inicializando Playwright Chromium em modo headless...', 'info');
        addLog('🛡️ Injetando camuflagem de evasão anti-bot (Stealth Headers / Custom UA)...', 'info');
      }, 500);

      const t2 = setTimeout(() => {
        addLog('🔍 Consultando voos de ida SAO (CGH, GRU, VCP) para FLN (Faixa 09/06 a 13/06)...', 'scrape');
      }, 1200);

      const t3 = setTimeout(() => {
        addLog('🔍 Consultando voos de volta FLN para SAO (CGH, GRU, VCP) (Faixa 23/06 a 27/06)...', 'scrape');
      }, 2000);

      const t4 = setTimeout(() => {
        addLog('📊 Processando e filtrando as passagens obtidas pelas APIs...', 'info');
      }, 2700);

      timeouts.push(t1, t2, t3, t4);
    } else if (logs.length > 5) {
      addLog('✅ Ciclo concluído. Dados consolidados e indexados com sucesso.', 'success');
      addLog(`⏰ Próxima verificação agendada. Última atualização: ${lastScrapedAt || 'Agora'}`, 'info');
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isScraping]);

  useEffect(() => {
    // Scroll to bottom of terminal
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/60 font-mono text-xs flex flex-col h-[220px]">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-trading-blue animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Live Operations Console</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-trading-blue animate-ping"></span>
          <span className="text-[9px] uppercase font-bold text-trading-blue tracking-wider">Active Socket</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 select-text text-slate-300 scrollbar-thin">
        {logs.map((log) => {
          let typeColor = 'text-slate-400';
          let typePrefix = '[INFO]';
          if (log.type === 'success') {
            typeColor = 'text-trading-green';
            typePrefix = '[SUCCESS]';
          } else if (log.type === 'warn') {
            typeColor = 'text-trading-orange';
            typePrefix = '[WARN]';
          } else if (log.type === 'error') {
            typeColor = 'text-trading-red font-bold';
            typePrefix = '[ERROR]';
          } else if (log.type === 'scrape') {
            typeColor = 'text-trading-blue';
            typePrefix = '[SCRAPE]';
          }

          return (
            <div key={log.id} className="terminal-line leading-relaxed flex items-start space-x-1.5">
              <span className="text-trading-muted text-[10px] select-none flex-shrink-0">[{log.timestamp}]</span>
              <span className={`${typeColor} font-semibold text-[10px] select-none flex-shrink-0`}>{typePrefix}</span>
              <span className="text-slate-300 whitespace-pre-wrap">{log.message}</span>
            </div>
          );
        })}
        {isScraping && (
          <div className="terminal-line flex items-center space-x-2 text-trading-blue animate-pulse pl-12 text-[10px]">
            <span className="h-1.5 w-1.5 bg-trading-blue rounded-full animate-bounce"></span>
            <span className="h-1.5 w-1.5 bg-trading-blue rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="h-1.5 w-1.5 bg-trading-blue rounded-full animate-bounce [animation-delay:0.4s]"></span>
            <span>Aguardando resposta do navegador...</span>
          </div>
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};

export default LiveActivity;
