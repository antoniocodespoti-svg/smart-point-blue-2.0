# Security Specification for User Profile Database

## 1. Data Invariants
- Each user's biometric parameters and budget profile are private and should ONLY be readable or writeable by their authenticated Firebase Auth owner.
- Administrative tools (recharging credits, removing users) must only be accessible by the certified owner account (`bruna65b@gmail.5com`).
- No plain-text passwords should ever be stored in the Firestore database (Firebase Authentication handles credentials securely).

## 2. Secure Access Pillars
- **Zero-Trust Master Gate**: Default deny catch-all `match /{document=**}` for all unmatched routes.
- **Identity Integrity Check**: Verification of user identity mapped directly against `request.auth.uid`.
- **Administrative Quarantine**: List queries are strictly restricted to verified administrative authentication tokens matching `bruna65b@gmail.com`.
- **PII Shielding**: Restricting individual profile read permissions to `isOwner(userId)` and `isAdmin()`.
