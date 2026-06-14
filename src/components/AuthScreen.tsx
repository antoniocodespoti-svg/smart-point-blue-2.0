import React, { useState } from "react";
import { UserProfile } from "../types";
import { SUGGESTED_BUDGET_CALCULATOR } from "../data";
import { Lock, User, ArrowRight, Salad, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { 
  findLocalUserByUsername, 
  createLocalUser 
} from "../lib/userDb";

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [regSuccess, setRegSuccess] = useState<boolean>(false);

  // Form states - Login
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Form states - Register
  const [regUsername, setRegUsername] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = loginUsername.trim();
    if (!trimmedUser || !loginPassword) {
      setError("Inserisci sia il nome utente che la password.");
      return;
    }

    setIsAuthLoading(true);
    // Simulate minor network delay for a premium user feel
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const user = findLocalUserByUsername(trimmedUser);
      if (user) {
        if (user.password === loginPassword) {
          if (user.approved === false) {
            setError("La tua iscrizione è in attesa di approvazione da parte dell'amministratore. Riprova più tardi.");
          } else {
            onLoginSuccess(user);
          }
        } else {
          setError("Password non corretta. Verifica le tue credenziali e riprova.");
        }
      } else {
        setError("Questo utente non è registrato. Per favore, registrati prima nella scheda apposita.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Errore imprevisto durante l'accesso.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = regUsername.trim();
    if (!trimmedUser || !regPassword) {
      setError("Scegli un nome utente e una password.");
      return;
    }

    if (trimmedUser.length < 3) {
      setError("Il nome utente deve contenere almeno 3 caratteri.");
      return;
    }

    if (regPassword.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }

    const usernameLower = trimmedUser.toLowerCase();

    // Check reserved names
    const reservedNames = ["demo", "admin", "moderator"];
    if (reservedNames.includes(usernameLower)) {
      setError("Questo nome utente è riservato o già occupato. Scegline un altro.");
      return;
    }

    setIsAuthLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const existingUser = findLocalUserByUsername(trimmedUser);

      if (existingUser) {
        if (existingUser.approved === false) {
          setError("Questo nome utente ha o ha già una richiesta di registrazione in attesa di approvazione. Attendi l'attivazione dell'amministratore o scegli un nome diverso.");
        } else {
          setError("Questo nome utente è già occupato e attivo. Scegline un altro o effettua l'accesso.");
        }
        setIsAuthLoading(false);
        return;
      }

      const defaultGender = "female";
      const defaultAge = 35;
      const defaultWeight = 70;
      const defaultHeight = 165;
      const defaultActivity = "sedentary";
      const defaultGoal = "Perdere peso";

      const budgetPoints = SUGGESTED_BUDGET_CALCULATOR.getSuggestedPoints(
        defaultGender,
        defaultAge,
        defaultWeight,
        defaultHeight,
        defaultActivity,
        defaultGoal
      );

      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        name: trimmedUser,
        email: `${usernameLower.replace(/[^a-z0-9]/g, "")}@smartpoints-v3.internal`,
        password: regPassword,
        budgetPoints: budgetPoints,
        gender: defaultGender,
        age: defaultAge,
        weight: defaultWeight,
        height: defaultHeight,
        activityLevel: defaultActivity as any,
        weightGoal: defaultGoal,
        aiCredits: 5,
        totalTokensUsed: 0,
        totalCostEur: 0,
        approved: false
      };

      createLocalUser(newUser);
      setRegSuccess(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Impossibile completare la registrazione.");
    } finally {
      setIsAuthLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased font-sans flex flex-col justify-center items-center py-12 px-4 shadow-sm">
      
      {/* Brand logo at top */}
      <div className="flex flex-col items-center gap-3 mb-8 text-center">
        <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-650 text-white rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center">
          <Salad className="w-8 h-8" />
        </div>
        <div>
          <h1 className="font-sans font-black text-slate-900 tracking-tight text-2xl pr-1.5">
            SmartPoints <span className="text-blue-600">Blu</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-sm mt-1">
            Il pianificatore di dieta intelligente e personalizzato sul piano SmartPoints Blu
          </p>
        </div>
      </div>

      {/* Main Form container shadow-xl */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-md">
        
        {regSuccess ? (
          <div className="text-center space-y-5 py-4 animate-fade-in block">
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
              <span className="text-xl">⏳</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Iscrizione Ricevuta</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                La tua registrazione è stata inviata con successo! Un amministratore dovrà approvare il tuo account prima che tu possa accedere ed utilizzare l'applicazione.
              </p>
            </div>
            <button
              onClick={() => {
                setRegSuccess(false);
                setIsRegister(false);
                setLoginUsername(regUsername); // prefill registered name
                setLoginPassword("");
              }}
              className="w-full bg-gradient-to-tr from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white font-semibold text-xs py-3 rounded-xl shadow-md transition cursor-pointer"
            >
              Accedi con il tuo account
            </button>
          </div>
        ) : (
          <>
            {/* Toggle Access method tab */}
            <div className="flex bg-slate-100/70 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className={`w-1/2 py-2 pr-1 text-xs font-bold rounded-xl cursor-pointer transition ${
                  !isRegister ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Accedi
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className={`w-1/2 py-2 pr-1 text-xs font-bold rounded-xl cursor-pointer transition ${
                  isRegister ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Registrati
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2.5 animate-fade-in">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-rose-700 leading-normal">{error}</p>
              </div>
            )}

            {/* Dynamic form rendering */}
            {!isRegister ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome Utente</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Inserisci il tuo nome utente"
                      className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs rounded-xl pl-10 pr-4 py-3.5 border-none outline-none focus:ring-2 focus:ring-blue-100 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Inserisci la tua password"
                      className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs rounded-xl pl-10 pr-11 py-3.5 border-none outline-none focus:ring-2 focus:ring-blue-100 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition focus:outline-none cursor-pointer"
                      title={showLoginPassword ? "Nascondi password" : "Mostra password"}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full mt-6 bg-gradient-to-tr from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white font-semibold text-xs py-3.5 rounded-xl shadow-md transition hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isAuthLoading ? "Accesso in corso..." : "Accedi al Diario"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Registration Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scegli Nome Utente</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="es. Bruna"
                      className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs rounded-xl pl-10 pr-4 py-3.5 border-none outline-none focus:ring-2 focus:ring-blue-100 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scegli una password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimo 6 caratteri"
                      className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs rounded-xl pl-10 pr-11 py-3.5 border-none outline-none focus:ring-2 focus:ring-blue-100 transition"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition focus:outline-none cursor-pointer"
                      title={showRegPassword ? "Nascondi password" : "Mostra password"}
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full mt-6 bg-gradient-to-tr from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white font-semibold text-xs py-3.5 rounded-xl shadow-md transition hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isAuthLoading ? "Registrazione..." : "Invia richiesta di registrazione"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <div className="mt-8 text-center text-[11px] text-slate-400 leading-normal">
        <p>I dati rimarranno sincronizzati sul tuo database cloud privato.</p>
        <p className="mt-1">Puoi registrare più account separati per amici e familiari!</p>
      </div>

    </div>
  );
}
