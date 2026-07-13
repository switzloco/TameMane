import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC-hSpDKFCfrYIb8jqWphvkXOae5hT27S0",
  authDomain: "tamemane-app-77f.firebaseapp.com",
  projectId: "tamemane-app-77f",
  storageBucket: "tamemane-app-77f.firebasestorage.app",
  messagingSenderId: "420927159808",
  appId: "1:420927159808:web:ae4836414a41d4db5b62e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
