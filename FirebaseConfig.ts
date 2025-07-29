import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCrFs8r7KebDzG5-i-4y8aOWeoN4BcnU2w",
  authDomain: "stadium-takeover-91571.firebaseapp.com",
  projectId: "stadium-takeover-91571",
  storageBucket: "stadium-takeover-91571.firebasestorage.app",
  messagingSenderId: "785465840386",
  appId: "1:785465840386:web:72721c233f91741a64281b",
};

export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const FIRESTORE_DB = getFirestore(FIREBASE_APP);
