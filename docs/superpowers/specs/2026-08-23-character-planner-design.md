# Character Planner — Design

Date: 2026-08-23

## Goal
New page in Skyrim Tools: plan a character build — race, standing stone, target skill levels, perk allocation across all 18 vanilla SE/AE skill trees — with validation (prereqs, skill gates, perk-point budget), computed character level, and save/load/share.

## Scope (v1)
- Race select (10) → starting skill levels (15 base + racial bonuses) + racial power/passive text.
- Standing stone select (13) → effect text.
- Per-skill target level (15–100, floored at racial start).
- Perk allocation: every vanilla perk w/ ranks; +/− buttons; locked until prereq perk taken AND skill target ≥ rank's skill requirement.
- Derived: character level reached from skill targets (Skyrim formula), perk points earned (= level − 1), points spent, remaining; list of violations.
- Builds: multiple named builds in localStorage; URL-hash share string.

Out of scope: constellation SVG, mod perk trees, quest/Oghma/Dragonborn-DLC extra perk points, health/magicka/stamina planning, gear/enchant synergy.

## Data (`assets/`)
Follow alchemy convention: JSON committed, imported directly.
- `skills.json`: `[{id, name, category:"combat"|"magic"|"stealth"}]` (18).
- `perks.json`: `[{id, skill, name, ranks:[{skillReq:number, desc:string}], requires:[perkId...]}]`. `requires` = list of alternatives (any one satisfies, matching in-game OR prereqs). Root perks have `requires: []`. ~251 perks.
- `races.json`: `[{id, name, skills:{skillId:bonus}, power, passives:[string]}]` (10).
- `stones.json`: `[{id, name, effect}]` (13).

## Logic — `src/lib/character.js` (pure, unit-tested)
- `startingSkills(race)` → `{skillId: 15 + bonus}`.
- `levelFromSkills(startSkills, targetSkills)` → `{level, perkPoints}`.
  Skyrim formula: each skill-up from s→s+1 grants s (times 1) char XP; char level L→L+1 needs 25·(L+1)+… cumulative = `sum_{k=2..L} 25·k` … implement as: XP to reach level L from L−1 = 25·L + ... Use canonical: XP required for level-up from L = 25 × L + ... — confirm against UESP during impl; encode as `xpForLevel(L)` and test w/ known table (all skills 100 from 15 → level 81).
- `canTakeRank(build, perk, rank)` → boolean: rank−1 held, skill target ≥ ranks[rank−1].skillReq, any of `requires` held ≥1 rank.
- `validateBuild(build, data)` → `[{perkId, reason}]` + `overspent:boolean`.
- `encodeBuild(build)` / `decodeBuild(str)` — compact: race, stone, skills (18 numbers), perk ranks keyed by index in perks.json. base64url of JSON or delimited string; round-trip tested.

## State — `src/lib/useBuild.js`
`useReducer`; shape `{id, name, race, stone, skills:{skillId:level}, perks:{perkId:rank}}`.
Actions: `setName, setRace, setStone, setSkill, setPerk, load, reset`.
Setting race re-floors skills; lowering a skill auto-drops now-invalid ranks (cascade); removing a perk cascades dependents.
Persistence helpers `src/lib/buildStore.js`: `listBuilds/saveBuild/deleteBuild` on `localStorage['skyrim.builds']`; hash read on mount.

## UI — `src/pages/CharacterPlanner.jsx` + `src/style/planner.module.css`
- Header: name input, race select, stone select, build picker (saved list), Save / New / Delete / Copy link, back link.
- Summary bar: Level, Perks used/available (red if over), violations count.
- Three columns by category; each skill panel: name, level number input (+ range), perk rows: `name (r/R)` `[−][+]`, tooltip/desc line, greyed when locked w/ reason (`needs X` / `skill 40`).
- Wire: `App.jsx` `<State name="planner">`, Landing `<StateLink to="planner">Character Planner</StateLink>`.

## Testing
Add `vitest` devDep + `"test": "vitest run"`. Tests for `character.js` (level formula table, prereq gating, cascade, encode/decode) and `buildStore.js` (localStorage mock). UI smoke-checked manually via `npm run dev`.

## Error handling
Bad hash → ignore, start blank. Corrupt localStorage → treat as empty. Unknown perk ids on load → dropped.
