import { ContainsPoint as containsPoint } from 'polyk';
import 'seedrandom'; // Overrides Math.random() and adds Math.seedrandom().

import {
  calcAngleBetweenPoints,
  calcAngleDifference,
  calcAverageAngle,
  degreesToRadians,
  fixWrappedAnglesNoSwap,
  normalizeAngle,
  solveTriangle2Angles1Side
} from './geometry';
import { getDensityAtPoint } from './density-map';

const DEBUG_STROKE_ATTRIBUTES = `stroke='red' stroke-width='1' opacity='.5'`;

const _getStrokeAttributesFromDrawStyle = ({strokeColor, strokeWidth}) =>
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

const _circleSvg = ({strokeAttributes, cx, cy, r}) => {
  return `<circle ${strokeAttributes} cx='${cx}' cy='${cy}' r='${r}' />`;
}

const _polylineSvg = ({strokeAttributes, line}) => {
  let svg = `<polyline fill='none' ${strokeAttributes} points='`;
  for (let i=0; i < line.length; i += 2) {
    svg += `${r(line[i])},${r(line[i+1])}`;
    if (i + 2 < line.length) { svg += ' '; }
  }
  svg += `'/>`;
  return svg;
}

const _polylinesSvg = ({strokeAttributes, lines}) => {
  let svg = '';
  lines.forEach((line) => {
    svg += _polylineSvg({strokeAttributes, line});
  });
  return svg;
}


const _hatchSvg = ({width, height, drawStyle}) => {
  const {hatchAngle, density, strokeWidth} = drawStyle;
  if (density <= 0) { return ''; } // Density of 0 means no hatch lines.

  const {hatchSpacing, bottomOffset, startTopX, endTopX} = _calcHatchDrawingValues(
    {hatchAngle, density, height, strokeWidth, width} );
  const strokeAttributes = _getStrokeAttributesFromDrawStyle(drawStyle);

  let svg = '';
  for (let x = startTopX; x <= endTopX; x += hatchSpacing) {
    svg += `<line ${strokeAttributes} x1='${r(x)}' y1='0' x2='${r(x+bottomOffset)}' y2='${height}'/>`;
  }

  return svg;
};

const _getBoundingRectPoly = (width, height) => {
  return [0,0, width,0, width,height, 0,height];
}

const _calcSeedLine = ({width, height, hatchAngle, segmentLength = 20, roughness = 1, randomSeed}) => {
  if (roughness > 1) { roughness = 1; }
  else if (roughness < 0) { roughness = 0; }

  const centerX = width / 2, centerY = height / 2;
  const line = [centerX, centerY];
  const boundingRect = _getBoundingRectPoly(width, height);
  const angleVariance = roughness * 50;

  if (randomSeed !== undefined) { Math.seedrandom(randomSeed); } // Use a random seed to get consistent random seed line.

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

const _calcFrontierPointsFromLine = ({line, density, densityZones}) => {
  const ret = [];
  for(let i=0; i<line.length; i+=2) {
    const point = {x: line[i], y: line[i+1]};
    const a1 = (i > 0) ? calcAngleBetweenPoints({x1:line[i-2], y1:line[i-1], x2:point.x, y2:point.y}) : null;
    const a2 = (i + 2 < line.length) ? calcAngleBetweenPoints({x1:point.x, y1:point.y, x2:line[i+2], y2:line[i+3]}) : null;
    point.density = getDensityAtPoint({x:point.x, y:point.y, defaultDensity:density, densityZones});
    point.angle = normalizeAngle(calcAverageAngle(a1,a2) + 90);
    ret.push(point);
  }
  return ret;
}

const _flipFrontierPoints = (frontierPoints) => {
  return frontierPoints.map( (point) => { return { x: point.x, y: point.y, angle: normalizeAngle(point.angle + 180) } } );
}

const _frontierNormalsSvg = ({strokeAttributes = DEBUG_STROKE_ATTRIBUTES, normalLength = 5, frontierPoints}) => {
  let svg = '';
  frontierPoints.forEach( (point, i) => {
    console.log('a=' + point.angle);
    const a = degreesToRadians(point.angle);
    const toX = point.x + (Math.cos(a)*normalLength);
    const toY = point.y + (Math.sin(a)*normalLength);
    if (_isFrontierPointConvex(frontierPoints, i)) {
      //svg += _circleSvg({ strokeAttributes, cx:point.x, cy:point.x, r:1});
      svg += _circleSvg({ strokeAttributes, cx:toX, cy:toY, r:1});
    } else {
      svg += _polylineSvg({ strokeAttributes, line:[point.x, point.y, toX, toY] });
    }
  });
  return svg;
}

const _linePointsSvg = ({strokeAttributes = DEBUG_STROKE_ATTRIBUTES, lines}) => {
  let svg='';
  lines.forEach((line) => {
    for (let i = 0; i < line.length; i += 2) {
      svg += _circleSvg({strokeAttributes, cx:line[i], cy:line[i+1], r:2});
    }
  });
  return svg;
}

// Cull of add points on ends of line so that there is always one and only point that extends past the bounding rect.
const _fixLineEndPoints = ({line, boundingRect}) => {
  //Find first point that is not OOB.
  let first;
  for (first = 0; first < line.length; first += 2) {
    if (containsPoint(boundingRect, line[first], line[first+1])) { break; }
  }
  if (first >= line.length) { return []; } //All points are OOB.

  //Find last point that is not OOB.
  let last;
  for (last = line.length - 2; last > first; last -= 2) {
    if (containsPoint(boundingRect, line[last], line[last+1])) { break; }
  }

  let extraStartPoint;
  if (first === 0) { //Need to add a "one past" point.
    const dx = line[first+2] - line[first], dy = line[first+3] - line[first+1];
    if (!isNaN(dx)) {
      const x = line[first] - dx;
      const y = line[first+1] - dy;
      extraStartPoint = [x,y];
    }
  } else { //Enlarge range to include "one past" point.
    first -= 2;
  }
  let extraEndPoint;
  if (last === line.length - 2) { //Need to add a "one past" point.
    const dx = line[last] - line[last-2], dy = line[last+1] - line[last-1];
    if (!isNaN(dx)) {
      let x = line[last] + dx;
      let y = line[last+1] - dy;
      extraEndPoint = [x,y];
    }
  } else { //Enlarge range to include "one past" point.
    last += 2;
  }

  let ret = line.slice(first, last+2);
  if (extraStartPoint) { ret = extraStartPoint.concat(line); }
  if (extraEndPoint) { ret = line.concat(extraEndPoint); }
  return ret;
};

const _isFrontierPointConvex = (frontierPoints, pointI) => {
  //Get adjacent points.
  const prevPoint = (pointI === 0) ? null : frontierPoints[pointI-1];
  const nextPoint = (pointI === frontierPoints - 1) ? null : frontierPoints[pointI+1];

  //If point is at either end of line then there is no angle to measure.
  if (!prevPoint || !nextPoint) { return false; }

  const point = frontierPoints[pointI];
  const prevToPointAngle = calcAngleBetweenPoints({x1:prevPoint.x, y1:prevPoint.y, x2:point.x, y2:point.y});
  const pointToNextAngle = calcAngleBetweenPoints({x1:point.x, y1:point.y, x2:nextPoint.x, y2:nextPoint.y});
  const {a1w, a2w} = fixWrappedAnglesNoSwap(prevToPointAngle, pointToNextAngle);

  const angleDifference = a2w - a1w;

  const somethingFlipped = false; //point.angle-based XXX

  return (somethingFlipped) ? angleDifference > 0 : angleDifference < 0;
};

const _isLineAngleTooSharp = (frontierPoints, pointI) => {
  //Get adjacent points.
  const prevPoint = (pointI === 0) ? null : frontierPoints[pointI-1];
  const nextPoint = (pointI === frontierPoints - 1) ? null : frontierPoints[pointI+1];

  //If point is at either end of line then there is no angle to measure.
  if (!prevPoint || !nextPoint) { return false; }

  const point = frontierPoints[pointI];
  const prevToPointAngle = calcAngleBetweenPoints({x1:prevPoint.x, y1:prevPoint.y, x2:point.x, y2:point.y});
  const pointToNextAngle = calcAngleBetweenPoints({x1:point.x, y1:point.y, x2:nextPoint.x, y2:nextPoint.y});
  const angleDifference = calcAngleDifference(prevToPointAngle, pointToNextAngle);

  const TOO_SHARP = 20;
  if (angleDifference > TOO_SHARP) {
    console.log('  Point #' + pointI + ' is too sharp! ' + angleDifference);
  }
  return (angleDifference > TOO_SHARP);
}

const _splitLineByOmittedPoints = ({line, omitPointIndexes}) => {
  let lines = [], start, wasInLine = false;
  for (let i=0; i < line.length; i += 2) {
    const isInLine = (omitPointIndexes.indexOf(i/2) === -1);
    if (isInLine) {
      if (!wasInLine) {
        start = i;
      }
    } else {
      if (wasInLine) {
        lines.push( line.slice(start, i) );
      }
    }
    wasInLine = isInLine;
  }
  if (wasInLine) {
    lines.push( line.slice(start) );
  }
  return lines;
};

const _calcNextHatchLine = ({frontierPoints, strokeWidth, boundingRect, density, densityZones}) => {
  let line = [], omitPointIndexes = [];
  for (let pointI = 0; pointI < frontierPoints.length; ++pointI) {
    //XXX--handling for density of 0.
    let willOmitPoint = false;
    const point = frontierPoints[pointI];
    if (_isLineAngleTooSharp(frontierPoints, pointI)) {
      //If the two-sharp angle is convex in the direction of hatching, then omit this point from the
      //current hatch line (split hatch line) so that next hatch line can be drawn straighter.
      //If the angle is concave, omitting the point just makes the next hatch line less straight.
      willOmitPoint = _isFrontierPointConvex(frontierPoints, pointI);
    }

    if (willOmitPoint) {  //Omit the point (split hatch line)
      omitPointIndexes.push(pointI);
      line.push(point.x);
      line.push(point.y);
    } else {
      const lineSpacing = strokeWidth / point.density;
      const a = degreesToRadians(point.angle);
      line.push(point.x + (Math.cos(a) * lineSpacing));
      line.push(point.y + (Math.sin(a) * lineSpacing));
    }
  }
  line = _fixLineEndPoints({line, boundingRect});
  if (line.length === 0) { return { nextFrontierPoints: null }; }
  const nextFrontierPoints = _calcFrontierPointsFromLine({line, density, densityZones});
  return {
    lines: _splitLineByOmittedPoints({line, omitPointIndexes}),
    nextFrontierPoints
  };
};

const _hatchFromFrontierSvg = ({frontierPoints, strokeAttributes, width, height,
    strokeWidth, density, densityZones, maxLines}) => {
  const boundingRect = _getBoundingRectPoly(width, height);
  let svg = '', f = frontierPoints, lineCount = 0;
  while (true) {
    const { lines, nextFrontierPoints } = _calcNextHatchLine({frontierPoints:f, strokeWidth, boundingRect, density, densityZones});
    if (!nextFrontierPoints) { return svg; }
    svg += _polylinesSvg({strokeAttributes, lines});
    svg += _frontierNormalsSvg({frontierPoints: nextFrontierPoints});
    if (++lineCount === maxLines) {
      //debugger; //XXX
    } else if (lineCount > maxLines) {
      return svg;
    }
    console.log('line#' + lineCount);
    f = nextFrontierPoints;
  }
};

const _hatchSvgWithDensityZones = ({width, height, drawStyle}) => {
  const {hatchAngle, density, densityZones, strokeWidth} = drawStyle;

  const strokeAttributes = _getStrokeAttributesFromDrawStyle(drawStyle);
  const seedLine = _calcSeedLine({width, height, hatchAngle, randomSeed:1});

  let ret = '';
  ret += _polylineSvg({strokeAttributes, line:seedLine});

  const frontierPoints = _calcFrontierPointsFromLine({line:seedLine, density, densityZones});
  ret += _hatchFromFrontierSvg({frontierPoints, strokeAttributes, width, height, strokeWidth, density, densityZones,
    maxLines: 33});
  ret += _hatchFromFrontierSvg({frontierPoints: _flipFrontierPoints(frontierPoints), strokeAttributes, width, height,
    strokeWidth, density, densityZones, maxLines: 33});

  return ret;
};

const _borderSvg = ({width, height, drawStyle}) => {
  const strokeAttributes = _getStrokeAttributesFromDrawStyle(drawStyle);
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
