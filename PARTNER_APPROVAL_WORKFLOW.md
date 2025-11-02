# Partner Approval Workflow Implementation

## Overview

Partners now go through an approval process:
1. User applies → Account created with `custom:IsPartner: 'pending'`
2. Admin gets notified
3. Admin approves → Status changed to `custom:IsPartner: 'true'`
4. Partner can then access dashboard and generate referral links

---

## Cognito Attributes

### Partner Status Values

- `'pending'` - Application submitted, waiting for admin approval
- `'true'` - Partner approved and active
- `'false'` - Not a partner (regular user)

### Attributes Set on Application

```javascript
{
  'custom:IsPartner': 'pending',
  'custom:PartnerStatus': 'pending',
  'custom:PaidPlan': 'none',
  'custom:referral': 'false'
}
```

---

## Email Checking Logic

When a user applies for partnership:

1. **Check if email exists:**
   - Call `/api/auth/check-email` endpoint
   - Returns: `{ exists: boolean, isPartner: boolean }`

2. **If email exists AND is partner:**
   - Show error: "You're already an AF Partner. Please sign in instead."
   - Block application (don't allow duplicate partner accounts)

3. **If email exists but NOT a partner:**
   - Allow application (they can be both a user and partner)
   - Account will be created or existing account will get partner attributes

4. **If email doesn't exist:**
   - Proceed with normal signup

---

## Admin Notification System

### When Partner Applies

1. Frontend calls `/api/partners/notify-admin` after successful signup
2. Lambda function receives:
   ```javascript
   {
     email: "partner@example.com",
     name: "John Doe",
     userId: "user-123",
     username: "john1234567890"
   }
   ```

3. Lambda sends notification via:
   - **Option 1:** AWS SNS (Simple Notification Service) → Email
   - **Option 2:** AWS SES (Simple Email Service) → Direct email
   - **Option 3:** Webhook to admin dashboard

4. Email should include:
   - Partner name and email
   - Application date/time
   - Link to approve/reject

---

## Lambda Function: NotifyAdmin

**Trigger:** API Gateway endpoint `/api/partners/notify-admin`

**Purpose:** Send notification to admin when partner applies

**Implementation:**

```javascript
// Lambda function structure
exports.handler = async (event) => {
  const { email, name, userId, username } = JSON.parse(event.body);
  
  // Get admin email from environment variable
  const adminEmail = process.env.ADMIN_EMAIL;
  
  // Send email via SES
  const ses = new AWS.SES();
  await ses.sendEmail({
    Source: 'noreply@athleticfinance.com',
    Destination: { ToAddresses: [adminEmail] },
    Message: {
      Subject: { Data: 'New Partnership Application' },
      Body: {
        Html: {
          Data: `
            <h2>New Partnership Application</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Application Date:</strong> ${new Date().toISOString()}</p>
            <p>
              <a href="https://admin.yoursite.com/approve-partner?userId=${userId}">
                Approve Partner
              </a>
            </p>
          `
        }
      }
    }
  }).promise();
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
```

---

## Lambda Function: CheckEmail

**Trigger:** API Gateway endpoint `/api/auth/check-email`

**Purpose:** Check if email exists and if it's a partner

**Implementation:**

```javascript
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);
  
  try {
    // Search for user by email
    const result = await cognito.listUsers({
      UserPoolId: process.env.USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1
    }).promise();
    
    if (result.Users.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ exists: false, isPartner: false })
      };
    }
    
    const user = result.Users[0];
    const isPartnerAttr = user.Attributes.find(a => a.Name === 'custom:IsPartner');
    const isPartner = isPartnerAttr && (isPartnerAttr.Value === 'true' || isPartnerAttr.Value === 'pending');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        exists: true, 
        isPartner: !!isPartner 
      })
    };
  } catch (error) {
    console.error('Error checking email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ exists: false, isPartner: false })
    };
  }
};
```

---

## Lambda Function: ApprovePartner

**Trigger:** Admin dashboard or API Gateway `/api/admin/approve-partner`

**Purpose:** Change partner status from 'pending' to 'true'

**Implementation:**

```javascript
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  const { userId } = JSON.parse(event.body);
  
  try {
    // Get user to find username
    const userResult = await cognito.adminGetUser({
      UserPoolId: process.env.USER_POOL_ID,
      Username: userId
    }).promise();
    
    // Update partner status
    await cognito.adminUpdateUserAttributes({
      UserPoolId: process.env.USER_POOL_ID,
      Username: userId,
      UserAttributes: [
        { Name: 'custom:IsPartner', Value: 'true' },
        { Name: 'custom:PartnerStatus', Value: 'approved' }
      ]
    }).promise();
    
    // Optional: Send approval email to partner
    // ...
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error approving partner:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
```

---

## Frontend Changes

### PartnershipApplication.jsx

- Added `checkEmailExists()` call before signup
- Checks if email exists and is partner
- Shows appropriate error message if already a partner
- Allows application if email exists but not a partner

### Error Messages

- **Email exists + is partner:** "You're already an AF Partner. Please sign in instead."
- **Email exists + not partner:** "An account with this email already exists. Please try logging in instead." (but still allows application)
- **Email doesn't exist:** Proceeds normally

---

## API Endpoints Needed

### 1. POST `/api/auth/check-email`
- Input: `{ email: string }`
- Output: `{ exists: boolean, isPartner: boolean }`
- Auth: Public (or rate limited)

### 2. POST `/api/partners/notify-admin`
- Input: `{ email, name, userId, username }`
- Output: `{ success: boolean }`
- Auth: Internal (or API key)

### 3. POST `/api/admin/approve-partner`
- Input: `{ userId: string }`
- Output: `{ success: boolean }`
- Auth: Admin only (Cognito admin role)

---

## Partner Dashboard Access Control

Update dashboard route to check:
- User must be authenticated
- User must have `custom:IsPartner: 'true'` (not 'pending')
- If status is 'pending', show "Application pending approval" message

---

## Next Steps

1. ✅ Frontend: Email checking on application
2. ⏳ Lambda: Create `CheckEmail` function
3. ⏳ Lambda: Create `NotifyAdmin` function
4. ⏳ Lambda: Create `ApprovePartner` function
5. ⏳ API Gateway: Set up endpoints
6. ⏳ Admin Dashboard: Build approval interface
7. ⏳ Email Service: Configure SES or SNS

---

## Testing

1. Apply with new email → Should create account with 'pending' status
2. Apply with existing partner email → Should show "already a partner" error
3. Apply with existing user email (not partner) → Should allow application
4. Check admin notification → Should receive email
5. Approve partner → Status should change to 'true'
6. Try dashboard access → Should only work if status is 'true'

