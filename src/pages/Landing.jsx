import { StateButton } from 'ygdrassil'

export default function Landing() {
  return (
    <div className="landing">
      <h1>Skyrim Tools</h1>
      <div className="menu">
        <StateButton to="alchemy">Alchemy Calculator</StateButton>
        <StateButton to="smithing">Smithing Calculator</StateButton>
      </div>
    </div>
  )
}
