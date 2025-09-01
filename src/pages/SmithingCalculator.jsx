import { useState } from 'react'
import { StateLink } from 'ygdrassil'

const items = [
  { name: 'Iron Sword', materials: { 'Iron Ingot': 1, 'Leather Strips': 1 } },
  {
    name: 'Steel Armor',
    materials: { 'Steel Ingot': 5, 'Iron Ingot': 1, 'Leather Strips': 3 },
  },
]

export default function SmithingCalculator() {
  const [selected, setSelected] = useState(items[0].name)

  const item = items.find(i => i.name === selected)

  return (
    <div>
      <h2>Smithing Calculator</h2>
      <p>Choose an item to see required materials.</p>
      <select value={selected} onChange={e => setSelected(e.target.value)}>
        {items.map(i => (
          <option key={i.name} value={i.name}>
            {i.name}
          </option>
        ))}
      </select>
      <div>
        <h3>Materials</h3>
        <ul>
          {Object.entries(item.materials).map(([mat, qty]) => (
            <li key={mat}>
              {mat}: {qty}
            </li>
          ))}
        </ul>
      </div>
      <StateLink to="landing">Back to menu</StateLink>
    </div>
  )
}

