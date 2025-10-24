import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_COGNITO_REGION,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-2_OTDnzTQXY',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    }
  }
});

export default Amplify;

