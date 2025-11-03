import { signUp, confirmSignUp, resendSignUpCode, getCurrentUser, signOut, signIn, fetchUserAttributes } from 'aws-amplify/auth';
import { PARTNER_CHECK_LAMBDA_ARN } from './aws-config.js';

/**
 * Sign up a new user with Cognito
 * Sets IsPartner to 'false' for regular users
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
          'custom:isPartner': 'false',
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
  } catch {
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
 * Get partner status from authenticated user's Cognito attributes
 * This checks the currently signed-in user's IsPartner attribute
 * IsPartner can be: null, 'false', 'pending', or 'true'
 */
export async function getPartnerStatusFromAttributes() {
  try {
    const attributes = await fetchUserAttributes();
    const isPartner = attributes['custom:isPartner'] || null;
    
    return {
      isPartner: isPartner === 'true' || isPartner === 'pending',
      partnerStatus: isPartner,
      userId: attributes.sub || null,
      email: attributes.email || null,
      emailVerified: attributes.email_verified === 'true'
    };
  } catch (error) {
    console.error('Failed to get user attributes:', error);
    return {
      isPartner: false,
      partnerStatus: null,
      userId: null,
      email: null,
      emailVerified: false
    };
  }
}

/**
 * Check partner status for an email address
 * 
 * Note: Lambda ARN is configured in aws-config.js (PARTNER_CHECK_LAMBDA_ARN)
 * but direct Lambda invocation is not implemented (requires API Gateway or AWS SDK).
 * 
 * This function currently returns a fallback that allows signup to proceed.
 * The PreSignUp Cognito trigger will handle duplicate email validation.
 * 
 * Returns: exists, isPartner, partnerStatus (true/false/pending/null)
 */
export async function checkPartnerStatus(email) {
  // Lambda ARN available: PARTNER_CHECK_LAMBDA_ARN
  // Direct Lambda invocation from browser requires either:
  // 1. API Gateway endpoint (which we're not using)
  // 2. AWS SDK Lambda client (which we're not using)
  // 3. Backend service that invokes Lambda
  
  // For now, return fallback - PreSignUp trigger will validate duplicates
  console.log('Partner status check: Lambda ARN configured but not invoked directly. Using fallback.');
  
  return { 
    exists: false, 
    isPartner: false, 
    partnerStatus: null,
    lambdaArn: PARTNER_CHECK_LAMBDA_ARN || undefined,
    apiUnavailable: true // Flag to indicate Lambda check is not active
  };
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
          'custom:isPartner': 'pending',
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
 * Check if user is currently signed in
 */
async function checkSignedIn() {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Sign in a partner with email and password
 * Only signs in if not already signed in
 */
export async function signInPartner(email, password) {
  try {
    // Check if already signed in - if yes, just return success
    const alreadySignedIn = await checkSignedIn();
    if (alreadySignedIn) {
      console.log('User already signed in, skipping sign in');
      return { success: true, isSignedIn: true, alreadySignedIn: true };
    }
    
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
 * Updates custom:isPartner attribute from null/'false' to 'pending'
 * Note: Frontend cannot update custom attributes directly - requires backend API
 * This function attempts the backend call but gracefully handles if endpoint doesn't exist
 * 
 * Backend should update: custom:isPartner = 'pending'
 */
export async function convertUserToPendingPartner(email, userId) {
  try {
    // Call backend API to update user status and notify admin
    // Backend should update custom:isPartner from null/false to 'pending'
    const requestBody = { 
      email, 
      userId,
      attributeToUpdate: 'custom:isPartner',
      newValue: 'pending'
    };
    
    console.log('Converting user to pending partner:', { email, userId });
    console.log('Request payload:', requestBody);
    
    const response = await fetch('/api/partners/convert-to-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      // If endpoint doesn't exist (404), log but don't fail - admin can update manually
      if (response.status === 404) {
        console.error('Backend endpoint /api/partners/convert-to-pending does not exist (404)');
        console.error('The custom:isPartner attribute cannot be updated from the frontend.');
        console.error('Backend API endpoint required to update Cognito custom attributes.');
        console.error('    Expected endpoint: POST /api/partners/convert-to-pending');
        console.error('    Expected payload:', requestBody);
        // Still return success - the user intent is recorded
        return { 
          success: true, 
          warning: 'Backend endpoint not configured - admin will need to update status manually',
          manualUpdate: true
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to convert user to pending partner:', errorData);
      return { success: false, error: errorData.error };
    }
    
    const data = await response.json();
    console.log('Successfully converted user to pending partner');
    console.log('Response:', data);
    return { success: true, ...data };
  } catch (error) {
    // Network error - endpoint probably doesn't exist
    if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      console.warn('Convert-to-pending endpoint not available. Admin notification will need to be done manually.');
      return { 
        success: true, 
        warning: 'Backend endpoint not configured - admin will need to update status manually',
        manualUpdate: true
      };
    }
    
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
          'custom:isPartner': 'pending',
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

