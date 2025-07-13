// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDjUi3HmXfy9akjkDJZDvLPEgNQ7SvB7qE",
  authDomain: "stadium-takeover-acc66.firebaseapp.com",
  projectId: "stadium-takeover-acc66",
  storageBucket: "stadium-takeover-acc66.firebasestorage.app",
  messagingSenderId: "317906654011",
  appId: "1:317906654011:web:0eb15d3026a161fba45d1e",
  measurementId: "G-EJVW3FT9DY"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIRESTORE_DB = getFirestore(FIREBASE_APP);