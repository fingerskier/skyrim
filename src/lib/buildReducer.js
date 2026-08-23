import { useReducer } from 'react'
import { startingSkills, pruneInvalid, canTakeRank, rankHeld } from './character.js'
import { newId } from './buildStore.js'

export function emptyBuild(data) {
  return { id: newId(), name: 'New Build', race: null, stone: null, skills: startingSkills(null, data.skills), perks: {} }
}
const raceById = (data, id) => data.races.find(r => r.id === id) ?? null
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(n)))

/** Pure reducer. data = {skills, perks, races, perkMap}. */
export function buildReducer(state, action, data) {
  const prune = b => pruneInvalid(b, data.perkMap)
  switch (action.type) {
    case 'setName': return { ...state, name: action.name }
    case 'setStone': return { ...state, stone: action.stone ?? null }
    case 'setRace': {
      const oldStart = startingSkills(raceById(data, state.race), data.skills)
      const newStart = startingSkills(raceById(data, action.race), data.skills)
      const skills = {}
      for (const s of data.skills) {
        const cur = state.skills[s.id] ?? oldStart[s.id]
        // untouched skills follow the race; edited skills keep their value but never drop below the new floor
        skills[s.id] = cur === oldStart[s.id] ? newStart[s.id] : Math.max(cur, newStart[s.id])
      }
      return prune({ ...state, race: action.race ?? null, skills })
    }
    case 'setSkill': {
      const start = startingSkills(raceById(data, state.race), data.skills)
      const level = clamp(Number(action.level) || 0, start[action.skill], 100)
      return prune({ ...state, skills: { ...state.skills, [action.skill]: level } })
    }
    case 'setPerk': {
      const perk = data.perkMap.get(action.perkId)
      if (!perk) return state
      const held = rankHeld(state, perk.id)
      if (action.rank === held - 1 || (action.rank === held + 1 && canTakeRank(state, perk, action.rank))) {
        const perks = { ...state.perks }
        if (action.rank <= 0) delete perks[perk.id]; else perks[perk.id] = action.rank
        return prune({ ...state, perks })
      }
      return state
    }
    case 'load': {
      const b = action.build
      const start = startingSkills(raceById(data, b.race), data.skills)
      return prune({ id: b.id ?? newId(), name: b.name ?? 'Build', race: b.race ?? null, stone: b.stone ?? null,
        skills: { ...start, ...(b.skills ?? {}) }, perks: { ...(b.perks ?? {}) } })
    }
    case 'reset': return emptyBuild(data)
    default: return state
  }
}

export function useBuild(data) {
  return useReducer((s, a) => buildReducer(s, a, data), null, () => emptyBuild(data))
}
