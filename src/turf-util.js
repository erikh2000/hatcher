import { get } from 'lodash';
import { point, lineString as turfLineString } from '@turf/turf';

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
