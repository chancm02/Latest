# ONE-PASS HANDOFF — Edge Bankroll Dashboard deployment

The user approved a **PUBLIC, READ-ONLY** GitHub Pages website under `chancm02`.
The user explicitly requested the entire deployment. Do not request or disclose credentials in chat.
If an interactive login is needed, use GitHub's authentication UI.

1. Unpack `edge-bankroll-github-pages-ready.zip` (preserve hidden `.github/` directory).
2. Inspect `data/dashboard.json`: it contains a public, user-approved historical paper ledger snapshot.
   Its `publishedAt` timestamp is **historical**; do not call it live.
3. Authenticate the GitHub CLI using the user's account, or use GitHub's browser UI.
4. From the extracted folder, run `bash deploy.sh`, OR perform the exact equivalent:
   a. Create public `chancm02/edge-bankroll-dashboard` (separate from existing private repo).
   b. Commit site files including `.github/workflows/publish.yml` to `main`.
   c. Set Settings > Pages > Source: GitHub Actions.
   d. Run `Publish Edge Dashboard`; wait for **successful** deployment.
   e. Open the actual returned Pages URL. Check mobile width, the three paper bet cards, two
      bankroll tiles, pending counts, stale snapshot warning, and score feed timestamps.
5. Score updater uses unofficial ESPN public JSON endpoints and scheduled Pages deployments.
   Do not present scores as instantaneous or use them to settle paper positions.
6. Do not touch, expose, or make public `chancm02/edge-bankroll-api`.
7. **Automatic ledger sync is a distinct private backend task:** arrange an approved read-only
   exporter from *committed, complete* Bets + Portfolio Summary reads to a sanitized JSON
   snapshot in the public dashboard repository; store any repository-scoped publishing
   token ONLY as an Actions secret in the PRIVATE backend. Avoid duplicating the ledger writer.
   Validate completeness, consistent ledger hash, ROI, bankroll and payout calculations.
   Do not alter budget or publish a token or Google private key.
8. Report the deployed URL only after verifying it. If auto-export isn't installed, explicitly
   identify the ledger as a historical snapshot, not automatically updating.

Don't place bets, settle records, or transfer money as part of deployment.
