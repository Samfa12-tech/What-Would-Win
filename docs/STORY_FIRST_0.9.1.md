# Story-first UX release 0.9.1

This focused presentation release keeps model 0.5.0, data 0.6.0, 159 profiles,
15,000 trials, share v5, storyboard v3 and custom/history storage v3 unchanged.
The source branch starts at the released local `origin/main` commit `9e66287`.
Owner checkouts and the active Horde/Reef jobs were left alone. Testing uses
dedicated local servers and browser touch emulation, without the phone.

## Product behaviour

Three existing matchup presets now precede the Simple contestant controls.
They populate the same scenarios as Deep dive and lead into editable conditions.
Simple resizing descriptions use plain language; precise methodology stays in
Deep dive. The result names both contestants, quantities and size modifications,
then labels its percentage as a model estimate with the adjacent notice:
“In this model, not a real-world prediction.” Relative size is stated as a
per-creature mass ratio; no area/volume/silhouette drawing implies false geometry.

The written opening, turning point and finish lead the result in DOM order and
responsive layout. The finish can include the existing selected resolution
mechanism and its evidence when it fits the 45–150-word story budget. Reasons
and the other side's best chance remain downstream of the fixed result. The
mandatory non-trial-replay notice appears before the story. Sensitivity prose
describes a reversed underlying advantage rather than claiming a newly sampled
winner. Draws never manufacture a decisive story.

Environment editing returns to the displayed result's scenario and resources.
Doubling and crossover actions re-run the existing numerical engine with the
same scenario seed, story seed and resources, then save through existing history.
The crossover comes from the existing 50/50 search; it is an approximate
deterministic crossover, not a guaranteed 50% sampled result. Quick actions use
whole exact counts up to 10^12 and explain unavailable/extreme/one-way cases.
Deep dive keeps the model's wider logarithmic input range.

The animated battle tab, playback/diorama entry and its lazy imports are removed
from the product. There is no replacement animation CTA. Written Story/Analyst,
phase-by-phase evidence and JSON exports remain. Historical renderer source and
unit fixtures are retained for recoverability, but build gates reject an emitted
tactical runtime or entry. No dependency version, service or credential changed.

## Narrative capability and limits

The current deterministic narrative machinery supports meaningful variation:
resolved identities/scale, battlefield medium and movement, quantities and real
reserve availability, selected physical/ability factors, counters, limited
resources, alternate sensitivity conditions and the selected defeat condition.
It already supports water, flight, one-way access, close results and conceptual
crowds. This pass reuses those mechanisms instead of adding a second story engine.
It does not record individual trial events, anatomy, wounds or exact strike order.
A richer literal battle simulation would require new model semantics and a
separately approved redesign; no external paid AI service is used.

## Validation and evidence

- Full release audits and unit suite: 445 tests across 33 files passed.
- Targeted narrative/release/experiment suite: 44 tests passed.
- Narrative-semantics suite: 97 tests passed; simulation-duration budget passed.
- Typecheck, production build and static-subpath verification passed.
- The complete Playwright matrix and final accessibility regression are release
  gates. Browser evidence must be read with the final run/CI outcome, not inferred
  from an interrupted run. See the PR validation record for the completed counts.
- Visual review covers 1440px desktop, 360px and 412px touch viewports. A cramped
  mobile heading and low-contrast model note found in review were repaired.
- Automated story tests include asymmetric resized duck/horse, elephant/wolves,
  dragon/archers, Medusa, spider/rhinoceros close result, Charybdis/orca in water,
  two porcupines without imaginary reserves, 10^100 conceptual groups, one-way
  wraith access, deterministic repetition/result immutability and all roster
  profiles in both roles. Browser coverage retains custom/history/share recovery.

Actual before/after views are under `assets/evidence-0.9.1/`; working test logs,
traces and three viewport captures remain in ignored `output/`. No physical
phone, iOS Safari device, screen reader hardware or native mobile gesture claim
is made by browser emulation.

## Publication workflow

Build and verify `app/dist` from this source tree. In a clean website worktree,
set `WHAT_WOULD_WIN_ROOT` to this checkout, run `sync:what-would-win`, then
`verify:what-would-win-pages`. Landing prose lives in
`content/game-app-copy.json`; regenerate via `build:content`, verify the content,
SEO and indexing outputs, and review the scoped diff. Use the normal source and
website PR/Pages workflows, verify their exact commits and completed runs, then
check cache-busted live app/landing pages and asset bytes. A push alone is not
publication evidence. The owner authorized publication after validation.
