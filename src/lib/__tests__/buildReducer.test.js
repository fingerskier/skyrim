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
