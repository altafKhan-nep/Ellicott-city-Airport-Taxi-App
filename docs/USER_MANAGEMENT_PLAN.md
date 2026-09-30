# User Management Enhancement — Plan & Implementation Guide

**Scope:** Passenger, Driver, and Admin profiles with modern auth, photo upload, driver
onboarding, and admin verification — without changing the existing website design.

**Constraint:** The web app's UI is frozen. All new work lands in the **mobile app** and the
**shared backend**. The website keeps its current design exactly.

---

## 1. Executive Summary

The system already has the right bones: a `User` model with `role`, `driverDetails`, and
`avatar`; Passport JWT auth with refresh-token rotation; per-role client sessions; and a
shared MongoDB that both clients read. What is missing is the **profile layer** — the flows
that let a person become a passenger, become a *verified* driver, and let an admin govern
both.

This document covers the gap, the design, and the execution order.

### What exists today

| Capability | Status |
|---|---|
| `role: passenger \| driver \| admin` on `User` | ✅ |
| `driverDetails` (vehicleType, plateNumber, licenseNo, isAvailable, stats) | ✅ |
| Login with role-based redirect (driver → `/driver`, admin → `/admin`) | ✅ |
| Registration with passenger/driver role selection | ✅ |
| Avatar upload (`POST /api/users/me/avatar`, base64 ≤512 KB in Mongo) | ✅ |
| Profile edit (name, phone, password) | ✅ |
| Admin: suspend/unsuspend/delete users, assign drivers, analytics | ✅ |
| `protect`, `requireRole`, `requirePerm` middleware | ✅ |
| Shared DB + API across web and mobile | ✅ |

### What is missing

| Gap | Impact |
|---|---|
| Driver registration does **not** collect vehicle info | Drivers sign up with an empty `driverDetails` |
| No driver **verification** workflow | Any self-registered driver is immediately bookable |
| No mobile-native profile screens | Mobile users get the desktop `/profile` page |
| No mobile admin driver-review UI | Admins can only manage drivers from the web CRM |
| Avatar stored as base64 in MongoDB | Does not scale; bloats every `User` read |
| No driver onboarding step after registration | No document/vehicle capture at creation |

---

## 2. Design Principles

1. **One source of truth.** All profile data lives in the shared `User` document. The mobile
   app and the website read the same fields — no duplication, no sync.
2. **The website does not change.** New screens are mobile-only. The web CRM keeps its
   existing tabs and layout.
3. **Progressive enhancement.** Every new field is additive and nullable. Existing rides,
   payments, and sessions keep working throughout.
4. **Fail closed.** A driver who has not been verified cannot receive ride requests.
5. **Uploads are validated, not trusted.** Type, size, and content are checked server-side.

---

## 3. Target Architecture

### 3.1 Data model changes

All changes are **additive** to the existing `User` schema. Nothing is renamed or removed.

```js
// User — new fields
role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },

driverDetails: {
  vehicleType:   { type: String, enum: [...9 fleet ids], default: 'economy-sedan' },
  plateNumber:   { type: String, default: '' },
  licenseNo:     { type: String, default: '' },
  isAvailable:   { type: Boolean, default: false },
  stats: { totalRides, rating, ratingCount, compliments },

  // NEW — verification workflow
  verificationStatus: {
    type: String,
    enum: ['none', 'pending', 'verified', 'rejected'],
    default: 'none',
  },
  verificationSubmittedAt: Date,
  verificationReviewedAt:   Date,
  verificationReviewedBy:   { type: ObjectId, ref: 'User' },
  verificationNote:         { type: String, default: '' },   // reason when rejected

  // NEW — documents captured at onboarding
  documents: [{
    kind: { type: String, enum: ['license', 'insurance', 'registration', 'inspection'] },
    image: String,          // data-URL or object-store key
    uploadedAt: Date,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  }],
},

// NEW — passenger profile detail (kept separate from driverDetails)
passengerProfile: {
  preferredPayment: { type: String, enum: ['card', 'cash'], default: 'card' },
  homeAddress:  { address: String, lat: Number, lng: Number },
  workAddress:  { address: String, lat: Number, lng: Number },
  emergencyContact: { name: String, phone: String },
},
```

**Why `verificationStatus` and not a boolean.** A boolean cannot express *pending* — the
state a driver is in between submitting documents and an admin reviewing them. The four-state
enum makes the admin queue meaningful and gives the driver a real status to see.

**Why `passengerProfile` is separate from `driverDetails`.** A passenger has no vehicle; a
driver has no home/work address. Keeping them apart means neither carries dead fields.

### 3.2 Avatar storage — migration path

Today: `avatar` is a base64 data-URL stored on the `User` document (≤512 KB).

Problem: every `GET /api/users/me` and every admin user list deserialises up to 512 KB of
base64 per user. At 10 000 users that is ~5 GB of redundant transfer.

**Target:** object storage (S3-compatible) with a key on the user document.

```js
avatar: {
  key: String,        // 'avatars/<userId>/<file>.jpg'
  url: String,        // signed or public URL
  updatedAt: Date,
}
```

**Migration (non-breaking):**

1. Add the new `avatar` sub-document alongside the existing `avatar` string.
2. On upload, write to object storage **and** keep the base64 for one release.
3. On read, prefer `avatar.url`; fall back to the legacy base64 string.
4. Backfill existing avatars with a one-off script.
5. Drop the legacy string in a later release.

Until object storage is configured, the endpoint keeps accepting base64 — so the feature
ships without blocking on infrastructure.

### 3.3 API design

All new endpoints are additive. None change existing request/response shapes.

```
# Driver onboarding
POST   /api/users/me/driver-details        create/update vehicle + documents
GET    /api/users/me/driver-details        current onboarding state + status

# Avatar (existing, extended)
POST   /api/users/me/avatar                now also accepts multipart
DELETE /api/users/me/avatar                unchanged

# Admin — driver verification
GET    /api/admin/drivers?status=pending  list drivers by verification status
POST   /api/admin/drivers/:id/verify      { status: 'verified' | 'rejected', note }
GET    /api/admin/drivers/:id             full driver profile incl. documents

# Admin — overview (existing, extended)
GET    /api/admin/analytics                add verification funnel counts
```

**Authorization:** every admin route already sits behind `requireRole('admin')`. The new
routes reuse it — no new middleware.

### 3.4 Auth flow (unchanged)

The existing Passport JWT + refresh-rotation flow is correct and stays as-is:

```
login → 15 min access JWT + opaque refresh token (hashed, TTL index)
       → per-role client keys (rt_<role>_access / rt_<role>_refresh)
401 → queued refresh → rotate → retry
```

The only addition: after registration, a driver is created with
`verificationStatus: 'pending'` and is **not** bookable until an admin verifies them.

---

## 4. UI/UX Design

### 4.1 Registration — role selection first

The existing `Register.jsx` already offers passenger/driver role selection. The change is
what happens **after** the role is chosen:

```
Step 1  Account        name · email · phone · password
Step 2  Role           Passenger | Driver   (cards, not a dropdown)
Step 3a (passenger)    Done → verify email
Step 3b (driver)       Vehicle  · type, plate, license
                      Documents · license, insurance, registration (photo upload)
                      → Submit for review
```

The driver step is a **separate screen**, not a longer form. One concept per screen.

### 4.2 Login — unchanged, verified

`Login.jsx` already redirects by role. No change. The only addition is a banner for drivers
whose verification is pending or rejected:

> "Your driver account is awaiting review. You'll be notified once an admin approves it."

### 4.3 Mobile profile screens (new)

Today `MobileProfile.jsx` is a list of links to the desktop `/profile` page. Replace with
native screens:

**Passenger**
- Identity card (avatar, name, role badge)
- Edit name / phone
- Avatar upload (camera + gallery)
- Home / work addresses (tap to set on map)
- Emergency contact
- Preferred payment method
- Change password
- Sign out

**Driver** — everything above, plus:
- Vehicle card (type, plate, license) — read-only once verified
- Verification status banner (none / pending / verified / rejected + note)
- Documents list with per-document status
- Availability toggle (existing `PATCH /api/drivers/availability`)

**Admin**
- Identity card
- Quick stats (pending drivers, total users, rides today)
- Link to driver review queue
- Link to existing web CRM for everything else

### 4.4 Admin driver verification (mobile)

A review queue, not a table:

```
Pending review (3)
┌─────────────────────────────┐
│  Alex Rivera                │
│  Executive Sedan · ABC-1234 │
│  License  · Insurance  · Reg│  ← thumbnails, tap to enlarge
│  [Reject]        [Approve]  │
└─────────────────────────────┘
```

- Approve → `verificationStatus: 'verified'`, driver becomes bookable
- Reject → requires a note, shown to the driver
- Every action writes `verificationReviewedAt` / `verificationReviewedBy`

### 4.5 Design tokens

Reuse the existing system. No new colours.

| Token | Use |
|---|---|
| `brand-500/600/700` | Primary actions, active states, links |
| `success-500/600` | Pickup dot, verified badge |
| `signal-500/600` | Rejected, destructive |
| `gold-500` | Pending / awaiting review |
| `accent-50/100/200` | Field fills, dividers, borders |
| `ink` / `muted` | Text |

Radius: `20px` cards, `14px` inner surfaces, `pill` for buttons and chips.

---

## 5. Security

| Control | Implementation |
|---|---|
| Password hashing | bcrypt, cost 12 (existing) |
| JWT | 15 min access, opaque rotating refresh (existing) |
| Session revocation | `tokenVersion` bump on password reset / admin suspend (existing) |
| Avatar upload | Validate MIME + magic bytes, ≤5 MB, strip EXIF, re-encode server-side |
| Document upload | Same as avatar; images only; stored with the user |
| Admin authorization | `requireRole('admin')` on every new admin route |
| Rate limiting | Existing auth limiter (10/15 min/IP) covers login/register |
| Input validation | Server-side for every new field; never trust the client |
| IDOR | Drivers can only read/write their own `driverDetails`; admins only via admin routes |
| Audit | Every verification decision records who and when |

**Avatar re-encoding matters.** A client can send a PNG that is actually an HTML file.
The server must decode and re-encode the image, discarding everything else.

---

## 6. Error Handling & Troubleshooting

### 6.1 Error taxonomy

| Code | Meaning | Client action |
|---|---|---|
| `409 EMAIL_TAKEN` | Email already registered | Show "already have an account? Sign in" |
| `400 INVALID_AVATAR` | Wrong type or too large | Show accepted formats and size limit |
| `400 INVALID_DOCUMENT` | Same, for documents | Same |
| `403 NOT_VERIFIED` | Driver trying to go online | Show pending banner |
| `403 SUSPENDED` | Account suspended | Show contact support |
| `404 DRIVER_NOT_FOUND` | Admin reviewing a deleted driver | Refresh the queue |
| `409 ALREADY_VERIFIED` | Double-approve race | Refresh and show current state |

### 6.2 Troubleshooting guide

| Symptom | Likely cause | Fix |
|---|---|---|
| Driver can't go online after registering | `verificationStatus` is `pending` | Admin approves in the review queue |
| Avatar won't upload | >5 MB or wrong MIME | Check server log for `INVALID_AVATAR` |
| Avatar shows broken after deploy | Legacy base64 still present | Run the backfill script (§3.2) |
| Admin doesn't see pending drivers | Query default filters to `verified` | Pass `?status=pending` |
| Driver sees "rejected" with no reason | `verificationNote` empty | Make the note required on reject |
| Mobile profile shows stale data | Per-role session key mismatch | Sign out and back in (refreshes `rt_<role>_access`) |
| Registration succeeds but role is wrong | `role` not in the POST body | Check the role card sets `form.role` |

### 6.3 Rollback

Every change is additive and behind a feature flag (`USER_MANAGEMENT_V2`). If anything
breaks:

1. Flip the flag off — new screens and routes return 404.
2. The legacy `avatar` string and legacy profile page remain untouched.
3. No data migration is required to roll back; new fields are simply ignored.

---

## 7. Implementation Roadmap

### Phase 0 — Analysis (this document)

- [x] Audit existing `User` model, auth flow, avatar endpoint, admin routes
- [x] Identify the six gaps in §1
- [x] Confirm the website design is frozen

### Phase 1 — Backend foundation

1. Add `verificationStatus`, `documents`, `passengerProfile` to the `User` model.
2. Add `POST /api/users/me/driver-details` and `GET /api/users/me/driver-details`.
3. Add admin routes: `GET /api/admin/drivers?status=`, `POST /api/admin/drivers/:id/verify`.
4. Extend the avatar endpoint to accept multipart and (optionally) object storage.
5. Add the `INVALID_AVATAR` / `INVALID_DOCUMENT` validation helpers.
6. **Verify:** existing register, login, profile, and admin flows still pass.

### Phase 2 — Mobile passenger profile

1. Build the native profile screen (§4.3).
2. Wire avatar upload with camera + gallery.
3. Add home/work address pickers (reuse `LocationSearch`).
4. Add emergency contact and preferred payment.
5. **Verify:** passenger can edit everything and see it reflected on the website.

### Phase 3 — Driver onboarding

1. Add the vehicle + documents step to registration (§4.1).
2. Create the driver profile screen with the verification banner.
3. Block `PATCH /api/drivers/availability` until `verificationStatus === 'verified'`.
4. **Verify:** a new driver registers, submits, and cannot go online until approved.

### Phase 4 — Admin verification

1. Build the mobile review queue (§4.4).
2. Wire approve/reject with the note requirement.
3. Add the verification funnel to `GET /api/admin/analytics`.
4. **Verify:** approve a driver → they can go online; reject → they see the reason.

### Phase 5 — Avatar at scale

1. Configure object storage (or confirm base64 is acceptable for now).
2. Implement the read-preference migration (§3.2).
3. Backfill existing avatars.
4. **Verify:** avatars load from the new path; legacy ones still render.

### Phase 6 — Production hardening

1. Load-test the admin driver list with 10 000 users.
2. Confirm rate limits hold under registration spam.
3. Run the full regression suite (API, payments, idempotency, journeys).
4. **Verify:** no P0/P1 regressions.

---

## 8. Verification Checklist

**Backend**
- [ ] New fields are additive; existing documents validate
- [ ] `POST /api/users/me/driver-details` rejects invalid vehicle types
- [ ] Avatar endpoint rejects a non-image file
- [ ] Admin verify route rejects non-admins with 403
- [ ] Unverified driver cannot toggle availability

**Mobile**
- [ ] Passenger can edit name, phone, avatar, addresses, emergency contact
- [ ] Driver registration collects vehicle + documents
- [ ] Driver sees correct verification status at every state
- [ ] Admin can approve and reject from the phone
- [ ] All three roles can upload a profile photo

**Regression**
- [ ] Existing login / register / profile flows unchanged
- [ ] Website CRM still works (design untouched)
- [ ] Payments, rides, and notifications unaffected
- [ ] `npm run check:contrast` passes

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Object storage not ready | High | Ship base64 first; migrate behind a flag |
| Driver onboarding raises drop-off | Medium | Keep it to two screens; allow saving progress |
| Admin verification becomes a bottleneck | Medium | Add bulk approve; show SLA in the queue |
| Avatar re-encoding breaks transparency | Low | Use a tested library; test PNG with alpha |
| New fields break the web CRM | Low | All additive; CRM selects explicit fields |
| Registration spam | Medium | Existing rate limit + email verification gate |

---

## 10. Success Criteria

1. A passenger can register, upload a photo, and set addresses — on the phone.
2. A driver can register, submit vehicle + documents, and see their review status.
3. An admin can approve or reject a driver from the phone, and the driver's ability to
   receive rides changes immediately.
4. The same data is visible on the website with **zero design changes**.
5. No existing ride, payment, or auth flow regresses.
