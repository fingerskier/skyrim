import { useState } from 'react';
import { StateLink } from 'ygdrassil';
import { ingredients, effects } from '../data/alchemy';
import { ingredientsForEffects, possiblePotions } from '../lib/alchemy';

function Checklist({ items, selected, toggle }) {
  return (
    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
      {items.map(item => (
        <label key={item.name} style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={selected.includes(item.name)}
            onChange={() => toggle(item.name)}
          />
          {item.name}
        </label>
      ))}
    </div>
  );
}

function Results({ combos }) {
  return (
    <div>
      <h3>Combinations</h3>
      {combos.length ? (
        <ul>
          {combos.map((c, i) => (
            <li key={i}>
              {c.ingredients.join(', ')} → {c.effects.join(', ')}
            </li>
          ))}
        </ul>
      ) : (
        <p>No valid combinations.</p>
      )}
    </div>
  );
}

export default function AlchemyCalculator() {
  const [mode, setMode] = useState('ingredients');
  const [selected, setSelected] = useState([]);

  const toggle = name => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name],
    );
  };

  let combos = [];
  if (mode === 'ingredients') {
    const chosen = ingredients.filter(ing => selected.includes(ing.name));
    combos = possiblePotions(chosen);
  } else {
    const chosenEffects = selected;
    const candidates = ingredientsForEffects(chosenEffects, ingredients);
    combos = possiblePotions(candidates).filter(c =>
      chosenEffects.every(eff => c.effects.includes(eff)),
    );
  }

  const list = mode === 'ingredients' ? ingredients : effects;

  return (
    <div>
      <h2>Alchemy Calculator</h2>
      <div style={{ marginBottom: '1em' }}>
        <label>
          <input
            type="radio"
            name="mode"
            value="ingredients"
            checked={mode === 'ingredients'}
            onChange={() => {
              setMode('ingredients');
              setSelected([]);
            }}
          />
          By Ingredients
        </label>
        {' '}
        <label>
          <input
            type="radio"
            name="mode"
            value="effects"
            checked={mode === 'effects'}
            onChange={() => {
              setMode('effects');
              setSelected([]);
            }}
          />
          By Effects
        </label>
      </div>
      <Checklist items={list} selected={selected} toggle={toggle} />
      <Results combos={combos} />
      <StateLink to="landing">Back to menu</StateLink>
    </div>
  );
}
