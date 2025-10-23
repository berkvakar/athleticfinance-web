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
    return response; 
  } catch (err) {
    throw new Error(err.message);
  }
}
