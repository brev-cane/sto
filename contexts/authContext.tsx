import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { dbService } from "@/services/dbService";
import { FIREBASE_AUTH } from "@/FirebaseConfig";

interface AppUser {
  id: string;
  name: string;
  email: string;
  pushToken: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userDoc: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const userData = await dbService
            .collection<AppUser>("users")
            .getById(user.uid);
          setUserDoc(userData ?? null);
        } catch (error) {
          console.error("Failed to fetch user document:", error);
          setUserDoc(null);
        }
      } else {
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
