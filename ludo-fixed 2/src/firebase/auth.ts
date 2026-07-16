/**
 * Firebase Authentication service
 * Handles Google Sign-In, Anonymous (guest) sign-in,
 * guest → Google upgrade, and auth state changes.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth } from './config';
import { createOrUpdateUserProfile } from './db';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Google Sign-In ──────────────────────────────────────────────
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Create or update Firestore profile
    await createOrUpdateUserProfile(result.user, false);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error.code);
    throw error;
  }
};

// ── Anonymous (Guest) Sign-In ───────────────────────────────────
export const signInAsGuest = async (): Promise<User> => {
  try {
    const result = await signInAnonymously(auth);
    await createOrUpdateUserProfile(result.user, true);
    return result.user;
  } catch (error: any) {
    console.error('Guest sign-in error:', error.code);
    throw error;
  }
};

// ── Guest → Google Upgrade (no data loss) ──────────────────────
// Links the anonymous account to Google — same UID is preserved
// All Firestore data under /users/{uid} stays intact
export const upgradeGuestToGoogle = async (): Promise<User> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No current user to upgrade');

  try {
    const result = await linkWithPopup(currentUser, googleProvider);
    // Update profile to mark as non-guest
    await createOrUpdateUserProfile(result.user, false);
    return result.user;
  } catch (error: any) {
    // If account already exists with Google — sign in normally
    if (error.code === 'auth/credential-already-in-use') {
      const result = await signInWithPopup(auth, googleProvider);
      await createOrUpdateUserProfile(result.user, false);
      return result.user;
    }
    console.error('Upgrade error:', error.code);
    throw error;
  }
};

// ── Sign Out ────────────────────────────────────────────────────
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
  // Clear local auth cache
  localStorage.removeItem('ludo_is_logged_in');
  localStorage.removeItem('ludo_is_guest');
  localStorage.removeItem('ludo_player_name');
};

// ── Auth State Listener ─────────────────────────────────────────
export const onAuthChange = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// ── Current User ────────────────────────────────────────────────
export const getCurrentUser = (): User | null => auth.currentUser;
