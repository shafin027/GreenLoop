# GreenLoop Functional Requirements - Complete Code Analysis

This document maps each functional requirement (FR-1 to FR-31) to the current GreenLoop codebase and explains how each feature works.

---

## Project Overview

GreenLoop is implemented as:

- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (via Mongoose models)
- **Frontend**: React + Vite
- **Authentication**: JWT + bcryptjs
- **AI Chatbot**: OpenRouter API through OpenAI SDK
- **Maps/Routes**: Leaflet + helper distance calculations

---

## FR-1: Secure registration and login (JWT + bcryptjs)

**Primary files**

- `src/controllers/AuthController.ts`
- `src/middleware.ts`
- `src/routes/auth.ts`

**How it works**

- During registration, password is hashed using:
  - `bcrypt.hash(password, 10)`
- During login, hash comparison uses:
  - `bcrypt.compare(password, user.password)`
- On successful login, JWT is issued:
  - `jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: '24h' })`
- Protected endpoints validate token via `authenticateToken` middleware in `src/middleware.ts`.

---

## FR-2: Role-based access (Household, Collector, Recycling Center, Business, Admin)

**Primary files**

- `src/middleware.ts`
- Route files under `src/routes/*.ts`
- Controllers by module in `src/controllers/*.ts`

**How it works**

- Token payload includes `role`.
- `authenticateToken` sets `req.user`.
- `authorizeRole(roles: string[])` blocks users whose role is not allowed.
- Roles in project:
  - `user` (household)
  - `collector`
  - `recycling_center`
  - `business`
  - `admin`

---

## FR-3: User profile update (contact + location)

**Primary files**

- `src/controllers/UserController.ts` (`updateMe`)
- Also for other roles:
  - `src/controllers/BusinessController.ts` (`updateMe`)
  - `src/controllers/RecyclingCenterController.ts` (`updateMe`)

**How it works**

- Accepts profile fields (`name/phone/location` or `address/phone/location`).
- Updates authenticated user record via `findByIdAndUpdate`.

---

## FR-4: AI chatbot with OpenRouter API and context-aware responses

**Primary files**

- `src/controllers/ChatController.ts`
- `src/routes/chat.ts`
- Frontend: `src/frontend/views/GreenLoopChatbot.tsx`

**How it works**

- Uses OpenAI SDK configured with:
  - `baseURL: https://openrouter.ai/api/v1`
  - API key from `OPENROUTER_API`
- Builds a system prompt that includes platform context and user summary (`req.user`).
- Sends messages to model (`OPENROUTER_MODEL` default: `minimax/minimax-m2.5:free`).
- Handles OpenRouter rate/timeout failures with fallback 503 response.

---

## 2.2 Household Module

## FR-5: Schedule waste pickups (date/time/type/location)

**Primary files**

- `src/controllers/UserController.ts` (`schedulePickup`)
- `src/controllers/PickupController.ts` (`schedulePickup`)
- `src/models/Pickup.ts`
- `src/routes/pickups.ts`

**How it works**

- Creates a new `Pickup` document with submitted fields and:
  - `userId` = authenticated user
  - initial `status = 'pending'`
- If location provided, user profile location is updated.

---

## FR-6: Pickup history with weight and status tracking

**Primary files**

- `src/controllers/UserController.ts` (`getMyPickups`)
- `src/models/Pickup.ts`

**How it works**

- Fetches user pickups sorted by newest first.
- Populates related collector and center info.
- Includes fields such as:
  - `estimatedWeight`, `actualWeight`, `status`, `completedAt`, etc.

---

## FR-7: Eco-points + auto badge awarding

**Primary files**

- `src/controllers/CollectorController.ts` (`updatePickupStatus`)
- `src/utils/badgeService.ts`
- `src/models/Badge.ts`
- `src/controllers/UserController.ts` (`getBadgeProgress`, `claimBadge`)
- Constants: `src/utils/calculations.ts`

**How it works**

- On completion:
  - `ecoPoints = floor(weight * ECO_POINTS_RATE)`
  - where `ECO_POINTS_RATE = 10`
- User points are incremented automatically.
- Badge checks:
  - `checkAndAwardUserBadges(userId)` evaluates criteria thresholds.
- Manual claim flow also exists (`claimBadge`) with validation.

---

## FR-8: Estimated CO₂ reduction calculation

**Primary files**

- `src/controllers/CollectorController.ts` (`updatePickupStatus`)
- `src/models/Pickup.ts`
- `src/models/User.ts`

**How it works**

- CO₂ reduction formula on completed pickup:
  - `co2Reduced = weight * 0.8`
- Saved on pickup and accumulated in user `totalCO2Reduced`.

---

## FR-9: Household rating + feedback for collectors

**Primary files**

- `src/controllers/UserController.ts` (`ratePickup`)
- `src/controllers/PickupController.ts` (`ratePickup`)
- `src/models/Pickup.ts`
- `src/models/Collector.ts`

**How it works**

- User can rate only completed own pickups.
- Saves `rating = { stars, review, ratedAt }`.
- Collector’s aggregate metrics updated:
  - `ratingSum`, `totalRatings`, `performanceRating`.

---

## FR-10: Redeem eco-points for rewards

**Primary files**

- `src/controllers/UserController.ts` (`redeemReward`, `getRedeemedRewards`)
- `src/models/User.ts`

**How it works**

- Validates reward payload and point balance.
- Deducts points and appends redemption record with timestamp.

---

## FR-11: Community post create/view/like/interact

**Primary files**

- `src/controllers/CommunityController.ts`
  - `listPublicPosts`
  - `createPost`
  - `likePost`
- `src/models/Post.ts`
- `src/routes/community.ts`

**How it works**

- Public list returns approved posts.
- Authenticated users create posts.
- Likes are tracked with:
  - incremented `likes`
  - `likedBy` array to prevent duplicate likes.

---

## 2.3 Collector Module

## FR-12: View and claim pickups accepted by recycling center

**Primary files**

- `src/controllers/CollectorController.ts`
  - `getAvailablePickups`
  - `assignPickup`

**How it works**

- Available pool criteria:
  - `status = 'accepted_by_center'`
  - `collectorId = null`
- Claim updates:
  - `status = 'accepted_by_collector'`
  - `collectorId = current collector`

---

## FR-13: Confirm pickups with weight + photo evidence

**Primary files**

- Frontend (upload): `src/frontend/views/CollectorDashboard.tsx`
- Backend (save): `src/controllers/CollectorController.ts` (`updatePickupStatus`)
- Backend (alt upload): `src/controllers/PickupController.ts` (`uploadProof`)
- Route: `src/routes/pickups.ts`
- Model: `src/models/Pickup.ts`

**How it works**

Completing a pickup requires a completion photo as proof. The image is saved as a base64 Data URL directly in MongoDB:

1. **Image saved**: Photos are stored as base64-encoded Data URLs in the Pickup document:
   - `completionPhoto` - single primary photo (base64 string)
   - `deliveryProofImages` - array of additional proof photo URLs

2. **Frontend upload flow** (`CollectorDashboard.tsx`):
   - Uses `<input type="file">` with hidden file input
   - `handlePhotoChange` converts file to base64 using `FileReader.readAsDataURL()`
   - Sends to endpoint: `{ status: 'completed', actualWeight, completionPhoto: photoData }`
   - Photo is the base64 Data URL string

3. **Backend save flow** (`CollectorController.ts`):
   - `updatePickupStatus` receives `completionPhoto` in request body
   - Stores directly to: `pickup.completionPhoto = completionPhoto`
   - Also adds to array: `pickup.deliveryProofImages.push(completionPhoto)`
   - Image saved with pickup completion timestamp

4. **Alternative upload** (for adding more photos after completion):
   - `PickupController.uploadProof` adds to `deliveryProofImages` array
   - Route: `POST /api/pickups/:pickupId/upload-proof`
   - Payload: `{ imageUrl }` (base64 string)

5. **Code in action** (from `CollectorDashboard.tsx`):

   ```tsx
   const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onloadend = () => setPhotoData(reader.result as string);
       reader.readAsDataURL(file);
     }
   };

   // When completing pickup:
   body: JSON.stringify({
     status: "completed",
     actualWeight: parseFloat(actualWeight) || undefined,
     completionPhoto: photoData, // base64 Data URL
   });
   ```

6. **Saved in model** (`Pickup.ts`):
   - Stores: `completionPhoto: String` (single photo)
   - Stores: `deliveryProofImages: [String]` (array of proof photos)

---

## FR-14: Optimized routes using map API (Leaflet) + distance helpers

**Primary files**

- Frontend map view: `src/frontend/views/PickupMap.tsx`
- Distance helpers: `src/utils/calculations.ts`
  - `haversineKm(...)`

**How it works**

- Leaflet used for map visualization and route UI.
- Haversine helper provides distance calculations for logistics/charges.

---

## FR-15: Collector dashboard (earnings, badges, weekly goals)

**Primary files**

- `src/controllers/CollectorController.ts`
  - earnings logic in `updatePickupStatus`
  - `getEarningsChart`
- `src/models/EarningsHistory.ts`
- Frontend:
  - `src/frontend/views/CollectorDashboard.tsx`
  - `src/frontend/views/CollectorEarningsChart.tsx`

**How it works**

- Per completed pickup:
  - delivery charge added to earnings
  - weekly pickup count increments
  - weekly milestones bonus via `WEEKLY_MILESTONES`
- Chart endpoint returns last 7 days grouped stats.

---

## 2.4 Recycling Center Module

## FR-16: Accept pickups and assign to collectors

**Primary files**

- `src/controllers/RecyclingCenterController.ts`
  - `getPendingPickups`
  - `acceptPickup`
- Collector side assignment:
  - `src/controllers/CollectorController.ts` (`assignPickup`)

**How it works**

- Centers accept pending pickups (requires center approval).
- Pickup gets `centerId`, delivery charge estimate, and accepted status.
- Collectors later claim accepted pickups.

---

## FR-17: Log processed waste by category/weight/method

**Primary files**

- `src/controllers/RecyclingCenterController.ts` (`logWaste`)
- `src/models/WasteLog.ts`

**How it works**

- Center logs processed waste category + weight.
- Safety rule: cannot log more than delivered amount remaining for that category.
- Updates center aggregate processing stats.

---

## FR-18: Carbon offset formula + post credits to marketplace

**Primary files**

- `src/controllers/RecyclingCenterController.ts`
  - `logWaste` (offset + credits earned)
  - `listCredits` (post to marketplace)
- `src/models/CarbonCredit.ts`
- Constants: `src/utils/calculations.ts` (`CARBON_CREDIT_RATES`, `DEFAULT_CREDIT_RATE`)

**How it works**

- Carbon reduction:
  - `carbonReduced = weight * 0.8`
- Credits:
  - `creditsEarned = ceil(weight * rate)`
- Listing deducts center balance and creates marketplace listing (`status='available'`).

---

## FR-19: Centers award badges to businesses

**Primary files**

- `src/controllers/RecyclingCenterController.ts` (`awardBadge`)
- `src/models/Business.ts`

**How it works**

- Finds business by ID.
- Appends badge to `business.badges` if not already awarded.

---

## FR-20: Generate and issue certificates

**Primary files**

- `src/controllers/RecyclingCenterController.ts` (`issueCertificate`)
- `src/models/Certificate.ts`

**How it works**

- Creates certificate record with recipient/type/verifiedData and issue date.

---

## 2.5 Business / Company Module

## FR-21: Purchase carbon credits (payment flow placeholder)

**Primary files**

- `src/controllers/BusinessController.ts`
  - `listAvailableCredits`
  - `purchaseCarbonCredit`

**How it works**

- Lists `CarbonCredit` entries where `status='available'`.
- Purchase sets credit status to `purchased`, assigns buyer, sets purchase date.
- Increments `business.carbonCreditsPurchased`.
- Note: direct DB transition is implemented; external payment gateway integration is not shown in current code.

---

## FR-22: Display sustainability scores on business dashboard

**Primary files**

- Score calculation:
  - `src/controllers/AdminController.ts` (`calculateUserSustainabilityScore`)
- Business dashboard UI:
  - `src/frontend/views/BusinessDashboard.tsx`

**How it works**

- Sustainability score formula:
  - `min(100, ecoPoints/100 + totalCO2Reduced/10)`
- Stored in user and historical `SustainabilityScore` model.

---

## FR-23: ESG compliance reports

**Primary files**

- `src/controllers/BusinessController.ts` (`getCertificates`)
- `src/models/Certificate.ts`

**How it works**

- Business retrieves certificates by `issuedToId`.
- Certificates represent compliance/supporting ESG proof artifacts.

---

## 2.6 Admin Module

## FR-24: Manage users, approve centers, verification handling

**Primary files**

- `src/controllers/AdminController.ts`
  - `listUsers`, `listBusinesses`, `listRecyclingCenters`
  - `verifyRecyclingCenter`, `verifyCollector`, `verifyUser`
  - `banEntity`, `deleteEntity`

**How it works**

- Admin can verify/unverify entities, ban/unban, and permanently delete accounts.
- Recycling centers require `isApproved=true` for operational actions.

---

## FR-25: System-wide carbon statistics + CO₂ metrics (charts)

**Primary files**

- Backend:
  - `src/controllers/AdminController.ts` (`getDashboardStats`)
- Frontend:
  - `src/frontend/views/AdminDashboard.tsx` (chart rendering)

**How it works**

- Aggregates completed pickups for:
  - total waste
  - total CO₂ reduced
- Returns additional operational stats and flagged items for dashboard widgets.

---

## FR-26: Household sustainability score by recycling consistency/eco trends

**Primary files**

- `src/controllers/AdminController.ts` (`calculateUserSustainabilityScore`, `getSustainabilityScores`)
- `src/models/SustainabilityScore.ts`

**How it works**

- Current implementation calculates score from ecoPoints + CO₂ totals.
- Stores snapshot of factors in `SustainabilityScore` collection.

---

## FR-27: Suspicious weight detection (rule-based anomaly)

**Primary files**

- `src/controllers/CollectorController.ts` (`updatePickupStatus`)
- `src/utils/fraudService.ts`
- `src/models/FraudLog.ts`

**How it works**

- Flags anomalies such as:
  - mismatch >10% and >0.5kg between estimated and actual
  - unusual high weight thresholds (e.g., >50kg)
- Creates fraud log with severity and reason.

---

## FR-28: Admin create/edit/delete community events

**Primary files**

- `src/controllers/CommunityController.ts`
  - `createEvent`
  - `updateEvent`
  - `deleteEvent`
- `src/models/CommunityEvent.ts`

**How it works**

- Full CRUD lifecycle for events.
- Deleting event also removes participant links.

---

## FR-29: Moderate inappropriate posts (hide/edit/delete)

**Primary files**

- `src/controllers/CommunityController.ts`
  - `listAdminPosts`
  - `updatePost`
  - `deletePost`
- `src/models/Post.ts`

**How it works**

- Admin can edit title/content.
- Can set approval status (`isApproved`) to hide/unhide.
- Can delete posts completely.

---

## FR-30: Admin awards badges to recycling centers

**Primary files**

- `src/controllers/AdminController.ts` (`awardBadgeToCenter`)
- `src/models/RecyclingCenter.ts`

**How it works**

- Adds badge to center if not already present.

---

## FR-31: Monitor fraud patterns + take action on flagged entries

**Primary files**

- `src/controllers/AdminController.ts`
  - `getFraudDetection`
  - `resolveFraudLog`
  - `reopenFraudLog`
- `src/models/FraudLog.ts`

**How it works**

- Admin views all fraud logs with related collector/pickup.
- Can mark alerts resolved with notes, or reopen for further investigation.

---

## Supporting constants, formulas, and helpers

**Primary file**

- `src/utils/calculations.ts`

**Important values**

- `ECO_POINTS_RATE = 10`
- `USER_CREDITS_PER_PICKUP = 5`
- Carbon credit rates per waste category (`CARBON_CREDIT_RATES`)
- Delivery charge:
  - base by distance
  - extra by weight above threshold
- Distance:
  - `haversineKm(...)`

---

## Route entry points (API exposure)

**Route files**

- `src/routes/auth.ts`
- `src/routes/users.ts`
- `src/routes/pickups.ts`
- `src/routes/collectors.ts`
- `src/routes/recyclingCenters.ts`
- `src/routes/businesses.ts`
- `src/routes/admin.ts`
- `src/routes/community.ts`
- `src/routes/chat.ts`
- `src/routes/badges.ts`

These route files wire middleware + controller actions and define which endpoints are publicly accessible versus protected.

---

## Final note

This mapping reflects the current implemented code. Some requirements (like full external payment processing for FR-21 or richer sustainability trend analytics for FR-26) are represented at a functional level but can be expanded further for production-grade depth.
