import {
  ContainsPoint as containsPoint,
  ClosestEdge as closestEdge,
} from 'polyk';

// Private

const _reverseCoords = (coords) => {
  const ret = [];
  for (let i = coords.length - 2; i >= 0; i -= 2) {
    ret.push(coords[i]);
    ret.push(coords[i+1]);
  }
  return ret;
};

// Exports

export const invertPolygon = (polygon) => _reverseCoords(polygon);

export const findClosestPointOnPoly = (polygon, x, y) => {
  const checkAgainst = containsPoint(polygon, x, y) ? invertPolygon(polygon) : polygon;
  const { point:foundPoint } = closestEdge(checkAgainst, x, y);
  return foundPoint;
};
