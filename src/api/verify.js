import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";


const region = import.meta.env.VITE_COGNITO_REGION;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

const client = new CognitoIdentityProviderClient({ region });

/**
 * Verifies a user's sign-up with the confirmation code they received.
 * @param {string} email - The user's email (used as their username)
 * @param {string} code - The verification code from email
 */
export async function verifyUser(username, code) {
  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: username,
    ConfirmationCode: code,
  });

  try {
    const response = await client.send(command);
    console.log(response);
    console.log("Verification success");
    return true;
  } catch (err) {
    console.log("Verification failed:", err);
    return false;
  }
}
