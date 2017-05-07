import React, { Component } from 'react';
import './App.css';

import Hatcher from './Hatcher';

class App extends Component {
  render() {
    return (
      <div className='App'>
        <div className='header'>Example:</div>
        <div className='example-area'>
          <Hatcher className='hatch-example1' hatchAngle={20}><p>Some text</p></Hatcher>
        </div>
      </div>
    );
  }
}

export default App;
