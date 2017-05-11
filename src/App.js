import React, {Component} from 'react';
import './App.css';

import Hatcher from './Hatcher';

class App extends Component {
  render() {
    return (
      <div className='App'>
        <div className='header'>Hatch-o World!</div>
        <div className='example-area'>
          <Hatcher className='hatch-example'>
            <p>Default Hatching</p>
          </Hatcher>
          <Hatcher className='hatch-example' strokeWidth={10} density={0.5}>
            <p>Big Strokes</p>
          </Hatcher>
          <div className='hatch-example density-example-container'>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={25} density={0.1} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={30} density={0.2} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={35} density={0.3} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={40} density={0.4} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={45} density={0.5} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={50} density={0.6} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={55} density={0.7} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={65} density={0.8} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={75} density={0.9} drawBorder={false}/>
            <Hatcher className='density-example' opacity={.5} strokeWidth={2} hatchAngle={85} density={1.0} drawBorder={false}/>
          </div>
          <Hatcher className='hatch-example' density={0.2} densityZones={[ {density:0.7, polygon:[0,0,40,40]} ]}>
            <p>Density Zones</p>
          </Hatcher>
        </div>
      </div>
    );
  }
}

export default App;
