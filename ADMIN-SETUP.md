# Mindspace Admin setup

The admin dashboard and server-side moderation code are in this repository. The dashboard is served at `/admin.html`, but the moderation backend must be deployed to Firebase before its buttons can work.

## One-time Firebase setup

1. Open the Firebase Console and select project **mindspace-59b2d**.
2. Make sure Firebase Authentication has Email/Password sign-in enabled.
3. In Authentication → Users, open the account **leo337657@gmail.com** and make sure its email is verified. The first admin setup call refuses unverified email addresses.
4. Cloud Functions deployment requires the Firebase project to use the **Blaze** billing plan. Check the current Firebase pricing and set a budget alert before enabling billing.

## Deploy the backend and Firestore rules

Install Node.js 22, then open a terminal in a local copy of this repository and run:

```bash
npm install -g firebase-tools
firebase login
firebase use mindspace-59b2d
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```

The deploy command publishes the callable Cloud Functions and the updated Firestore rules. It does not deploy GitHub Pages. GitHub Pages publishes `admin.html` automatically when the repository changes.

## Open the panel

Visit:

`https://anorak1342.github.io/mindspace/admin.html`

Sign in using the existing Mindspace Chat account for **leo337657@gmail.com**. The page calls `initializeMindspaceAdmin`, which grants the admin claim only to that exact, verified email account. Refresh the page if it was already open during deployment.

## Moderation behaviour

- **Kick:** removes the account from all current chat rooms and revokes existing sign-in sessions. The user can sign in again and join a room if they receive a code.
- **Ban:** disables the Firebase Authentication account, records a server-only ban status, removes room memberships, and blocks Firestore chat access.
- **Unban:** re-enables the Firebase Authentication account and clears the ban status. It does not automatically restore old room memberships.

User email addresses are returned only by the administrator-only Cloud Function. The browser does not have permission to list Firebase Authentication users or read server-only user status documents.

## Important current limitation

Mindspace's study dashboard, arcade, and game files are currently static public GitHub Pages content. This backend securely moderates **Mindspace Chat accounts and room access**, but it cannot stop a banned person from opening public study or arcade pages. A genuine whole-site ban requires moving the site's protected content behind an authenticated hosting/access layer and applying the same server-side account checks there. Do not describe the current Chat ban as a complete website ban.
