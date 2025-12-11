import * as firebaseApp from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// These variables will be injected by Vite from GitHub Secrets/Environment variables
// We use a safe check to see if they exist before initializing
const apiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY;

let db: Firestore | null = null;

if (apiKey && apiKey !== 'undefined') {
  try {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
    };

    // Initialize Firebase
    // Using namespace import to avoid "Module has no exported member initializeApp" error
    const app = firebaseApp.initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.warn("Error initializing Firebase:", error);
    // db remains null
  }
} else {
  console.warn("Firebase Configuration missing. App will run in Demo Mode with local data.");
}

export { db };