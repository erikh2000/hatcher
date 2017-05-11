import { ContainsPoint as containsPoint } from 'polyk';

import {
  calcAngleBetweenPoints,
  calcAverageAngle,
  degreesToRadians,
  normalizeAngle,
  solveTriangle2Angles1Side
} from './geometry';
import { getDensityAtPoint } from './density-map';

const _getStrokeAttributesForDrawStyle = ({strokeColor, strokeWidth}) =>
  `stroke='${strokeColor}' stroke-width='${strokeWidth}'`;

const _fixHatchAngleAsNeeded = (angle) => (angle % 90 === 0) ? angle + .1 : angle;

const r = (c) => Math.round(c);

// Get the width of a line that runs parallel to X axis and intersects the stroke.
const _getHatchXAxisWidth = ({hatchAngle, strokeWidth}) => {
  const tri = solveTriangle2Angles1Side({ A: 90 - Math.abs(hatchAngle), B: 90, a: strokeWidth });
  return tri.b;
};

const _calcHatchDrawingValues = ({hatchAngle, density, height, strokeWidth, width}) => {
  hatchAngle = _fixHatchAngleAsNeeded(hatchAngle);

  const tri = solveTriangle2Angles1Side({A: hatchAngle, B: 90, c: height});
  const bottomOffset = tri.a;
  const startTopX = (bottomOffset > 0) ? -bottomOffset : 0;
  const endTopX = width + ((bottomOffset < 0) ? -bottomOffset : 0);

  const xAxisWidth = _getHatchXAxisWidth({hatchAngle, strokeWidth});
  const hatchSpacing = xAxisWidth / density;

  return {hatchSpacing, bottomOffset, startTopX, endTopX};
};

const _polylineSvg = ({strokeAttributes, line}) => {
  let ret = `<polyline fill='none' ${strokeAttributes} points='`;
  for (let i=0; i < line.length; i += 2) {
    ret += `${r(line[i])},${r(line[i+1])}`;
    if (i + 2 < line.length) { ret += ' '; }
  }
  ret += `'/>`;
  return ret;
}

const _hatchSvg = ({width, height, drawStyle}) => {
  const {hatchAngle, density, strokeWidth} = drawStyle;
  if (density <= 0) { return ''; } // Density of 0 means no hatch lines.

  const {hatchSpacing, bottomOffset, startTopX, endTopX} = _calcHatchDrawingValues(
    {hatchAngle, density, height, strokeWidth, width} );
  const strokeAttributes = _getStrokeAttributesForDrawStyle(drawStyle);

  let ret = '';
  for (let x = startTopX; x <= endTopX; x += hatchSpacing) {
    ret += `<line ${strokeAttributes} x1='${r(x)}' y1='0' x2='${r(x+bottomOffset)}' y2='${height}'/>`;
  }

  return ret;
};

const _getBoundingRectPoly = (width, height) => {
  return [0,0, width,0, width,height, 0,height];
}

const _calcSeedLine = ({width, height, hatchAngle, segmentLength = 20, roughness = 1}) => {
  if (roughness > 1) { roughness = 1; }
  else if (roughness < 0) { roughness = 0; }

  const centerX = width / 2, centerY = height / 2;
  const line = [centerX, centerY];
  const boundingRect = _getBoundingRectPoly(width, height);
  const angleVariance = roughness * 50;

  //Travel from center point in one direction, adding points to line, until after an added point is OOB.
  let x = centerX, y = centerY;
  let travelAngle = hatchAngle;
  while (containsPoint(boundingRect, x, y)) {
    travelAngle += ((Math.random() * angleVariance) - (angleVariance / 2));
    let a = degreesToRadians(travelAngle);
    x += (Math.cos(a) * segmentLength);
    y += (Math.sin(a) * segmentLength);
    line.push(x);
    line.push(y);
  }

  //Do same thing, but travel in opposite direction.
  x = centerX;
  y = centerY;
  travelAngle = hatchAngle;
  while (containsPoint(boundingRect, x, y)) {
    travelAngle += ((Math.random() * angleVariance) - (angleVariance / 2));
    let a = degreesToRadians(travelAngle);
    x -= (Math.cos(a) * segmentLength);
    y -= (Math.sin(a) * segmentLength);
    line.unshift(y);
    line.unshift(x);
  }

  return line;
};

const _calcFrontierPointsFromLine = (line) => {
  const ret = [];
  for(let i=0; i<line.length; i+=2) {
    const point = {x: line[i], y: line[i+1]};
    const a1 = (i > 0) ? calcAngleBetweenPoints({x1:line[i-2], y1:line[i-1], x2:point.x, y2:point.y}) : null;
    const a2 = (i + 2 < line.length) ? calcAngleBetweenPoints({x1:point.x, y1:point.y, x2:line[i+2], y2:line[i+3]}) : null;
    point.angle = normalizeAngle(calcAverageAngle(a1,a2) + 90);
    ret.push(point);
  }
  return ret;
}

const _flipFrontierPoints = (frontierPoints) => {
  return frontierPoints.map( (point) => { return { x: point.x, y: point.y, angle: normalizeAngle(point.angle + 180) } } );
}

const _frontierNormalsSvg = ({strokeAttributes, frontierPoints}) => {
  let ret = '';
  frontierPoints.forEach( (point) => {
    console.log('a=' + point.angle);
    const a = degreesToRadians(point.angle);
    const toX = point.x + (Math.cos(a)*10), toY = point.y + (Math.sin(a)*10);
    ret += _polylineSvg({ strokeAttributes, line:[point.x, point.y, toX, toY] });
  });
  return ret;
}

const _hatchSvgWithDensityZones = ({width, height, drawStyle}) => {
  const {hatchAngle, density, densityZones, strokeWidth} = drawStyle;

  const strokeAttributes = _getStrokeAttributesForDrawStyle(drawStyle);
  const seedLine = _calcSeedLine({width, height, hatchAngle});

  let ret = '';
  ret += _polylineSvg({strokeAttributes, line:seedLine});

  const frontierPoints = _calcFrontierPointsFromLine(seedLine);

  ret += _frontierNormalsSvg({strokeAttributes, frontierPoints});
  ret += _frontierNormalsSvg({strokeAttributes, frontierPoints: _flipFrontierPoints(frontierPoints)});

  return ret;
};

const _borderSvg = ({width, height, drawStyle}) => {
  const strokeAttributes = _getStrokeAttributesForDrawStyle(drawStyle);
  return `<polyline fill='none' ${strokeAttributes} ` +
    `points='1,1 ${width},1 ${width},${height} 1,${height} 1,1'/>`;
};

export const createHatchSvg = ({width, height, drawStyle}) => {
  let ret = `<svg className='hatcher-svg' xmlns='http://www.w3.org/2000/svg' ` +
    `opacity='${drawStyle.opacity}' width='${width}' height='${height}'>`;

  if (drawStyle.densityZones) {
    ret += _hatchSvgWithDensityZones({width, height, drawStyle});
  } else {
    ret += _hatchSvg({width, height, drawStyle});
  }

  if (drawStyle.drawBorder) {
    ret += _borderSvg({width, height, drawStyle});
  }

  ret += `</svg>`;

  return ret;
};
