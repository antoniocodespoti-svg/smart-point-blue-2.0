export interface Pasto {
  nome: string;
  punti: number;
  ingredienti: string[];
  ricetta: string;
  isZeroPoints: boolean;
  tipoPasto?: string;
}

export interface PastiFase {
  colazione: Pasto;
  pranzo: Pasto;
  cena: Pasto;
  spuntino: Pasto;
}

export interface Macronutrienti {
  carboidrati: number; // grammi
  proteine: number;    // grammi
  grassi: number;      // grammi
  calorie: number;     // kcal
}

export interface GiornataMenu {
  giorno: number;
  totalePunti: number;
  pasti: Pasto[];
  macroGiorno: Macronutrienti;
}

export interface WWMenuPlan {
  budgetPoints: number;
  cibiZeroPuntiConsigliati: string[];
  giorni: GiornataMenu[];
  consigliNutrizionali: string[];
  listaSpesa: string[];
  calorieGiornaliereTarget: number;
  macroDistribuzioneTarget: string;
}

export interface ProfiloDietetico {
  giorni: number;
  puntiBudget: number;
  preferenzeAlimentari: string;
  escludiCibi: string;
  preferenzeSpecifiche: string;
  obiettivi: string;
  includiZeroPunti: boolean;
  genere: string;
  eta: number;
  peso: number;
  altezza: number;
  livelloAttivita: string;
  distribuzioneMacro: string;
  numeroPasti: number;
}

export interface FoodTrackItem {
  id: string;
  nome: string;
  punti: number;
  categoria: 'colazione' | 'pranzo' | 'cena' | 'spuntino';
  isZeroPoints: boolean;
  calorie?: number;
  grassiSaturi?: number;
  zuccheri?: number;
  proteine?: number;
  porzione?: string;
}

export interface FoodAnalysis {
  nome: string;
  porzione: string;
  calorie: number;
  grassiSaturi: number;
  zuccheri: number;
  proteine: number;
  smartPoints: number;
  isZeroPoints: boolean;
  motivoZeroPoints: string;
  alternativeZeroPoints: string[];
  consiglioPreparazione: string;
}

export interface ZeroPointGroup {
  categoria: string;
  cibi: string[];
  icon: string;
  descrizione: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  budgetPoints: number;
  gender: 'male' | 'female';
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'lightly_active' | 'active' | 'very_active';
  weightGoal: string;
  aiCredits?: number;
  totalTokensUsed?: number;
  totalCostEur?: number;
  approved?: boolean;
  trackedFoods?: FoodTrackItem[];
  pointsHistory?: any[];
}

export interface PointsRow {
  id: string;
  data: string; // is the date string like YYYY-MM-DD
  punti: number; // standard credits loaded
  puntiBonus: number; // bonus credits loaded
  note: string;
}


