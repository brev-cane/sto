import { FIREBASE_AUTH } from "@/FirebaseConfig";
import { dbService } from "@/services/dbService";
import { videoSync } from "@/services/videoSync";
import { AppUser } from "@/types/user";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Toast from "react-native-toast-message";

/**
 * A Firestore read over the JS SDK's streaming transport can stall without ever
 * settling. Racing it against a timer turns "hangs forever" into "fails", which
 * the UI can actually surface and retry.
 */
const USER_DOC_TIMEOUT_MS = 8000;
/**
 * Sign-up and first-time social logins create users/{uid} moments *after* auth
 * resolves, so onAuthStateChanged routinely reads a document that does not
 * exist yet. Re-reading absorbs that race instead of caching the null forever.
 */
const USER_DOC_ATTEMPTS = 3;
const USER_DOC_RETRY_MS = 1200;

/** "idle" = signed out, "error" = gave up; both mean the UI must offer a way out. */
export type UserDocStatus = "idle" | "loading" | "ready" | "error";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Request timed out")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userDoc: AppUser | null;
  userDocStatus: UserDocStatus;
  loading: boolean;
  pushToken: React.RefObject<string | null>;
  expoPushToken: string | null;
  pushTokenSynced: boolean;
  syncingRef: React.RefObject<boolean>;
  setUserDoc: (user: AppUser | null) => void;
  refreshUserDoc: () => Promise<void>;
  registerUserForPushNotifications: () => Promise<void>;
  syncPushTokenWithBackend: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userDoc: null,
  userDocStatus: "idle",
  loading: true,
  pushToken: { current: null },
  expoPushToken: null,
  registerUserForPushNotifications: async () => {},
  setUserDoc: () => {},
  refreshUserDoc: async () => {},
  syncingRef: { current: false },
  pushTokenSynced: false,
  syncPushTokenWithBackend: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDocState] = useState<AppUser | null>(null);
  const [userDocStatus, setUserDocStatus] = useState<UserDocStatus>("idle");
  const [loading, setLoading] = useState(true);
  // Monotonic id so a superseded fetch (sign-out, or a newer refresh) can't
  // land late and overwrite fresher state.
  const userDocRequestRef = useRef(0);
  const pushToken = useRef<null | string>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [pushTokenSynced, setPushTokenSynced] = useState(false);
  const syncingRef = useRef(false);

  /**
   * Callers that write users/{uid} themselves (sign-up, first social login)
   * seed the document here so the UI doesn't wait on another round trip.
   */
  const setUserDoc = useCallback((user: AppUser | null) => {
    userDocRequestRef.current++;
    setUserDocState(user);
    setUserDocStatus(user ? "ready" : "error");
  }, []);

  const fetchUserDoc = useCallback(async (uid: string) => {
    const requestId = ++userDocRequestRef.current;
    setUserDocStatus("loading");

    for (let attempt = 1; attempt <= USER_DOC_ATTEMPTS; attempt++) {
      const isLastAttempt = attempt === USER_DOC_ATTEMPTS;

      try {
        const userData = await withTimeout(
          dbService.collection<AppUser>("users").getById(uid),
          USER_DOC_TIMEOUT_MS,
        );

        // A newer request took over while this one was in flight.
        if (requestId !== userDocRequestRef.current) return;

        if (userData) {
          setUserDocState(userData);
          setUserDocStatus("ready");
          return;
        }
      } catch (error) {
        if (requestId !== userDocRequestRef.current) return;
        console.error("Failed to fetch user document:", error);
      }

      if (isLastAttempt) {
        // Out of retries. Surface it so the UI can offer a retry rather than
        // spinning on a null document forever (App Store Guideline 2.1).
        setUserDocState(null);
        setUserDocStatus("error");
        return;
      }

      await wait(USER_DOC_RETRY_MS);
      if (requestId !== userDocRequestRef.current) return;
    }
  }, []);

  const refreshUserDoc = useCallback(async () => {
    // Read the uid off the SDK rather than state: refreshUserDoc is called from
    // sign-in handlers that run before firebaseUser has re-rendered.
    const uid = FIREBASE_AUTH.currentUser?.uid;
    if (!uid) return;
    await fetchUserDoc(uid);
  }, [fetchUserDoc]);

  const registerUserForPushNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();

      if (token) {
        setExpoPushToken(token);
        pushToken.current = token;
        setExpoPushToken(token);
        Toast.show({
          type: "success",
          text1: "Enabled",
          text2: "Push Notifications has been enabled",
        });
      }
    } catch (error) {
      console.log("Error :", error);
    }
  };
  const syncPushTokenWithBackend = async () => {
    if (syncingRef.current || !firebaseUser || !expoPushToken || !userDoc) {
      return;
    }

    // Already synced
    if (userDoc.pushToken === expoPushToken) {
      setPushTokenSynced(true);
      return;
    }

    try {
      syncingRef.current = true;

      await dbService.collection<AppUser>("users").update(firebaseUser.uid, {
        pushToken: expoPushToken,
      });

      setUserDoc({
        ...userDoc,
        pushToken: expoPushToken,
      });

      setPushTokenSynced(true);
      console.log("✅ Push token synced");
    } catch (error) {
      console.error("❌ Failed to sync push token:", error);
      setPushTokenSynced(false);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    registerUserForPushNotifications();
  }, []);
  useEffect(() => {
    syncPushTokenWithBackend();
  }, [expoPushToken, userDoc, firebaseUser]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setFirebaseUser(user);
      // Auth has resolved. Routing depends only on this; the user document
      // loads separately and must never hold up navigation.
      setLoading(false);

      if (user) {
        videoSync.start();
        void fetchUserDoc(user.uid);
      } else {
        videoSync.stop();
        userDocRequestRef.current++;
        setUserDocState(null);
        setUserDocStatus("idle");
      }
    });

    return unsubscribe;
  }, [fetchUserDoc]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userDoc,
        userDocStatus,
        loading,
        pushToken,
        expoPushToken,
        pushTokenSynced,
        syncingRef,
        registerUserForPushNotifications,
        setUserDoc,
        refreshUserDoc,
        syncPushTokenWithBackend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
