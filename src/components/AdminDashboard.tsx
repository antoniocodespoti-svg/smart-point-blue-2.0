import React, { useState, useEffect } from "react";
import { UserProfile, FoodTrackItem } from "../types";
import { 
  Users, 
  Sparkles, 
  Euro, 
  Database, 
  Search, 
  Plus, 
  Minus, 
  RotateCcw, 
  UserCheck, 
  TrendingUp, 
  Trash2, 
  Info
} from "lucide-react";
import { 
  getLocalUsers, 
  saveLocalUsers, 
  updateLocalUser, 
  deleteLocalUser 
} from "../lib/userDb";

interface AdminDashboardProps {
  currentUser: UserProfile;
  onRefreshCurrentUser: () => void;
}

export function AdminDashboard({ currentUser, onRefreshCurrentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(5);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

  // Load all registered users from local state
  const loadUsers = async () => {
    try {
      const parsed = getLocalUsers();

      // Ensure metrics exist
      const sanitized = parsed.map(u => ({
        ...u,
        aiCredits: u.aiCredits ?? 5,
        totalTokensUsed: u.totalTokensUsed ?? 0,
        totalCostEur: u.totalCostEur ?? 0
      }));
      setUsers(sanitized);
    } catch (err) {
      console.error("Error loading users:", err);
      const sanitizedCurrent = {
        ...currentUser,
        aiCredits: currentUser.aiCredits ?? 5,
        totalTokensUsed: currentUser.totalTokensUsed ?? 0,
        totalCostEur: currentUser.totalCostEur ?? 0
      };
      setUsers([sanitizedCurrent]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const showFeedbackMsg = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Modify individual user's credits
  const handleUpdateCredits = async (userId: string, amount: number) => {
    let targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const newCredits = Math.max(0, (targetUser.aiCredits ?? 5) + amount);

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, aiCredits: newCredits };
      }
      return u;
    });

    setUsers(updatedUsers);
    updateLocalUser(userId, { aiCredits: newCredits });

    // If it is the current logged-in user, sync session
    if (userId === currentUser.id) {
      const curUserSaved = localStorage.getItem("ww_current_user");
      if (curUserSaved) {
        const parsed = JSON.parse(curUserSaved);
        parsed.aiCredits = newCredits;
        localStorage.setItem("ww_current_user", JSON.stringify(parsed));
        onRefreshCurrentUser();
      }
    }
    showFeedbackMsg("Crediti aggiornati con successo!");
  };

  // Quick action: recharge all users
  const handleRechargeAll = async () => {
    const updatedUsers = users.map(u => ({
      ...u,
      aiCredits: (u.aiCredits ?? 5) + rechargeAmount
    }));

    setUsers(updatedUsers);

    for (const u of users) {
      const newCredits = (u.aiCredits ?? 5) + rechargeAmount;
      updateLocalUser(u.id, { aiCredits: newCredits });
    }

    // Update current user too
    const curUserSaved = localStorage.getItem("ww_current_user");
    if (curUserSaved) {
      const parsed = JSON.parse(curUserSaved);
      parsed.aiCredits = (parsed.aiCredits ?? 5) + rechargeAmount;
      localStorage.setItem("ww_current_user", JSON.stringify(parsed));
      onRefreshCurrentUser();
    }
    showFeedbackMsg(`Ricaricati +${rechargeAmount} crediti a TUTTI gli utenti!`);
  };

  // Reset metrics (tokens used and cost) for clean testing
  const handleResetMetrics = async () => {
    const updatedUsers = users.map(u => ({
      ...u,
      totalTokensUsed: 0,
      totalCostEur: 0
    }));

    setUsers(updatedUsers);

    for (const u of users) {
      updateLocalUser(u.id, { totalTokensUsed: 0, totalCostEur: 0 });
    }

    // Update current user
    const curUserSaved = localStorage.getItem("ww_current_user");
    if (curUserSaved) {
      const parsed = JSON.parse(curUserSaved);
      parsed.totalTokensUsed = 0;
      parsed.totalCostEur = 0;
      localStorage.setItem("ww_current_user", JSON.stringify(parsed));
      onRefreshCurrentUser();
    }
    showFeedbackMsg("Tutte le metriche di consumo sono state azzerate!");
  };

  // Delete/Ban user (except standard protection)
  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === currentUser.id) {
      showFeedbackMsg("Errore: Non puoi eliminare il tuo stesso account!");
      return;
    }

    const filtered = users.filter(u => u.id !== userId);
    setUsers(filtered);
    deleteLocalUser(userId);

    // Clean tracking
    localStorage.removeItem(`ww_blue_budget_${userId}`);
    localStorage.removeItem(`ww_blue_tracked_${userId}`);
    showFeedbackMsg(`Utente ${email} rimosso dal database.`);
    setUserToDeleteId(null);
  };

  // Reset all registered non-admin users (wipe users collection from localStorage except admin/demo)
  const handleResetAllUsers = async () => {
    if (!window.confirm("Sei assolutamente sicuro di voler resettare TUTTI gli account registrati? Svuoterà la collezione utenti locali (ad esclusione di 'demo' e del tuo account admin). Gli utenti dovranno registrarsi di nuovo.")) {
      return;
    }

    try {
      const usersToDelete = users.filter(u => u.id !== currentUser.id && u.name !== "demo" && u.email !== "demo@smartpoints-v3.internal");
      
      for (const u of usersToDelete) {
        deleteLocalUser(u.id);
        localStorage.removeItem(`ww_blue_budget_${u.id}`);
        localStorage.removeItem(`ww_blue_tracked_${u.id}`);
        localStorage.removeItem(`ww_blue_tracked_${u.email}`);
      }

      showFeedbackMsg("Reset completato con successo! Tutti gli account tranne demo e admin rimossi.");
      await loadUsers();
    } catch (err: any) {
      console.error("Error resetting all users:", err);
      showFeedbackMsg("Errore durante il reset dei profili: " + err.message);
    }
  };

  // Filter & Search users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterActiveOnly) {
      return matchesSearch && (u.totalTokensUsed && u.totalTokensUsed > 0);
    }
    return matchesSearch;
  });

  // Calculate aggregation metrics for analysis
  const totalUsers = users.length;
  const totalTokens = users.reduce((acc, u) => acc + (u.totalTokensUsed ?? 0), 0);
  const totalCost = users.reduce((acc, u) => acc + (u.totalCostEur ?? 0), 0);
  const totalCredits = users.reduce((acc, u) => acc + (u.aiCredits ?? 0), 0);

  // Custom visual high-end styling components for graphs and metrics
  return (
    <div className="space-y-8" id="admin-dashboard-root">
      
      {/* Dynamic Action Notification */}
      {feedback && (
        <div className="fixed top-20 right-4 bg-slate-900 border border-indigo-500 text-white font-medium text-xs py-3 px-5 rounded-2xl shadow-xl z-50 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Intro Bannner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-550/10 blur-3.5xl rounded-full translate-x-12 -translate-y-12 select-none pointer-events-none" />
        <div className="relative space-y-2 max-w-2xl text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5" /> Pannello Moderatore Certificato
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight">Pannello Amministrazione & Analisi AI</h1>
          <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
            Tieni traccia dell'utilizzo dei token della tua istanza di **Gemini 2.0/3.5**, gestisci le quote di crediti individuali e analizza in modo dettagliato le abitudini alimentari di tutti i tuoi utenti registrati.
          </p>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Registered Users */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Utenti Registrati</span>
            <span className="text-xl font-black text-slate-800">{totalUsers}</span>
            <span className="block text-[9px] text-slate-400 mt-0.5">Database locale</span>
          </div>
        </div>

        {/* Card 2: Total Token Consumption */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div className="text-left font-sans">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Token Utilizzati</span>
            <span className="text-xl font-black text-slate-800 font-mono">{totalTokens.toLocaleString()}</span>
            <span className="block text-[9px] text-indigo-500 font-bold mt-0.5">Input & Output Gemini</span>
          </div>
        </div>

        {/* Card 3: Actual Costs generated */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Euro className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Spesa Stimata API</span>
            <span className="text-xl font-black text-emerald-600 font-mono">€{totalCost.toFixed(4)}</span>
            <span className="block text-[9px] text-emerald-500 font-bold mt-0.5">Basato su tariffe reali</span>
          </div>
        </div>
      </div>

      {/* Analysis Graphic Charts (Bento visualizer without dependencies) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Token consumption and cost distribution visual bar-chart and list (pure high-fidelity custom visualizer) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-800">Analisi Costi / Consumo per Singolo Account</h3>
              <p className="text-[10px] text-slate-400">Rapporto visivo del costo generato da ciascun utente sul budget dell'amministratore.</p>
            </div>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="space-y-5">
            {users.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nessun dato di utilizzo registrato.</p>
            ) : (
              users.map((u, i) => {
                const percentageCost = totalCost > 0 ? ((u.totalCostEur ?? 0) / totalCost) * 100 : 0;
                return (
                  <div key={u.id} className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${(i * 137.5) % 360}, 65%, 55%)` }} />
                        <span className="font-extrabold text-slate-705 truncate max-w-[150px]">{u.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">({u.email})</span>
                      </div>
                      <div className="font-mono text-[11px] font-bold text-slate-700 flex gap-2">
                        <span>{u.totalTokensUsed?.toLocaleString()} Pk</span>
                        <span className="text-slate-400 font-medium">|</span>
                        <span className="text-indigo-650 font-extrabold">€{u.totalCostEur?.toFixed(5)}</span>
                      </div>
                    </div>

                    {/* Styled ProgressBar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full transition-all duration-500 rounded-full" 
                        style={{ 
                          width: `${Math.max(3, percentageCost)}%`,
                          backgroundColor: `hsl(${(i * 137.5) % 360}, 65%, 55%)` 
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cost legend notes */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1 text-[10.5px] text-slate-500 leading-normal text-left">
            <span className="font-bold text-slate-700 block">ℹ Come vengono stimati i costi Gemini API?</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>**Modello di base**: <span className="font-mono text-slate-700">gemini-3.5-flash</span></li>
              <li>**Input Tariffa**: $0.075 / milione di token (~€0.069)</li>
              <li>**Output Risposta**: $0.30 / milione di token (~€0.276)</li>
              <li>Consumando una media di **3,400 token** per menu e **750 token** per alimento, ciascuna operazione ha un costo trascurabile inferiore ad un centesimo di euro (€0.0003 - €0.0009).</li>
            </ul>
          </div>
        </div>

        {/* Global Admin Tools Quick Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 text-left">
              <h3 className="text-sm font-bold text-slate-800 font-sans">Opzioni di Controllo Rapido</h3>
              <p className="text-[10px] text-slate-400">Ricarica automatica intelligente e pulizia dei log di test.</p>
            </div>

            {/* Quick Recharge Card */}
            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[11px] font-bold text-indigo-950 block">Rifornimento Crediti Multi-User</span>
              <p className="text-[10px] text-indigo-700 leading-relaxed font-sans font-medium">
                Scegli quanti crediti AI aggiungere a tutti gli utenti del sistema contemporaneamente con un solo clic.
              </p>
              
              <div className="flex gap-2 items-center">
                <input 
                  type="number"
                  min="1"
                  max="50"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center text-xs font-black font-mono border border-indigo-200/60 rounded-xl px-2 py-1.5 focus:outline-indigo-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleRechargeAll}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-xl transition shadow-xs hover:scale-[1.01] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ricarica Tutti di +{rechargeAmount}
                </button>
              </div>
            </div>

            {/* Emergency resetting */}
            <div className="bg-rose-50/50 border border-rose-100/40 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[11px] font-bold text-rose-950 block">Azzera Statistiche Uso</span>
              <p className="text-[10px] text-rose-700 leading-relaxed font-sans font-medium">
                Pulisce a zero il contatore dei token consumati e la stima cumulativa del costo in euro per tutti i profili registrati.
              </p>
              <button
                type="button"
                onClick={handleResetMetrics}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] w-full py-1.5 px-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Azzera Log Consumi
              </button>
            </div>

            {/* Reset All Non-Admin Accounts */}
            <div className="bg-amber-50/50 border border-amber-100/40 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[11px] font-bold text-amber-950 block">Ripristina Tabella Utenti</span>
              <p className="text-[10px] text-amber-700 leading-relaxed font-sans font-medium">
                Svuota completamente i profili utente registrati da Firestore (esclusi demo@smartpoints.it e il moderatore). Gli utenti potranno registrarsi di nuovo.
              </p>
              <button
                type="button"
                onClick={handleResetAllUsers}
                className="bg-amber-600 hover:bg-amber-750 text-white font-extrabold text-[11px] w-full py-1.5 px-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Svuota Utenti & Ripristina
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <p className="text-[9px] leading-tight text-left">
              Consiglio: per i test di compatibilità, le credenziali sono salvate interamente in chiaro nel client database (localStorage) del browser in uso.
            </p>
          </div>
        </div>

      </div>

      {/* Main Interactive Table Grid */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden text-left">
        
        {/* Table header selection bar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">Elenco Completo degli Account Registrati</h3>
            <p className="text-[10px] text-slate-400 font-sans">Elenco degli utenti registrati e gestione dei crediti AI.</p>
          </div>

          {/* Search bar & filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Cerca utente per email o nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-150 rounded-xl text-xs font-medium w-48 bg-slate-50/50"
              />
            </div>

            <label className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-bold select-none cursor-pointer">
              <input 
                type="checkbox"
                checked={filterActiveOnly}
                onChange={(e) => setFilterActiveOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-350 accent-indigo-600"
              />
              <span>Solo attivi (AI)</span>
            </label>
          </div>
        </div>

        {/* User profile selection list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/60 uppercase text-[9px] font-black text-slate-400 tracking-wider border-b border-slate-100 select-none">
                <th className="py-3.5 px-5">Utente / Profilo</th>
                <th className="py-3.5 px-3">Dati Biometrici</th>
                <th className="py-3.5 px-3">Budget SP</th>
                <th className="py-3.5 px-3 text-center">AI Crediti Quota</th>
                <th className="py-3.5 px-3 text-right">Analisi Token</th>
                <th className="py-3.5 px-3 text-right">Spesa API</th>
                <th className="py-3.5 px-5 text-center">Azioni Staff</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-medium">Nessun utente trovato con i parametri correnti.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const creditsLeft = u.aiCredits ?? 5;
                  const isPowerUser = u.email === "bruna65b@gmail.com" ||
                    u.name.toLowerCase() === "bruna" ||
                    u.name.toLowerCase() === "bruna65b" ||
                    u.name.toLowerCase() === "admin";

                  return (
                    <tr 
                      key={u.id}
                      className="border-b border-slate-100 bg-white transition hover:bg-slate-50/20"
                    >
                      {/* Name and email details */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-indigo-50 text-indigo-655 text-indigo-600 rounded-xl font-bold text-xs select-none">
                            {u.name.substring(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-800">{u.name}</span>
                              {isPowerUser && (
                                <span className="bg-indigo-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded tracking-wide uppercase select-none">
                                  Amministratore
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] text-slate-400 font-medium">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Weight, height, age info */}
                      <td className="py-4 px-3 text-xs text-slate-500 font-medium">
                        <span className="block font-bold text-slate-700">Età: {u.age} anni</span>
                        <span className="block text-[10px] text-slate-400 capitalize">{u.gender === 'male' ? 'Uomo' : 'Donna'} • {u.weight} Kg</span>
                      </td>

                      {/* SP points count */}
                      <td className="py-4 px-3 text-xs font-bold text-slate-800">
                        <span className="bg-amber-100/70 text-amber-900 border border-amber-200/50 px-2 py-0.5 rounded-lg">
                          {u.budgetPoints || 23} SP
                        </span>
                      </td>

                      {/* Credits adjustments */}
                      <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/30">
                          <button
                            onClick={() => handleUpdateCredits(u.id, -1)}
                            className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded text-slate-500 cursor-pointer self-center transition-colors"
                            title="Togli un credito"
                            disabled={creditsLeft <= 0}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`text-[11.5px] font-black font-sans min-w-[34px] tracking-tight block ${
                            creditsLeft === 0 ? "text-rose-650 animate-pulse font-black" : "text-slate-805 text-slate-800"
                          }`}>
                            {creditsLeft}/5
                          </span>
                          <button
                            onClick={() => handleUpdateCredits(u.id, 1)}
                            className="p-1 hover:bg-emerald-100 hover:text-emerald-600 rounded text-slate-500 cursor-pointer self-center transition-colors"
                            title="Aggiungi un credito"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Detailed numeric reports */}
                      <td className="py-4 px-3 text-right font-mono text-[11px] text-slate-600 font-bold">
                        {(u.totalTokensUsed ?? 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-3 text-right font-mono text-xs font-black text-indigo-650">
                        €{(u.totalCostEur ?? 0).toFixed(6)}
                      </td>

                      {/* Admin actions block */}
                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center items-center">
                          {userToDeleteId === u.id ? (
                            <div className="flex gap-1 items-center">
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg cursor-pointer transition shadow-xs whitespace-nowrap"
                              >
                                Sì, elimina
                              </button>
                              <button
                                onClick={() => setUserToDeleteId(null)}
                                className="px-2 py-1.5 bg-slate-205 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-lg cursor-pointer transition"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (u.id === currentUser.id) {
                                  showFeedbackMsg("Errore: Non puoi eliminare te stesso!");
                                } else {
                                  setUserToDeleteId(u.id);
                                }
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-150 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition flex items-center justify-center"
                              title="Elimina account permanente"
                              disabled={u.id === currentUser.id}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
