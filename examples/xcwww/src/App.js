import React from 'react';
import logo from './logo.svg';
import './App.css';

import {ReaktimeProvider, RealtimeProvider} from './realtime'
function App() {
  return (
    <div className="App">
      <RealtimeProvider/>
      <p>Results in the console log...</p>
    </div>
  );
}

export default App;
