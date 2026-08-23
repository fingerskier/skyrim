import { describe, it, expect } from 'vitest'
import items from '../../../assets/items.json'
import { ITEM_TYPES, searchItems, subtypesFor } from '../itemSearch.js'

describe('items.json', () => {
  it('has thousands of unique, well-formed entries', () => {
    expect(items.length).toBeGreaterThan(5000)
    expect(new Set(items.map(i => i.id)).size).toBe(items.length)
    const types = new Set(ITEM_TYPES.map(t => t.id))
    const bad = items.filter(i =>
      !/^(00|xx)[0-9a-f]{6}$/.test(i.id) || !(i.name.length > 1) || !types.has(i.type) || typeof i.subtype !== 'string')
    expect(bad).toEqual([])
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
  { id: '0005bef7', name: 'Blessed Iron Sword', type: 'weapon', subtype: 'Enchanted' },
]

describe('searchItems', () => {
  it('empty query returns everything (limited)', () => {
    const r = searchItems(sample, {}, 2)
    expect(r.total).toBe(5); expect(r.results).toHaveLength(2)
  })
  it('matches all words, case-insensitive, in any order', () => {
    expect(searchItems(sample, { q: 'sword iron' }).results.map(i => i.id)).toEqual(['00012eb7', '0005bef7'])
    expect(searchItems(sample, { q: 'IRON' }).total).toBe(4)
  })
  it('ranks exact name, then name-prefix, then substring; shorter names first', () => {
    const names = searchItems(sample, { q: 'iron' }).results.map(i => i.name)
    expect(names).toEqual(['Iron Ingot', 'Iron Sword', 'Iron Dagger', 'Blessed Iron Sword'])
    expect(searchItems(sample, { q: 'iron sword' }).results.map(i => i.name)).toEqual(['Iron Sword', 'Blessed Iron Sword'])
    expect(searchItems(sample, { q: 'iron sword' }).results[0].name).toBe('Iron Sword')
  })
  it('matches by id prefix', () => {
    expect(searchItems(sample, { q: '00013' }).results.map(i => i.name)).toEqual(['Iron Dagger', 'Steel Sword'])
  })
  it('filters by type and subtype', () => {
    expect(searchItems(sample, { type: 'weapon' }).total).toBe(4)
    expect(searchItems(sample, { type: 'weapon', subtype: 'Daggers' }).results[0].name).toBe('Iron Dagger')
    expect(searchItems(sample, { q: 'iron', type: 'material' }).results[0].name).toBe('Iron Ingot')
  })
  it('subtypesFor lists sorted unique subtypes of a type', () => {
    expect(subtypesFor(sample, 'weapon')).toEqual(['Daggers', 'Enchanted', 'Swords'])
    expect(subtypesFor(sample, '')).toEqual(['Daggers', 'Enchanted', 'Ore & Ingot', 'Swords'])
  })
})
