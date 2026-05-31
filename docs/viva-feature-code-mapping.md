# GreenLoop Viva Feature-to-Code Mapping (Selected Features)

This document is a focused viva guide for only these features:

1. Collector pickup confirmation + proof image
2. Fraud / anomaly detection
3. Community posts
4. AI chatbot
5. Admin user / center approval

For each feature, it lists:

- **Which files are involved**
- **Which code paths/functions are important**
- **How the feature works end-to-end**

---

## 1) Collector Pickup Confirmation + Uploaded Delivery Proof Image

## Files involved

- `src/frontend/views/CollectorDashboard.tsx`
- `src/controllers/CollectorController.ts`
- `src/controllers/PickupController.ts`
- `src/models/Pickup.ts`
- `src/routes/pickups.ts` (endpoint wiring)

## Exactly where uploaded images are saved

- MongoDB collection: **Pickups**
- Model fields in `src/models/Pickup.ts`:
  - `completionPhoto: String` → stores the main completion image (usually base64 Data URL)
  - `deliveryProofImages: { type: [String], default: [] }` → stores all proof images (array)

So uploaded image strings are persisted directly inside each pickup document.

## Code path A — Complete pickup with mandatory proof image

**Controller:** `src/controllers/CollectorController.ts`  
**Function:** `CollectorController.updatePickupStatus(req, res)`

Important lines/behavior:

- Reads request body:
  - `const { status, actualWeight, completionPhoto } = req.body;`
- Enforces proof when completing:
  - `if (!completionPhoto) return res.status(400)...`
- Saves proof to pickup:
  - `pickup.completionPhoto = completionPhoto;`
  - initializes array if needed
  - pushes into `pickup.deliveryProofImages` if not duplicate
- Saves pickup:
  - `await pickup.save();`

### How path A works step-by-step

1. Collector submits completion request with `status: 'completed'`, weight, and `completionPhoto`.
2. Backend checks pickup ownership (`collectorId` must match logged-in collector).
3. Backend blocks completion if photo is missing.
4. Backend writes image string to:
   - `completionPhoto` (single primary proof)
   - `deliveryProofImages` (history/list of proofs)
5. Backend saves document and returns success response.

## Code path B — Upload additional delivery proof images later

**Controller:** `src/controllers/PickupController.ts`  
**Function:** `PickupController.uploadProof(req, res)`

Important lines/behavior:

- Input:
  - `const { imageUrl } = req.body;`
  - requires image string or returns 400
- Access control:
  - only assigned collector can upload proof for that pickup
- Storage logic:
  - initializes `pickup.deliveryProofImages` if empty
  - adds `imageUrl` if not already present
  - `await pickup.save()`

### How path B works step-by-step

1. Collector calls upload-proof endpoint with `imageUrl` (usually base64 Data URL).
2. Backend checks:
   - pickup exists
   - collector owns that delivery
3. Backend appends image to `deliveryProofImages` (no duplicate insertion).
4. Backend saves pickup and returns updated images list.

## Practical viva explanation (short)

- **Where saved?** In `Pickup` document fields `completionPhoto` and `deliveryProofImages`.
- **Which code saves it?**
  - Completion flow: `CollectorController.updatePickupStatus`
  - Extra proof flow: `PickupController.uploadProof`
- **How it works?** Frontend sends image string, backend validates and stores directly in MongoDB pickup record.

---

## 2) Fraud / Anomaly Detection

## Files involved

- `src/controllers/CollectorController.ts`
- `src/utils/fraudService.ts`
- `src/models/FraudLog.ts`
- `src/controllers/AdminController.ts` (fraud monitoring/resolve/reopen)

## Key code + what each async function does

- `CollectorController.updatePickupStatus(req, res)` (async)
  - Runs when collector changes pickup status (especially to `completed`).
  - Calculates mismatch and anomaly values:
    - `mismatchPct = |actual-estimated| / estimated`
    - `mismatchKg = |actual-estimated|`
    - mismatch rule: `mismatchPct > 0.10 && mismatchKg > 0.5`
    - anomaly rule: `actualWeight > 50`
  - If suspicious and no existing log for this pickup:
    - creates `FraudLog` with `reason`, `severity`, and `resolved:false`
  - **What it does in system:** performs real-time fraud flagging at pickup completion time.

- `detectFraud(pickup)` in `src/utils/fraudService.ts` (async)
  - Accepts pickup-like data with estimated/actual weight.
  - Returns boolean `true/false` based on mismatch/anomaly thresholds.
  - **What it does in system:** reusable fraud decision helper.

- `logFraudIfNeeded(collectorId, pickupId, estimatedWeight, actualWeight)` in `src/utils/fraudService.ts` (async)
  - Calls `detectFraud(...)`.
  - Skips if not suspicious.
  - Skips duplicate log if one already exists for `pickupId`.
  - Determines severity (`medium/high/critical`) and writes `FraudLog.create(...)`.
  - **What it does in system:** centralized fraud log writer for any flow that wants to auto-log fraud.

- `getFraudDetection(req, res)` in `AdminController.ts` (async)
  - Fetches fraud logs, populates collector/pickup info, sorts latest first.
  - **What it does in system:** provides admin fraud monitoring feed.

- `resolveFraudLog(req, res)` in `AdminController.ts` (async)
  - Marks log as resolved and stores resolver info/time/notes.
  - **What it does in system:** closes a fraud investigation item.

- `reopenFraudLog(req, res)` in `AdminController.ts` (async)
  - Reverts a resolved log back to unresolved.
  - **What it does in system:** re-activates investigation if needed.

## How it works

1. Collector submits completion with actual weight.
2. System compares actual vs estimated weight using mismatch + high-weight rules.
3. If suspicious, a `FraudLog` record is created (unless already logged).
4. Admin API reads these logs for dashboard/review.
5. Admin can resolve or reopen fraud alerts as part of investigation workflow.

---

## 3) Community Events and Posts

## Files involved

- `src/controllers/CommunityController.ts`
- `src/models/CommunityEvent.ts`
- `src/models/EventParticipant.ts`
- `src/models/Post.ts`
- `src/routes/community.ts`

## A) Community Events — key code and flow

### Event code in `CommunityController.ts` (async functions + what each does)

- `listEvents(req, res)`
  - Finds all `CommunityEvent` docs, newest first.
  - For each event, counts joined users from `EventParticipant`.
  - Returns enriched event list with `participantCount`.
  - **What it does:** builds event feed with live participant totals.

- `createEvent(req, res)` (admin/super-admin route)
  - Creates new event document from request payload.
  - Supports `date` or `startDate/endDate`, plus `location`, `offerings`, `imageURL`.
  - **What it does:** allows admins to publish new community events.

- `joinEvent(req, res)`
  - Checks if user already joined same event.
  - If not, creates `EventParticipant` record.
  - **What it does:** records user registration for an event (one entry per user/event).

- `getMyJoinedEvents(req, res)`
  - Reads all `EventParticipant` rows for logged-in user.
  - Returns list of joined `eventId`s.
  - **What it does:** lets frontend highlight joined events for that user.

- `getEventParticipants(req, res)`
  - Returns all participant rows for a specific event.
  - **What it does:** supports participant listing/attendance visibility.

- `updateEvent(req, res)` (admin/super-admin)
  - Updates editable event fields.
  - **What it does:** admin event maintenance.

- `deleteEvent(req, res)` (admin/super-admin)
  - Deletes event document.
  - Deletes related `EventParticipant` records for cleanup.
  - **What it does:** removes event and prevents orphan participant records.

### Event route mapping in `src/routes/community.ts`

- `GET /events` → list events
- `POST /events` → create event (admin/super-admin)
- `POST /events/:id/join` → join event (authenticated)
- `GET /events/my-joined` → my joined events
- `GET /events/:id/participants` → participant list
- `PUT /admin/events/:id` → update event (admin/super-admin)
- `DELETE /admin/events/:id` → delete event (admin/super-admin)

### How Community Events work (viva)

1. Admin creates event.
2. Users join event (one join per user/event).
3. System tracks participants in `EventParticipant`.
4. Listing API combines event info + participant count.
5. Admin can update/delete events; delete also removes participant links.

## B) Community Posts — key code and flow

### Post code in `CommunityController.ts` (async functions + what each does)

- `listPublicPosts(req, res)`
  - Fetches only approved posts: `Post.find({ isApproved: true })`.
  - Populates author basic info.
  - Computes `isLiked` for current viewer using `likedBy`.
  - **What it does:** powers public post feed with personalized like-state.

- `createPost(req, res)`
  - Creates new post with `authorId`, `title`, `content`, optional `images`.
  - **What it does:** lets authenticated users publish community posts.

- `likePost(req, res)`
  - Requires authenticated `userId`.
  - Uses conditional update with `likedBy: { $ne: userId }` to block duplicate likes.
  - If successful: increments `likes` and pushes user id to `likedBy`.
  - **What it does:** ensures one-like-per-user while updating counters atomically.

- `listAdminPosts(req, res)`
  - Returns all posts with author info for moderation panel.
  - **What it does:** admin full visibility over community content.

- `updatePost(req, res)`
  - Admin can edit `title`, `content`, `isApproved`.
  - **What it does:** moderation/edit/hide-unhide control.

- `deletePost(req, res)`
  - Admin deletes post permanently.
  - **What it does:** removes inappropriate or unwanted posts.

### Post route mapping in `src/routes/community.ts`

- `GET /posts` → public posts
- `POST /posts` → create post (authenticated)
- `POST /posts/like/:id` → like a post (authenticated)
- `GET /admin/posts` → list all for moderation (admin/super-admin)
- `PUT /admin/posts/:id` → edit/moderate
- `DELETE /admin/posts/:id` → delete

### How Community Posts work (viva)

1. Authenticated user creates post.
2. Public feed shows approved posts with author info.
3. User can like once; duplicate like gets controlled response.
4. Admin has moderation controls to review/edit/delete posts.

---

## 4) AI Chatbot

## Files involved

- `src/controllers/ChatController.ts`
- `src/routes/chat.ts`
- `src/frontend/views/GreenLoopChatbot.tsx`

## Key code + what each async function does

- `chatHandler(req, res)` in `src/controllers/ChatController.ts` (async)
  - Validates incoming `messages` array.
  - Builds a strict system prompt + user context (`req.user` summary).
  - Sends chat completion request to OpenRouter (OpenAI SDK client).
  - Returns `{ reply, reasoning_details }`.
  - Handles provider timeout/rate-limit with user-safe 503 response.
  - **What it does:** main backend brain for chatbot responses.

- `requestChatCompletion(client, modelName, messages)` (async helper)
  - Executes `client.chat.completions.create(...)`.
  - **What it does:** wraps provider call in one reusable function.

- Route (`src/routes/chat.ts`)
  - `POST /` + `authenticateToken`.
  - **What it does:** ensures only authenticated requests hit chatbot backend.

- Frontend async flow in `src/frontend/views/GreenLoopChatbot.tsx`
  - `sendMessage(text)`:
    - appends user message to state
    - calls `/api/chat` with bearer token
    - handles success/error payloads
  - `streamReply(fullText)`:
    - streams assistant reply word-by-word into UI
  - **What it does:** user-facing chat interaction + smooth response rendering.

## How it works

1. User opens chatbot widget and sends message.
2. Frontend sends conversation messages to `/api/chat` with auth token.
3. Backend injects system prompt + user context and requests LLM completion.
4. Reply returned to frontend and shown with streaming animation.
5. If provider is down/rate-limited, user gets graceful service-unavailable response.

---

## 5) Admin User / Center Approval

## Files involved

- `src/controllers/AdminController.ts`
- `src/models/User.ts`
- `src/models/Collector.ts`
- `src/models/RecyclingCenter.ts`
- `src/routes/admin.ts`

## Key code + what each async function does

- `verifyUser(req, res)` / `unverifyUser(req, res)`
  - Updates `User.verified` true/false by id.
  - **What it does:** controls user verification status from admin side.

- `verifyCollector(req, res)` / `unverifyCollector(req, res)`
  - Updates `Collector.verified` true/false by id.
  - **What it does:** controls collector verification state.

- `verifyRecyclingCenter(req, res)`
  - Updates `RecyclingCenter.isApproved` using body field `{ verified }`.
  - **What it does:** approves or unapproves recycling center operations.

- `listUsers(req, res)`, `listRecyclingCenters(req, res)`, `listBusinesses(req, res)`
  - Fetches entities with admin-relevant fields.
  - **What it does:** gives admin a management table to decide approvals/actions.

## How it works

1. Admin fetches entities from list endpoints.
2. Admin triggers verify/unverify actions.
3. Backend updates verification/approval flags in respective collections.
4. Approved state gates operational behavior for some center/role-specific flows.

---

## Quick Viva Summary (One-liners)

- **Pickup proof**: Completion requires `completionPhoto`; image stored in pickup document and proof array.
- **Fraud detection**: Weight mismatch/high-weight rules create `FraudLog`; admin resolves/reopens.
- **Community posts**: Auth users create/like posts; duplicate likes blocked; admin moderation endpoints exist.
- **AI chatbot**: `/api/chat` uses OpenRouter with authenticated context-aware prompting and fallback error handling.
- **Admin approvals**: Admin toggles `verified`/`isApproved` flags for users, collectors, and centers through controller APIs.
