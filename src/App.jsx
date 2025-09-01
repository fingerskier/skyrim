import { StateMachine, State } from 'ygdrassil'
import Landing from './pages/Landing.jsx'
import AlchemyCalculator from './pages/AlchemyCalculator.jsx'
import SmithingCalculator from './pages/SmithingCalculator.jsx'
import './App.css'

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
    </StateMachine>
  )
}

