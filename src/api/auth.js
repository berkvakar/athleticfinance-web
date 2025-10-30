import { signUp, confirmSignUp, resendSignUpCode, getCurrentUser, signOut } from 'aws-amplify/auth';

/**
 * Sign up a new user with Cognito
 */
export async function signupUser({ firstName, lastName, email, password }) {
  try {
    const username = firstName + lastName + Date.now();
    
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
          name: `${firstName} ${lastName}`,
          'custom:PaidPlan': 'none',
          'custom:referral': 'false'
        }
      }
    });

    console.log('SignUp result:', { isSignUpComplete, userId, nextStep });
    return { username };
  } catch (error) {
    console.error('SignUp error:', error);
    // Re-throw known errors so caller can map to proper UI
    if (error && error.name) {
      throw error;
    }
    // Fallback with message
    throw new Error(error?.message || 'Signup failed');
  }
}

/**
 * Verify user's email with confirmation code
 */
export async function verifyUser(username, code) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username,
      confirmationCode: code
    });

    console.log('Verification success:', { isSignUpComplete, nextStep });
    return true;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

/**
 * Resend confirmation code to user's email
 */
export async function resendConfirmationCode(username) {
  try {
    await resendSignUpCode({ username });
    console.log('Confirmation code resent successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to resend confirmation code:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get currently authenticated user
 */
export async function getAuthenticatedUser() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch{
    return null;
  }
}

/**
 * Check if user is authenticated (has valid session)
 */
export async function isUserAuthenticated() {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gate: allow entering /join only after explicit CTA click
 */
export function canAccessJoin() {
  return sessionStorage.getItem('allowJoinAccess') === 'true';
}

export function grantJoinAccess() {
  sessionStorage.setItem('allowJoinAccess', 'true');
}

/**
 * Gate: allow entering /plans only after successful verification
 */
export function canAccessPlans() {
  return sessionStorage.getItem('signupComplete') === 'true';
}

export function markSignupComplete() {
  sessionStorage.setItem('signupComplete', 'true');
}

/**
 * Dev utility: completely sign out and clear all client storage
 */
export async function devSignOut() {
  try {
    // Best-effort global sign out from Cognito
    await signOut({ global: true });
  } catch (error) {
    console.warn('Sign out error (ignored for dev):', error);
  } finally {
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}
    try {
      // Expire all cookies at root path
      document.cookie.split(';').forEach((cookie) => {
        const eqIndex = cookie.indexOf('=');
        const name = (eqIndex > -1 ? cookie.slice(0, eqIndex) : cookie).trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    } catch {}
  }
  return true;
}

