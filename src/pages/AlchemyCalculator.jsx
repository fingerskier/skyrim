import { useState } from 'react'
import { StateLink } from 'ygdrassil'

const potions = [
  { name: 'Health Potion', ingredients: ['Blue Mountain Flower', 'Wheat'] },
  { name: 'Fortify Smithing', ingredients: ['Blisterwort', 'Spriggan Sap'] },
  { name: 'Fortify Barter', ingredients: ['Tundra Cotton', 'Blue Butterfly Wing'] },
]

const allIngredients = Array.from(new Set(potions.flatMap(p => p.ingredients))).sort()

export default function AlchemyCalculator() {
  const [selected, setSelected] = useState([])

  const toggleIngredient = (ing) => {
    setSelected(prev =>
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing],
    )
  }

  const results = potions.filter(p => p.ingredients.every(ing => selected.includes(ing)))

  return (
    <div>
      <h2>Alchemy Calculator</h2>
      <p>Select ingredients to see matching potions.</p>
      <div>
        {allIngredients.map(ing => (
          <label key={ing} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={selected.includes(ing)}
              onChange={() => toggleIngredient(ing)}
            />
            {ing}
          </label>
        ))}
      </div>
      <div>
        <h3>Matching Potions</h3>
        {results.length ? (
          <ul>
            {results.map(p => (
              <li key={p.name}>{p.name}</li>
            ))}
          </ul>
        ) : (
          <p>No potions match the selected ingredients.</p>
        )}
      </div>
      <StateLink to="landing">Back to menu</StateLink>
    </div>
  )
}

