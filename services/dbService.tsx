import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Firestore,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { FIRESTORE_DB as db } from "@/FirebaseConfig";

class FirestoreCollection<T extends DocumentData = DocumentData> {
  private db: Firestore;
  private collectionPath: string;

  constructor(db: Firestore, collectionPath: string) {
    this.db = db;
    this.collectionPath = collectionPath;
  }

  async getAll(): Promise<(T & { id: string })[]> {
    const colRef = collection(this.db, this.collectionPath);
    const snapshot: QuerySnapshot = await getDocs(colRef);
    return snapshot.docs.map(
      (docSnap) =>
        ({
          id: docSnap.id,
          ...docSnap.data(),
        } as T & { id: string })
    );
  }

  async getById(id: string): Promise<(T & { id: string }) | null> {
    const docRef = doc(this.db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as T & { id: string })
      : null;
  }

  async add(data: T): Promise<string> {
    const colRef = collection(this.db, this.collectionPath);
    const docRef = await addDoc(colRef, data);
    return docRef.id;
  }

  async set(id: string, data: T): Promise<void> {
    const docRef = doc(this.db, this.collectionPath, id);
    await setDoc(docRef, data);
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(this.db, this.collectionPath, id);
    await updateDoc(docRef, data);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, this.collectionPath, id);
    await deleteDoc(docRef);
  }
}

class FirestoreService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  collection<T extends DocumentData = DocumentData>(
    collectionPath: string
  ): FirestoreCollection<T> {
    return new FirestoreCollection<T>(this.db, collectionPath);
  }
}


export const dbService = new FirestoreService(db);
