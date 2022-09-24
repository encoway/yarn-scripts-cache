import React from 'react';
import {randomGreeting} from "@rgischk/build-result-cache-dummy-lib";

function App() {
  return (
    <div style={{color: process.env.REACT_APP_COLOR}}>
      {randomGreeting()} World!
    </div>
  )
}

export default App
