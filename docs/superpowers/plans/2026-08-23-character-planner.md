# Character Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Character Planner page (race, standing stone, skill targets, perk allocation, level/perk-point budget, save/load/share) to the Skyrim Tools React app.

**Architecture:** Static JSON data in `assets/` (same convention as alchemy). Pure logic in `src/lib/character.js` (level formula, perk gating, validation, encode/decode) + `src/lib/buildStore.js` (localStorage) + a pure reducer in `src/lib/buildReducer.js`; one page component `src/pages/CharacterPlanner.jsx` wired into the existing ygdrassil `StateMachine` in `App.jsx`.

**Tech Stack:** Vite 7, React 19, ygdrassil (`StateMachine/State/StateLink`), CSS modules, vitest (new).

**Spec:** `docs/superpowers/specs/2026-08-23-character-planner-design.md`

## Global Constraints
- Vanilla Skyrim SE/AE data only; 18 skills, 10 races, 13 standing stones.
- Skill base level 15; racial bonus +10 (primary) / +5.
- Level formula: skill increase to level s grants s XP; XP for char level L→L+1 = `75 + 25*L`; perk points = level − 1.
- Perk `requires` = array of alternative perk ids (any one held, any rank, satisfies). Root perks `requires: []`.
- No new runtime deps. Dev dep: `vitest` only.
- Commit after each task. ESM (`"type": "module"`).
- Windows shell: use `npx vitest run`.

---

### Task 1: Test harness + skills/races/stones data

**Files:**
- Modify: `package.json` (add `vitest` devDep, `"test": "vitest run"`)
- Create: `assets/skills.json`, `assets/races.json`, `assets/stones.json`
- Test: `src/lib/__tests__/data.test.js`

**Interfaces:**
- Produces: `assets/skills.json` = `[{id, name, category}]`; ids: `archery, block, heavy_armor, one_handed, smithing, two_handed, alteration, conjuration, destruction, enchanting, illusion, restoration, alchemy, light_armor, lockpicking, pickpocket, sneak, speech`. Categories: first 6 `combat`, next 6 `magic`, last 6 `stealth`.
- `assets/races.json` = `[{id, name, skills:{skillId:bonus}, power, passives:[string]}]`.
- `assets/stones.json` = `[{id, name, effect}]`.

- [ ] **Step 1: Install vitest, add script** — `npm i -D vitest`; add `"test": "vitest run"` to scripts.

- [ ] **Step 2: Write failing test** `src/lib/__tests__/data.test.js`:

```js
import { describe, it, expect } from 'vitest'
import skills from '../../../assets/skills.json'
import races from '../../../assets/races.json'
import stones from '../../../assets/stones.json'

describe('skills.json', () => {
  it('has 18 skills, 6 per category', () => {
    expect(skills).toHaveLength(18)
    for (const c of ['combat', 'magic', 'stealth'])
      expect(skills.filter(s => s.category === c)).toHaveLength(6)
    expect(new Set(skills.map(s => s.id)).size).toBe(18)
  })
})

describe('races.json', () => {
  it('has 10 races, each with one +10 and five +5 bonuses on valid skills', () => {
    expect(races).toHaveLength(10)
    const ids = new Set(skills.map(s => s.id))
    for (const r of races) {
      const vals = Object.values(r.skills)
      expect(vals.filter(v => v === 10)).toHaveLength(1)
      expect(vals.filter(v => v === 5)).toHaveLength(5)
      for (const k of Object.keys(r.skills)) expect(ids.has(k)).toBe(true)
      expect(typeof r.power).toBe('string')
      expect(Array.isArray(r.passives)).toBe(true)
    }
  })
})

describe('stones.json', () => {
  it('has 13 stones with effect text', () => {
    expect(stones).toHaveLength(13)
    for (const s of stones) expect(s.effect.length).toBeGreaterThan(5)
  })
})
```

- [ ] **Step 3: Run, expect FAIL** — `npx vitest run` → module not found.

- [ ] **Step 4: Author data**

`assets/skills.json`:
```json
[
  {"id":"archery","name":"Archery","category":"combat"},
  {"id":"block","name":"Block","category":"combat"},
  {"id":"heavy_armor","name":"Heavy Armor","category":"combat"},
  {"id":"one_handed","name":"One-Handed","category":"combat"},
  {"id":"smithing","name":"Smithing","category":"combat"},
  {"id":"two_handed","name":"Two-Handed","category":"combat"},
  {"id":"alteration","name":"Alteration","category":"magic"},
  {"id":"conjuration","name":"Conjuration","category":"magic"},
  {"id":"destruction","name":"Destruction","category":"magic"},
  {"id":"enchanting","name":"Enchanting","category":"magic"},
  {"id":"illusion","name":"Illusion","category":"magic"},
  {"id":"restoration","name":"Restoration","category":"magic"},
  {"id":"alchemy","name":"Alchemy","category":"stealth"},
  {"id":"light_armor","name":"Light Armor","category":"stealth"},
  {"id":"lockpicking","name":"Lockpicking","category":"stealth"},
  {"id":"pickpocket","name":"Pickpocket","category":"stealth"},
  {"id":"sneak","name":"Sneak","category":"stealth"},
  {"id":"speech","name":"Speech","category":"stealth"}
]
```

`assets/races.json` (+10 first, then five +5):
| id | name | +10 | +5 | power | passives |
|---|---|---|---|---|---|
| altmer | High Elf | illusion | alteration, conjuration, destruction, enchanting, restoration | Highborn: regenerate magicka rapidly for 60s | +50 Magicka |
| argonian | Argonian | lockpicking | alteration, light_armor, pickpocket, restoration, sneak | Histskin: regenerate health 10x for 60s | Water breathing; 50% disease resistance |
| bosmer | Wood Elf | archery | alchemy, light_armor, lockpicking, pickpocket, sneak | Command Animal: make an animal an ally for 60s | 50% poison & disease resistance |
| breton | Breton | conjuration | alchemy, alteration, illusion, restoration, speech | Dragonskin: absorb 50% of spell magicka for 60s | 25% magic resistance |
| dunmer | Dark Elf | destruction | alchemy, alteration, illusion, light_armor, sneak | Ancestor's Wrath: fire cloak 60s | 50% fire resistance |
| imperial | Imperial | restoration | block, destruction, enchanting, heavy_armor, one_handed | Voice of the Emperor: calm nearby people 60s | Imperial Luck: extra gold in containers |
| khajiit | Khajiit | sneak | alchemy, archery, lockpicking, one_handed, pickpocket | Night Eye: see in the dark 60s | Claws: unarmed +15 damage |
| nord | Nord | two_handed | block, light_armor, one_handed, smithing, speech | Battle Cry: nearby enemies flee 30s | 50% frost resistance |
| orc | Orc | heavy_armor | block, enchanting, one_handed, smithing, two_handed | Berserker Rage: take half, deal double damage 60s | (none) |
| redguard | Redguard | one_handed | alteration, archery, block, destruction, smithing | Adrenaline Rush: stamina regenerates 10x for 60s | 50% poison resistance |

JSON shape: `{"id":"altmer","name":"High Elf","skills":{"illusion":10,"alteration":5,...},"power":"Highborn: ...","passives":["+50 Magicka"]}`. Orc `passives: []`.

`assets/stones.json` (13), `{"id":"warrior","name":"The Warrior Stone","effect":"Combat skills increase 20% faster."}`: warrior (combat skills +20% faster), mage (magic skills +20% faster), thief (stealth skills +20% faster), lover (all skills +15% faster), lord (+50 armor, +25% magic resistance), lady (+25% health & stamina regen), steed (+100 carry weight; armor no weight/speed penalty), apprentice (+100% magicka regen, 100% weakness to magic), atronach (+50 magicka, absorb 50% spells, −50% magicka regen), ritual (power: raise nearby dead for 200s, once/day), serpent (power: paralyze 5s + 25 poison dmg/s, once/day), shadow (power: invisibility 60s, once/day), tower (power: unlock one expert-or-lower lock, once/day).

- [ ] **Step 5: Run, expect PASS.**
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(planner): vitest + skills/races/stones data"`

---

### Task 2: perks.json

**Files:**
- Create: `assets/perks.json`
- Test: `src/lib/__tests__/perks.test.js`

**Interfaces:**
- Produces: `[{id, skill, name, ranks:[{skillReq, desc}], requires:[perkId]}]`. `id` = `<skill>.<snake_name>` (e.g. `archery.overdraw`, `one_handed.armsman`; mage trees use `alteration.novice`, `.apprentice`, `.adept`, `.expert`, `.master`, `.dual_casting`; lockpicking `lockpicking.novice_locks` etc.; apostrophes dropped: `hunters_discipline`, `champions_stance`, `assassins_blade`). 180 perks / 251 ranks total.

- [ ] **Step 1: Write failing test** `src/lib/__tests__/perks.test.js`:

```js
import { describe, it, expect } from 'vitest'
import perks from '../../../assets/perks.json'
import skills from '../../../assets/skills.json'

const COUNTS = { // [perks, ranks]
  archery:[9,16], block:[9,13], heavy_armor:[8,12], one_handed:[10,21], smithing:[10,10], two_handed:[9,19],
  alteration:[10,14], conjuration:[15,16], destruction:[14,17], enchanting:[9,13], illusion:[13,13], restoration:[12,13],
  alchemy:[9,15], light_armor:[6,10], lockpicking:[11,11], pickpocket:[8,12], sneak:[9,13], speech:[9,13],
}

describe('perks.json', () => {
  const ids = new Set(perks.map(p => p.id))
  it('has unique ids and 180 perks / 251 ranks', () => {
    expect(ids.size).toBe(perks.length)
    expect(perks).toHaveLength(180)
    expect(perks.reduce((n, p) => n + p.ranks.length, 0)).toBe(251)
  })
  it('per-tree counts match vanilla', () => {
    for (const s of skills) {
      const tree = perks.filter(p => p.skill === s.id)
      expect([tree.length, tree.reduce((n, p) => n + p.ranks.length, 0)], s.id).toEqual(COUNTS[s.id])
    }
  })
  it('requires reference same-tree perks; ranks ascending; desc present', () => {
    for (const p of perks) {
      expect(p.id.startsWith(p.skill + '.')).toBe(true)
      for (const r of p.requires) {
        expect(ids.has(r), `${p.id} requires ${r}`).toBe(true)
        expect(r.startsWith(p.skill + '.')).toBe(true)
      }
      for (let i = 0; i < p.ranks.length; i++) {
        expect(typeof p.ranks[i].desc).toBe('string')
        if (i) expect(p.ranks[i].skillReq).toBeGreaterThan(p.ranks[i-1].skillReq)
      }
    }
  })
  it('every tree has exactly one root perk with skillReq 0', () => {
    for (const s of skills) {
      const roots = perks.filter(p => p.skill === s.id && p.requires.length === 0)
      expect(roots, s.id).toHaveLength(1)
      expect(roots[0].ranks[0].skillReq).toBe(0)
    }
  })
})
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Author `assets/perks.json`** from the tables below. Format: `Name skillReq[/skillReq…] | requires (names, same tree; comma = OR; — = root)`. Each rank gets a one-line `desc` with the vanilla effect (e.g. Armsman r1 "One-handed weapons do 20% more damage", r2 40%… ). Recommended: throwaway Node script in scratchpad generating JSON; commit JSON only.

**archery**: Overdraw 0/20/40/60/80 | — · Eagle Eye 30 | Overdraw · Critical Shot 30/60/90 | Overdraw · Steady Hand 40/60 | Eagle Eye · Power Shot 50 | Eagle Eye · Hunter's Discipline 50 | Critical Shot · Ranger 60 | Hunter's Discipline · Quick Shot 70 | Power Shot · Bullseye 100 | Quick Shot, Ranger

**block**: Shield Wall 0/20/40/60/80 | — · Quick Reflexes 30 | Shield Wall · Deflect Arrows 30 | Shield Wall · Power Bash 30 | Shield Wall · Elemental Protection 50 | Deflect Arrows · Deadly Bash 50 | Power Bash · Block Runner 70 | Elemental Protection · Disarming Bash 70 | Deadly Bash · Shield Charge 100 | Block Runner, Disarming Bash

**heavy_armor**: Juggernaut 0/20/40/60/80 | — · Fists of Steel 30 | Juggernaut · Well Fitted 30 | Juggernaut · Cushioned 50 | Fists of Steel · Tower of Strength 50 | Well Fitted · Conditioning 70 | Cushioned · Matching Set 70 | Tower of Strength · Reflect Blows 100 | Matching Set

**one_handed**: Armsman 0/20/40/60/80 | — · Fighting Stance 20 | Armsman · Bladesman 30/60/90 | Armsman · Bone Breaker 30/60/90 | Armsman · Hack and Slash 30/60/90 | Armsman · Dual Flurry 30/50 | Armsman · Savage Strike 50 | Fighting Stance · Critical Charge 50 | Fighting Stance · Dual Savagery 70 | Dual Flurry · Paralyzing Strike 100 | Savage Strike, Critical Charge

**smithing**: Steel Smithing 0 | — · Elven Smithing 30 | Steel Smithing · Dwarven Smithing 30 | Steel Smithing · Arcane Blacksmith 60 | Steel Smithing · Advanced Armors 50 | Elven Smithing · Orcish Smithing 50 | Dwarven Smithing · Glass Smithing 70 | Advanced Armors · Ebony Smithing 80 | Orcish Smithing · Daedric Smithing 90 | Ebony Smithing · Dragon Armor 100 | Glass Smithing, Daedric Smithing

**two_handed**: Barbarian 0/20/40/60/80 | — · Champion's Stance 20 | Barbarian · Limbsplitter 30/60/90 | Barbarian · Deep Wounds 30/60/90 | Barbarian · Skull Crusher 30/60/90 | Barbarian · Devastating Blow 50 | Champion's Stance · Great Critical Charge 50 | Champion's Stance · Sweep 70 | Devastating Blow, Great Critical Charge · Warmaster 100 | Sweep

**alteration**: Novice Alteration 0 | — · Apprentice Alteration 25 | Novice · Adept Alteration 50 | Apprentice · Expert Alteration 75 | Adept · Master Alteration 100 | Expert · Alteration Dual Casting 20 | Novice · Mage Armor 30/50/70 | Novice · Magic Resistance 30/50/70 | Apprentice · Stability 70 | Adept · Atronach 100 | Magic Resistance

**conjuration**: Novice Conjuration 0 | — · Apprentice 25 | Novice · Adept 50 | Apprentice · Expert 75 | Adept · Master 100 | Expert · Conjuration Dual Casting 20 | Novice · Mystic Binding 20 | Novice · Summoner 30/70 | Novice · Necromancy 40 | Novice · Soul Stealer 30 | Mystic Binding · Atromancy 40 | Summoner · Oblivion Binding 50 | Soul Stealer · Dark Souls 70 | Necromancy · Elemental Potency 80 | Atromancy · Twin Souls 100 | Dark Souls, Elemental Potency

**destruction**: Novice Destruction 0 | — · Apprentice 25 | Novice · Adept 50 | Apprentice · Expert 75 | Adept · Master 100 | Expert · Destruction Dual Casting 20 | Novice · Augmented Flames 30/60 | Novice · Augmented Frost 30/60 | Novice · Augmented Shock 30/60 | Novice · Impact 40 | Dual Casting · Rune Master 40 | Apprentice · Intense Flames 50 | Augmented Flames · Deep Freeze 60 | Augmented Frost · Disintegrate 70 | Augmented Shock

**enchanting**: Enchanter 0/20/40/60/80 | — · Soul Squeezer 20 | Enchanter · Fire Enchanter 30 | Enchanter · Insightful Enchanter 50 | Enchanter · Soul Siphon 40 | Soul Squeezer · Frost Enchanter 40 | Fire Enchanter · Storm Enchanter 50 | Frost Enchanter · Corpus Enchanter 70 | Insightful Enchanter · Extra Effect 100 | Storm Enchanter, Corpus Enchanter

**illusion**: Novice Illusion 0 | — · Apprentice 25 | Novice · Adept 50 | Apprentice · Expert 75 | Adept · Master 100 | Expert · Illusion Dual Casting 20 | Novice · Animage 20 | Novice · Hypnotic Gaze 30 | Novice · Kindred Mage 40 | Animage · Aspect of Terror 50 | Hypnotic Gaze · Quiet Casting 50 | Kindred Mage · Rage 70 | Aspect of Terror · Master of the Mind 90 | Quiet Casting, Rage

**restoration**: Novice Restoration 0 | — · Apprentice 25 | Novice · Adept 50 | Apprentice · Expert 75 | Adept · Master 100 | Expert · Restoration Dual Casting 20 | Novice · Regeneration 20 | Novice · Respite 40 | Novice · Recovery 30/60 | Regeneration · Necromage 70 | Regeneration · Ward Absorb 60 | Respite · Avoid Death 90 | Recovery

**alchemy**: Alchemist 0/20/40/60/80 | — · Physician 20 | Alchemist · Benefactor 30 | Physician · Poisoner 30 | Physician · Experimenter 50/70/90 | Benefactor · Concentrated Poison 60 | Poisoner · Green Thumb 70 | Concentrated Poison · Snakeblood 80 | Experimenter, Concentrated Poison · Purity 100 | Snakeblood

**light_armor**: Agile Defender 0/20/40/60/80 | — · Custom Fit 30 | Agile Defender · Unhindered 50 | Custom Fit · Matching Set 70 | Custom Fit · Wind Walker 60 | Unhindered · Deft Movement 100 | Wind Walker, Matching Set

**lockpicking**: Novice Locks 0 | — · Apprentice Locks 25 | Novice Locks · Adept Locks 50 | Apprentice Locks · Expert Locks 75 | Adept Locks · Master Locks 100 | Expert Locks · Quick Hands 40 | Apprentice Locks · Wax Key 50 | Quick Hands · Golden Touch 60 | Adept Locks · Treasure Hunter 70 | Golden Touch · Locksmith 80 | Expert Locks · Unbreakable 100 | Locksmith

**pickpocket**: Light Fingers 0/20/40/60/80 | — · Night Thief 30 | Light Fingers · Cutpurse 40 | Night Thief · Poisoned 40 | Night Thief · Extra Pockets 50 | Night Thief · Keymaster 60 | Cutpurse · Misdirection 70 | Cutpurse · Perfect Touch 100 | Misdirection

**sneak**: Stealth 0/20/40/60/80 | — · Backstab 30 | Stealth · Muffled Movement 30 | Stealth · Deadly Aim 40 | Backstab · Light Foot 40 | Muffled Movement · Assassin's Blade 50 | Deadly Aim · Silent Roll 50 | Light Foot · Silence 70 | Silent Roll · Shadow Warrior 100 | Silence

**speech**: Haggling 0/20/40/60/80 | — · Allure 30 | Haggling · Bribery 30 | Haggling · Merchant 50 | Allure · Persuasion 50 | Bribery · Investor 70 | Merchant · Intimidation 70 | Persuasion · Fence 90 | Investor · Master Trader 100 | Fence

- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(planner): vanilla perk data"`

---

### Task 3: Level formula

**Files:**
- Create: `src/lib/character.js`
- Test: `src/lib/__tests__/character.test.js`

**Interfaces:**
- Produces: `BASE_SKILL = 15`; `startingSkills(race, skills)` → `{[skillId]: 15 + (race?.skills[skillId] ?? 0)}`; `xpForLevelUp(L)` → `75 + 25*L`; `levelFromSkills(start, target)` → `{ level, perkPoints, xp }`.

- [ ] **Step 1: Failing tests**

```js
import { describe, it, expect } from 'vitest'
import skills from '../../../assets/skills.json'
import races from '../../../assets/races.json'
import { startingSkills, xpForLevelUp, levelFromSkills, BASE_SKILL } from '../character.js'

const nord = races.find(r => r.id === 'nord')
const flat = Object.fromEntries(skills.map(s => [s.id, 15]))

describe('startingSkills', () => {
  it('gives 15 base plus racial bonus', () => {
    const s = startingSkills(nord, skills)
    expect(Object.keys(s)).toHaveLength(18)
    expect(s.two_handed).toBe(25); expect(s.block).toBe(20); expect(s.alchemy).toBe(15)
  })
  it('handles null race', () => { expect(startingSkills(null, skills).archery).toBe(BASE_SKILL) })
})

describe('levelFromSkills', () => {
  it('level 1, 0 points with no gains', () => {
    expect(levelFromSkills(flat, flat)).toEqual({ level: 1, perkPoints: 0, xp: 0 })
  })
  it('xpForLevelUp(1) is 100', () => expect(xpForLevelUp(1)).toBe(100))
  it('one skill 15->20 = 90 xp, still level 1', () => {
    const r = levelFromSkills(flat, { ...flat, sneak: 20 }); expect(r.xp).toBe(90); expect(r.level).toBe(1)
  })
  it('one skill 15->21 = 111 xp => level 2, 1 perk', () => {
    const r = levelFromSkills(flat, { ...flat, sneak: 21 }); expect(r.level).toBe(2); expect(r.perkPoints).toBe(1)
  })
  it('all skills 100 from 15 => 88740 xp, level 81', () => {
    const all = Object.fromEntries(skills.map(s => [s.id, 100]))
    const r = levelFromSkills(flat, all)
    expect(r.xp).toBe(88740); expect(r.level).toBe(81); expect(r.perkPoints).toBe(80)
  })
  it('ignores targets below start', () => { expect(levelFromSkills(flat, { ...flat, sneak: 10 }).xp).toBe(0) })
})
```

- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implement** `src/lib/character.js`:

```js
export const BASE_SKILL = 15

export function startingSkills(race, skills) {
  const out = {}
  for (const s of skills) out[s.id] = BASE_SKILL + (race?.skills?.[s.id] ?? 0)
  return out
}

export const xpForLevelUp = L => 75 + 25 * L

export function levelFromSkills(start, target) {
  let xp = 0
  for (const id of Object.keys(target)) {
    const a = start[id] ?? BASE_SKILL, b = target[id] ?? a
    for (let s = a + 1; s <= b; s++) xp += s
  }
  let level = 1, pool = xp
  while (pool >= xpForLevelUp(level)) { pool -= xpForLevelUp(level); level++ }
  return { level, perkPoints: level - 1, xp }
}
```

- [ ] **Step 4: Run, PASS.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(planner): level formula"`

---

### Task 4: Perk gating, validation, cascade

**Files:**
- Modify: `src/lib/character.js`
- Test: append to `src/lib/__tests__/character.test.js`

**Interfaces:**
- `build = {skills:{id:level}, perks:{perkId:rank}}`, `perkMap = Map<id, perk>`.
- Produces: `indexPerks(perks)`, `rankHeld(build, id)`, `hasPrereq(build, perk)`, `spentPoints(build)`, `canTakeRank(build, perk, rank)`, `validateBuild(build, perkMap)` → `{violations:[{perkId, reason}], spent}`, `pruneInvalid(build, perkMap)` → new build (no mutation).

- [ ] **Step 1: Failing tests** (append)

```js
import perks from '../../../assets/perks.json'
import { indexPerks, rankHeld, canTakeRank, validateBuild, pruneInvalid, spentPoints } from '../character.js'
const pm = indexPerks(perks)
const mk = (skillsPatch, perksObj) => ({ skills: { ...flat, ...skillsPatch }, perks: perksObj })

describe('canTakeRank', () => {
  it('root rank 1 always takeable', () => {
    expect(canTakeRank(mk({}, {}), pm.get('archery.overdraw'), 1)).toBe(true)
  })
  it('rank 2 needs rank 1 and skill 20', () => {
    expect(canTakeRank(mk({}, {}), pm.get('archery.overdraw'), 2)).toBe(false)
    expect(canTakeRank(mk({}, { 'archery.overdraw': 1 }), pm.get('archery.overdraw'), 2)).toBe(false)
    expect(canTakeRank(mk({ archery: 20 }, { 'archery.overdraw': 1 }), pm.get('archery.overdraw'), 2)).toBe(true)
  })
  it('child needs prereq', () => {
    expect(canTakeRank(mk({ archery: 30 }, {}), pm.get('archery.eagle_eye'), 1)).toBe(false)
    expect(canTakeRank(mk({ archery: 30 }, { 'archery.overdraw': 1 }), pm.get('archery.eagle_eye'), 1)).toBe(true)
  })
  it('OR prereqs: either satisfies', () => {
    const b = mk({ archery: 100 }, { 'archery.overdraw': 1, 'archery.critical_shot': 1, 'archery.hunters_discipline': 1, 'archery.ranger': 1 })
    expect(canTakeRank(b, pm.get('archery.bullseye'), 1)).toBe(true)
  })
  it('rejects rank beyond max', () => {
    expect(canTakeRank(mk({ archery: 100 }, { 'archery.eagle_eye': 1, 'archery.overdraw': 1 }), pm.get('archery.eagle_eye'), 2)).toBe(false)
  })
})

describe('validateBuild / pruneInvalid', () => {
  it('reports missing prereq + low skill', () => {
    const v = validateBuild(mk({}, { 'archery.eagle_eye': 1 }), pm).violations
    expect(v.map(x => x.reason).sort()).toEqual(['missing prerequisite', 'skill too low (needs 30)'])
  })
  it('prune cascades', () => {
    const b = mk({ archery: 100 }, { 'archery.overdraw': 5, 'archery.eagle_eye': 1, 'archery.power_shot': 1, 'archery.quick_shot': 1 })
    const p = pruneInvalid({ ...b, skills: { ...b.skills, archery: 45 } }, pm)
    expect(p.perks).toEqual({ 'archery.overdraw': 3, 'archery.eagle_eye': 1 })
    const q = pruneInvalid({ ...b, perks: { ...b.perks, 'archery.eagle_eye': 0 } }, pm)
    expect(q.perks).toEqual({ 'archery.overdraw': 5 })
  })
  it('prune drops unknown perks and zero ranks', () => {
    expect(pruneInvalid(mk({}, { bogus: 2, 'archery.overdraw': 0 }), pm).perks).toEqual({})
  })
  it('spentPoints sums ranks; rankHeld defaults 0', () => {
    expect(spentPoints(mk({}, { a: 2, b: 3 }))).toBe(5)
    expect(rankHeld(mk({}, {}), 'x')).toBe(0)
  })
})
```

- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implement** (append to character.js)

```js
export const indexPerks = perks => new Map(perks.map(p => [p.id, p]))
export const rankHeld = (build, id) => build.perks[id] ?? 0
export const hasPrereq = (build, perk) =>
  perk.requires.length === 0 || perk.requires.some(r => rankHeld(build, r) > 0)
export const spentPoints = build => Object.values(build.perks).reduce((n, r) => n + r, 0)

export function canTakeRank(build, perk, rank) {
  if (rank < 1 || rank > perk.ranks.length) return false
  if (rankHeld(build, perk.id) !== rank - 1) return false
  if (!hasPrereq(build, perk)) return false
  return (build.skills[perk.skill] ?? 0) >= perk.ranks[rank - 1].skillReq
}

export function validateBuild(build, perkMap) {
  const violations = []
  for (const [id, rank] of Object.entries(build.perks)) {
    if (rank <= 0) continue
    const perk = perkMap.get(id)
    if (!perk) { violations.push({ perkId: id, reason: 'unknown perk' }); continue }
    if (!hasPrereq(build, perk)) violations.push({ perkId: id, reason: 'missing prerequisite' })
    const need = perk.ranks[Math.min(rank, perk.ranks.length) - 1].skillReq
    if ((build.skills[perk.skill] ?? 0) < need)
      violations.push({ perkId: id, reason: `skill too low (needs ${need})` })
  }
  return { violations, spent: spentPoints(build) }
}

export function pruneInvalid(build, perkMap) {
  const perks = {}
  for (const [id, rank] of Object.entries(build.perks)) {
    const perk = perkMap.get(id)
    if (perk && rank > 0) perks[id] = Math.min(rank, perk.ranks.length)
  }
  let changed = true
  while (changed) {
    changed = false
    const cur = { skills: build.skills, perks }
    for (const [id, rank] of Object.entries(perks)) {
      const perk = perkMap.get(id)
      if (!hasPrereq(cur, perk)) { delete perks[id]; changed = true; continue }
      const lvl = build.skills[perk.skill] ?? 0
      let r = rank
      while (r > 0 && perk.ranks[r - 1].skillReq > lvl) r--
      if (r !== rank) { changed = true; if (r === 0) delete perks[id]; else perks[id] = r }
    }
  }
  return { ...build, perks }
}
```

- [ ] **Step 4: Run, PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(planner): perk gating, validation, prune"`

---

### Task 5: Encode/decode share string

**Files:**
- Modify: `src/lib/character.js`
- Test: append `character.test.js`

**Interfaces:**
- `encodeBuild(build, skills, perks)` → `v1.<race>.<stone>.<18 skill levels csv>.<"idx:rank" csv>`; `decodeBuild(str, skills, perks)` → `{race, stone, skills, perks}` or `null`. Name not encoded. All chars URL-safe.

- [ ] **Step 1: Failing tests**

```js
import { encodeBuild, decodeBuild } from '../character.js'
describe('encode/decode', () => {
  it('round-trips', () => {
    const b = { name: 'x', race: 'nord', stone: 'warrior', skills: { ...flat, two_handed: 60 }, perks: { 'two_handed.barbarian': 3 } }
    const s = encodeBuild(b, skills, perks)
    expect(s.startsWith('v1.nord.warrior.')).toBe(true)
    const d = decodeBuild(s, skills, perks)
    expect(d.race).toBe('nord'); expect(d.stone).toBe('warrior')
    expect(d.skills).toEqual(b.skills); expect(d.perks).toEqual(b.perks)
  })
  it('null race/stone', () => {
    const d = decodeBuild(encodeBuild({ race: null, stone: null, skills: flat, perks: {} }, skills, perks), skills, perks)
    expect(d.race).toBeNull(); expect(d.stone).toBeNull(); expect(d.perks).toEqual({})
  })
  it('garbage -> null', () => {
    expect(decodeBuild('nope', skills, perks)).toBeNull()
    expect(decodeBuild('v1.a.b.1,2.', skills, perks)).toBeNull()
  })
})
```

- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement**

```js
export function encodeBuild(build, skills, perks) {
  const sk = skills.map(s => build.skills[s.id] ?? BASE_SKILL).join(',')
  const pk = perks.map((p, i) => [i, build.perks[p.id] ?? 0]).filter(([, r]) => r > 0).map(([i, r]) => `${i}:${r}`).join(',')
  return ['v1', build.race ?? '', build.stone ?? '', sk, pk].join('.')
}

export function decodeBuild(str, skills, perks) {
  if (typeof str !== 'string') return null
  const parts = str.split('.')
  if (parts.length !== 5 || parts[0] !== 'v1') return null
  const [, race, stone, sk, pk] = parts
  const levels = sk.split(',').map(Number)
  if (levels.length !== skills.length || levels.some(n => !Number.isInteger(n))) return null
  const skillsOut = Object.fromEntries(skills.map((s, i) => [s.id, levels[i]]))
  const perksOut = {}
  if (pk) for (const tok of pk.split(',')) {
    const [i, r] = tok.split(':').map(Number)
    if (!perks[i] || !Number.isInteger(r) || r <= 0) return null
    perksOut[perks[i].id] = r
  }
  return { race: race || null, stone: stone || null, skills: skillsOut, perks: perksOut }
}
```

- [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(planner): build share encoding"`

---

### Task 6: buildStore (localStorage)

**Files:**
- Create: `src/lib/buildStore.js`
- Test: `src/lib/__tests__/buildStore.test.js`

**Interfaces:**
- `KEY='skyrim.builds'`; `listBuilds(storage=localStorage)`; `saveBuild(build, storage)` upsert by `id`, returns list; `deleteBuild(id, storage)` returns list; `newId()`. Corrupt → `[]`.

- [ ] **Step 1: Failing tests**

```js
import { describe, it, expect } from 'vitest'
import { listBuilds, saveBuild, deleteBuild, KEY } from '../buildStore.js'
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) } }
describe('buildStore', () => {
  it('empty by default', () => expect(listBuilds(mem())).toEqual([]))
  it('save upserts by id', () => {
    const s = mem()
    saveBuild({ id: 'a', name: 'A' }, s); saveBuild({ id: 'b', name: 'B' }, s)
    const l = saveBuild({ id: 'a', name: 'A2' }, s)
    expect(l.map(b => b.name)).toEqual(['A2', 'B'])
    expect(JSON.parse(s.getItem(KEY))).toHaveLength(2)
  })
  it('delete removes', () => { const s = mem(); saveBuild({ id: 'a' }, s); expect(deleteBuild('a', s)).toEqual([]) })
  it('corrupt storage -> []', () => { const s = mem(); s.setItem(KEY, '{nope'); expect(listBuilds(s)).toEqual([]) })
})
```

- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement**

```js
export const KEY = 'skyrim.builds'
const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)

export function listBuilds(storage = store()) {
  try { const v = JSON.parse(storage?.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : [] }
  catch { return [] }
}
function write(list, storage) { storage?.setItem(KEY, JSON.stringify(list)); return list }
export function saveBuild(build, storage = store()) {
  const list = listBuilds(storage)
  const i = list.findIndex(b => b.id === build.id)
  if (i >= 0) list[i] = build; else list.push(build)
  return write(list, storage)
}
export function deleteBuild(id, storage = store()) {
  return write(listBuilds(storage).filter(b => b.id !== id), storage)
}
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
```

- [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(planner): localStorage build store"`

---

### Task 7: Build reducer + hook

**Files:**
- Create: `src/lib/buildReducer.js`
- Test: `src/lib/__tests__/buildReducer.test.js`

**Interfaces:**
- Consumes: `startingSkills, pruneInvalid, canTakeRank, rankHeld` (Tasks 3/4), `newId` (Task 6).
- Produces: `emptyBuild(data)`, `buildReducer(state, action, data)` with `data={skills, perks, races, perkMap}`; actions `setName{name}`, `setRace{race}`, `setStone{stone}`, `setSkill{skill, level}`, `setPerk{perkId, rank}`, `load{build}`, `reset`; `useBuild(data)` → `[state, dispatch]`.
- Semantics: setRace — skills equal to old race start snap to new start, others `max(cur, newStart)`; then prune. setSkill — clamp `[start,100]`, round; prune. setPerk — accept only `rank===held-1` or (`rank===held+1` && canTakeRank); prune. load — merge `{...start, ...b.skills}`, prune.

- [ ] **Step 1: Failing tests**

```js
import { describe, it, expect } from 'vitest'
import skills from '../../../assets/skills.json'
import perks from '../../../assets/perks.json'
import races from '../../../assets/races.json'
import { indexPerks } from '../character.js'
import { buildReducer, emptyBuild } from '../buildReducer.js'
const data = { skills, perks, races, perkMap: indexPerks(perks) }
const R = (s, a) => buildReducer(s, a, data)

describe('buildReducer', () => {
  it('empty build has 18 skills at 15', () => {
    const b = emptyBuild(data)
    expect(Object.values(b.skills).every(v => v === 15)).toBe(true)
    expect(b.id).toBeTruthy()
  })
  it('setRace floors skills and tracks untouched ones', () => {
    let b = R(emptyBuild(data), { type: 'setSkill', skill: 'block', level: 50 })
    b = R(b, { type: 'setRace', race: 'nord' })
    expect(b.skills.two_handed).toBe(25); expect(b.skills.block).toBe(50)
    b = R(b, { type: 'setRace', race: 'altmer' })
    expect(b.skills.two_handed).toBe(15); expect(b.skills.illusion).toBe(25); expect(b.skills.block).toBe(50)
  })
  it('setSkill clamps to [start,100]', () => {
    let b = R(emptyBuild(data), { type: 'setRace', race: 'nord' })
    b = R(b, { type: 'setSkill', skill: 'two_handed', level: 5 }); expect(b.skills.two_handed).toBe(25)
    b = R(b, { type: 'setSkill', skill: 'two_handed', level: 500 }); expect(b.skills.two_handed).toBe(100)
  })
  it('setPerk increments only when allowed, decrements cascade', () => {
    let b = emptyBuild(data)
    b = R(b, { type: 'setPerk', perkId: 'archery.eagle_eye', rank: 1 }); expect(b.perks).toEqual({})
    b = R(b, { type: 'setPerk', perkId: 'archery.overdraw', rank: 1 })
    b = R(b, { type: 'setSkill', skill: 'archery', level: 30 })
    b = R(b, { type: 'setPerk', perkId: 'archery.eagle_eye', rank: 1 })
    expect(b.perks).toEqual({ 'archery.overdraw': 1, 'archery.eagle_eye': 1 })
    b = R(b, { type: 'setPerk', perkId: 'archery.overdraw', rank: 0 }); expect(b.perks).toEqual({})
  })
  it('lowering skill prunes', () => {
    let b = R(emptyBuild(data), { type: 'setSkill', skill: 'archery', level: 40 })
    for (const r of [1, 2, 3]) b = R(b, { type: 'setPerk', perkId: 'archery.overdraw', rank: r })
    b = R(b, { type: 'setSkill', skill: 'archery', level: 25 })
    expect(b.perks['archery.overdraw']).toBe(2)
  })
  it('load merges and prunes', () => {
    const b = R(emptyBuild(data), { type: 'load', build: { id: 'z', name: 'Z', race: null, stone: null, skills: {}, perks: { 'archery.eagle_eye': 1 } } })
    expect(b.skills.archery).toBe(15); expect(b.perks).toEqual({}); expect(b.name).toBe('Z')
  })
})
```

- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement**

```js
import { useReducer } from 'react'
import { startingSkills, pruneInvalid, canTakeRank, rankHeld } from './character.js'
import { newId } from './buildStore.js'

export function emptyBuild(data) {
  return { id: newId(), name: 'New Build', race: null, stone: null, skills: startingSkills(null, data.skills), perks: {} }
}
const raceById = (data, id) => data.races.find(r => r.id === id) ?? null
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(n)))

export function buildReducer(state, action, data) {
  const prune = b => pruneInvalid(b, data.perkMap)
  switch (action.type) {
    case 'setName': return { ...state, name: action.name }
    case 'setStone': return { ...state, stone: action.stone ?? null }
    case 'setRace': {
      const oldStart = startingSkills(raceById(data, state.race), data.skills)
      const newStart = startingSkills(raceById(data, action.race), data.skills)
      const skills = {}
      for (const s of data.skills) {
        const cur = state.skills[s.id] ?? oldStart[s.id]
        skills[s.id] = cur === oldStart[s.id] ? newStart[s.id] : Math.max(cur, newStart[s.id])
      }
      return prune({ ...state, race: action.race ?? null, skills })
    }
    case 'setSkill': {
      const start = startingSkills(raceById(data, state.race), data.skills)
      const level = clamp(Number(action.level) || 0, start[action.skill], 100)
      return prune({ ...state, skills: { ...state.skills, [action.skill]: level } })
    }
    case 'setPerk': {
      const perk = data.perkMap.get(action.perkId)
      if (!perk) return state
      const held = rankHeld(state, perk.id)
      if (action.rank === held - 1 || (action.rank === held + 1 && canTakeRank(state, perk, action.rank))) {
        const perks = { ...state.perks }
        if (action.rank <= 0) delete perks[perk.id]; else perks[perk.id] = action.rank
        return prune({ ...state, perks })
      }
      return state
    }
    case 'load': {
      const b = action.build
      const start = startingSkills(raceById(data, b.race), data.skills)
      return prune({ id: b.id ?? newId(), name: b.name ?? 'Build', race: b.race ?? null, stone: b.stone ?? null,
        skills: { ...start, ...(b.skills ?? {}) }, perks: { ...(b.perks ?? {}) } })
    }
    case 'reset': return emptyBuild(data)
    default: return state
  }
}

export function useBuild(data) {
  return useReducer((s, a) => buildReducer(s, a, data), null, () => emptyBuild(data))
}
```

- [ ] **Step 4: PASS.** Run `npx eslint src`; fix warnings.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(planner): build reducer + hook"`

---

### Task 8: Page UI + wiring

**Files:**
- Create: `src/pages/CharacterPlanner.jsx`, `src/style/planner.module.css`
- Modify: `src/App.jsx` (add State), `src/pages/Landing.jsx` (link)

- [ ] **Step 1: Wire route + link**

`App.jsx`: `import CharacterPlanner from './pages/CharacterPlanner.jsx'` and add
```jsx
<State name="planner">
  <CharacterPlanner />
</State>
```
`Landing.jsx` nav: `{' | '}<StateLink to="planner">Character Planner</StateLink>`.

- [ ] **Step 2: Write page** `src/pages/CharacterPlanner.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react'
import { StateLink } from 'ygdrassil'
import skills from '../../assets/skills.json'
import perks from '../../assets/perks.json'
import races from '../../assets/races.json'
import stones from '../../assets/stones.json'
import { indexPerks, startingSkills, levelFromSkills, validateBuild, canTakeRank, rankHeld, spentPoints, encodeBuild, decodeBuild, hasPrereq } from '../lib/character.js'
import { useBuild } from '../lib/buildReducer.js'
import { listBuilds, saveBuild, deleteBuild } from '../lib/buildStore.js'
import s from '../style/planner.module.css'

const data = { skills, perks, races, stones, perkMap: indexPerks(perks) }
const CATEGORIES = ['combat', 'magic', 'stealth']

export default function CharacterPlanner() {
  const [build, dispatch] = useBuild(data)
  const [saved, setSaved] = useState(() => listBuilds())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (window.location.hash.startsWith('#build=')) {
      const b = decodeBuild(window.location.hash.slice('#build='.length), skills, perks)
      if (b) dispatch({ type: 'load', build: { ...b, name: 'Shared Build' } })
    }
  }, [dispatch])

  const race = races.find(r => r.id === build.race) ?? null
  const stone = stones.find(x => x.id === build.stone) ?? null
  const start = useMemo(() => startingSkills(race, skills), [race])
  const lvl = useMemo(() => levelFromSkills(start, build.skills), [start, build.skills])
  const { violations } = useMemo(() => validateBuild(build, data.perkMap), [build])
  const spent = spentPoints(build)
  const over = spent > lvl.perkPoints

  const onSave = () => setSaved(saveBuild(build))
  const onDelete = () => { setSaved(deleteBuild(build.id)); dispatch({ type: 'reset' }) }
  const onLoad = id => { const b = saved.find(x => x.id === id); if (b) dispatch({ type: 'load', build: b }) }
  const onShare = async () => {
    const url = `${location.origin}${location.pathname}#build=${encodeBuild(build, skills, perks)}`
    history.replaceState(null, '', url)
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h2>Character Planner</h2>
        <StateLink to="landing">Back to menu</StateLink>
      </header>

      <section className={s.toolbar}>
        <input value={build.name} onChange={e => dispatch({ type: 'setName', name: e.target.value })} placeholder="Build name" />
        <select value={build.race ?? ''} onChange={e => dispatch({ type: 'setRace', race: e.target.value || null })}>
          <option value="">— Race —</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={build.stone ?? ''} onChange={e => dispatch({ type: 'setStone', stone: e.target.value || null })}>
          <option value="">— Standing Stone —</option>
          {stones.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select value="" onChange={e => onLoad(e.target.value)}>
          <option value="">Load saved…</option>
          {saved.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={onSave}>Save</button>
        <button onClick={() => dispatch({ type: 'reset' })}>New</button>
        <button onClick={onDelete} disabled={!saved.some(b => b.id === build.id)}>Delete</button>
        <button onClick={onShare}>{copied ? 'Copied!' : 'Copy link'}</button>
      </section>

      <section className={s.summary}>
        <span>Level <b>{lvl.level}</b></span>
        <span className={over ? s.bad : ''}>Perks <b>{spent}</b> / {lvl.perkPoints}</span>
        {violations.length > 0 && <span className={s.bad}>{violations.length} invalid</span>}
        {race && <span title={race.passives.join('; ')}>{race.power}</span>}
        {stone && <span>{stone.effect}</span>}
      </section>

      <div className={s.columns}>
        {CATEGORIES.map(cat => (
          <div key={cat} className={s.column}>
            {skills.filter(k => k.category === cat).map(k => (
              <SkillPanel key={k.id} skill={k} build={build} start={start[k.id]} dispatch={dispatch} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkillPanel({ skill, build, start, dispatch }) {
  const level = build.skills[skill.id]
  const tree = perks.filter(p => p.skill === skill.id)
  const set = v => dispatch({ type: 'setSkill', skill: skill.id, level: v })
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <h3>{skill.name}</h3>
        <input type="number" min={start} max={100} value={level} onChange={e => set(e.target.value)} />
        <input type="range" min={start} max={100} value={level} onChange={e => set(e.target.value)} />
      </div>
      <ul className={s.perkList}>
        {tree.map(p => <PerkRow key={p.id} perk={p} build={build} dispatch={dispatch} />)}
      </ul>
    </div>
  )
}

function PerkRow({ perk, build, dispatch }) {
  const held = rankHeld(build, perk.id)
  const max = perk.ranks.length
  const canUp = canTakeRank(build, perk, held + 1)
  const nextReq = perk.ranks[Math.min(held, max - 1)].skillReq
  const locked = held === 0 && !canUp
  const reason = !hasPrereq(build, perk)
    ? `needs ${perk.requires.map(r => data.perkMap.get(r)?.name).join(' or ')}`
    : `skill ${nextReq}`
  const desc = perk.ranks[Math.max(held - 1, 0)].desc
  return (
    <li className={`${s.perk} ${locked ? s.locked : ''} ${held ? s.taken : ''}`} title={desc}>
      <span className={s.perkName}>{perk.name}{max > 1 && <small> {held}/{max}</small>}</span>
      <span className={s.perkCtl}>
        {held < max && !canUp && <small className={s.reason}>{held === 0 ? reason : `skill ${nextReq}`}</small>}
        <button onClick={() => dispatch({ type: 'setPerk', perkId: perk.id, rank: held - 1 })} disabled={held === 0}>−</button>
        <button onClick={() => dispatch({ type: 'setPerk', perkId: perk.id, rank: held + 1 })} disabled={!canUp}>+</button>
      </span>
    </li>
  )
}
```

- [ ] **Step 3: CSS** `src/style/planner.module.css`:

```css
.page { padding: 1rem; max-width: 1400px; margin: 0 auto; text-align: left; }
.header { display: flex; justify-content: space-between; align-items: baseline; }
.toolbar { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .5rem; }
.toolbar input { min-width: 10rem; }
.summary { display: flex; flex-wrap: wrap; gap: 1rem; padding: .5rem .75rem; border: 1px solid #555; border-radius: 6px; margin-bottom: 1rem; font-size: .95rem; }
.bad { color: #f66; font-weight: 600; }
.columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
@media (max-width: 1000px) { .columns { grid-template-columns: 1fr; } }
.column { display: flex; flex-direction: column; gap: 1rem; }
.panel { border: 1px solid #444; border-radius: 6px; padding: .5rem .75rem; }
.panelHead { display: grid; grid-template-columns: 1fr 4.5rem; gap: .25rem .5rem; align-items: center; }
.panelHead h3 { margin: 0; font-size: 1.05rem; }
.panelHead input[type=range] { grid-column: 1 / -1; width: 100%; }
.perkList { list-style: none; margin: .5rem 0 0; padding: 0; }
.perk { display: flex; justify-content: space-between; align-items: center; padding: .15rem 0; border-top: 1px solid #333; gap: .5rem; }
.perkName { flex: 1; }
.perkCtl { display: flex; align-items: center; gap: .25rem; }
.perkCtl button { padding: 0 .5rem; line-height: 1.4; }
.reason { opacity: .6; font-size: .75rem; }
.locked { opacity: .55; }
.taken .perkName { color: #9fd; }
```

- [ ] **Step 4: Verify** — `npx vitest run && npx eslint src && npm run build`; all pass.
- [ ] **Step 5: Manual smoke** — `npm run dev`; planner: Nord → Two-Handed 25; Archery→30, take Overdraw + Eagle Eye; Archery→15 → Eagle Eye drops, Overdraw r1 stays; Save/New/Load; Copy link, reload w/ hash → restored.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: character planner page"`

---

### Task 9: README

**Files:** Modify `README.md`.

- [ ] **Step 1: Add section**

```md
## Character Planner

Pick race + standing stone, set target skill levels, allocate perks across all 18 vanilla trees.
Computes character level from skill gains (skill-up to level *s* grants *s* XP; level L→L+1 needs `75 + 25·L` XP), perk points (= level − 1), and flags invalid perks (missing prereq / skill too low / over budget).
Builds save to `localStorage` (`skyrim.builds`) and share via `#build=v1.…` URL hash.

Data: `assets/skills.json`, `assets/perks.json`, `assets/races.json`, `assets/stones.json`.
Tests: `npm test` (vitest).
```

- [ ] **Step 2: Final verify** — `npx vitest run && npm run build`.
- [ ] **Step 3: Commit** — `git commit -am "docs: character planner README"`.
