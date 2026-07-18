# What Would Win
## Product planning, simulation specification and Codex handoff

**Document version:** 0.3<br>
**Status:** audited user-test candidate<br>
**Updated:** 18 July 2026<br>
**Owner / intended host:** Samfa12-tech, `samfa12.com`<br>
**Primary implementation:** React + TypeScript + Vite

> **Product promise:** Put one creature against an effectively unlimited number of another creature, state the assumptions, and return a serious-looking, transparent, textual estimate of what would win.

---

## 1. Executive summary

**What Would Win** is a free, mobile-friendly web application for resolving absurd hypothetical conflicts such as “100 duck-sized horses versus one horse-sized duck.” Its tone is deliberately mock-serious, but its method is not a random joke generator. The app separates physical measurements, authored combat attributes, scaling assumptions, battlefield conditions and uncertainty. A deterministic model creates the underlying matchup, then seeded Monte Carlo trials introduce biological and tactical variation. The final report explains the winner, probability, decisive factors, model limitations and the opposing quantity required for an approximately even contest. At ordinary scale it also supplies explicitly heuristic duration/loss estimates and a seven-phase factor-backed explanation; at conceptual scale those physical metrics are withheld and the explanation remains aggregate-only.

The first release is deliberately constrained to **one profile versus X copies of one opposing profile**. That shape is easy to understand, strongly shareable and technically compatible with extreme quantities. The working prototype accepts ordinary integers, scientific notation and expressions such as `10^100`. Large forces are represented in logarithmic space through active-front, logarithmic reserve-weight and effectiveness rules; the browser never attempts to instantiate every combatant.

The handoff includes:

- a working static web demo with no server dependency;
- a curated **134-profile** database: 73 living animals, 20 extinct animals, 37 fantasy or mythological profiles (including 8 fixed cryptid interpretations) and 4 generic human profiles;
- CSV and JSON data exports plus JSON Schemas;
- 16 behavioural calibration scenarios and automated invariant tests;
- this canonical Markdown product and model specification;
- a Codex-oriented implementation guide and ordered backlog.

The prototype is an **entertainment model**, not a scientific prediction, animal-welfare guide, military tool or authoritative zoological database. Its most important product behaviour is transparency: users can see which assumptions make the result change.

## 2. Locked product decisions

| Decision | Locked direction |
|---|---|
| Product name | **What Would Win** |
| Emotional tone | Serious scientific or intelligence-report presentation applied to absurd questions |
| Core battle shape | One contestant versus X copies of one opposing contestant |
| Main output | Instant, mostly textual result; no battle animation required |
| Scientific posture | Detailed and inspectable model, while clearly labelled as entertainment and assumption-sensitive |
| Launch categories | Living animals, extinct animals, public-domain or generic fantasy creatures, and generic humans |
| Quantity | No displayed upper limit; conceptual warning beyond physically meaningful forces |
| Size controls | Normal, named presets, exact target mass and relative linear scale |
| Resizing assumptions | Strict biology, functional scaling and magical scaling, selected by the user |
| Controls | Simple controls by default; advanced dossier for all normalized stats and tactical conditions |
| Result depth | Four user-selectable levels; greater depth runs more uncertainty trials |
| Baseline specimen | Representative high-end / peak healthy adult, disclosed prominently |
| Violence | Abstract and textual; incapacitation, retreat or surrender rather than graphic injuries |
| Persistence | Shareable URL, downloadable result image and JSON, local browser history; no account |
| Distribution | Free viral web toy hosted by Samfa12-tech on `samfa12.com` |

## 3. Problem, opportunity and differentiation

The “who would win?” format is familiar, but existing experiences generally fall into one of three groups: visual battle sandboxes, games with preset units, or generative text/video that does not expose a calculation. The opportunity is a lightweight product that feels like a cross between a laboratory instrument, an intelligence briefing and a shareable joke.

The differentiator is not a claim that hypothetical creature combat can be known precisely. It is the ability to make assumptions explicit and repeatable. A user should be able to answer questions such as:

- Does the answer change under strict biological scaling?
- How many group members are needed before the result becomes close?
- Is the group losing because it cannot penetrate armour, cannot reach a flying opponent, or cannot bring all members into contact?
- Does an ambush, storm, fortification or limited ammunition change the verdict?
- Which numbers are measurements, which are normalized model inputs and which are fantasy assumptions?

This makes the app useful as entertainment, debate resolution, casual systems thinking and an accessible demonstration of modelling uncertainty.

## 4. Product principles

### 4.1 Show the assumptions
Every result must identify the scaling mode, specimen convention, quantity aggregation, battlefield setup and major data limitations. Advanced users should be able to inspect a technical calculation record.

### 4.2 Calculate first, narrate second
The numerical engine chooses the outcome. Text generation explains the output; it must not invent a winner independently. The app uses factor-backed deterministic templates so it works offline and remains reproducible.

### 4.3 Make absurd scale safe and fast
The app must accept quantities far beyond JavaScript's safe integer range. It should calculate with `log10(N)` and aggregate-force rules instead of allocating one object per combatant.

### 4.4 Preserve the joke without pretending certainty
The visual identity may be authoritative, but the copy must reserve uncertainty, especially for fantasy creatures, extinct reconstructions and extreme resizing. A raw trial tally and a displayed uncertainty-adjusted probability are separate values.

### 4.5 Keep violence abstract
Use “incapacitated,” “forced retreat,” “unable to continue” and “expected losses.” Avoid visible wounds, gore and cruelty framing. The result should be funny because of the premise and analytical seriousness, not because of suffering.

### 4.6 Every shared result should reproduce
A shared URL encodes the complete scenario and seed. Opening it should recreate the same deterministic state and sampled result, subject only to explicit model-version changes.

## 5. Audience and jobs to be done

### Primary audience: curious sharers
A person sees or invents an absurd matchup and wants a fast result worth posting in a group chat. They need a clear winner, a strong visual result card and one or two surprising reasons.

### Secondary audience: debate optimizers
A user wants to change assumptions until a disputed matchup becomes fair. They need sliders, terrain and scaling modes, a 50/50 quantity estimate and transparent logic.

### Tertiary audience: model explorers
A technically curious user wants to inspect formulas, raw trial rates, confidence assumptions and the data record. They need a technical report and downloadable JSON.

### Core jobs

1. “Set up my hypothetical in under a minute.”
2. “Give me a result that feels reasoned rather than arbitrary.”
3. “Show me which assumption changed the answer.”
4. “Tell me how many opponents would make it a fair fight.”
5. “Let me share or save the exact scenario without making an account.”

## 6. MVP scope

### 6.1 Included in the working prototype

- One selected solo profile versus X identical group profiles.
- 134 built-in profiles, grouped by living, extinct, fantasy and generic human.
- Arbitrary positive whole-number quantities expressed as integers, `1e100` or `10^100`.
- Normal, named, exact-mass and relative-linear size controls.
- Strict, functional and magical scaling modes.
- Simple sliders: aggression, intelligence and teamwork/coordination.
- Presets: natural baseline, enraged, disciplined, exhausted and armoured.
- Advanced control of attack, defence, durability, agility, stamina, intelligence, aggression, coordination, morale, armour and multi-target capability.
- Terrain, weather, starting distance, preparation time, day/night, ambush, defensive position, escape and resources/ammunition.
- Four report-depth choices with 400, 1,500, 5,000 or 15,000 trials.
- Winner probability, uncertainty band, solo risk and 50/50 quantity; ordinary-scale results also show heuristic duration and group losses, while conceptual-scale results explicitly withhold them.
- Factor-backed encounter explanation, decisive factors, strengths, vulnerabilities, assumptions and technical ledger.
- Re-rollable seeded uncertainty.
- Share URL, downloadable PNG, downloadable JSON and local history.
- Responsive desktop and mobile layout.

### 6.2 Explicit MVP non-goals

- Multiple creature types on one team.
- More than two sides.
- Animated or real-time combat.
- User accounts, cloud saves, public galleries or moderation systems.
- Natural-language creature generation.
- Cloud-synced or publicly listed custom creatures. Named custom profiles are deliberately local-only unless the user explicitly exports or shares them.
- A fully sourced per-field zoological research database.
- Named living people, children, real protected groups or modern franchise characters in the built-in database.
- Claims of scientific, veterinary or military validity.

## 7. Core user journey

### 7.1 Fast path

1. Choose the solo contestant.
2. Choose the opposing contestant and quantity.
3. Set each side's size.
4. Select the resizing law.
5. Choose terrain, weather and starting distance.
6. Select report depth.
7. Run the simulation.
8. Read the result and share the link or result image.

Target time for a first result: **under 45 seconds** for a new user.

### 7.2 Advanced path

1. Complete the fast setup.
2. Open **Advanced dossier**.
3. Configure preparation, ambush, defensive position, resources and escape.
4. Override normalized stats for either side.
5. Run a transparent or technical report.
6. Compare the raw trial rate, displayed probability and technical power terms.
7. Re-roll the uncertainty sample or copy the scenario URL.

### 7.3 Future custom-profile path

1. Select a base profile.
2. Choose **Clone as custom**.
3. Enter a name and category.
4. Edit physical measurements, capabilities, attacks, traits and normalized scores.
5. Review warnings for inconsistent inputs.
6. Save locally and use it in either side of a scenario.
7. Export the custom profile as JSON.

## 8. Information architecture and interface

The application is a single-page tool with four vertical regions:

1. **Header and interpretation rule** — establishes the mock-serious tone and makes the peak-adult convention and entertainment disclaimer visible before interaction.
2. **Contestant dossiers** — side-by-side on desktop and stacked on mobile. “The one” is fixed at quantity one; “The many” accepts arbitrary quantity text.
3. **Model configuration** — resizing law, environment, report depth and the expandable advanced dossier.
4. **Result and history** — verdict first, then deeper explanation according to selected report depth, followed by local history.

### 8.1 Visual language

- Dark navy background suggests an analysis console rather than a game arena.
- Warm gold accents imply official seals, archival documents and intelligence briefings.
- Serif display type provides mock gravitas; compact sans-serif text keeps controls readable.
- Cards use clear borders and restrained spacing rather than cartoon panels.
- Creature emoji are incidental locators, not the primary visual style.

### 8.2 Accessibility requirements

- All controls require visible labels and keyboard operation.
- Results use text and numeric labels, not colour alone.
- The probability bar must retain readable percentages on each side.
- Focus states must be visible.
- `aria-live` announces a new result.
- Advanced content uses semantic `details` and `summary` elements.
- Minimum supported viewport is 360 CSS pixels.
- Before public launch, test with axe, keyboard-only navigation, VoiceOver and NVDA.

## 9. Functional requirements

### FR-1: contestant selection
The user can select any built-in profile for the solo or group side. Options are grouped by kind. The selected profile exposes baseline mass, speed, reach, attack modes, traits, confidence and an orientation source.

**Acceptance:** changing a selection updates the dossier immediately; running the model uses the new profile.

### FR-2: arbitrary quantity
The group quantity accepts positive whole numbers, scientific notation and power notation. Internally it resolves to `log10(quantity)` and, only where safe, an approximate JavaScript number.

**Acceptance:** `100`, `1e100` and `10^100` are valid; zero, negative and prose values fail with a useful error; the UI never freezes because of quantity magnitude.

### FR-3: size configuration
Each side supports:

- normal profile mass;
- named target masses: mouse 0.04 kg, duck 1.5 kg, dog 30 kg, human 100 kg, horse 600 kg and elephant 6,000 kg;
- exact target mass in kilograms;
- relative linear scale, where mass changes with the cube of linear scale.

The UI shows target mass, linear scale and structural integrity.

### FR-4: scaling law
The user selects one law for both sides:

- **Strict biology:** resized bodies receive structural penalties inspired by allometric and square-cube constraints.
- **Functional scaling:** the creature remains viable and mobile with moderated scaling effects.
- **Magical scaling:** function is preserved and capability can rise aggressively with mass.

This is a modelling switch, not a claim that one interpretation is objectively correct.

### FR-5: profile modifiers
Simple controls expose aggression, intelligence and coordination. The advanced dossier exposes every normalized stat. Presets apply coherent bundles of overrides without mutating the baseline database.

### FR-6: battlefield setup
The user can choose terrain, weather, distance, preparation, day/night, ambush, defensive position, escape and available resources. Each variable must have an observable route into the calculation or be removed from the UI.

### FR-7: report effort
The user chooses:

| Level | Trials | Content |
|---|---:|---|
| Verdict | 400 | Winner and core metrics |
| Assumptions | 1,500 | Adds the deterministic encounter sequence and limits |
| Transparent | 5,000 | Adds factors, strengths, vulnerabilities and source context |
| Technical | 15,000 | Adds full calculation ledger |

The trial count is a product-control proxy for simulation effort. Because the engine is lightweight, all four levels currently complete in-browser without blocking for a meaningful period.

### FR-8: result report
Every result includes a winner, model win rate, probability band, solo incapacitation/retreat risk and 50/50 group size. Ordinary-scale results add heuristic duration and expected group losses; conceptual-scale reports state that those physical metrics are not meaningful. Deeper modes add the factor-backed encounter sequence, assumptions and technical values.

### FR-9: share and export
A share link encodes the scenario. PNG export creates a 1200 × 630 result card. JSON export includes scenario, contestant records and result. Local history stores the latest 12 runs without an account.

### FR-10: reproducibility
The scenario contains a seed. Re-running the same scenario and seed reproduces the sampled result. **New uncertainty sample** increments the seed while retaining all other inputs.

## 10. Simulation model

### 10.1 Modelling posture

The engine is a calibrated game model with biologically inspired structure. It is not a biomechanics solver and does not model individual anatomy, wounds or exact spatial trajectories. Its purpose is to make assumptions internally consistent, inspectable and computationally cheap.

The current reproducibility identity is **model 0.3.0, data 0.3.0 and share format v3**. Supported model-0.2 shares and history preserve their structured inputs and are visibly recalculated under model 0.3 when referenced profiles are available. An unavailable custom reference stays marked pending rather than receiving current-version metadata beside an old numerical result.

All constants in this section are **versioned design parameters**. They should be changed only with a calibration note and regression-test update.

### 10.2 Pipeline

1. Parse quantity, convert it to `log10(N)` and classify ordinary versus conceptual scale.
2. Resolve each selected creature, user overrides and size declaration.
3. Resolve target mass, linear scale, body length, height, reach, movement and structural integrity.
4. Evaluate environment and water access using the resolved geometry and explicit amphibious/land-capable traits.
5. Convert physical and normalized inputs into single-combatant log power.
6. Apply bilateral stopping, attack access, distance and bounded pre-battle/methodology adjustments.
7. Apply bounded-arena occupancy, then estimate active frontage, logarithmic reserve weight, effective group quantity, access pressure and bounded area control.
8. Calculate deterministic solo/group log power and record each material adjustment in the applied-factor ledger.
9. Run seeded Monte Carlo trials around those deterministic values.
10. Reserve explicit probability weight for unmodelled uncertainty without a conceptual-threshold certainty jump.
11. Calculate crossover quantity and ordinary-scale heuristic metrics; withhold physical duration/losses at conceptual scale.
12. Generate the verdict and a factor-linked deterministic explanation.

### 10.3 Quantity representation

For a quantity `N`, the engine primarily stores:

`q = log10(N)`

This permits conceptual quantities such as `10^100` without overflow. Group aggregation uses an **effective** log quantity after frontage, reserve and access limits rather than assuming all `N` members act simultaneously. When `N` exceeds the range in which physical battlefield geometry, logistics and planetary constraints are meaningful, the report displays a conceptual-scale warning, uses an aggregate-only explanation and withholds physical duration/loss estimates. The result then means “aggregate combat pressure under this abstract model,” not a literal staged event.

### 10.4 Size resolution

Let `M0` be representative baseline mass and `M` target mass.

- Normal: `M = M0`
- Named preset: `M = preset mass`
- Exact: `M = user-entered kilograms`
- Relative: `M = M0 × L^3`, where `L` is the user-entered linear scale

The resolved linear scale is:

`L = cube_root(M / M0)`

Body length, body height and reach scale approximately with `L`. Speed and structural integrity depend on the selected law. Model 0.3 resolves this geometry before terrain fit, water immersion, frontage and arena-occupancy checks, preventing a resized profile from retaining its baseline spatial treatment.

### 10.5 Structural integrity

- Magical scaling uses an integrity factor of `1.08`.
- Functional scaling uses `0.99`.
- Strict scaling applies an exponential penalty for enlargement and a gentler penalty for extreme reduction, clamped to `0.06–1.00`.

The current strict implementation is:

`I = exp(-0.22 × max(0,L-1)^1.12) × exp(-0.035 × max(0,1/L-1)^0.58)`

This is inspired by allometric constraints but is not an empirically fitted universal law. Allometry concerns how biological traits and processes change with body size; real scaling differs by tissue, locomotor mode and taxon. Production refinement should fit separate functions for terrestrial, flying and aquatic profiles rather than treating one formula as final.

### 10.6 Speed scaling

The current multiplicative speed factors are:

- Magical: `clamp(L^0.08, 0.65, 2.2)`
- Functional: `clamp(L^0.18, 0.35, 3.5)`
- Strict: `clamp(L^0.34 × I^0.42, 0.05, 3.2)`

These values intentionally prevent speed from rising in direct proportion to size.

### 10.7 Single-profile log power

Normalized attack quality combines attack, aggression, agility, speed, reach, intelligence, multi-target capability and stamina. Defence quality combines defence, durability, armour, stamina, agility, morale and intelligence.

The current core terms are:

`mass_term = 0.61 × log10(max(M, 10^-6))`

`quality_term = log10(0.42 + 2.2 × attack_quality) + 0.7 × log10(0.5 + 1.75 × defence_quality)`

`single_log_power = mass_term + quality_term + log10(environment) + log10(integrity) + log10(special)`

The `special` factor covers venom, regeneration, area effects, armour, construct/undead resistance and other declared capabilities. Range, resources and access also receive explicit matchup handling. All such contributions are deliberately bounded. The former `+0.02 kg` mass offset was removed in model 0.3 because it disproportionately strengthened micro-scale profiles.

### 10.8 Group aggregation

Perfectly linear scaling would assume every member attacks effectively at once. That is implausible for most large groups. Model 0.3 first limits usable quantity to approximate single-layer occupancy in bounded arenas, then estimates an active front from resized defender span, attacker width, terrain and engagement mode. Members beyond that front contribute through a bounded logarithmic reserve weight; severe access mismatch applies a smooth effective-pressure ceiling. Group force is therefore:

`group_log_power = member_log_power + E × effective_quantity_log10 + adjustments`

The effectiveness exponent `E` begins at:

`E = 0.58 + 0.0018 × coordination`

Bonuses apply for swarm/eusocial behaviour, pack hunting, formation discipline, open terrain and suitable aquatic conditions. Penalties apply in confined terrain. The exponent is clamped to `0.52–0.94`, preserving the disadvantage of a poorly coordinated crowd.

Active frontage and reserve weighting make contact saturation inspectable while retaining logarithmic runtime. Approximate bounded-arena occupancy caps usable opposing quantity before frontage, reserve and access limits; the declared quantity remains visible and produces a feasibility warning. Open arenas permit explicitly aggregate quantities without that spatial cap. The exponent, frontage geometry, reserve weight and occupancy approximation remain sensitive global heuristics that should eventually be estimated by archetype.

### 10.9 Matchup interactions

The deterministic layer also applies:

- **Bilateral stopping:** both sides must overcome protection and a separately bounded body-mass stopping barrier; relevant delivery mechanisms can bypass part, but not all, of that resistance.
- **Attack access:** flight, medium mismatch, starting distance, range and resources change each side's opportunity to deliver an effective attack.
- **Access ceiling:** where a group lacks credible access, additional reserves do not create new attack opportunities by themselves.
- **Solo area control:** multi-target score, mass ratio and area-effect traits add bounded resistance to effective group pressure.
- **Frontage and reserves:** contact geometry limits the active front, while coordination, doctrine and casualty tolerance affect the rate at which reserves sustain pressure.
- **Range and closing:** ranged contribution and remaining-resource effects are continuous; slow melee profiles pay a bounded closing cost.
- **Environment:** habitat match, explicit land/amphibious capability, resized geometry, terrain, weather and time of day affect each side separately.
- **Preparation, ambush and defence:** intelligent profiles convert preparation into a capped advantage.
- **Escape:** a small advantage goes to the more mobile side and expected losses decline in open arenas.

Stopping and access are combat-model abstractions, not anatomy, wound-channel or exact incapacitation calculations.

### 10.10 Monte Carlo layer

Each trial samples normally distributed variation around solo and group deterministic log power. Noise is larger for low-confidence and modelled profiles. A shared tactical swing moves the two sides in opposite directions for a trial. The seeded pseudo-random generator makes a scenario reproducible.

The raw solo trial rate uses light Bayesian smoothing:

`p_raw = (solo_wins + 0.5) / (trials + 1)`

The prototype then prevents raw trial dominance from masquerading as complete knowledge:

`p_display = 0.5 + (p_raw - 0.5) × C`

where `C` is:

- `0.92` when both profiles have high-confidence real-world data;
- `0.86` for other non-fantasy pairings;
- `0.88` when fantasy is present.

Crossing the conceptual-quantity threshold does not change `C`; model 0.3 removes the former discontinuous jump toward certainty. Conceptual results instead use a wider model-sensitivity floor and an applicability warning. This “epistemic compression” is visible in the assumptions and technical record. Future versions should replace fixed values with uncertainty distributions tied to each field and archetype.

### 10.11 Probability band

The report combines sampling standard error with an explicit model floor. Conceptual quantities and lower-confidence profiles receive wider bands. The band should be described as a **model sensitivity band**, not a frequentist confidence interval for real-world outcomes.

### 10.12 50/50 quantity

The engine finds the opposing quantity at which deterministic group log power first meets solo log power. It searches in logarithmic space, expanding the upper bound and then applying binary search. The result is an approximate model crossover, not a promise that the displayed probability at that exact integer is 50.0% after stochastic compression.

### 10.13 Duration and losses

At ordinary scale, duration is a heuristic based on effective starting distance—capped to arena diameter when bounded—resolved closing speed, effective group pressure, durability and attack rate. Group losses blend expected loss fractions in solo-win and group-win branches, apply probability weighting and decline when open-arena escape is allowed. Bounded-arena counts use only the arena-usable group. Loss wording follows the selected win condition. At conceptual scale both duration and loss counts are deliberately withheld rather than presented as physically staged values.

### 10.14 Applied-factor ledger and encounter sequence

Every material deterministic adjustment is recorded with a stable factor ID, phase, affected side, log delta, explanation and optional caveat. Ordinary reports turn that ledger into seven phases: briefing, deployment, access/approach, first effective contact, sustained pressure, likely resolution and alternate path. Conceptual reports use three aggregate phases and avoid literal staging.

This sequence is a deterministic explanation of the calculated state. It is not a sampled Monte Carlo event timeline, a frame-by-frame battle simulation or an anatomy model, and it cannot change the winner independently.

## 11. Data strategy

### 11.1 Prototype database composition

The 134-profile roster is selected for **scenario value**, not taxonomic completeness:

- 73 living animals covering megafauna, apex predators, packs, domestic animals, birds, aquatic specialists, venom, flight and swarms;
- 20 extinct animals covering iconic dinosaurs, prehistoric crocodilians and Pleistocene megafauna;
- 37 generic or public-domain fantasy/mythology profiles, including 8 fixed cryptid interpretations, covering giants, dragons, regeneration, constructs, undead, magic and colossal aquatic profiles;
- 4 generic humans covering unarmed, trained, armoured melee and ranged archetypes.

The selection intentionally maximizes mechanics coverage: body mass, armour, speed, reach, flight, aquatic movement, range, venom, regeneration, coordination, area control and unusual scale. Data 0.3 adds explicit `amphibious` and `land-capable` traits for profiles whose dry-land access cannot be inferred safely from the broad aquatic capability flag. Positive water depth can flood nominally land terrain; access is derived from depth relative to each resized body rather than the terrain label alone.

### 11.2 Peak-adult convention

Each real profile represents a large, healthy, combat-capable adult. It is not the species mean and not the largest anecdotal specimen. The scenario can declare specimen basis and sex for transparency, but these fields do not change coefficients unless the user also changes size or authored stats. Per-record provenance still needs explicit sex, life-stage, condition and taxon basis.

### 11.3 Physical fields versus model scores

**Physical or semi-physical fields:** representative peak mass, body length, body/shoulder height, burst speed and effective reach.

**Normalized model scores:** attack, defence, durability, agility, stamina, intelligence, aggression, coordination, morale, armour and multi-target capability.

The 0–100 scores are authored inputs. They are not direct zoological measurements and should never be exported or described as scientific facts without that qualifier.

### 11.4 Current provenance status

The public-beta licensing audit covers all 134 profiles. Each record identifies its CC BY-SA 4.0 Wikipedia orientation link, states that no third-party prose or media is bundled, and separates externally oriented fields from original Samfa12-tech model assumptions and metadata. Automated tests require complete, non-overlapping coverage and reject unclassified external-source domains. This clears the redistribution-licensing gate but remains distinct from scientific validation: many links are broad reference pages, physical inputs remain approximate, and normalized scores are manually authored for model coverage.

### 11.5 Production provenance model

A production record should store evidence per field:

- value, units and allowed range;
- typical, high-adult and low/high distribution values;
- sex, age class and subspecies/population;
- source title, authors, publisher, URL or DOI, publication date and access date;
- quoted measurement definition;
- transformation or assumption used;
- confidence and reviewer;
- data licence and reuse conditions.

Recommended sources include PanTHERIA for mammalian life-history and ecological traits, Animal Diversity Web for orientation and cited natural-history sources, museum or peer-reviewed reconstructions for extinct species, and explicit authored design bibles for fantasy profiles. Source conflicts should be preserved as ranges rather than silently averaged.

### 11.6 Fantasy policy

The built-in database uses generic and public-domain mythology. Named modern franchise characters should not be shipped without licensing. A user may create a private custom equivalent, but public galleries would require moderation and an IP-reporting process.

Fantasy profiles use `data_confidence: modelled` and must expose their design assumptions. “Fire,” “petrification,” “regeneration” and similar traits are mechanics tags, not attempts to infer a canonical version across every story.

## 12. Database field dictionary

| Field | Type | Purpose |
|---|---|---|
| `id` | slug | Stable application identifier |
| `name` | string | User-facing profile name |
| `kind` | enum | `animal`, `extinct`, `fantasy`, `human` |
| `category` | string | UI and balancing grouping |
| `icon` | string | Lightweight visual locator |
| `representative_peak_mass_kg` | number | High-adult baseline mass |
| `body_length_m` | number | Approximate body length |
| `shoulder_or_body_height_m` | number | Approximate principal height |
| `burst_speed_kph` | number | Short-duration movement speed |
| `effective_reach_m` | number | Contact or built-in ranged reach abstraction |
| `attack` | 0–100 | Ability to inflict decisive harm per opportunity |
| `defense` | 0–100 | Avoidance, blocking and positional defence |
| `durability` | 0–100 | Ability to continue after adverse contact |
| `agility` | 0–100 | Acceleration, turning and precise movement |
| `stamina` | 0–100 | Sustained output and recovery |
| `intelligence` | 0–100 | Tactical adaptation and planning |
| `aggression` | 0–100 | Willingness to initiate and sustain attack |
| `coordination` | 0–100 | Teamwork and formation effectiveness |
| `morale` | 0–100 | Resistance to fear, rout and surrender |
| `armor` | 0–100 | Passive physical protection |
| `multi_target` | 0–100 | Ability to control or affect multiple opponents |
| `habitats` | string array | Environment matching tags |
| `attack_modes` | string array | Mechanically relevant attacks |
| `traits` | string array | Capabilities and archetype tags |
| capability booleans | boolean | Flight, aquatic, venom, range, regeneration and construct/undead |
| `data_confidence` | enum | `high`, `medium`, `low`, `modelled` |
| `source_label` | string | Provenance warning or source description |
| `source_url` | URL | Orientation reference |
| `model_notes` | string | Assumptions and cautions |

Machine-readable constraints are provided in `data/creature.schema.json` and `data/scenario.schema.json`.

## 13. Content, safety and trust boundaries

### Allowed built-in content

- real animal species and extinct species;
- generic adult humans and abstract historical-style equipment profiles;
- generic or public-domain fantasy creatures;
- abstract fictional and historical mass conflict without graphic depiction.

### Excluded or restricted content

- named living people;
- children;
- targeting of real protected groups;
- scenarios framed as instructions for animal cruelty or real violence;
- modern franchise characters without permission;
- graphic wounds, gore or celebratory suffering.

### Trust copy

Every public result should include a compact statement equivalent to:

> Entertainment model using representative peak-adult profiles and authored assumptions. It is not a scientific prediction, welfare guide or instruction for real-world harm.

Fantasy and conceptual-scale results need additional warnings.

## 14. Technical architecture

### 14.1 Current stack

- React 19.2.7
- React DOM 19.2.7
- TypeScript 7.0.2
- Vite 8.1.5
- Vitest 4.1.10
- Static JSON data
- Browser APIs: URLSearchParams, localStorage, Clipboard and Canvas

Versions are pinned in `app/package.json` and `app/package-lock.json` for reproducible handoff. Before a production release, verify runtime and browser support because these dependencies will continue to evolve.

### 14.2 Repository layout

```text
what-would-win-handoff/
├── app/
│   ├── src/
│   │   ├── components/          UI panels and result report
│   │   ├── data/                bundled creature and test JSON
│   │   ├── simulation/          quantity, PRNG, engine and share codec
│   │   ├── test/                Vitest regression tests
│   │   ├── App.tsx
│   │   ├── styles.css
│   │   └── types.ts
│   ├── dist/                    production static build
│   ├── package.json
│   └── package-lock.json
├── data/                        editable CSV/JSON, schemas and fixtures
├── docs/                        planning and Codex documentation
└── scripts/                     data generation/maintenance utility
```

### 14.3 Key modules

- `simulation/quantity.ts` parses arbitrary quantities and formats log quantities.
- `simulation/random.ts` supplies deterministic hashing, seeded PRNG and normal sampling.
- `simulation/engine.ts` resolves profiles, calculates deterministic power, runs trials and builds reports.
- `simulation/share.ts` serializes and restores scenarios in URLs.
- `components/CreaturePanel.tsx` handles profile, size and simple controls.
- `components/StatControls.tsx` renders normalized stat inputs.
- `components/ResultPanel.tsx` renders depth-sensitive output.

### 14.4 Static-first rationale

The current product needs no database, authentication or remote AI call. A static deployment is cheap, fast, private and resistant to backend failure. It also allows the entire initial experience to run locally after page load.

A backend becomes justified when the product adds public galleries, moderated uploads, analytics beyond simple page events, cloud accounts, source-research pipelines or AI-assisted custom profile generation.

### 14.5 Performance targets

- Initial compressed JavaScript under 150 kB where practical, with raw CI ceilings of 580 kB JavaScript and 700 kB total deployable content. Record observed model-0.3 build sizes in `docs/QA_REPORT.md` after the final production build.
- First result interaction under 100 ms on a recent desktop and under 300 ms on a typical mobile device for 15,000 trials.
- No main-thread allocation proportional to group quantity.
- Largest Contentful Paint under 2.5 seconds on a normal 4G connection after hosting compression and cache headers.

## 15. Hosting on samfa12.com

### Build

```bash
cd app
npm ci
npm run test
npm run typecheck
npm run build
```

Upload the contents of `app/dist/` to the intended document root or subdirectory. The Vite configuration uses relative asset paths, so the build works in a subdirectory as well as the domain root.

### Recommended production setup

- HTTPS only.
- Brotli or gzip for HTML, CSS and JavaScript.
- Long immutable cache for hashed files in `assets/`.
- Short cache for `index.html`.
- Content Security Policy that permits same-origin scripts/styles and `data:` only where required for exported canvas content.
- A custom 404 fallback to `index.html` only if route-based navigation is added later. Current share links use query parameters and do not require a history fallback.
- Add Open Graph/Twitter metadata and a default social image before launch.
- Add a privacy page explaining local history and any analytics.

### Suggested paths

- `https://samfa12.com/what-would-win/` — app
- `https://samfa12.com/what-would-win/about` — methodology and disclaimers, once route support exists
- `https://samfa12.com/what-would-win/data` — data methodology, not a raw promise of scientific authority

## 16. Analytics and viral loop

Use privacy-conscious analytics and avoid storing full custom scenario text unless disclosed. Useful events:

- simulation run;
- report-depth selection;
- advanced dossier opened;
- share-link copied;
- result PNG downloaded;
- result JSON downloaded;
- history restored;
- quantity classified as ordinary, large or conceptual;
- profile category pair, using IDs rather than free text.

Primary metrics:

- simulation runs per visit;
- share actions per completed run;
- return visits within seven days;
- percentage using advanced controls;
- percentage trying a second assumption or re-roll;
- top built-in matchups;
- mobile completion rate.

The strongest viral loop is: **see absurd result → open reproducible scenario → change one assumption → share counter-result**.

## 17. Testing strategy

### 17.1 Automated tests already included

- quantity parsing and rejection;
- scientific-notation formatting;
- 16 matchup acceptance bands spanning living, extinct, fantasy, cryptid, marine, extreme-resizing and conceptual cases;
- focused directional tests for mindset, win condition, knowledge, awareness, facing, resized water geometry, group doctrine, casualty tolerance, arena escape and disclosure-only specimen metadata;
- model-0.3 invariants for quantity-one role reversal, fixed-biomass fragmentation, bilateral stopping, access ceilings, conceptual confidence continuity, preparation caps and factor-ledger traceability;
- technical trial-count selection;
- deterministic reproducibility with the same seed;
- deterministic power stability across different uncertainty seeds.

The fixtures are behavioural calibration bands, not assertions of objective biological truth.

### 17.2 Required next tests

- browser-automated PNG export and file-content smoke tests;
- property-based scenario/share-codec tests across valid field combinations;
- broader property-based sensitivity and metamorphic tests across valid field combinations and archetypes;
- migration fixtures for every future model/data/share version change;
- manual NVDA/VoiceOver and physical Safari/iOS checks;
- deployment smoke tests from the intended `samfa12.com` subpath.

### 17.3 Calibration protocol

1. Maintain a balanced benchmark suite across archetypes rather than tuning to one famous question.
2. Record the reason for every coefficient change.
3. Run sensitivity analysis to identify dominant parameters.
4. Avoid “correcting” outputs solely to match online consensus.
5. Have at least one zoology/biomechanics reviewer assess real-animal inputs and one game-systems reviewer assess fun and legibility.
6. Version the engine and preserve old shared results or visibly mark model-version changes.

## 18. Launch acceptance criteria

A public beta is ready when:

- a new user can complete and share the default scenario on desktop and mobile;
- all P0 tests pass on the deployment build;
- invalid quantities fail safely;
- report depth visibly changes content and trial count;
- the same share URL reproduces the same result under the same model/data versions, while older supported versions migrate inputs and visibly recalculate;
- no built-in profile violates the content/IP policy;
- every creature has a source label, notes and confidence value;
- the peak-adult and entertainment-model disclosures are visible before and after a run;
- keyboard navigation and screen-reader smoke testing pass;
- the app has a privacy statement and no undisclosed remote data transfer;
- a model version is included in exported JSON.

## 19. Roadmap

### Phase 0 — handoff prototype (delivered)
Static React demo, 134-profile data, deterministic-plus-Monte-Carlo model, exports, history, documentation and calibration tests.

### Phase 1A — trustworthy-beta foundation (delivered in v0.2)

- versioned scenarios, exports, history and compact share links with migration;
- integrated schema validation and complete licensing provenance records for all bundled profiles;
- local named custom profiles cloned from built-ins, with import/export and reproducible sharing;
- automated accessibility, browser, performance and build-size gates;
- visible methodology, assumptions and rules-of-engagement controls;
- 134 built-in profiles and the 12-fixture calibration baseline.

### Phase 1B — model 0.3 audit (delivered)

- scaled geometry before environment, water, frontage and occupancy calculations;
- explicit amphibious/land-capable data traits;
- bilateral stopping and attack access with continuous range/resource effects;
- bounded-arena occupancy, active frontage, logarithmic reserve weighting, access ceilings and bounded area control;
- continuous confidence handling at conceptual scale with physical duration/loss withholding;
- reconstructable factor ledger and seven ordinary/three conceptual explanation phases;
- 16 calibration fixtures plus extreme-scale and metamorphic invariants;
- model-0.2 share/history input migration with visible recalculation under model 0.3 and honest pending states for unavailable custom references.

### Phase 1C — trustworthy beta (next)

- complete expert-reviewed per-field provenance, licences and cultural-sensitivity review;
- improve archetype-specific allometry, contact saturation and group exponents;
- run manual assistive-technology and physical-device testing;
- add Open Graph result preview generation and public privacy/methodology pages;
- deploy to a staging subpath and collect structured user-test feedback.

### Phase 2 — shareability

- compact URL encoding and optional short links;
- scenario comparison mode (“strict vs magical”);
- embeddable result cards;
- featured matchup prompts without a public unmoderated gallery;
- search and filters across the creature database;
- local collections and favourites.

### Phase 3 — deeper modelling

- mixed-team advanced army builder;
- archetype-specific and multi-front spatial/contact refinement beyond the current single-front heuristic;
- per-field uncertainty distributions;
- sensitivity charts;
- separate flying, terrestrial and aquatic scaling models;
- optional AI assistant that proposes structured custom stats while the deterministic engine remains authoritative.

### Phase 4 — community, only with moderation capacity

- accounts and cloud saves;
- moderated public gallery;
- voting, remixes and model-version comparisons;
- transparent reporting and IP takedown workflow.

## 20. Ordered Codex backlog

### Delivered in v0.2

Model/data/share versioning, integrated schemas, compact and migrated links, local named custom profiles, calibrated methodology controls, browser/accessibility automation, performance budgets, public-release hardening and a coefficient changelog are complete and regression-tested.

### Delivered in v0.3

The engine/data audit, resized environment geometry, explicit land/amphibious traits, bilateral stopping/access, continuous ranged-resource handling, frontage/reserve weighting, access ceilings, bounded area control, conceptual safeguards, factor-backed encounter phases and 16-fixture calibration suite are implemented. The detailed rationale and remaining risks are recorded in `docs/MODEL_AUDIT_0.3.md`.

### P0 — user-test and deployment preparation

1. Run manual exploratory tests, NVDA/VoiceOver checks and physical Safari/iOS tests.
2. Validate the built app from the intended `samfa12.com` staging subpath.
3. Test PNG and JSON downloads on representative mobile and desktop devices.
4. Add privacy, methodology and contact/reporting pages plus Open Graph metadata.
5. Complete cultural-sensitivity review for cryptid composites; the repository-wide data-licence review is complete.
6. Collect structured user feedback before changing calibration coefficients.

### P1 — data quality

1. Replace broad orientation evidence with primary, expert-reviewed per-field scientific provenance.
2. Add sex/age/subspecies and distribution fields.
3. Build a script that reports missing values, outliers, duplicate IDs and unknown tags.
4. Define a controlled vocabulary for habitats, attack modes and traits.
5. Review the top 30 most-used profiles first.
6. Preserve the completed licence classifications and reject restricted or unreviewed new source content.

### P2 — modelling research

1. Split group exponent parameters by swarm, pack, formation, herd and uncoordinated crowd.
2. Replace global strict-scaling logic with locomotor archetype functions.
3. Replace the current single-front heuristic with archetype-specific, multi-front and three-dimensional contact models.
4. Model incapacitation thresholds and rate limits separately from aggregate power.
5. Add global sensitivity analysis and display the top uncertain inputs.
6. Evaluate whether probability compression should emerge from field-level distributions rather than fixed coefficients.

## 21. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| False scientific authority | Users treat outputs as facts | Persistent disclaimers, source confidence, raw vs adjusted probability, methodology page |
| Overfitting to memes | Engine behaves badly outside famous cases | Diverse calibration suite and coefficient changelog |
| Poor data provenance | Trust and licensing problems | Per-field sources, licences and reviewer workflow |
| Fantasy IP complaints | Removal requests or brand risk | Generic/public-domain built-ins; private user customs; moderation before gallery |
| Extreme quantity nonsense | Misleading physical staging | Conceptual warning, aggregate-only explanation, duration/loss withholding and a separate logistics mode in future |
| URL payload growth | Links become too long, especially with customs | Compression, short-link service or share JSON upload later |
| Local data loss | Users lose saved customs/history | Clear local-only copy and JSON export |
| Mobile complexity | Advanced UI becomes overwhelming | Progressive disclosure and fast path kept above advanced dossier |
| Coefficient regressions | Unexpected result shifts | Engine/data versioning and behavioural tests |
| Harmful scenario use | Cruelty or targeting concerns | Abstract language, content rules, gallery moderation and no named living people |

## 22. Open research questions

- What group-effectiveness function best represents contact saturation across different body-size ratios?
- How should the current reach/footprint/terrain frontage heuristic be validated and split by swarm, pack, formation, flight and aquatic archetype?
- Which physical measures most reliably predict combat-relevant durability without inventing false precision?
- How should flight endurance and ranged ammunition interact with very large ground groups?
- What uncertainty distributions are appropriate for extinct reconstructions and fantasy profiles?
- How should surrender, fear and escape be modelled separately from physical incapacitation?
- Should the current conceptual threshold vary by arena/creature scale, or should a future logistics mode replace aggregate combat beyond it?

These are product-research questions, not blockers. The delivered model provides a clear baseline against which more sophisticated approaches can be tested.

## 23. Reference foundation

The model is informed by, but not a direct implementation of, the following source categories:

1. Nature Scitable, **Allometry: The Study of Biological Scaling** — https://www.nature.com/scitable/knowledge/library/allometry-the-study-of-biological-scaling-13228439/
2. National Research Council / NCBI Bookshelf, **Allometry: Body Size Constraints in Animal Design** — https://www.ncbi.nlm.nih.gov/books/NBK218080/
3. Jones et al., **PanTHERIA: a species-level database of life history, ecology and geography of extant and recently extinct mammals**, DOI 10.1890/08-1494.1 — https://doi.org/10.1890/08-1494.1
4. PanTHERIA dataset collection — https://doi.org/10.6084/m9.figshare.c.3301274.v1
5. University of Michigan, **Animal Diversity Web** — https://animaldiversity.org/
6. US EPA, **Guiding Principles for Monte Carlo Analysis** — https://www.epa.gov/risk/guiding-principles-monte-carlo-analysis
7. NIST Technical Note 1900, **Simple Guide for Evaluating and Expressing the Uncertainty of NIST Measurement Results** — https://nvlpubs.nist.gov/nistpubs/TechnicalNotes/NIST.TN.1900.pdf

These references justify the use of size-aware modelling, structured trait data and explicit uncertainty. They do **not** validate the prototype's combat coefficients. Those coefficients remain documented game-design assumptions pending calibration and expert review.

## 24. Definition of done for the next Codex session

The next session should begin by running the existing tests and reading `docs/CODEX_HANDOFF.md`. A successful user-test preparation iteration should:

1. preserve all current passing tests;
2. run manual exploratory, NVDA/VoiceOver and physical Safari/iOS checks;
3. expand expert-reviewed scientific provenance while preserving the completed data/licence audit;
4. complete cultural-sensitivity review for living-tradition cryptid composites;
5. validate the production build from the intended `samfa12.com` subpath;
6. collect structured feedback before changing calibration coefficients.

## Appendix A. Delivered artifact inventory

| Artifact | Location | Purpose |
|---|---|---|
| Production-ready source | `app/src/` | React/TypeScript UI and simulation engine |
| Static deployment build | `app/dist/` | Files to upload to the web host |
| Dependency lock | `app/package-lock.json` | Reproducible package installation |
| Creature database | `data/creatures.json` / `.csv` | Application and editable data formats |
| Data contracts | `data/*.schema.json` | Machine-readable record validation |
| Calibration fixtures | `data/test_scenarios.json` / `.csv` | Behavioural acceptance bands |
| Full product plan | `docs/What_Would_Win_Product_Plan.md` | Canonical product, model, data and roadmap specification |
| Model 0.3 audit | `docs/MODEL_AUDIT_0.3.md` | Audit findings, corrections, calibration coverage and remaining risks |
| Codex handoff | `docs/CODEX_HANDOFF.md` | Continuation instructions and paste-ready prompt |
| Data dictionary | `data/DATA_DICTIONARY.md` | Field semantics and editing rules |
| QA report | `docs/QA_REPORT.md` | Build, test and visual-check status |
| Maintenance scripts | `scripts/` | Data generation and Git-index checksum utilities |

## Appendix B. Model 0.3 calibration guardrails

The canonical suite contains 16 deterministic seeded scenarios. Acceptance bands and purposes live in `data/test_scenarios.json` and are summarized in `docs/MODEL_AUDIT_0.3.md`; final command counts and aggregate calibration status belong in `docs/QA_REPORT.md`.

The suite covers the classic cross-scaling matchup, megafauna versus packs/swarms, multi-target pressure, ranged/flight/resource interaction, marine environments, extinct reconstructions, fixed cryptid and mythological assumptions, conceptual quantity, bilateral stopping, flight-access ceilings and severe dry-land aquatic mismatch.

These are regression observations and behavioural guardrails, not declarations of objective truth. A coefficient change should be assessed across the whole set plus focused invariants. A change that makes one meme answer feel better but damages unrelated archetypes is a regression, not an improvement.

## Appendix C. Public-beta release checklist

- [x] Confirm code and data licences.
- [x] Add model and data version constants.
- [x] Run schema validation, tests, typecheck and production build.
- Complete keyboard, axe, VoiceOver/NVDA, Safari iOS and Firefox checks.
- Replace or strengthen provenance for the most frequently used profiles.
- Add privacy, methodology and contact/reporting pages.
- Add Open Graph metadata and a default social preview.
- Configure HTTPS, compression, cache headers and monitoring on `samfa12.com`.
- [x] Test copied share links from a clean browser profile.
- Test PNG and JSON downloads on mobile and desktop.
- Publish a changelog and retain the previous deploy for rollback.
