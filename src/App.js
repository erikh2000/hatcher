import React, {Component} from 'react';
import './App.css';

import Hatcher from './Hatcher';

class App extends Component {
  render() {
    return (
      <div className='App'>
        <div className='header'>Hatch-o World!</div>
        <div className='example-area'>
          <Hatcher className='hatch-example' opacity={.75} density={0.4} 
              densityZones={[ {density:0.7, polygon:[0,0,40,40]} ]}>
          </Hatcher>
        </div>
      </div>
    );
  }
}

export default App;
