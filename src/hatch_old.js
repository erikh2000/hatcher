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

const _calcSeedLine = ({width, height, hatchAngle, segmentLength = 20, roughness = 0, randomSeed}) => {
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
    point.nextX = point.x +
    ret.push(point);
  }
  return ret;
};

const _getLineSpacingAverageFromPointNeighbors = ({strokeWidth, frontierPoints, pointI}) => {
  const prevLineSpacing = (pointI > 0) ? strokeWidth / frontierPoints[pointI-1].density : null;
  const nextLineSpacing = (pointI < frontierPoints.length - 1) ? strokeWidth / frontierPoints[pointI+1].density : null;
  if (prevLineSpacing === null) { return nextLineSpacing === null ? 0 : nextLineSpacing; }
  if (nextLineSpacing === null) { return prevLineSpacing; }
  return (prevLineSpacing + nextLineSpacing) / 2;
};

const _updateFrontierPointsWithNextXY = ({frontierPoints, strokeWidth}) => {
  for (let pointI = 0; pointI < frontierPoints.length; ++pointI) {
    const point = frontierPoints[pointI];
    let lineSpacing;
    if (point.density === 0) { // Line won't be drawn at this point, but frontier point should advance based on spacing of neighbors.
      lineSpacing = _getLineSpacingAverageFromPointNeighbors({strokeWidth, frontierPoints, pointI});
      point.willOmitNext = true;
    } else {
      lineSpacing = strokeWidth / point.density;
      point.willOmitNext = false;
    }
    const a = degreesToRadians(point.angle);
    point.nextX = point.x + (Math.cos(a) * lineSpacing);
    point.nextY = point.y + (Math.sin(a) * lineSpacing);
  }
};

const _calcNextFrontierPoints = ({frontierPoints, density, densityZones}) =>{
  const nextFrontierPoints = [];

  for(let i=0; i<frontierPoints.length; ++i) {
    const fromPoint = frontierPoints[i];
    if (fromPoint.willDeleteNext) { continue; }

    const a1 = (i > 0) ? calcAngleBetweenPoints(
      {x1:frontierPoints[i-1].nextX, y1:frontierPoints[i-1].nextY, x2:fromPoint.nextX, y2:fromPoint.nextY}) : null;
    const a2 = (i + 1 < frontierPoints.length) ? calcAngleBetweenPoints(
      {x1:fromPoint.nextX, y1:fromPoint.nextY, x2:frontierPoints[i+1].nextX, y2:frontierPoints[i+1].nextY}) : null;
    const newPoint = {
      x:fromPoint.nextX,
      y:fromPoint.nextY,
      angle: normalizeAngle(calcAverageAngle(a1,a2) + 90),
      density: getDensityAtPoint({x:fromPoint.nextX, y:fromPoint.nextY, defaultDensity:density, densityZones}),
    };
    nextFrontierPoints.push(newPoint);
  }
  return nextFrontierPoints;
};

const _calcNextFrontierPointsFromLine = ({line, density, densityZones, strokeWidth}) => {
  const frontierPoints = _calcFrontierPointsFromLine({line, density, densityZones});
  _updateFrontierPointsWithNextXY({frontierPoints, strokeWidth});
  return _calcNextFrontierPoints({frontierPoints, density, densityZones});
};

const _flipFrontierPoints = (frontierPoints) => {
  return frontierPoints.map( (point) => { return { x: point.x, y: point.y, angle: normalizeAngle(point.angle + 180) } } );
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

const _frontierNormalsSvg = ({strokeAttributes = DEBUG_STROKE_ATTRIBUTES, normalLength = 5, frontierPoints}) => {
  let svg = '';
  frontierPoints.forEach( (point, i) => {
    const a = degreesToRadians(point.angle);
    const toX = point.x + (Math.cos(a)*normalLength);
    const toY = point.y + (Math.sin(a)*normalLength);
    if (_isFrontierPointConvex(frontierPoints, i)) {
      svg += _circleSvg({ strokeAttributes, cx:toX, cy:toY, r:1});
    } else {
      svg += _polylineSvg({ strokeAttributes, line:[point.x, point.y, toX, toY] });
    }
  });
  return svg;
};

const _frontierNextSvg = ({strokeAttributes = DEBUG_STROKE_ATTRIBUTES, frontierPoints}) => {
  let svg = '';
  frontierPoints.forEach( point => {
    if (point.willOmitNext) {
      svg += _circleSvg({ strokeAttributes, cx:point.nextX, cy:point.nextY, r:1});
    } else {
      svg += _polylineSvg({ strokeAttributes, line:[point.x, point.y, point.nextX, point.nextY] });
    }
  });
  return svg;
};

const _linePointsSvg = ({strokeAttributes = DEBUG_STROKE_ATTRIBUTES, lines}) => {
  let svg='';
  lines.forEach((line) => {
    for (let i = 0; i < line.length; i += 2) {
      svg += _circleSvg({strokeAttributes, cx:line[i], cy:line[i+1], r:2});
    }
  });
  return svg;
}

const _getDxDyForFrontierNextSegment = ({frontierPoints, point1i, point2i}) => {
  const point1 = frontierPoints[point1i], point2 = frontierPoints[point2i];
  return (point1 && point2) ?
    { dx: point2.nextX - point1.nextX, dy: point2.nextY - point1.nextY } :
    { dx: undefined, dy: undefined };
};

/* Add or subtract points on ends of line so that there is always one and only point that extends past the
   bounding rect.

   @return True if frontier can generate more in-bound points on future calls, false if not. (Frontier entirely out of bounds)
*/
const _updateFrontierNextPointsToFitBoundingRect = ({frontierPoints, boundingRect}) => {
  //Find first point that is not OOB.
  let first;
  for (first = 0; first < frontierPoints.length; ++first) {
    if (containsPoint(boundingRect, frontierPoints[first].nextX, frontierPoints[first].nextY)) { break; }
  }
  if (first === frontierPoints.length) { return false; } //All points are OOB.

  //Find last point that is not OOB.
  let last;
  for (last = frontierPoints.length - 1; last > first; --last) {
    if (containsPoint(boundingRect, frontierPoints[last].nextX, frontierPoints[last].nextY)) { break; }
  }

  //If last in-bound point is at end of line, add point to end to have a "one past" point.
  if (last === frontierPoints.length - 1) {
    const fromPoint = frontierPoints[last];
    const {dx, dy} = _getDxDyForFrontierNextSegment({frontierPoints, point1i: last-1, point2i: last});  //TODO--need different calc that will reliably extend OOB
    if (!isNaN(dx)) {
      const extraEndPoint = { density:fromPoint, angle:null, x:null, y:null };
      extraEndPoint.nextX = fromPoint.nextX + dx;
      extraEndPoint.nextY = fromPoint.nextY + dy;
      frontierPoints.push(extraEndPoint);
    }
  }

  //If first in-bound point is at start of line, add point to start to have a "one past" point.
  if (first === 0) {
    const fromPoint = frontierPoints[first];
    const {dx, dy} = _getDxDyForFrontierNextSegment({frontierPoints, point1i: first+1, point2i: first}); //TODO--need different calc that will reliably extend OOB
    if (!isNaN(dx)) {
      const extraStartPoint = { density:fromPoint, angle:null, x:null, y:null };
      extraStartPoint.nextX = fromPoint.nextX + dx;
      extraStartPoint.nextY = fromPoint.nextY + dy;
      frontierPoints.unshift(extraStartPoint);
    }
  }

  //Enlarge range to include "one past" points.
  ++last;
  --first;

  //Mark points for deletion in next frontier.
  for (let i = 0; i < first; ++i) { frontierPoints[i].willDeleteNext = true; }
  for (let i = last + 1; i < frontierPoints.length; ++i) { frontierPoints[i].willDeleteNext = true; }

  return true;
};

const _isNextAngleTooSharp = (frontierPoints, pointI) => {
  //Get adjacent points.
  const prevPoint = (pointI === 0) ? null : frontierPoints[pointI-1];
  const nextPoint = (pointI === frontierPoints - 1) ? null : frontierPoints[pointI+1];

  //If point is at either end of line then there is no angle to measure.
  if (!prevPoint || !nextPoint) { return false; }

  const point = frontierPoints[pointI];
  const prevToPointAngle = calcAngleBetweenPoints({x1:prevPoint.nextX, y1:prevPoint.nextY, x2:point.nextX, y2:point.nextY});
  const pointToNextAngle = calcAngleBetweenPoints({x1:point.nextX, y1:point.nextY, x2:nextPoint.nextX, y2:nextPoint.nextY});
  const angleDifference = calcAngleDifference(prevToPointAngle, pointToNextAngle);

  const TOO_SHARP = 20;
  if (angleDifference > TOO_SHARP) {
    console.log('  Point #' + pointI + ' of ' + frontierPoints.length + ' is too sharp! ' + angleDifference);
  }
  return (angleDifference > TOO_SHARP);
};

const _omitLonePoints = (frontierPoints) => {
  const pointCount = frontierPoints.length;
  let newlyOmittedCount = 0;

  for (let i = 0; i < pointCount; ++i) {
    if (frontierPoints[i].willOmitNext) { continue; }//This point already omitted.

    const prevOmitted = (i === 0) || frontierPoints[i-1].willOmitNext;
    const nextOmitted = (i === pointCount-1) || frontierPoints[i+1].willOmitNext;

    if (prevOmitted && nextOmitted) {
      console.log('  omitted lone point #' + i + ' of ' + pointCount);
      frontierPoints[i].willOmitNext = true;
      ++newlyOmittedCount;
    }
  }

  return newlyOmittedCount;
};

const _getLinesFromFrontierNext = (frontierPoints) => { // XXX what is this function doing?
  const lines = [];
  let line = [], wasInLine = false;
  frontierPoints.forEach( (point) => {
    const isInLine = !point.willOmitNext;
    if (isInLine) {
      line.push(point.nextX); // point.x WAS
      line.push(point.nextY); // point.y  WAS
    } else {
      if (wasInLine) {
        lines.push(line);
        line = [];
      }
    }
    wasInLine = isInLine;
  });
  if (line.length) { lines.push(line); }
  return lines;
};

const _omitTooSharpPoints = (frontierPoints) => {
  for (let pointI = 0; pointI < frontierPoints.length; ++pointI) {
    const point = frontierPoints[pointI];
    if (!point.willOmitNext && _isNextAngleTooSharp(frontierPoints, pointI)) {
      //If the two-sharp angle is convex in the direction of hatching, then omit this point from the
      //current hatch line (split hatch line) so that next hatch line can be drawn straighter.
      //If the angle is concave, omitting the point just makes the next hatch line less straight.
      if (_isFrontierPointConvex(frontierPoints, pointI)) {
        point.willOmitNext = true;
        point.nextX = point.x;
        point.nextY = point.y;
      }
    }
  }
};

const _calcNextHatchLine = ({frontierPoints, strokeWidth, boundingRect, density, densityZones}) => {
  //Update frontier points to include tentative next line points.
  _updateFrontierPointsWithNextXY({frontierPoints, strokeWidth});

  //Add/subtract points at ends of next line to go one past bounding rect.
  const willContinue = _updateFrontierNextPointsToFitBoundingRect({frontierPoints, boundingRect});

  //Find frontier points that create too-sharp angles.
  while (true) {
    _omitTooSharpPoints(frontierPoints);
    if (_omitLonePoints(frontierPoints) === 0) { break; }
  }

  const nextFrontierPoints = willContinue ? _calcNextFrontierPoints({frontierPoints, density, densityZones}) : null;
  return {
    lines: _getLinesFromFrontierNext(frontierPoints),
    nextFrontierPoints
  };
};

const _hatchFromFrontierSvg = ({frontierPoints, strokeAttributes, width, height,
    strokeWidth, density, densityZones, maxLines}) => {
  const boundingRect = _getBoundingRectPoly(width, height);
  let svg = '', f = frontierPoints, lineCount = 0;
  while (true) {
    ++lineCount;
    console.log('line#' + lineCount);
    if (lineCount === maxLines - 1) {
      //debugger;
    }
    const { lines, nextFrontierPoints } = _calcNextHatchLine({frontierPoints:f, strokeWidth, boundingRect, density, densityZones});
    svg += _polylinesSvg({strokeAttributes, lines});
    svg += _frontierNextSvg({frontierPoints: f});

    if (lineCount === maxLines || !nextFrontierPoints) { return svg; }

    f = nextFrontierPoints;
  }
};

const _hatchSvgWithDensityZones = ({width, height, drawStyle}) => {
  const {hatchAngle, density, densityZones, strokeWidth} = drawStyle;

  const strokeAttributes = _getStrokeAttributesFromDrawStyle(drawStyle);
  const seedLine = _calcSeedLine({width, height, hatchAngle, randomSeed:1});

  let svg = '';
  svg += _polylineSvg({strokeAttributes, line:seedLine});

  const frontierPoints = _calcNextFrontierPointsFromLine({line:seedLine, density, densityZones, strokeWidth});
  svg += _hatchFromFrontierSvg({frontierPoints, strokeAttributes, width, height, strokeWidth, density, densityZones,
    maxLines: 20});
  //ret += _hatchFromFrontierSvg({frontierPoints: _flipFrontierPoints(frontierPoints), strokeAttributes, width, height,
    //strokeWidth, density, densityZones, maxLines: 1});

  return svg;
};

const _borderSvg = ({width, height, drawStyle}) => {
  const strokeAttributes = _getStrokeAttributesFromDrawStyle(drawStyle);
  return `<polyline fill='none' ${strokeAttributes} ` +
    `points='1,1 ${width},1 ${width},${height} 1,${height} 1,1'/>`;
};

export const createHatchSvg = ({width, height, drawStyle}) => {
  let svg = `<svg className='hatcher-svg' xmlns='http://www.w3.org/2000/svg' ` +
    `opacity='${drawStyle.opacity}' width='${width}' height='${height}'>`;

  if (drawStyle.densityZones) {
    svg += _hatchSvgWithDensityZones({width, height, drawStyle});
  } else {
    svg += _hatchSvg({width, height, drawStyle});
  }

  if (drawStyle.drawBorder) {
    svg += _borderSvg({width, height, drawStyle});
  }

  svg += `</svg>`;

  return svg;
};
