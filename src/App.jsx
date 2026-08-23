import { lazy, Suspense } from 'react'
import { StateMachine, State } from 'ygdrassil'
import Landing from './pages/Landing.jsx'
import AlchemyCalculator from './pages/AlchemyCalculator.jsx'
import SmithingCalculator from './pages/SmithingCalculator.jsx'
import CharacterPlanner from './pages/CharacterPlanner.jsx'
import './App.css'

// lazy: items.json is ~800 kB, only load it when the page is opened
const ItemCodes = lazy(() => import('./pages/ItemCodes.jsx'))

export default function App() {
  return (
    <StateMachine name="pages" initial="landing">
      <State name="landing">
        <Landing />
      </State>
      <State name="alchemy">
        <AlchemyCalculator />
      </State>
      <State name="smithing">
        <SmithingCalculator />
      </State>
      <State name="planner">
        <CharacterPlanner />
      </State>
      <State name="items">
        <Suspense fallback={<p>Loading item database…</p>}>
          <ItemCodes />
        </Suspense>
      </State>
    </StateMachine>
  )
}

