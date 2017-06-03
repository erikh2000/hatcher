import {
  bbox,
  inside,
  lineString as turfLineString,
  point as turfPoint,
  polygon as turfPolygon
} from '@turf/turf';
import 'seedrandom'; // Overrides Math.random() and adds Math.seedrandom().
import { cloneDeep } from 'lodash';
import {
  addPointToLineStringEnd,
  addPointToLineStringStart,
  arePointsEqual,
  differenceMulti,
  getInBoundsSegments,
  getLineStringEndPoint,
  getLineStringStartPoint,
  pointX,
  pointY,
  toPolyK
} from './turf-util.js';
import { polygonSlice } from './turf-slice.js';
import { findClosestPointOnPoly } from './polyk-util.js';

import {
  degreesToRadians,
} from './geometry';
import DensityMap from './density-map';
import Drawset from './drawset';
import { createSvgFromDrawsets } from './svg';

// Private

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

const _calcWorkAreasFromSeedLine = ({width, height, strokeWidth, seedLine, densityMap}) => {
  //Create "bleed" rectangle that extends OOB by a margin.
  const bleedRect = _getBoundingRectWithMarginPoly({width, height, margin:BLEED_MARGIN});

  //Slice the bleed rectangle into two work areas using the seed line to indicate where to slice.
  const workAreaFeatureCollection = polygonSlice(bleedRect, seedLine);

  return workAreaFeatureCollection.features;
};

const _drawWorkAreaPerimeter = ({workArea, boundingRect, drawset}) => {
  const inboundSegments = getInBoundsSegments({polygon:workArea, boundingRect});
  inboundSegments.forEach(segment => drawset.addLine(segment));
};

const _calcSpacedCoord = ({point, angle, spacing}) => {
  const a = degreesToRadians(angle);
  const x = pointX(point) + (Math.cos(a) * spacing);
  const y = pointY(point) + (Math.sin(a) * spacing);
  return [x,y];
};

const _calcWhittlePolygonForSegment = ({segment, strokeWidth, densityMap}) => {
  const startPoint = getLineStringStartPoint(segment);
  const startPointAngle = segment.properties.a1;
  const startDensity = densityMap.getDensityAt(pointX(startPoint), pointY(startPoint));
  const startPointSpacing = strokeWidth / startDensity;

  const endPoint = getLineStringEndPoint(segment);
  const endPointAngle = segment.properties.a2;
  const endDensity = densityMap.getDensityAt(pointX(endPoint), pointY(endPoint));
  const endPointSpacing = strokeWidth / endDensity;

  const whittleCoords = [startPoint.geometry.coordinates, endPoint.geometry.coordinates];
  whittleCoords.push( _calcSpacedCoord({point:endPoint, angle:endPointAngle, spacing:endPointSpacing}) );
  whittleCoords.push( _calcSpacedCoord({point:startPoint, angle:startPointAngle, spacing:startPointSpacing}) );
  whittleCoords.push( startPoint.geometry.coordinates );

  return turfPolygon([whittleCoords]);
};

const _whittleWorkArea = ({workArea, boundingRect, strokeWidth, densityMap}) => {
  const whittlePolygons = [];
  const inboundSegments = getInBoundsSegments({polygon:workArea, boundingRect, calcPointNormals:true});
  inboundSegments.forEach(segment => {
    whittlePolygons.push( _calcWhittlePolygonForSegment({segment, strokeWidth, densityMap}) );
  });
  return differenceMulti({sourcePolygon:workArea, subtractPolygons:whittlePolygons});
};

const _drawHatchLinesInWorkArea = ({workArea, boundingRect, drawset, densityMap}) => {
  const newWorkAreas = _whittleWorkArea({workArea, boundingRect, strokeWidth: drawset.strokeWidth, densityMap});
  newWorkAreas.forEach(newWorkArea => _drawWorkAreaPerimeter({workArea:newWorkArea, boundingRect, drawset}));
  return newWorkAreas;
};

// Exports

export const createHatchSvg = ({width, height, drawStyle, maxIterations = 40}) => {
  const { density, densityZones, hatchAngle, opacity, stroke, strokeWidth} = drawStyle;
  const drawset = new Drawset({width, height, stroke, strokeWidth, opacity});
  const debugDrawset = Drawset.createDebugDrawset({width, height});
  const densityMap = new DensityMap({defaultDensity:density, densityZones});

  if (drawStyle.drawBorder) {
    _drawBorder(drawset);
  }

  const seedLine = _calcSeedLine({width, height, hatchAngle, randomSeed:2});
  drawset.addLine(seedLine);

  let workAreas = _calcWorkAreasFromSeedLine({width, height, strokeWidth, seedLine, densityMap});

  const boundingRect = _getBoundingRectPoly(width, height);
  let iteration = 0;
  do {
    const nextWorkAreas = [];
    workAreas.forEach(workArea => {
      const workAreasAfterHatch = _drawHatchLinesInWorkArea({workArea, boundingRect, drawset, densityMap});
      nextWorkAreas.push(...workAreasAfterHatch);
    });
    workAreas = nextWorkAreas;
  } while ( workAreas.length && ++iteration !== maxIterations);

  return createSvgFromDrawsets([drawset, debugDrawset]);
};
