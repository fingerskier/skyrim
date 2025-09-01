import './App.css'
import { StateMachine, State } from 'ygdrassil'
import Landing from './pages/Landing.jsx'
import Alchemy from './pages/Alchemy.jsx'
import Smithing from './pages/Smithing.jsx'

export default function App() {
  return (
    <StateMachine name="skyrim" initial="landing" className="app">
      <State name="landing">
        <Landing />
      </State>
      <State name="alchemy">
        <Alchemy />
      </State>
      <State name="smithing">
        <Smithing />
      </State>
    </StateMachine>
  )
}

