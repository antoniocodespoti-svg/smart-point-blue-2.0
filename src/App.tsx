import React, { useState, useEffect } from "react";
import { MenuPlanner } from "./components/MenuPlanner";
import { updateLocalUser, deleteLocalUser, initFirestoreSync } from "./lib/userDb";
import { DailyTracker } from "./components/DailyTracker";
import { ZeroPointList } from "./components/ZeroPointList";
import { BudgetCalculator } from "./components/BudgetCalculator";
import { AuthScreen } from "./components/AuthScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { FoodTrackItem, UserProfile } from "./types";
import { Sparkles, CalendarDays, Apple, BookOpen, Calculator, Salad, RefreshCw, Heart, Info, HelpCircle, LogOut, User, Share2, QrCode, ShieldAlert, Sliders, Check } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"planner" | "tracker" | "zeropoints" | "calculator" | "admin">("planner");
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showScaleModal, setShowScaleModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem("ww_ui_zoom");
    return saved ? parseInt(saved) : 100;
  });
  const [autoTabletScale, setAutoTabletScale] = useState<boolean>(() => {
    const saved = localStorage.getItem("ww_auto_tablet");
    return saved ? saved === "true" : true;
  });
  const [currentScale, setCurrentScale] = useState<number>(100);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("ww_current_user");
    if (saved) {
      const parsed: UserProfile = JSON.parse(saved);
      if (parsed.aiCredits === undefined) parsed.aiCredits = 5;
      if (parsed.totalTokensUsed === undefined) parsed.totalTokensUsed = 0;
      if (parsed.totalCostEur === undefined) parsed.totalCostEur = 0;
      return parsed;
    }
    return null;
  });

  const isUserAdmin = currentUser?.email === "bruna65b@gmail.com" || 
    currentUser?.name?.toLowerCase() === "bruna" || 
    currentUser?.name?.toLowerCase() === "bruna65b" || 
    currentUser?.name?.toLowerCase() === "admin";

  const [budget, setBudget] = useState<number>(() => {
    const savedUser = localStorage.getItem("ww_current_user");
    if (savedUser) {
      const user: UserProfile = JSON.parse(savedUser);
      const savedBudget = localStorage.getItem(`ww_blue_budget_${user.id}`);
      return savedBudget ? parseInt(savedBudget) : user.budgetPoints || 23;
    }
    return 23;
  });
  const [trackedFoods, setTrackedFoods] = useState<FoodTrackItem[]>([]);

  // Keep track of the active user ID whose budget has been initialized/loaded in state
  const lastLoadedUserIdRef = React.useRef<string | null>(currentUser?.id || null);

  // Synchronize state and initial records whenever the active user changes
  useEffect(() => {
    if (currentUser) {
      const savedBudget = localStorage.getItem(`ww_blue_budget_${currentUser.id}`);
      const bgToSet = savedBudget ? parseInt(savedBudget) : currentUser.budgetPoints || 23;
      setBudget(prev => prev !== bgToSet ? bgToSet : prev);
      lastLoadedUserIdRef.current = currentUser.id;

      const cloudTracked = currentUser.trackedFoods;
      if (cloudTracked) {
        if (JSON.stringify(trackedFoods) !== JSON.stringify(cloudTracked)) {
          setTrackedFoods(cloudTracked);
        }
      } else {
        const savedTracker = localStorage.getItem(`ww_blue_tracked_${currentUser.id}`);
        const localTracked = savedTracker ? JSON.parse(savedTracker) : [];
        if (JSON.stringify(trackedFoods) !== JSON.stringify(localTracked)) {
          setTrackedFoods(localTracked);
        }
      }
    } else {
      lastLoadedUserIdRef.current = null;
    }
  }, [currentUser?.id]);

  // Persist budget
  useEffect(() => {
    if (currentUser) {
      if (lastLoadedUserIdRef.current !== currentUser.id) {
        return;
      }

      localStorage.setItem(`ww_blue_budget_${currentUser.id}`, budget.toString());
      
      const savedCurUserRaw = localStorage.getItem("ww_current_user");
      if (savedCurUserRaw) {
        const curUser: UserProfile = JSON.parse(savedCurUserRaw);
        if (curUser.id === currentUser.id && curUser.budgetPoints !== budget) {
          curUser.budgetPoints = budget;
          localStorage.setItem("ww_current_user", JSON.stringify(curUser));
          updateLocalUser(currentUser.id, { budgetPoints: budget });
        }
      }
    }
  }, [budget, currentUser]);

  // Persist tracked foods in local storage only (cache)
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`ww_blue_tracked_${currentUser.id}`, JSON.stringify(trackedFoods));
    }
  }, [trackedFoods, currentUser]);

  // Persistent scaling options
  useEffect(() => {
    localStorage.setItem("ww_ui_zoom", zoomLevel.toString());
  }, [zoomLevel]);

  useEffect(() => {
    localStorage.setItem("ww_auto_tablet", autoTabletScale.toString());
  }, [autoTabletScale]);

  // Start real-time Firestore synchronization on mount
  useEffect(() => {
    const unsubscribe = initFirestoreSync(
      (updatedUser) => {
        setCurrentUser((prevUser) => {
          if (!prevUser || prevUser.id !== updatedUser.id) {
            return updatedUser;
          }
          const hasChanged = 
            prevUser.budgetPoints !== updatedUser.budgetPoints ||
            prevUser.aiCredits !== updatedUser.aiCredits ||
            prevUser.approved !== updatedUser.approved ||
            prevUser.gender !== updatedUser.gender ||
            prevUser.age !== updatedUser.age ||
            prevUser.weight !== updatedUser.weight ||
            prevUser.height !== updatedUser.height ||
            prevUser.activityLevel !== updatedUser.activityLevel ||
            prevUser.weightGoal !== updatedUser.weightGoal ||
            JSON.stringify(prevUser.trackedFoods || []) !== JSON.stringify(updatedUser.trackedFoods || []) ||
            JSON.stringify(prevUser.pointsHistory || []) !== JSON.stringify(updatedUser.pointsHistory || []);
          return hasChanged ? updatedUser : prevUser;
        });

        if (updatedUser.budgetPoints !== undefined) {
          setBudget((prevBudget) => prevBudget !== updatedUser.budgetPoints ? updatedUser.budgetPoints : prevBudget);
        }
        if (updatedUser.trackedFoods) {
          setTrackedFoods((prevTracker) => {
            const isDiff = JSON.stringify(prevTracker) !== JSON.stringify(updatedUser.trackedFoods);
            return isDiff ? updatedUser.trackedFoods : prevTracker;
          });
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle auto scaling based on screen size if active
  useEffect(() => {
    const handleResize = () => {
      if (autoTabletScale) {
        const width = window.innerWidth;
        // On tablet width profiles (generally 600px to 1024px)
        if (width >= 600 && width <= 1024) {
          // Proportionally scale down from 100% (at 1024px) to 85% (at 600px)
          const calculated = Math.max(85, Math.min(100, 85 + ((width - 600) / 424) * 15));
          setCurrentScale(Math.round(calculated));
        } else {
          setCurrentScale(zoomLevel);
        }
      } else {
        setCurrentScale(zoomLevel);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [autoTabletScale, zoomLevel]);

  // Apply scaling dynamically directly to the root element for flawless uniform responsiveness
  useEffect(() => {
    document.documentElement.style.fontSize = `${currentScale}%`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [currentScale]);

  const handleLoginSuccess = (user: UserProfile) => {
    const safeUser = { ...user };
    if (safeUser.aiCredits === undefined) safeUser.aiCredits = 5;
    if (safeUser.totalTokensUsed === undefined) safeUser.totalTokensUsed = 0;
    if (safeUser.totalCostEur === undefined) safeUser.totalCostEur = 0;

    localStorage.setItem("ww_current_user", JSON.stringify(safeUser));
    setCurrentUser(safeUser);
    // Sync budget state immediately to prevent race conditions during transitions
    const savedBudget = localStorage.getItem(`ww_blue_budget_${safeUser.id}`);
    const bgToSet = savedBudget ? parseInt(savedBudget) : safeUser.budgetPoints || 23;
    setBudget(bgToSet);
    lastLoadedUserIdRef.current = safeUser.id;
  };

   const handleUpdateAiUsage = async (tokens: number, cost: number) => {
    if (!currentUser) return;
    const newTokens = (currentUser.totalTokensUsed ?? 0) + tokens;
    // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
    const newCost = parseFloat(((newTokens / 5000) * 2).toFixed(6));
    const updated: UserProfile = {
      ...currentUser,
      aiCredits: Math.max(0, (currentUser.aiCredits ?? 5) - 1),
      totalTokensUsed: newTokens,
      totalCostEur: newCost
    };
    
    setCurrentUser(updated);
    localStorage.setItem("ww_current_user", JSON.stringify(updated));
    updateLocalUser(currentUser.id, updated);
  };

  const handleRechargeCredits = async () => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      aiCredits: 5
    };
    
    setCurrentUser(updated);
    localStorage.setItem("ww_current_user", JSON.stringify(updated));
    updateLocalUser(currentUser.id, updated);
  };

  const handleLogout = () => {
    localStorage.removeItem("ww_current_user");
    setCurrentUser(null);
    setBudget(23);
    lastLoadedUserIdRef.current = null;
  };

  const handleAddFood = (food: FoodTrackItem) => {
    setTrackedFoods((prev) => {
      const updated = [food, ...prev];
      if (currentUser) {
        updateLocalUser(currentUser.id, { trackedFoods: updated });
      }
      return updated;
    });
  };

  const handleAddFoodWithoutId = (food: Omit<FoodTrackItem, "id">) => {
    const withId: FoodTrackItem = {
      ...food,
      id: "ai-" + Date.now() + "-" + Math.random()
    };
    setTrackedFoods((prev) => {
      const updated = [withId, ...prev];
      if (currentUser) {
        updateLocalUser(currentUser.id, { trackedFoods: updated });
      }
      return updated;
    });
  };

  const handleRemoveFood = (id: string) => {
    setTrackedFoods((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (currentUser) {
        updateLocalUser(currentUser.id, { trackedFoods: updated });
      }
      return updated;
    });
  };

  const handleClearAll = () => {
    setTrackedFoods([]);
    if (currentUser) {
      updateLocalUser(currentUser.id, { trackedFoods: [] });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // If there is no active logged-in user, render the authenticated login screen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased font-sans flex flex-col justify-between">
      
      {/* Upper Navigation Header Bar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 print:hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-4">
          
          {/* Logo Brand / Icon */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-blue-600 to-indigo-650 text-white rounded-2xl shadow-md shadow-indigo-150">
              <Salad className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-black text-slate-900 tracking-tight text-sm sm:text-base">Dieta Blu</span>
                <span className="bg-blue-100 text-blue-800 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  SmartPoints
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Pianificazione e calcolo dietetico intelligente</p>
            </div>
          </div>

          {/* Tab Selection Navigation - HIDDEN on mobile, visible on desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab("planner")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                activeTab === "planner"
                  ? "bg-white text-indigo-650 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Pianificatore
            </button>
            <button
              onClick={() => setActiveTab("tracker")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                activeTab === "tracker"
                  ? "bg-white text-indigo-650 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Diario Punti
            </button>
            <button
              onClick={() => setActiveTab("zeropoints")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                activeTab === "zeropoints"
                  ? "bg-white text-indigo-650 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Apple className="w-4 h-4" />
              Cibi a Zero Punti
            </button>
            <button
              onClick={() => setActiveTab("calculator")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                activeTab === "calculator"
                  ? "bg-white text-indigo-650 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              Il mio Profilo
            </button>
            {isUserAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  activeTab === "admin"
                    ? "bg-white text-indigo-650 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-indigo-600 animate-pulse" />
                Amministrazione
              </button>
            )}
          </nav>

          {/* User profile dropdown/button */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex flex-col text-right leading-tight select-none">
              <p className="text-xs font-extrabold text-slate-800 hidden sm:block">Ciao, {currentUser.name}!</p>
              <p className="text-[10px] sm:text-[9.5px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 tracking-wider whitespace-nowrap">
                <span className="sm:hidden">SP: </span><span className="hidden sm:inline">Budget: </span>{budget}
              </p>
            </div>

            {/* Quota Widget in upper bar */}
            <div className="hidden sm:flex items-center gap-2 bg-indigo-500/10 border border-indigo-600/10 px-2.5 py-1.5 rounded-2xl select-none">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: "12s" }} />
              <div className="text-left leading-none">
                <span className="text-[9.5px] font-black text-slate-800 block">
                  Crediti: <span className={currentUser.aiCredits === 0 ? "text-red-600 font-black animate-pulse" : "text-indigo-600 font-black"}>{currentUser.aiCredits ?? 5}</span>
                </span>
                {currentUser.totalCostEur !== undefined && currentUser.totalCostEur > 0 ? (
                  <span className="text-[8px] text-slate-500 font-bold block mt-0.5 whitespace-nowrap">
                    Spesi: €{currentUser.totalCostEur.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-[8px] text-slate-400 font-medium block mt-0.5 whitespace-nowrap">
                    Spesa: €0.00
                  </span>
                )}
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/40">
              <span className="p-1 sm:p-1.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
              <div className="text-left leading-tight max-w-[80px] xs:max-w-[110px] sm:max-w-[140px] block">
                <p className="text-[10px] sm:text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={() => setShowScaleModal(true)}
              className="p-1.5 sm:p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer border border-blue-100/60 flex items-center justify-center gap-1.5 shrink-0"
              title="Adattatore di Schermo Automatico / Tablet"
            >
              <Sliders className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="text-xs font-bold hidden md:inline">Schermo</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-1.5 sm:p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-xl transition cursor-pointer border border-indigo-100 flex items-center justify-center gap-1.5 shrink-0"
              title="Condividi tramite QR Code"
            >
              <QrCode className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="text-xs font-bold hidden md:inline">Condividi</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border border-rose-100/60 flex items-center justify-center shrink-0 shadow-xs hover:scale-105"
              title="Disconnetti"
            >
              <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Layout Container */}
      <main className="max-w-6xl w-full mx-auto px-4 pt-4 pb-24 md:py-8 flex-grow">
        
        {/* Dynamic component viewport switcher */}
        <div className="space-y-8">
          {activeTab === "planner" && (
            <div className="space-y-8 animate-fade-in">
              {/* Credit status panel with filling bar - aligned strictly to the left, showing credits as simple integer */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs w-full max-w-sm text-left space-y-2.5 shrink-0">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    Crediti disponibili
                  </span>
                  <span className="font-mono text-indigo-700 font-extrabold text-sm">{currentUser?.aiCredits ?? 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-350"
                    style={{ width: `${Math.min(100, ((currentUser?.aiCredits ?? 0) / 5) * 100)}%` }}
                  />
                </div>
                <div className="text-[10.5px] pt-1.5 border-t border-slate-50 text-slate-400">
                  Genera ricette o compila menu
                </div>
              </div>

              <div className="space-y-1 text-left">
                <h2 className="text-xl font-bold font-sans text-slate-800">Crea il tuo piano alimentare settimanale</h2>
                <p className="text-xs text-slate-500">L'app compilerà piatti sani, facili e allineati al budget del piano Blu.</p>
              </div>
              <MenuPlanner
                defaultBudget={budget}
                onApplyBudget={(bg) => setBudget(bg)}
                currentUser={currentUser}
                onUpdateAiUsage={handleUpdateAiUsage}
                onRechargeCredits={handleRechargeCredits}
              />
            </div>
          )}

          {activeTab === "tracker" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-bold font-sans text-slate-800">Il tuo Diario di Oggi</h2>
                <p className="text-xs text-slate-500">Filtra, calcola o registra manualmente la tua alimentazione quotidiana tenendo d'occhio il budget.</p>
              </div>
              <DailyTracker
                budget={budget}
                onBudgetChange={(bg) => setBudget(bg)}
                trackedFoods={trackedFoods}
                onAddCustomFood={handleAddFood}
                onRemoveFood={handleRemoveFood}
                onClearAll={handleClearAll}
                currentUser={currentUser}
                onUpdateAiUsage={handleUpdateAiUsage}
                onRechargeCredits={handleRechargeCredits}
              />
            </div>
          )}

          {activeTab === "zeropoints" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-1 justify-between flex flex-wrap gap-4 items-start">
                <div>
                  <h2 className="text-xl font-bold font-sans text-slate-800">Catalogo Cibi a Zero Punti</h2>
                  <p className="text-xs text-slate-500 font-medium">Sfogliando e cercando le prelibatezze approvate a zero punti nel tuo piano.</p>
                </div>
              </div>
              <ZeroPointList />
            </div>
          )}

          {activeTab === "calculator" && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-bold font-sans text-slate-800">Profilo Personale & Budget SP</h2>
                <p className="text-xs text-slate-500 font-medium">I tuoi dati biometrici configurati all'iscrizione e il riepilogo SmartPoints.</p>
              </div>
              <BudgetCalculator
                currentBudget={budget}
                currentUser={currentUser}
                onLogout={handleLogout}
                onUpdateProfile={async (updatedData) => {
                  if (currentUser) {
                    const newProfile = { ...currentUser, ...updatedData };
                    setCurrentUser(newProfile);
                    localStorage.setItem("ww_current_user", JSON.stringify(newProfile));
                    
                    if (updatedData.budgetPoints !== undefined) {
                      setBudget(updatedData.budgetPoints);
                    }
                    
                    updateLocalUser(currentUser.id, newProfile);
                  }
                }}
                onBudgetSelect={(bg) => {
                  setBudget(bg);
                  setActiveTab("tracker"); // redirect to tracker tab
                }}
                onDeleteAccount={async () => {
                  if (currentUser) {
                    try {
                      const currentId = currentUser.id;
                      const currentEmail = currentUser.email;
                      
                      // Clean up individual user keys
                      localStorage.removeItem(`ww_blue_budget_${currentId}`);
                      localStorage.removeItem(`ww_blue_tracked_${currentId}`);
                      if (currentEmail) {
                        localStorage.removeItem(`ww_blue_budget_${currentEmail}`);
                        localStorage.removeItem(`ww_blue_tracked_${currentEmail}`);
                      }
                      
                      deleteLocalUser(currentId);
                    } catch (err) {
                      console.error("Error cleaning up registered user:", err);
                    } finally {
                      // Always clear state and de-authenticate the active session
                      localStorage.removeItem("ww_current_user");
                      setCurrentUser(null);
                    }
                  }
                }}
              />
            </div>
          )}

          {activeTab === "admin" && isUserAdmin && (
            <div className="space-y-8 animate-fade-in">
              <AdminDashboard 
                currentUser={currentUser}
                onRefreshCurrentUser={() => {
                  const saved = localStorage.getItem("ww_current_user");
                  if (saved) {
                    setCurrentUser(JSON.parse(saved));
                  }
                }}
              />
            </div>
          )}
        </div>

      </main>

      {/* Beautiful humble Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-[11px] text-slate-500">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
             <span>Pianificatore Menu SmartPoints Blu</span>
          </div>
          <div className="text-[10px] text-slate-400">
            © {new Date().getFullYear()} Blu Menu Planner • Basato su cibi sani & calcolo bilanciato
          </div>
        </div>
      </footer>

      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="share-modal-overlay" onClick={(e) => {
          if ((e.target as HTMLElement).id === 'share-modal-overlay') {
            setShowShareModal(false);
          }
        }}>
          <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative text-center">
            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200/60 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer font-sans"
            >
              ✕
            </button>

            {/* Header Icon */}
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl border border-indigo-100">
                <QrCode className="w-6 h-6" />
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-850 mb-1">Crea QR Code per Condividere</h3>
            <p className="text-[11px] text-slate-400 mb-5 leading-normal">
              Mostra questo codice con i tuoi cari per farli registrare o accedere a **SmartPoints Blu**.
            </p>

            {/* QR Code Frame with Beautiful Gradient Border */}
            <div className="bg-gradient-to-tr from-blue-100 via-indigo-50 to-slate-100 p-3.5 rounded-2xl inline-block shadow-inner mb-5">
              <div className="bg-white p-2 rounded-xl border border-slate-100/80 shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=1e3a8a&data=${encodeURIComponent(window.location.href)}`}
                  alt="SmartPoints Blu QR Code"
                  referrerPolicy="no-referrer"
                  className="w-48 h-48 block rounded-lg"
                  onError={(e) => {
                    // Fail-safe default QR code
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://ai.studio/build`;
                  }}
                />
              </div>
            </div>

            {/* Interactive Link Copier */}
            <div className="space-y-3.5">
              <div className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-[11px] text-slate-650 font-mono text-left break-all select-all flex items-center justify-between gap-2">
                <span className="truncate max-w-[220px]">{window.location.href}</span>
                <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase select-none shrink-0 font-sans">URL</span>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2.5 rounded-xl shadow-xs transition hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedLink ? "Link Copiato!" : "Copia Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="mt-4 text-[10px] text-slate-500 leading-normal bg-indigo-50/45 rounded-xl p-2.5 border border-indigo-100/50 flex items-start gap-1.5 text-left">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-550 shrink-0 mt-1" />
              <span>
                Puoi aprire questo link su qualsiasi dispositivo cellulare, tablet o PC. L'applicazione si adatterà automaticamente allo schermo.
              </span>
            </div>
          </div>
        </div>
      )}

      {showScaleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="scale-modal-overlay" onClick={(e) => {
          if ((e.target as HTMLElement).id === 'scale-modal-overlay') {
            setShowScaleModal(false);
          }
        }}>
          <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowScaleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200/60 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer font-sans"
            >
              ✕
            </button>

            {/* Header Icon */}
            <div className="flex justify-center mb-4 text-center">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                <Sliders className="w-6 h-6" />
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-850 mb-1 text-center">Adattatore e Zoom di Schermo</h3>
            <p className="text-[11px] text-slate-400 mb-5 leading-normal text-center">
              Ottimizza la visualizzazione dell'applicazione per tablet, desktop o preferenze di lettura personali.
            </p>

            {/* Main Toggle Box */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-150/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-800 block">Adattamento Automatico</label>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Consigliato per Tablet o iPad</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoTabletScale(!autoTabletScale)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoTabletScale ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        autoTabletScale ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {autoTabletScale && (
                  <div className="mt-3 bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100/50 flex items-start gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 mt-1 shrink-0 animate-pulse" />
                    <p className="text-[10.5px] text-indigo-800 font-semibold leading-normal">
                      Attivo: Rilevando le dimensioni dello schermo... Dimensione attuale impostata a <span className="font-extrabold">{currentScale}%</span> per far entrare tutto perfettamente.
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Sizing */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 block">Scala di visualizzazione manuale</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: 85, lbl: "85%", desc: "Compatto" },
                    { val: 90, lbl: "90%", desc: "Tablet" },
                    { val: 100, lbl: "100%", desc: "Normale" },
                    { val: 110, lbl: "110%", desc: "Grande" }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      disabled={autoTabletScale}
                      onClick={() => {
                        setZoomLevel(opt.val);
                        setCurrentScale(opt.val);
                      }}
                      className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center cursor-pointer ${
                        autoTabletScale
                          ? "bg-slate-50 border-slate-100 text-slate-350/50 opacity-60 cursor-not-allowed"
                          : currentScale === opt.val
                          ? "bg-indigo-550 bg-indigo-600 text-white border-indigo-600 font-black shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-350 text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      <span className="text-[11px] block font-extrabold">{opt.lbl}</span>
                      <span className="text-[7.5px] font-bold uppercase tracking-wider block opacity-75 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                {autoTabletScale && (
                  <span className="text-[9.5px] text-slate-400 font-semibold block text-center mt-1">
                    Disattiva l'adattamento automatico sopra per impostare la scala manuale.
                  </span>
                )}
              </div>

              {/* Close Action block */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowScaleModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition duration-200 shadow-sm cursor-pointer"
                >
                  Applica e Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/60 p-2 pb-safe shadow-lg flex justify-around items-center">
        <button
          onClick={() => setActiveTab("planner")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "planner" ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px]">Pianificatore</span>
        </button>
        <button
          onClick={() => setActiveTab("tracker")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "tracker" ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[9px]">Diario</span>
        </button>
        <button
          onClick={() => setActiveTab("zeropoints")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "zeropoints" ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
          }`}
        >
          <Apple className="w-5 h-5" />
          <span className="text-[9px]">Zero Punti</span>
        </button>
        <button
          onClick={() => setActiveTab("calculator")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors cursor-pointer ${
            activeTab === "calculator" ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px]">Profilo</span>
        </button>
        {isUserAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors cursor-pointer ${
              activeTab === "admin" ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[9px]">Admin</span>
          </button>
        )}
      </div>

    </div>
  );
}
