# Task 2 report: version identity, shares, and history compatibility

## Identity decisions

- Application/package: `0.9.0`.
- Active model/data: model `0.5.0`, data `0.6.0`.
- Unchanged: share `v5`, storyboard `v3`, custom storage `v3`, and history storage `v3`.
- The released `v5` model `0.5.0`/data `0.5.0` envelope decodes as `migrated-v5` (not `migrated-v4`) and returns a current model `0.5.0`/data `0.6.0` payload. Scenario and referenced embedded-custom inputs are retained.
- Released current history results under model `0.5.0`/data `0.5.0` become `pending-recalculation` in memory, retaining their original source identity, scenario inputs, and result snapshot. The stored bytes are not overwritten; finalization writes the current data `0.6.0` result and removes the data-0.6 recalculation notice.
- Existing v1-v4 migrations remain covered by the persistence and activation tests.

## TDD evidence

RED command:

```text
npm.cmd exec vitest run src/test/model04Persistence.test.ts src/test/model04Activation.test.ts src/test/model04Runtime.test.ts src/test/model04Engine.test.ts
```

RED output: 5 expected failures. The released v5 share decoded as `current` with data `0.5.0`; the released history stayed `current`; and the active application/data assertions still returned `0.8.2`/`0.5.0`.

GREEN command:

```text
npm.cmd exec vitest run src/test/model04Persistence.test.ts src/test/model04Activation.test.ts src/test/model04Runtime.test.ts src/test/model04Engine.test.ts
```

GREEN output: 4 test files passed, 46 tests passed.

## Verification

```text
npm.cmd run typecheck
```

Output: exit 0 (`tsc -b --pretty false`).

```text
npm.cmd test
```

Output: exit 0; release audits passed (159 semantic profiles, 140 ability tokens, provenance and legal checks) and 31 test files / 426 tests passed.

```text
npm.cmd run build
```

Output: exit 0; Vite production build completed after the same release audits.

```text
npm.cmd exec -- playwright test e2e/app.spec.ts --grep "versioned share URL embeds a custom profile|version 3 history persists"
```

Output: exit 0; 8 browser checks passed across desktop/mobile Chromium, desktop Firefox, and desktop WebKit.

## Files changed

- `app/package.json`, `app/package-lock.json`, `app/src/version.ts`
- `app/src/model04/contracts.ts`, `app/src/model04/persistence.ts`
- `app/src/test/model04Persistence.test.ts`, `app/src/test/model04Activation.test.ts`, `app/src/test/model04Runtime.test.ts`, `app/src/test/model04Engine.test.ts`
- `app/e2e/app.spec.ts`
- This report

## Commit and concerns

- Commit hash: recorded in the task handoff after the report is committed (a Git commit hash cannot be embedded into the tree it identifies without changing that hash).
- No known implementation concerns. The pre-existing seven Task 3 documentation/provenance/checksum files were preserved exactly and excluded from staging.

## Fix round 1: persisted legacy pending notices

- Regression: an existing v3 `pending-recalculation` entry with the prior `history-result-pending-model-050` notice could load without the current recalculation warning and retain stale notice metadata.
- Resolution: normalize either legacy or current pending-result notice to a single current data-0.6 notice in memory. Warning detection and finalization defensively recognize both codes. Source identity, scenario inputs, and the stored recovery bytes remain unchanged.

RED command:

```text
npm.cmd exec vitest run src/test/model04Persistence.test.ts --testNamePattern="normalizes persisted v3 legacy pending notices"
```

RED output: 1 expected failure; the old code remained and the global warning was empty.

GREEN commands:

```text
npm.cmd exec vitest run src/test/model04Persistence.test.ts --testNamePattern="normalizes persisted v3 legacy pending notices"
npm.cmd exec vitest run src/test/model04Persistence.test.ts src/test/model04Runtime.test.ts
npm.cmd run typecheck
npm.cmd test
```

GREEN output: focused 18/18, relevant 26/26, typecheck exit 0, and full release suite 31 files / 427 tests passed.
