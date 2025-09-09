import { useMemo, useState } from 'react'
import { StateLink } from 'ygdrassil'
import ingredients from '../../assets/alchemy_ingredients.json'
import effects from '../../assets/alchemy_effects.json'
import ingredientEffectsRaw from '../../assets/alchemy_ingredient_effects.json'

import style from '../style/alchemy.module.css'

const ingredientEffectMap = ingredientEffectsRaw.reduce((acc, { ingredient_id, effect_id }) => {
  acc[ingredient_id] = acc[ingredient_id] || []
  acc[ingredient_id].push(effect_id)
  return acc
}, {})

const effectMap = effects.reduce((acc, eff) => {
  acc[eff.id] = eff
  return acc
}, {})

const ingredientMap = ingredients.reduce((acc, ing) => {
  acc[ing.id] = ing
  return acc
}, {})

export default function AlchemyCalculator() {
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [selectedEffects, setSelectedEffects] = useState([])

  const toggle = (value, selected, setter) => {
    setter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    )
  }

  const clear = setter => setter([])

  const matchingIngredients = useMemo(() => {
    const sharesEffectWithSelected = id => {
      const effectsForIng = ingredientEffectMap[id] || []
      return selectedIngredients.some(
        otherId =>
          otherId !== id &&
          (ingredientEffectMap[otherId] || []).some(eid => effectsForIng.includes(eid)),
      )
    }

    const results = ingredients.filter(ing => {
      const effectsForIng = ingredientEffectMap[ing.id] || []
      const matchesEffects = selectedEffects.every(eid => effectsForIng.includes(eid))

      if (selectedIngredients.length === 0) return matchesEffects

      return (
        selectedIngredients.includes(ing.id) &&
          matchesEffects &&
          sharesEffectWithSelected(ing.id)
      )
    })

    const valueFor = ing => {
      const effectIds = ingredientEffectMap[ing.id] || []
      return selectedEffects.reduce(
        (sum, eid) =>
          effectIds.includes(eid) ? sum + (effectMap[eid]?.value || 0) : sum,
        0,
      )
    }

    return results.sort((a, b) => valueFor(b) - valueFor(a))
  }, [selectedIngredients, selectedEffects])

  const permutations = useMemo(() => {
    const ids = selectedIngredients.filter(id =>
      selectedEffects.every(eid => (ingredientEffectMap[id] || []).includes(eid)),
    )

    const sharedEffects = list => {
      if (list.length < 2) return []
      let shared = ingredientEffectMap[list[0]] || []
      for (let i = 1; i < list.length; i++) {
        const effectsForIng = ingredientEffectMap[list[i]] || []
        shared = shared.filter(eid => effectsForIng.includes(eid))
        if (!shared.length) return []
      }
      return shared
    }

    const combos = new Map()

    const addCombo = combo => {
      const shared = sharedEffects(combo)
      if (!shared.length) return
      const key = combo.join(',')
      const existing = combos.get(key)
      if (existing) {
        shared.forEach(eid => existing.effects.add(eid))
      } else {
        combos.set(key, { ids: combo, effects: new Set(shared) })
      }
    }

    const compareNames = (a, b) =>
      ingredientMap[a].name.localeCompare(ingredientMap[b].name)

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addCombo([ids[i], ids[j]].sort(compareNames))
      }
    }

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        for (let k = j + 1; k < ids.length; k++) {
          addCombo([ids[i], ids[j], ids[k]].sort(compareNames))
        }
      }
    }

    const result = Array.from(combos.values()).map(({ ids, effects }) => ({
      ids,
      effects: Array.from(effects).sort((a, b) =>
        effectMap[a].name.localeCompare(effectMap[b].name),
      ),
    }))

    result.sort((a, b) => {
      const nameA = a.ids.map(id => ingredientMap[id].name).join(',')
      const nameB = b.ids.map(id => ingredientMap[id].name).join(',')
      return nameA.localeCompare(nameB)
    })

    return result
  }, [selectedIngredients, selectedEffects])

  return (
    <div>
      <h2>Alchemy Ingredients</h2>
      <div
        className={style.container}
      >
        <div className={style.ingredients}>
          <h3>Ingredients</h3>
          <button onClick={() => clear(setSelectedIngredients)}>Clear</button>
          {ingredients.map(ing => (
            <label key={ing.id} className={style.ingredient}>
              <input
                type="checkbox"
                checked={selectedIngredients.includes(ing.id)}
                onChange={() => toggle(ing.id, selectedIngredients, setSelectedIngredients)}
              />
              {ing.name}
            </label>
          ))}
        </div>

        <div className={style.effects}>
          <h3>Effects</h3>
          <button onClick={() => clear(setSelectedEffects)}>Clear</button>
          {effects.map(eff => (
            <label key={eff.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={selectedEffects.includes(eff.id)}
                onChange={() => toggle(eff.id, selectedEffects, setSelectedEffects)}
              />
              {eff.name}
            </label>
          ))}
        </div>

        {/* <div>
          <h3>Matches</h3>
          {matchingIngredients.length ? (
            <ul>
              {matchingIngredients.map(ing => (
                <li key={ing.id}>{ing.name}</li>
              ))}
            </ul>
          ) : (
            <p>No ingredients match the selection.</p>
          )}
        </div> */}

        <div className={style.permutations}>
          <h3>Permutations</h3>
          {permutations.length ? (
            <table>
              <thead>
                <tr>
                  <th>Ingredient 1</th>
                  <th>Ingredient 2</th>
                  <th>Ingredient 3</th>
                  <th>Effects</th>
                </tr>
              </thead>
              <tbody>
                {permutations.map((perm, i) => (
                  <tr key={i}>
                    {[0, 1, 2].map(idx => (
                      <td key={idx}>
                        {perm.ids[idx]
                          ? ingredientMap[perm.ids[idx]].name
                          : ''}
                      </td>
                    ))}
                    <td>
                      {perm.effects
                        .map(eid => effectMap[eid]?.name)
                        .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No permutations match the selection.</p>
          )}
        </div>
      </div>
      <StateLink to="landing">Back to menu</StateLink>
    </div>
  )
}
