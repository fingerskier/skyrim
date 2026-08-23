// Pure search/filter helpers for assets/items.json.

export const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'jewelry', label: 'Jewelry' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'ingredient', label: 'Ingredients' },
  { id: 'potion', label: 'Potions & Poisons' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'material', label: 'Crafting Materials' },
  { id: 'misc', label: 'Miscellaneous' },
  { id: 'book', label: 'Books' },
  { id: 'spell_tome', label: 'Spell Tomes' },
  { id: 'scroll', label: 'Scrolls' },
  { id: 'note', label: 'Notes' },
  { id: 'key', label: 'Keys' },
]

export const typeLabel = id => ITEM_TYPES.find(t => t.id === id)?.label ?? id

/**
 * Filter items by free-text query (all words must appear in the name, case-insensitive;
 * a query that looks like a hex prefix also matches ids), type and subtype.
 * Results are ranked: exact name, name starts with query, then substring; ties → shorter name, then alphabetical.
 * Returns { results (capped at limit), total }.
 */
export function searchItems(items, { q = '', type = '', subtype = '' } = {}, limit = 200) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const idPrefix = words.length === 1 && /^[0-9a-fx]{2,8}$/.test(words[0]) ? words[0] : null
  const ql = q.trim().toLowerCase()
  const rank = it => {
    if (!ql) return 2
    const n = it.name.toLowerCase()
    return n === ql ? 0 : n.startsWith(ql) ? 1 : 2
  }
  const matches = []
  for (const it of items) {
    if (type && it.type !== type) continue
    if (subtype && it.subtype !== subtype) continue
    if (words.length) {
      const name = it.name.toLowerCase()
      const nameHit = words.every(w => name.includes(w))
      if (!nameHit && !(idPrefix && it.id.startsWith(idPrefix))) continue
    }
    matches.push(it)
  }
  if (ql) matches.sort((a, b) => rank(a) - rank(b) || a.name.length - b.name.length || a.name.localeCompare(b.name))
  return { results: matches.slice(0, limit), total: matches.length }
}

/** Sorted unique subtypes for a type ('' = all types). */
export function subtypesFor(items, type = '') {
  const set = new Set()
  for (const it of items) if (!type || it.type === type) set.add(it.subtype)
  return [...set].sort((a, b) => a.localeCompare(b))
}
