# Firestore Rules Setup

This project uses client-side Firebase SDK and enforces authorization through Firestore Rules.

## Files

- `firestore.rules`
- `firebase.json`

## Deploy Rules

1. Install Firebase CLI:

```bash
npm i -g firebase-tools
```

2. Login and select project:

```bash
firebase login
firebase use <your-project-id>
```

3. Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Notes

- These rules enforce master admin controls on admin workspace lifecycle.
- Course access is scoped by `adminId` and user membership.
- Audit logs are immutable (`create` only, no update/delete).
