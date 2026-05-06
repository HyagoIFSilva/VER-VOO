import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertTriangle, HelpCircle, BellRing, Settings2 } from 'lucide-react';
import axios from 'axios';

interface SettingsProps {
  serverStatus: any;
  onRefreshStatus: () => void;
}

const Settings: React.FC<SettingsProps> = ({ serverStatus, onRefreshStatus }) => {
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load existing configuration on start
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/settings');
        setDiscordWebhook(response.data.discord_webhook || '');
        setTelegramToken(response.data.telegram_token || '');
        setTelegramChatId(response.data.telegram_chat_id || '');
      } catch (err: any) {
        console.warn('⚠️ Falha ao ler configurações iniciais:', err.message);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await axios.post('http://localhost:5000/api/settings', {
        discord_webhook: discordWebhook,
        telegram_token: telegramToken,
        telegram_chat_id: telegramChatId,
        whatsapp_phone: whatsappPhone
      });
      
      setSaveSuccess(true);
      onRefreshStatus();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error: any) {
      console.error('❌ Falha ao salvar configurações:', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Diagnostic webhook test trigger
  const handleTestAlert = async () => {
    if (!discordWebhook && !telegramToken) {
      setTestResult({
        type: 'error',
        text: 'Preencha pelo menos o Webhook do Discord ou o Bot Token do Telegram para disparar um teste!'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Direct trigger mock event to save and alert immediately
      await axios.post('http://localhost:5000/api/settings', {
        discord_webhook: discordWebhook,
        telegram_token: telegramToken,
        telegram_chat_id: telegramChatId
      });

      // Force a simulated high score flight event immediately
      await axios.post('http://localhost:5000/api/scrape/trigger');

      setTestResult({
        type: 'success',
        text: '🔥 Alerta de Teste disparado! Verifique seu canal do Discord ou Telegram.'
      });
    } catch (error: any) {
      setTestResult({
        type: 'error',
        text: `Erro ao disparar diagnóstico: ${error.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="border-b border-slate-800/40 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Configuração de Alarmes e Canais</span>
          <BellRing className="h-4.5 w-4.5 text-trading-blue animate-pulse" />
        </h2>
        <p className="text-xs text-trading-muted mt-0.5">Vincule webhooks do Discord, bots do Telegram ou simule gateways do WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Settings Form */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            
            {/* Discord Webhook field */}
            <div className="space-y-2">
              <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Webhook do Discord</span>
                <span className="text-[9px] text-slate-500 font-normal">Formato: https://discord.com/api/webhooks/...</span>
              </label>
              <input
                type="text"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="Insira a URL do seu Webhook do Discord para posts automáticos em canal"
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-3 outline-none focus:border-trading-blue/50 font-mono"
              />
            </div>

            {/* Telegram settings fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Ex: 574839201:AAH8F..."
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-3 outline-none focus:border-trading-blue/50 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Ex: -1001847392 ou @canal"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-3 outline-none focus:border-trading-blue/50 font-mono"
                />
              </div>
            </div>

            {/* WhatsApp Integration field placeholder */}
            <div className="space-y-2">
              <label className="text-[10px] text-trading-muted font-bold uppercase tracking-wider flex items-center justify-between">
                <span>WhatsApp Target Phone (Estrutura Pronta)</span>
                <span className="text-[9px] text-trading-blue font-bold uppercase">Integração API</span>
              </label>
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="Insira o número de celular com DDI e DDD (Ex: 5511999999999)"
                className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xs rounded-xl px-4 py-3 outline-none cursor-not-allowed"
                disabled
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/40">
              <button
                type="button"
                onClick={handleTestAlert}
                disabled={isTesting}
                className="flex items-center space-x-2 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isTesting ? 'Disparando...' : 'Testar Webhooks Agora'}</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-trading-blue to-sky-600 hover:from-trading-blue hover:to-sky-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-trading-blue/10"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Configurações'}</span>
              </button>
            </div>
          </form>

          {/* Alert feedbacks */}
          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl flex items-center space-x-2.5 text-trading-green text-xs">
              <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
              <span>Configurações salvas e aplicadas com sucesso no banco de dados SQLite!</span>
            </div>
          )}

          {testResult && (
            <div className={`p-3.5 rounded-xl flex items-center space-x-2.5 text-xs ${
              testResult.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-trading-green' 
                : 'bg-rose-500/10 border border-rose-500/25 text-trading-red'
            }`}>
              {testResult.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" /> : <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />}
              <span>{testResult.text}</span>
            </div>
          )}
        </div>

        {/* Operational Status / Guide Card */}
        <div className="space-y-6">
          {/* Channel guide */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Como obter os canais?</h3>
            
            <div className="space-y-3.5 text-xs leading-relaxed text-slate-300">
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">🤖 Discord Webhook:</p>
                <p className="text-[11px] text-trading-muted">
                  No seu servidor, vá em: *Configurações do Canal* ➡️ *Integrações* ➡️ *Criar Webhook*. Copie a URL gerada e cole ao lado.
                </p>
              </div>

              <div className="space-y-1 border-t border-slate-800/40 pt-3">
                <p className="font-semibold text-slate-200">✈️ Telegram Bot:</p>
                <p className="text-[11px] text-trading-muted">
                  Fale com o *@BotFather* no Telegram para criar seu robô e copie o *Token*. Em seguida, adicione o bot ao canal ou obtenha seu chat ID enviando mensagem para *@userinfobot*.
                </p>
              </div>
            </div>
          </div>

          {/* Operational metrics */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Status do Monitor</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800/30 pb-2">
                <span className="text-trading-muted">Registros em Banco:</span>
                <span className="font-bold text-white font-mono">{serverStatus.databaseRecords || 0}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/30 pb-2">
                <span className="text-trading-muted">Alertas Transmitidos:</span>
                <span className="font-bold text-trading-green font-mono">{serverStatus.totalAlertsSent || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-trading-muted">Último Batimento:</span>
                <span className="text-slate-300 font-mono text-[10px]">{serverStatus.timestamp ? serverStatus.timestamp.substring(11, 19) : '--:--:--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
