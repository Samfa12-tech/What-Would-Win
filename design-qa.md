# Design QA — Simple mode redesign

final result: passed

## Comparison target

- Source visual truth: `C:\Users\sam_s\.codex\generated_images\019fb825-04da-7890-a9b1-b032ebf3b096\exec-ebf18cd2-ac0d-42f1-89b9-ba4fddc9b9ef.png`
- Source pixels: 1487 × 1058.
- Browser implementation: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\desktop-matchup.png`
- Implementation pixels and CSS viewport: 1487 × 1058 at device scale factor 1.
- Combined comparison evidence: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\desktop-source-implementation-comparison.png` (1600 × 1247).
- State: Simple mode, step 1, default horse-sized mallard versus 100 duck-sized horses.
- Density normalization: source and implementation were captured/compared at the same 1487 × 1058 pixel dimensions; no resampling or device-frame normalization was required.

## Evidence reviewed

- Full-view desktop comparison: source and browser implementation were placed together in the combined comparison image above and opened at original detail.
- Focused contender-region evidence: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\desktop-matchup-focused.png` (1181 × 390).
- Desktop conditions: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\desktop-conditions.png` (1487 × 1058).
- Desktop result: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\desktop-result.png` (1487 × 1079 full page).
- Mobile matchup: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\mobile-matchup.png` (360 × 800 viewport).
- Mobile conditions: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\mobile-conditions.png` (360 × 800 viewport).
- Mobile result: `C:\Users\sam_s\Documents\What Would Win\output\design-qa\mobile-result.png` (360 × 1839 full page).
- Browser console and page errors: none across the captured desktop and mobile journeys.
- Current Step 1 density after restoring roster search: 123 rendered words / 19 controls on desktop and 111 words / 19 controls at 360 px. The original pre-redesign screen had 767 words / 51 controls.

## Final findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation preserves the source's editorial serif display hierarchy, compact sans-serif UI labels, strong gold eyebrow text, and readable wrapping. The existing local system/Georgia stack is intentionally retained rather than adding a blocking webfont dependency.
- Spacing and layout rhythm: the final implementation follows the source's left-led step rail and title, two separate contender cards, central versus field, compact matchup strip, and strong primary action. Desktop fits within roughly one viewport; mobile becomes a natural vertical sequence without horizontal overflow.
- Colors and visual tokens: navy, cream, muted blue-grey, and gold map cleanly to the source. Helper labels were raised to accessible contrast without materially changing the subdued palette.
- Image quality and asset fidelity: the existing product mark remains intact; generated mallard, horse, and ray assets match the selected flat-gold/navy art direction. The ray asset is an optimized 160 × 640 indexed PNG (28,731 bytes), sharp at its rendered size and free of placeholder, CSS-art, emoji, or handcrafted-SVG substitutions.
- Copy and content: the flow uses direct task language and limits the result to the winner, three authoritative model factors, a short deterministic phase summary, and one alternate path. Search filters by creature name, type, category, or trait inside each contestant card; expert terminology remains available in Deep dive.
- Icons and controls: visible action icons use the Phosphor icon family; selects, quantity input, step navigation, mode switch, sharing, and primary actions are functional and consistently aligned.
- Accessibility and responsiveness: the 360 px capture has no horizontal clipping; the 320 px text-spacing stress test reflows without horizontal page overflow; mobile mode buttons meet a 44 px minimum target; step labels keep explicit accessible names when their visual labels collapse; and the mode switch remains distinguishable in forced-colour mode. The focused axe WCAG 2 A/AA, 2.1 A/AA, and 2.2 AA pass reports no serious or critical violations.

## Comparison history

### Iteration 1 — blocked

- [P2] Programmatic heading focus showed a large default outline that was absent from the source and visually boxed in the title.
- [P2] The two contestants were joined inside one enclosing surface, while the selected design used two distinct confrontation cards around the central rays.
- Fixes: suppressed only the programmatic heading outline while preserving control focus indicators; separated contender cards; left-aligned the step rail/title; centred and widened the primary CTA; retained the real ray image between cards.

### Iteration 2 — blocked

- [P2] Brightening the ray raster also lifted its navy background into a conspicuous blue rectangle on mobile.
- [P2] Axe identified ten low-contrast helper labels in size, fact, quantity, and matchup-summary text.
- Fixes: reduced raster brightening to preserve the navy field; moved helper labels to `#9aa8bb`; added explicit mobile step names and 44 px mode targets.

### Iteration 3 — passed

- Post-fix evidence: the final combined desktop comparison plus the final desktop/mobile captures listed above.
- No actionable P0/P1/P2 findings remain. The implementation is intentionally a functional adaptation of the selected concept, with live roster selects, deterministic results, share/history integration, and responsive states that the static source did not depict.

## Primary interactions tested

- Select both contestants, sizes, and opponent quantity.
- Search the complete 139-profile roster, choose a filtered result, clear the query after selection, and retain the selected profile when a filter is active.
- Move forward/back through the three-step flow.
- Change resizing model, battlefield, and fight style.
- Run the deterministic simulation and show the concise result.
- Copy and restore a share URL directly into Simple result mode.
- Return to the matchup and switch both directions between Simple and Deep dive.
- Confirm expert dossier, custom-profile tools, history, methodology, technical output, and exports remain reachable.

## Follow-up polish

- [P3] The implementation keeps the existing product's local type stack, so its exact serif letterforms differ slightly from the generated concept's unidentified display face.
