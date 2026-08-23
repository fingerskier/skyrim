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
