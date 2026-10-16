# GuestSetGo

Digital guest guidebooks for holiday lets. Hosts sign up, build a guidebook from their phone (photo how-tos with tap-to-mark dots, walking routes, check-out form), pay with Stripe, and share a QR code with guests.

**Stack:** Next.js 14 (App Router) on Vercel · Firebase Auth, Firestore and Storage · Stripe Checkout, Billing Portal and webhooks.

## What's in it

| Area | Path | What it does |
| --- | --- | --- |
| Landing page | `/` | Marketing page, pricing, sign-up links. Static sample at `/demo.html`. |
| Sign in / sign up | `/login`, `/signup` | Email and password, or Google. Password reset. |
| Host dashboard | `/dashboard` | List and create guidebooks, see what's live against the plan. |
| Guidebook editor | `/dashboard/properties/[id]` | Every section, photo uploads with numbered dots, local picks with Google Maps walking routes, check-out tasks, QR code and door sign downloads, check-outs and ratings from guests. Live phone preview. |
| Billing | `/dashboard/billing` | Monthly/annual Host hosting, Agency hosting and optional assisted setup through Stripe Checkout. |
| Folder conversion | Property > separate Welcome folder conversion page | £79 purchase required before document uploads or AI drafts. Converts folder pages, brochures and cards. House photos and markers remain in the normal editor, with laptop drag-and-drop. |
| Adoption tools | Dashboard / property feedback | Duplicate as an offline draft; approximate guide-open counters exclude editor previews. |
| Guest page | `/g/[slug]` | The live guidebook. Guests submit check-outs and rate local places without signing in. |
| Admin | `/admin` | Revenue, accounts (founding and free toggles, notes), all guidebooks, payments, and every rated local place across the platform with CSV export. Only emails in `ADMIN_EMAILS`. |

### Plans

- **Host** — £6/month or £60/year per property. No mandatory setup fee.
- **Agency** — £4 a month per property, minimum 5.
- **Assisted setup** — optional £79 once per property, converting one batch of up to eight supplied photos into a manual draft. Hosting is separate. Additional portfolio migration is quoted separately.
- **Trial** — one property for 30 days, starting on first publication; no card or automatic renewal. Existing Starter purchases retain their original term.

A guidebook can only be put live if the host's plan has room. If a subscription is cancelled or reduced, the newest guidebooks go offline automatically.

## Setting it up

### 1. Firebase (about 10 minutes)

1. Go to <https://console.firebase.google.com>, **Add project**, name it `guestsetgo`.
2. **Build > Authentication > Get started.** Enable **Email/Password** and **Google**.
   In **Settings > Authorized domains**, add `guestsetgo.com` and your `*.vercel.app` domain.
3. **Build > Firestore Database > Create database** (production mode, region `europe-west2` London).
4. **Build > Storage > Get started** (same region).
5. **Project settings > General > Your apps > Web (</>)**. Register an app; copy the config values into the `NEXT_PUBLIC_FIREBASE_*` variables.
6. **Project settings > Service accounts > Generate new private key.** From the downloaded JSON, copy `project_id`, `client_email` and `private_key` into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Never commit this file.
7. Deploy the security rules (Firestore is locked to the server; Storage lets hosts upload only to their own folder):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add        # pick the guestsetgo project
   firebase deploy --only firestore:rules,storage
   ```
   Or paste `firestore.rules` and `storage.rules` into the Rules tabs in the console.

### 2. Stripe (about 10 minutes)

1. In the Stripe dashboard (start in **Test mode**), copy the secret key.
2. Create the products and prices:
   ```bash
   node --env-file=.env.local scripts/stripe-setup.mjs --write-env
   ```
   This creates monthly Host, annual Host, Agency and assisted prices plus separate billing portals. It saves IDs to `.env.local` without printing secrets. For live credentials add `--live`. Existing subscriptions and legacy Starter prices are retained. New checkouts do not accept legacy founding coupons.
3. **Developers > Webhooks > Add endpoint:** `https://www.guestsetgo.com/api/stripe/webhook` with these events. Use the canonical `www` address directly: Stripe treats domain redirects as failed deliveries.
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. The catalog script configures separate billing portals: Host permits monthly/annual changes; Agency enforces a five-property minimum. Both allow invoices, payment methods and cancellation.
5. When you're ready to take real money, repeat steps 1–3 in Live mode and swap the variables in Vercel.

### 3. Vercel (about 5 minutes)

1. <https://vercel.com/new> → import the `guestsetgo` GitHub repo. Framework: Next.js (detected).
2. Add every variable from `.env.example` under **Settings > Environment Variables**. Set `NEXT_PUBLIC_SITE_URL=https://guestsetgo.com` and `ADMIN_EMAILS` to your email.
3. Deploy. Then **Settings > Domains**, add `guestsetgo.com` and `www.guestsetgo.com`, and set the DNS records Vercel shows you in GoDaddy (an `A` record for the root and a `CNAME` for `www`).

### 4. First run

1. Sign up at `/signup` with the email in `ADMIN_EMAILS`. You'll see **Admin** in the top bar.
2. In Admin > Accounts, tick **Free** on your own account so you can put guidebooks live without paying.
3. Create "The Signal Loft" as your demo guidebook, fill it in from your phone, put it live, and share `/g/the-signal-loft` with hosts.
4. Test a payment with card `4242 4242 4242 4242`, any future date and any CVC.

## Local development

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

To test webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the `whsec_` it prints.

## Data model (Firestore)

- `users/{uid}` — email, name, plan, quantity, subscriptionStatus, stripeCustomerId, starterPaidAt, founding, comp, note
- `properties/{id}` — owner, slug, published, all guidebook content, photoGuides (image URL + dots), picks, counters
  - `checkouts/{id}` — guest name, tasks done and missed, issues, stay rating
  - `reviews/{id}` — local pick rated, stars, would recommend, tip
- `payments/{id}` — written by the Stripe webhook

Photos live in Storage at `uploads/{uid}/{propertyId}/`.

Assisted source photos are saved by the authenticated server under `private-imports/{uid}/{propertyId}/`; client Storage rules deny access. Admin uses 15-minute signed links. Request metadata lives at `properties/{id}/imports/assisted`. AI self-service imports send photos to OpenAI and do not persist originals. Set `OPENAI_API_KEY`; optionally set `OPENAI_IMPORT_MODEL` (defaults to the existing vision model, `gpt-4o-mini`). Ten conversions per account per UTC day are enforced in Firestore.

Folder conversion requires a confirmed £79 purchase on the property before GET or POST access, including AI draft actions and admin preparation. Comp accounts and hosting subscriptions do not unlock it. Stripe returns purchasers to `/dashboard/properties/{id}/folder-conversion`. The ordinary House photos & instructions editor supports drag-and-drop, multiple photo cards and numbered markers without this purchase.

Assisted fulfilment: Admin > Assisted setup > open photos > prepare the property draft offline > mark ready > contact the host by email. The host reviews and publishes. Customer email is manual.

Run `node --test` for billing/import regression checks and `npm run build` for production compilation. Never use live cards for integration tests.
