import { signUp, confirmSignUp, resendSignUpCode, getCurrentUser, signOut, signIn } from 'aws-amplify/auth';

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
 * Check if an email already exists and if it's a partner
 * This uses Cognito's ListUsers API via a backend endpoint
 * Note: Frontend cannot directly check Cognito, so this will need a Lambda/API
 */
export async function checkEmailExists(email) {
  try {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      return { exists: false, isPartner: false };
    }
    
    const data = await response.json();
    return {
      exists: data.exists || false,
      isPartner: data.isPartner || false
    };
  } catch (error) {
    console.error('Failed to check email:', error);
    return { exists: false, isPartner: false };
  }
}

/**
 * Check partner status for an email address
 * Calls Lambda function to check if user exists and their partner status
 * Returns: exists, isPartner, partnerStatus (true/false/pending/null)
 * Uses the same API pattern as checkEmailExists
 * 
 * Note: If API Gateway endpoint is not set up, this will return a fallback
 * that allows signup to proceed (PreSignUp trigger will catch duplicates)
 */
export async function checkPartnerStatus(email) {
  try {
    const response = await fetch('/api/partners/check-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      // If endpoint doesn't exist (404) or server error, return fallback
      // PreSignUp trigger will handle duplicate emails
      if (response.status === 404) {
        console.warn('Partner status API endpoint not found. Proceeding with signup.');
        return { 
          exists: false, 
          isPartner: false, 
          partnerStatus: null,
          apiUnavailable: true // Flag to indicate we should proceed
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to check partner status:', errorData);
      return { 
        exists: false, 
        isPartner: false, 
        partnerStatus: null,
        error: errorData.error || 'Failed to check partner status',
        apiUnavailable: false
      };
    }
    
    const data = await response.json();
    return {
      exists: data.exists || false,
      isPartner: data.isPartner || false,
      partnerStatus: data.partnerStatus || null,
      userId: data.userId || null,
      emailVerified: data.emailVerified || false,
      apiUnavailable: false
    };
  } catch (error) {
    // Network error or CORS issue - likely API Gateway not set up
    // Return fallback so signup can proceed
    console.warn('Partner status check failed (endpoint may not be configured):', error.message);
    return { 
      exists: false, 
      isPartner: false, 
      partnerStatus: null,
      error: null, // No error - just unavailable
      apiUnavailable: true // Flag that API is not available
    };
  }
}

/**
 * Sign up a new partner with Cognito
 * Sets partner status as 'pending' until admin approves
 * Sends notification to admin
 */
export async function signupPartner({ firstName, lastName, email, password }) {
  try {
    const username = firstName + lastName + Date.now();
    
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
          name: `${firstName} ${lastName}`,
          'custom:IsPartner': 'pending',
          'custom:PartnerStatus': 'pending',
          'custom:PaidPlan': 'none',
          'custom:referral': 'false'
        }
      }
    });

    try {
      await fetch('/api/partners/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: `${firstName} ${lastName}`,
          userId,
          username
        })
      });
    } catch (notifyError) {
      console.warn('Failed to notify admin (non-critical):', notifyError);
    }

    console.log('Partner SignUp result:', { isSignUpComplete, userId, nextStep });
    return { username };
  } catch (error) {
    console.error('Partner SignUp error:', error);
    if (error && error.name) {
      throw error;
    }
    throw new Error(error?.message || 'Partner signup failed');
  }
}

/**
 * Sign in a partner with email and password
 */
export async function signInPartner(email, password) {
  try {
    // Try to sign in using email as username
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password
    });
    
    if (isSignedIn) {
      return { success: true, isSignedIn: true };
    }
    
    // Handle next steps (like MFA, password change, etc.)
    return { success: true, isSignedIn: false, nextStep };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Convert an existing user to pending partner status
 * Updates their Cognito attributes and notifies admin
 */
export async function convertUserToPendingPartner(email, userId) {
  try {
    // Call backend API to update user status and notify admin
    const response = await fetch('/api/partners/convert-to-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to convert user to pending partner:', errorData);
      return { success: false, error: errorData.error };
    }
    
    const data = await response.json();
    return { success: true, ...data };
  } catch (error) {
    console.error('Failed to convert user to pending partner:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign up a new partner with email and password only (for simplified sign-in flow)
 * Sets partner status as 'pending' until admin approves
 */
export async function signupPartnerSimple({ email, password }) {
  try {
    // Use email prefix as username (before @)
    const emailPrefix = email.split('@')[0];
    const username = emailPrefix + Date.now();
    
    // Use email prefix as display name (or just email)
    const displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
          name: displayName,
          'custom:IsPartner': 'pending',
          'custom:PartnerStatus': 'pending',
          'custom:PaidPlan': 'none',
          'custom:referral': 'false'
        }
      }
    });

    try {
      await fetch('/api/partners/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: displayName,
          userId,
          username
        })
      });
    } catch (notifyError) {
      console.warn('Failed to notify admin (non-critical):', notifyError);
    }

    console.log('Partner SignUp result:', { isSignUpComplete, userId, nextStep });
    return { username };
  } catch (error) {
    console.error('Partner SignUp error:', error);
    if (error && error.name) {
      throw error;
    }
    throw new Error(error?.message || 'Partner signup failed');
  }
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

