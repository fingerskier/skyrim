// Saved builds in localStorage. Storage is injectable for tests.
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
