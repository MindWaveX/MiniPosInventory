// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "KEY",
  authDomain: "DOMAIN",
  projectId: "ID",
  storageBucket: "STORAGE_BUCKET",
  messagingSenderId: "ID",
  appId: "ID",
  measurementId: "ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 