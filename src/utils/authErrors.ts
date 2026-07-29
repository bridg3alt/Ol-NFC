/**
 * Turns a Firebase Auth error into something actionable.
 *
 * Setup faults (a provider left disabled, an unauthorised domain) and genuine
 * bad credentials both surface as a rejected sign-in. Reporting every one of
 * them as "wrong password" sends people hunting for a typo that isn't there,
 * so configuration problems are named as configuration problems.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';

    case 'auth/invalid-email':
      return 'That email address is not valid.';

    case 'auth/user-disabled':
      return 'This account has been disabled.';

    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';

    case 'auth/email-already-in-use':
      return 'An account already exists with that email. Try signing in.';

    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';

    // Setup problems — the fix is in the Firebase console, not the form.
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Turn it on in Firebase console → Authentication → Sign-in method.';

    case 'auth/unauthorized-domain':
      return 'This domain is not authorised. Add it in Firebase console → Authentication → Settings → Authorized domains.';

    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not set up for this project. Enable it in the Firebase console.';

    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'The Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in your .env file.';

    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your internet connection.';

    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups and try again.';

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';

    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists using a different sign-in method.';
  }

  // Unmapped codes still beat a generic message when debugging setup.
  if (code) return `${fallback} (${code})`;
  return fallback;
}
