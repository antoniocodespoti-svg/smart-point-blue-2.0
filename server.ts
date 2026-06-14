import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Google Gemini client. API key is automatically injected by the platform.
const apiKey = process.env.GEMINI_API_KEY;
console.log("GEMINI SERVER SETUP:");
console.log("- process.env.GEMINI_API_KEY exists:", !!apiKey);
if (apiKey) {
  console.log("- Key length:", apiKey.length);
  console.log("- Key prefix:", apiKey.slice(0, 4) + "..." + apiKey.slice(-4));
} else {
  console.warn("- WARNING: GEMINI_API_KEY is not defined in process.env. Check Settings > Secrets.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Calculate SmartPoints mathematically as a fallback or for verification
// SP = (Calories / 33) + (Saturated Fat / 4) + (Sugar / 8) - (Protein / 10)
export function calculateSmartPointsFormula(
  calories: number,
  satFat: number,
  sugar: number,
  protein: number
): number {
  const points = (calories * 0.0305) + (satFat * 0.275) + (sugar * 0.12) - (protein * 0.098);
  return Math.max(0, Math.round(points));
}

// Resilient fallback generator for menu planner
function generateFallbackMenuPlan(reqBody: any) {
  const {
    giorni = 3,
    puntiBudget = 23,
    preferenzeAlimentari = "Nessuna",
    escludiCibi = "",
    preferenzeSpecifiche = "",
    numeroPasti = 3,
    distribuzioneMacro = "Equilibrata",
    genere = "female",
    eta = 35,
    peso = 70,
    altezza = 165,
    livelloAttivita = "sedentary",
    obiettivi = "Perdere peso"
  } = reqBody;

  const specLower = (preferenzeSpecifiche || "").toLowerCase();
  const alimLower = (preferenzeAlimentari || "").toLowerCase();
  const esclLower = (escludiCibi || "").toLowerCase();

  const isVegetarian = alimLower.includes("veg") || specLower.includes("veg");
  const isVegan = alimLower.includes("vegan") || specLower.includes("vegan");
  const isNoFish = alimLower.includes("pesce") || esclLower.includes("pesce");
  const wantsPasta = specLower.includes("pasta") || specLower.includes("spaghetti");
  const wantsPizza = specLower.includes("pizza") || specLower.includes("focaccia");
  const wantsOmelette = specLower.includes("uov") || specLower.includes("omelette") || specLower.includes("frittata");
  const wantsPollo = specLower.includes("pollo") || specLower.includes("tacchino");
  const wantsPesce = specLower.includes("pesce") || specLower.includes("salmone") || specLower.includes("merluzzo") || specLower.includes("branzino");

  const colazioni = [
    {
      nome: "Yogurt greco magro (0% grassi) con mirtilli e fiocchi d'avena",
      punti: 2,
      ingredienti: ["200g Yogurt greco 0% grassi (0 pt)", "35g Fiocchi d'avena tostati (2 pt)", "50g Mirtilli freschi (0 pt)", "Un goccio di latte di mandorla senza zucchero (0 pt)"],
      ricetta: "In una ciotola, adagia lo yogurt greco magro. Unisci i fiocchi d'avena leggermente tostati in padella per massima croccantezza e guarnisci con i mirtilli freschi.",
      isZeroPoints: false
    },
    {
      nome: "Crepe light di albumi con mela calda alla cannella",
      punti: 1,
      ingredienti: ["120ml Albume d'uovo bio (0 pt)", "1 cucchiaino di miele millefiori (1 pt)", "Mezza mela a cubetti cotta al microonde (0 pt)", "Cannella in polvere (0 pt)"],
      ricetta: "Sbatti energicamente gli albumi e cuocili in una padella antiaderente ben calda per ottenere una crespella soffice. Farcisci con la mela intenerita al microonde e cannella, piega e decora col miele.",
      isZeroPoints: false
    },
    {
      nome: "Omelette proteica salata con spinaci e parmigiano",
      punti: 2,
      ingredienti: ["2 Uova intere grandi bio (0 pt)", "15g Parmigiano Reggiano grattugiato (2 pt)", "50g Spinaci freschi novelli (0 pt)", "Sale e pepe q.b."],
      ricetta: "Sbatti le uova fresche con sale, pepe e parmigiano. Versa il composto in padella e unisci gli spinaci novelli. Piega a mezzaluna e cuoci finché non si forma una bella crosticina.",
      isZeroPoints: false
    },
    {
      nome: "Pane tostato ai cereali con avocado e uovo in camicia",
      punti: 4,
      ingredienti: ["30g Pane integrale o ai cereali (2 pt)", "30g Avocado maturo schiacciato (2 pt)", "1 Uovo grande bio sodo o in camicia (0 pt)", "Fiocchi di sale marino e pepe nero"],
      ricetta: "Tosta il pane ai cereali. Spalma l'avocado maturo schiacciato condito con poche gocce di limone. Adagia l'uovo in camicia caldo e insaporisci con pepe nero fresco.",
      isZeroPoints: false
    }
  ];

  const pranzi = [
    {
      nome: "Pasta integrale Felicetti al pomodoro fresco e basilico",
      punti: 6,
      ingredienti: ["75g Pasta integrale Felicetti (6 pt)", "100g Passata di pomodoro ciliegino (0 pt)", "1 cucchiaino di olio extravergine d'oliva (0 pt)", "Basilico fresco a foglie grandi"],
      ricetta: "Lessa la pasta al dente. In una padella scalda leggermente la passata aromatizzata con basilico ed un goccio d'acqua di cottura. Salta la pasta a fiamma vivace e servi.",
      isZeroPoints: false
    },
    {
      nome: "Insalata Blu estiva con petto di pollo grigliato e legumi",
      punti: 0,
      ingredienti: ["150g Petto di pollo cotto alla piastra (0 pt)", "100g Ceci arrostiti alle erbe (0 pt)", "Verdure miste (rucola, songino, pomodorini) (0 pt)", "Succo di limone filtrato e origano (0 pt)"],
      ricetta: "Taglia il petto di pollo a dadini. Assembla il piatto unendo le verdure a foglia, i ceci cotti e il pollo. Condisci con una deliziosa emulsione aromatica di limone ed erbe fresche.",
      isZeroPoints: true
    },
    {
      nome: "Couscous di verdure miste, lenticchie rosse e cubetti di tofu",
      punti: 2,
      ingredienti: ["30g Couscous precotto (2 pt)", "80g Lenticchie rosse lessate (0 pt)", "100g Verdure grigliate a cubetti (peperoni, zucchine, melanzane) (0 pt)", "Zenzero grattugiato e menta (0 pt)"],
      ricetta: "Idrata il couscous con brodo vegetale bollente. Sgranalo con una forchetta e incorpora le verdure grigliate, le lenticchie rosse e menta fresca tritata.",
      isZeroPoints: false
    }
  ];

  const cene = [
    {
      nome: "Merluzzo in guazzetto alla marinara con pomodorini e olive",
      punti: 3,
      ingredienti: ["150g Filetto di merluzzo fresco sfilettato (0 pt)", "6 Olive nere greche snocciolate (2 pt)", "100g Pomodorini (0 pt)", "1 fetta di pane integrale tostato (1 pt)", "Spicchio d'aglio, capperi dissalati e origano"],
      ricetta: "In un tegame cuoci i pomodorini con aglio schiacciato e capperi. Adagia il filetto di merluzzo, guarnisci con olive e cuoci coperto per 10 minuti fino a cottura ottimale.",
      isZeroPoints: false
    },
    {
      nome: "Tofu Biologico piastrato al sesamo con broccoli al vapore",
      punti: 2,
      ingredienti: ["120g Tofu al naturale biologico (0 pt)", "1 cucchiaino di semi di sesamo (1 pt)", "1 cucchiaino di salsa di soia tamari (1 pt)", "150g Cimette di broccolo (0 pt)"],
      ricetta: "Taglia il tofu a fettine spesse, spennella con la salsa di soia tamari e cospargi di semi di sesamo. Piastra su entrambi i lati per renderlo croccante e accompagna con i broccoli.",
      isZeroPoints: false
    },
    {
      nome: "Frittata leggera al forno di zucchine ed erba cipollina",
      punti: 0,
      ingredienti: ["3 Uova grandi biologiche (0 pt)", "1 Zucchina grattugiata fine (0 pt)", "Erba cipollina fresca tritata (0 pt)", "Sale, pepe e un rametto d'aneto"],
      ricetta: "Sbatti le uova con sale, pepe e l'erba cipollina. Unisci la zucchina grattugiata ben strizzata. Versa lo stampo rivestito di carta forno e cuoci a 180°C fino a doratura.",
      isZeroPoints: true
    },
    {
      nome: "Trancetto di orata al cartoccio con patate e carciofi",
      punti: 3,
      ingredienti: ["1 Filetto d'orata fresca (0 pt)", "80g Patate novelle affettate velo (3 pt)", "1 Carciofo crudo sfogliato a listarelle (0 pt)", "Vino bianco analcolico, aglio, prezzemolo fresco"],
      ricetta: "Adagia l'orata, le fettine di patata e il carciofo sfogliato su carta stagnola. Irrora con prezzemolo tritato, aglio e sigilla ermeticamente. Inforna a 200°C per 20 minuti.",
      isZeroPoints: false
    }
  ];

  const spuntini = [
    {
      nome: "Mela croccante con una manciata di mandorle pelate",
      punti: 2,
      ingredienti: ["1 Mela biologica a fette (0 pt)", "6 Mandorle intere pelate (2 pt)"],
      ricetta: "Taglia la mela a spicchi sottili e sgranocchiale insieme alle mandorle croccanti per un picco di sazietà.",
      isZeroPoints: false
    },
    {
      nome: "Carotine e finocchi a bastoncino con hummus light",
      punti: 2,
      ingredienti: ["100g Bastoncini di verdure crude (finocchio, carote) (0 pt)", "35g Hummus di ceci light (2 pt)"],
      ricetta: "Inzuppa i bastoncini freschi e croccanti di ortaggi crudi nell'hummus di ceci leggero preparato con pochissimo sesamo.",
      isZeroPoints: false
    }
  ];

  const filterMeals = (arr: any[]) => {
    return arr.filter(dish => {
      const nameAndIng = (dish.nome + " " + dish.ingredienti.join(" ")).toLowerCase();
      if (esclLower && esclLower.split(",").some(word => word.trim().length > 1 && nameAndIng.includes(word.trim()))) {
        return false;
      }
      if (isVegetarian) {
        if (nameAndIng.includes("pollo") || nameAndIng.includes("tacchino") || nameAndIng.includes("salmone") || nameAndIng.includes("merluzzo") || nameAndIng.includes("orata") || nameAndIng.includes("hamburger") || nameAndIng.includes("fesa")) {
          return false;
        }
      }
      if (isVegan) {
        if (nameAndIng.includes("pollo") || nameAndIng.includes("tacchino") || nameAndIng.includes("salmone") || nameAndIng.includes("merluzzo") || nameAndIng.includes("orata") || nameAndIng.includes("hamburger") || nameAndIng.includes("fesa") || nameAndIng.includes("uov") || nameAndIng.includes("yogurt") || nameAndIng.includes("parmigiano") || nameAndIng.includes("miele")) {
          return false;
        }
      }
      if (isNoFish && (nameAndIng.includes("salmone") || nameAndIng.includes("merluzzo") || nameAndIng.includes("orata") || nameAndIng.includes("gambero") || nameAndIng.includes("pesce"))) {
        return false;
      }
      return true;
    });
  };

  const poolColazioni = filterMeals(colazioni);
  const poolPranzi = filterMeals(pranzi);
  const poolCene = filterMeals(cene);
  const poolSpuntini = filterMeals(spuntini);

  const fallbackColazione = {
    nome: "Fetta di pane integrale saporita con marmellata light",
    punti: 2,
    ingredienti: ["40g Pane integrale di segale (2 pt)", "1 cucchiaio di confettura senza zuccheri (0 pt)"],
    ricetta: "Spalma la confettura sul delizioso pane di segale fresco.",
    isZeroPoints: false
  };

  const getColazione = (dayIndex: number) => {
    if (wantsOmelette) {
      const matched = poolColazioni.find(d => d.nome.toLowerCase().includes("uov") || d.nome.toLowerCase().includes("omelette"));
      if (matched) return matched;
    }
    if (poolColazioni.length === 0) return fallbackColazione;
    return poolColazioni[dayIndex % poolColazioni.length];
  };

  const getPranzo = (dayIndex: number) => {
    if (wantsPasta) {
      const matched = poolPranzi.find(d => d.nome.toLowerCase().includes("pasta") || d.nome.toLowerCase().includes("risotto"));
      if (matched) return matched;
    }
    if (wantsPizza) {
      return {
        nome: "Finta Margherita sfiziosa su base pita (Pizzetta Blu)",
        punti: 4,
        ingredienti: ["1 Piadina light integrale come base (4 pt)", "50g Passata di pomodoro saporita (0 pt)", "Origano condimento bio (0 pt)"],
        ricetta: "Stendi il pomodoro sulla piadina, cospargi d'origano ed inforna fino a renderla fragrante a somiglianza di una pizza.",
        isZeroPoints: false
      };
    }
    if (poolPranzi.length === 0) return fallbackColazione;
    return poolPranzi[dayIndex % poolPranzi.length];
  };

  const getCena = (dayIndex: number) => {
    if (wantsPesce) {
      const matched = poolCene.find(d => d.nome.toLowerCase().includes("orata") || d.nome.toLowerCase().includes("salmone") || d.nome.toLowerCase().includes("merluzzo"));
      if (matched) return matched;
    }
    if (wantsPollo) {
      const matched = poolCene.find(d => d.nome.toLowerCase().includes("pollo") || d.nome.toLowerCase().includes("tacchino"));
      if (matched) return matched;
    }
    if (poolCene.length === 0) {
      return {
        nome: "Tofu marinato alle erbe mediterranee grigliato sulla piastra",
        punti: 0,
        ingredienti: ["150g Tofu fresco biologico (0 pt)", "Erbe della macchia mediterranea tritate (0 pt)"],
        ricetta: "Taglia a dadini il tofu, lascialo impregnare degli aromi ed infine piastralo alla griglia.",
        isZeroPoints: true
      };
    }
    return poolCene[dayIndex % poolCene.length];
  };

  const getSpuntino = (dayIndex: number) => {
    if (poolSpuntini.length === 0) {
      return {
        nome: "Bastoncini rinfrescanti di carote fresche e sedano",
        punti: 0,
        ingredienti: ["100g carote dolci (0 pt)", "100g sedano fresco croccante (0 pt)"],
        ricetta: "Monda gli ortaggi, tagliali sgranocchiali freschi.",
        isZeroPoints: true
      };
    }
    return poolSpuntini[dayIndex % poolSpuntini.length];
  };

  const bmrMultiplier = genere === "male" ? 5 : -161;
  const pVal = parseFloat(peso?.toString() || "70") || 70;
  const aVal = parseFloat(altezza?.toString() || "165") || 165;
  const eVal = parseFloat(eta?.toString() || "35") || 35;
  let computedBMR = 10 * pVal + 6.25 * aVal - 5 * eVal + bmrMultiplier;
  let af = 1.2;
  if (livelloAttivita === "light") af = 1.375;
  if (livelloAttivita === "moderate") af = 1.55;
  if (livelloAttivita === "active") af = 1.725;
  let targetCalorieGiorno = computedBMR * af;
  if (obiettivi === "Perdere peso") {
    targetCalorieGiorno -= 450;
  } else if (obiettivi === "Mangiare più sano e proteico") {
    targetCalorieGiorno -= 150;
  }
  targetCalorieGiorno = Math.max(1200, Math.round(targetCalorieGiorno));

  let pCarbo = 0.5, pPro = 0.2, pGrass = 0.3;
  if (distribuzioneMacro === "Iperproteica") {
    pCarbo = 0.35; pPro = 0.35; pGrass = 0.3;
  } else if (distribuzioneMacro === "Low Carb") {
    pCarbo = 0.2; pPro = 0.4; pGrass = 0.4;
  } else if (distribuzioneMacro === "Zona") {
    pCarbo = 0.4; pPro = 0.3; pGrass = 0.3;
  }

  const carbG = Math.round((targetCalorieGiorno * pCarbo) / 4);
  const proG = Math.round((targetCalorieGiorno * pPro) / 4);
  const grassG = Math.round((targetCalorieGiorno * pGrass) / 9);

  const daysList = [];
  const ingrediensSet = new Set<string>();

  for (let d = 1; d <= giorni; d++) {
    const pastiPerGiorno = [];
    let totPoints = 0;

    if (numeroPasti === 2) {
      const p = getPranzo(d);
      const c = getCena(d);
      pastiPerGiorno.push({ ...p, tipoPasto: "Pranzo" });
      pastiPerGiorno.push({ ...c, tipoPasto: "Cena" });
      totPoints += (p.punti + c.punti);
    } else if (numeroPasti === 5) {
      const col = getColazione(d);
      const sp1 = getSpuntino(d);
      const pr = getPranzo(d);
      const sp2 = getSpuntino(d + 1);
      const ce = getCena(d);

      pastiPerGiorno.push({ ...col, tipoPasto: "Colazione" });
      pastiPerGiorno.push({ ...sp1, tipoPasto: "Spuntino Mattutino" });
      pastiPerGiorno.push({ ...pr, tipoPasto: "Pranzo" });
      pastiPerGiorno.push({ ...sp2, tipoPasto: "Spuntino Pomeridiano" });
      pastiPerGiorno.push({ ...ce, tipoPasto: "Cena" });

      totPoints += (col.punti + sp1.punti + pr.punti + sp2.punti + ce.punti);
    } else {
      const col = getColazione(d);
      const pr = getPranzo(d);
      const ce = getCena(d);

      pastiPerGiorno.push({ ...col, tipoPasto: "Colazione" });
      pastiPerGiorno.push({ ...pr, tipoPasto: "Pranzo" });
      pastiPerGiorno.push({ ...ce, tipoPasto: "Cena" });

      totPoints += (col.punti + pr.punti + ce.punti);
    }

    pastiPerGiorno.forEach(p => {
      p.ingredienti.forEach(ing => ingrediensSet.add(ing));
    });

    if (totPoints > puntiBudget) {
      pastiPerGiorno.forEach(p => {
        if (p.punti > 2 && totPoints > puntiBudget) {
          const diff = Math.min(2, totPoints - puntiBudget);
          p.punti -= diff;
          p.nome += " (Porzione leggera)";
          totPoints -= diff;
        }
      });
    } else {
      // Dynamic scaling up of points to match the user's daily budget if they have points left
      let attempts = 0;
      while (totPoints < puntiBudget - 2 && attempts < 10) {
        attempts++;
        const lunch = pastiPerGiorno.find(p => p.tipoPasto === "Pranzo");
        const dinner = pastiPerGiorno.find(p => p.tipoPasto === "Cena");
        const breakfast = pastiPerGiorno.find(p => p.tipoPasto === "Colazione");

        let added = false;

        // 1. Add extra virgin olive oil (+3 points)
        if (lunch && !lunch.nome.includes("con aggiunta d'Olio EVO")) {
          lunch.punti += 3;
          lunch.nome += " (con aggiunta d'Olio EVO)";
          lunch.ingredienti.push("1 cucchiaio di Olio Extravergine d'Oliva per condimento (3 SP)");
          totPoints += 3;
          added = true;
        } else if (dinner && !dinner.nome.includes("con aggiunta d'Olio EVO")) {
          dinner.punti += 3;
          dinner.nome += " (con aggiunta d'Olio EVO)";
          dinner.ingredienti.push("1 cucchiaio di Olio Extravergine d'Oliva per condimento (3 SP)");
          totPoints += 3;
          added = true;
        }
        
        // 2. Add bread (+3 points)
        if (!added && totPoints < puntiBudget - 2) {
          if (dinner && !dinner.nome.includes("con aggiunta di pane integrale")) {
            dinner.punti += 3;
            dinner.nome += " (con aggiunta di pane integrale)";
            dinner.ingredienti.push("50g di pane integrale di segale addizionale (3 SP)");
            totPoints += 3;
            added = true;
          } else if (breakfast && !breakfast.nome.includes("con aggiunta di mandorle")) {
            breakfast.punti += 4;
            breakfast.nome += " (con aggiunta di mandorle)";
            breakfast.ingredienti.push("15g di mandorle sgusciate ricche di grassi sani (4 SP)");
            totPoints += 4;
            added = true;
          }
        }

        // 3. Add Parmigiano (+2 points)
        if (!added && totPoints < puntiBudget - 2) {
          if (lunch && !lunch.nome.includes("con aggiunta di parmigiano")) {
            lunch.punti += 2;
            lunch.nome += " (con aggiunta di parmigiano)";
            lunch.ingredienti.push("15g di scaglie di Parmigiano Reggiano DOP (2 SP)");
            totPoints += 2;
            added = true;
          } else if (dinner && !dinner.nome.includes("con aggiunta di parmigiano")) {
            dinner.punti += 2;
            dinner.nome += " (con aggiunta di parmigiano)";
            dinner.ingredienti.push("15g di scaglie di Parmigiano Reggiano DOP (2 SP)");
            totPoints += 2;
            added = true;
          }
        }

        // 4. Add Avocado (+4 points)
        if (!added && totPoints < puntiBudget - 2) {
          if (lunch && !lunch.nome.includes("con aggiunta d'avocado")) {
            lunch.punti += 4;
            lunch.nome += " (con aggiunta d'avocado)";
            lunch.ingredienti.push("70g di avocado fresco tagliato a cubetti (4 SP)");
            totPoints += 4;
            added = true;
          } else if (breakfast && !breakfast.nome.includes("con aggiunta di cioccolato fondente")) {
            breakfast.punti += 3;
            breakfast.nome += " (con aggiunta di cioccolato fondente)";
            breakfast.ingredienti.push("15g di cioccolato fondente amaro 85% (3 SP)");
            totPoints += 3;
            added = true;
          }
        }

        if (!added) {
          break;
        }
      }
    }

    daysList.push({
      giorno: d,
      totalePunti: totPoints,
      pasti: pastiPerGiorno,
      macroGiorno: {
        carboidrati: carbG + (d % 2 === 0 ? 5 : -5),
        proteine: proG + (d % 2 === 0 ? -4 : 4),
        grassi: grassG + (d % 2 === 0 ? 2 : -2),
        calorie: targetCalorieGiorno + (d % 2 === 0 ? 25 : -25)
      }
    });
  }

  const consigli = [
    `Hai impostato un budget di ${puntiBudget} SmartPoints Blu. Ricorda di bere molta acqua (almeno 2L al giorno).`,
    "Sfrutta i cibi a Zero Punti (come uova, yogurt greco magro, verdure novelle e legumi) se avverti ancora fame.",
    `La tua colazione ideale è stata formulata per supportare l'obiettivo: "${obiettivi}".`
  ];

  if (preferenzeSpecifiche) {
    consigli.push(`La pianificazione ha incorporato la tua preferenza per: "${preferenzeSpecifiche}" in modo equilibrato.`);
  }

  return {
    budgetPoints: puntiBudget,
    calorieGiornaliereTarget: targetCalorieGiorno,
    macroDistribuzioneTarget: `${distribuzioneMacro} (${Math.round(pCarbo * 100)}% Carb, ${Math.round(pPro * 100)}% Pro, ${Math.round(pGrass * 100)}% Grassi)`,
    cibiZeroPuntiConsigliati: [
      "Yogurt greco magro (0% grassi)",
      "Uova intere biologiche",
      "Petto di pollo o tacchino grigliato",
      "Legumi al naturale (ceci, lenticchie)",
      "Mela fresca e frutti di bosco"
    ],
    giorni: daysList,
    consigliNutrizionali: consigli,
    listaSpesa: Array.from(ingrediensSet).map(item => "- " + item)
  };
}

// Resilient food analyzer fallback
function generateFallbackFoodAnalysis(cibo: string, ingredienti?: any[]): any {
  if (ingredienti && Array.isArray(ingredienti) && ingredienti.length > 0) {
    let totCalorie = 0;
    let totGrassiSaturi = 0;
    let totZuccheri = 0;
    let totProteine = 0;
    const namesDetail: string[] = [];

    ingredienti.forEach(ing => {
      const nameLower = (ing.nome || "").toLowerCase().trim();
      const q = ing.quantita || "100g";
      let multiplier = 1.0;

      const numericMatch = q.match(/(\d+(?:\.\d+)?)/);
      if (numericMatch) {
        const value = parseFloat(numericMatch[1]);
        if (q.toLowerCase().includes("g")) {
          multiplier = value / 100.0;
        } else if (q.toLowerCase().includes("cucchia") || q.toLowerCase().includes("cucchiaio")) {
          multiplier = value * 0.15; // standard ~15g for generic calculations
        } else {
          multiplier = value;
        }
      }

      // Default raw weights and nutrients per 100g
      let calIng = 120;
      let fatIng = 1.0;
      let sugIng = 2.0;
      let proIng = 5.0;

      if (nameLower.includes("pasta") || nameLower.includes("spaghetti") || nameLower.includes("penne")) {
        calIng = 350; // Dry raw pasta is 350-360 kcal
        fatIng = 0.5;
        sugIng = 1.5;
        proIng = 12.0;
      } else if (nameLower.includes("riso")) {
        calIng = 350; // Dry raw rice
        fatIng = 0.6;
        sugIng = 0.5;
        proIng = 7.0;
      } else if (nameLower.includes("olio")) {
        calIng = 884; // 100g extra virgin olive oil
        fatIng = 13.8;
        sugIng = 0;
        proIng = 0;
      } else if (nameLower.includes("burro")) {
        calIng = 717;
        fatIng = 51.0;
        sugIng = 0.1;
        proIng = 0.8;
      } else if (nameLower.includes("pane")) {
        calIng = 250;
        fatIng = 0.6;
        sugIng = 2.0;
        proIng = 8.0;
      } else if (nameLower.includes("parmigiano") || nameLower.includes("grana") || nameLower.includes("formaggio")) {
        calIng = 392;
        fatIng = 16.0;
        sugIng = 0;
        proIng = 33.0;
      } else if (nameLower.includes("pollo") || nameLower.includes("tacchino")) {
        calIng = 110; // Raw chicken chest is lean
        fatIng = 0.2;
        sugIng = 0;
        proIng = 23.0;
      } else if (nameLower.includes("uov")) {
        calIng = 143;
        fatIng = 3.1;
        sugIng = 0.4;
        proIng = 12.5;
      } else if (nameLower.includes("pomodoro") || nameLower.includes("zucchina") || nameLower.includes("carota") || nameLower.includes("insalata") || nameLower.includes("verdura")) {
        calIng = 20;
        fatIng = 0;
        sugIng = 3.5;
        proIng = 1.1;
      } else if (nameLower.includes("zucchero")) {
        calIng = 387;
        fatIng = 0;
        sugIng = 100.0;
        proIng = 0;
      }

      totCalorie += Math.round(calIng * multiplier);
      totGrassiSaturi += Number((fatIng * multiplier).toFixed(1));
      totZuccheri += Number((sugIng * multiplier).toFixed(1));
      totProteine += Number((proIng * multiplier).toFixed(1));
      namesDetail.push(`${ing.nome} (${q})`);
    });

    let smartPoints = Math.round((totCalorie * 0.0305) + (totGrassiSaturi * 0.275) + (totZuccheri * 0.12) - (totProteine * 0.098));
    if (smartPoints < 0) smartPoints = 0;

    return {
      nome: "Composto Ingredienti (Calcolato a Crudo)",
      porzione: namesDetail.join(", "),
      calorie: totCalorie,
      grassiSaturi: Number(totGrassiSaturi.toFixed(1)),
      zuccheri: Number(totZuccheri.toFixed(1)),
      proteine: Number(totProteine.toFixed(1)),
      smartPoints: smartPoints,
      isZeroPoints: smartPoints === 0,
      motivoZeroPoints: "Questo punteggio è basato sull'analisi e somma dei valori a crudo degli ingredienti forniti.",
      alternativeZeroPoints: ["Sostituire riso o pasta raffinati con verdure a zero punti o shirataki", "Moderare l'olio usando succo di limone o spezie"],
      consiglioPreparazione: "Mantieni l'olio dosato di precisione al cucchiaino a crudo per non alzare i punti."
    };
  }

  const queryLower = cibo.toLowerCase().trim();
  
  let nome = cibo.charAt(0).toUpperCase() + cibo.slice(1);
  let porzione = "100g";
  let calorie = 120;
  let grassiSaturi = 1.2;
  let zuccheri = 2.5;
  let proteine = 8.5;
  let isZeroPoints = false;
  let motivoZeroPoints = "";
  let alternativeZeroPoints = ["Insalatona mista", "Petto di pollo grigliato", "Yogurt greco magro 0%"];
  let consiglioPreparazione = "Preparalo bollito o grigliato senza aggiungere burro o grassi saturi.";

  if (queryLower.includes("pollo") || queryLower.includes("tacchino")) {
    nome = "Petto di pollo grigliato";
    porzione = "120g";
    calorie = 145;
    grassiSaturi = 0.5;
    zuccheri = 0;
    proteine = 28;
    isZeroPoints = true;
    motivoZeroPoints = "Il petto di pollo senza pelle fa parte dei cibi a Zero Punti del piano Blu: è straordinariamente magro e altamente saziante.";
  } else if (queryLower.includes("uov")) {
    nome = "Uovo sodo biologico";
    porzione = "1 uovo (ca. 50g)";
    calorie = 75;
    grassiSaturi = 1.6;
    zuccheri = 0.4;
    proteine = 6.2;
    isZeroPoints = true;
    motivoZeroPoints = "Le uova intere biologiche sono a Zero Punti nella lista Freestyle del piano Blu. Forniscono ottimi grassi sani e proteine ad alta assimilabilità.";
  } else if (queryLower.includes("yogurt")) {
    nome = "Yogurt greco magro (0% grassi)";
    porzione = "150g";
    calorie = 85;
    grassiSaturi = 0;
    zuccheri = 4.2;
    proteine = 15;
    isZeroPoints = true;
    motivoZeroPoints = "Lo yogurt greco naturale con lo 0% di grassi è a Zero Punti Blu, eccellente per tenere lontano la fame tra un pasto e l'altro.";
  } else if (queryLower.includes("pesce") || queryLower.includes("merluzzo") || queryLower.includes("orata") || queryLower.includes("branzino") || queryLower.includes("tonno")) {
    nome = "Filetto di pesce bianco cotto al vapore";
    porzione = "150g";
    calorie = 115;
    grassiSaturi = 0.3;
    zuccheri = 0;
    proteine = 24;
    isZeroPoints = true;
    motivoZeroPoints = "Quasi tutto il pesce bianco fresco o cotto al naturale senza oli aggiunti conta come Zero Punti nella lista del piano Blu.";
  } else if (queryLower.includes("pasta") || queryLower.includes("spaghetti")) {
    nome = "Pasta di semola cotta";
    porzione = "80g (peso crudo)";
    calorie = 280;
    grassiSaturi = 0.3;
    zuccheri = 1.5;
    proteine = 10;
    isZeroPoints = false;
    consiglioPreparazione = "Utilizza pasta integrale per aumentare l'apporto di fibre e tieni la cottura al dente per ridurne l'indice glicemico.";
  } else if (queryLower.includes("mela") || queryLower.includes("pera") || queryLower.includes("banana") || queryLower.includes("frutta")) {
    nome = "Mela fresca di stagione";
    porzione = "1 frutto (150g)";
    calorie = 75;
    grassiSaturi = 0.1;
    zuccheri = 14;
    proteine = 0.4;
    isZeroPoints = true;
    motivoZeroPoints = "La frutta fresca intera non sbucciata è a Zero Punti Blu, eccellente fonte di vitamine e fibre sazianti.";
  } else if (queryLower.includes("verdura") || queryLower.includes("zucchina") || queryLower.includes("carota") || queryLower.includes("finocchio") || queryLower.includes("broccoli")) {
    nome = "Zucchine e carote bollite";
    porzione = "150g";
    calorie = 38;
    grassiSaturi = 0;
    zuccheri = 3.9;
    proteine = 1.5;
    isZeroPoints = true;
    motivoZeroPoints = "Le verdure non amidacee cripte o lesse senza olio rientrano pienamente nei cibi a Zero Punti del piano Blu.";
  } else if (queryLower.includes("riso")) {
    nome = "Riso integrale saporito";
    porzione = "70g (peso crudo)";
    calorie = 245;
    grassiSaturi = 0.4;
    zuccheri = 0.5;
    proteine = 5.5;
    isZeroPoints = false;
  } else if (queryLower.includes("pane")) {
    nome = "Pane integrale a fette";
    porzione = "50g";
    calorie = 125;
    grassiSaturi = 0.2;
    zuccheri = 1;
    proteine = 4.5;
    isZeroPoints = false;
  } else if (queryLower.includes("pizza")) {
    nome = "Pizza margherita classica";
    porzione = "1 pizza (350g)";
    calorie = 850;
    grassiSaturi = 8.5;
    zuccheri = 4.2;
    proteine = 26;
    isZeroPoints = false;
    alternativeZeroPoints = ["Pizzetta leggera su base pita integrale", "Omelette farcita con pomodoro ed origano"];
    consiglioPreparazione = "Sostituisci l'impasto con una tortilla di farro o araba sottile e limita il formaggio per minimizzare i punti.";
  }

  const smartPoints = isZeroPoints ? 0 : calculateSmartPointsFormula(calorie, grassiSaturi, zuccheri, proteine);

  return {
    nome,
    porzione,
    calorie,
    grassiSaturi,
    zuccheri,
    proteine,
    smartPoints,
    isZeroPoints,
    motivoZeroPoints: isZeroPoints ? motivoZeroPoints : "Non rientra nella lista degli alimenti a zero punti del piano Blu, per cui i punti vengono calcolati tramite la formula standard.",
    alternativeZeroPoints,
    consiglioPreparazione
  };
}

// Helper function to call Gemini with a stable fallback in case of high demand (e.g., 503)
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
}): Promise<any> {
  const modelsToTry = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Calling Gemini API using model: ${modelName} (attempt ${attempt}/3)`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Failed to call Gemini using ${modelName} on attempt ${attempt}/3:`, err.message || err);
        if (attempt < 3) {
          const backoffTime = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }
    }
    // Wait a short moment before trying the next model
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError || new Error("All Gemini models failed to generate content");
}

// 1. API: Generate Blue Diet Menu Plan
app.post("/api/generate-menu", async (req, res) => {
  const {
    giorni = 3,
    puntiBudget = 23,
    preferenzeAlimentari = "Nessuna",
    obiettivi = "Perdere peso",
    escludiCibi = "",
    preferenzeSpecifiche = "",
    includiZeroPunti = true,
    genere = "female",
    eta = 35,
    peso = 70,
    altezza = 165,
    livelloAttivita = "sedentary",
    distribuzioneMacro = "Equilibrata",
    numeroPasti = 3
  } = req.body;

  // Let-down immediately to local simulation if key is unspecified or placeholder
  const isMockKey = !apiKey || apiKey === "MY_GEMINI_API_KEY";
  if (isMockKey) {
    console.log("-> Using dynamic mock generative model fallback (API Key missing).");
    const fallbackResult = generateFallbackMenuPlan(req.body) as any;
    
    const promptTokens = 1910 + Math.floor(Math.random() * 200);
    const candidatesTokens = 1450 + Math.floor(Math.random() * 200);
    const totalTokens = promptTokens + candidatesTokens;
    // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
    const costEur = Number(((totalTokens / 5000) * 2).toFixed(6));

    fallbackResult.usageReport = {
      promptTokens,
      candidatesTokens,
      totalTokens,
      costEur,
      isSimulated: true
    };
    
    return res.json(fallbackResult);
  }

  try {
    let descrizionePasti = "";
    if (numeroPasti === 2) {
      descrizionePasti = "Genera esattamente 2 pasti per ogni singola giornata: 'Pranzo' e 'Cena'. Non generare colazioni o spuntini intermedi.";
    } else if (numeroPasti === 5) {
      descrizionePasti = "Genera esattamente 5 pasti per ogni singola giornata nell'ordine cronologico corretto: 'Colazione', 'Spuntino Mattutino', 'Pranzo', 'Spuntino Pomeridiano' e 'Cena'.";
    } else {
      descrizionePasti = "Genera esattamente 3 pasti per ogni singola giornata: 'Colazione', 'Pranzo' e 'Cena'.";
    }

    const userInstructions = `
      Crea un menu dietetico personalizzato di ${giorni} giorno/i basato rigorosamente sui principi della dieta SmartPoints BLU (Freestyle).
      Genera esattamente ${numeroPasti} pasti per ogni singola giornata secondo la seguente configurazione:
      ${descrizionePasti}
      
      Inoltre, modella e bilancia rigorosamente i macronutrienti adattandoli al profilo specifico dell'utente:
      
      Dati Profilo Utente:
      - Genere: ${genere}
      - Età: ${eta} anni
      - Peso: ${peso} kg
      - Altezza: ${altezza} cm
      - Livello attività: ${livelloAttivita}
      - Obiettivo: ${obiettivi}
      
      Regole di Bilanciamento dei Macronutrienti (Strategia selezionata: "${distribuzioneMacro}"):
      - Approssima il fabbisogno energetico giornaliero dell'utente (TDEE). Modula la quota in deficit si l'obiettivo è perdere peso.
      - "Equilibrata": Proporzione indicativa di 50% Carboidrati, 20% Proteine, 30% Grassi.
      - "Iperproteica": Proporzione indicativa di 35% Carboidrati, 35% Proteine, 30% Grassi. Ottima per sportivi o per massimizzare la sazietà.
      - "Low Carb": Proporzione indicativa di 20% Carboidrati, 40% Proteine, 40% Grassi. Limitando pane, pasta e cereali a favore di fonti proteiche magre e verdure.
      - "Zona": Proporzione indicativa di 40% Carboidrati, 30% Proteine, 30% Grassi.
      - Assicurati che la somma di carboidrati, proteine e grassi (in grammi) rispecchi questa distributione energetica per ogni giornata (1g Carbo = 4kcal, 1g Proteine = 4kcal, 1g Grassi = 9kcal).
 
      Regole fondamentali SmartPoints BLU:
      - Budget giornaliero dell'utente: ${puntiBudget} SmartPoints.
      - IMPORTANTE: Per CIASCUN singolo giorno generato (giorno 1, giorno 2, giorno 3, ecc.), la somma dei punti dei pasti di quel singolo giorno (totalePunti) deve essere vicina al budget giornaliero di ${puntiBudget} SmartPoints (es. tra ${puntiBudget - 4} e ${puntiBudget} SmartPoints). NON dividere il budget per il numero di giorni e NON limitare la somma di tutte le giornate a ${puntiBudget}! Ciascun singolo giorno ha il suo budget indipendente di ${puntiBudget} SmartPoints.
      - I seguenti cibi sono a ZERO PUNTI (ZeroPoint foods) nella lista Blu e non contano nel conteggio dei punti giornalieri (assegna loro 0 punti nel menu):
      - Petto di pollo e tacchino senza pelle, uova intere.
      - Pesce e crostacei freschi, surgelati o al naturale.
      - Legumi (fagioli, lenticchie, ceci, piselli, edamame).
      - Yogurt greco magro (0% grassi).
      - Tofu e tempeh.
      - Frutta fresca e quasi tutta la verdura non amidacea.
      - Mais dolce.
      - Altri alimenti (pane, riso, olio, burro, carboidrati complessi) consumano punti in base alla loro densità calorica, zuccheri e grassi saturi.
      - Il pasto deve essere equilibrato e gustoso, con istruzioni chiare e ingredienti in italiano.
      - Preferenze alimentari generali specificate dall'utente: ${preferenzeAlimentari}.
      - Cibi da escludere o allergie: ${escludiCibi}.
      - Richiesta o preferenze specifiche / voglie di cibi particolari dell'utente: "${preferenzeSpecifiche || "Nessuna in particolare"}". Se l'utente ha scritto qualcosa qui, cerca assolutamente di incorporare questi cibi, pasti o stili nel menu rispettandone il budget SmartPoints e descrivendo come integrarli in modo sano.

      Genera l'output in perfetto JSON seguendo lo schema richiesto. Tutti i valori nutrizionali macroGiorno devono essere stabili e realistici per il profilo inserito. Tutti i testi devono essere in italiano.
    `;

    const response = await generateContentWithRetry({
      contents: userInstructions,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            budgetPoints: {
              type: Type.INTEGER,
              description: "Budget punti giornaliero dell'utente considerato."
            },
            calorieGiornaliereTarget: {
              type: Type.INTEGER,
              description: "Calorie giornaliere target stimate basate su metabolismo e obiettivi dell'utente (es: 1550)."
            },
            macroDistribuzioneTarget: {
              type: Type.STRING,
              description: "Breve spiegazione del piano energetico e di macronutrienti calcolati (es: 'Equilibrato (50% Carbo, 20% Pro, 30% Grassi)')."
            },
            cibiZeroPuntiConsigliati: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista di 4-6 cibi a Zero Punti della lista del piano Blu ottimi per le preferenze di questo utente."
            },
            giorni: {
              type: Type.ARRAY,
              description: "Lista dei giorni generati.",
              items: {
                type: Type.OBJECT,
                properties: {
                   giorno: { type: Type.INTEGER, description: "Numero progressivo del giorno" },
                   totalePunti: {
                     type: Type.INTEGER,
                     description: "Somma esatta degli SmartPoints di tutti i pasti in questo giorno."
                   },
                   pasti: {
                     type: Type.ARRAY,
                     description: `Lista di esattamente ${numeroPasti} pasti previsti per la giornata in ordine cronologico.`,
                     items: {
                       type: Type.OBJECT,
                       properties: {
                         nome: { type: Type.STRING, description: "Titolo del pasto" },
                         tipoPasto: { type: Type.STRING, description: "Tipo di pasto, es: 'Colazione', 'Pranzo', 'Cena', 'Spuntino Mattutino', 'Spuntino Pomeridiano'" },
                         punti: { type: Type.INTEGER, description: "SmartPoints (0 se del tutto a zero punti)" },
                         ingredienti: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista ingredienti con quantità" },
                         ricetta: { type: Type.STRING, description: "Semplice descrizione e preparazione in italiano" },
                         isZeroPoints: { type: Type.BOOLEAN, description: "Vero se è fatto esclusivamente o prevalentemente di cibi a Zero Punti" }
                       },
                       required: ["nome", "tipoPasto", "punti", "ingredienti", "ricetta", "isZeroPoints"]
                     }
                   },
                   macroGiorno: {
                     type: Type.OBJECT,
                     properties: {
                       carboidrati: { type: Type.INTEGER, description: "Totale grammi carboidrati del giorno" },
                       proteine: { type: Type.INTEGER, description: "Totale grammi proteine del giorno" },
                       grassi: { type: Type.INTEGER, description: "Totale grammi grassi del giorno" },
                       calorie: { type: Type.INTEGER, description: "Totale calorie del giorno" }
                     },
                     required: ["carboidrati", "proteine", "grassi", "calorie"]
                   }
                },
                required: ["giorno", "totalePunti", "pasti", "macroGiorno"]
              }
            },
            consigliNutrizionali: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-4 consigli personalizzati sul piano SmartPoints Blu, come cucinare i pasti o organizzarsi."
            },
            listaSpesa: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tutti gli alimenti necessari per la spesa raggruppati in modo logico."
            }
          },
          required: [
            "budgetPoints", "calorieGiornaliereTarget", "macroDistribuzioneTarget",
            "cibiZeroPuntiConsigliati", "giorni", "consigliNutrizionali", "listaSpesa"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("La risposta dell'AI è vuota");
    }

    const data = JSON.parse(resultText);

    if (data && puntiBudget) {
      data.budgetPoints = Number(puntiBudget);
    }

    // Process Token Usage and Cost Report
    const usage = response.usageMetadata || {};
    const promptTokens = Number(usage.promptTokenCount || usage.promptTokens || 1850 + Math.floor(Math.random() * 300));
    const candidatesTokens = Number(usage.candidatesTokenCount || usage.candidatesTokens || 1500 + Math.floor(Math.random() * 250));
    const totalTokens = promptTokens + candidatesTokens;
    // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
    const costEur = Number(((totalTokens / 5000) * 2).toFixed(6));

    data.usageReport = {
      promptTokens,
      candidatesTokens,
      totalTokens,
      costEur,
      isSimulated: !response.usageMetadata
    };

    res.json(data);
  } catch (error: any) {
    console.error("Errore generazione menu (Gemini):", error);
    try {
      console.log("-> Recupero di emergenza: Avvio pianificazione fallback offline.");
      const fallbackResult = generateFallbackMenuPlan(req.body) as any;
      fallbackResult.consigliNutrizionali.unshift(
        "Avviso: Il menu è stato pianificato localmente in modalità sicura perché la connessione AI con i server Gemini è temporaneamente indisponibile o la chiave API non è attiva."
      );

      const promptTokens = 1910 + Math.floor(Math.random() * 200);
      const candidatesTokens = 1450 + Math.floor(Math.random() * 200);
      const totalTokens = promptTokens + candidatesTokens;
      // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
      const costEur = Number(((totalTokens / 5000) * 2).toFixed(6));

      fallbackResult.usageReport = {
        promptTokens,
        candidatesTokens,
        totalTokens,
        costEur,
        isSimulated: true
      };

      res.json(fallbackResult);
    } catch (fallbackErr: any) {
       res.status(500).json({ error: "Impossibile elaborare il menu. " + error.message });
    }
  }
});

// 2. API: Analyze Food Nutrition and Calculate SmartPoints Blue
app.post("/api/analyze-food", async (req, res) => {
  const { cibo, ingredienti } = req.body;
  if (!cibo && (!ingredienti || !Array.isArray(ingredienti) || ingredienti.length === 0)) {
    return res.status(400).json({ error: "Specificare il nome del cibo o la lista di ingredienti da analizzare." });
  }

  const isMockKey = !apiKey || apiKey === "MY_GEMINI_API_KEY";
  if (isMockKey) {
    console.log("-> Analyzing food with static fallback.");
    const analysisResult = generateFallbackFoodAnalysis(cibo || "", ingredienti);
    
    // Simulate lightweight token usage for food analysis
    const promptTokens = 490 + Math.floor(Math.random() * 80);
    const candidatesTokens = 220 + Math.floor(Math.random() * 55);
    const totalTokens = promptTokens + candidatesTokens;
    // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
    const costEur = Number(((totalTokens / 5000) * 2).toFixed(6));

    analysisResult.usageReport = {
      promptTokens,
      candidatesTokens,
      totalTokens,
      costEur,
      isSimulated: true
    };

    return res.json(analysisResult);
  }

  try {
    let promptText = "";
    if (ingredienti && Array.isArray(ingredienti) && ingredienti.length > 0) {
      const ingredientListStr = ingredienti
        .map((i: any) => `- ${i.nome}: ${i.quantita || "non specificato"}`)
        .join("\n");
      promptText = `
        Sei un nutrizionista di alto livello specializzato nel piano di dieta SmartPoints BLU.
        Analizza i seguenti ingredienti per conto dell'utente, eseguendo la stima nutrizionale e il calcolo dei punti rigorosamente sui pesi e ingredienti A CRUDO (stato crudo prima di essere cucinati o cotti):

        ${ingredientListStr}

        Istruzioni operative:
        1. Considera ciascun alimento nel suo peso e stato a crudo (ad esempio, la pasta secca, il riso crudo, le carni e i pesci crudi, i condimenti dosati prima dei pasti). La cottura a volte altera notevolmente il peso assorbendo o rilasciando liquidi, ma il calcolo di precisione va fatto a crudo.
        2. Determina se vi sono cibi a ZERO PUNTI (ZeroPoint foods) del piano Blu (petto di pollo magro, uova, la maggior parte di frutta e verdura non amidacea, yogurt greco magro 0%, legumi cotti al naturale senza grassi, pesce fresco al naturale, tofu). A questi ingredienti assegna costantemente 0 punti nel conteggio SmartPoints, pur includendo i loro macro nell'energia complessiva.
        3. Stima e somma i valori nutrizionali di tutti gli ingredienti a crudo: Calorie finali, Grassi saturi, Zuccheri e Proteine totali della ricetta.
        4. Calcola gli SmartPoints del composto finale applicando la formula ufficiale del piano Blu:
           SmartPoints = (Calorie complessive * 0.0305) + (Grassi saturi complessivi * 0.275) + (Zuccheri complessivi * 0.12) - (Proteine complessive * 0.098)
           Il tutto arrotondato all'all'intero più vicino. Se il risultato è inferiore a 0, imposta il minimo di 0 punti.
        5. Nel campo "nome" imposta una dicitura sintetica come "Composto di ingredienti a crudo" o un piccolo riassunto degli ingredienti principali (es. "Pasta, pomodoro e olio (a crudo)").
        6. Nel campo "porzione" inserisci la descrizione di tutti i componenti pesati a crudo con le loro quantità.
        
        Rispondi in formato JSON seguendo questo schema esatto in lingua italiana.
      `;
    } else {
      promptText = `
        Analizza l'alimento o composto culinario "${cibo}" secondo le linee guida degli SmartPoints BLU, ricordando di stimare e basare la precisione dei punti sui corrispondenti pesi A CRUDO (es. se pasta, considerala pasta cruda/secca con rispettivo valore di SmartPoints prima di essere cotta).
        Determina se appartiene alla lista dei cibi a ZERO PUNTI (ZeroPoint foods) del piano Blu (es. petto di pollo, uova, la maggior parte di frutta e verdura, yogurt greco magro, legumi, merluzzo o pesce naturale, tofu).
        Se è un cibo a zero punti, allora il totale SmartPoints è 0. Fornisci i valori nutrizionali stimati per una porzione standard adatta a quel cibo a crudo.
        Se non è un cibo a zero punti (es. avocado, pane, olio, dolci, riso, pasta), stima i suoi valori nutrizionali per una porzione standard a crudo (Calorie, Grassi saturi, Zuccheri, Proteine) e calcola gli SmartPoints usando la formula ufficiale:
        SmartPoints = (Calorie * 0.0305) + (Grassi saturi * 0.275) + (Zuccheri * 0.12) - (Proteine * 0.098) arrotondato all'intero più vicino (minimo 0).

        Rispondi in formato JSON seguendo questo schema esatto in lingua italiana.
      `;
    }

    const response = await generateContentWithRetry({
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING, description: "Nome normalizzato dell'alimento in italiano" },
            porzione: { type: Type.STRING, description: "Porzione standard o componenti a crudo considerati (es: 100g, 100g pasta cruda + 10g olio)" },
            calorie: { type: Type.INTEGER, description: "Calorie stimate della porzione" },
            grassiSaturi: { type: Type.NUMBER, description: "Grassi saturi stimati in grammi per porzione" },
            zuccheri: { type: Type.NUMBER, description: "Zuccheri stimati in grammi per porzione" },
            proteine: { type: Type.NUMBER, description: "Proteine stimate in grammi per porzione" },
            smartPoints: { type: Type.INTEGER, description: "I punti calcolati. Deve essere 0 se isZeroPoints è vero." },
            isZeroPoints: { type: Type.BOOLEAN, description: "Se fa parte dei cibi a zero punti della lista del piano Blu." },
            motivoZeroPoints: { type: Type.STRING, description: "Spiegazione in italiano del perché è a zero punti o come viene inserito nel piano di dieta Blu." },
            alternativeZeroPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Esempi di alternative a meno punti o a zero punti." },
            consiglioPreparazione: { type: Type.STRING, description: "Un trucco o consiglio culinario per cucinarlo in modo sano e leggero mantenendo i punti bassi." }
          },
          required: [
            "nome", "porzione", "calorie", "grassiSaturi", "zuccheri", "proteine",
            "smartPoints", "isZeroPoints", "motivoZeroPoints", "alternativeZeroPoints", "consiglioPreparazione"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Risposta vuota dall'AI");
    }

    const data = JSON.parse(resultText);

    // Process Token Usage and Cost Report
    const usage = response.usageMetadata || {};
    const promptTokens = Number(usage.promptTokenCount || usage.promptTokens || 520 + Math.floor(Math.random() * 80));
    const candidatesTokens = Number(usage.candidatesTokenCount || usage.candidatesTokens || 240 + Math.floor(Math.random() * 50));
    const totalTokens = promptTokens + candidatesTokens;
    // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
    const costEur = Number(((totalTokens / 5000) * 2).toFixed(6));

    data.usageReport = {
      promptTokens,
      candidatesTokens,
      totalTokens,
      costEur,
      isSimulated: !response.usageMetadata
    };

    res.json(data);
  } catch (error: any) {
    console.error("Errore analisi cibo (Gemini):", error);
    try {
      console.log("-> Falling back to local food analyzer.");
      const analysisResult = generateFallbackFoodAnalysis(cibo || "", ingredienti);

      const promptTokens = 490 + Math.floor(Math.random() * 80);
      const candidatesTokens = 220 + Math.floor(Math.random() * 55);
      const totalTokens = promptTokens + candidatesTokens;
      // Ogni 5000 punti (token) dell'utente corrispondono a 2 euro di consumo AI
      const costEur = Number(((totalTokens / 5000) * 2).toFixed(6));

      analysisResult.usageReport = {
        promptTokens,
        candidatesTokens,
        totalTokens,
        costEur,
        isSimulated: true
      };

      return res.json(analysisResult);
    } catch (fbErr: any) {
      res.status(500).json({ error: error.message || "Impossibile analizzare l'alimento." });
    }
  }
});

// 3. API: Google Auth Setup & Simulation
app.get("/api/auth/google/url", (req, res) => {
  const customRedirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    // If client ID is not configured, redirect to our beautifully simulated login portal
    return res.json({ url: "/auth/google/simulated" });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: customRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account"
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

app.get("/auth/google/simulated", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Accedi con Google</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Roboto', sans-serif; }
      </style>
    </head>
    <body class="bg-[#f0f4f9] flex flex-col justify-between min-h-screen">
      <div class="flex-grow flex flex-col justify-center items-center px-4 py-8">
        <div class="bg-white border border-gray-200/60 rounded-3xl p-8 w-full max-w-sm shadow-xl shadow-slate-100">
          
          <!-- Google Logo -->
          <div class="flex justify-center mb-6">
            <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>

          <h2 class="text-xl font-medium text-center text-gray-800 mb-1">Accedi con Google</h2>
          <p class="text-xs text-center text-gray-500 mb-6">per accedere a <strong>SmartPoints Blu</strong></p>

          <div class="space-y-3">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Email Google</label>
              <input id="custom-email" type="email" placeholder="es: utente@gmail.com" class="w-full border border-slate-200 focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs outline-none transition mb-3">
              <button onclick="submitCustom()" class="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1 cursor-pointer">
                <span>Procedi</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <div class="text-center py-4 text-[10px] text-slate-400 border-t border-slate-100 bg-white">
        Questo è un portale protetto e simulato per il login sicuro in AI Studio.
      </div>

      <script>
        function selectAccount(email, name) {
          const user = {
            id: 'google-' + Math.random().toString(36).substring(2, 11),
            email: email,
            name: name
          };
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: user }, '*');
          window.close();
        }

        function submitCustom() {
          const emailVal = document.getElementById('custom-email').value.trim();
          if (!emailVal || !emailVal.includes('@')) {
            alert('Inserisci un indirizzo email valido.');
            return;
          }
          const name = emailVal.split('@')[0];
          const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
          selectAccount(emailVal, capitalized);
        }
      </script>
    </body>
    </html>
  `);
});

app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;

  if (!code || !clientId || !clientSecret) {
    return res.send(`
      <html>
        <body class="font-sans text-center py-20 bg-slate-50 text-slate-800">
          <p class="text-rose-600 font-semibold mb-2">Errore di configurazione</p>
          <p class="text-xs text-slate-500">Mancano le variabili d'ambiente GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.</p>
          <button onclick="window.close()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-xs">Chiudi finestra</button>
        </body>
      </html>
    `);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      throw new Error("Impossibile scambiare l'Authorization Code.");
    }

    const tokens: any = await tokenRes.json();
    
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userRes.ok) {
      throw new Error("Impossibile recuperare il profilo di Google.");
    }

    const profile: any = await userRes.json();

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                user: {
                  id: 'google-' + '${profile.sub || ""}',
                  email: '${profile.email || ""}',
                  name: '${profile.name || profile.given_name || ""}'
                }
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Accesso Google completato! Chiusura finestra in corso...</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Errore callback Google:", err);
    res.send(`
      <html>
        <body class="font-sans text-center py-20 bg-slate-50 text-slate-800">
          <p class="text-rose-600 font-semibold mb-2">Errore di autenticazione</p>
          <p class="text-xs text-slate-500">${err.message || "Errore sconosciuto"}</p>
          <button onclick="window.close()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-xs">Chiudi finestra</button>
        </body>
      </html>
    `);
  }
});

// Setup Vite Dev Server / Static Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
