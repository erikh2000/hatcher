import React, {Component} from 'react';
import './App.css';

import Hatcher from './Hatcher';

class App extends Component {
  render() {
    return (
      <div className='App'>
        <div className='header'>Hatch-o World!</div>
        <div className='example-area'>
          <Hatcher className='hatch-example' opacity={.75} density={0.2}
              densityZones={[
                {density:0.7, polygon:[0,0, 40,0, 40,360, 0,360]},
                {density:0.6, polygon:[40,0, 80,0, 80,360, 40,360]},
                {density:0.5, polygon:[80,0, 120,0, 120,360, 80,360]},
                {density:0.4, polygon:[120,0, 160,0, 160,360, 120,360]},
                {density:0.3, polygon:[160,0, 200,0, 200,360, 160,360]}
              ]}>
          </Hatcher>
        </div>
      </div>
    );
  }
}

export default App;
