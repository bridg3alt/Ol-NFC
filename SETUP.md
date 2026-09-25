# Olvia setup

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and click **Create a project**.
2. Name it (for example `olvia-nfc`). Google Analytics is not needed; turn it off.
3. Stay on the free **Spark** plan. Nothing in Olvia needs the paid plan.

## 2. Turn on sign-in

1. In the left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → enable the first switch → **Save**.
3. **Settings** tab → **Authorized domains**: `localhost` should already be listed.
   After deploying you will add your Vercel domain here too.

## 3. Create the database

1. **Build → Firestore Database → Create database**.
2. Location: pick the one closest to you (for India, `asia-south1` Mumbai).
   This cannot be changed later.
3. Choose **Start in production mode**. That starts with everything locked;
   step 5 uploads Olvia's own rules.

## 4. Register the web app and copy the config

1. Project overview (house icon) → **Add app** → the web icon `</>`.
2. Nickname `olvia-web`. Do **not** tick Firebase Hosting (we use Vercel).
3. Firebase shows a `firebaseConfig` object. Copy each value into `.env`:

```bash
cp .env.example .env
```

| `firebaseConfig` key | `.env` variable |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

`.env` is listed in `.gitignore`, so it is never committed.

## 5. Upload security rules and indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick the project from step 1, alias "default"
firebase deploy --only firestore:rules,firestore:indexes
```

Rules decide who can read and write each document. Indexes let Firestore answer
the app's sorted queries; without them some screens show a "requires an index"
error. Index building can take a few minutes after deploy.

## 6. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000 and create an account. Restart `npm run dev` after
any change to `.env`: environment variables are read only at startup.

## Voice recordings

Firebase Storage needs the paid Blaze plan, so recorded caregiver voice prompts
are stored inline in Firestore as data URLs, capped at 20 seconds
(`MAX_RECORDING_SECONDS` in `src/services/storage.ts`) to stay under
Firestore's 1 MiB document limit.
