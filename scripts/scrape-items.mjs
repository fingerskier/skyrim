// Scrapes Skyrim item form IDs from UESP into assets/items.json.
// Usage: node scripts/scrape-items.mjs [--cache dir] [--debug]
// Re-runnable; polite (sequential, 300ms gap). Output: [{id, name, type, subtype, weight?, value?}]
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheIdx = process.argv.indexOf('--cache')
const CACHE = cacheIdx > 0 ? process.argv[cacheIdx + 1] : null
const DEBUG = process.argv.includes('--debug')

// { page, type: string | (h2, h3) => string, sub?: string | (h2,h3)=>string, cols?: names of numeric columns after the name/ID cell (default ['weight','value']), prefix?: string, unique?: true }
const byHeading = (re, a, b) => (h2, h3) => (re.test(h3) || re.test(h2) ? a : b)
const PAGES = [
  { page: 'Weapons', type: 'weapon' },
  { page: 'Unique_Weapons', type: 'weapon', sub: 'Unique', unique: true },
  { page: 'Staves', type: 'weapon', sub: 'Staff' },
  { page: 'Ammunition', type: 'weapon', sub: 'Ammunition' },
  { page: 'Generic_Magic_Weapons', type: 'weapon', sub: 'Enchanted' },
  { page: 'Armor', type: 'armor', sub: h2 => h2 },
  { page: 'Unique_Armor', type: 'armor', sub: 'Unique', unique: true },
  { page: 'Specialty_Gear', type: byHeading(/weapon/i, 'weapon', 'armor'), sub: 'Specialty', cols: [] },
  { page: 'Generic_Magic_Apparel', type: 'armor', sub: 'Enchanted' },
  { page: 'Clothing', type: byHeading(/^(rings|amulets|circlets)$/i, 'jewelry', 'clothing') },
  { page: 'Ingredients', type: 'ingredient', sub: 'Ingredient', cols: [] },
  { page: 'Potions', type: 'potion' },
  { page: 'Food', type: 'food' },
  { page: 'Ingots', type: 'material', sub: 'Ore & Ingot' },
  { page: 'Leather', type: 'material', sub: 'Leather & Hide' },
  { page: 'Gems', type: 'material', sub: 'Gem' },
  { page: 'Soul_Gems', type: 'material', sub: 'Soul Gem' },
  { page: 'Miscellaneous_Items', type: 'misc' },
  { page: 'Books', type: 'book', sub: 'Book', cols: ['value'] },
  { page: 'Spell_Tomes', type: 'spell_tome', prefix: 'Spell Tome: ', sub: (h2, h3) => (h3 || h2).replace(/ Spells$/, ''), cols: [] },
  { page: 'Scrolls', type: 'scroll', sub: 'Scroll' },
  { page: 'Notes', type: 'note', sub: 'Note', cols: [] },
  { page: 'Keys', type: 'key', sub: 'Key', cols: [] },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
const decode = s => s
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;|&#160;|&#32;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/\s+/g, ' ').trim()
const num = s => { const m = decode(s).replace(/,/g, '').match(/^-?\d+(\.\d+)?/); return m ? Number(m[0]) : undefined }
const ID_RE = /^(00|xx)[0-9a-f]{6}$/
// idref markup: <span class="idref">00<span class="idcase">012eb7</span></span>
// or (DLC):     <span class="idref"><a ...><span ...>xx</span></a><span class="idcase">0098a0</span></span>
const IDREF_RE = /class="idref">(?:<[^>]+>)*\s*([0-9a-fA-Fx]{2})\s*(?:<\/[^>]+>)*<span class="idcase">([0-9a-fA-F]{6})<\/span>/g
// name text: drop idall spans + DLC superscripts, then decode
const cleanName = s => decode(s.replace(IDREF_RE, '').replace(/<sup[\s\S]*?<\/sup>/g, ''))
  .replace(/\(\s*\)/g, '').replace(/\s*\*+$/, '').trim()
const idrefsIn = s => [...s.matchAll(IDREF_RE)].map(m => (m[1] + m[2]).toLowerCase()).filter(id => ID_RE.test(id))

async function fetchPage(name) {
  const file = CACHE ? join(CACHE, `${name}.html`) : null
  if (file && existsSync(file)) return readFileSync(file, 'utf-8')
  const res = await fetch(`https://en.uesp.net/wiki/Skyrim:${name}`, { headers: { 'User-Agent': 'Mozilla/5.0 skyrim-tools scraper' } })
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const html = await res.text()
  if (file) { mkdirSync(CACHE, { recursive: true }); writeFileSync(file, html) }
  await sleep(300)
  return html
}

const headingText = inner => decode(inner.replace(/<span class="mw-editsection">[\s\S]*$/, '')).replace(/\s*(HF|DG|DB|CC)$/, '')

// Stream of headings and table rows, in document order.
function* tokens(html) {
  // rows end at the next <tr>, </table> or heading (MediaWiki may omit </tr>)
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>|<tr[^>]*>([\s\S]*?)(?=<tr[^>]*>|<\/table>|<h[23][^>]*>)/g
  let m
  while ((m = re.exec(html))) {
    if (m[1]) yield { heading: headingText(m[2]), level: Number(m[1]) }
    else yield { row: m[3] }
  }
}
const cells = row => [...row.matchAll(/<td([^>]*)>([\s\S]*?)(?=<td|$)/g)].map(c => c[2].replace(/<\/td>\s*$/, ''))
const rowspanCells = row => [...row.matchAll(/<td([^>]*)>([\s\S]*?)(?=<td|$)/g)].map(c => /rowspan/.test(c[1]))
const pick = (v, h2, h3) => (typeof v === 'function' ? v(h2, h3) : v)

function parseRows(html, cfg) {
  const out = []
  let h2 = '', h3 = '', carried = null // carried: name from a rowspan cell (soul gems: "Petty Soul Gem" spans empty/filled rows)
  for (const t of tokens(html)) {
    if (t.heading !== undefined) { if (t.level === 2) { h2 = t.heading; h3 = '' } else h3 = t.heading; continue }
    const tds = cells(t.row)
    if (!tds.length) continue
    let id, name, rest
    const ci = tds.findIndex(c => c.includes('class="idref"'))
    if (ci >= 0) {
      const cell = tds[ci]
      // Prefer an ID labelled "Tome ID" (spell tomes list Spell ID first).
      const tome = cell.match(/Tome ID[\s\S]*$/)
      const ids = idrefsIn(tome ? tome[0] : cell)
      if (!ids.length) continue
      id = ids[0]
      name = cleanName(cell.split(/<br\s*\/?>|<dl>/)[0])
      if (name) carried = null
      else {
        // Some tables (soul gems, keys) keep the name in an earlier cell; the ID cell holds only the idref.
        const spans = rowspanCells(t.row)
        let k = ci - 1
        for (; k >= 0; k--) if (spans[k] && cleanName(tds[k])) break
        if (k >= 0) { name = cleanName(tds[k]); carried = name }
        else {
          // soul-gem tables put the contained-soul size ("none", "Petty"...) between name and ID
          const SOUL = /^(none|petty|lesser|common|greater|grand)$/i
          let soul = ''
          for (k = ci - 1; k >= 0 && !name; k--) { const t = cleanName(tds[k]); if (SOUL.test(t)) soul = soul || t; else name = t }
          if (!name && carried && soul) name = `${carried} (${soul})`
        }
      }
      rest = tds.slice(ci + 1)
    } else {
      const hi = tds.findIndex(c => ID_RE.test(decode(c).toLowerCase()))
      if (hi < 1) continue
      id = decode(tds[hi]).toLowerCase()
      name = cleanName(tds[hi - 1])
      rest = tds.slice(hi + 1)
    }
    if (!name) continue
    const type = pick(cfg.type, h2, h3)
    const subtype = pick(cfg.sub, h2, h3) ?? ((h3 && !/^(notes?|bugs?|gallery)$/i.test(h3) ? h3 : h2) || type)
    const item = { id, name: (cfg.prefix ?? '') + name, type, subtype }
    const cols = cfg.cols ?? ['weight', 'value']
    cols.forEach((k, i) => { const v = num(rest[i] ?? ''); if (v !== undefined) item[k] = v })
    if (DEBUG && out.length < 2) console.log('   ', JSON.stringify(item), '| rest:', rest.slice(0, 3).map(decode))
    out.push(item)
  }
  return out
}

// Unique_* pages: one infobox per item: <th>Unique Item: NAME (idref)</th>
function parseUnique(html, cfg) {
  const out = []
  const re = /Unique Item:\s*([\s\S]*?)<span class="idall">\(<\/span>([\s\S]*?)<span class="idall">\)<\/span>/g
  let m
  while ((m = re.exec(html))) {
    const ids = idrefsIn(m[2])
    const name = decode(m[1])
    if (name && ids.length) out.push({ id: ids[0], name, type: pick(cfg.type), subtype: pick(cfg.sub) })
  }
  return out
}

const all = new Map()
for (const cfg of PAGES) {
  const html = await fetchPage(cfg.page)
  const items = cfg.unique ? parseUnique(html, cfg) : parseRows(html, cfg)
  let added = 0
  for (const it of items) if (!all.has(it.id)) { all.set(it.id, it); added++ }
  console.log(`${cfg.page.padEnd(24)} rows=${String(items.length).padStart(5)} new=${added}`)
}
const list = [...all.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
writeFileSync(join(ROOT, 'assets', 'items.json'), JSON.stringify(list) + '\n')
console.log('total', list.length)
