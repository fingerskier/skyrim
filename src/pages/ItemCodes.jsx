import { useDeferredValue, useMemo, useState } from 'react'
import { StateLink } from 'ygdrassil'
import items from '../../assets/items.json'
import { ITEM_TYPES, typeLabel, searchItems, subtypesFor } from '../lib/itemSearch.js'
import s from '../style/items.module.css'

const LIMIT = 300

export default function ItemCodes() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [subtype, setSubtype] = useState('')
  const [copied, setCopied] = useState(null)
  const dq = useDeferredValue(q)

  const subtypes = useMemo(() => subtypesFor(items, type), [type])
  const { results, total } = useMemo(() => searchItems(items, { q: dq, type, subtype }, LIMIT), [dq, type, subtype])

  const onType = v => { setType(v); setSubtype('') }
  const copy = async id => {
    try { await navigator.clipboard.writeText(id); setCopied(id); setTimeout(() => setCopied(null), 1200) } catch { /* clipboard blocked */ }
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h2>Item Codes</h2>
        <StateLink to="landing">Back to menu</StateLink>
      </header>

      <section className={s.toolbar}>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name or ID (e.g. iron sword, 0005ace4)"
          className={s.search}
        />
        <select value={type} onChange={e => onType(e.target.value)}>
          <option value="">All types</option>
          {ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={subtype} onChange={e => setSubtype(e.target.value)}>
          <option value="">All subtypes</option>
          {subtypes.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </section>

      <p className={s.count}>
        {total === results.length ? `${total} items` : `Showing ${results.length} of ${total} — refine your search`}
        <span className={s.hint}> · use <code>player.additem &lt;ID&gt; &lt;qty&gt;</code>; <code>xx</code> = load order of the DLC/CC plugin</span>
      </p>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Subtype</th><th>ID</th><th>Wt</th><th>Val</th><th></th></tr>
          </thead>
          <tbody>
            {results.map(it => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td>{typeLabel(it.type)}</td>
                <td>{it.subtype}</td>
                <td><code>{it.id}</code></td>
                <td className={s.num}>{it.weight ?? ''}</td>
                <td className={s.num}>{it.value ?? ''}</td>
                <td><button onClick={() => copy(it.id)}>{copied === it.id ? 'Copied' : 'Copy'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.credit}>Data scraped from <a href="https://en.uesp.net/wiki/Skyrim:Items" target="_blank" rel="noreferrer">UESP</a>.</p>
    </div>
  )
}
