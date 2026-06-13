import { UserProfile } from "../types";
import { SUGGESTED_BUDGET_CALCULATOR } from "../data";

const USERS_KEY = "ww_registered_users";

export const getLocalUsers = (): UserProfile[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    // Seed default users if empty
    const demoProfile: UserProfile = {
      id: "demo-uid",
      name: "demo",
      email: "demo@smartpoints-v3.internal",
      password: "password123",
      budgetPoints: 23,
      gender: "female",
      age: 35,
      weight: 70,
      height: 165,
      activityLevel: "sedentary",
      weightGoal: "Perdere peso",
      aiCredits: 5,
      totalTokensUsed: 0,
      totalCostEur: 0
    };

    const brunaProfile: UserProfile = {
      id: "bruna-uid",
      name: "bruna65b",
      email: "bruna65b@smartpoints-v3.internal",
      password: "Antonio.77",
      budgetPoints: 23,
      gender: "female",
      age: 35,
      weight: 70,
      height: 165,
      activityLevel: "sedentary",
      weightGoal: "Perdere peso",
      aiCredits: 99,
      totalTokensUsed: 0,
      totalCostEur: 0
    };

    const users = [demoProfile, brunaProfile];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  }

  try {
    const parsed = JSON.parse(data) as UserProfile[];
    
    // Ensure "bruna" / "bruna65b" always exists in the database
    const hasBruna = parsed.some(u => {
      const lower = u.name.toLowerCase();
      return lower === "bruna" || lower === "bruna65b";
    });

    if (!hasBruna) {
      const brunaProfile: UserProfile = {
        id: "bruna-uid",
        name: "bruna65b",
        email: "bruna65b@smartpoints-v3.internal",
        password: "Antonio.77",
        budgetPoints: 23,
        gender: "female",
        age: 35,
        weight: 70,
        height: 165,
        activityLevel: "sedentary",
        weightGoal: "Perdere peso",
        aiCredits: 99,
        totalTokensUsed: 0,
        totalCostEur: 0
      };
      parsed.push(brunaProfile);
      localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
    }

    // Always enforce up-to-date password "Antonio.77" for Bruna
    let updated = false;
    const mapped = parsed.map(u => {
      const uName = u.name.toLowerCase();
      if ((uName === "bruna65b" || uName === "bruna") && u.password !== "Antonio.77") {
        u.password = "Antonio.77";
        updated = true;
      }
      return u;
    });
    if (updated) {
      localStorage.setItem(USERS_KEY, JSON.stringify(mapped));
    }
    return mapped;
  } catch (err) {
    return [];
  }
};

export const saveLocalUsers = (users: UserProfile[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const findLocalUserByUsername = (username: string): UserProfile | undefined => {
  const users = getLocalUsers();
  const clean = username.trim().toLowerCase();
  return users.find(u => u.name.toLowerCase() === clean);
};

export const createLocalUser = (profile: UserProfile): UserProfile => {
  const users = getLocalUsers();
  users.push(profile);
  saveLocalUsers(users);
  return profile;
};

export const updateLocalUser = (userId: string, updatedData: Partial<UserProfile>): UserProfile | null => {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  const updatedUser = { ...users[index], ...updatedData };
  users[index] = updatedUser;
  saveLocalUsers(users);
  return updatedUser;
};

export const deleteLocalUser = (userId: string): boolean => {
  const users = getLocalUsers();
  const filtered = users.filter(u => u.id !== userId);
  saveLocalUsers(filtered);
  return true;
};
