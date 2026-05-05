/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { 
  Calculator, 
  Layers, 
  RotateCcw,
  Download,
  Target,
  AlertCircle,
  TrendingUp,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";

export default function App() {
  // Input states
  const [projectName, setProjectName] = useState<string>("");
  const [clientPrice, setClientPrice] = useState<string>("");
  const [nonPrintedMaterials, setNonPrintedMaterials] = useState<string>("");
  const [printedMaterials, setPrintedMaterials] = useState<string>("");
  const [shippingPackaging, setShippingPackaging] = useState<string>("");
  const [extraCosts, setExtraCosts] = useState<string>("");
  const [workHours, setWorkHours] = useState<string>("");
  const [taxRegime, setTaxRegime] = useState<"none" | "forfettario" | "ordinario">("none");
  const [idealRate, setIdealRate] = useState<string>("");
  
  const [hasCalculated, setHasCalculated] = useState(false);

  // Calculations
  const results = useMemo(() => {
    const price = parseFloat(clientPrice) || 0;
    const nonPrinted = parseFloat(nonPrintedMaterials) || 0;
    const printed = parseFloat(printedMaterials) || 0;
    const shipping = parseFloat(shippingPackaging) || 0;
    const extra = parseFloat(extraCosts) || 0;
    const hours = parseFloat(workHours) || 0;

    const totalCosts = nonPrinted + printed + shipping + extra;
    const grossProfit = price - totalCosts;
    
    // Taxes
    const taxRate = taxRegime === "forfettario" ? 0.20 : taxRegime === "ordinario" ? 0.45 : 0;
    const estimatedTaxes = grossProfit > 0 ? grossProfit * taxRate : 0;
    const netProfit = grossProfit - estimatedTaxes;
    
    const hourlyProfit = hours > 0 ? netProfit / hours : 0;
    const margin = price > 0 ? (grossProfit / price) * 100 : 0;

    let targetPrice = 0;
    if (idealRate && hours > 0) {
      const targetNetRate = parseFloat(idealRate);
      targetPrice = ((targetNetRate * hours) / (1 - taxRate)) + totalCosts;
    }

    return { totalCosts, grossProfit, estimatedTaxes, netProfit, hourlyProfit, margin, targetPrice };
  }, [clientPrice, nonPrintedMaterials, printedMaterials, shippingPackaging, extraCosts, workHours, taxRegime, idealRate]);

  // Messages logic
  const feedback = useMemo(() => {
    if (!hasCalculated) return null;
    
    const alerts = [];

    // Compound feedback logic
    const price = parseFloat(clientPrice) || 0;
    const hours = parseFloat(workHours) || 0;
    const targetVal = parseFloat(idealRate) || 25; // Default floor of 25€/h if no target

    // Priority 1: Check hourly rate vs target
    if (results.hourlyProfit < targetVal && hasCalculated) {
      if (results.hourlyProfit < targetVal * 0.5) {
        return { type: "error", message: "Attenzione: stai lavorando molto sotto il tuo obiettivo orario." };
      }
      return { type: "warning", message: `Sostenibilità bassa: la tua resa oraria (€${results.hourlyProfit.toFixed(2)}) è inferiore al target.` };
    }

    // Priority 2: Check Margin
    if (results.margin >= 40) {
      return { type: "success", message: "Ottimo! Questo è un progetto sano e sostenibile." };
    } else if (results.margin >= 20) {
      return { type: "info", message: "Buon margine, ma migliorabile." };
    } else {
      return { type: "error", message: "Attenzione: progetto poco sostenibile (margine troppo basso)." };
    }
  }, [results, hasCalculated, idealRate, workHours, clientPrice]);

  const handleCalculate = () => {
    setHasCalculated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setProjectName("");
    setClientPrice("");
    setNonPrintedMaterials("");
    setPrintedMaterials("");
    setShippingPackaging("");
    setExtraCosts("");
    setWorkHours("");
    setIdealRate("");
    setTaxRegime("none");
    setHasCalculated(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("REPORT MARGINEPRO", pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(10);
    doc.text(`Progetto: ${projectName || 'Senza nome'}`, pageWidth / 2, y, { align: "center" });
    y += 20;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text("RIEPILOGO FINANZIARIO", 20, y);
    y += 10;

    doc.setFontSize(11);
    const data = [
      ["Prezzo cliente:", `EUR ${parseFloat(clientPrice || '0').toFixed(2)}`],
      ["Costi vivi totali:", `EUR ${results.totalCosts.toFixed(2)}`],
      ["Tasse stimate:", `EUR ${results.estimatedTaxes.toFixed(2)} (${taxRegime})`],
      ["Guadagno lordo:", `EUR ${results.grossProfit.toFixed(2)}`],
      ["Guadagno netto stimato:", `EUR ${results.netProfit.toFixed(2)}`],
      ["Margine operatiov:", `${results.margin.toFixed(1)}%`],
      ["Tariffa oraria reale:", `EUR ${results.hourlyProfit.toFixed(2)} / ora`],
    ];

    data.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - 20, y, { align: "right" });
      y += 8;
    });

    y += 10;
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text("DETTAGLIO COSTI VIVI", 20, y);
    y += 10;

    const costDetails = [
      ["Materiali non stampati:", `EUR ${parseFloat(nonPrintedMaterials || '0').toFixed(2)}`],
      ["Materiali stampati:", `EUR ${parseFloat(printedMaterials || '0').toFixed(2)}`],
      ["Spedizione e packaging:", `EUR ${parseFloat(shippingPackaging || '0').toFixed(2)}`],
      ["Extra e vari:", `EUR ${parseFloat(extraCosts || '0').toFixed(2)}`],
    ];

    costDetails.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - 20, y, { align: "right" });
      y += 8;
    });

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("MARGINEPRO V 1.0 — Un progetto di plumacreativa.it", pageWidth / 2, 280, { align: "center" });

    doc.save(`MarginePro_${projectName || 'Report'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-beige-fondo font-sans text-primary selection:bg-primary selection:text-white pb-20">
      {/* Navbar Style */}
      <nav className="h-20 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
            <Calculator size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-[-0.04em] text-primary leading-none">
              MARGINE<span className="font-light opacity-80">PRO</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.4em] text-primary font-medium mt-1 opacity-60">Analisi sostenibilità progetto</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={reset}
            className="text-[9px] uppercase font-medium tracking-widest text-[#AAA] hover:text-primary flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button 
            onClick={exportToPDF}
            className="bg-primary text-white px-5 py-2 rounded-xl text-[9px] uppercase font-medium tracking-[0.15em] flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Download size={12} /> Report
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Sidebar Inputs */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-primary rounded-[2rem] p-6 text-white shadow-lg shadow-primary/10 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <Target size={16} />
                <h2 className="text-[10px] font-medium uppercase tracking-[0.2em]">Dettaglio Progetto</h2>
              </div>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nome del lavoro o cliente..."
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder:text-white/40 focus:bg-white/20 focus:outline-none transition-all text-lg font-medium"
              />
            </div>

            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#EEE] space-y-8">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-beige-fondo flex items-center justify-center text-primary">
                  <Layers size={12} />
                </span>
                <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#AAA]">Input Dati</h3>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium uppercase tracking-widest text-primary ml-1 block">
                    Prezzo totale cliente (€)
                  </label>
                  <input 
                    type="number"
                    value={clientPrice}
                    onChange={(e) => setClientPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-rosa-fondo rounded-xl p-5 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-3xl font-medium text-primary"
                  />
                  <p className="text-[10px] text-[#AAA] italic font-medium ml-1">“Inserisci il totale che il cliente paga per questo ordine”</p>
                </div>

                <div className="pt-8 border-t border-[#F5F5F5] space-y-8">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary opacity-60">COSTI VIVI</p>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Materiali non stampati (€)</label>
                    <input 
                      type="number"
                      value={nonPrintedMaterials}
                      onChange={(e) => setNonPrintedMaterials(e.target.value)}
                      className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-xl font-medium"
                    />
                    <p className="text-[10px] text-[#AAA] font-medium ml-1">(buste, nastri, ceralacca, cordini…)</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Materiali stampati (€)</label>
                    <input 
                      type="number"
                      value={printedMaterials}
                      onChange={(e) => setPrintedMaterials(e.target.value)}
                      className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-xl font-medium"
                    />
                    <p className="text-[10px] text-[#AAA] font-medium ml-1">(inviti, menu, cartoncini…)</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Spedizione e packaging (€)</label>
                    <input 
                      type="number"
                      value={shippingPackaging}
                      onChange={(e) => setShippingPackaging(e.target.value)}
                      className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-xl font-medium"
                    />
                    <p className="text-[10px] text-[#AAA] font-medium ml-1">(spedizione, scatole, imballaggi)</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Extra (€)</label>
                    <input 
                      type="number"
                      value={extraCosts}
                      onChange={(e) => setExtraCosts(e.target.value)}
                      className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-xl font-medium"
                    />
                    <p className="text-[10px] text-[#AAA] font-medium ml-1">(fornitori esterni, lavorazioni speciali)</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#F5F5F5] space-y-8">
                   <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary opacity-60">IMPOSTAZIONI LAVORO</p>
                   
                   <div className="space-y-3">
                     <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Ore lavorate</label>
                     <input 
                       type="number"
                       value={workHours}
                       onChange={(e) => setWorkHours(e.target.value)}
                       className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-xl font-medium"
                     />
                     <p className="text-[10px] text-[#AAA] font-medium ml-1 italic">“Considera tutte le ore reali, anche comunicazione e revisioni”</p>
                   </div>

                   <div className="space-y-3">
                     <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Tariffa oraria target (€)</label>
                     <input 
                       type="number"
                       value={idealRate}
                       onChange={(e) => setIdealRate(e.target.value)}
                       className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary/30 focus:bg-white outline-none transition-all text-xl font-medium"
                     />
                     <p className="text-[10px] text-[#AAA] font-medium ml-1 italic">“Quanto vuoi guadagnare all’ora”</p>
                   </div>

                   <div className="space-y-3">
                     <label className="text-xs font-medium uppercase tracking-widest text-primary ml-1">Regime fiscale (stima)</label>
                     <select 
                       value={taxRegime}
                       onChange={(e) => setTaxRegime(e.target.value as any)}
                       className="w-full bg-rosa-fondo rounded-xl p-4 border border-transparent focus:border-primary focus:bg-white outline-none transition-all appearance-none cursor-pointer text-base font-medium text-primary"
                     >
                       <option value="none">Nessuna stima</option>
                       <option value="forfettario">Forfettario (20%)</option>
                       <option value="ordinario">Ordinario (45%)</option>
                     </select>
                     <p className="text-[10px] text-[#AAA] font-medium ml-1 italic">“Stima indicativa, non fiscale”</p>
                   </div>
                </div>

                <button 
                  onClick={handleCalculate}
                  className="w-full bg-primary text-white py-5 rounded-xl text-sm font-medium uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                >
                  Analizza Progetto
                </button>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-[3rem] p-10 lg:p-14 shadow-sm border border-[#EEE] flex-1">
              <AnimatePresence mode="wait">
                {hasCalculated ? (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-12"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[#AAA] mb-3 block">Guadagno Lordo</span>
                        <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-[#666]">
                          €{results.grossProfit.toFixed(2)}
                        </h2>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-primary mb-3 block">Guadagno Netto</span>
                        <h2 className="text-4xl md:text-5xl font-medium tracking-tighter text-primary">
                          €{Math.floor(results.netProfit)}
                          <span className="text-xl opacity-40">,{(results.netProfit % 1).toFixed(2).split('.')[1]}</span>
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-rosa-fondo border border-rosa-chiaro/20 p-6 rounded-[1.5rem] space-y-1">
                         <span className="text-[9px] font-medium uppercase tracking-widest opacity-50">Margine (%)</span>
                         <div className="text-2xl font-medium text-[#555]">{results.margin.toFixed(1)}%</div>
                      </div>
                      <div className="bg-rosa-fondo border border-rosa-chiaro/20 p-6 rounded-[1.5rem] space-y-1 text-primary">
                         <span className="text-[9px] font-medium uppercase tracking-widest opacity-70">Tariffa Oraria Reale</span>
                         <div className="text-2xl font-medium italic">€{results.hourlyProfit.toFixed(2)}</div>
                      </div>
                      <div className="bg-rosa-fondo border border-rosa-chiaro/20 p-6 rounded-[1.5rem] space-y-1">
                         <span className="text-[9px] font-medium uppercase tracking-widest opacity-50">Costi Totali</span>
                         <div className="text-2xl font-medium text-[#555]">€{results.totalCosts.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-8 border-t border-[#F5F5F5]">
                      <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[#AAA] opacity-60">Feedback Analisi</span>
                      <div className="space-y-4">
                        {feedback && (
                           <motion.div 
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             className={`p-8 rounded-[2rem] flex items-center gap-6 ${feedback.type === 'error' || feedback.type === 'warning' ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-rosa-fondo border border-rosa-chiaro/30 text-primary font-medium italic text-lg'}`}
                           >
                             <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center ${feedback.type === 'error' ? 'text-red-500' : 'text-primary'}`}>
                               <AlertCircle size={20} />
                             </div>
                             <p className="leading-snug">{feedback.message}</p>
                           </motion.div>
                        )}

                        {/* Consulenza Strategica - only show if client price is lower than target */}
                        {results.targetPrice > parseFloat(clientPrice || '0') && results.targetPrice > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-primary rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-6 shadow-lg shadow-primary/20"
                          >
                            <div className="space-y-3">
                              <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-white/20 rounded-full">
                                <Target size={12} />
                                <span className="text-[9px] font-medium uppercase tracking-widest">Consulenza Strategica</span>
                              </div>
                              <h3 className="text-lg font-normal italic leading-relaxed opacity-90 max-w-sm">Per raggiungere una tariffa di {idealRate}€/h netti, questo progetto dovrebbe essere venduto a…</h3>
                            </div>
                            <div className="text-center md:text-right">
                              <div className="text-5xl font-medium tracking-tighter">€{results.targetPrice.toFixed(0)}</div>
                              <span className="text-[9px] font-medium uppercase tracking-widest opacity-60 mt-1 block">Prezzo Consigliato</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-16">
                     <TrendingUp size={60} strokeWidth={1} />
                     <p className="text-[10px] font-medium uppercase tracking-[0.5em] mt-6">In attesa di analisi</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-8 py-12 text-center">
        <div className="w-12 h-1 bg-primary/20 mx-auto mb-8 rounded-full" />
        <p className="text-[10px] font-medium uppercase tracking-[0.8em] text-primary/60 mb-4">Un progetto di plumacreativa.it</p>
        <p className="text-[9px] font-medium uppercase tracking-[0.4em] text-primary">MARGINEPRO V 1.0</p>
      </footer>
    </div>
  );
}
