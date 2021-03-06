import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { createHatchSvg } from './hatch';

/* Returns width/height from props if specified, or failing that, post-render
   browser-calculated width/height of component element. */
const _getWidthHeight = ({width, height}, {calcedWidth, calcedHeight}) => {
    return (width && height) ? {width, height} : {width: calcedWidth, height: calcedHeight};
}

const _getSvgStyle = (svg) => {
  return {
    backgroundRepeat: 'no-repeat',
    backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`
  };
}

/* Returns boject containing all drawing-style-related props with
   default values supplied for any unspeicfied props. */
const _getDrawStyle = (props) => {
  return  {
    drawBorder:     props.drawBorder !== undefined ? props.drawBorder : true,
    hatchAngle:     props.hatchAngle !== undefined ? props.hatchAngle : 45,
    density:        props.density || .1,
    densityZones:   props.densityZones,
    stroke:         props.stroke || 'black',
    strokeWidth:    props.strokeWidth || 3,
    opacity:        props.opacity !== undefined ? props.opacity : .25
  };
};

class Hatcher extends Component {
  constructor() {
    super();
    this.state = {
      calcedWidth: null,
      calcedHeight: null
    };
    this.hatchDiv = null;
    this._updateCalcedWidthHeight = this._updateCalcedWidthHeight.bind(this);
  }

  render() {

    const classString = classNames('hatcher', this.props.className);
    const drawStyle = _getDrawStyle(this.props);
    const { width, height } = _getWidthHeight(this.props, this.state);
    const svg = (width && height) ? createHatchSvg({width, height, drawStyle}) : null;
    const style = svg ? _getSvgStyle(svg) : null;

    return (
      <div className={classString} ref={(el) => this.hatchDiv=el} style={style}>
        {this.props.children}
      </div>
    );
  }

  componentDidMount() {
    if (!this.props.width || !this.props.height) {
      if (this.state.calcedWidth === null && this.state.calcedHeight === null) {
        this._updateCalcedWidthHeight();
      }
      window.addEventListener('resize', this._updateCalcedWidthHeight);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._updateCalcedWidthHeight);
  }

  _updateCalcedWidthHeight() {
    if (this.hatchDiv) {
      const calcedWidth = this.hatchDiv.offsetWidth;
      const calcedHeight = this.hatchDiv.offsetHeight;
      if (!calcedWidth || !calcedHeight) { console.warn('Hatcher element has no area to render. Set width/height props, use styling, or render child elements to give it dimensions.'); }
      this.setState({calcedWidth, calcedHeight});
    }
  }
}

Hatcher.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,

  // Drawstyle props
  hatchAngle: PropTypes.number,
  density: PropTypes.number,
  densityZones: PropTypes.arrayOf(
    PropTypes.shape({
      density: PropTypes.number.isRequired,
      polygon: PropTypes.arrayOf(PropTypes.number.isRequired)  //alternating X and Y coords, defining clockwise points of a polygon.
    }).isRequired
  ),
  stroke: PropTypes.string,
  strokeWidth: PropTypes.number,
  drawBorder: PropTypes.bool,
  opacity: PropTypes.number
};

export default Hatcher;
