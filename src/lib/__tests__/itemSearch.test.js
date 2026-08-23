import { describe, it, expect } from 'vitest'
import items from '../../../assets/items.json'
import { ITEM_TYPES, searchItems, subtypesFor } from '../itemSearch.js'

describe('items.json', () => {
  it('has thousands of unique, well-formed entries', () => {
    expect(items.length).toBeGreaterThan(5000)
    expect(new Set(items.map(i => i.id)).size).toBe(items.length)
    const types = new Set(ITEM_TYPES.map(t => t.id))
    for (const i of items) {
      expect(i.id, i.name).toMatch(/^(00|xx)[0-9a-f]{6}$/)
      expect(i.name.length, i.id).toBeGreaterThan(1)
      expect(types.has(i.type), `${i.id} ${i.type}`).toBe(true)
      expect(typeof i.subtype).toBe('string')
    }
  })
  it('contains known items', () => {
    const by = id => items.find(i => i.id === id)
    expect(by('00012eb7')).toMatchObject({ name: 'Iron Sword', type: 'weapon' })
    expect(by('0005ace4')).toMatchObject({ name: 'Iron Ingot', type: 'material' })
    expect(by('0002e4e2')).toMatchObject({ name: 'Petty Soul Gem', type: 'material' })
  })
})

const sample = [
  { id: '00012eb7', name: 'Iron Sword', type: 'weapon', subtype: 'Swords' },
  { id: '00013989', name: 'Steel Sword', type: 'weapon', subtype: 'Swords' },
  { id: '0005ace4', name: 'Iron Ingot', type: 'material', subtype: 'Ore & Ingot' },
  { id: '0001395f', name: 'Iron Dagger', type: 'weapon', subtype: 'Daggers' },
]

describe('searchItems', () => {
  it('empty query returns everything (limited)', () => {
    const r = searchItems(sample, {}, 2)
    expect(r.total).toBe(4); expect(r.results).toHaveLength(2)
  })
  it('matches all words, case-insensitive, in any order', () => {
    expect(searchItems(sample, { q: 'sword iron' }).results.map(i => i.id)).toEqual(['00012eb7'])
    expect(searchItems(sample, { q: 'IRON' }).total).toBe(3)
  })
  it('matches by id prefix', () => {
    expect(searchItems(sample, { q: '00013' }).results.map(i => i.name)).toEqual(['Steel Sword', 'Iron Dagger'])
  })
  it('filters by type and subtype', () => {
    expect(searchItems(sample, { type: 'weapon' }).total).toBe(3)
    expect(searchItems(sample, { type: 'weapon', subtype: 'Daggers' }).results[0].name).toBe('Iron Dagger')
    expect(searchItems(sample, { q: 'iron', type: 'material' }).results[0].name).toBe('Iron Ingot')
  })
  it('subtypesFor lists sorted unique subtypes of a type', () => {
    expect(subtypesFor(sample, 'weapon')).toEqual(['Daggers', 'Swords'])
    expect(subtypesFor(sample, '')).toEqual(['Daggers', 'Ore & Ingot', 'Swords'])
  })
})
