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
