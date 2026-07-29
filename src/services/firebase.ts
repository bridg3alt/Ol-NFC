// =====================================================
// Olvia - Firebase Authentication Service
// Handles user authentication with Firebase
// =====================================================

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { User, UserRole, UserSettings } from '@/types';

// Firebase configuration - replace with your own config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abc123',
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Initialize with error handling for SSR
export function initializeFirebase() {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    }
    return { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return null;
  }
}

function defaultSettings(): UserSettings {
  return {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notificationsEnabled: true,
    accessibilityMode: false,
    fontSize: 'medium',
    highContrast: false,
  };
}

/** Builds a profile from the auth session alone, for when Firestore has none. */
function defaultProfileFor(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || `${firebaseUser.uid}@phone.local`,
    displayName:
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    role: 'caregiver',
    photoURL: firebaseUser.photoURL || undefined,
    phoneNumber: firebaseUser.phoneNumber || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: defaultSettings(),
  };
}

/**
 * Firestore hands back Timestamps and may predate fields added later, so the
 * stored document is normalised rather than cast straight to User.
 */
function mapUserDoc(uid: string, data: DocumentData): User {
  const asDate = (value: unknown): Date =>
    value instanceof Timestamp ? value.toDate() : new Date();

  return {
    id: uid,
    email: data.email ?? '',
    displayName: data.displayName ?? 'User',
    role: data.role === 'user' ? 'user' : 'caregiver',
    photoURL: data.photoURL ?? undefined,
    phoneNumber: data.phoneNumber ?? undefined,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    settings: { ...defaultSettings(), ...(data.settings ?? {}) },
    careRecipientIds: data.careRecipientIds ?? undefined,
    caregiverId: data.caregiverId ?? undefined,
  };
}

// Auth Service Class
class FirebaseAuthService {
  private auth: Auth | null = null;
  private db: Firestore | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const firebase = initializeFirebase();
      if (firebase) {
        this.auth = firebase.auth ?? null;
        this.db = firebase.db ?? null;
      }
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string, displayName: string, role: UserRole): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, { displayName });

    // The account now exists in Firebase Auth. If the profile write fails past
    // this point the signup must not report failure — the email is already
    // taken, so retrying only yields auth/email-already-in-use and locks the
    // person out of an account they just created.
    return this.resolveProfile(firebaseUser, { displayName, role });
  }

  /**
   * Resolves the Firestore profile for an already-authenticated user,
   * creating one if absent.
   *
   * Authentication has succeeded by the time this runs, so a failure to read
   * or write the profile must not be rethrown — doing so would throw away a
   * valid session over a rules problem and leave the user unable to sign in
   * at all. The session stands; the profile degrades to auth-derived defaults.
   */
  private async resolveProfile(
    firebaseUser: FirebaseUser,
    overrides: Partial<User> = {}
  ): Promise<User> {
    const fallback = { ...defaultProfileFor(firebaseUser), ...overrides };
    if (!this.db) return fallback;

    try {
      const userDoc = await getDoc(doc(this.db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        return mapUserDoc(firebaseUser.uid, userDoc.data());
      }

      await setDoc(doc(this.db, 'users', firebaseUser.uid), {
        ...fallback,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return fallback;
    } catch (error) {
      console.error(
        'Signed in, but the user profile could not be read or created. ' +
          'Deploy your Firestore rules: ' +
          'firebase deploy --only firestore:rules,firestore:indexes,storage',
        error
      );
      return fallback;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.resolveProfile(userCredential.user);
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const userCredential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    return this.resolveProfile(userCredential.user);
  }

  // Sign in with GitHub
  async signInWithGithub(): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const userCredential = await signInWithPopup(this.auth, new GithubAuthProvider());
    return this.resolveProfile(userCredential.user);
  }

  // Send verification code to phone number
  async sendVerificationCode(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<string> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, recaptchaVerifier);
    return confirmationResult.verificationId;
  }

  // Verify code and sign in
  async verifyCode(verificationId: string, code: string): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const { PhoneAuthProvider, signInWithCredential } = await import('firebase/auth');
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await signInWithCredential(this.auth, credential);

    return this.resolveProfile(userCredential.user, { displayName: 'Phone User' });
  }

  // Sign out
  async signOut(): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    await signOut(this.auth);
  }

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return this.auth?.currentUser || null;
  }

  // Get auth instance for reCAPTCHA
  getAuth(): Auth {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    return this.auth;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!this.auth || !this.db) {
      // Resolve anyway, or callers wait on a listener that will never fire.
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      // Firebase Auth is the source of truth for "is someone signed in". The
      // Firestore profile only enriches it, so a missing or unreadable
      // profile must not present as a signed-out user — that strands a real
      // session behind the login screen.
      try {
        const userDoc = await getDoc(doc(this.db!, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          callback(mapUserDoc(firebaseUser.uid, userDoc.data()));
          return;
        }

        // Signed in with no profile yet: create one so the app has something
        // to read on the next load.
        const profile = defaultProfileFor(firebaseUser);
        await setDoc(doc(this.db!, 'users', firebaseUser.uid), {
          ...profile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        callback(profile);
      } catch (error) {
        console.error(
          'Could not load user profile. Falling back to the auth session — ' +
            'check that Firestore rules are deployed.',
          error
        );
        callback(defaultProfileFor(firebaseUser));
      }
    });
  }

  // Password reset
  async resetPassword(email: string): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    await sendPasswordResetEmail(this.auth, email);
  }

  // Update user profile
  async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    await updateDoc(doc(this.db, 'users', userId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  // Get user by ID
  async getUser(userId: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    const userDoc = await getDoc(doc(this.db, 'users', userId));
    return userDoc.exists() ? mapUserDoc(userId, userDoc.data()) : null;
  }

  // Link caregiver to user (for caregiver accounts)
  async linkCareRecipient(caregiverId: string, careRecipientEmail: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    // Find user by email
    const usersRef = collection(this.db, 'users');
    const q = query(usersRef, where('email', '==', careRecipientEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('No user found with this email');
    }

    const careRecipient = querySnapshot.docs[0].data() as User;

    // Update caregiver's careRecipientIds
    const caregiverDoc = await getDoc(doc(this.db, 'users', caregiverId));
    if (caregiverDoc.exists()) {
      const caregiverData = caregiverDoc.data() as User;
      const currentRecipients = caregiverData.careRecipientIds || [];
      
      if (!currentRecipients.includes(careRecipient.id)) {
        await updateDoc(doc(this.db, 'users', caregiverId), {
          careRecipientIds: [...currentRecipients, careRecipient.id],
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Update user's caregiverId
    await updateDoc(doc(this.db, 'users', careRecipient.id), {
      caregiverId,
      updatedAt: serverTimestamp(),
    });
  }

  // Unlink caregiver from user
  async unlinkCareRecipient(caregiverId: string, careRecipientId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    // Update caregiver's careRecipientIds
    const caregiverDoc = await getDoc(doc(this.db, 'users', caregiverId));
    if (caregiverDoc.exists()) {
      const caregiverData = caregiverDoc.data() as User;
      const currentRecipients = caregiverData.careRecipientIds || [];
      
      await updateDoc(doc(this.db, 'users', caregiverId), {
        careRecipientIds: currentRecipients.filter(id => id !== careRecipientId),
        updatedAt: serverTimestamp(),
      });
    }

    // Clear user's caregiverId
    await updateDoc(doc(this.db, 'users', careRecipientId), {
      caregiverId: null,
      updatedAt: serverTimestamp(),
    });
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();

export default FirebaseAuthService;
