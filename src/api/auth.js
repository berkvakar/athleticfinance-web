import { signUp, confirmSignUp, resendSignUpCode, getCurrentUser } from 'aws-amplify/auth';

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
          'custom:PaidPlan': 'none'
        }
      }
    });

    console.log('SignUp result:', { isSignUpComplete, userId, nextStep });
    return { username };
  } catch (error) {
    console.error('SignUp error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'UsernameExistsException' || error.message.includes('email')) {
      throw new Error('Email already exists');
    }
    throw new Error(error.message);
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
  } catch (error) {
    return null;
  }
}

