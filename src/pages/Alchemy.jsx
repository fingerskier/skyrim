import { useState } from 'react'
import { StateButton } from 'ygdrassil'

const potions = {
  'Health Potion': ['Blue Mountain Flower', 'Wheat'],
  'Fortify Smithing': ['Blisterwort', 'Spriggan Sap'],
  Invisibility: ['Chaurus Eggs', 'Nirnroot'],
}

const allIngredients = Array.from(new Set(Object.values(potions).flat()))

export default function Alchemy() {
  const [selected, setSelected] = useState([])

  const toggle = (ingredient) => {
    setSelected((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient],
    )
  }

  const matches = Object.entries(potions)
    .filter(([, ingredients]) => ingredients.every((i) => selected.includes(i)))
    .map(([name]) => name)

  return (
    <div className="alchemy">
      <h2>Alchemy Calculator</h2>
      <div className="ingredients">
        {allIngredients.map((ing) => (
          <label key={ing}>
            <input
              type="checkbox"
              checked={selected.includes(ing)}
              onChange={() => toggle(ing)}
            />{' '}
            {ing}
          </label>
        ))}
      </div>
      <div className="results">
        {matches.length ? (
          <ul>
            {matches.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : (
          <p>No matching potions</p>
        )}
      </div>
      <StateButton to="landing">Back</StateButton>
    </div>
  )
}
