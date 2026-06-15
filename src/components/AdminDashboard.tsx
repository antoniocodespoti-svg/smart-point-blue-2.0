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
  Info,
  Calendar,
  History,
  Gift,
  PlusCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  getLocalUsers, 
  saveLocalUsers, 
  updateLocalUser, 
  deleteLocalUser,
  initFirestoreSync
} from "../lib/userDb";

export interface PointsRow {
  id: string;
  data: string;
  punti: number; // Will hold standard credits
  puntiBonus: number; // Will hold bonus credits
  note: string;
}

interface UserPointsHistoryPanelProps {
  user: UserProfile;
  onUpdateUser: (userId: string, updatedData: Partial<UserProfile>) => void;
  showFeedbackMsg: (msg: string) => void;
}

export function UserPointsHistoryPanel({ user, onUpdateUser, showFeedbackMsg }: UserPointsHistoryPanelProps) {
  const [rows, setRows] = useState<PointsRow[]>([]);
  const [inputDate, setInputDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [inputPoints, setInputPoints] = useState<string>("");
  const [inputBonus, setInputBonus] = useState<string>("");
  const [inputNote, setInputNote] = useState<string>("Rifornimento manuale");

  // Load rows from Firestore/localStorage for this user
  useEffect(() => {
    if (user.pointsHistory) {
      setRows(user.pointsHistory);
    } else {
      const key = `ww_points_history_${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setRows(JSON.parse(saved));
        } catch (e) {
          setRows([]);
        }
      } else {
        setRows([]);
      }
    }
  }, [user.id, user.pointsHistory]);

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate) return;

    const newRow: PointsRow = {
      id: Date.now().toString(),
      data: inputDate,
      punti: Number(inputPoints) || 0,
      puntiBonus: Number(inputBonus) || 0,
      note: inputNote.trim() || "Nessuna nota",
    };

    const updated = [...rows, newRow];
    setRows(updated);
    localStorage.setItem(`ww_points_history_${user.id}`, JSON.stringify(updated));

    // Increment user credits by standard points + bonus points
    const addedCredits = newRow.punti + newRow.puntiBonus;
    const updatedCredits = Math.max(0, (user.aiCredits ?? 5) + addedCredits);

    onUpdateUser(user.id, {
      pointsHistory: updated,
      aiCredits: updatedCredits
    });

    if (addedCredits > 0) {
      showFeedbackMsg(`Aggiunti +${addedCredits} crediti a ${user.name}!`);
    } else {
      showFeedbackMsg("Riga aggiunta con successo!");
    }

    // Reset inputs
    setInputPoints("");
    setInputBonus("");
    setInputNote("Rifornimento manuale");
  };

  const handleDeleteRow = (rowId: string, itemPoints: number, itemBonus: number) => {
    const filtered = rows.filter(r => r.id !== rowId);
    setRows(filtered);
    localStorage.setItem(`ww_points_history_${user.id}`, JSON.stringify(filtered));

    // If we are deleting a row, reverse the credits safely
    const removedCredits = itemPoints + itemBonus;
    const updatedCredits = Math.max(0, (user.aiCredits ?? 5) - removedCredits);

    onUpdateUser(user.id, {
      pointsHistory: filtered,
      aiCredits: updatedCredits
    });

    showFeedbackMsg("Riga rimossa dal registro.");
  };

  // Calculate totals
  const totalStandardPoints = rows.reduce((sum, r) => sum + r.punti, 0);
  const totalBonusPoints = rows.reduce((sum, r) => sum + r.puntiBonus, 0);

  return (
    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/50 text-left space-y-4 animate-fade-in w-full">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200/55">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-800">Cronologia di Ricarica Regolamento Crediti</h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-slate-250/30">
          <span>Crediti Correnti: <strong className="text-indigo-600">{user.aiCredits ?? 5}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form area to add row */}
        <form onSubmit={handleAddRow} className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200/40 space-y-3">
          <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Aggiungi Nuova Riga</span>
          
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold block">Seleziona Data</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 select-none" />
              <input 
                type="date"
                required
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 focus:outline-indigo-505 focus:outline-indigo-500 rounded-lg text-xs w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Crediti standard</label>
              <input 
                type="text"
                placeholder="0"
                value={inputPoints}
                onChange={(e) => setInputPoints(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-indigo-500 rounded-lg text-xs w-full font-mono text-center font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Crediti Bonus</label>
              <input 
                type="text"
                placeholder="0"
                value={inputBonus}
                onChange={(e) => setInputBonus(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-indigo-500 rounded-lg text-xs w-full font-mono text-center font-bold text-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold block">Note / Descrizione</label>
            <input 
              type="text"
              placeholder="es. Bonus settimanale, Ricarica"
              value={inputNote}
              onChange={(e) => setInputNote(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-indigo-500 rounded-lg text-xs w-full font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-1.5 rounded-lg transition-all"
          >
            + Aggiungi Riga Registro
          </button>
        </form>

        {/* List of registered rows */}
        <div className="lg:col-span-8 space-y-2">
          <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Righe Crediti Registrate nel Registro</span>
          
          <div className="bg-white border border-slate-200/40 rounded-xl overflow-hidden min-h-[150px] max-h-[250px] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 min-h-[140px]">
                <PlusCircle className="w-5 h-5 text-slate-300 mb-1" />
                <p className="text-[10px] font-black text-slate-400">Nessun caricamento o riga crediti inserita.</p>
                <p className="text-[9px] text-slate-400">Inserisci data e crediti per inserire una nuova riga.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[9px] text-slate-400 uppercase font-black tracking-wider select-none border-b border-slate-100">
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-2 text-center">Crediti Standard</th>
                    <th className="py-2 px-2 text-center">Crediti Bonus</th>
                    <th className="py-2 px-3">Note / Descrizione</th>
                    <th className="py-2 px-3 text-center">Rimuovi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-700 font-mono text-[10.5px]">{r.data}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-600">
                        {r.punti > 0 ? `+${r.punti} Cr` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-indigo-600">
                        {r.puntiBonus > 0 ? `+${r.puntiBonus} Cr` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">{r.note}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(r.id, r.punti, r.puntiBonus)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Stats Summary */}
          {rows.length > 0 && (
            <div className="flex justify-between items-center text-[10px] p-2 bg-slate-50 border border-slate-100/50 rounded-lg text-slate-500 font-bold">
              <span>Caricamenti totali: <strong className="text-slate-800 font-mono">{rows.length}</strong></span>
              <div className="flex gap-4">
                <span>Crediti standard ricaricati: <strong className="text-emerald-600 font-mono">+{totalStandardPoints} Cr</strong></span>
                <span>Crediti Bonus ricaricati: <strong className="text-indigo-600 font-mono">+{totalBonusPoints} Cr</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  currentUser: UserProfile;
  onRefreshCurrentUser: () => void;
}

export function AdminDashboard({ currentUser, onRefreshCurrentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const local = getLocalUsers();
      return local.map(u => ({
        ...u,
        aiCredits: u.aiCredits ?? 5,
        totalTokensUsed: u.totalTokensUsed ?? 0,
        totalCostEur: u.totalCostEur ?? 0
      }));
    } catch (e) {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Helper function to decode firestore sync error details and show friendly message
  const getParsedSyncError = () => {
    if (!syncError) return null;
    
    try {
      const errorStr = syncError.trim();
      if (errorStr.startsWith("{") && errorStr.endsWith("}")) {
        const parsed = JSON.parse(errorStr);
        const innerError = parsed.error || "";
        const lowerInner = innerError.toLowerCase();
        const isPermissionDenied = lowerInner.includes("permission-denied") || lowerInner.includes("insufficient permissions");
        const isQuotaExceeded = lowerInner.includes("quota exceeded") || lowerInner.includes("resource_exhausted") || lowerInner.includes("exhausted");
        const isOffline = lowerInner.includes("offline") || lowerInner.includes("network");

        let userFriendlyMsg = "Errore di sincronizzazione con il Database Cloud.";
        let recommendation = "Si è verificato un errore durante la connessione a Firestore. Il sistema continuerà ad aggiornare i dati nel tuo browser.";
        let consoleDbLink = "";

        if (isQuotaExceeded) {
          userFriendlyMsg = "Quota Giornaliera di Firestore Superata (Spark Plan raggiunto).";
          recommendation = "È stato superato il limite gratuito di letture o scritture giornaliere per questo database Firestore. La quota si azzera automaticamente a mezzanotte (ora di Firebase server). Se possiedi il controllo del progetto, puoi aggiornare il piano a Blaze per sbloccare limiti superiori.";
          consoleDbLink = "https://console.firebase.google.com/project/optimistic-winter-zjk7s/firestore/databases/ai-studio-10df2630-d456-4ed5-9120-f652459e095d/data?openUpgradeDialog=true";
        } else if (isPermissionDenied) {
          userFriendlyMsg = "Permessi non autorizzati (Firebase Security Rules).";
          recommendation = "Le regole di sicurezza di Firestore (firestore.rules) non consentono l'operazione richiesta. Chiudi il terminale e riapri se hai appena applicato le regole, oppure verifica di avere configurato correttamente l'accesso pubblico.";
        } else if (isOffline) {
          userFriendlyMsg = "Connessione Cloud non riuscita (Offline).";
          recommendation = "Il server Firebase non risponde o il tuo dispositivo è disconnesso da Internet. I tuoi progressi vengono memorizzati localmente in sicurezza.";
        } else if (innerError) {
          userFriendlyMsg = innerError;
        }

        return {
          formatted: userFriendlyMsg,
          recommendation,
          consoleDbLink,
          operation: parsed.operationType || "Realtime-Sync",
          path: parsed.path || "users",
          details: innerError
        };
      }
    } catch (e) {
      // Fallback
    }

    const lowerStr = syncError.toLowerCase();
    const isQuota = lowerStr.includes("quota exceeded") || lowerStr.includes("resource_exhausted") || lowerStr.includes("exhausted");
    const isPerm = lowerStr.includes("permission-denied") || lowerStr.includes("insufficient");
    
    return {
      formatted: syncError,
      recommendation: isQuota 
        ? "La quota di letture gratuite giornaliere di Firestore è esaurita. Il limite si resetterà a mezzanotte."
        : isPerm 
          ? "Controlla le regole di sicurezza di Firebase Firestore (firestore.rules) che devono essere configurate correttamente per consentire l'accesso."
          : "Sincronizzazione momentaneamente interrotta. Verifica la connessione internet.",
      consoleDbLink: isQuota 
        ? "https://console.firebase.google.com/project/optimistic-winter-zjk7s/firestore/databases/ai-studio-10df2630-d456-4ed5-9120-f652459e095d/data?openUpgradeDialog=true"
        : "",
      operation: "Realtime-Sync",
      path: "users",
      details: syncError
    };
  };

  const parsedError = getParsedSyncError();

  useEffect(() => {
    if (!currentUser) return;

    // Listen in real-time to Firestore users collection
    const unsubscribe = initFirestoreSync(undefined, (allUsers) => {
      const sanitized = allUsers.map(u => ({
        ...u,
        aiCredits: u.aiCredits ?? 5,
        totalTokensUsed: u.totalTokensUsed ?? 0,
        totalCostEur: u.totalCostEur ?? 0
      }));
      setUsers(sanitized);
      setSyncError(null);
    }, (err) => {
      console.error("Firebase sync error inside admin dashboard:", err);
      setSyncError(err?.message || "Impossibile caricare i dati in tempo reale da Firebase. Verificare la connessione o i permessi.");
    });

    return () => unsubscribe();
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

  const handleUpdateUser = (userId: string, updatedData: Partial<UserProfile>) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, ...updatedData };
      }
      return u;
    });
    setUsers(updatedUsers);
    updateLocalUser(userId, updatedData);

    // If it is the current logged-in user, sync session
    if (userId === currentUser.id) {
      const curUserSaved = localStorage.getItem("ww_current_user");
      if (curUserSaved) {
        const parsed = { ...JSON.parse(curUserSaved), ...updatedData };
        localStorage.setItem("ww_current_user", JSON.stringify(parsed));
        onRefreshCurrentUser();
      }
    }
  };

  const handleApproveUser = async (userId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, approved: true };
      }
      return u;
    });
    setUsers(updatedUsers);
    updateLocalUser(userId, { approved: true });
    showFeedbackMsg("Utente approvato con successo!");
  };

  // Quick action: recharge all users
  const handleRechargeAll = async () => {
    const parsedAmount = Math.max(0, Number(rechargeAmount) || 5);
    const updatedUsers = users.map(u => ({
      ...u,
      aiCredits: (u.aiCredits ?? 5) + parsedAmount
    }));

    setUsers(updatedUsers);

    for (const u of users) {
      const newCredits = (u.aiCredits ?? 5) + parsedAmount;
      updateLocalUser(u.id, { aiCredits: newCredits });
    }

    // Update current user too
    const curUserSaved = localStorage.getItem("ww_current_user");
    if (curUserSaved) {
      const parsed = JSON.parse(curUserSaved);
      parsed.aiCredits = (parsed.aiCredits ?? 5) + parsedAmount;
      localStorage.setItem("ww_current_user", JSON.stringify(parsed));
      onRefreshCurrentUser();
    }
    showFeedbackMsg(`Ricaricati +${parsedAmount} crediti a TUTTI gli utenti!`);
    
    // Reset input
    setRechargeAmount("");
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
          <span>{feedback}</span>
        </div>
      )}

      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-550/10 blur-3.5xl rounded-full translate-x-12 -translate-y-12 select-none pointer-events-none" />
        <div className="relative space-y-2 max-w-2xl text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5" /> Pannello Amministrazione Certificato
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight">Pannello Amministrazione</h1>
          <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
            Gestisci le quote di crediti individuali e analizza in modo dettagliato le abitudini alimentari di tutti i tuoi utenti registrati.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Registered Users & Quick Info */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Utenti Registrati</span>
              <span className="text-2xl font-black text-slate-800">{totalUsers}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${syncError ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                <span className="block text-[9px] text-slate-500">
                  {syncError ? "Sincronizzazione Fallita" : "Sincronizzato Cloud (Real-time)"}
                </span>
              </div>
            </div>
          </div>
          {parsedError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-left space-y-2">
              <span className="text-[10px] font-black text-rose-800 select-none uppercase tracking-wider block">⚠️ Errore Database Cloud</span>
              <p className="text-[11px] font-bold text-rose-800 leading-tight">{parsedError.formatted}</p>
              <p className="text-[9px] text-rose-700 leading-relaxed font-medium">{parsedError.recommendation}</p>
              
              {parsedError.consoleDbLink && (
                <a 
                  href={parsedError.consoleDbLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-150 hover:bg-rose-200 border border-rose-200 text-rose-900 rounded-lg text-[9px] font-bold transition-all transition-duration-150 mt-1"
                >
                  <Database className="w-3 h-3 shrink-0" />
                  Apri Console Upgrade Database →
                </a>
              )}
              
              <div className="pt-1.5 border-t border-rose-200/40 font-mono text-[8px] text-rose-600/70 space-y-0.5">
                <div>Operazione: {parsedError.operation}</div>
                <div>Percorso: {parsedError.path}</div>
                {parsedError.details && <div className="truncate max-w-full" title={parsedError.details}>Dettagli: {parsedError.details}</div>}
              </div>
            </div>
          )}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <p className="text-[9px] leading-tight text-left">
              Consiglio: grazie al re-sync intelligente, tutti i profili registrati offline sul dispositivo vengono caricati in automatico su Firestore non appena viene ristabilita la connessione cloud.
            </p>
          </div>
        </div>

        {/* Global Admin Tools Quick Panel */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 text-left">
            <h3 className="text-sm font-bold text-slate-800 font-sans">Opzioni di Controllo Rapido</h3>
            <p className="text-[10px] text-slate-400">Rifornimento dei crediti di sistema e ripristino dei database.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Recharge Card */}
            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 text-left space-y-3">
              <span className="text-[11px] font-bold text-indigo-950 block">Rifornimento Crediti Multi-User</span>
              <p className="text-[10px] text-indigo-700 leading-relaxed font-sans font-medium">
                Scegli quanti crediti aggiungere a tutti gli utenti del sistema contemporaneamente con un solo clic.
              </p>
              
              <div className="flex gap-2 items-center">
                <input 
                  type="text"
                  placeholder="5"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="w-16 text-center text-xs font-black font-mono border border-indigo-200/60 rounded-xl px-2 py-1.5 focus:outline-indigo-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleRechargeAll}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-xl transition shadow-xs hover:scale-[1.01] flex items-center justify-center gap-1 cursor-pointer"
                >
                  Ricarica Tutti di +{rechargeAmount || 5}
                </button>
              </div>
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
        </div>

      </div>

      {/* Pending Registration Requests Panel */}
      {(() => {
        const pendingUsersList = users.filter(u => u.approved === false);
        if (pendingUsersList.length === 0) return null;
        return (
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-3xl p-6 text-left space-y-4 shadow-sm animate-fade-in">
            <div>
              <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                Richieste di Registrazione in Attesa ({pendingUsersList.length})
              </h3>
              <p className="text-[10px] text-amber-800/80 font-medium">Questi utenti si sono appena registrati e necessitano della tua approvazione per poter accedere ed utilizzare il diario.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsersList.map(u => (
                <div key={u.id} className="bg-white border border-amber-100/50 hover:border-amber-200/50 rounded-2xl p-4 flex justify-between items-center shadow-xs transition">
                  <div className="space-y-1">
                    <span className="block text-xs font-black text-slate-800 leading-none">{u.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{u.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveUser(u.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserToDeleteId(u.id);
                        showFeedbackMsg("Utilizza la tabella sottostante per rifiutare/eliminare l'utente.");
                      }}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl transition cursor-pointer"
                    >
                      Rifiuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main Interactive Table Grid */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden text-left">
        
        {/* Table header selection bar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">Elenco Completo degli Account Registrati</h3>
            <p className="text-[10px] text-slate-400 font-sans">Elenco degli utenti registrati e gestione dei crediti di elaborazione.</p>
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
              <span>Solo attivi</span>
            </label>
          </div>
        </div>

        {/* User profile selection list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/60 uppercase text-[9px] font-black text-slate-400 tracking-wider border-b border-slate-100 select-none">
                <th className="py-3.5 px-5">Utente / Profilo</th>
                <th className="py-3.5 px-3 text-center">Punti Standard Caricati</th>
                <th className="py-3.5 px-3 text-center">Bonus Convertito (€)</th>
                <th className="py-3.5 px-3 text-center">Consumo (€)</th>
                <th className="py-3.5 px-3 text-center">Quota Crediti</th>
                <th className="py-3.5 px-5 text-center">Azioni Staff</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-medium">Nessun utente trovato con i parametri correnti.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const creditsLeft = u.aiCredits ?? 5;
                  const isPowerUser = u.email === "bruna65b@gmail.com" ||
                    u.name.toLowerCase() === "bruna" ||
                    u.name.toLowerCase() === "bruna65b" ||
                    u.name.toLowerCase() === "admin";

                  // Calcola i punti caricati e bonus ricarica dal database o localStorage per ogni utente
                  const rowsSource = u.pointsHistory || (() => {
                    const key = `ww_points_history_${u.id}`;
                    const saved = localStorage.getItem(key);
                    if (saved) {
                      try {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed)) return parsed;
                      } catch (e) {}
                    }
                    return [];
                  })();

                  let totalStandardPoints = 0;
                  let totalBonusPoints = 0;
                  rowsSource.forEach((r: any) => {
                    totalStandardPoints += Number(r.punti) || 0;
                    totalBonusPoints += Number(r.puntiBonus) || 0;
                  });
                  const bonusInEur = totalBonusPoints / 1000;
                  const userCost = u.totalCostEur ?? 0;

                  return (
                    <React.Fragment key={u.id}>
                      <tr 
                        onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                        className={`border-b border-slate-100 bg-white transition hover:bg-slate-50/40 cursor-pointer select-none ${
                          expandedUserId === u.id ? "bg-slate-50/30" : ""
                        }`}
                      >
                        {/* Name and email details with Expand Chevron */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="text-slate-400 shrink-0">
                              {expandedUserId === u.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs select-none">
                              {u.name.substring(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-800">{u.name}</span>
                                {isPowerUser && (
                                  <span className="bg-indigo-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded tracking-wide uppercase select-none">
                                    Amministratore
                                  </span>
                                )}
                                {u.approved === false && (
                                  <span className="bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded tracking-wide uppercase select-none">
                                    In attesa
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-400 font-medium">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Punti Standard Caricati */}
                        <td className="py-4 px-3 text-center">
                          <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            {totalStandardPoints}
                          </span>
                        </td>

                        {/* Bonus Ricarica Convertito in Euro (1000 Pt = 1€) */}
                        <td className="py-4 px-3 text-center">
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                            €{bonusInEur.toFixed(2)}
                          </span>
                        </td>

                        {/* Consumo Realizzato (€) */}
                        <td className="py-4 px-3 text-center">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                            €{userCost.toFixed(5)}
                          </span>
                        </td>

                        {/* Credits display - without plus and minus buttons */}
                        <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-md ${
                            creditsLeft === 0 ? "text-rose-600 bg-rose-50 animate-pulse" : "text-indigo-600 bg-indigo-50/70"
                          }`}>
                            {creditsLeft}
                          </span>
                        </td>

                        {/* Admin actions block */}
                        <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center items-center font-sans">
                            {u.approved === false && (
                              <button
                                onClick={() => handleApproveUser(u.id)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg cursor-pointer transition shadow-xs whitespace-nowrap"
                              >
                                Approva
                              </button>
                            )}
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
                                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-lg cursor-pointer transition"
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

                      {/* Expended detail logs row */}
                      {expandedUserId === u.id && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="p-4 sm:p-6 border-b border-slate-200/50 bg-slate-50/20">
                            <UserPointsHistoryPanel 
                              user={u} 
                              onUpdateUser={handleUpdateUser}
                              showFeedbackMsg={showFeedbackMsg}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
