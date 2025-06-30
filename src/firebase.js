// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZUY5j0GIPAYT6gFIfBYHqPlXrpPOM7-E",
  authDomain: "inventory-demo-da8e6.firebaseapp.com",
  projectId: "inventory-demo-da8e6",
  storageBucket: "inventory-demo-da8e6.firebasestorage.app",
  messagingSenderId: "893048760699",
  appId: "1:893048760699:web:107e8c1838f31eaef675de",
  measurementId: "G-KLFELDCDC3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 