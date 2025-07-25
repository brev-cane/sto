// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCrFs8r7KebDzG5-i-4y8aOWeoN4BcnU2w",
  authDomain: "stadium-takeover-91571.firebaseapp.com",
  projectId: "stadium-takeover-91571",
  storageBucket: "stadium-takeover-91571.firebasestorage.app",
  messagingSenderId: "785465840386",
  appId: "1:785465840386:web:72721c233f91741a64281b"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIRESTORE_DB = getFirestore(FIREBASE_APP);