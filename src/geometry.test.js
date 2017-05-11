
/* global jasmine */
import {
  calcAngleBetweenPoints,
  calcAverageAngle,
  degreesToRadians,
  fixWrappedAngles,
  normalizeAngle,
  radiansToDegrees,
  solveTriangle2Angles1Side
} from './geometry.js';

describe('degreesToRadians', () => {
  it('returns expected conversions', () => {
    const PRECISION = 4;
    expect(degreesToRadians(0)).toBeCloseTo(0, PRECISION);
    expect(degreesToRadians(360)).toBeCloseTo(Math.PI*2, PRECISION);
  });
});

describe('radiansToDegrees', () => {
  it('returns expected conversions', () => {
    const PRECISION = 4;
    expect(radiansToDegrees(0)).toBeCloseTo(0, PRECISION);
    expect(radiansToDegrees(Math.PI*2)).toBeCloseTo(360, PRECISION);
  });
});

describe('solveTriangle2Angles1Side', () => {
  it('fails with no angles', () => {
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3})).toBeNull();
  });

  it('fails with one angle', () => {
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3, A:20})).toBeNull();
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3, B:20})).toBeNull();
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3, C:20})).toBeNull();
  });

  it('fails with no sides', () => {
    expect(solveTriangle2Angles1Side({A:20, B:40})).toBeNull();
  });

  it('solves remaining angle for 2 angles', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:20, B:40})).toEqual(jasmine.objectContaining({C: 120}));
    expect(solveTriangle2Angles1Side({a: 1, A:20, C:40})).toEqual(jasmine.objectContaining({B: 120}));
    expect(solveTriangle2Angles1Side({a: 1, B:20, C:40})).toEqual(jasmine.objectContaining({A: 120}));
  });

  it('solves for 3 angles, with no changes to angles', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:20, B:40, C:120}))
      .toEqual(jasmine.objectContaining({A:20, B:40, C:120}));
  });

  it('fails for angles summed over 180', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:95, B:85,})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, A:181, B:1,})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, A:90, B:90, C:1})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, A:179, B:1, C:1})).toBeNull();
  });

  it('fails for any negative angles', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:-1, B:10})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, B:-1, C:10})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, C:-1, A:10})).toBeNull();
  });

  it('solves for 3 sides, with no changes to sides', () => {
    expect(solveTriangle2Angles1Side({a: 1, b: 2, c: 3, A:20, B:40}))
      .toEqual(jasmine.objectContaining({a:1, b:2, c:3}));
  });

  it('solves for 2 angles 1 side', () => {
    let r = solveTriangle2Angles1Side({c:7, A: 35, C: 62});
    expect(r).toEqual(jasmine.objectContaining({A: 35, C: 62, B: 83, c:7}));
    expect(r.a).toBeCloseTo(4.55, 2);
    expect(r.b).toBeCloseTo(7.87, 2);
  });
});

describe('normalizeAngle', () => {
  const PRECISION = 4;

  it('does not change 0 degrees', () => {
    expect(normalizeAngle(0)).toEqual(0);
  });

  it('does not change 359.x degrees', () => {
    expect(normalizeAngle(359)).toEqual(359);
    expect(normalizeAngle(359.9)).toBeCloseTo(359.9, PRECISION);
  });

  it('fixes <0 degrees', () => {
    expect(normalizeAngle(-1)).toEqual(359);
    expect(normalizeAngle(-1.1)).toBeCloseTo(358.9, PRECISION);
    expect(normalizeAngle(-361)).toEqual(359);
  });

  it('fixes >=360 degrees', () => {
    expect(normalizeAngle(360)).toEqual(0);
    expect(normalizeAngle(360.1)).toBeCloseTo(.1, PRECISION);
    expect(normalizeAngle(360+180)).toEqual(180);
  });
});

describe('fixWrappedAngles', () => {
  it('solves for same angle', () => {
    expect(fixWrappedAngles(10,10)).toEqual({a1w:10, a2w:10});
  });

  it('solves for angles that are in smallest-first order and not closest with wrapping.', () => {
    expect(fixWrappedAngles(10,20)).toEqual({a1w:10, a2w:20});
  });

  it('solves for angles that are in largest-first order and not closest with wrapping.', () => {
    expect(fixWrappedAngles(20,10)).toEqual({a1w:10, a2w:20});
  });

  it('solves for angles that are in smallest-first order and are closest with wrapping.', () => {
    expect(fixWrappedAngles(10,350)).toEqual({a1w:350, a2w:370});
  });

  it('solves for angles that are in largest-first order and are closest with wrapping.', () => {
    expect(fixWrappedAngles(350,10)).toEqual({a1w:350, a2w:370});
  });
});

describe('calcAngleBetweenPoints', () => {
  const PRECISION = 4;

  it('calcs an angle in all 4 quadrants', () => {
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:10,y2:10})).toBeCloseTo(45, PRECISION);
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:-10,y2:10})).toBeCloseTo(135, PRECISION);
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:-10,y2:-10})).toBeCloseTo(225, PRECISION);
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:10,y2:-10})).toBeCloseTo(315, PRECISION);
  });

  it('returns 0 if 2 points are same', () => {
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:0,y2:0})).toEqual(0);
  });


  it('calcs an angle for a straight line in all 4 quadrants', () => {
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:10,y2:0})).toEqual(0);
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:0,y2:10})).toEqual(90);
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:-10,y2:0})).toEqual(180);
    expect(calcAngleBetweenPoints({x1:0,y1:0,x2:0,y2:-10})).toEqual(270);
  });

});

describe('calcAverageAngle', () => {
  const PRECISION = 4;

  it('calcs an average when 2 angles are same', () => {
    expect(calcAverageAngle(45,45)).toBeCloseTo(45, PRECISION);
  });

  it('returns other angle as average when one angle is missing', () => {
    expect(calcAverageAngle(undefined,45)).toEqual(45);
    expect(calcAverageAngle(45,undefined)).toEqual(45);
    expect(calcAverageAngle(undefined,undefined)).toBeUndefined();
  });

  it('calcs an average between 2 non-wrapped angles between 0 and <360', () => {
    expect(calcAverageAngle(10,20)).toBeCloseTo(15, PRECISION);
  });

  it('calcs an average between 2 non-wrapped angles with one less than 0', () => {
    expect(calcAverageAngle(-10,20)).toBeCloseTo(5, PRECISION);
  });

  it('calcs an average between 2 non-wrapped angles with both less than 0', () => {
    expect(calcAverageAngle(-20,-10)).toBeCloseTo(345, PRECISION);
  });

  it('calcs an average between 2 non-wrapped angles with one >= 360', () => {
    expect(calcAverageAngle(350,360)).toBeCloseTo(355, PRECISION);
    expect(calcAverageAngle(350,370)).toBeCloseTo(0, PRECISION);
  });

  it('calcs an average between 2 non-wrapped angles with both >= 360', () => {
    expect(calcAverageAngle(360,370)).toBeCloseTo(5, PRECISION);
  });

  it('calcs an average between 2 wrapped angles', () => {
    expect(calcAverageAngle(350,0)).toBeCloseTo(355, PRECISION);
    expect(calcAverageAngle(355,5)).toBeCloseTo(0, PRECISION);
  });
});
