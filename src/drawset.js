import { get } from 'lodash';

class Drawset {
  constructor({width, height, stroke, strokeWidth, opacity}) {
    this.lines = [];
    this.width = width;
    this.height = height;
    this.opacity = opacity;
    this.stroke = stroke;
    this.strokeWidth = strokeWidth;
  }

  addLine(lineString) {
    const coords = get(lineString, 'geometry.coordinates', []);
    if (coords) { this.lines.push(coords); }
  }
};

Drawset.createDebugDrawset = ({width, height}) => {
  return new Drawset({stroke:'red', strokeWidth:1, opacity:.5, width, height});
};

export default Drawset;
