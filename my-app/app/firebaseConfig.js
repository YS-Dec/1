// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {getAuth} from "firebase/auth";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
