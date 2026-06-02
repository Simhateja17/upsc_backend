# RiseWithJeet Backend — 10-Week Learning Map

**For:** Manasa & Suri  
**Rule:** Each person reads DIFFERENT files each week. Read independently. Then meet and teach each other what you found.

---

## WEEK 1 — How the Internet Works + HTTP

**Concepts before code:** HTTP methods (GET reads, POST creates, PUT updates, DELETE removes), status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error), request/response headers, JSON body, URL paths and query params.

### Manasa — Read these files

| File | What to look for |
|---|---|
| `src/index.ts` | See how Express is created (`express()`), how `app.use(express.json())` parses JSON bodies, how `app.use(cors(...))` sets CORS headers, how `app.get("/health", ...)` returns a 200 JSON object. The HTTP basics are all right here. |
| `src/routes/index.ts` | Look at lines 38-52. See `res.json({ status, message, timestamp })` — this IS an HTTP response. See `res.status(200)` and `res.status(503)`. See every `router.use("/auth", authRoutes)` line — this is URL path mounting. |

### Suri — Read these files

| File | What to look for |
|---|---|
| `src/routes/dailyMcq.routes.ts` | See different HTTP methods: `router.get(...)`, `router.post(...)`. See route paths like `/today`, `/submit`, `/results`. See how `authenticate` middleware is applied to protect routes. |
| `src/controllers/dailyMcq.controller.ts` | Look at `getTodayMcq` — see `req` (request comes in with user info from middleware), see `res.json({ data: ... })` (response goes out). Look at `submitAnswers` — see `req.body` (the JSON the client sent), see `res.json({ score, percentile, rank })`. |

### Discussion topic
"I found a GET and a POST. What's the difference? What status codes did we each see?"

---

## WEEK 2 — How a Request Flows Through Your Code

**Concepts:** Route → middleware chain → controller → service/repository → database → response. Follow one request's entire life.

### Manasa — Trace this request

**Trace:** `POST /api/daily-mcq/submit` with a JWT token and MCQ answers in the body.

| Step | File | What happens |
|---|---|---|
| 1. Request arrives at Express | `src/index.ts` | `express()`, `app.use(...)` setup |
| 2. Middleware runs: CORS, JSON parse, requestId, pino-http | `src/index.ts` | See the `app.use` calls |
| 3. Route matched: `/api/daily-mcq` | `src/routes/index.ts` | Line 91: `router.use("/daily-mcq", dailyMcqRoutes)` |
| 4. Specific route: POST `/submit` | `src/routes/dailyMcq.routes.ts` | Find `router.post("/submit", authenticate, validate, ...)` |
| 5. Auth middleware fires | `src/middleware/auth.middleware.ts` | `authenticate` function — verifies JWT, attaches `req.user` |
| 6. Validation middleware fires | `src/middleware/validate.ts` | Validates `req.body` against Zod schema |
| 7. Controller runs | `src/controllers/dailyMcq.controller.ts` | `submitAnswers` function |
| 8. Repository queries DB | `src/repositories/prisma-daily-mcq.repository.ts` | Find attempt creation + scoring logic |
| 9. Database responds | `src/config/database.ts` | The Prisma client that actually sends SQL |
| 10. Controller returns JSON | `src/controllers/dailyMcq.controller.ts` | `res.json({...})` |

### Suri — Trace this request

**Trace:** `GET /api/editorials/today` with a JWT token.

| Step | File | What happens |
|---|---|---|
| 1. Request arrives | `src/index.ts` | Express setup |
| 2. Route matched: `/api/editorials` | `src/routes/index.ts` | Line 97: `router.use("/editorials", editorialRoutes)` |
| 3. Specific route: GET `/today` | `src/routes/editorial.routes.ts` | Find the route definition |
| 4. Auth middleware (optionalAuth) | `src/middleware/auth.middleware.ts` | `optionalAuth` — attaches user if token present, continues if not |
| 5. Controller runs | `src/controllers/editorial.controller.ts` | Fetches today's editorials |
| 6. Repository queries DB | `src/repositories/prisma-editorial.repository.ts` | Prisma queries for editorials |
| 7. Response | `src/controllers/editorial.controller.ts` | JSON array of editorials |

### Discussion topic
"Draw both flows on a whiteboard. What's the same? What's different? Where does auth happen in each?"

---

## WEEK 3 — Express Middleware + Routing + Error Handling

**Concepts:** What middleware does (transform request, block request, log, attach data). How errors propagate through Express. Global vs route-level middleware.

### Manasa — Read these files

| File | Focus |
|---|---|
| `src/middleware/auth.middleware.ts` | Every line. How does it extract the JWT? What happens if no token? What happens if token is expired? What does it attach to `req`? |
| `src/middleware/validate.ts` | The Zod factory. How does `validate(schema)` return a middleware? What happens when validation fails? |
| `src/middleware/rateLimit.ts` | How are the 4 rate limiters configured? What's the difference between the general limiter and the AI limiter? Why is AI tighter? |

### Suri — Read these files

| File | Focus |
|---|---|
| `src/middleware/errorHandler.ts` | How does Express catch errors? What does the global error handler return to the client? Why does it NOT leak stack traces? |
| `src/middleware/requestId.ts` | 15 lines. How does every request get a UUID? Where does it show up in responses? |
| `src/middleware/upload.ts` | How does Multer limit file size? What MIME types are accepted? What's "magic byte verification"? |
| `src/middleware/adminAuth.ts` | How does it chain after `authenticate`? What happens if a non-admin hits an admin route? |

### Discussion topic
"I'll explain how auth middleware works. You explain how errors are caught and returned. Then together answer: what happens if someone uploads a 60MB PDF?"

---

## WEEK 4 — Authentication (JWT, Supabase Auth)

**Concepts:** JWT structure (header.payload.signature), how Supabase signs tokens, JWKS (JSON Web Key Sets) for verification, token expiry and refresh, OAuth flow.

### Manasa — Read these files

| File | Focus |
|---|---|
| `src/controllers/auth.controller.ts` | **Read every line.** `signup` — what does it send to Supabase? What gets created in Prisma? `login` — what comes back from Supabase? `googleAuth` — how does the OAuth redirect work? `refreshToken` — when and why? `getMe` — how does it know who you are? |
| `src/validators/auth.validators.ts` | Simple Zod schemas. What's the minimum password length? How is email validated? |

### Suri — Read these files

| File | Focus |
|---|---|
| `src/middleware/auth.middleware.ts` | **Deep read.** Focus on `authenticate`. How does it get the JWKS from Supabase? How does `jose` verify the token signature? What's inside the JWT payload? How does it auto-create a User row if this is the first login? |
| `src/config/supabase.ts` | How are Supabase clients created? What's the difference between `supabaseAnon` and `supabaseAdmin`? Which one bypasses RLS? |

### Discussion topic
"I'll explain what happens when a user clicks 'Sign Up'. You explain what happens when they hit any protected route afterward. Together: what does a JWT actually look like inside?"

---

## WEEK 5 — Databases (SQL, Prisma, Relations)

**Concepts:** Tables, rows, columns. Primary keys vs foreign keys. One-to-many vs many-to-many. What Prisma generates as SQL. What a JOIN does.

### Manasa — Read these files (models 1-30)

| File | Focus |
|---|---|
| `prisma/schema.prisma` lines 1-700 | Read `User`, `DailyMCQ`, `MCQQuestion`, `MCQAttempt`, `MCQResponse`, `DailyMainsQuestion`, `MainsAttempt`, `MainsEvaluation`, `Editorial`, `MockTest`, `TestSeries`. For each: identify the foreign keys and relations. |
| `src/config/database.ts` | How Prisma client is created. What is `$queryRaw`? |

### Suri — Read these files (models 31-60)

| File | Focus |
|---|---|
| `prisma/schema.prisma` lines 700-1712 | Read `StudyMaterial`/`StudyMaterialChunk`, `TopperDocument`/`TopperAnswer`/`TopperAnswerEmbedding`, `ChatConversation`/`ChatMessage`, `PricingPlan`/`Order`/`Payment`/`Subscription`, `ForumPost`/`ForumAnswer`, `StudyGroup`, `Bookmark`, `MoodCheckIn`, `JournalEntry`, `SupportTicket`, `Faq`, `Notification`. For each: identify the foreign keys and relations. |
| `src/repositories/prisma-daily-mcq.repository.ts` | See real Prisma queries: `findFirst({ where: ..., include: ... })`, `create({ data: ... })`, `update({ where: ..., data: ... })`. |

### Discussion topic
"Draw the full MCQ data model together: User → MCQAttempt → MCQResponse ← MCQQuestion ← DailyMCQ. Add all foreign keys. Draw the money chain: User → Order → Payment ← Subscription ← PricingPlan."

---

## WEEK 6 — Transactions, ACID, Race Conditions

**Concepts:** What ACID means. What `prisma.$transaction` does. What happens when two people buy the last seat. What happens when a payment webhook and frontend callback arrive simultaneously.

### Manasa — Read these files

| File | Focus |
|---|---|
| `src/controllers/billing.controller.ts` | **Search for `$transaction`.** In `verifyPayment`: see how Payment creation + Subscription creation happen in ONE transaction. What happens if one fails? Find `initiatePayment` — is order creation also in a transaction? |
| `src/controllers/subscription.controller.ts` | Find the trial creation logic. If two API calls try to activate a trial at the same time, what stops them both from succeeding? (Hint: look for unique constraints.) |

### Suri — Read these files

| File | Focus |
|---|---|
| `src/controllers/dailyMcq.controller.ts` | In `submitAnswers`: what happens if the user already submitted today? How does the unique constraint `@@unique([userId, dailyMcqId])` on `MCQAttempt` prevent double-submission? |
| `src/repositories/prisma-daily-mcq.repository.ts` | Find the attempt creation code. Does it use `create` or `upsert`? What's the difference for race conditions? |
| `src/jobs/dailyContentJob.ts` | In `rotateDailyMCQ`: what if the cron job runs twice? How does the `@@unique([date])` on `DailyMCQ` prevent duplicate daily sets? |

### Discussion topic
"You explain how the MCQ submission prevents double-counting. I'll explain how payment verification prevents double-charging. Both are race condition protections — what pattern do they share?"

---

## WEEK 7 — Payments (Razorpay, Subscriptions, Idempotency)

**Concepts:** Payment gateway flow (client → server → Razorpay → callback). Idempotency keys. HMAC signature verification. Subscription lifecycle.

### Manasa — Read these files

| File | Focus |
|---|---|
| `src/controllers/billing.controller.ts` | **All 881 lines.** Start at `CHECKOUT_PLAN_CATALOG` (line 27) — where prices live. Then `initiatePayment` — creates Razorpay order + DB Order. Then `verifyPayment` — the most important money function: verifies HMAC, creates Payment + Subscription atomically. |
| `src/services/razorpayGateway.service.ts` | Raw Razorpay API calls. `createRazorpayOrder` — what does it POST to Razorpay? `verifyRazorpaySignature` — how does the HMAC check work? |

### Suri — Read these files

| File | Focus |
|---|---|
| `src/routes/billing.routes.ts` | Every billing endpoint. Which ones need auth? Which ones are admin-only? |
| `src/controllers/pricing.controller.ts` | How pricing plans are returned to the frontend. |
| `admin/pricing.controller.ts` | How admin creates/edits/deletes pricing plans. |
| `src/controllers/subscription.controller.ts` | Trial logic. Plan storage in user settings JSON. Cancel flow. |
| `prisma/schema.prisma` lines 1460-1524 | `Order`, `Payment`, `Subscription` models. Every field. |

### The Money Flow (trace together)

```
User clicks "Buy Rise Monthly" on frontend
  → POST /api/create-order {planKey: "rise", cycle: "monthly"}
  → billing.controller.ts: find matching PricingPlan, call razorpayGateway.createOrder(₹499)
  → Razorpay returns order_id
  → Frontend opens Razorpay checkout, user pays
  → Frontend calls POST /api/verify-payment {razorpay_order_id, razorpay_payment_id, razorpay_signature}
  → billing.controller.ts: verify HMAC, create Payment + Subscription in transaction
  → User now has active subscription
```

### Discussion topic
"Trace one payment on the whiteboard together. At every step: what could go wrong? How is it handled?"

---

## WEEK 8 — Real-Time (WebSockets, Polling, Push Notifications)

**Important context:** The RiseWithJeet backend has **no WebSocket server**. There is no `ws://`, `socket.io`, or Supabase Realtime server-side code. Instead, the platform uses **polling** and **Firebase push notifications**.

**Concepts:** Why persistent connections (WebSockets) vs polling (repeated HTTP requests). When polling is good enough. How push notifications work as a real-time alternative.

### Manasa — Read these files

| File | Focus |
|---|---|
| `src/routes/index.ts` lines 157-171 | `/api/study-room/stats` — returns a "active student count" based on time of day. This is a polling endpoint. The frontend calls it every N seconds. Why polling? |
| `src/controllers/dailyAnswer.controller.ts` | Find `getEvaluationStatus`. After a student submits an answer, evaluation runs asynchronously (AI takes seconds). The frontend polls this endpoint until `status` changes from `"pending"` → `"completed"`. |
| Research task | Spend 30 min reading about WebSockets vs polling. Write down: 3 reasons to use WebSockets, 3 reasons polling was chosen here. |

### Suri — Read these files

| File | Focus |
|---|---|
| `src/lib/pushNotifications.js` | Firebase Cloud Messaging. How does the server send a push to a mobile device? What data goes in the payload? |
| `src/lib/pushDevices.js` | How are device tokens stored? How does the server know which device belongs to which user? |
| `src/controllers/pyqMains.controller.ts` | Find evaluation status polling. Same pattern as daily-answer. |
| `src/controllers/mockTestMains.controller.ts` | Same — find the evaluation status polling. |
| Research task | Spend 30 min reading about Firebase Cloud Messaging. Write down: how does FCM replace WebSockets for "telling the user something happened"? |

### Discussion topic
"I'll explain polling — how the frontend keeps asking 'is my evaluation done yet?'. You explain push notifications — how Firebase wakes up the app. Together: which is better for a real-time location tracker? Why wasn't it needed here?"

---

## WEEK 9 — AI Integration (RAG, Embeddings, Gemini, Prompts)

**Concepts:** What a vector embedding is (text → array of 1536 numbers). What cosine similarity does. How RAG works (Retrieve → Augment → Generate). How system prompts control AI behavior. The full pipeline: PDF upload → chunk → embed → store → search → inject into prompt → generate.

### Manasa — Read these files (the EVALUATION side)

| File | Focus |
|---|---|
| `src/config/llm.ts` | **Read first.** This is the gateway. Every AI call goes through `invokeModel()` or `invokeModelJSON()`. See how model names map to Azure endpoints. See cost logging to `aiUsageLog`. |
| `src/services/answerEvaluator.ts` | **All 419 lines.** The most complex AI file. Read the `EvaluationResult` interface (line 9-23) — what the AI returns. Read `evaluateAnswer` — builds prompt with question + answer + topper context + rubric. How does it call `invokeModelJSON`? |
| `src/services/checkedCopyPlanner.ts` | How evaluation scores get converted into annotation JSON for image generation. |
| `src/services/checkedCopyGenerator.ts` | How Gemini image model draws teacher marks on answer sheets. |
| `src/services/checkedCopyValidator.ts` | Sanity check: is the generated image actually bigger than 15% of original? |

### Suri — Read these files (the RAG + RETRIEVAL side)

| File | Focus |
|---|---|
| `src/services/embedding.service.ts` | `text-embedding-ada-002` → 1536-dim vector. What does `embedText("fundamental rights")` return? (An array of 1536 floats.) |
| `src/services/chunking.service.ts` | PDF → pages → clean text → smart split. What's "overlap"? Why does each chunk overlap with the previous one? |
| `src/services/studyMaterialVectorizer.ts` | Full pipeline: chunk PDF → embed each chunk → store in Supabase Vector table. |
| `src/services/mockTestRag.service.ts` | **Read twice.** Search vectors → get top chunks → inject into Claude prompt → generate grounded MCQ. This IS RAG. |
| `src/controllers/ai.controller.ts` | Lines 46-110: `retrieveRelevantContext`. Jeet AI chat RAG flow: embed query → search study_chunks + mock_test_chunks in parallel → merge results → inject into Claude prompt. Lines 7-13: `JEET_AI_SYSTEM_PROMPT`. |

### Both must also read

| File | Focus |
|---|---|
| `src/services/questionGenerator.ts` | Find the prompt for generating UPSC MCQs and mains questions. How does the AI know what a "good UPSC question" looks like? |
| `src/services/editorialSummarizer.ts` | Find the prompt for summarizing editorials. What structure does it enforce (key arguments, relevance, potential questions)? |
| `src/config/gemini.ts` | How Gemini Vision is called for OCR. Different from Azure OpenAI. |
| `src/services/topperPageStructurer.ts` | How Gemini classifies topper answer pages (cover vs answer vs blank). |

### The Full RAG Cycle (draw together)

```
1. Admin uploads NCERT PDF → studyMaterialVectorizer → chunks → Azure embeddings → Supabase Vector
2. Student asks Jeet AI "explain fundamental rights"
   → embedText("explain fundamental rights") → 1536-dim vector
   → supabaseAdmin.rpc("search_study_chunks", {query_embedding: [...]})
   → PostgreSQL pgvector does cosine similarity
   → Returns top 5 chunks
   → Chunks injected into Claude system prompt as context
   → Claude responds with grounded UPSC answer
```

### Discussion topic
"I'll explain how an answer gets evaluated by AI. You explain how a study PDF becomes searchable vectors. Together, draw the FULL RAG cycle on a whiteboard — from admin uploading a PDF to a student asking Jeet AI a question and getting a grounded answer. Label every step with the file and function that handles it."

---

## WEEK 10 — Security (CORS, Rate Limiting, Helmet, Encryption)

**Concepts:** Why CORS exists. Why rate limiting protects your API. What Helmet headers do (XSS protection, CSP, HSTS, clickjacking). Why errors should never leak stack traces. How PII is protected. Why minimum password length matters.

### Manasa — Read these files

| File | Focus |
|---|---|
| `src/index.ts` | Find `app.use(helmet(...))` — what headers does Helmet set? Find `app.use(cors(...))` in `src/config/index.ts` — what origins are allowed? Why not `*`? |
| `src/middleware/rateLimit.ts` | **Read every line.** Why 4 different limiters? Why is the AI limiter (10/15min) so much tighter than the general limiter (50K/15min)? What does Redis add vs in-memory? |
| `src/config/redis.ts` | How Redis backs the rate limiter. What happens if Redis is down? |
| `src/validators/auth.validators.ts` | Minimum password length = 8. Why? What other validations should exist? |

### Suri — Read these files

| File | Focus |
|---|---|
| `src/middleware/errorHandler.ts` | In production, the error handler returns `"Internal server error"` without the actual error message. Why? What would an attacker do with a stack trace? |
| `src/middleware/upload.ts` | File size limits (10MB single, 50MB PDF). MIME type checking. Magic byte verification. Why can't you trust the file extension? |
| `src/middleware/auth.middleware.ts` | Security review: how does the JWT get verified? What happens if someone sends a tampered token? What happens if the token is from a different Supabase project? |
| `src/config/supabase.ts` | Row Level Security (RLS). The `supabaseAnon` client respects RLS — the database itself blocks unauthorized access. The `supabaseAdmin` client bypasses RLS — only used in trusted server code. Why the separation? |
| `prisma/schema.prisma` | Find the `CalendarSyncSetting` model (line 499-519). See `googleAccessTokenEncrypted` — why is it stored encrypted? What happens if the database gets dumped? |

### Discussion topic
"I'll explain rate limiting — how it stops abuse. You explain why errors don't leak details. Together: list every security layer in the app. What would you add?"

---

## QUICK REFERENCE — Who Reads What Each Week

| Week | Topic | Manasa reads | Suri reads |
|---|---|---|---|
| 1 | HTTP | `index.ts`, `routes/index.ts` (health check, route mounts, status codes) | `dailyMcq.routes.ts`, `dailyMcq.controller.ts` (GET/POST handlers, `req`/`res` shapes) |
| 2 | Request flow | Trace `POST /api/daily-mcq/submit` through all 10 steps | Trace `GET /api/editorials/today` through all 7 steps |
| 3 | Middleware | `auth.middleware.ts`, `validate.ts`, `rateLimit.ts` | `errorHandler.ts`, `requestId.ts`, `upload.ts`, `adminAuth.ts` |
| 4 | Auth | `auth.controller.ts` (signup/login/OAuth/refresh), `validators/auth.validators.ts` | `auth.middleware.ts` deep read, `config/supabase.ts` (clients + JWKS) |
| 5 | Database | `schema.prisma` lines 1-700, `config/database.ts` | `schema.prisma` lines 700-1712, `prisma-daily-mcq.repository.ts` |
| 6 | Transactions | `billing.controller.ts` ($transaction), `subscription.controller.ts` (trial race) | `dailyMcq.controller.ts` (double-submit), `prisma-daily-mcq.repository.ts` (upsert), `dailyContentJob.ts` (duplicate sets) |
| 7 | Payments | `billing.controller.ts` (all 881 lines), `razorpayGateway.service.ts` | `billing.routes.ts`, `pricing.controller.ts`, `admin/pricing.controller.ts`, `subscription.controller.ts`, Order/Payment/Subscription models |
| 8 | Real-time | `routes/index.ts` (study-room polling), `dailyAnswer.controller.ts` (eval status polling), WebSocket vs polling research | `pushNotifications.js`, `pushDevices.js`, `pyqMains.controller.ts` + `mockTestMains.controller.ts` (polling), FCM research |
| 9 | AI | `llm.ts`, `answerEvaluator.ts`, `checkedCopyPlanner.ts`, `checkedCopyGenerator.ts`, `checkedCopyValidator.ts` | `embedding.service.ts`, `chunking.service.ts`, `studyMaterialVectorizer.ts`, `mockTestRag.service.ts`, `ai.controller.ts` (RAG flow + system prompt) |
| 10 | Security | `index.ts` (Helmet/CORS), `rateLimit.ts`, `redis.ts`, `validators/auth.validators.ts` | `errorHandler.ts`, `upload.ts`, `auth.middleware.ts` (JWT security), `config/supabase.ts` (RLS), `CalendarSyncSetting` (encrypted tokens) |

---

## How To Run This

- **Monday:** Both read the concepts section for the week (30 min)
- **Tuesday-Thursday:** Each reads their assigned files. Takes notes. Writes down questions
- **Friday:** 45 min discussion. Manasa teaches Suri what she learned. Suri teaches Manasa what he learned. Write the answers on a shared document
- **Weekend:** Re-read anything that was confusing

---

## Prisma Model Quick Reference

| Group | Models |
|---|---|
| **Auth** | `User` |
| **Daily MCQ** | `DailyMCQ`, `MCQQuestion`, `MCQAttempt`, `MCQResponse`, `UserSeenMCQ` |
| **Daily Mains** | `DailyMainsQuestion`, `MainsAttempt`, `MainsEvaluation` |
| **Editorials** | `Editorial`, `EditorialProgress`, `EditorialBookmark` |
| **Mock Tests** | `MockTest`, `MockTestQuestion`, `MockTestAttempt`, `MockTestMainsAttempt`, `MockTestMainsEvaluation` |
| **Test Series** | `TestSeries`, `TestSeriesTest`, `TestSeriesQuestion`, `TestSeriesAttempt`, `UserSeriesEnrollment` |
| **PYQ** | `PYQQuestion`, `PYQMainsQuestion`, `PYQUpload`, `PyqPrelimsAttempt`, `PyqMainsAttempt`, `PyqMainsEvaluation` |
| **RAG / Vectors** | `StudyMaterialUpload`, `StudyMaterialChunk`, `MockTestMaterialUpload`, `MockTestChunk`, `TopperDocument`, `TopperDocumentPage`, `TopperAnswer`, `TopperAnswerEmbedding` |
| **Money** | `PricingPlan`, `Order`, `Payment`, `Subscription` |
| **Study Planner** | `StudyPlanTask`, `CalendarSyncSetting`, `StudyStreak`, `WeeklyGoal`, `SyllabusCoverage` |
| **Content** | `VideoSubject`, `Video`, `VideoQuestion`, `MentorQuestion`, `Subject`, `Chapter`, `StudyMaterial`, `FlashcardDeck`, `Flashcard`, `UserFlashcardProgress`, `MindmapSubject`, `Mindmap`, `UserMindmapProgress`, `SpacedRepItem`, `SpacedRepSeed` |
| **Community** | `ForumPost`, `ForumAnswer`, `ForumVote`, `ForumBookmark`, `StudyGroup`, `StudyGroupMember`, `GroupMessage`, `Bookmark` |
| **Syllabus** | `SyllabusSubject`, `SyllabusTopic`, `SyllabusSubTopic`, `SyllabusTrackerState` |
| **AI/Chat** | `ChatConversation`, `ChatMessage`, `AiUsageLog` |
| **Mental Health** | `MoodCheckIn`, `WellnessStreak`, `MindToolSession`, `JournalEntry` |
| **Support/Admin** | `SupportTicket`, `Faq`, `Feedback`, `ContactSubmission`, `Testimonial`, `MentorBooking`, `Notification`, `Page`, `PageSection`, `UserActivity`, `UserStreak` |
