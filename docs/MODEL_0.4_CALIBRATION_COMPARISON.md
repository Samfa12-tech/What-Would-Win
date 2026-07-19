# What Would Win — model 0.4.1 calibration comparison

**Comparison date:** 19 July 2026

**Active identity:** application/model/data 0.4.1, share v4, custom/history v2
**Released baseline commit:** `c54c1525f9da59cdffd449355dbcb70a02488aa2`

## Method

All sixteen original model-0.3 physical fixtures were executed through released model 0.4.0 and corrected model 0.4.1 with the same verdict depth, seed `12345` and resources. Released values were captured from a detached exact-commit worktree; corrected values are locked by `model04PhysicalRegression.test.ts`.

```powershell
$env:PRINT_MODEL041_PHYSICAL_CALIBRATION='1'
npx vitest run src/test/model04PhysicalRegression.test.ts --reporter=verbose --disableConsoleIntercept
```

Probabilities are the displayed solo win probability. `Power S/G` shows deterministic solo/group log power. These are versioned behavioural observations, not biological truth.

## Results

| Fixture | 0.4.0 | 0.4.1 | Delta | Winner 0.4.0 → 0.4.1 | Power S/G 0.4.0 → 0.4.1 | Responsible movement |
|---|---:|---:|---:|---|---|---|
| `duck-horse-classic-functional` | 0.958853 | 0.958853 | 0.000000 | solo → solo | 1.739/0.863 → 1.821/0.851 | Routed execution; displayed result saturated unchanged. |
| `elephant-wolves` | 0.880848 | 0.938204 | +0.057356 | solo → solo | 2.635/2.406 → 2.757/2.403 | Per-effect stopping and explicit body-scale control restore megafauna leverage. |
| `gorilla-ducks` | 0.956559 | 0.958853 | +0.002294 | solo → solo | 1.672/1.196 → 1.737/1.195 | Bounded physical area control; qualitative result unchanged. |
| `dragon-archers` | 0.938903 | 0.938903 | 0.000000 | solo → solo | 3.031/2.107 → 3.310/1.974 | Fire geometry, execution and finite bow use move powers inside the same displayed ceiling. |
| `trex-chickens` | 0.898903 | 0.928928 | +0.030025 | solo → solo | 2.607/2.235 → 2.816/2.232 | Individual stopping plus physical span/frontage. |
| `kraken-orcas-water` | 0.381496 | 0.873067 | +0.491571 | group → solo | 3.693/3.766 → 4.105/3.771 | Reviewed many-limb frontage/restraint plus routed execution. Expected systemic reversal. |
| `extreme-quantity` | 0.061097 | 0.061097 | 0.000000 | group → group | 2.417/54.256 → 3.240/54.254 | Logarithmic conceptual pressure remains dominant and finite. |
| `sperm-whale-orca-pod` | 0.234065 | 0.354165 | +0.120100 | group → group | 3.227/3.366 → 3.300/3.373 | Per-effect stopping narrows but does not reverse pod pressure. |
| `spinosaurus-nile-crocodiles` | 0.815262 | 0.840998 | +0.025736 | solo → solo | 2.703/2.470 → 2.760/2.475 | Aquatic access and execution routing. |
| `bigfoot-humans-fixed` | 0.344190 | 0.425387 | +0.081197 | group → group | 1.836/1.941 → 1.876/1.940 | Explicit execution narrows the already group-led model-0.4 result. |
| `medusa-spear-group` | 0.061097 | 0.089626 | +0.028529 | group → group | 1.698/2.378 → 1.850/2.383 | Target-facing gaze eligibility and routed contact fallback. |
| `charybdis-orcas-hazard` | 0.061097 | 0.061097 | 0.000000 | group → group | 3.089/3.831 → 2.589/3.834 | The 40 m stationary hazard is correctly rejected at 80 m; probability remains at the uncertainty floor. |
| `dog-mouse-mouse-kangaroos-functional` | 0.906085 | 0.938204 | +0.032119 | solo → solo | 0.902/0.659 → 0.966/0.657 | Cross-scale per-member stopping and execution. |
| `rhinoceros-mouse-swarm` | 0.958853 | 0.958853 | 0.000000 | solo → solo | 2.355/1.478 → 2.626/1.476 | Tiny attacks retain a stopping barrier; displayed ceiling unchanged. |
| `eagle-million-mice-access` | 0.958853 | 0.958853 | 0.000000 | solo → solo | 0.685/-0.172 → 0.946/-0.174 | Explicit group ability-access limit preserves flight mismatch. |
| `orca-wolves-dry-land` | 0.041147 | 0.041147 | 0.000000 | group → group | 1.438/2.152 → 1.491/2.152 | Dry-land locomotion mismatch remains decisive. |

## Review

The only released-model-0.4 winner reversal is Kraken versus orcas. It is expected: Kraken's defining many-limb mechanic was previously discarded by generic migration and is now an explicit reviewed frontage/restraint route. Charybdis is a large deterministic correction even though its displayed probability stays at the floor; its finite 40 m hazard no longer applies at the fixture's 80 m start. No fixture uses creature-name logic or isolated probability tuning.
