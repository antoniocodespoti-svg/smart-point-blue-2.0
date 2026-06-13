import React, { useState } from "react";
import { WWMenuPlan, ProfiloDietetico, UserProfile } from "../types";
import { ListTodo, Sparkles, ChefHat, Loader2, BookOpen, Clock, Lightbulb, CheckSquare, Printer, Check, ShoppingBag, Info, ShieldAlert } from "lucide-react";
import { SUGGESTED_BUDGET_CALCULATOR } from "../data";

interface MenuPlannerProps {
  onApplyBudget: (budget: number) => void;
  defaultBudget: number;
  currentUser?: UserProfile | null;
  onUpdateAiUsage?: (tokens: number, cost: number) => void;
  onRechargeCredits?: () => void;
}

export function MenuPlanner({ 
  onApplyBudget, 
  defaultBudget, 
  currentUser,
  onUpdateAiUsage,
  onRechargeCredits
}: MenuPlannerProps) {
  const [formData, setFormData] = useState<ProfiloDietetico>(() => ({
    giorni: 3,
    puntiBudget: defaultBudget,
    preferenzeAlimentari: "Nessuna",
    escludiCibi: "",
    preferenzeSpecifiche: "",
    obiettivi: currentUser?.weightGoal || "Perdere peso",
    includiZeroPunti: true,
    genere: currentUser?.gender || "female",
    eta: currentUser?.age || 35,
    peso: currentUser?.weight || 70,
    altezza: currentUser?.height || 165,
    livelloAttivita: currentUser?.activityLevel || "sedentary",
    distribuzioneMacro: "Equilibrata",
    numeroPasti: 3
  }));

  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      puntiBudget: defaultBudget,
      ...(currentUser ? {
        obiettivi: currentUser.weightGoal || prev.obiettivi,
        genere: currentUser.gender || prev.genere,
        eta: currentUser.age || prev.eta,
        peso: currentUser.weight || prev.peso,
        altezza: currentUser.height || prev.altezza,
        livelloAttivita: currentUser.activityLevel || prev.livelloAttivita,
      } : {})
    }));
  }, [currentUser, defaultBudget]);

  // Dynamic Mifflin-St Jeor formula to compute target metrics in real-time
  const calcolaMetricheUtente = () => {
    const pVal = parseFloat(formData.peso?.toString() || "70") || 70;
    const aVal = parseFloat(formData.altezza?.toString() || "165") || 165;
    const eVal = parseFloat(formData.eta?.toString() || "35") || 35;
    
    let bmr = 10 * pVal + 6.25 * aVal - 5 * eVal;
    if (formData.genere === "male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }
    
    let factor = 1.2;
    if (formData.livelloAttivita === "light") factor = 1.375;
    if (formData.livelloAttivita === "moderate") factor = 1.55;
    if (formData.livelloAttivita === "active") factor = 1.725;
    
    const tdee = bmr * factor;
    
    let calorieTarget = tdee;
    if (formData.obiettivi === "Perdere peso") {
      calorieTarget = tdee - 450;
    } else if (formData.obiettivi === "Mangiare più sano e proteico") {
      calorieTarget = tdee - 150;
    }
    
    calorieTarget = Math.max(1200, Math.round(calorieTarget));
    
    // Suggested budget points calculation matching the authoritative system formula
    const budgetConsigliato = SUGGESTED_BUDGET_CALCULATOR.getSuggestedPoints(
      formData.genere,
      formData.eta,
      formData.peso,
      formData.altezza,
      formData.livelloAttivita,
      formData.obiettivi
    );
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calorieTarget,
      budgetConsigliato
    };
  };

  const metriche = calcolaMetricheUtente();

  const handleApplyRecommendedBudget = () => {
    setFormData(prev => ({ ...prev, puntiBudget: metriche.budgetConsigliato }));
  };

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [menuPlan, setMenuPlan] = useState<WWMenuPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchasedIngredients, setPurchasedIngredients] = useState<string[]>([]);
  const [expandedPasto, setExpandedPasto] = useState<string | null>(null); // e.g., "g1-colazione"
  const [lastUsage, setLastUsage] = useState<{
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    costEur: number;
    isSimulated?: boolean;
  } | null>(null);

  const loadingThoughts = [
    "Analizzando la combinazione di alimenti migliori per te...",
    "Integrando cibi a Zero Punti della lista Blu...",
    "Bilanciando proteine, fibre e SmartPoints...",
    "Arrotondando grassi saturi e zuccheri...",
    "Generando squisite ricette dietetiche in lingua italiana...",
    "Elaborando la lista della spesa raggruppata..."
  ];

  const triggerLoaderMessages = () => {
    let index = 0;
    setLoadingMessage(loadingThoughts[0]);
    const interval = setInterval(() => {
      index = (index + 1) % loadingThoughts.length;
      setLoadingMessage(loadingThoughts[index]);
    }, 2800);
    return interval;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Quota Counter check
    const credits = currentUser?.aiCredits ?? 5;
    if (credits <= 0) {
      setError("Hai terminato i tuoi crediti per l'AI! Clicca sull'icona Ricarica (🔁) in alto a destra per averne altri 5 gratuiti.");
      return;
    }

    setLoading(true);
    setError(null);
    setMenuPlan(null);
    setPurchasedIngredients([]);

    const trackerInterval = triggerLoaderMessages();

    try {
      const response = await fetch("/api/generate-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      clearInterval(trackerInterval);

      if (!response.ok) {
        let errMsg = "Errore del server durante la formulazione del menu.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (e) {
          // Fail safely if response is not JSON
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      setMenuPlan(data);

      if (data.usageReport) {
        setLastUsage(data.usageReport);
        if (onUpdateAiUsage) {
          onUpdateAiUsage(data.usageReport.totalTokens, data.usageReport.costEur);
        }
      }

      // Auto apply budget to local journal if selected
      if (data.budgetPoints) {
        onApplyBudget(data.budgetPoints);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Qualcosa è andato storto nella connessione con l'AI. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredient = (ingredient: string) => {
    if (purchasedIngredients.includes(ingredient)) {
      setPurchasedIngredients(purchasedIngredients.filter(i => i !== ingredient));
    } else {
      setPurchasedIngredients([...purchasedIngredients, ingredient]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="planner-interface" className="space-y-8 print:p-0">
      {/* Configuration Box */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm print:hidden">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">Crea Menu Personalizzato</h3>
            <p className="text-xs text-slate-500">Scegli le tue opzioni per ricette allineate con gli SmartPoints Blu</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          
          {/* Sezione 1: Preferenze alimentari, Ricorrenza e Macronutrienti */}
          <div className="bg-slate-50/50 border border-slate-100/70 rounded-2xl p-4.5 space-y-4">
            <h4 className="text-xs font-bold text-slate-755 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
              Preferenze Alimentari, Durata e Bilanciamento Macro
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Menu days duration */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-550 mb-1">Durata Menu</label>
                <select
                  value={formData.giorni}
                  onChange={(e) => setFormData({ ...formData, giorni: parseInt(e.target.value) || 3 })}
                  className="w-full bg-white text-slate-800 text-xs rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-teal-400 transition"
                >
                  <option value={1}>1 Giorno (Singolo piano)</option>
                  <option value={3}>3 Giorni (Weekend o feriale)</option>
                  <option value={5}>5 Giorni (Da lunedì a venerdì)</option>
                  <option value={7}>7 Giorni (Settimana completa)</option>
                </select>
              </div>

              {/* Pasti duration selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-550 mb-1">Numero di Pasti</label>
                <select
                  value={formData.numeroPasti}
                  onChange={(e) => setFormData({ ...formData, numeroPasti: parseInt(e.target.value) || 3 })}
                  className="w-full bg-white text-slate-800 text-xs rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-teal-400 transition font-semibold"
                >
                  <option value={2}>2 Pasti (Pranzo, Cena)</option>
                  <option value={3}>3 Pasti (Colazione, Pranzo, Cena)</option>
                  <option value={5}>5 Pasti (Colazione, Spuntino, Pranzo, Spuntino, Cena)</option>
                </select>
              </div>

              {/* Food preference */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-550 mb-1">Stile & Preferenza</label>
                <select
                  value={formData.preferenzeAlimentari}
                  onChange={(e) => setFormData({ ...formData, preferenzeAlimentari: e.target.value })}
                  className="w-full bg-white text-slate-800 text-xs rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-teal-400 transition"
                >
                  <option value="Nessuna">Dieta Mediterranea completa</option>
                  <option value="Vegetariana">Vegetariana (Uova & Formaggi sì)</option>
                  <option value="Vegana">Vegana (Senza prodotti animali)</option>
                  <option value="Senza Glutine">Senza Glutine (Celiachia)</option>
                  <option value="Senza Lattosio">Senza Lattosio</option>
                  <option value="Ad alto contenuto proteico">Cibi ricchi di proteine naturali</option>
                </select>
              </div>

              {/* Macro strategy */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-550 mb-1">Equilibrio Nutrienti</label>
                <select
                  value={formData.distribuzioneMacro}
                  onChange={(e) => setFormData({ ...formData, distribuzioneMacro: e.target.value })}
                  className="w-full bg-white text-slate-800 text-xs rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-teal-400 transition"
                >
                  <option value="Equilibrata">Equilibrata standard (50% Carbo, 20% Pro, 30% Gras)</option>
                  <option value="Iperproteica">Iperproteica (35% Carbo, 35% Pro, 30% Gras)</option>
                  <option value="Low Carb">Low-Carb bilanciata (20% Carbo, 40% Pro, 40% Gras)</option>
                  <option value="Zona">Metodo a Zona (40% Carbo, 30% Pro, 30% Gras)</option>
                </select>
              </div>

              {/* Budget scelta */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-550 mb-1">Budget SmartPoints</label>
                <input
                  type="number"
                  min={23}
                  max={60}
                  value={formData.puntiBudget}
                  onChange={(e) => setFormData({ ...formData, puntiBudget: parseInt(e.target.value) || 23 })}
                  className="w-full bg-white text-slate-800 text-xs rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-150 transition font-bold text-indigo-700"
                />
                {metriche.budgetConsigliato !== formData.puntiBudget && (
                  <button
                    type="button"
                    onClick={handleApplyRecommendedBudget}
                    className="mt-1 text-[9px] text-teal-600 hover:text-teal-700 font-bold underline block cursor-pointer"
                  >
                    Usa consigliato ({metriche.budgetConsigliato} SP)
                  </button>
                )}
              </div>
            </div>

            {/* Exclusi */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-550 mb-1">Escludi Cibi / Allergie / Avversioni</label>
              <input
                type="text"
                placeholder="Es: arachidi, merluzzo, peperoni, latticini..."
                value={formData.escludiCibi}
                onChange={(e) => setFormData({ ...formData, escludiCibi: e.target.value })}
                className="w-full bg-white text-slate-800 text-xs rounded-xl px-3.5 py-2.5 border border-slate-200 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition"
              />
            </div>

            {/* Preferenze o voglie specifiche */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-550 mb-1">Preferenze specifiche / Voglia di cibi o pasti particolari</label>
              <textarea
                rows={2}
                placeholder="Es: Desidero pasta al pomodoro a pranzo, voglio pollo grigliato a cena, preferisco colazioni salate..."
                value={formData.preferenzeSpecifiche}
                onChange={(e) => setFormData({ ...formData, preferenzeSpecifiche: e.target.value })}
                className="w-full bg-white text-slate-800 text-xs rounded-xl px-3.5 py-2 border border-slate-200 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-3.5 px-6 rounded-2xl shadow-sm transition hover:scale-[1.005] flex items-center justify-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generazione in corso...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-teal-200" />
                 <span>Genera Menu Dietetico Blu con AI</span>
              </>
            )}
          </button>
        </form>

        {loading && (
          <div className="mt-5 p-5 bg-teal-50 border border-teal-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 animate-pulse">
            <span className="text-teal-900 text-xs font-bold font-sans">Il tuo Assistente Nutrizionale sta pensando...</span>
            <span className="text-teal-700 text-[10px] leading-relaxed italic max-w-sm">{loadingMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-5 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-semibold text-rose-800">Errore di elaborazione</p>
              <p className="text-[10px] text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Generated Plan Output */}
      {menuPlan && (
        <div id="generated-plan-render" className="space-y-8">
          
          {/* Header Dashboard of Generation */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-lg">Menu SmartPoints Blu Generato</h3>
                <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-teal-100">
                  Elaborato dall'IA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pianificazione equilibrata adatta a un budget di <strong>{menuPlan.budgetPoints} SmartPoints</strong> al giorno.
              </p>
              {menuPlan.calorieGiornaliereTarget && (
                <div className="mt-2 text-[10px] flex flex-wrap gap-2 text-slate-550 font-medium">
                  <span className="bg-indigo-50/50 text-indigo-750 px-2 py-1 rounded-lg border border-indigo-100/30">🎯 Target Energetico: <strong>{menuPlan.calorieGiornaliereTarget} kcal/giorno</strong></span>
                  <span className="bg-amber-50/50 text-amber-800 px-2 py-1 rounded-lg border border-amber-100/30">⚖️ Bilanciamento: <strong>{menuPlan.macroDistribuzioneTarget}</strong></span>
                </div>
              )}
            </div>
            
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer print:hidden"
            >
              <Printer className="w-4 h-4" />
              Stampa / Esporta PDF
            </button>
          </div>

          {/* Quick zero-points advice cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            {menuPlan.cibiZeroPuntiConsigliati && menuPlan.cibiZeroPuntiConsigliati.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Lightbulb className="w-4 h-4" />
                  <h4 className="font-bold text-xs">Cibi a Zero Punti Raccomandati per te</h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Includili liberamente per porzioni extra o spuntini sani se avverti fame, senza consumare lo SmartPoints budget:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {menuPlan.cibiZeroPuntiConsigliati.map((item, idx) => (
                    <span key={idx} className="bg-white/80 border border-emerald-100 text-emerald-800 text-[10px] font-medium px-2 py-1 rounded-lg">
                      🥦 {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {menuPlan.consigliNutrizionali && menuPlan.consigliNutrizionali.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs">Consigli dell'AI sul Piano Blu</h4>
                </div>
                <div className="space-y-1.5">
                  {menuPlan.consigliNutrizionali.map((consiglio, idx) => (
                    <p key={idx} className="text-[10px] text-slate-600 leading-relaxed flex items-start gap-1.5">
                      <span className="text-teal-600 mt-0.5">•</span>
                      <span>{consiglio}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Schedule breakdown */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold tracking-widest text-slate-400 uppercase print:text-slate-800">Programma Giornaliero</h4>
            
            <div className="grid grid-cols-1 gap-6">
              {menuPlan.giorni.map((day) => (
                <div key={day.giorno} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 print:shadow-none print:border-b print:rounded-none">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <div className="space-y-0.5">
                      <h5 className="font-extrabold text-slate-800 text-base">Giorno {day.giorno}</h5>
                      <p className="text-[10px] text-slate-400">Pasti bilanciati e pronti da assemblare</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">Punti Usati</span>
                      <span className="text-lg font-bold text-teal-600 font-sans">
                        {day.totalePunti} <span className="text-xs font-normal text-slate-400">/ {menuPlan.budgetPoints} SP</span>
                      </span>
                    </div>
                  </div>

                  {/* Bilanciamento Macronutrienti del Giorno */}
                  {day.macroGiorno && (
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="text-center md:text-left space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Energia Giorno {day.giorno}</span>
                        <p className="text-sm font-extrabold text-slate-850">{day.macroGiorno.calorie} kcal</p>
                      </div>
                      <div className="md:col-span-3 grid grid-cols-3 gap-4">
                        {/* Carbo */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-slate-500">🌾 Carboidrati</span>
                            <span className="font-bold text-slate-750">{day.macroGiorno.carboidrati}g</span>
                          </div>
                          <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-400 h-full rounded-full" 
                              style={{ width: `${day.macroGiorno.calorie > 0 ? Math.min(100, Math.round((day.macroGiorno.carboidrati * 4 / day.macroGiorno.calorie) * 100)) : 0}%` }}
                            />
                          </div>
                          <span className="block text-[8px] text-slate-400 text-right">
                            {day.macroGiorno.calorie > 0 ? Math.round((day.macroGiorno.carboidrati * 4 / day.macroGiorno.calorie) * 100) : 0}% kcal
                          </span>
                        </div>
                        
                        {/* Proteine */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-slate-500">🍗 Proteine</span>
                            <span className="font-bold text-slate-750">{day.macroGiorno.proteine}g</span>
                          </div>
                          <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full" 
                              style={{ width: `${day.macroGiorno.calorie > 0 ? Math.min(100, Math.round((day.macroGiorno.proteine * 4 / day.macroGiorno.calorie) * 100)) : 0}%` }}
                            />
                          </div>
                          <span className="block text-[8px] text-slate-400 text-right">
                            {day.macroGiorno.calorie > 0 ? Math.round((day.macroGiorno.proteine * 4 / day.macroGiorno.calorie) * 100) : 0}% kcal
                          </span>
                        </div>
                        
                        {/* Grassi */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-slate-500">🥑 Grassi</span>
                            <span className="font-bold text-slate-750">{day.macroGiorno.grassi}g</span>
                          </div>
                          <div className="w-full bg-slate-200/50 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-rose-400 h-full rounded-full" 
                              style={{ width: `${day.macroGiorno.calorie > 0 ? Math.min(100, Math.round((day.macroGiorno.grassi * 9 / day.macroGiorno.calorie) * 100)) : 0}%` }}
                            />
                          </div>
                          <span className="block text-[8px] text-slate-400 text-right">
                            {day.macroGiorno.calorie > 0 ? Math.round((day.macroGiorno.grassi * 9 / day.macroGiorno.calorie) * 105 / 100) : 0}% kcal
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Meal sub cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Meal cards map */}
                    {(() => {
                      const mealsList = Array.isArray(day.pasti)
                        ? day.pasti
                        : day.pasti
                        ? [
                            { ...(day.pasti as any).colazione, tipoPasto: "Colazione" },
                            { ...(day.pasti as any).pranzo, tipoPasto: "Pranzo" },
                            { ...(day.pasti as any).cena, tipoPasto: "Cena" },
                            { ...(day.pasti as any).spuntino, tipoPasto: "Spuntino" }
                          ].filter(m => m && m.nome)
                        : [];

                      return mealsList.map((meal, mealIdx) => {
                        const pastoKey = `g${day.giorno}-${mealIdx}`;
                        const isExpanded = expandedPasto === pastoKey;

                        const getMealEmoji = (tipo?: string) => {
                          const label = tipo || "Pasto";
                          const norm = label.toLowerCase();
                          if (norm.includes("colazione")) return "☕ " + label;
                          if (norm.includes("pranzo")) return "🥗 " + label;
                          if (norm.includes("cena")) return "🍝 " + label;
                          if (norm.includes("spuntino")) return "🍎 " + label;
                          return "🍽️ " + label;
                        };

                        const mealEmoji = getMealEmoji(meal.tipoPasto);

                        return (
                          <div
                            key={mealIdx}
                            className={`border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between break-inside-avoid print:break-inside-avoid ${
                              meal.isZeroPoints
                                ? "bg-emerald-50/20 border-emerald-100 hover:border-emerald-200 print:bg-emerald-50/5"
                                : "bg-slate-50/30 border-slate-100 hover:border-slate-200 print:bg-slate-50/5"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  {mealEmoji}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${
                                  meal.isZeroPoints 
                                    ? "bg-emerald-100 text-emerald-800" 
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {meal.punti} SP
                                </span>
                              </div>

                              <div>
                                <h6 className="font-semibold text-slate-800 text-xs tracking-tight print:line-clamp-none line-clamp-2">
                                  {meal.nome}
                                </h6>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100/50 flex flex-col gap-2">
                              {/* Recipe Details: shown on screen if expanded OR always in print mode */}
                              <div className={`space-y-3 pt-1 text-[10px] text-slate-500 ${
                                isExpanded ? "block animate-fade-in" : "hidden print:block"
                              }`}>
                                <div className="space-y-1 text-left">
                                  <p className="font-semibold text-slate-700">Ingredienti:</p>
                                  <ul className="list-disc pl-3.5 space-y-0.5 text-[9px] text-slate-600 print:text-slate-800">
                                    {meal.ingredienti.map((ing, iIdx) => (
                                      <li key={iIdx}>{ing}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-1 text-left">
                                  <p className="font-semibold text-slate-700">Preparazione:</p>
                                  <p className="leading-relaxed text-[9px] text-slate-600 print:text-slate-900 bg-slate-50/60 p-2 rounded-xl border border-slate-100/40 print:bg-white print:border-none print:p-0">
                                    {meal.ricetta}
                                  </p>
                                </div>
                              </div>

                              {/* Collapse/Expand action trigger - Hidden when printing / exporting PDF */}
                              <div className="print:hidden">
                                {isExpanded ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPasto(null)}
                                    className="w-full text-center text-[9px] font-bold text-teal-650 hover:text-teal-700 mt-2 cursor-pointer border border-teal-100 py-1 rounded-lg bg-teal-50/20"
                                  >
                                    Nascondi ricetta
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPasto(pastoKey)}
                                    className="w-full text-center text-[10px] font-semibold text-slate-600 hover:text-indigo-650 flex items-center justify-center gap-1.5 hover:bg-white border border-transparent hover:border-slate-100 py-1 rounded-lg cursor-pointer animate-fade-in"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 animate-pulse" />
                                    Ricetta & Dettagli
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shopping Checklist */}
          {menuPlan.listaSpesa && menuPlan.listaSpesa.length > 0 && (
            <div id="shopping-list-card" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm print:shadow-none print:border-t mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShoppingBag className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Cesta della Spesa Smart</h3>
                  <p className="text-[10px] text-slate-400">Tutti gli ingredienti necessari da spuntare prima di andare al supermercato</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {menuPlan.listaSpesa.map((ingredient, idx) => {
                  const isChecked = purchasedIngredients.includes(ingredient);
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => toggleIngredient(ingredient)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center gap-2.5 transition text-xs cursor-pointer ${
                        isChecked
                          ? "bg-slate-55 border-slate-200 text-slate-400 line-through"
                          : "bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-slate-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                        isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{ingredient}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Token Billing & Cost Breakdown Panel */}
          {lastUsage && (
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 mt-4 print:hidden animate-fade-in">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Breakdown Consumo Gemini AI</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal max-w-lg">
                  Questo menu di {formData.giorni} giorno/i è stato formulato basandosi sulla nostra lista di cibi a zero punti. Ecco i token reali e i costi Gemini API calcolati.
                </p>
                {lastUsage.isSimulated && (
                  <span className="inline-block bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-semibold px-2 py-0.5 rounded-md mt-1">
                    ✔ Simulazione locale attiva (Mock Key o API offline)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-end shrink-0 select-none">
                <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-xl min-w-[100px] text-center">
                  <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Input Prompt</span>
                  <span className="text-xs font-bold font-mono text-white mt-0.5 block">{lastUsage.promptTokens.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-500 font-medium block mt-0.5">token inviati</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-xl min-w-[100px] text-center">
                  <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Output Risposta</span>
                  <span className="text-xs font-bold font-mono text-white mt-0.5 block">{lastUsage.candidatesTokens.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-500 font-medium block mt-0.5">token generati</span>
                </div>
                <div className="bg-gradient-to-tr from-indigo-950 to-slate-900 border border-indigo-500/25 p-3 rounded-xl min-w-[125px] text-center md:text-right">
                  <span className="block text-[8px] uppercase font-bold text-indigo-300 tracking-wider">Costo Equivalente</span>
                  <span className="text-sm font-black font-mono text-indigo-400 mt-0.5 block">€{lastUsage.costEur.toFixed(5)}</span>
                  <span className="text-[8px] text-indigo-350 font-semibold block mt-0.5">tariffe ufficiali</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
