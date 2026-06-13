import React, { useState } from "react";
import { FoodAnalysis, FoodTrackItem, UserProfile } from "../types";
import { Search, Plus, Sparkles, Loader2, Apple, ChevronDown, CheckCircle2, RefreshCw, Trash2, Info, ListPlus } from "lucide-react";

interface FoodAnalyzerProps {
  onAddFood: (item: Omit<FoodTrackItem, "id">) => void;
  currentUser?: UserProfile | null;
  onUpdateAiUsage?: (tokens: number, cost: number) => void;
  onRechargeCredits?: () => void;
}

export function FoodAnalyzer({ 
  onAddFood,
  currentUser,
  onUpdateAiUsage,
  onRechargeCredits
}: FoodAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'recipe'>('single');
  const [query, setQuery] = useState("");
  const [ingredients, setIngredients] = useState<{ id: string; nome: string; quantita: string }[]>([
    { id: "1", nome: "", quantita: "80g" },
    { id: "2", nome: "", quantita: "10g" }
  ]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedSlot, setAddedSlot] = useState<'colazione' | 'pranzo' | 'cena' | 'spuntino'>('pranzo');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addFeedback, setAddFeedback] = useState(false);
  const [lastUsage, setLastUsage] = useState<{
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    costEur: number;
    isSimulated?: boolean;
  } | null>(null);

  const handleAddIngredient = () => {
    setIngredients(prev => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(), nome: "", quantita: "" }
    ]);
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(prev => prev.filter(item => item.id !== id));
  };

  const handleIngredientChange = (id: string, field: 'nome' | 'quantita', value: string) => {
    setIngredients(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check credits
    const credits = currentUser?.aiCredits ?? 5;
    if (credits <= 0) {
      setError("Hai terminato i tuoi crediti disponibili! Contatta l'amministratore per effettuare una ricarica.");
      return;
    }

    let hasValidInput = false;
    let payload = {};

    if (activeTab === 'single') {
      if (!query.trim()) return;
      hasValidInput = true;
      payload = { cibo: query };
    } else {
      const validIngredients = ingredients.filter(i => i.nome.trim() !== "");
      if (validIngredients.length === 0) {
        setError("Inserisci almeno un ingrediente con il proprio nome.");
        return;
      }
      hasValidInput = true;
      payload = { ingredienti: validIngredients.map(i => ({ nome: i.nome, quantita: i.quantita })) };
    }

    if (!hasValidInput) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setAddFeedback(false);

    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Errore durante l'analisi. Riprova tra un istante.");
      }

      const data = await response.json();
      setAnalysis(data);

      if (data.usageReport) {
        setLastUsage(data.usageReport);
        if (onUpdateAiUsage) {
          onUpdateAiUsage(data.usageReport.totalTokens, data.usageReport.costEur);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Impossibile caricare l'analisi del cibo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToJournal = () => {
    if (!analysis) return;

    onAddFood({
      nome: analysis.nome,
      punti: analysis.smartPoints,
      categoria: addedSlot,
      isZeroPoints: analysis.isZeroPoints,
      calorie: analysis.calorie,
      grassiSaturi: analysis.grassiSaturi,
      zuccheri: analysis.zuccheri,
      proteine: analysis.proteine,
      porzione: analysis.porzione
    });

    setAddFeedback(true);
    setShowAddMenu(false);
    setTimeout(() => {
      setAddFeedback(false);
    }, 2500);
  };

  return (
    <div id="food-analyzer-container" className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <Apple className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800 text-lg">Calcolo Istantaneo Punti</h3>
            <p className="text-xs text-slate-500">Stima istantaneamente i valori e gli SmartPoints Blu della tua ricetta a crudo</p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-50 border border-slate-100 p-1.5 rounded-2xl max-w-sm">
          <button
            type="button"
            onClick={() => { setActiveTab('single'); setError(null); }}
            className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'single'
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-550 hover:text-slate-800 whitespace-nowrap"
            }`}
          >
            🍎 Cibo Singolo
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('recipe'); setError(null); }}
            className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'recipe'
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-550 hover:text-slate-800 whitespace-nowrap"
            }`}
          >
            ⚖️ Ingredienti a Crudo
          </button>
        </div>

        {activeTab === 'single' ? (
          <form onSubmit={handleAnalyze} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Es: Pasta al pesto, Filetto d'orata al forno, Torta alle mele..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs rounded-2xl pl-10 pr-4 py-3.5 border-none outline-none focus:ring-2 focus:ring-indigo-100 transition"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 rounded-2xl shadow-sm transition hover:scale-[1.01] flex items-center gap-1.5 cursor-pointer disabled:bg-indigo-400 font-sans"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analizza"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="space-y-3">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-50 hover:bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl px-3.5 py-1.5 flex items-center gap-2 transition border border-slate-100">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Nome ingrediente (es: pasta sgranata, olio evo, parmigiano, uova...)"
                      value={ing.nome}
                      onChange={(e) => handleIngredientChange(ing.id, "nome", e.target.value)}
                      className="w-full bg-transparent text-slate-800 text-xs border-none outline-none focus:ring-0 py-1.5 placeholder-slate-400 font-medium"
                      disabled={loading}
                    />
                  </div>
                  <div className="w-32 bg-slate-50 hover:bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl px-3.5 py-1.5 flex items-center transition border border-slate-100">
                    <input
                      type="text"
                      placeholder="Es: 80g, 10ml, 1 uovo"
                      value={ing.quantita}
                      onChange={(e) => handleIngredientChange(ing.id, "quantita", e.target.value)}
                      className="w-full bg-transparent text-slate-800 text-xs border-none outline-none focus:ring-0 py-1.5 placeholder-slate-400 text-center font-bold"
                      disabled={loading}
                    />
                  </div>
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer flex-shrink-0"
                      title="Rimuovi ingrediente"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1.5 text-slate-650 hover:text-indigo-650 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/50 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shadow-xs"
                disabled={loading}
              >
                <Plus className="w-3.5 h-3.5 text-indigo-650" />
                Aggiungi ingrediente
              </button>
              
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-6 rounded-2xl shadow-sm transition hover:scale-[1.01] flex items-center gap-2 cursor-pointer disabled:bg-indigo-400"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
                {loading ? "Elaborazione a crudo..." : "Calcola Punti a Crudo"}
              </button>
            </div>

            {/* Note raw food accuracy warning */}
            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-600/10 p-4 rounded-2xl text-[11px] text-amber-800 leading-relaxed text-left">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Regola di Precisione (Alimenti a Crudo):</strong> Per garantire la correttezza del piano SmartPoints Blu, inserisci sempre il peso degli alimenti <strong>prima della cottura</strong> (es. 80g di riso crudo anziché cotto). Gli alimenti cotti cambiano peso assorbendo molta acqua, ma l'apporto di punti rimane inalterato!
              </span>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs text-left">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Output Result */}
      {analysis && (
        <div id="analysis-output" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{analysis.nome}</span>
                {analysis.isZeroPoints && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase border border-emerald-100">
                    Zero Punti Blu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Stima basata su una porzione di: <strong>{analysis.porzione}</strong></p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">SmartPoints Blu</p>
                <p className={`text-3xl font-extrabold font-sans ${analysis.isZeroPoints ? "text-emerald-500" : "text-indigo-600"}`}>
                  {analysis.smartPoints}
                </p>
              </div>

              {/* Journal integration button dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl p-3 flex items-center gap-1.5 text-xs font-semibold shadow-sm transition hover:scale-[1.01] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Diario
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-30 animate-fade-in text-xs">
                    <p className="font-semibold text-slate-500 text-[10px] px-3 py-1 bg-slate-50 rounded-lg mb-2 uppercase tracking-wider">
                      Seleziona momento:
                    </p>
                    <button
                      onClick={() => { setAddedSlot('colazione'); handleAddToJournal(); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl transition"
                    >
                      ☕ Colazione
                    </button>
                    <button
                      onClick={() => { setAddedSlot('pranzo'); handleAddToJournal(); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl transition"
                    >
                      🥗 Pranzo
                    </button>
                    <button
                      onClick={() => { setAddedSlot('cena'); handleAddToJournal(); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl transition"
                    >
                      🍝 Cena
                    </button>
                    <button
                      onClick={() => { setAddedSlot('spuntino'); handleAddToJournal(); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl transition"
                    >
                      🍎 Spuntino
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {addFeedback && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              Aggiunto con successo alla scheda '{addedSlot}' del tuo diario odierno!
            </div>
          )}

          {/* Nutritional Breakdown Widgets */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50/80 rounded-2xl p-4">
            <div className="text-center space-y-0.5">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Calorie</p>
              <p className="text-xs font-bold font-sans text-slate-700">{analysis.calorie} kcal</p>
            </div>
            <div className={`text-center space-y-0.5 border-l border-slate-200/50`}>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Grassi Sat.</p>
              <p className="text-xs font-bold font-sans text-slate-700">{analysis.grassiSaturi} g</p>
            </div>
            <div className="text-center space-y-0.5 border-l border-slate-200/50">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Zuccheri</p>
              <p className="text-xs font-bold font-sans text-slate-700">{analysis.zuccheri} g</p>
            </div>
            <div className="text-center space-y-0.5 border-l border-slate-200/50">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Proteine</p>
              <p className="text-xs font-bold font-sans text-slate-700">{analysis.proteine} g</p>
            </div>
          </div>

          {/* Detailed Motives & Alternatives */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {analysis.isZeroPoints ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs space-y-1">
                <p className="font-semibold text-emerald-950">📌 Perché è a Zero Punti?</p>
                <p className="text-emerald-800 leading-relaxed">{analysis.motivoZeroPoints}</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-slate-700">💡 Come ridurne i punti?</p>
                <p className="text-slate-500 leading-relaxed">
                  Questo cibo ha una spesa di punti medio-alta. Prova a ridurne l'apporto o la densità calorica cucinarlo diversamente.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2">
                <p className="font-semibold text-slate-700">👩‍🍳 Trucco di Preparazione Leggera</p>
                <p className="text-slate-500 leading-relaxed italic">{analysis.consiglioPreparazione}</p>
              </div>

              {analysis.alternativeZeroPoints && analysis.alternativeZeroPoints.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2">
                  <p className="font-semibold text-slate-700">🔄 Alternative Consigliate</p>
                  <ul className="list-disc pl-4 text-slate-500 space-y-1">
                    {analysis.alternativeZeroPoints.map((alt, idx) => (
                      <li key={idx}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </div>
  );
}
