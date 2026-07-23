import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let firebaseApp = null;
let firebaseAuth = null;

function assertFirebaseConfig() {
  if (missingFirebaseKeys.length) {
    throw new Error(`Missing Firebase config: ${missingFirebaseKeys.join(', ')}`);
  }
}

function getFirebaseAuth() {
  if (!firebaseAuth) {
    assertFirebaseConfig();
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
  }

  return firebaseAuth;
}

export async function loginWithGoogleIdToken(idToken) {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const firebaseToken = await userCredential.user.getIdToken();

  return {
    firebaseToken,
    email: userCredential.user.email || '',
    name: userCredential.user.displayName || '',
  };
}

export async function loginWithGooglePopup() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const firebaseToken = await userCredential.user.getIdToken();

  return {
    firebaseToken,
    email: userCredential.user.email || '',
    name: userCredential.user.displayName || '',
  };
}

export async function logoutFirebaseUser() {
  const auth = getFirebaseAuth();
  await signOut(auth).catch(() => {});
}
