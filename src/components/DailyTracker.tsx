import React, { useState } from "react";
import { FoodTrackItem, UserProfile } from "../types";
import { Plus, Trash2, Calendar, Coffee, Utensils, Award, Flame, PlusCircle, AlertCircle, RefreshCw } from "lucide-react";
import { FoodAnalyzer } from "./FoodAnalyzer";

interface DailyTrackerProps {
  budget: number;
  onBudgetChange: (budget: number) => void;
  trackedFoods: FoodTrackItem[];
  onAddCustomFood: (food: FoodTrackItem) => void;
  onRemoveFood: (id: string) => void;
  onClearAll: () => void;
  currentUser?: UserProfile | null;
  onUpdateAiUsage?: (tokens: number, cost: number) => void;
  onRechargeCredits?: () => void;
}

export function DailyTracker({
  budget,
  onBudgetChange,
  trackedFoods,
  onAddCustomFood,
  onRemoveFood,
  onClearAll,
  currentUser,
  onUpdateAiUsage,
  onRechargeCredits
}: DailyTrackerProps) {
  // Form choice: 'simple' or 'calc'
  const [activeFormTab, setActiveFormTab] = useState<'simple' | 'calc'>('simple');

  // Manual entry states
  const [manualName, setManualName] = useState("");
  const [manualPoints, setManualPoints] = useState<number>(0);
  const [manualSlot, setManualSlot] = useState<'colazione' | 'pranzo' | 'cena' | 'spuntino'>('pranzo');
  const [manualIsZero, setManualIsZero] = useState(false);

  // Calculated product nutrition states
  const [calcName, setCalcName] = useState("");
  const [calcCalories, setCalcCalories] = useState<string>("100");
  const [calcSatFat, setCalcSatFat] = useState<string>("0");
  const [calcSugar, setCalcSugar] = useState<string>("0");
  const [calcProtein, setCalcProtein] = useState<string>("0");
  const [calcPortion, setCalcPortion] = useState<string>("100g");
  const [calcSlot, setCalcSlot] = useState<'colazione' | 'pranzo' | 'cena' | 'spuntino'>('pranzo');

  const calcCaloriesNum = parseFloat(calcCalories) || 0;
  const calcSatFatNum = parseFloat(calcSatFat) || 0;
  const calcSugarNum = parseFloat(calcSugar) || 0;
  const calcProteinNum = parseFloat(calcProtein) || 0;

  // Formula exact SmartPoints value
  const rawPoints = (calcCaloriesNum * 0.0305) + (calcSatFatNum * 0.275) + (calcSugarNum * 0.12) - (calcProteinNum * 0.098);
  const calculatedPoints = Math.max(0, Math.round(rawPoints));

  const [dateStr] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  });

  const totalSpent = trackedFoods.reduce((acc, curr) => acc + curr.punti, 0);
  const remaining = budget - totalSpent;
  const percentUsed = Math.min(100, Math.round((totalSpent / budget) * 100));

  // Quick logging constants
  const QUICK_FOODS = [
    { nome: "🥚 Uovo sodo", punti: 0, isZero: true, slot: 'colazione' as const },
    { nome: "🍎 Mela", punti: 0, isZero: true, slot: 'spuntino' as const },
    { nome: "🍌 Banana", punti: 0, isZero: true, slot: 'spuntino' as const },
    { nome: "🥖 Pane Integrale (50g)", punti: 3, isZero: false, slot: 'colazione' as const },
    { nome: "🧈 Olio Oliva (1 cucchiaino)", punti: 1, isZero: false, slot: 'pranzo' as const },
    { nome: "🐓 Petto Pollo ai Ferri (150g)", punti: 0, isZero: true, slot: 'pranzo' as const },
    { nome: "🍝 Pasta Cotta (120g)", punti: 4, isZero: false, slot: 'pranzo' as const },
    { nome: "🥛 Yogurt Greco Magro 0%", punti: 0, isZero: true, slot: 'colazione' as const }
  ];

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    onAddCustomFood({
      id: "manual-" + Date.now(),
      nome: manualName.trim(),
      punti: manualIsZero ? 0 : manualPoints,
      categoria: manualSlot,
      isZeroPoints: manualIsZero
    });

    setManualName("");
    setManualPoints(0);
    setManualIsZero(false);
  };

  const handleCalcAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcName.trim()) return;

    onAddCustomFood({
      id: "calc-" + Date.now() + "-" + Math.random(),
      nome: calcName.trim(),
      punti: calculatedPoints,
      categoria: calcSlot,
      isZeroPoints: calculatedPoints === 0,
      calorie: calcCaloriesNum,
      grassiSaturi: calcSatFatNum,
      zuccheri: calcSugarNum,
      proteine: calcProteinNum,
      porzione: calcPortion.trim() || undefined
    });

    setCalcName("");
    setCalcCalories("100");
    setCalcSatFat("0");
    setCalcSugar("0");
    setCalcProtein("0");
    setCalcPortion("100g");
  };

  const handleQuickAdd = (food: typeof QUICK_FOODS[0]) => {
    onAddCustomFood({
      id: "quick-" + Date.now() + "-" + Math.random(),
      nome: food.nome,
      punti: food.punti,
      categoria: food.slot,
      isZeroPoints: food.isZero
    });
  };

  const getSlotColor = (slot: string) => {
    switch (slot) {
      case 'colazione': return 'bg-amber-100 text-amber-800';
      case 'pranzo': return 'bg-sky-100 text-sky-850';
      case 'cena': return 'bg-indigo-100 text-indigo-850';
      default: return 'bg-emerald-100 text-emerald-850';
    }
  };

  return (
    <div id="diary-tracker-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left panel: Daily circle stats & Custom manually logging */}
      <div className="space-y-6">
        
        {/* Dynamic circular radial stats */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 capitalize font-medium mb-4">
            <Calendar className="w-3.5 h-3.5" />
            {dateStr}
          </div>

          {/* SVG Circular Ring */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Back track ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#f1f5f9"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Active animated progress ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={remaining < 0 ? "#ef4444" : "#4f46e5"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * percentUsed) / 100}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Absolute internal values */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rimasti</span>
              <span className={`text-3xl font-black font-sans leading-none ${remaining < 0 ? "text-red-650" : "text-indigo-950"}`}>
                {remaining}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-1">SmartPoints</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-4 border-t border-slate-50 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Budget Totale</span>
              <span className="text-sm font-extrabold font-sans text-slate-800 mt-1 block">
                {budget} <span className="text-[10px] text-slate-400 font-medium">SP</span>
              </span>
            </div>
            <div className="border-l border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Consumati</span>
              <span className="text-sm font-bold text-slate-700 mt-0.5 block font-sans">
                {totalSpent} <span className="text-[10px] text-slate-400">SP ({percentUsed}%)</span>
              </span>
            </div>
          </div>

          {remaining < 0 && (
            <div className="mt-4 p-2 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              Hai ecceduto il tuo budget giornaliero!
            </div>
          )}
        </div>

        {/* Custom manual / calculated addition form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              Aggiungi Cibo al Diario
            </h4>
          </div>

          {/* Form Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveFormTab('simple')}
              className={`py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition ${
                activeFormTab === 'simple'
                  ? "bg-white text-indigo-750 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Log Semplice
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('calc')}
              className={`py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition ${
                activeFormTab === 'calc'
                  ? "bg-white text-indigo-750 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Calcola da Valori Nutrizionali
            </button>
          </div>

          {activeFormTab === 'simple' ? (
            <form onSubmit={handleManualAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nome alimento / pasto</label>
                <input
                  type="text"
                  placeholder="Es: Toast con fesa di tacchino"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-100 transition text-base md:text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cibo a zero punti?</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="checkbox"
                      id="is-zero-points"
                      checked={manualIsZero}
                      onChange={(e) => setManualIsZero(e.target.checked)}
                      className="w-4 h-4 text-indigo-650 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="is-zero-points" className="text-[11px] font-semibold text-slate-650 cursor-pointer select-none">
                      Sì, lista Blu
                    </label>
                  </div>
                </div>

                {!manualIsZero && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">SmartPoints</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={manualPoints}
                      onChange={(e) => setManualPoints(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-100 transition text-base md:text-xs"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Momento della giornata</label>
                <select
                  value={manualSlot}
                  onChange={(e) => setManualSlot(e.target.value as any)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-2 outline-none transition cursor-pointer text-base md:text-xs"
                >
                  <option value="colazione">☕ Colazione</option>
                  <option value="pranzo">🥗 Pranzo</option>
                  <option value="cena">🍝 Cena</option>
                  <option value="spuntino">🍎 Spuntino</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Ora
              </button>
            </form>
          ) : (
            <form onSubmit={handleCalcAdd} className="space-y-3 px-0.5 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nome prodotto / marca</label>
                <input
                  type="text"
                  placeholder="Es: Yogurt magro mirtilli"
                  value={calcName}
                  onChange={(e) => setCalcName(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-100 transition text-base md:text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Calorie (kcal)</label>
                  <input
                    type="number"
                    min={0}
                    max={1200}
                    value={calcCalories}
                    onChange={(e) => setCalcCalories(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none transition text-base md:text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Grassi Saturi (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={calcSatFat}
                    onChange={(e) => setCalcSatFat(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none transition text-base md:text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Zuccheri (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={calcSugar}
                    onChange={(e) => setCalcSugar(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none transition text-base md:text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Proteine (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={calcProtein}
                    onChange={(e) => setCalcProtein(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none transition text-base md:text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Porzione (Es: 150g o 1 vasetto)</label>
                  <input
                    type="text"
                    value={calcPortion}
                    onChange={(e) => setCalcPortion(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none transition text-base md:text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Momento della giornata</label>
                  <select
                    value={calcSlot}
                    onChange={(e) => setCalcSlot(e.target.value as any)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none transition cursor-pointer text-base md:text-xs"
                  >
                    <option value="colazione">☕ Colazione</option>
                    <option value="pranzo">🥗 Pranzo</option>
                    <option value="cena">🍝 Cena</option>
                    <option value="spuntino">🍎 Spuntino</option>
                  </select>
                </div>
              </div>

              {/* Real-time points indicator badge */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-400">Punti calcolati in tempo reale</span>
                  <span className="text-[10px] text-slate-500 block leading-tight font-medium mt-0.5 max-w-[145px]">
                    Formula: (Cal/33) + (SatFat/4) + (Sugar/8) - (Pro/10)
                  </span>
                </div>
                <div className="bg-indigo-600 text-white font-sans font-black px-3.5 py-2 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-xs">
                  <span className="text-xl leading-none">{calculatedPoints}</span>
                  <span className="text-[8px] uppercase tracking-wider font-bold mt-0.5">Punti</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Calcola e Aggiungi
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Right panel: Live food logger items & quick logging options */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Quick click shortcuts */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
          <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Log Rapido: Alimenti Frequenti
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {QUICK_FOODS.map((food, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => handleQuickAdd(food)}
                className="bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-100 text-left p-2 rounded-xl border border-transparent transition text-[11px] flex justify-between items-center cursor-pointer group"
              >
                <span className="truncate text-slate-700 group-hover:text-indigo-950">{food.nome}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 font-mono shrink-0 ${
                  food.punti === 0 ? "bg-emerald-50 text-emerald-700" : "bg-indigo-105 text-indigo-700"
                }`}>
                  {food.punti}p
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Calculate with AI Food Analyzer */}
        <FoodAnalyzer 
          onAddFood={onAddCustomFood}
          currentUser={currentUser}
          onUpdateAiUsage={onUpdateAiUsage}
          onRechargeCredits={onRechargeCredits}
        />

        {/* Current diary active entries */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Registro Pasti di Oggi</h3>
              <p className="text-[10px] text-slate-400">Elenco dei cibi inseriti per la giornata odierna</p>
            </div>
            
            {trackedFoods.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-red-500 hover:text-red-700 text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer py-1 px-2 hover:bg-red-50 rounded"
              >
                Svuota Registro
              </button>
            )}
          </div>

          {trackedFoods.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <Utensils className="w-12 h-12 text-slate-200 stroke-[1.2] mb-2" />
              <p className="text-slate-400 text-xs">Il tuo diario alimentare è ancora vuoto.</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Usa i bottoni di log rapido, calcola con AI o inserisci manualmente!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {trackedFoods.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-xl transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 font-sans ${getSlotColor(item.categoria)}`}>
                      {item.categoria}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 block truncate">{item.nome}</span>
                      {item.porzione && (
                        <span className="text-[10px] text-slate-400 block">Porzione: {item.porzione}</span>
                      )}
                      {(item.calorie !== undefined || item.proteine !== undefined) && (
                        <span className="text-[9px] text-indigo-900/80 font-medium block mt-1 bg-indigo-50/40 border border-indigo-100/50 px-1.5 py-0.5 rounded-lg w-fit">
                          🔥 {item.calorie} kcal | 🍗 Proteine: {item.proteine}g | 🧈 Saturi: {item.grassiSaturi}g | 🍬 Zuccheri: {item.zuccheri}g
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold font-sans ${item.isZeroPoints ? "text-emerald-650" : "text-indigo-900"}`}>
                      {item.punti} SP
                    </span>
                    <button
                      onClick={() => onRemoveFood(item.id)}
                      className="text-slate-350 hover:text-red-600 transition p-1 cursor-pointer rounded-lg hover:bg-red-50"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {trackedFoods.length > 0 && (
            <div className="bg-slate-50/50 rounded-2xl p-4 text-[11px] font-medium text-slate-500 leading-relaxed">
              ⭐ <strong>Consiglio del Diario:</strong> Nel piano SmartPoints Blu, non risparmiare sui cibi a Zero Punti! Costituiscono la base di volume per evitare attacchi di fame durante il dimagrimento.
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
