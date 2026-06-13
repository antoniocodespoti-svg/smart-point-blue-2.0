import React, { useState } from "react";
import { ZERO_POINT_FOODS_DATA } from "../data";
import { Search, Apple, Leaf, Egg, Fish, Beef, GlassWater, Lightbulb, ChefHat, Milk } from "lucide-react";

export function ZeroPointList() {
  const [searchTerm, setSearchTerm] = useState("");

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Apple": return <Apple className="w-5 h-5 text-rose-500" />;
      case "Leaf": return <Leaf className="w-5 h-5 text-emerald-500" />;
      case "Egg": return <Egg className="w-5 h-5 text-amber-500" />;
      case "Fish": return <Fish className="w-5 h-5 text-cyan-500" />;
      case "Beef": return <Beef className="w-5 h-5 text-orange-500" />;
      case "Milk": return <Milk className="w-5 h-5 text-indigo-500" />;
      default: return <GlassWater className="w-5 h-5 text-blue-500" />;
    }
  };

  // Filter items based on searches
  const filteredGroups = ZERO_POINT_FOODS_DATA.map(group => {
    const matchedCibi = group.cibi.filter(cibo => 
      cibo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      ...group,
      matchedCibi,
      hasMatch: matchedCibi.length > 0
    };
  }).filter(group => group.hasMatch);

  return (
    <div id="zeropoint-portal" className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-3xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-y-2 translate-x-4">
          <ChefHat className="w-64 h-64" />
        </div>
        <div className="max-w-2xl relative z-10">
          <span className="bg-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            SmartPoints Blu Plan
          </span>
          <h2 className="text-2xl font-bold font-sans mt-3">Cibi a Zero Punti del Programma Blu</h2>
          <p className="text-slate-105 text-sm mt-1 mb-4 leading-relaxed">
            Nel piano Blu, hai oltre 200 cibi sani e nutrienti che costano esordientemente 0 SmartPoints. Puoi cucinarli e gustarli senza pesarli né inserirli ossessivamente nel budget giornaliero!
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-sm">
              🐓 Petto di Pollo & Tacchino
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-sm">
              🥚 Uova intere
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-sm">
              🐟 Pesce & Crostacei
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-sm">
              🫘 Legumi & Yogurt Greco 0%
            </span>
          </div>
        </div>
      </div>

      {/* Info card guidelines */}
      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs">
        <div className="p-1 rounded-lg bg-amber-100 text-amber-700 h-fit">
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">Come funziona la regola dello Zero?</p>
          <p className="text-amber-800 leading-relaxed">
            I cibi sono considerati a Zero Punti solo se cucinati <strong>senza aggiunta di grassi</strong> (niente burro, olio o maionese, che manterranno invece i propri punti nutrizionali). La frutta fresca è a zero punti a morsi, ma se frullata, centrifugata o disidratata guadagna punti a causa del minore potere saziante!
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Cerca un cibo a zero punti (es: Uova, Salmone, Ceci...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 text-xs rounded-2xl pl-10 pr-4 py-3.5 border border-slate-100 shadow-sm outline-none transition focus:border-blue-300 focus:bg-white"
        />
      </div>

      {/* Directory Grid */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
          <p className="text-slate-400 text-xs">Nessun cibo a Zero Punti trovato per "{searchTerm}".</p>
          <p className="text-slate-400 text-[10px] mt-1">Ricorda che pane, pasta, oli, riso e dolci non sono a zero punti.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-100 hover:border-slate-200/80 rounded-3xl p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-50">
                    {getIcon(group.icon)}
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{group.categoria}</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed min-h-[34px]">
                  {group.descrizione}
                </p>
                <div className="pt-2 border-t border-slate-50 flex flex-wrap gap-1.5">
                  {group.matchedCibi.map((cibo, cIdx) => (
                    <span
                      key={cIdx}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] px-2 py-1 rounded-lg transition"
                    >
                      {cibo}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 text-center mt-4">
                <span className="text-[9px] font-bold tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase">
                  0 SmartPoints
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
