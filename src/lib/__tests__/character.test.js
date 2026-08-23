import { describe, it, expect } from 'vitest'
import skills from '../../../assets/skills.json'
import races from '../../../assets/races.json'
import perks from '../../../assets/perks.json'
import {
  startingSkills, xpForLevelUp, levelFromSkills, BASE_SKILL,
  indexPerks, rankHeld, canTakeRank, validateBuild, pruneInvalid, spentPoints,
  encodeBuild, decodeBuild,
} from '../character.js'

const nord = races.find(r => r.id === 'nord')
const flat = Object.fromEntries(skills.map(s => [s.id, 15]))
const pm = indexPerks(perks)
const mk = (skillsPatch, perksObj) => ({ skills: { ...flat, ...skillsPatch }, perks: perksObj })

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
