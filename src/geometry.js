export const degreesToRadians = (degrees) => degrees * Math.PI / 180;

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
