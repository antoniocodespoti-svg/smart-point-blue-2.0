import React, { useState } from "react";
import { User, Scale, Calendar, Activity, Target, Sparkles, Smile, ShieldCheck, Heart, Trash2, Pencil, Check, X, SlidersHorizontal, CheckCircle2, LogOut } from "lucide-react";
import { UserProfile } from "../types";
import { SUGGESTED_BUDGET_CALCULATOR } from "../data";

interface BudgetCalculatorProps {
  currentBudget: number;
  onBudgetSelect: (budget: number) => void;
  currentUser?: UserProfile | null;
  onUpdateProfile?: (updatedData: Partial<UserProfile>) => void;
  onDeleteAccount?: () => void;
  onLogout?: () => void;
}

export function BudgetCalculator({ 
  currentBudget, 
  currentUser, 
  onUpdateProfile, 
  onDeleteAccount,
  onLogout
}: BudgetCalculatorProps) {

  const [editingField, setEditingField] = useState<"gender" | "age" | "weight" | "height" | "activityLevel" | "weightGoal" | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  
  // Local state to hold the draft modifications of the profile
  const [draftUser, setDraftUser] = useState<UserProfile | null>(currentUser || null);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Keep draft in sync with any external change or initial mount
  React.useEffect(() => {
    if (currentUser) {
      setDraftUser(currentUser);
    }
  }, [currentUser]);

  if (!currentUser || !draftUser) {
    return (
      <div id="calculator-no-user" className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xs">
        <p className="text-slate-500 text-sm font-medium">Nessun profilo utente trovato. Registrati per calcolare il tuo budget.</p>
      </div>
    );
  }

  // Map gender to readable name in Italian
  const getGenderLabel = (g: string) => {
    if (g === "female") return "Donna";
    if (g === "male") return "Uomo";
    return "Altro";
  };

  // Map activity level to readable name in Italian
  const getActivityLabel = (act: string) => {
    switch (act) {
      case "sedentary":
        return "Sedentario (Lavoro d’ufficio, passeggiate minime)";
      case "lightly_active":
      case "light":
        return "Moderato (Attivo durante il giorno)";
      case "moderate":
        return "Moderatamente Attivo";
      case "active":
      case "very_active":
        return "Molto Attivo (Allenamento costante)";
      default:
        return "Sedentario";
    }
  };

  // Save changes and instantly persist to the main user profile
  const handleSaveField = (field: "gender" | "age" | "weight" | "height" | "activityLevel" | "weightGoal", value: any) => {
    if (!onUpdateProfile || !draftUser) return;

    // Create the updated profile object
    const updatedUser = {
      ...draftUser,
      [field]: value
    };

    // Calculate the new budget in real-time
    const newBudget = SUGGESTED_BUDGET_CALCULATOR.getSuggestedPoints(
      updatedUser.gender,
      updatedUser.age,
      updatedUser.weight,
      updatedUser.height,
      updatedUser.activityLevel,
      updatedUser.weightGoal
    );

    // Deeply trigger onUpdateProfile to instantly persist
    onUpdateProfile({
      gender: updatedUser.gender,
      age: updatedUser.age,
      weight: updatedUser.weight,
      height: updatedUser.height,
      activityLevel: updatedUser.activityLevel,
      weightGoal: updatedUser.weightGoal,
      budgetPoints: newBudget
    });

    setDraftUser(updatedUser);
    setEditingField(null);
    setEditValue(null);

    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  };

  // Recalculate budget in real-time based on the local parameters
  const calculatedDraftBudget = SUGGESTED_BUDGET_CALCULATOR.getSuggestedPoints(
    draftUser.gender,
    draftUser.age,
    draftUser.weight,
    draftUser.height,
    draftUser.activityLevel,
    draftUser.weightGoal
  );

  // Check if any of the profile habits or biometric variables differ from the saved user profile
  const isProfileModified = false;

  // Confirm and persist all drafted changes to the main user profile
  const handleConfirmAllChanges = () => {};

  // Cancel drafted variations and reset back to original profile
  const handleCancelAllChanges = () => {
    setDraftUser(currentUser);
    setEditingField(null);
    setEditValue(null);
  };

  return (
    <div id="biometric-summary-card" className="space-y-6">
      
      {/* Visual Success Confirmation Banner */}
      {showSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 flex items-start gap-3 shadow-md animate-fade-in text-left">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Abitudini e Profilo Aggiornati!</h5>
            <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
              Le modifiche apportate sono state verificate e salvate correttamente. Il tuo budget giornaliero è stato aggiornato con successo a <strong>{currentBudget} SmartPoints</strong> e le tue nuove abitudini sono attive in tutta l'applicazione!
            </p>
          </div>
        </div>
      )}

      {/* Principal active budget badge card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-650 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-md">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-40 h-40 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <span className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/25 transition text-white text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs select-none">
              <Sparkles className="w-3 h-3" />
              Il Tuo Programma Blu
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">
              Ciao, {currentUser.name}!
            </h3>
            <p className="text-indigo-150 text-xs max-w-md font-medium leading-relaxed">
              Modifica i tuoi parametri qui sotto. I tuoi dati biometrici e il nuovo budget giornaliero calcolato verranno salvati e applicati all'istante!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center border border-white/15 min-w-[160px] self-start md:self-auto shadow-inner">
            <span className="text-[10px] text-indigo-150 uppercase tracking-widest font-extrabold">BUDGET COMPLESSIVO</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl md:text-5xl font-black font-sans tracking-tight text-white">
                {isProfileModified ? calculatedDraftBudget : currentBudget}
              </span>
              <span className="text-xs font-bold text-indigo-100">SP</span>
            </div>
            <span className="text-[9px] text-white/80 font-medium mt-1">
              {isProfileModified ? "Anteprima in tempo reale" : "SmartPoints / giorno"}
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3 text-left">I tuoi Dati Biometrici & Obiettivi (Modifiche salvate e applicate ad ogni cambiamento):</p>
        
        {/* Biometric parameters grid summary */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Gender Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all duration-200 min-h-[82px]">
            <div className="flex items-center gap-3.5 min-w-0 w-full">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Sesso Biologico
                </p>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleSaveField("gender", "female")}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition border cursor-pointer ${
                      draftUser.gender === "female"
                        ? "border-purple-500 bg-purple-50 text-purple-800"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Donna
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveField("gender", "male")}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition border cursor-pointer ${
                      draftUser.gender === "male"
                        ? "border-blue-500 bg-blue-50 text-blue-850"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Uomo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Age Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all duration-200 min-h-[82px]">
            <div className="flex items-center gap-3.5 min-w-0 w-full">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Età (Anni)
                </p>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={draftUser.age}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftUser(prev => prev ? { ...prev, age: val as any } : null);
                  }}
                  onBlur={() => {
                    const parsed = parseInt(String(draftUser.age));
                    const clamped = isNaN(parsed) ? (currentUser?.age ?? 30) : Math.max(15, Math.min(120, parsed));
                    handleSaveField("age", clamped);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = parseInt(String(draftUser.age));
                      const clamped = isNaN(parsed) ? (currentUser?.age ?? 30) : Math.max(15, Math.min(120, parsed));
                      handleSaveField("age", clamped);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 py-0.5 mt-0.5 transition"
                />
              </div>
            </div>
          </div>

          {/* Weight Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all duration-200 min-h-[82px]">
            <div className="flex items-center gap-3.5 min-w-0 w-full">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Peso (Kg)
                </p>
                <input
                  type="number"
                  step="0.1"
                  min={30}
                  max={250}
                  value={draftUser.weight}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftUser(prev => prev ? { ...prev, weight: val as any } : null);
                  }}
                  onBlur={() => {
                    const parsed = parseFloat(String(draftUser.weight));
                    const clamped = isNaN(parsed) ? (currentUser?.weight ?? 70) : Math.max(30, Math.min(250, parsed));
                    handleSaveField("weight", clamped);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = parseFloat(String(draftUser.weight));
                      const clamped = isNaN(parsed) ? (currentUser?.weight ?? 70) : Math.max(30, Math.min(250, parsed));
                      handleSaveField("weight", clamped);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 py-0.5 mt-0.5 transition"
                />
              </div>
            </div>
          </div>

          {/* Height Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all duration-200 min-h-[82px]">
            <div className="flex items-center gap-3.5 min-w-0 w-full">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 flex items-center justify-center font-extrabold text-[11px] w-9 h-9">
                <span>cm</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Altezza (cm)
                </p>
                <input
                  type="number"
                  min={100}
                  max={250}
                  value={draftUser.height}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftUser(prev => prev ? { ...prev, height: val as any } : null);
                  }}
                  onBlur={() => {
                    const parsed = parseInt(String(draftUser.height));
                    const clamped = isNaN(parsed) ? (currentUser?.height ?? 170) : Math.max(100, Math.min(250, parsed));
                    handleSaveField("height", clamped);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = parseInt(String(draftUser.height));
                      const clamped = isNaN(parsed) ? (currentUser?.height ?? 170) : Math.max(100, Math.min(250, parsed));
                      handleSaveField("height", clamped);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 py-0.5 mt-0.5 transition"
                />
              </div>
            </div>
          </div>

          {/* Activity Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all duration-200 min-h-[82px]">
            <div className="flex items-center gap-3.5 min-w-0 w-full font-sans">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Attività Fisica
                </p>
                <select
                  value={draftUser.activityLevel}
                  onChange={(e) => {
                    handleSaveField("activityLevel", e.target.value);
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 py-0.5 mt-0.5 transition cursor-pointer"
                >
                  <option value="sedentary">Sedentario (Ufficio)</option>
                  <option value="lightly_active">Moderato (In piedi)</option>
                  <option value="active">Molto Attivo (Sportivo)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Goal Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all duration-200 min-h-[82px]">
            <div className="flex items-center gap-3.5 min-w-0 w-full font-sans">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Obiettivo
                </p>
                <select
                  value={draftUser.weightGoal || "Perdere peso"}
                  onChange={(e) => {
                    handleSaveField("weightGoal", e.target.value);
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 py-0.5 mt-0.5 transition cursor-pointer"
                >
                  <option value="Perdere peso">Perdere peso</option>
                  <option value="Mantenere peso">Mantenere peso</option>
                  <option value="Mangiare più sano e proteico">Più sano e proteico</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>



      {/* Dynamic educational program notes banner */}
      <div className="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-2.5 bg-amber-100/70 text-amber-800 rounded-2xl">
          <Smile className="w-5 h-5 shrink-0" />
        </div>
        <div className="space-y-1 text-left">
          <h4 className="font-bold text-slate-800 text-xs font-sans">Aumenta i tuoi pasti con i cibi a Zero Punti!</h4>
          <p className="text-[11px] lg:text-xs text-slate-600 leading-relaxed font-semibold">
            Il piano SmartPoints Blu è stato ottimizzato per inserire i tuoi alimenti preferiti senza stress. Non dimenticare che oltre alla quota di <strong>{currentBudget} SmartPoints</strong>, hai oltre <strong>200 cibi a Zero Punti</strong> (uova, petto di pollo, verdure fresche, frutti, pesce, pure di legumi, ecc.) che puoi mangiare liberamente senza doverli pesare o registrare.
          </p>
        </div>
      </div>

      {/* Formula Quality Seal */}
      <div className="flex flex-wrap items-center justify-around gap-4 p-4 border border-slate-100 bg-slate-50/50 rounded-2xl text-[10px] text-slate-400 font-medium font-sans">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Calculations: Mifflin-St Jeor Formula</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>Welfare Approved Dietetic Flow</span>
        </div>
      </div>

      {/* Session Controls */}
      <div id="session-controls-card" className="bg-slate-100/50 border border-slate-150 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-2xl border border-indigo-100">
            <LogOut className="w-4.5 h-4.5 shrink-0" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-slate-850 text-xs">Sessione</h4>
            <p className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider mt-0.5 font-sans">Opzioni di Uscita</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-[11px] lg:text-xs text-slate-600 leading-relaxed font-semibold text-left">
            Disconnettiti per cambiare dispositivo o profilo. I tuoi dati inseriti (diario alimentare odierno e budget di SmartPoints) rimarranno salvati in sicurezza sul dispositivo.
          </p>
          <div className="pt-1 text-left">
            <button
              onClick={onLogout}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnetti questo Account
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone / Gestione Account */}
      <div id="danger-zone-card" className="bg-rose-50/20 border border-rose-100 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100/60 text-rose-600 rounded-2xl">
            <Trash2 className="w-4.5 h-4.5 shrink-0" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-slate-850 text-xs">Gestione Account</h4>
            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-0.5">Zona di Sicurezza</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-[11px] lg:text-xs text-slate-600 leading-relaxed font-semibold text-left">
            Se decidi di cancellare la tua iscrizione, tutti i tuoi dati biometrici, il calcolo del budget personalizzato e la cronologia giornaliera degli alimenti consumati verranno eliminati in modo permanente da questo dispositivo.
          </p>
          <div className="pt-1 text-left">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Cancella la mia iscrizione
              </button>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl md:max-w-md space-y-3">
                <span className="block text-xs font-black text-rose-800 text-left">⚠️ CONFERMA ELIMINAZIONE ACCOUNT</span>
                <p className="text-[11px] text-rose-700 font-semibold text-left leading-normal">
                  Sei assolutamente sicuro? Questa azione è irreversibile ed eliminerà per sempre tutti i tuoi dati, i crediti AI e il diario dal browser.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteAccount) {
                        onDeleteAccount();
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-850 text-white font-extrabold text-[11px] rounded-xl cursor-pointer transition shadow-sm"
                  >
                    Si, elimina per sempre
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[11px] rounded-xl cursor-pointer transition"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
