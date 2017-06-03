import { get } from 'lodash';
import { bbox, difference, point, lineString as turfLineString, polygon as turfPolygon, unkinkPolygon } from '@turf/turf';

import { calcAngleBetweenPoints, calcAverageAngle } from './geometry';

// Private

const _toPolyKPoly = (polygonFeature) => {
  const polyKPoly = [];
  const linearRingCount = polygonFeature.geometry.coordinates.length;
  if (linearRingCount > 1) { console.warn('Polygon holes not supported by _toPolyKPoly.'); }
  const outerCoords = polygonFeature.geometry.coordinates[0];
  const lastIndex = outerCoords.length - 1;
  outerCoords.forEach((coord, i) => {
    if (i < lastIndex) {
      polyKPoly.push(coord[0]);
      polyKPoly.push(coord[1]);
    }
  });
  return polyKPoly;
};

const _toPolyKLine = (lineStringFeature) => {
  const polyKLine = [];
  lineStringFeature.geometry.coordinates.forEach(coord => {
    polyKLine.push(coord[0]);
    polyKLine.push(coord[1]);
  });
  return polyKLine;
};

const _areCoordsInBbox = (coords, bb) =>
  coords[0] >= bb[0] && coords[1] >= bb[1] && coords[0] <= bb[2] && coords[1] <= bb[3];

const _multiPolygonToPolygonArray = (polyOrMulti) => {
  if (polyOrMulti.geometry.type === 'Polygon') {
    return [polyOrMulti];
  } else {
    return polyOrMulti.geometry.coordinates.map( polyCoords => turfPolygon(polyCoords) );
  }
};

const _wrapCoords = (coords, index) => {
  let i = index;
  if (i < 0) {i += coords.length;}
  if (i >= coords.length) {i -= coords.length;}
  return coords[i];
};

const _calcPointNormalAngle = (c1, c2, c3) => {
  const a1 = calcAngleBetweenPoints({x1:c1[0], y1:c1[1], x2:c2[0], y2:c2[1]});
  const a2 = calcAngleBetweenPoints({x1:c2[0], y1:c2[1], x2:c3[0], y2:c3[1]});
  const a = calcAverageAngle(a1, a2);
  return a - 90;
};

export const _difference = (p1, p2) => {
  try {
    return difference(p1, p2);
  } catch (e) {
    console.warn(e);
    return p1;
    //const unkinked1 = unkinkPolygon(p1), unkinked2 = unkinkPolygon(p2);
    //return difference(unkinked1, unkinked2);
  }
};

// Exports

export const reverseLineString = (lineString) => {
  return turfLineString(lineString.geometry.coordinates.reverse());
};

export const toPolyK = (feature) => {
  switch (feature.geometry.type) {
    case 'Polygon':     return _toPolyKPoly(feature);
    case 'LineString':  return _toPolyKLine(feature);
    default:
      console.error('Unsupported feature type - ' + feature.type);
    return null;
  }
};

export const pointX = (point) => get(point, 'geometry.coordinates[0]');

export const pointY = (point) => get(point, 'geometry.coordinates[1]');

export const arePointsEqual = (point1, point2) =>
  get(point1, 'geometry.coordinates[0]')===get(point2, 'geometry.coordinates[0]') &&
  get(point1, 'geometry.coordinates[1]')===get(point2, 'geometry.coordinates[1]');

export const addPointToLineStringStart = ({lineString, point}) => {
  lineString.geometry.coordinates.unshift( point.geometry.coordinates );
};

export const addPointToLineStringEnd = ({lineString, point}) => {
  lineString.geometry.coordinates.push( point.geometry.coordinates );
};

export const getLineStringStartPoint = (lineString) => {
  const coords = get(lineString, 'geometry.coordinates');
  return (get(coords, 'length', 0) > 0) ? point(coords[0]) : null;
};

export const getLineStringEndPoint = (lineString) => {
  const coords = get(lineString, 'geometry.coordinates');
  return (get(coords, 'length', 0) > 0) ? point(coords[coords.length-1]) : null;
};

export const getInBoundsSegments = ({polygon, boundingRect, calcPointNormals=false}) => {
  const segments = [];
  const coords = polygon.geometry.coordinates[0]; //Ignoring holes.
  const bb = bbox(boundingRect);
  for (let i = 0; i < coords.length-1; ++i) {
    if (_areCoordsInBbox(coords[i],bb) || _areCoordsInBbox(coords[i+1],bb)) {
      const newSegment = turfLineString([coords[i], coords[i+1]]);
      if (calcPointNormals) {
        const c1 = _wrapCoords(coords, i-1), c2 = coords[i], c3 = coords[i+1], c4 = _wrapCoords(coords, i+2);
        newSegment.properties.a1 = _calcPointNormalAngle(c1, c2, c3);
        newSegment.properties.a2 = _calcPointNormalAngle(c2, c3, c4);
      }
      segments.push(newSegment);
    }
  }
  return segments;
};

export const differenceMulti = ({sourcePolygon, subtractPolygons}) => {
  let remainingPolygons = [sourcePolygon];
  subtractPolygons.forEach( subtractPolygon => {
    let nextRemainingPolygons = [];
    remainingPolygons.forEach(remainingPolygon => {
      const diff = _difference(remainingPolygon, subtractPolygon);
      const diffPolygons = _multiPolygonToPolygonArray(diff);
      nextRemainingPolygons = nextRemainingPolygons.concat(diffPolygons);
    });
    remainingPolygons = nextRemainingPolygons;
  });
  return remainingPolygons;
};
