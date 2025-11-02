# Partnership Program - Technical Implementation Plan

## Overview

This document outlines the technical architecture and implementation plan for the Athletic Finance Partnership Program. Partners can generate referral links that track user conversions, with detailed analytics and earnings tracking.

---

## Architecture Decision

**Primary Storage: DynamoDB** (Not Cognito-only)
- Cognito cannot filter/search by custom attributes efficiently
- DynamoDB provides fast, scalable queries for partner dashboards
- Minimal cost (~$2-5/month) with excellent performance
- Supports complex analytics and historical data

**Hybrid Approach:**
- Store basic referral link in Cognito user attributes for quick lookups
- Store detailed referral data in DynamoDB for dashboard analytics
- Use AWS Lambda for processing and API Gateway for endpoints

---

## Database Schema

### DynamoDB Table: `PartnerReferrals`

**Primary Key Structure:**
- Partition Key: `partnerId` (String) - Cognito userId of the partner
- Sort Key: `referralId` (String) - Unique ID: `timestamp-userId`

**Attributes:**
```javascript
{
  partnerId: "user-123",                    // Partition Key
  referralId: "1736934000000-user-456",     // Sort Key
  
  // User Information
  referredUserId: "user-456",               // Cognito userId
  referredUserEmail: "user@example.com",
  
  // Final User Choice (captured at payment time)
  planType: "AFPlus",                       // "AF" or "AFPlus"
  billingCycle: "Monthly",                  // "Monthly" or "Annual"
  
  // Status Tracking
  status: "paid",                           // "clicked", "signed_up", "verified", "paid", "cancelled"
  
  // Timestamps
  clickedAt: "2024-01-15T09:00:00Z",       // When referral link was clicked
  signedUpAt: "2024-01-15T10:00:00Z",     // When user signed up
  verifiedAt: "2024-01-15T10:30:00Z",     // When user verified email
  paidAt: "2024-01-15T11:00:00Z",          // When payment completed
  
  // Financial Information
  paymentAmount: 29.99,                    // Amount user paid
  partnerEarnings: 7.50,                   // Partner commission
  currency: "USD",
  
  // Subscription Status
  subscriptionActive: true,                // Is subscription currently active
  cancelledAt: null,                       // If cancelled, when
  
  // Metadata
  createdAt: "2024-01-15T09:00:00Z",
  lastUpdated: "2024-01-15T11:00:00Z"
}
```

**Global Secondary Index (GSI):**
- Index Name: `referredUserId-index`
- Partition Key: `referredUserId`
- Purpose: Query referrals by referred user (for payment tracking)

---

### DynamoDB Table: `PartnerStats`

**Primary Key:**
- Partition Key: `partnerId` (String)

**Attributes:**
```javascript
{
  partnerId: "user-123",                    // Primary Key
  
  // Counts
  totalClicks: 150,
  totalSignups: 45,
  totalVerified: 42,
  totalPaid: 30,
  activeSubscriptions: 28,
  
  // Plan Breakdown (actual conversions)
  afSignups: 25,
  afPlusSignups: 5,
  afPaid: 18,
  afPlusPaid: 12,
  afMonthlyPaid: 15,
  afAnnualPaid: 3,
  afPlusMonthlyPaid: 10,
  afPlusAnnualPaid: 2,
  
  // Financial
  totalRevenue: 899.70,
  totalEarnings: 150.00,
  pendingEarnings: 50.00,
  
  // Conversion Rates
  clickToSignupRate: 0.30,                  // 45/150 = 30%
  signupToPaymentRate: 0.67,               // 30/45 = 67%
  clickToPaymentRate: 0.20,                // 30/150 = 20%
  
  // Timestamps
  lastReferralAt: "2024-01-15T11:00:00Z",
  lastUpdated: "2024-01-15T11:00:00Z"
}
```

---

## AWS Lambda Functions

### 1. `RecordReferralClick`
**Trigger:** API Gateway endpoint (called from frontend)
**Purpose:** Track when someone clicks a partner referral link

**Input:**
```javascript
{
  partnerId: "user-123",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2024-01-15T09:00:00Z"
}
```

**Actions:**
- Store click event in separate `ReferralEvents` table (optional, for detailed analytics)
- Update `PartnerStats.totalClicks` (+1)

---

### 2. `RecordReferralSignup`
**Trigger:** API Gateway endpoint (called after user signs up)
**Purpose:** Record that a referred user has signed up

**Input:**
```javascript
{
  partnerId: "user-123",
  referredUserId: "user-456",
  referredUserEmail: "user@example.com"
}
```

**Actions:**
- Create record in `PartnerReferrals` table with status: "signed_up"
- Update `PartnerStats.totalSignups` (+1)
- Also update AF/AFPlus signup counts (default to AF)

---

### 3. `RecordReferralPayment`
**Trigger:** Stripe webhook or API Gateway (after payment confirms)
**Purpose:** Update referral record when user pays and capture final plan choice

**Input:**
```javascript
{
  referredUserId: "user-456",
  planType: "AFPlus",                       // What they ACTUALLY chose
  billingCycle: "Monthly",                  // What they ACTUALLY chose
  paymentAmount: 29.99,
  stripePaymentId: "pi_abc123",
  currency: "USD"
}
```

**Actions:**
- Find referral record by `referredUserId` (using GSI)
- Update referral: status = "paid", planType, billingCycle, paidAt, paymentAmount
- Calculate partner earnings based on plan type
- Update `PartnerStats`:
  - Increment appropriate counters (AF vs AFPlus, Monthly vs Annual)
  - Add to totalEarnings
  - Update conversion rates

**Earnings Calculation:**
- AF Monthly: 20% commission
- AF Annual: 22% commission
- AFPlus Monthly: 25% commission
- AFPlus Annual: 27% commission

---

### 4. `GetPartnerStats`
**Trigger:** API Gateway endpoint (called from partner dashboard)
**Purpose:** Fetch partner statistics and recent referrals

**Input:**
```javascript
{
  partnerId: "user-123"
}
```

**Actions:**
- Query `PartnerStats` table for partner overview
- Query `PartnerReferrals` table for recent referrals (limit 50, sorted by paidAt DESC)
- Return aggregated data for dashboard display

**Output:**
```javascript
{
  overview: {
    totalReferrals: 30,
    activeSubscriptions: 28,
    totalEarnings: 150.00,
    thisMonthEarnings: 45.00
  },
  breakdown: {
    af: { signups: 25, paid: 18, active: 17, earnings: 90.00 },
    afPlus: { signups: 5, paid: 12, active: 11, earnings: 60.00 }
  },
  conversion: {
    clickToSignup: "30%",
    signupToPayment: "67%",
    clickToPayment: "20%"
  },
  recentReferrals: [...]
}
```

---

### 5. `GeneratePartnerLink`
**Trigger:** API Gateway endpoint (called when partner requests link)
**Purpose:** Generate and return partner referral link

**Input:**
```javascript
{
  partnerId: "user-123"
}
```

**Output:**
```javascript
{
  referralLink: "https://yoursite.com/?ref=partner-abc123",
  partnerId: "user-123"
}
```

**Note:** Link format is simple - partnerId can be Cognito userId or a shorter code mapped in DynamoDB

---

## Cognito User Attributes

### Partner Users
**Custom Attributes:**
- `custom:IsPartner`: "true"
- `custom:PartnerCode`: "abc123" (optional short code for cleaner URLs)

### Referred Users
**Custom Attributes:**
- `custom:PartnerId`: "user-123" (stored when user signs up with referral link)
- `custom:PaidPlan`: "AF" or "AFPlus" (existing)
- `custom:BillingCycle`: "Monthly" or "Annual" (existing)

---

## Frontend Implementation

### 1. Referral Link Tracking Flow

**Step 1: Landing Page (`/`)**
- Check URL for `?ref=partnerId`
- Store `referralPartnerId` in localStorage
- Persist across page navigations

**Step 2: Join Page (`/join`)**
- Also check URL params (if user goes directly to `/join?ref=...`)
- Preserve `referralPartnerId` in localStorage
- On signup, store in sessionStorage for verification flow

**Step 3: Verification Page**
- Partner ID persists in sessionStorage
- No action needed here

**Step 4: Plans Page (`/plans`)**
- Check for `referralPartnerId` in storage
- Store in sessionStorage for payment flow
- When user clicks "Join AF" or "Join AF+", record referral with current status

**Step 5: Payment Success**
- Stripe webhook triggers `RecordReferralPayment` Lambda
- Updates referral with final plan choice and status
- Partner earnings calculated and recorded

---

### 2. Partnership Application Page (`/partnership`)

**Route:** `/partnership`
**Component:** `PartnershipApplication.jsx`

**Form Fields:**
- First Name
- Last Name
- Email
- Password

**Bottom Text:** "RDAF partner sign in" (link to partner login)

**On Submit:**
- Create user in Cognito with `custom:IsPartner: "true"`
- Generate unique partner code
- Redirect to partner dashboard

**Note:** No email existence check (as per requirements)

---

### 3. Partner Dashboard (`/partnership/dashboard`)

**Route:** `/partnership/dashboard`
**Component:** `PartnerDashboard.jsx`

**Display:**
- Number of users acquired
- Total earnings
- Breakdown by plan type (AF vs AF+)
- Conversion rates

**Navigation Buttons:**
- **Get Links** → `/partnership/links` (implement now)
- **Payment Details** → Placeholder (future)
- **Past Payments** → Placeholder (future)
- **Sign Up Bounties** → Placeholder (future)
- **Sign Out** → Sign out and redirect to home

**Data Fetching:**
- Call `GetPartnerStats` Lambda on mount
- Display loading state while fetching
- Handle errors gracefully

---

### 4. Partner Links Page (`/partnership/links`)

**Route:** `/partnership/links`
**Component:** `PartnerLinks.jsx`

**Display:**
- Single referral link (format: `https://yoursite.com/?ref=partnerId`)
- Copy to clipboard functionality
- Stats for the link:
  - Total clicks
  - Total signups
  - Total paid
  - Breakdown: AF vs AF+ conversions
  - Total earnings

**Implementation:**
- Call `GeneratePartnerLink` Lambda to get link
- Call `GetPartnerStats` Lambda for stats
- Display in user-friendly format

---

## API Gateway Endpoints

### REST API Structure

**Base URL:** `https://api.yoursite.com/partners`

**Endpoints:**

1. `POST /referrals/click`
   - Record referral link click
   - Auth: Not required (public)

2. `POST /referrals/signup`
   - Record user signup
   - Auth: Not required (public, rate limited)

3. `POST /referrals/payment`
   - Record payment completion
   - Auth: Internal (Stripe webhook or authenticated)

4. `GET /partners/{partnerId}/stats`
   - Get partner statistics
   - Auth: Cognito JWT (partner must be authenticated)

5. `GET /partners/{partnerId}/link`
   - Generate referral link
   - Auth: Cognito JWT (partner must be authenticated)

---

## Frontend Routes (React Router)

```javascript
/partnership → PartnershipApplication (public)
/partnership/dashboard → PartnerDashboard (protected - requires partner auth)
/partnership/links → PartnerLinks (protected - requires partner auth)
```

**Route Protection:**
- Check if user has `custom:IsPartner = "true"` attribute
- Redirect to `/partnership` if not a partner

---

## File Structure

```
src/
├── api/
│   ├── auth.js (existing)
│   ├── aws-config.js (existing)
│   └── referrals.js (NEW - referral tracking API calls)
│
├── routes/
│   ├── Partnership/
│   │   ├── PartnershipApplication.jsx (NEW)
│   │   ├── PartnershipApplication.css (NEW)
│   │   ├── PartnerDashboard.jsx (NEW)
│   │   ├── PartnerDashboard.css (NEW)
│   │   ├── PartnerLinks.jsx (NEW)
│   │   └── PartnerLinks.css (NEW)
│   │
│   ├── LandingPage/ (existing - update for referral tracking)
│   ├── JoinPage/ (existing - update for referral tracking)
│   └── PlanPage/ (existing - update for referral tracking)
│
└── utils/
    └── referralTracking.js (NEW - utility functions)
```

---

## Implementation Phases

### Phase 1: Backend Infrastructure
1. Create DynamoDB tables (`PartnerReferrals`, `PartnerStats`)
2. Create Lambda functions (all 5 functions)
3. Set up API Gateway endpoints
4. Configure IAM roles and permissions
5. Test Lambda functions with sample data

### Phase 2: Frontend - Partner Application
1. Create Partnership Application page
2. Implement partner signup with Cognito
3. Add route to App.jsx
4. Test partner creation flow

### Phase 3: Frontend - Partner Dashboard
1. Create Partner Dashboard page
2. Integrate with `GetPartnerStats` API
3. Display statistics and earnings
4. Add navigation buttons (placeholders for future features)
5. Implement sign out functionality

### Phase 4: Frontend - Partner Links
1. Create Partner Links page
2. Integrate with `GeneratePartnerLink` API
3. Display referral link with copy functionality
4. Show referral statistics

### Phase 5: Referral Tracking Flow
1. Update Landing Page to capture referral parameter
2. Update Join Page to preserve partner ID
3. Update Plans Page to record referral on payment
4. Implement `RecordReferralSignup` call
5. Test full flow: click link → signup → verify → pay

### Phase 6: Payment Integration
1. Set up Stripe webhook handler
2. Integrate `RecordReferralPayment` Lambda
3. Test payment flow with referral tracking
4. Verify earnings calculation

### Phase 7: Testing & Polish
1. Test all edge cases
2. Add error handling
3. Add loading states
4. Optimize performance
5. Security review

---

## Cost Estimate

**DynamoDB:**
- Storage: ~$0.25/month per GB (referral data is small)
- Reads: ~$0.25 per million (dashboard views)
- Writes: ~$1.25 per million (referral recordings)
- **Estimated: $2-5/month** for small to medium scale

**Lambda:**
- First 1M requests free
- $0.20 per million requests after
- **Estimated: $0-2/month** for small to medium scale

**API Gateway:**
- REST API: $3.50 per million requests
- **Estimated: $0-5/month** for small to medium scale

**Cognito:**
- First 50K MAUs free
- **Estimated: $0/month** (within free tier)

**Total Monthly Cost: ~$5-15/month** for partnership program at small to medium scale.

---

## Security Considerations

1. **API Authentication:**
   - Partner endpoints require Cognito JWT authentication
   - Public endpoints (click tracking) should be rate-limited

2. **Referral Link Security:**
   - Partner IDs should be validated server-side
   - Prevent self-referrals (partner referring themselves)

3. **Data Privacy:**
   - Don't expose full user emails in dashboard
   - Show masked emails (e.g., "u***r@example.com")

4. **Earnings Calculation:**
   - Calculate on server-side only
   - Never trust client-side earnings data

---

## Future Enhancements

- Real-time stats updates (WebSocket)
- Email notifications for new referrals
- Advanced analytics (conversion funnels, cohort analysis)
- Partner tiers (different commission rates)
- Automated payouts (Stripe Connect)
- Referral link customization (custom domains, UTM parameters)
- A/B testing for referral messaging

---

## Success Metrics

- Referral conversion rate (click → payment)
- Average partner earnings
- Number of active partners
- Total referrals generated
- Revenue from partner referrals

---

## Notes

- Partner signup does NOT check for existing email (as per requirements)
- Partners created in same Cognito user pool as regular users
- One referral link per partner (user chooses AF/AF+ and billing cycle themselves)
- Final plan choice and earnings recorded at payment time
- Dashboard shows what users actually converted to (not just what link they clicked)

