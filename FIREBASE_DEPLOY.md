# Firebase Hosting auto-deploy

Every push to `main` runs `.github/workflows/firebase-hosting-merge.yml`, which
builds the Vite app (`npm run build` → `dist/`) and deploys it to Firebase
Hosting. Until the credentials below are added, the workflow builds but **skips
the deploy step**, so `main` stays green.

## One-time setup (do this when you're at a keyboard)

Everything is done in **GitHub → repo Settings → Secrets and variables → Actions**.
No code changes required.

### 1. Create the Firebase project + Hosting (if it doesn't exist yet)
- https://console.firebase.google.com → Add project (note the **Project ID**).
- In the project, enable **Hosting**.

### 2. Generate the deploy service account
Easiest path, run locally once (needs the Firebase CLI + your Google login):

```bash
npm i -g firebase-tools
firebase login
firebase init hosting:github
```

When it asks for the GitHub repo, enter `switzloco/TameMane`. It will:
- create a service account with Hosting-deploy permission, and
- store its key as a repo secret automatically.

That secret **must be named** `FIREBASE_SERVICE_ACCOUNT` for this workflow (the
CLI may name it `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` — if so, either rename it
to `FIREBASE_SERVICE_ACCOUNT` or update the `firebaseServiceAccount:` line in the
workflow to match).

> Prefer not to install the CLI? In Google Cloud Console create a service
> account with the **Firebase Hosting Admin** role, download its JSON key, and
> paste the whole JSON as the secret value below.

### 3. Add these in GitHub Actions settings

| Type     | Name                        | Value                                              |
|----------|-----------------------------|----------------------------------------------------|
| Secret   | `FIREBASE_SERVICE_ACCOUNT`  | The service-account JSON (from step 2)             |
| Variable | `FIREBASE_PROJECT_ID`       | Your Firebase project ID (e.g. `tamemane-prod`)    |
| Secret   | `VITE_GEMINI_API_KEY`       | Your Gemini API key (optional but needed for AI)   |

Once `FIREBASE_SERVICE_ACCOUNT` exists, the next push to `main` deploys live.

## ⚠️ Security note on the Gemini key
`VITE_GEMINI_API_KEY` is inlined into the client bundle at build time, so it is
**visible to anyone** who opens the deployed site's JS. Restrict it in Google
Cloud Console (API + HTTP-referrer restrictions) or move Gemini calls behind a
backend before relying on this in production.

## Manual deploy (fallback, no CI)
```bash
npm run build
firebase deploy --only hosting
```
