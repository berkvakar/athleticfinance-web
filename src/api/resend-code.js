import {
  CognitoIdentityProviderClient,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = import.meta.env.VITE_COGNITO_REGION;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

const client = new CognitoIdentityProviderClient({ region });

/**
 * Resends the confirmation code to the user's email
 * @param {string} username - The username to resend code for
 */
export async function resendConfirmationCode(username) {
  const command = new ResendConfirmationCodeCommand({
    ClientId: clientId,
    Username: username,
  });

  try {
    const response = await client.send(command);
    console.log("Confirmation code resent successfully");
    return { success: true, response };
  } catch (err) {
    console.log("Failed to resend confirmation code:", err);
    return { success: false, error: err.message };
  }
}
