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
