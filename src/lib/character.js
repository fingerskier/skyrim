// Pure character-build logic: level formula, perk gating, validation, share encoding.

export const BASE_SKILL = 15

/** {skillId: 15 + racial bonus} for every skill. */
export function startingSkills(race, skills) {
  const out = {}
  for (const s of skills) out[s.id] = BASE_SKILL + (race?.skills?.[s.id] ?? 0)
  return out
}

/** Character XP needed to go from level L to L+1 (fXPLevelUpBase=75, fXPLevelUpMult=25). */
export const xpForLevelUp = L => 75 + 25 * L

/** Each skill increase to level s grants s character XP. Returns {level, perkPoints, xp}. */
export function levelFromSkills(start, target) {
  let xp = 0
  for (const id of Object.keys(target)) {
    const a = start[id] ?? BASE_SKILL, b = target[id] ?? a
    for (let s = a + 1; s <= b; s++) xp += s
  }
  let level = 1, pool = xp
  while (pool >= xpForLevelUp(level)) { pool -= xpForLevelUp(level); level++ }
  return { level, perkPoints: level - 1, xp }
}

// ---- perks ----------------------------------------------------------------

export const indexPerks = perks => new Map(perks.map(p => [p.id, p]))
export const rankHeld = (build, id) => build.perks[id] ?? 0
export const hasPrereq = (build, perk) =>
  perk.requires.length === 0 || perk.requires.some(r => rankHeld(build, r) > 0)
export const spentPoints = build => Object.values(build.perks).reduce((n, r) => n + r, 0)

export function canTakeRank(build, perk, rank) {
  if (rank < 1 || rank > perk.ranks.length) return false
  if (rankHeld(build, perk.id) !== rank - 1) return false
  if (!hasPrereq(build, perk)) return false
  return (build.skills[perk.skill] ?? 0) >= perk.ranks[rank - 1].skillReq
}

export function validateBuild(build, perkMap) {
  const violations = []
  for (const [id, rank] of Object.entries(build.perks)) {
    if (rank <= 0) continue
    const perk = perkMap.get(id)
    if (!perk) { violations.push({ perkId: id, reason: 'unknown perk' }); continue }
    if (!hasPrereq(build, perk)) violations.push({ perkId: id, reason: 'missing prerequisite' })
    const need = perk.ranks[Math.min(rank, perk.ranks.length) - 1].skillReq
    if ((build.skills[perk.skill] ?? 0) < need)
      violations.push({ perkId: id, reason: `skill too low (needs ${need})` })
  }
  return { violations, spent: spentPoints(build) }
}

/** Drop unknown perks, clamp ranks, then repeatedly remove ranks whose prereq/skill gate fails. */
export function pruneInvalid(build, perkMap) {
  const perks = {}
  for (const [id, rank] of Object.entries(build.perks)) {
    const perk = perkMap.get(id)
    if (perk && rank > 0) perks[id] = Math.min(rank, perk.ranks.length)
  }
  let changed = true
  while (changed) {
    changed = false
    const cur = { skills: build.skills, perks }
    for (const [id, rank] of Object.entries(perks)) {
      const perk = perkMap.get(id)
      if (!hasPrereq(cur, perk)) { delete perks[id]; changed = true; continue }
      const lvl = build.skills[perk.skill] ?? 0
      let r = rank
      while (r > 0 && perk.ranks[r - 1].skillReq > lvl) r--
      if (r !== rank) { changed = true; if (r === 0) delete perks[id]; else perks[id] = r }
    }
  }
  return { ...build, perks }
}

// ---- share string ----------------------------------------------------------
// v1.<race>.<stone>.<skill levels csv (skills.json order)>.<"perkIndex:rank" csv>

export function encodeBuild(build, skills, perks) {
  const sk = skills.map(s => build.skills[s.id] ?? BASE_SKILL).join(',')
  const pk = perks.map((p, i) => [i, build.perks[p.id] ?? 0]).filter(([, r]) => r > 0).map(([i, r]) => `${i}:${r}`).join(',')
  return ['v1', build.race ?? '', build.stone ?? '', sk, pk].join('.')
}

export function decodeBuild(str, skills, perks) {
  if (typeof str !== 'string') return null
  const parts = str.split('.')
  if (parts.length !== 5 || parts[0] !== 'v1') return null
  const [, race, stone, sk, pk] = parts
  const levels = sk.split(',').map(Number)
  if (levels.length !== skills.length || levels.some(n => !Number.isInteger(n))) return null
  const skillsOut = Object.fromEntries(skills.map((s, i) => [s.id, levels[i]]))
  const perksOut = {}
  if (pk) for (const tok of pk.split(',')) {
    const [i, r] = tok.split(':').map(Number)
    if (!perks[i] || !Number.isInteger(r) || r <= 0) return null
    perksOut[perks[i].id] = r
  }
  return { race: race || null, stone: stone || null, skills: skillsOut, perks: perksOut }
}
