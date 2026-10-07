# Pre-Phase 2 Senior Code Audit

Repository: `Rohitkarma62/Crm-core-v1`
Base reviewed: `main`
Audit branch: `pre-phase2-bug-audit-fixes`
Review date: 2026-10-07

## Scope
Reviewed Expo/React Native bootstrap, SQLite schema/migrations, Zustand state and mutation flows, Lead → Customer → Sale → Payment → Invoice lifecycle, customer profile/reports, local file storage, invoice HTML/PDF generation, navigation, Android CI, validation and error handling.

## Findings and fixes

### P0 / Critical
None confirmed in this review.

### P1 / High
1. **Invoice HTML accepted raw user/business text.** Customer name, owner, work description, terms, phone and dates were injected into HTML without escaping. This could corrupt invoice markup or create unintended HTML. **Fixed:** added `escapeHtml()` and escaped dynamic invoice text.

2. **Local logo/signature were passed directly to HTML-to-PDF.** Native PDF engines may not resolve app-private local URIs reliably, causing branded assets to disappear. **Fixed:** assets are read from local storage and embedded as data URIs.

3. **Settings used the deprecated Expo FileSystem surface.** Expo SDK 54 documents the old methods as deprecated on the main surface and recommends the legacy import for compatibility. **Fixed:** Settings now imports `expo-file-system/legacy`.

4. **Committed mutations could be reported as failures after the database write succeeded.** Mutation methods treated post-write refreshes as part of the write's failure path. **Fixed:** post-mutation refreshes are best-effort and no longer turn a committed write into a false failure.

5. **UPDATE/DELETE operations did not verify affected rows.** SQLite can legitimately report zero affected rows without throwing, so stale records could appear to save/delete successfully. **Fixed:** affected-row checks added for lead/customer/sale mutations and lead-stage changes.

6. **Payment screenshots were always stored with a `.jpg` extension.** PNG/WebP/HEIC bytes could therefore have a misleading extension. **Fixed:** supported source extensions are preserved.

### P2 / Medium
7. **Hand-written package-lock was incomplete.** It contained only root dependency declarations and no resolved dependency graph, so it was not a real reproducible npm lockfile. **Fixed for correctness:** removed the incomplete lockfile and removed CI npm caching that depended on it. **Remaining improvement:** generate a real lockfile in a controlled environment before moving CI to `npm ci`.

8. **Phone normalization could create duplicate Indian customers.** `9876543210` and `+91 9876543210` previously stored differently. **Fixed:** standard Indian 10-digit and +91 12-digit numbers are canonicalized.

9. **Startup ActivityIndicator was nearly invisible on the black screen.** **Fixed:** indicator is now white.

## Existing integrity protections confirmed
- Payment insertion and sale/customer recalculation use an exclusive SQLite transaction.
- Over-collection is rejected.
- Foreign keys are enabled and dependent records cascade.
- Money input is validated and rounded to two decimals.
- Lead conversion is transactional.
- Invoice numbers use UPSERT.
- Dashboard collection is derived from the payment ledger.
- Expo SDK 54 ImagePicker `mediaTypes: ['images']` is supported.

## Remaining engineering debt
- No meaningful automated unit/integration test suite yet.
- Store still mixes database access, business rules and UI-facing state orchestration.
- Ledger calculation is duplicated across payment mutation/delete paths.
- Local invoice/payment files need centralized lifecycle cleanup.
- More domain invariants should eventually be enforced at SQLite level.
- A real generated lockfile should be added before using `npm ci`.

## Conclusion
Confirmed defects found in this pass are fixed on the audit branch. The remaining items are architectural/testability improvements and should be handled deliberately in Phase 2.