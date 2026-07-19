# Model 0.4 build-budget revision

The build budget is a repository-owned CI guardrail, not a user-set time or token budget. Model 0.4 adds a separately lazy-loaded deterministic runtime and canonical ability overrides, so the guard now reports that cost as its own category instead of hiding it inside generic lazy JavaScript.

| Category | Model 0.3 ceiling | Model 0.4 ceiling | Reason |
|---|---:|---:|---|
| Entry JavaScript | 455,000 | 455,000 | Startup ceiling is unchanged. |
| Optional UI JavaScript | 15,000 | 15,000 | Custom editor and technical report ceiling is unchanged. |
| Model 0.4 runtime JavaScript | — | 52,000 | New isolated engine, migrations, canonical overrides, strict imported-ability validation, lossless custom-profile preservation and v4 codecs. |
| Total JavaScript | 480,000 | 525,000 | Adds only the bounded runtime category. |
| Creature roster | 125,000 | 125,000 | Existing external roster is unchanged. |
| CSS | 25,000 | 25,100 | Adds bounded 320px text-spacing and cross-browser forced-colour fixes found by the activation accessibility gate. |
| Published runtime artifact | 715,000 | 772,000 | Accommodates the new runtime plus manifest growth with less than 1% headroom at the measured 765,530-byte artifact. |

The checker requires exactly one `runtime-*` chunk and subtracts it from optional UI JavaScript. Splitting or renaming code therefore cannot conceal growth: entry, optional UI, model 0.4 runtime, total JavaScript and complete artifact remain independently bounded.

The activation gate initially set the isolated runtime at 45,000 bytes. Full validation of imported structured abilities and preservation of those abilities through the compatibility editor raised the measured chunk to 49,614 bytes while total JavaScript remained below 525,000 bytes. The final 52,000-byte category retains 2,386 bytes of explicit headroom; it is not an unbounded exemption.

The final accessibility matrix also exposed a 320px text-spacing overflow and a WebKit forced-colour contrast defect. Their CSS fix measures 25,014 bytes, so the CSS ceiling moved by 100 bytes to retain an 86-byte guardrail rather than suppressing the checks.
