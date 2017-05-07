import { isZeroCosineAngle, solveTriangle2Angles1Side } from './geometry';

const _getStrokeAttributesForDrawStyle = ({strokeColor, strokeWidth}) =>
  `stroke='${strokeColor}' stroke-width='${strokeWidth}'`;

const _fixHatchAngleAsNeeded = (angle) => (angle % 90 === 0) ? angle + .1 : angle;

const _calcHatchDrawingValues = ({hatchAngle, hatchDensity, height, strokeWidth, width}) => {
  const hatchSpacing = 10; //TODO
  hatchAngle = _fixHatchAngleAsNeeded(hatchAngle);

  const tri = solveTriangle2Angles1Side({A: hatchAngle, B: 90, c: height});
  const bottomOffset = tri.a;
  const startTopX = (bottomOffset > 0) ? -bottomOffset : 0;
  const endTopX = width + ((bottomOffset < 0) ? -bottomOffset : 0);

  return {hatchSpacing, bottomOffset, startTopX, endTopX};
};

const _hatchSvg = ({width, height, drawStyle}) => {
  let ret = '';
  const {hatchAngle, hatchDensity, strokeWidth} = drawStyle;
  const {hatchSpacing, bottomOffset, startTopX, endTopX} = _calcHatchDrawingValues(
    {hatchAngle, hatchDensity, height, strokeWidth, width} );
  const strokeAttributes = _getStrokeAttributesForDrawStyle(drawStyle);

  for (let x = startTopX; x <= endTopX; x += hatchSpacing) {
    ret += `<line ${strokeAttributes} x1='${x}' y1='0' x2='${x+bottomOffset}' y2='${height}'/>`;
  }
  return ret;
};

const _borderSvg = ({width, height, drawStyle}) => {
  const strokeAttributes = _getStrokeAttributesForDrawStyle(drawStyle);
  return `<polyline fill='none' ${strokeAttributes} ` +
    `points='1,1 ${width},1 ${width},${height} 1,${height} 1,1'/>`;
};

export const createHatchSvg = ({width, height, drawStyle}) => {
  let ret = `<svg className='hatcher-svg' xmlns='http://www.w3.org/2000/svg' ` +
    `opacity='${drawStyle.opacity}' width='${width}' height='${height}'>`;

  ret += _hatchSvg({width, height, drawStyle});

  if (drawStyle.drawBorder) {
    ret += _borderSvg({width, height, drawStyle});
  }

  ret += `</svg>`;

  return ret;
};
