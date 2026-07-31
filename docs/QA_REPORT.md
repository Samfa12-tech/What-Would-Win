# What Would Win — application 0.8.0 release QA report

**QA date:** 31 July 2026

**Release identity:** application **0.8.0**, model **0.5.0**, data **0.5.0**, storyboard **v3**, share format **v5**, custom/history storage **v3**

## Verified automated checks on the current worktree

- `npm test`: **392/392 tests passed across 30 Vitest files** after the complete release audit.

- `npm run audit:narrative`: **90/90 passed**.
- `npm run audit:narrative-semantics`: **75/75 passed**.
- Semantic audit: **139 profiles**, 33 habitats, 61 attack modes and 71 traits; **0 errors and 0 warnings**.
- Ability audit: **130 defining mechanical source tokens** routed across all 139 profiles.
- Provenance: **139/139 generated records** verified.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed in 344 ms**, below its two-second gate.
- `npm run build`: passed with Vite 8.1.5 and **178 transformed modules**.
- `node scripts/check-static-subpath.mjs`: **7/7 local references** resolved inside `/apps/what-would-win/`.
- `node scripts/check-build-budgets.mjs`: every reviewed ceiling passed.
- Complete Playwright matrix: **220 total tests: 200 passed, 20 intentional project-scope skips, 0 failed** in 8.8 minutes across desktop Chromium, mobile 360 Chromium, desktop Firefox and desktop WebKit.
- The initial four-worker local run exposed five overload-sensitive timeouts or Firefox teardown failures. Each affected scenario passed in focused reruns, and the final two-worker matrix above passed cleanly; local execution now matches CI concurrency.

## Authoritative model and compatibility coverage

The 0.5 contract fixes every report depth at 15,000 seeded trials, contribution-weights only executable group routes, gives rejected or inaccessible routes zero access, preserves quantity-one/equal-mobility side symmetry and distinguishes mutual non-engagement from one-way and two-way contests. Tests cover decisive outcomes, one-way access, deterministic draws, report-depth invariance, quantity symmetry, arboreal locomotion and preparation-dependent abilities.

Storyboard-v3 creation now requires a decisive simulation result at the TypeScript boundary. Draw result JSON emits `null` storyboard, battle-narrative and reader-narrative fields with an explicit notice; the Story and tactical panels refuse to invent phases, attacks, injuries or a winner. Storyboard-only export is disabled for draws.

V5 shares migrate released v4 model/data identities without changing scenario or custom inputs. V2 custom/history bytes are copied to v3 and retained as recovery copies, v2 custom profiles default `arboreal` to `false`, and prior results stay labelled as snapshots pending explicit model-0.5 recalculation.

## Roster and presentation coverage

The canonical 139-profile roster is 76 living, 21 extinct, 38 fantasy/mythology and 4 generic human profiles. The release adds exactly five profiles: bearded capuchin monkey, Bornean orangutan, giant anteater, Quetzalcoatlus and generic wraith. Thirty-seven complex profiles have reviewed overrides, including the existing chimpanzee, gorilla and baboon assumptions.

The browser matrix covers the probability display and 50% marker, uncertainty band, quantity pipeline, keyboard result tabs, five-stage causal rail, evidence markers, “What could flip it”, tactical HUD/state strips, responsive legend, shared-scale disclosure, primate and pterosaur visual archetypes, reduced motion, forced colours, text spacing, narrow reflow, no-WebGL fallback, exports, share/history migration and draw-safe suppression. Essential meaning remains in HTML rather than relying on colour, canvas or hover.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 456,716 bytes | 460,000 bytes |
| Optional UI JavaScript | 18,632 bytes | 21,000 bytes |
| Presentation JavaScript | 126,711 bytes | 150,000 bytes |
| Lazy tactical runtime JavaScript | 949,295 bytes | 980,000 bytes |
| Model runtime JavaScript | 112,318 bytes | 115,000 bytes |
| Original core JavaScript | 587,666 bytes | 590,000 bytes |
| Total JavaScript | 1,663,672 bytes | 1,750,000 bytes |
| Creature roster | 125,270 bytes | 132,000 bytes |
| Core CSS | 28,510 bytes | 29,000 bytes |
| Reconstruction CSS | 11,883 bytes | 12,000 bytes |
| Total CSS | 40,393 bytes | 41,000 bytes |
| Original core deployable payload | 852,597 bytes | 855,000 bytes |
| Total deployable payload | 1,940,486 bytes | 2,050,000 bytes |
| Social image | 238,563 bytes | 300,000 bytes |

The largest lazy tactical scene is 903,715 bytes raw and remains outside the eager verdict graph. The release adds no external tactical model, texture or audio payloads.

## Exact headed visual evidence

A headed Chromium session inspected the exact production build at 988 × 900 CSS pixels. It confirmed a decisive 96.0% result, the complete five-stage causal rail, minority path, quantity disclosure, tactical map/HUD/state/legend, and a deterministic Vampire-versus-Charybdis mutual non-engagement draw. The captures were visually reviewed for clipping, overflow and hierarchy; none was found.

| Local ignored capture | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `output/playwright/quality-pass-0.8.0/decisive-likely-battle-final.png` | 871 × 1,438 | 309,009 | `42e784bea461d0b193b110e913054f2b55509eace615671406d297643d1a60ab` |
| `output/playwright/quality-pass-0.8.0/decisive-tactical-map-final.png` | 871 × 1,840 | 256,692 | `fbd62c04e170c86037cda2cde068d12103bec2c1ca8672dfef02abc732ad5a65` |
| `output/playwright/quality-pass-0.8.0/tactical-state-final.png` | 886 × 136 | 22,321 | `616b31f718a55e4d0f54f85d845379249f732f65c5cc4110b8647890b91f4421` |
| `output/playwright/quality-pass-0.8.0/tactical-timeline-final.png` | 886 × 103 | 9,801 | `4662ca6559f462ef8404867d28dbe5d3e8e622224e9137c576f43071c2fbd029` |
| `output/playwright/quality-pass-0.8.0/tactical-quantity-final.png` | 886 × 41 | 14,948 | `0132f629ac5d0dcf9c7a768e950213209ff2116bee8b1e2dddeef9a50a12c349` |
| `output/playwright/quality-pass-0.8.0/draw-non-engagement-final.png` | 871 × 232 | 35,880 | `0d1550d112e413de640f6bec06d54709b32aa75630c21c3f9335efc40dbc2439` |

The headed session reported no console errors. Its one warning is Three.js' upstream `THREE.Clock` deprecation; context loss was logged when the lazy tactical canvas was deliberately removed for the draw state.

## Evidence boundaries and remaining risks

- Exact-final physical iOS/Safari and Android validation was **not performed**. Prior Android evidence belongs to an older build and is not 0.8 evidence.
- Real NVDA, VoiceOver and TalkBack validation was **not performed**. Automated axe, keyboard and accessibility-tree results are not substitutes for real assistive-technology checks.
- Physical-device PNG/WebM/JSON download checks and direct GPU/total-scene-memory measurements were **not performed**.
- Website publication is handled by the separate website release workflow after this exact source tree is merged and synced.
- Primitive archetypes communicate category, side and scale; they are not bespoke anatomical models or authored creature animation.
- The model remains aggregate. It does not simulate wounds, anatomy, individual projectiles, delayed disease/venom, mixed teams or per-trial event histories.
- Authored biological, extinct and mythology values still benefit from continued zoological, palaeontological and cultural review.
- Canvas recording remains browser-dependent. The upstream Three.js clock deprecation should be retired during the next dependency/runtime maintenance pass.
