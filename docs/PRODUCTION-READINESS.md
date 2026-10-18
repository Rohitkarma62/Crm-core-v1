# Production Readiness Gate

This checklist is the release gate for Vishwakarma Fabrication / Welding Workshop CRM. A successful CI APK build alone does not mean the app is production-ready.

## Release blockers

- [ ] Generate and commit `package-lock.json` from the approved dependency set; switch CI from `npm install` to `npm ci`.
- [ ] Confirm Expo SDK / React Native dependency compatibility and keep `expo-doctor` and `expo install --check` green.
- [ ] Add automated tests for payment allocation, partial/full payment status, discounts, customer totals, and backup/restore.
- [ ] Verify database migrations against a copy of a real pre-release database; confirm no customer, sale, invoice, or payment records are lost.
- [ ] Audit backup restore behavior, including missing/corrupt files, duplicate imports, and interrupted restores.
- [ ] Configure a production signing key using GitHub Actions secrets or a secure local signing process. Never commit keystores, passwords, or private credentials.
- [ ] Confirm application ID, version name/code, app label, icon, and release notes.
- [ ] Install the release APK on a physical Android device and test fresh install, upgrade install, offline operation, app restart, invoice/PDF export, backup/restore, and payment flows.
- [ ] Archive the exact release artifact and record its SHA-256 checksum.
- [ ] Only publish after all required checks pass and the release APK has been manually smoke-tested.

## Release evidence

For each release, record:

- Commit SHA:
- CI run URL and result:
- APK artifact URL:
- APK SHA-256:
- Signing method/key alias (never record the password or private key):
- Devices / Android versions tested:
- Tester and test date:
- Known limitations:

## Current baseline (2026-10-18)

- The Android release workflow has a recorded successful run: https://github.com/Rohitkarma62/Crm-core-v1/actions/runs/37804464206
- The workflow ran lint, Expo Doctor, Expo dependency compatibility checks, Android prebuild, release APK build, and artifact upload.
- The recorded run does not prove physical-device behavior or production signing/distribution readiness.
- The repository currently has no committed `package-lock.json`; dependency reproducibility remains a release blocker.

## Safety rules

- Do not commit signing keys, passwords, access tokens, customer data, production backups, or private screenshots.
- Do not overwrite a published release artifact; keep a traceable artifact for each release.
- Do not mark a release ready based only on a green build.
