import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // ✅ Use getAuth() instead of initializeAuth()
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIJnUlvbw1rklmwIru3rxvWav159u4qQ4",
  authDomain: "magic-broom-bcb2e.firebaseapp.com",
  projectId: "magic-broom-bcb2e",
  storageBucket: "magic-broom-bcb2e.firebasestorage.app",
  messagingSenderId: "261940652636",
  appId: "1:261940652636:web:99ee0c4b0b4ac23b94d499",
  measurementId: "G-P2MNQWYKVW"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ✅ Fix Auth Persistence
const auth = getAuth(app); // ✅ Correct way to get Firebase Auth instance

// ✅ Initialize Firestore
const db = getFirestore(app);

const storage = getStorage(app);


export { auth, db, storage };
export default app;