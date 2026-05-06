import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layers, Plane, Calendar, ExternalLink, HelpCircle, Check, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

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
  source: string;
  link: string;
  scraped_at: string;
}

interface ComboData {
  bestCombo: {
    ida: FlightRecord;
    volta: FlightRecord;
  } | null;
  totalPrice: number | null;
  guide: string;
  grid: Array<{
    idaDate: string;
    prices: Record<string, number | null>;
  }>;
  idaPrices: FlightRecord[];
  voltaPrices: FlightRecord[];
}

const ComboViewer: React.FC = () => {
  const [comboData, setComboData] = useState<ComboData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected date pair states (defaults to absolute best combination)
  const [selectedIdaDate, setSelectedIdaDate] = useState<string>('');
  const [selectedVoltaDate, setSelectedVoltaDate] = useState<string>('');

  const fetchComboData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/best-combination');
      setComboData(res.data);
      
      if (res.data.bestCombo) {
        setSelectedIdaDate(res.data.bestCombo.ida.departure_date);
        setSelectedVoltaDate(res.data.bestCombo.volta.departure_date);
      }
      setError(null);
    } catch (err: any) {
      setError('Falha ao obter dados de combos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComboData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-slate-900 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[250px] bg-slate-900 rounded-3xl"></div>
          <div className="h-[250px] bg-slate-900 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !comboData) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 text-trading-red rounded-2xl text-sm">
        {error || 'Nenhum dado de voo disponível para gerar combinações.'}
      </div>
    );
  }

  const { grid, idaPrices, voltaPrices, bestCombo } = comboData;

  // Find active flight details based on current user selection from matrix
  const activeIdaFlight = idaPrices.find(p => p.departure_date === selectedIdaDate);
  const activeVoltaFlight = voltaPrices.find(p => p.departure_date === selectedVoltaDate);
  const activeTotalPrice = (activeIdaFlight?.price || 0) + (activeVoltaFlight?.price || 0);

  // Generate dynamic buyer instructions based on active selection
  const getActiveGuide = () => {
    if (!activeIdaFlight || !activeVoltaFlight) return '';
    return `Para garantir a tarifa de R$ ${activeTotalPrice}:\n\n` +
           `1. 🛫 IDA: Compre o trecho saindo de **${activeIdaFlight.origin}** no dia **${activeIdaFlight.departure_date}** voando **${activeIdaFlight.airline}** (${activeIdaFlight.stops === 0 ? 'Direto' : 'Com escala'}).\n` +
           `2. 🛬 VOLTA: Compre o retorno saindo de **FLN** no dia **${activeVoltaFlight.departure_date}** pousando em **${activeVoltaFlight.destination}** voando **${activeVoltaFlight.airline}** (${activeVoltaFlight.stops === 0 ? 'Direto' : 'Com escala'}).\n` +
           `3. 🎒 BAGAGEM: Atente-se que esta oferta ${activeIdaFlight.baggage_included && activeVoltaFlight.baggage_included ? 'INCLUI mala de porão despachada' : 'pode conter apenas mala de mão de 10kg inclusa'}.\n` +
           `4. 🧭 COMPRA: Clique nos botões "Ir para Voo" ao lado para abrir e consolidar a compra em seu respectivo portal (${activeIdaFlight.source} / ${activeVoltaFlight.source}).`;
  };

  const isAbsoluteBest = (idaDate: string, voltaDate: string) => {
    return bestCombo && bestCombo.ida.departure_date === idaDate && bestCombo.volta.departure_date === voltaDate;
  };

  const isCurrentSelection = (idaDate: string, voltaDate: string) => {
    return selectedIdaDate === idaDate && selectedVoltaDate === voltaDate;
  };

  const voltaDatesList = ['23/06/2026', '24/06/2026', '25/06/2026', '26/06/2026', '27/06/2026'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Combo Inteligente de Viagem</span>
            <Layers className="h-4.5 w-4.5 text-trading-blue" />
          </h2>
          <p className="text-xs text-trading-muted mt-0.5">
            Cruzamento estatístico completo entre as datas de ida (09/06 a 13/06) e volta (23/06 a 27/06) para encontrar o menor valor combinado.
          </p>
        </div>

        {/* Global Best indicator */}
        {bestCombo && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl text-xs text-trading-green font-mono flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>Melhor Opção Global: <b>R$ {Math.round(bestCombo.ida.price + bestCombo.volta.price)}</b></span>
          </div>
        )}
      </div>

      {/* Main Grid Combo summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left-Middle Panel: Combined Flight Cards */}
        <div className="xl:col-span-2 space-y-5">
          {/* Symmetrical flight cards display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* IDA card details */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[210px] group border-l-2 border-l-trading-blue">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-trading-blue/10 text-trading-blue font-bold px-2 py-0.5 rounded uppercase">
                    Voo de Ida 🛫
                  </span>
                  <span className="text-trading-muted font-mono">{selectedIdaDate}</span>
                </div>

                {activeIdaFlight ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-black text-white font-mono">
                      R$ {Math.round(activeIdaFlight.price)}
                    </p>
                    <div className="text-xs space-y-1 text-slate-300 font-sans">
                      <p>💻 Canal: <span className="font-semibold text-slate-200">{activeIdaFlight.source}</span></p>
                      <p>✈️ Rota: <span className="font-semibold text-slate-200">{activeIdaFlight.origin} ➡️ FLN</span> ({activeIdaFlight.airline})</p>
                      <p>⏱️ Conexão: <span className="font-semibold text-slate-200">{activeIdaFlight.stops === 0 ? 'Sem escalas (Direto)' : `${activeIdaFlight.stops} parada(s)`}</span></p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-trading-muted">Sem dados disponíveis para esta data.</p>
                )}
              </div>

              {activeIdaFlight && (
                <a
                  href={activeIdaFlight.link || 'https://www.google.com/travel/flights'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-center text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <span>Ir para Voo de Ida</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* VOLTA card details */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-[210px] group border-l-2 border-l-trading-orange">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-trading-orange/10 text-trading-orange font-bold px-2 py-0.5 rounded uppercase">
                    Voo de Volta 🛬
                  </span>
                  <span className="text-trading-muted font-mono">{selectedVoltaDate}</span>
                </div>

                {activeVoltaFlight ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-black text-white font-mono">
                      R$ {Math.round(activeVoltaFlight.price)}
                    </p>
                    <div className="text-xs space-y-1 text-slate-300 font-sans">
                      <p>💻 Canal: <span className="font-semibold text-slate-200">{activeVoltaFlight.source}</span></p>
                      <p>✈️ Rota: <span className="font-semibold text-slate-200">FLN ➡️ {activeVoltaFlight.destination}</span> ({activeVoltaFlight.airline})</p>
                      <p>⏱️ Conexão: <span className="font-semibold text-slate-200">{activeVoltaFlight.stops === 0 ? 'Sem escalas (Direto)' : `${activeVoltaFlight.stops} parada(s)`}</span></p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-trading-muted">Sem dados disponíveis para esta data.</p>
                )}
              </div>

              {activeVoltaFlight && (
                <a
                  href={activeVoltaFlight.link || 'https://www.google.com/travel/flights'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-center text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <span>Ir para Voo de Volta</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Interactive 5x5 Date Grid */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Matriz de Preços Combinados (Ida x Volta)</h3>
              <span className="text-[10px] text-trading-muted">Clique em qualquer combinação para detalhar</span>
            </div>

            <div className="overflow-x-auto select-none">
              <table className="w-full text-center border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-800 text-trading-muted font-bold text-[9px] uppercase">
                    <th className="p-3 text-left">Ida \ Volta</th>
                    {voltaDatesList.map(vDate => (
                      <th key={vDate} className="p-3">{vDate.substring(0, 5)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono">
                  {grid.map(row => (
                    <tr key={row.idaDate} className="hover:bg-white/[0.01]">
                      <td className="p-3 text-left font-bold text-trading-muted">{row.idaDate.substring(0, 5)}</td>
                      {voltaDatesList.map(vDate => {
                        const price = row.prices[vDate];
                        const isBest = isAbsoluteBest(row.idaDate, vDate);
                        const isSelected = isCurrentSelection(row.idaDate, vDate);
                        
                        return (
                          <td key={vDate} className="p-2">
                            <button
                              onClick={() => {
                                setSelectedIdaDate(row.idaDate);
                                setSelectedVoltaDate(vDate);
                              }}
                              className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                                isSelected 
                                  ? 'bg-trading-blue/25 border-trading-blue text-white shadow-lg' 
                                  : (isBest 
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-trading-green animate-pulse' 
                                      : 'bg-slate-950/40 border-slate-800/50 hover:border-slate-700 text-slate-300')
                              }`}
                            >
                              {price ? `R$ ${price}` : '---'}
                              {isBest && <span className="block text-[8px] text-emerald-400 font-sans tracking-widest mt-0.5">MELHOR</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Panel: Purchase Guideline & Total combined price */}
        <div className="space-y-6">
          {/* Combined Price KPI Card */}
          <div className="glass-panel p-6 rounded-2xl text-center space-y-3 flex flex-col justify-center items-center bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-emerald-500/10">
            <span className="text-[10px] text-trading-muted font-bold uppercase tracking-widest">Preço Total Combinado</span>
            <p className="text-4xl font-black text-trading-green tracking-tight font-mono glow-green">
              R$ {activeTotalPrice || '---'}
            </p>
            <span className="text-[10px] bg-emerald-500/10 text-trading-green font-semibold border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {activeTotalPrice <= 1400 ? 'Excelente Oportunidade' : 'Tarifa do Pacote'}
            </span>
          </div>

          {/* Guidelines Box */}
          <div className="glass-panel p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-800/80 pb-2.5">
              <BookOpen className="h-4.5 w-4.5 text-trading-orange" />
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">Guia de Seleção na Compra</span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line space-y-2">
              {getActiveGuide() || 'Por favor, selecione as datas de Ida e Volta na matriz de preços para detalhar as instruções.'}
            </div>

            <div className="bg-slate-900/40 border border-slate-800/40 p-3 rounded-xl flex items-start space-x-2">
              <HelpCircle className="h-4.5 w-4.5 text-trading-blue flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-trading-muted leading-relaxed">
                As tarifas de passagens variam constantemente de acordo com os lotes das companhias. Caso encontre diferença no portal de redirecionamento, force uma nova varredura no botão do dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboViewer;
