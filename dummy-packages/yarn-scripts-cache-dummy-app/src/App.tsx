import {randomGreeting} from "@rgischk/yarn-scripts-cache-dummy-lib";

import './App.css'

function App() {

  return (
      <div style={{color: import.meta.env.VITE_COLOR}}>
          {randomGreeting()} World!
      </div>
  )
}

export default App
