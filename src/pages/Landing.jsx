import { StateLink } from 'ygdrassil'

export default function Landing() {
  return (
    <div>
      <h1>Skyrim Tools</h1>
      <p>Select a tool:</p>
      <nav>
        <StateLink to="alchemy">Alchemy Calculator</StateLink>
        {' | '}
        <StateLink to="smithing">Smithing Calculator</StateLink>
      </nav>
    </div>
  )
}

