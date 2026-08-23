import { useEffect, useMemo, useState } from 'react'
import { StateLink } from 'ygdrassil'
import skills from '../../assets/skills.json'
import perks from '../../assets/perks.json'
import races from '../../assets/races.json'
import stones from '../../assets/stones.json'
import {
  indexPerks, startingSkills, levelFromSkills, validateBuild, canTakeRank, rankHeld,
  spentPoints, encodeBuild, decodeBuild, hasPrereq,
} from '../lib/character.js'
import { useBuild } from '../lib/buildReducer.js'
import { listBuilds, saveBuild, deleteBuild } from '../lib/buildStore.js'
import s from '../style/planner.module.css'

const data = { skills, perks, races, stones, perkMap: indexPerks(perks) }
const CATEGORIES = ['combat', 'magic', 'stealth']
// ygdrassil keeps router state in the hash as `#?k=v`; we piggyback a `build` param.
const hashParams = () => new URLSearchParams(window.location.hash.startsWith('#?') ? window.location.hash.slice(2) : '')

export default function CharacterPlanner() {
  const [build, dispatch] = useBuild(data)
  const [saved, setSaved] = useState(() => listBuilds())
  const [copied, setCopied] = useState(false)

  // Load a shared build from the URL hash once on mount.
  useEffect(() => {
    const enc = hashParams().get('build')
    if (!enc) return
    const b = decodeBuild(enc, skills, perks)
    if (b) dispatch({ type: 'load', build: { ...b, name: 'Shared Build' } })
  }, [dispatch])

  const race = races.find(r => r.id === build.race) ?? null
  const stone = stones.find(x => x.id === build.stone) ?? null
  const start = useMemo(() => startingSkills(race, skills), [race])
  const lvl = useMemo(() => levelFromSkills(start, build.skills), [start, build.skills])
  const { violations } = useMemo(() => validateBuild(build, data.perkMap), [build])
  const spent = spentPoints(build)
  const over = spent > lvl.perkPoints

  const onSave = () => setSaved(saveBuild(build))
  const onDelete = () => { setSaved(deleteBuild(build.id)); dispatch({ type: 'reset' }) }
  const onLoad = id => { const b = saved.find(x => x.id === id); if (b) dispatch({ type: 'load', build: b }) }
  const onShare = async () => {
    const params = hashParams()
    params.set('yg-pages', 'planner')
    params.set('build', encodeBuild(build, skills, perks))
    const url = `${location.origin}${location.pathname}#?${params}`
    history.replaceState(null, '', url)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable; URL is already in the address bar */ }
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h2>Character Planner</h2>
        <StateLink to="landing">Back to menu</StateLink>
      </header>

      <section className={s.toolbar}>
        <input value={build.name} onChange={e => dispatch({ type: 'setName', name: e.target.value })} placeholder="Build name" />
        <select value={build.race ?? ''} onChange={e => dispatch({ type: 'setRace', race: e.target.value || null })}>
          <option value="">— Race —</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={build.stone ?? ''} onChange={e => dispatch({ type: 'setStone', stone: e.target.value || null })}>
          <option value="">— Standing Stone —</option>
          {stones.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select value="" onChange={e => onLoad(e.target.value)}>
          <option value="">Load saved…</option>
          {saved.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={onSave}>Save</button>
        <button onClick={() => dispatch({ type: 'reset' })}>New</button>
        <button onClick={onDelete} disabled={!saved.some(b => b.id === build.id)}>Delete</button>
        <button onClick={onShare}>{copied ? 'Copied!' : 'Copy link'}</button>
      </section>

      <section className={s.summary}>
        <span>Level <b>{lvl.level}</b></span>
        <span className={over ? s.bad : ''}>Perks <b>{spent}</b> / {lvl.perkPoints}</span>
        {violations.length > 0 && <span className={s.bad}>{violations.length} invalid</span>}
        {race && <span title={race.passives.join('; ')}>{race.power}</span>}
        {stone && <span>{stone.effect}</span>}
      </section>

      <div className={s.columns}>
        {CATEGORIES.map(cat => (
          <div key={cat} className={s.column}>
            {skills.filter(k => k.category === cat).map(k => (
              <SkillPanel key={k.id} skill={k} build={build} start={start[k.id]} dispatch={dispatch} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkillPanel({ skill, build, start, dispatch }) {
  const level = build.skills[skill.id]
  const tree = perks.filter(p => p.skill === skill.id)
  const set = v => dispatch({ type: 'setSkill', skill: skill.id, level: v })
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <h3>{skill.name}</h3>
        <input type="number" min={start} max={100} value={level} onChange={e => set(e.target.value)} />
        <input type="range" min={start} max={100} value={level} onChange={e => set(e.target.value)} />
      </div>
      <ul className={s.perkList}>
        {tree.map(p => <PerkRow key={p.id} perk={p} build={build} dispatch={dispatch} />)}
      </ul>
    </div>
  )
}

function PerkRow({ perk, build, dispatch }) {
  const held = rankHeld(build, perk.id)
  const max = perk.ranks.length
  const canUp = canTakeRank(build, perk, held + 1)
  const nextReq = perk.ranks[Math.min(held, max - 1)].skillReq
  const locked = held === 0 && !canUp
  const reason = !hasPrereq(build, perk)
    ? `needs ${perk.requires.map(r => data.perkMap.get(r)?.name).join(' or ')}`
    : `skill ${nextReq}`
  const desc = perk.ranks[Math.max(held - 1, 0)].desc
  return (
    <li className={`${s.perk} ${locked ? s.locked : ''} ${held ? s.taken : ''}`} title={desc}>
      <span className={s.perkName}>{perk.name}{max > 1 && <small> {held}/{max}</small>}</span>
      <span className={s.perkCtl}>
        {held < max && !canUp && <small className={s.reason}>{held === 0 ? reason : `skill ${nextReq}`}</small>}
        <button onClick={() => dispatch({ type: 'setPerk', perkId: perk.id, rank: held - 1 })} disabled={held === 0}>−</button>
        <button onClick={() => dispatch({ type: 'setPerk', perkId: perk.id, rank: held + 1 })} disabled={!canUp}>+</button>
      </span>
    </li>
  )
}
