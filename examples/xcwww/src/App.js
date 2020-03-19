import React from 'react';
import './App.css';

import {RealtimeProvider} from './realtime'
function App() {
  return (
    <div className="App">
      <RealtimeProvider/>
      <p>Results in the console log...</p>
    </div>
  );
}

export default App;
