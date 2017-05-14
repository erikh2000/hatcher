export const degreesToRadians = (degrees) => degrees * Math.PI / 180;

export const radiansToDegrees = (radians) => radians * 180 / Math.PI;

/* a, b, c are side length. A, B, C are angles. At least 2 angles must be specified.
   At least 1 side must be specified. 0 value for angle/side is invalid. */
export const solveTriangle2Angles1Side = ({a, b, c, A, B, C}) => {

  // Solve for missing angle, if there is one.
  if (!A) {A = 180 - B - C;}
  if (!B) {B = 180 - A - C;}
  if (!C) {C = 180 - A - B;}
  if (A + B + C !== 180 || A <= 0 || B <= 0 || C <= 0) { return null; } //Either <2 angles specified or angles can't make a valid triangle.

  // Solve missing sides.
  let knownSide, knownAngle;
  if (a) { knownSide = a; knownAngle = A; }
  else if (b) { knownSide = b; knownAngle = B; }
  else if (c) { knownSide = c; knownAngle = C; }
  if (!knownSide && !knownAngle) { return null; } //Need at least 1 side to be specified.

  if (!a) { a = knownSide / Math.sin(degreesToRadians(knownAngle)) * Math.sin(degreesToRadians(A)); }
  if (!b) { b = knownSide / Math.sin(degreesToRadians(knownAngle)) * Math.sin(degreesToRadians(B)); }
  if (!c) { c = knownSide / Math.sin(degreesToRadians(knownAngle)) * Math.sin(degreesToRadians(C)); }

  return {a, b, c, A, B, C};
};

export const normalizeAngle = (a) => {
  if (a < 0) {
    a += (360 * Math.ceil(-a / 360));
  }
  return a % 360;
};

export const calcAngleBetweenPoints = ({x1, y1, x2, y2}) => {
  return normalizeAngle(radiansToDegrees(Math.atan2(y2-y1, x2-x1)));
};

/** Add or subtract 360 degrees to angles so they can be returned with smallest angle first, and no wrapping from 359
    to 0. */
export const fixWrappedAngles = (a1, a2) => {
  let a1w = normalizeAngle(a1), a2w = normalizeAngle(a2);

  //Swap if needed to make first angle the smaller.
  if (a1w > a2w) { [a1w, a2w] = [a2w, a1w]; }

  //Are the angles closer together if comparing across the 0 degree wrap point?
  if ((a2w - a1w) > 180) { // Yes.
    [a1w, a2w] = [a2w, a1w];
    a2w += 360;
  }

  return {a1w, a2w};
};

/** Add or subtract 360 degrees to angles so they can be returned in same order, but without needed
    of wrapping from 359 to 0 to find closest angle. */
export const fixWrappedAnglesNoSwap = (a1, a2) => {
  let a1w = normalizeAngle(a1), a2w = normalizeAngle(a2);

  //Are angles already in smallest-first order?
  if (a1w < a2w) { //Yes.
    //Are the angles closer together if comparing across the 0 degree wrap point?
    if ((a2w - a1w) > 180) { // Yes--fix the wrap.
      a1w += 360;
    }
  } else { //In largest-first order.
    //Are the angles closer together if comparing across the 0 degree wrap point?
    if ((a1w - a2w) > 180) { // Yes--fix the wrap.
      a2w += 360;
    }
  }

  return {a1w, a2w};
};

export const calcAverageAngle = (a1, a2) => {
  const _isMissing = (x) => (x === null || x === undefined);

  if (_isMissing(a1)) {
    return a2;
  } else if (_isMissing(a2)) {
    return a1;
  }
  const {a1w, a2w} = fixWrappedAngles(a1, a2);
  const average = (a1w + a2w) / 2;
  return normalizeAngle(average);
};

export const calcAngleDifference = (a1, a2) => {
  const {a1w, a2w} = fixWrappedAngles(a1, a2);
  return a2w - a1w;
};
