import { useState } from 'react'
import { StateButton } from 'ygdrassil'

const items = {
  'Iron Sword': {
    materials: { 'Iron Ingot': 1, 'Leather Strips': 1 },
    mod: 'No improvements',
  },
  'Steel Armor': {
    materials: {
      'Steel Ingot': 5,
      'Iron Ingot': 1,
      'Leather Strips': 3,
    },
    mod: 'Improved with Corundum Ingot',
  },
  'Dwarven Bow': {
    materials: {
      'Dwarven Metal Ingot': 3,
      'Iron Ingot': 2,
      'Leather Strips': 2,
    },
    mod: 'Requires Dwarven Smithing perk',
  },
}

export default function Smithing() {
  const [item, setItem] = useState('Iron Sword')
  const current = items[item]

  return (
    <div className="smithing">
      <h2>Smithing Calculator</h2>
      <select value={item} onChange={(e) => setItem(e.target.value)}>
        {Object.keys(items).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div className="materials">
        <h3>Materials</h3>
        <ul>
          {Object.entries(current.materials).map(([mat, qty]) => (
            <li key={mat}>
              {mat}: {qty}
            </li>
          ))}
        </ul>
        {current.mod && <p>{current.mod}</p>}
      </div>
      <StateButton to="landing">Back</StateButton>
    </div>
  )
}
