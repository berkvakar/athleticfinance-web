import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = import.meta.env.VITE_COGNITO_REGION;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

const client = new CognitoIdentityProviderClient({ region: region });


export async function signupUser({ firstName, lastName, email, password }) {

  const username = firstName + lastName + Date.now();

  const command = new SignUpCommand({
    ClientId: clientId,
    Username: username,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: `${firstName} ${lastName}` },
      { Name: "custom:PaidPlan", Value: "none" },
    ],
  });

  try {
    const response = await client.send(command);
    return { response, username };
  } catch (err) {
    // Handle specific Cognito errors for duplicate emails
    if (err.name === 'InvalidParameterException' && err.message.includes('email')) {
      throw new Error('This email address is already registered. Please use a different email or try logging in.');
    } else if (err.name === 'AliasExistsException') {
      throw new Error('An account with this email already exists. Please try logging in instead.');
    } else {
      throw new Error(err.message);
    }
  }
}
