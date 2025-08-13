import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { dbService } from "@/services/dbService";
import { FIREBASE_AUTH } from "@/FirebaseConfig";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
interface AppUser {
  id: string;
  name: string;
  email: string;
  pushToken: string;
  role?:"admin" | null;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userDoc: AppUser | null;
  loading: boolean;
  pushToken?: string | null;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  pushToken: null,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pushToken = useRef<null | string>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        pushToken.current = token;
      }
    });
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const userData = await dbService
            .collection<AppUser>("users")
            .getById(user.uid);
          if (pushToken) {
            await dbService
              .collection<AppUser>("users")
              .update(user.uid, { pushToken: pushToken.current as string });
            console.log("Push token updated");
          }

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
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading, pushToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("myNotificationChannel", {
      name: "A channel is needed for the permissions prompt to appear",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS projectId is used here.
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}
