import { UserProfile } from "../types";
import { SUGGESTED_BUDGET_CALCULATOR } from "../data";
import { doc, setDoc, deleteDoc, updateDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { handleFirestoreError, OperationType } from "./firestoreService";

const USERS_KEY = "ww_registered_users";

// Static default seed profiles
export const DEFAULT_DEMO_PROFILE: UserProfile = {
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
  totalCostEur: 0,
  approved: true
};

export const DEFAULT_BRUNA_PROFILE: UserProfile = {
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
  totalCostEur: 0,
  approved: true
};

export const getLocalUsers = (): UserProfile[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    const users = [DEFAULT_DEMO_PROFILE, DEFAULT_BRUNA_PROFILE];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  }

  try {
    const parsed = JSON.parse(data) as UserProfile[];
    
    // Ensure "bruna" / "bruna65b" always exists
    const hasBruna = parsed.some(u => {
      const lower = u.name.toLowerCase();
      return lower === "bruna" || lower === "bruna65b";
    });

    if (!hasBruna) {
      parsed.push(DEFAULT_BRUNA_PROFILE);
      localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
    }

    // Always enforce password "Antonio.77" and "approved: true" for Bruna
    let updated = false;
    const mapped = parsed.map(u => {
      const uName = u.name.toLowerCase();
      if ((uName === "bruna65b" || uName === "bruna") && u.password !== "Antonio.77") {
        u.password = "Antonio.77";
        updated = true;
      }
      if (u.approved === undefined) {
        u.approved = true;
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
  // Write to Firestore asynchronously
  users.forEach((u) => {
    setDoc(doc(db, "users", u.id), u, { merge: true }).catch((e) => {
      console.error("Error writing user to firestore", e);
    });
  });
};

export const findLocalUserByUsername = (username: string): UserProfile | undefined => {
  const users = getLocalUsers();
  const clean = username.trim().toLowerCase();
  return users.find(u => u.name.toLowerCase() === clean);
};

export const createLocalUser = (profile: UserProfile): UserProfile => {
  const users = getLocalUsers();
  users.push(profile);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // Async firestore write
  setDoc(doc(db, "users", profile.id), profile).catch(e => {
    console.error("Firestore creation error:", e);
    handleFirestoreError(e, OperationType.CREATE, `users/${profile.id}`);
  });
  
  return profile;
};

export const updateLocalUser = (userId: string, updatedData: Partial<UserProfile>): UserProfile | null => {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.id === userId);
  
  let updatedUser: UserProfile;
  if (index === -1) {
    // If user is not cached locally, seed a minimum structure before merging
    updatedUser = { id: userId, ...updatedData } as UserProfile;
    users.push(updatedUser);
  } else {
    updatedUser = { ...users[index], ...updatedData };
    users[index] = updatedUser;
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // Async firestore update
  setDoc(doc(db, "users", userId), updatedData, { merge: true }).catch(e => {
    console.error("Firestore update error:", e);
    handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
  });
  
  return updatedUser;
};

export const deleteLocalUser = (userId: string): boolean => {
  const users = getLocalUsers();
  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  
  // Async firestore delete
  deleteDoc(doc(db, "users", userId)).catch(e => {
    console.error("Firestore delete error:", e);
    handleFirestoreError(e, OperationType.DELETE, `users/${userId}`);
  });
  
  return true;
};

// Start real-time Firestore synchronization of all users and local caches
export const initFirestoreSync = (
  onCurrentUserUpdate?: (user: UserProfile) => void,
  onAllUsersUpdate?: (users: UserProfile[]) => void,
  onSyncError?: (error: any) => void
) => {
  const usersCol = collection(db, "users");
  
  return onSnapshot(usersCol, async (snapshot) => {
    if (snapshot.empty) {
      // Seed Firestore with default profiles if completely empty, but do NOT block local storage or callback notifications
      console.log("Firestore empty! Seeding default user profiles...");
      const seededList = [DEFAULT_DEMO_PROFILE, DEFAULT_BRUNA_PROFILE];
      
      // Save to local cache immediately so the UI doesn't remain empty
      localStorage.setItem(USERS_KEY, JSON.stringify(seededList));
      if (onAllUsersUpdate) {
        onAllUsersUpdate(seededList);
      }
      
      try {
        await setDoc(doc(db, "users", DEFAULT_DEMO_PROFILE.id), DEFAULT_DEMO_PROFILE);
        await setDoc(doc(db, "users", DEFAULT_BRUNA_PROFILE.id), DEFAULT_BRUNA_PROFILE);
      } catch (e) {
        console.error("Failed to seed default database values on empty Firestore:", e);
        try {
          handleFirestoreError(e, OperationType.CREATE, "users");
        } catch (formattedError: any) {
          if (onSyncError) onSyncError(formattedError);
        }
      }
      return;
    }
    
    let list: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile;
      list.push(data);
    });

    // Auto-remerge locally-created users that aren't on high-cloud database yet
    const localRaw = localStorage.getItem(USERS_KEY);
    if (localRaw) {
      try {
        const localUsers: UserProfile[] = JSON.parse(localRaw);
        const missingFromFirestore = localUsers.filter(lu => lu.id && !list.some(dbu => dbu.id === lu.id));
        if (missingFromFirestore.length > 0) {
          console.log(`Auto-uploading ${missingFromFirestore.length} locally-created users to Firestore...`);
          for (const lu of missingFromFirestore) {
            await setDoc(doc(db, "users", lu.id), lu);
            list.push(lu);
          }
        }
      } catch (err) {
        console.error("Error auto-syncing local users to Firestore:", err);
        try {
          handleFirestoreError(err, OperationType.CREATE, "users");
        } catch (formattedError: any) {
          if (onSyncError) onSyncError(formattedError);
        }
      }
    }
    
    // Check and verify Bruna remains up-to-date in Firestore
    const hasBruna = list.some(u => u.name.toLowerCase() === "bruna" || u.name.toLowerCase() === "bruna65b");
    if (!hasBruna) {
      try {
        await setDoc(doc(db, "users", DEFAULT_BRUNA_PROFILE.id), DEFAULT_BRUNA_PROFILE);
        list.push(DEFAULT_BRUNA_PROFILE);
      } catch (e) {
        console.error("Could not write missing Bruna profile to firestore:", e);
        try {
          handleFirestoreError(e, OperationType.CREATE, `users/${DEFAULT_BRUNA_PROFILE.id}`);
        } catch (formattedError: any) {
          if (onSyncError) onSyncError(formattedError);
        }
      }
    }
    
    // Save synchronized users collection list in localStorage
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
    
    if (onAllUsersUpdate) {
      onAllUsersUpdate(list);
    }
    
    // Check if current user session is present and has any changed credentials
    const savedCurUserRaw = localStorage.getItem("ww_current_user");
    if (savedCurUserRaw) {
      try {
        const curUser: UserProfile = JSON.parse(savedCurUserRaw);
        const matching = list.find(u => u.id === curUser.id);
        if (matching) {
          const changed = 
            matching.budgetPoints !== curUser.budgetPoints || 
            matching.aiCredits !== curUser.aiCredits || 
            matching.approved !== curUser.approved ||
            matching.gender !== curUser.gender ||
            matching.age !== curUser.age ||
            matching.weight !== curUser.weight ||
            matching.height !== curUser.height ||
            matching.activityLevel !== curUser.activityLevel ||
            matching.weightGoal !== curUser.weightGoal ||
            JSON.stringify(matching.trackedFoods || []) !== JSON.stringify(curUser.trackedFoods || []) ||
            JSON.stringify(matching.pointsHistory || []) !== JSON.stringify(curUser.pointsHistory || []);
            
          if (changed) {
            localStorage.setItem("ww_current_user", JSON.stringify(matching));
            if (onCurrentUserUpdate) {
              onCurrentUserUpdate(matching);
            }
          }
        }
      } catch (e) {
        console.error("Error matching cached user structure", e);
      }
    }
  }, (err) => {
    console.error("Firestore onSnapshot error:", err);
    try {
      handleFirestoreError(err, OperationType.LIST, "users");
    } catch (formattedError: any) {
      if (onSyncError) onSyncError(formattedError);
    }
  });
};

