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

// Lambda ARN for partner status check function
// Stored here for reference - direct invocation from browser is not implemented
// (would require API Gateway, AWS SDK, or backend service)
export const PARTNER_CHECK_LAMBDA_ARN = import.meta.env.VITE_PARTNER_CHECK_LAMBDA_ARN || '';


export default Amplify;

