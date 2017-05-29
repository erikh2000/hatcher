import {
  ContainsPoint as containsPoint,
  ClosestEdge as closestEdge,
  Slice as slice
} from 'polyk';
import { polygon as turfPolygon } from '@turf/turf';

// Private

const _reverseCoords = (coords) => {
  const ret = [];
  for (let i = coords.length - 2; i >= 0; i -= 2) {
    ret.push(coords[i]);
    ret.push(coords[i+1]);
  }
  return ret;
};

const _getFirstLinePoint = (line) => line.length >= 2 ? {x:line[0], y:line[1]} : null;

const _getLastLinePoint = (line) => line.length >= 2 ? {x:line[line.length-2], y:line[line.length-1]} : null;

const _arePointsEqual = (p1,p2) => p1 && p2 && p1.x === p2.x && p1.y === p2.y;

const _insertCoords = ({coords, insertAfter, insertCoords}) => {
  let newCoords = coords.slice(0, insertAfter);
  newCoords.push(...insertCoords);
  return newCoords.concat(coords.slice(insertAfter));
};

const _replacePolygonSegmentWithLine = (polygon, line) => {
  const startPoint = _getFirstLinePoint(line);
  const endPoint = _getLastLinePoint(line);
  const insertCoords = line.slice(2, -2);

  for (let i=0; i<polygon.length; i+=2) {
    const point1 = {x:polygon[i], y:polygon[i+1]};
    const point2 = (i+2 >= polygon.length) ? {x:polygon[0], y:polygon[1]} : {x:polygon[i+2], y:polygon[i+3]};
    if (_arePointsEqual(point1,startPoint) && _arePointsEqual(point2,endPoint)) {
      return _insertCoords({coords:polygon, insertAfter:i+2, insertCoords});
    } else if (_arePointsEqual(point1,endPoint) && _arePointsEqual(point2,startPoint)) {
      const reversedCoords = _reverseCoords(insertCoords);
      return _insertCoords({coords:polygon, insertAfter:i+2, insertCoords:reversedCoords});
    }
  }
  return polygon; //Did not find a segment in polygon that matched line endpoints.
};

const _toTurfCoordinates = (coords) => {
  const ret = [];
  for (let i = 0; i < coords.length; i+=2) {
    ret.push( [coords[i], coords[i+1]] );
  }
  return ret;
};

// Exports

export const reverseLine = (line) => _reverseCoords(line);

export const invertPolygon = (polygon) => _reverseCoords(polygon);

export const findClosestPointOnPoly = (polygon, x, y) => {
  const checkAgainst = containsPoint(polygon, x, y) ? invertPolygon(polygon) : polygon;
  const { point:foundPoint } = closestEdge(checkAgainst, x, y);
  return foundPoint;
};

export const slicePolygon = (polygon, sliceLine, replaceLine) => {
  const {x:ax, y:ay} = _getFirstLinePoint(sliceLine);
  const {x:bx, y:by} = _getLastLinePoint(sliceLine);
  const slicedPolygons = slice(polygon, ax, ay, bx, by);
  return slicedPolygons.map(
    slicedPolygon => _replacePolygonSegmentWithLine(slicedPolygon, replaceLine)
  );
};

export const toTurfPolygon = (polygon) => {
  const coords = _toTurfCoordinates(polygon);
  coords.push(coords[0]);
  return turfPolygon([coords]);
};
