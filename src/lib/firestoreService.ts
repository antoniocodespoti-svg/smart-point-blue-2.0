import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  getDocFromServer
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { UserProfile, FoodTrackItem, PointsRow } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore on boot
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

/**
 * Seed initial users if Firestore user list is empty
 */
export async function seedFirestoreIfNeeded(appUsers: UserProfile[]) {
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    if (snapshot.empty) {
      console.log("Seeding Firestore with initial profiles...");
      for (const u of appUsers) {
        await setDoc(doc(db, "users", u.id), u);
      }
    }
  } catch (err) {
    console.error("Failed to seed firestore:", err);
  }
}

/**
 * Subscribes to real-time changes of all users
 */
export function subscribeUsers(onUpdate: (users: UserProfile[]) => void, onError?: (err: any) => void) {
  const usersCol = collection(db, "users");
  return onSnapshot(usersCol, (snapshot) => {
    const list: UserProfile[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as UserProfile);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "users");
    if (onError) onError(error);
  });
}

/**
 * Register or save a user profile
 */
export async function createUserInFirestore(user: UserProfile) {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, "users", user.id), user);
    return user;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

/**
 * Update user parameters (credits, profile details, approved state)
 */
export async function updateUserInFirestore(userId: string, updatedData: Partial<UserProfile>) {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, updatedData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

/**
 * Delete a user profile
 */
export async function deleteUserFromFirestore(userId: string) {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * Subscribes to the tracked foods list of a specific user
 */
export function subscribeTrackedFoods(userId: string, onUpdate: (foods: FoodTrackItem[]) => void) {
  const path = `users/${userId}/tracked_foods`;
  const foodsCol = collection(db, "users", userId, "tracked_foods");
  return onSnapshot(foodsCol, (snapshot) => {
    const list: FoodTrackItem[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as FoodTrackItem);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

/**
 * Add or update food daily log
 */
export async function saveTrackedFoodInFirestore(userId: string, item: FoodTrackItem) {
  const path = `users/${userId}/tracked_foods/${item.id}`;
  try {
    await setDoc(doc(db, "users", userId, "tracked_foods", item.id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * Remove tracked food item
 */
export async function deleteTrackedFoodFromFirestore(userId: string, itemId: string) {
  const path = `users/${userId}/tracked_foods/${itemId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "tracked_foods", itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * Clear all tracked foods for a user
 */
export async function clearAllTrackedFoodsInFirestore(userId: string, items: FoodTrackItem[]) {
  const path = `users/${userId}/tracked_foods`;
  try {
    for (const item of items) {
      await deleteDoc(doc(db, "users", userId, "tracked_foods", item.id));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * Subscribes to points history for a user
 */
export function subscribePointsHistory(userId: string, onUpdate: (history: PointsRow[]) => void) {
  const path = `users/${userId}/points_history`;
  const historyCol = collection(db, "users", userId, "points_history");
  return onSnapshot(historyCol, (snapshot) => {
    const list: PointsRow[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as PointsRow);
    });
    // Sort chronologically by date if needed, or by id
    const sorted = list.sort((a,b) => a.id.localeCompare(b.id));
    onUpdate(sorted);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

/**
 * Add points recharge row
 */
export async function addPointsHistoryToFirestore(userId: string, row: PointsRow) {
  const path = `users/${userId}/points_history/${row.id}`;
  try {
    await setDoc(doc(db, "users", userId, "points_history", row.id), row);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * Clear all points history rows for a user
 */
export async function clearAllPointsHistoryInFirestore(userId: string, rows: PointsRow[]) {
  const path = `users/${userId}/points_history`;
  try {
    for (const r of rows) {
      await deleteDoc(doc(db, "users", userId, "points_history", r.id));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}
