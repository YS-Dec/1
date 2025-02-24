import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIJnUlvbw1rklmwIru3rxvWav159u4qQ4",
  authDomain: "magic-broom-bcb2e.firebaseapp.com",
  projectId: "magic-broom-bcb2e",
  storageBucket: "magic-broom-bcb2e.appspot.com", // ✅ Fix: Corrected storage bucket URL
  messagingSenderId: "261940652636",
  appId: "1:261940652636:web:99ee0c4b0b4ac23b94d499",
  measurementId: "G-P2MNQWYKVW"
};

// ✅ Ensure Firebase is initialized only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ✅ Fix: Initialize Firebase Auth correctly
let auth;
if (getApps().length === 0) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  auth = getAuth(app);
}

// ✅ Initialize Firestore & Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;