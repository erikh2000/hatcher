import {
  bbox,
  bboxPolygon,
  difference,
  featureCollection,
  lineString,
  polygon
} from '@turf/turf';

const _withinRange = (x, a, b) => (a < b) ? (x >= a && x <= b) : (x >= b && x <= a);

const _areCoordsOnRectSegment = (coords, segmentStartCoords, segmentEndCoords) => {
  if (segmentStartCoords[0] === segmentEndCoords[0]) { //vertical segment
    return coords[0] === segmentStartCoords[0] && _withinRange(coords[1], segmentStartCoords[1], segmentEndCoords[1]);
  } else {  //horizontal segment
    return coords[1] === segmentStartCoords[1] && _withinRange(coords[0], segmentStartCoords[0], segmentEndCoords[0]);
  }
};

const _getBoundingExclusiveRect = (polygon, linestring) => {
  const fc = featureCollection([polygon, linestring]);
  const bb = bbox(fc);
  //Expand the bounding rect a little bit so that no points of polygons are on the perimeter.
  --bb[0];
  --bb[1];
  ++bb[2];
  ++bb[3];
  return bboxPolygon(bb);
};

const _getNearestCoordsOnRect = (rect, coords) => {
  //Preconditions:
  //Passed-in rect begins with topleft corner coordinate and defines 4 clockwise segments. This is coupled to the
  //bboxPolygon() implementation. If it becomes no longer true, just rewrite this function to accomodate.
  const left = rect.geometry.coordinates[0][0][0];
  const right = rect.geometry.coordinates[0][1][0];
  const top = rect.geometry.coordinates[0][0][1];
  const bottom = rect.geometry.coordinates[0][2][1];

  //Find which of the four rect segments is closest to the point.
  const distances = [coords[0]-left, right-coords[0], coords[1]-top, bottom-coords[1]];
  let smallestDistance = 9999999, smallestI = -1;
  distances.forEach((distance, i) => {
    if (distance < smallestDistance) {
      smallestDistance = distance;
      smallestI = i;
    }
  });

  switch(smallestI) {
    case 0:   return [left,coords[1]];    //left
    case 1:   return [right,coords[1]];   //right
    case 2:   return [coords[0],top];     //top
    default:  return [coords[0],bottom];  //bottom (3)
  }
};

const _getLineStringStartCoords = (line) => line.geometry.coordinates[0];

const _getLineStringEndCoords = (line) => line.geometry.coordinates[line.geometry.coordinates.length-1];

const _nextCoordI = (i, poly) => (i===poly.geometry.coordinates[0].length-2) ? 0 : i+1;

const _extendSliceLineToFitRect = (line, rect) => {
    const newLineCoords = line.geometry.coordinates.slice();

    //Preconditions:
    //1. all points of line are inside rect (inclusive of perimeter).
    //2. adding a segment to either endpoint to travel to nearest point on perimeter will not intersect with other
    //   segments of the line. Another way of saying the same thing--the endpoints would be included in a convex hull
    //   of all points in the slice line. Basically, don't pass a tangled up maze of a slice line.
    const startCoords = _getLineStringStartCoords(line);
    const startNearestCoords = _getNearestCoordsOnRect(rect, startCoords);
    newLineCoords.unshift(startNearestCoords);

    const endCoords = _getLineStringEndCoords(line);
    const endNearestCoords = _getNearestCoordsOnRect(rect, endCoords);
    newLineCoords.push(endNearestCoords);

    return lineString(newLineCoords);
};

const _findRectSegmentContainingCoords = (rect, coords) => {
  const rectCoords = rect.geometry.coordinates[0];
  let foundSegmentI = -1;
  rectCoords.some((segmentStartCoords, i) => {
    if (i === rectCoords.length-1) { return true; }
    const segmentEndCoords = rectCoords[_nextCoordI(i, rect)];
    if (!_areCoordsOnRectSegment(coords, segmentStartCoords, segmentEndCoords)) {
      return false;
    } else {
      foundSegmentI = i;
      return true;
    }
  });
  return foundSegmentI;
};

const _findStartAndEndSliceSegments = (rect, sliceLine) => {
  const startSliceCoords = _getLineStringStartCoords(sliceLine);
  const endSliceCoords = _getLineStringEndCoords(sliceLine);
  const startSliceSegmentI = _findRectSegmentContainingCoords(rect, startSliceCoords);
  const endSliceSegmentI = _findRectSegmentContainingCoords(rect, endSliceCoords);
  return { startSliceSegmentI, endSliceSegmentI };
}

const _calcMaskPolygon = (rect, sliceLine) => {

  const { startSliceSegmentI, endSliceSegmentI } = _findStartAndEndSliceSegments(rect, sliceLine);
  if (startSliceSegmentI === -1 || endSliceSegmentI === -1) { console.error('slice line endpoints are not on rect segments.'); return; }

  const rectCoords = rect.geometry.coordinates[0];
  const maskCoords = [];

  //Add part of starting segment that joins with slice line.
  maskCoords.push( rectCoords[startSliceSegmentI] );

  //Add the slice line.
  maskCoords.push( ...sliceLine.geometry.coordinates );

  //Add part of ending segment that joins with slice line.
  const endSegmentJoinI = _nextCoordI(endSliceSegmentI, rect);
  maskCoords.push( rectCoords[endSegmentJoinI] );

  //Add all the remaining (unsliced) segments of the rect.
  let i = endSegmentJoinI;
  do {
    i = _nextCoordI(i, rect);
    maskCoords.push( rectCoords[i] );
  } while (i !== startSliceSegmentI);

  return polygon([maskCoords]);
};

const _calcMaskPolygons = (rect, sliceLine) => {
  const maskPolygons = [];

  maskPolygons.push(_calcMaskPolygon(rect, sliceLine));

  // Call mask polygon again with reversed slice line coordinates to generate the complementary mask.
  const sliceLineReversed = lineString(sliceLine.geometry.coordinates.reverse());
  maskPolygons.push(_calcMaskPolygon(rect, sliceLineReversed));

  return maskPolygons;
}

/**
 * Slices {@link Polygon} using a {@link Linestring}.
 *
 * @name polygonSlice
 * @param {Feature<Polygon>} poly Polygon to slice
 * @param {Feature<LineString>} splitter LineString used to slice Polygon
 * @returns {FeatureCollection<Polygon>} Sliced Polygons
*/
export const polygonSlice = (poly, line) => {
  //Get a bounding rect that will contain both the polygon and slice line with no points on perimeter.
  const boundingRect = _getBoundingExclusiveRect(poly, line);

  //Extend the slice line to reach the bounding rect.
  const sliceLine = _extendSliceLineToFitRect(line, boundingRect);

  //Generate two mask polygons that cover both sides of the slice.
  const maskPolygons = _calcMaskPolygons(boundingRect, sliceLine);

  //Subtract each mask from the polygon. The difference will be the sliced polygon.
  const slicedPolygons = maskPolygons.map(maskPolygon => difference(poly, maskPolygon));

  return featureCollection(slicedPolygons);
};
