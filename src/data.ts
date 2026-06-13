import { ZeroPointGroup } from "./types";

export const ZERO_POINT_FOODS_DATA: ZeroPointGroup[] = [
  {
    categoria: "Frutta Fresca",
    descrizione: "Tutta la frutta fresca, congelata senza zuccheri aggiunti o conservata al naturale (senza sciroppo).",
    icon: "Apple",
    cibi: [
      "Mele", "Banane", "Fragole", "Mirtilli", "Lamponi", "Arance", "Mandarini",
      "Pompelmo", "Pesche", "Albicocche", "Ciliegie", "Prugne", "Pere", "Ananas",
      "Melone", "Cocomero", "Uva", "Kiwi", "Fichi freschi"
    ]
  },
  {
    categoria: "Verdure Non Amidacee",
    descrizione: "La maggior parte delle verdure fresche, cotte a vapore o senza l'aggiunta di grassi.",
    icon: "Leaf",
    cibi: [
      "Spinaci", "Bietole", "Insalata verde (Tutte)", "Broccoli", "Cavolfiore",
      "Zucchine", "Melanzane", "Peperoni", "Pomodori", "Cetrioli", "Finocchi",
      "Carote", "Sedano", "Fagiolini", "Funghi", "Zucca gialla", "Asparagi",
      "Porri", "Cipolle", "Ravanelli", "Cavoletti di Bruxelles"
    ]
  },
  {
    categoria: "Pollame Magro",
    descrizione: "Petto di pollo o tacchino sgrassato, senza pelle, cotto senza grassi aggiunti.",
    icon: "Beef",
    cibi: [
      "Petto di pollo intero (senza pelle)",
      "Petto di tacchino intero (senza pelle)",
      "Macinato magro di petto di pollo (99% magro)",
      "Macinato magro di tacchino (99% magro)",
      "Fette di fesa di tacchino al naturale"
    ]
  },
  {
    categoria: "Uova",
    descrizione: "Uova intere biologiche, albume d'uovo fresco o liquido.",
    icon: "Egg",
    cibi: [
      "Uova intere (Sode, in camicia, al tegame antiaderente senza olio)",
      "Tuorli d'uovo",
      "Albumi d'uovo (Ideali per frittate iperproteiche a zero punti)"
    ]
  },
  {
    categoria: "Pesce & Crostacei",
    descrizione: "Pesce fresco o surgelato, frutti di mare e crostacei cotti senza oli aggiunti.",
    icon: "Fish",
    cibi: [
      "Merluzzo", "Nasello", "Branzino / Spigola", "Orata", "Salmone fresco",
      "Tonno fresco o in scatola al naturale", "Sardine al naturale", "Sogliola",
      "Gamberi e mazzancolle", "Seppie", "Calamari", "Cozze e vongole",
      "Polpo", "Aragosta", "Capesante"
    ]
  },
  {
    categoria: "Legumi & Mais",
    descrizione: "Fagioli di ogni tipo, lenticchie, ceci e mais cotti o in scatola al naturale.",
    icon: "Bean",
    cibi: [
      "Ceci", "Lenticchie (verdi, rosse, marroni)", "Fagioli borlotti", "Fagioli cannellini",
      "Fagioli neri", "Fagioli rossi", "Piselli freschi o surgelati", "Edamame",
      "Mais dolce (in chicchi, al naturale, senza zucchero aggiunto)", "Lupini"
    ]
  },
  {
    categoria: "Latticini Magri & Sostituti",
    descrizione: "Yogurt greco magro puro o yogurt al naturale senza grassi, tofu e tempeh.",
    icon: "Milk",
    cibi: [
      "Yogurt greco magro (0% grassi, bianco naturale)",
      "Yogurt bianco magro (0% grassi)",
      "Tofu al naturale (compatto o vellutato)",
      "Tempeh al naturale"
    ]
  }
];

export const SUGGESTED_BUDGET_CALCULATOR = {
  getSuggestedPoints: (gender: string, age: number, weight: number, height: number, activity: string, weightGoal?: string): number => {
    // Classic SmartPoints formula starts calculation from 0, and then applies the safety floor (min 23) at the end.
    let points = 0;
    
    // 1. Gender contribution
    if (gender === "male") {
      points += 8;
    } else {
      points += 2; // female / other
    }

    // 2. Age contribution
    if (age >= 17 && age <= 26) {
      points += 4;
    } else if (age >= 27 && age <= 37) {
      points += 3;
    } else if (age >= 38 && age <= 47) {
      points += 2;
    } else if (age >= 48 && age <= 58) {
      points += 1;
    } else if (age > 58) {
      points += 0;
    } else {
      points += 2; // standard default fallback
    }

    // 3. Weight contribution (10% of weight in lbs, which corresponds to the first two digits of weight in lbs)
    const weightLbs = weight * 2.20462;
    const weightContrib = Math.floor(weightLbs / 10);
    points += Math.max(0, weightContrib);

    // 4. Height contribution
    if (height < 160) {
      points += 0;
    } else if (height >= 160 && height < 178) {
      points += 1;
    } else {
      points += 2; // 178 cm or taller
    }

    // 5. Physical Activity contribution
    const act = activity ? activity.toLowerCase() : "";
    if (act === "active" || act === "very_active") {
      points += 4;
    } else if (act === "moderate" || act === "lightly_active" || act === "light") {
      points += 2;
    } else {
      // sedentary
      points += 0;
    }

    // 6. Weight goal contribution
    if (weightGoal === "Mantenere peso" || weightGoal === "Mantenimento") {
      points += 4; // maintenance allowance
    } else if (weightGoal === "Mangiare più sano e proteico") {
      points += 1;
    }

    // Apply the standard daily minimum floor constraint (23 SmartPoints is the minimum)
    return Math.max(23, Math.min(60, Math.round(points)));
  }
};
