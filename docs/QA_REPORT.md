# What Would Win — model 0.3 QA report

**QA date:** 18 July 2026

## Automated checks

- `npm run typecheck`: passing.
- `npm test`: 80 tests passing across engine, calibration, custom-profile, data-contract, history, share-codec and performance suites.
- Calibration: all 16 behavioural fixtures remain inside their documented model-0.3 acceptance bands.
- `npm run test:simulation-budget`: 1/1 passing; the complete technical-depth calibration run remains below the 2-second CI ceiling.
- `npm run test:e2e -- --workers=2`: production build plus 76 Playwright checks across desktop Chromium, 360 px mobile Chromium, Firefox and WebKit; 73 passed and 3 desktop-only skips for the mobile overflow contract.
- `npm run build`: passing with hashed static assets.
- `node scripts/check-build-budgets.mjs`: JavaScript, CSS, runtime total and social-preview budgets all passing.
- Draft 2020-12 validation: all 134 bundled creatures pass; invalid/extra fields, duplicate IDs, cryptid classification, provenance shape and canonical/bundled drift are covered.

The model suite now covers role reversal at quantity one, several fixed-biomass fragmentation levels, bilateral stopping, continuous ranged-resource access, inaccessible-body pressure ceilings, environment-adjusted movement, resized immersion geometry, water-depth precedence on nominally land terrain, bounded starting distance, arena occupancy and arena-usable loss counts, inactive-input random-stream stability, conceptual-threshold continuity, factor-ledger power reconstruction, conceptual factor traceability, preparation caps, escape-adjusted loss estimates and sub-one loss wording. History coverage verifies that previous-version outcomes are recalculated before receiving current-version metadata, while unavailable custom references remain visibly pending.

Browser flows cover searchable roster filtering, suggested briefs, invalid and conceptual quantities, seven-phase ordinary narratives, three-phase conceptual summaries, withheld conceptual duration/loss metrics, the technical factor ledger, the audited resized mouse scenario, methodology persistence, v0.2 share/history recalculation, custom profile save/edit/share, corrupt-storage recovery, JSON export, mobile overflow, install metadata and static assets. Axe scans include the initial UI, custom editor, technical ledger and conceptual results; keyboard focus and disclosure behavior are automated.

## Production build snapshot

- JavaScript: 577,385 bytes (147.98 kB gzip) against a 580,000-byte budget.
- CSS: 24,911 bytes (5.73 kB gzip) against a 25,000-byte budget.
- Runtime payload excluding the crawler-only social image: 705,697 bytes against a 715,000-byte budget; this includes the complete public legal notices.
- Social preview: 238,563 bytes against a separate 300,000-byte budget.
- Vite reports a large single JavaScript chunk; it is within the locked budget but has very little remaining headroom.

## Visual and interaction checks

The production build is exercised at desktop and 360 px mobile widths. Automated checks verify labelled controls, no mobile horizontal overflow, result hierarchy, structured encounter phases, technical disclosures, custom-profile editing, footer/navigation links and the setup-to-verdict return path. Successful browser runs retain the HTML report under `output/playwright/`; traces, screenshots and video are retained on failure. Historical handoff screenshots remain reference material, not proof of the current result design.

Markdown is the canonical product-plan format. The derivative DOCX/PDF copies and their obsolete builder were removed.

## Known QA gaps and risks

- No manual NVDA, VoiceOver or physical Safari/iOS pass has been completed; automated axe and WebKit coverage are present.
- PNG result export is not browser-automated; JSON export is covered.
- Frontage, reserve log-weight, stopping, arena occupancy, duration and losses remain transparent heuristics rather than anatomy, conservation or event-timeline simulations.
- Conceptual quantities deliberately omit logistics and physical staging; a selected bounded arena still caps usable quantity, while open arenas permit aggregate-force calculations.
- Creature values remain curated prototype data and require expert zoological review.
- A tampered or very old share with an unknown non-custom creature ID falls back to the relevant default profile and now raises a visible substitution warning.
- JavaScript and total-payload budgets have narrow headroom; code splitting should precede another large UI or roster expansion.
