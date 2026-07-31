# What Would Win — quality and feature pass 0.8.0

**Date:** 31 July 2026
**Branch:** `codex/quality-feature-pass-080`
**Identity:** application 0.8.0 · model 0.5.0 · data 0.5.0 · share v5 · storyboard v3 · custom/history v3

## Delivered

### Authoritative model

- All report depths run the same fixed 15,000 seeded trials; changing explanation depth cannot change the numerical result.
- Group access pressure is contribution-weighted across executable ability routes. Rejected, countered or physically inaccessible routes contribute zero access.
- Outcome resolution distinguishes mutual non-engagement (`draw`) from a one-way executable route and from a two-sided seeded comparison.
- Equal-mobility and quantity-one cases retain side symmetry rather than receiving group-only access/frontage effects.
- `locomotion.arboreal` is an optional versioned field. `conditions.preparationDependent` is an optional versioned ability condition and only activates when the declared preparation state supports it.
- Decisive storyboard inputs exclude draw results at the TypeScript contract. Draw result JSON contains `null` storyboard/narrative fields, and storyboard-only export is disabled.

### Roster and data quality

The canonical roster is 139 profiles: 76 living animals, 21 extinct animals, 38 fantasy/mythology profiles and 4 generic humans.

Added exactly five profiles:

1. Bearded capuchin monkey — arboreal locomotion and preparation-dependent stone use.
2. Bornean orangutan — a high-mass arboreal primate distinct from generic great-ape assumptions.
3. Giant anteater — a specialist mammal with contact anatomy and defensive posture value.
4. Quetzalcoatlus — an extinct large pterosaur with flight/ground access distinct from birds and dragons.
5. Generic wraith — a public-domain spirit profile exposing incorporeal and morale-channel interaction.

Thirty-seven complex profiles now use reviewed structured overrides. Existing chimpanzee, gorilla and baboon assumptions were reviewed alongside the new primates. Generated JSON/CSV, app data, schemas, migrations and 139 provenance records were regenerated together. The semantic vocabulary covers 33 habitats, 61 attack modes and 71 traits; 130 defining mechanical source tokens have an audited route.

### Battle communication

- Verdict: solo/draw/group probability segments, 50% marker, probability-band whisker and stability explanation.
- Quantity: declared → arena usable → active frontage → effective pressure pipeline.
- Navigation: proper keyboard-operable result tabs with associated panels.
- Story: five-stage causal rail, explicit turning point and evidence-backed “What could flip it” path.
- Tactical view: actor, target, outcome, result, model probability, modelled phase time and playback time in the HUD.
- Tactical state: evidence-derived attack access, reserve pressure, cohesion, resources and retreat state; no invented wounds or per-trial events.
- Visual semantics: responsive HTML legend, shared relative scale with readable-clamp disclosure, plus primate and pterosaur archetypes.
- Accessibility/fallbacks: concise live announcements, touch/keyboard states, forced-colour and reduced-motion handling, useful no-WebGL tactical map, and HTML evidence independent of colour or canvas.

### Compatibility

- V5 shares are current; released v4 model/data identities migrate with unchanged scenario/custom inputs.
- V2 custom and history stores are copied to v3, with old bytes retained as recovery copies.
- Arboreal defaults to `false` during v2 custom migration.
- Prior outcomes remain snapshots pending explicit model-0.5 recalculation instead of being relabelled.

## Deliberately deferred

This pass does not claim to deliver:

- full anatomy, wound-channel, action-economy or per-projectile simulation;
- delayed disease/venom timelines;
- mixed-team rosters or summoning as independently simulated combatants;
- global uncertainty distributions or field-by-field scientific sensitivity;
- bespoke anatomical 3D creature models, authored animation sets or audio;
- expert zoological/cultural validation of every authored score;
- exact-final physical iOS/Safari, NVDA, VoiceOver or TalkBack validation;
- website publication as part of this source-tree feature pass; publication uses the separate website release workflow.

These boundaries are intentional. The deterministic numerical engine remains authoritative, while presentation is a validated explanation of that result rather than a replay generator.

## Verification record

- `npm test`: 392/392 Vitest tests passed across 30 files after the complete release audit.
- Semantic audit: 139 profiles, 33 habitats, 61 attack modes, 71 traits, 0 errors and 0 warnings.
- Ability audit: 130 mechanical source tokens routed across 139 profiles.
- Provenance: 139 generated records verified.
- `npm run typecheck`: passed.
- `npm run build`: passed with 178 transformed modules.
- `node scripts/check-static-subpath.mjs`: 7/7 local references resolved under `/apps/what-would-win/`.
- Build budgets: all reviewed ceilings passed; total JavaScript 1,663,672/1,750,000 bytes and total deployable payload 1,940,486/2,050,000 bytes.
- Complete Playwright matrix: 220 total tests — 200 passed, 20 intentional project-scope skips, 0 failed in 8.8 minutes across desktop Chromium, mobile 360 Chromium, Firefox and WebKit.
- Headed exact-build visual review: decisive causal rail, tactical reconstruction and deterministic non-engagement draw captured without observed clipping or overflow.
