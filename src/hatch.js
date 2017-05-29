import { bbox, inside, lineString as turfLineString, point as turfPoint, polygon as turfPolygon } from '@turf/turf';
import 'seedrandom'; // Overrides Math.random() and adds Math.seedrandom().
import { cloneDeep } from 'lodash';
import {
  addPointToLineStringEnd,
  addPointToLineStringStart,
  arePointsEqual,
  getLineStringEndPoint,
  getLineStringStartPoint,
  pointX,
  pointY,
  reverseLineString,
  toPolyK
} from './turf-util.js';
import { findClosestPointOnPoly, slicePolygon, toTurfPolygon } from './polyk-util.js';

import {
  degreesToRadians,
} from './geometry';
import DensityMap from './density-map';
import Drawset from './drawset';
import { createSvgFromDrawsets } from './svg';

const MAX_STROKE_WIDTH = 100;
const SEED_LINE_MAX_SEGMENT_LENGTH = 1000;
const BLEED_MARGIN = Math.max(MAX_STROKE_WIDTH, SEED_LINE_MAX_SEGMENT_LENGTH);

const _getBoundingRectPoly = (width, height) => {
  return turfPolygon([[ [0,0], [width,0], [width,height], [0,height], [0,0] ]]);
};

const _getBoundingRectWithMarginPoly = ({width, height, margin}) => {
  const t = -margin, b = height+margin, l = -margin, r = width+margin;
  return turfPolygon([[ [l,t], [r,t], [r,b], [l,b], [l,t] ]]);
};

const _findClosestPointOnPoly = ({polygon, point}) => {
  const polyKPoly = toPolyK(polygon);
  const {x,y} = findClosestPointOnPoly(polyKPoly, pointX(point), pointY(point));
  return turfPoint([x,y]);
};

const _calcSeedLine = ({width, height, hatchAngle, segmentLength = 20, roughness = .5, randomSeed}) => {
  if (roughness > 1) { roughness = 1; }
  else if (roughness < 0) { roughness = 0; }
  if (segmentLength > SEED_LINE_MAX_SEGMENT_LENGTH) { segmentLength = SEED_LINE_MAX_SEGMENT_LENGTH; }

  const centerX = width / 2, centerY = height / 2;
  const lineCoordinates = [[centerX, centerY]];
  const boundingRect = _getBoundingRectPoly(width, height);
  const angleVariance = roughness * 50;

  if (randomSeed !== undefined) { Math.seedrandom(randomSeed); } // Use a random seed to get consistent random seed line.

  //Travel from center point in one direction, adding points to line, until after an added point is OOB.
  let x = centerX, y = centerY;
  let travelAngle = hatchAngle;
  while (inside(turfPoint([x, y]), boundingRect)) {
    travelAngle += ((Math.random() * angleVariance) - (angleVariance / 2));
    let a = degreesToRadians(travelAngle);
    x += (Math.cos(a) * segmentLength);
    y += (Math.sin(a) * segmentLength);
    lineCoordinates.push([x,y]);
  }

  //Do same thing, but travel in opposite direction.
  x = centerX;
  y = centerY;
  travelAngle = hatchAngle;
  while (inside(turfPoint([x,y]), boundingRect)) {
    travelAngle += ((Math.random() * angleVariance) - (angleVariance / 2));
    let a = degreesToRadians(travelAngle);
    x -= (Math.cos(a) * segmentLength);
    y -= (Math.sin(a) * segmentLength);
    lineCoordinates.unshift([x,y]);
  }

  return turfLineString(lineCoordinates);
};

const _drawBorder = (drawset) => {
  const m = Math.floor(drawset.strokeWidth / 2); //Margin to keep inside of to show entire width of stroke.
  const t = m, l = m, b = drawset.height - m, r = drawset.width - m;
  drawset.addLine(turfLineString([[l,t], [r,t], [r,b], [l,b], [l,t]]));
};

const _getRectBorderLineString = (rect) => {
  let [l,t,r,b] = bbox(rect);
  return turfLineString([ [l,t], [r,t], [r,b], [l,b], [l,t] ]);
};

const _extendSeedLineToFitRect = ({line, rectPoly}) => {
  const extendedLine = cloneDeep(line);

  //Extend start of seed line to intersect with rectPoly.
  const startPoint = getLineStringStartPoint(line);
  const newStartPoint = _findClosestPointOnPoly({polygon:rectPoly, point:startPoint});
  if (!arePointsEqual(startPoint, newStartPoint)) {
    addPointToLineStringStart({lineString:extendedLine, point:newStartPoint});
  }

  //Extend end of seed line to intersect with rectPoly.
  const endPoint = getLineStringEndPoint(line);
  const newEndPoint = _findClosestPointOnPoly({polygon:rectPoly, point:endPoint});
  if (!arePointsEqual(endPoint, newEndPoint)) {
    addPointToLineStringEnd({lineString:extendedLine, point:newEndPoint});
  }

  return extendedLine;
};

const _splitRectWithLineString = ({rect, sliceLine, replaceLine}) => {
  //Seed line has following assumptions:
  // 1. Its endpoints intersect with perimeter of rect.
  // 2. All of its other points are inside of the rect.
  // 3. Its endpoints are on two separate segments of the rect.
  //XXX need seed line calculation function to guarantee #2 and #3.
  //With those assumptions, the seed line will always divide the rect into two polygons.

  const polyKPolygons = slicePolygon(toPolyK(rect), toPolyK(sliceLine), toPolyK(replaceLine));

  return polyKPolygons.map(polyKPolygon => toTurfPolygon(polyKPolygon));
};

function _isPointOnLine({x, y, endx, endy, px, py}) {
    var f = function(somex) { return (endy - y) / (endx - x) * (somex - x) + y; };
    return Math.abs(f(px) - py) < 1e-6 // tolerance, rounding errors
        && px >= x && px <= endx;      // are they also on this segment?
};

const _sliceRect = (rectPolygon, sliceLineString) => {
  const startPoint = getLineStringStartPoint(sliceLineString);
  const endPoint = getLineStringEndPoint(sliceLineString);
  const sliceCoords = [];
  const rectCoords = rectPolygon.geometry.coordinates[0];

  /*
  algorithm something like...

  for each segment of rectPolygon...
    if startPoint is on segment...
      push segment truncated to startPoint to sliceCoords
      push sliceLineString to sliceCoords
      exit loop
    else
      push segment to sliceCoords

  for each segment of rectPolygon starting from startPoint segment and looping around...
    if endPoint is on segment...
      push segment truncated at beginning to endPoint to sliceCoords
    else
      push segment to sliceCoords
  */
};

const _calcWorkAreasFromSeedLine = ({width, height, strokeWidth, seedLine, densityMap}) => {

  //Create "bleed" rectangle that extends OOB by a margin.
  const bleedRect = _getBoundingRectWithMarginPoly({width, height, margin:BLEED_MARGIN});

  //Extend seed line ends to reach past perimeter of bleed rect to make the slice line.
  const sliceLine = _extendSeedLineToFitRect({line:seedLine, rectPoly:bleedRect});

  const workAreas = [];
  workAreas.push(_sliceRect(bleedRect, sliceLine));
  workAreas.push(_sliceRect(bleedRect, reverseLineString(sliceLine)));

  return workAreas;
};

const _drawHatchLinesInWorkArea = ({workArea, drawset, densityMap}) => {

  return {newWorkAreas:[], isWorkComplete:true}; // XXX
};

export const createHatchSvg = ({width, height, drawStyle}) => {
  const { density, densityZones, hatchAngle, opacity, stroke, strokeWidth} = drawStyle;
  const drawset = new Drawset({width, height, stroke, strokeWidth, opacity});
  const debugDrawset = Drawset.createDebugDrawset({width, height});
  const densityMap = new DensityMap({defaultDensity:density, densityZones});

  if (drawStyle.drawBorder) {
    _drawBorder(drawset);
  }

  const seedLine = _calcSeedLine({width, height, hatchAngle, randomSeed:1});
  drawset.addLine(seedLine);

  let workAreas = _calcWorkAreasFromSeedLine({width, height, strokeWidth, seedLine, densityMap});

  do {
    const nextWorkAreas = [];
    workAreas.forEach(workArea => {
      const { newWorkAreas, isWorkComplete } = _drawHatchLinesInWorkArea({workArea, drawset, densityMap});
      nextWorkAreas.push(...newWorkAreas);
      if (!isWorkComplete) {
        nextWorkAreas.push(workArea);
      }
    });
    workAreas = nextWorkAreas;
  } while ( workAreas.length );

  return createSvgFromDrawsets([drawset, debugDrawset]);
};
