// Firebase Configuration for Natomas Sport Association
// Project ID: natomassport

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Pre-authorized Staff & Coach Email Whitelist
export const AUTHORIZED_COACH_EMAILS = [
  'mcollinswork6@gmail.com',
  'admin@natomassportsassociation.org',
  'coaches@natomassportsassociation.org',
  'badhops@natomassportsassociation.org'
];

// Authorization Verification Helper
export async function isAuthorizedStaff(user) {
  if (!user || !user.email) return false;

  const normalizedEmail = user.email.toLowerCase().trim();

  // 1. Direct Whitelist Match
  if (AUTHORIZED_COACH_EMAILS.some(e => e.toLowerCase().trim() === normalizedEmail)) {
    return true;
  }

  // 2. Custom Claims Match
  try {
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims && (idTokenResult.claims.admin === true || idTokenResult.claims.coach === true)) {
      return true;
    }
  } catch (err) {
    console.warn('Could not check token claims:', err);
  }

  // 3. Firestore 'authorized_staff' collection check
  try {
    const staffDocRef = doc(db, 'authorized_staff', normalizedEmail);
    const staffDoc = await getDoc(staffDocRef);
    if (staffDoc.exists() && staffDoc.data().active !== false) {
      return true;
    }
  } catch (err) {
    // If permission denied or doesn't exist, proceed to return false
  }

  return false;
}

export const firebaseConfig = {
  projectId: "natomassport",
  appId: "1:492196966283:web:f8301b45d15dd47130898e",
  storageBucket: "natomassport.firebasestorage.app",
  apiKey: "AIzaSyDn2pEDqOKZFf2mYEcJvAlyr0DCy8px10g",
  authDomain: "natomassport.firebaseapp.com",
  messagingSenderId: "492196966283",
  measurementId: "G-59N27H7QK9"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
};
