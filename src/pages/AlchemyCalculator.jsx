import { useMemo, useState } from 'react'
import { StateLink } from 'ygdrassil'
import ingredients from '../../assets/alchemy_ingredients.json'
import effects from '../../assets/alchemy_effects.json'
import ingredientEffectsRaw from '../../assets/alchemy_ingredient_effects.json'

const ingredientEffectMap = ingredientEffectsRaw.reduce((acc, { ingredient_id, effect_id }) => {
  acc[ingredient_id] = acc[ingredient_id] || []
  acc[ingredient_id].push(effect_id)
  return acc
}, {})

const effectMap = effects.reduce((acc, eff) => {
  acc[eff.id] = eff
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

  return (
    <div>
      <h2>Alchemy Ingredients</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div>
          <h3>Ingredients</h3>
          <button onClick={() => clear(setSelectedIngredients)}>Clear</button>
          {ingredients.map(ing => (
            <label key={ing.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={selectedIngredients.includes(ing.id)}
                onChange={() => toggle(ing.id, selectedIngredients, setSelectedIngredients)}
              />
              {ing.name}
            </label>
          ))}
        </div>
        <div>
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
        <div>
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
        </div>
      </div>
      <StateLink to="landing">Back to menu</StateLink>
    </div>
  )
}
