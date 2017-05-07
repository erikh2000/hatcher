
import {degreesToRadians, solveTriangle2Angles1Side} from './geometry.js';

describe('degreesToRadians', () => {
  it('returns expected conversions', () => {
    const PRECISION = 4;
    expect(degreesToRadians(0)).toBeCloseTo(0, PRECISION);
    expect(degreesToRadians(360)).toBeCloseTo(Math.PI*2, PRECISION);
  });
});

describe('solveTriangle2Angles1Side', () => {
  it('No angles fails', () => {
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3})).toBeNull();
  });

  it('One angle fails', () => {
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3, A:20})).toBeNull();
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3, B:20})).toBeNull();
    expect(solveTriangle2Angles1Side({a:1,b:2,c:3, C:20})).toBeNull();
  });

  it('No sides fails', () => {
    expect(solveTriangle2Angles1Side({A:20, B:40})).toBeNull();
  });

  it('2 angles, solves remaining angle', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:20, B:40})).toEqual(jasmine.objectContaining({C: 120}));
    expect(solveTriangle2Angles1Side({a: 1, A:20, C:40})).toEqual(jasmine.objectContaining({B: 120}));
    expect(solveTriangle2Angles1Side({a: 1, B:20, C:40})).toEqual(jasmine.objectContaining({A: 120}));
  });

  it('3 angles, no changes to angles', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:20, B:40, C:120}))
      .toEqual(jasmine.objectContaining({A:20, B:40, C:120}));
  });

  it('angles summed over 180 fails', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:95, B:85,})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, A:181, B:1,})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, A:90, B:90, C:1})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, A:179, B:1, C:1})).toBeNull();
  });

  it('any negative angles fails', () => {
    expect(solveTriangle2Angles1Side({a: 1, A:-1, B:10})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, B:-1, C:10})).toBeNull();
    expect(solveTriangle2Angles1Side({a: 1, C:-1, A:10})).toBeNull();
  });

  it('3 sides, no changes to sides', () => {
    expect(solveTriangle2Angles1Side({a: 1, b: 2, c: 3, A:20, B:40}))
      .toEqual(jasmine.objectContaining({a:1, b:2, c:3}));
  });

  it('solve for 2 angles 1 side', () => {
    let r = solveTriangle2Angles1Side({c:7, A: 35, C: 62});
    expect(r).toEqual(jasmine.objectContaining({A: 35, C: 62, B: 83, c:7}));
    expect(r.a).toBeCloseTo(4.55, 2);
    expect(r.b).toBeCloseTo(7.87, 2);
  });
});
