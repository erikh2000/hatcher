const r = (c) => Math.round(c);

const _getStrokeAttributesFromDrawStyle = ({stroke, strokeWidth}) =>
  `stroke='${stroke}' stroke-width='${strokeWidth}'`;

const _circle = ({strokeAttributes, cx, cy, r}) => {
  return `<circle ${strokeAttributes} cx='${cx}' cy='${cy}' r='${r}' />`;
};

const _circles = ({strokeAttributes, circles}) => {
  let svg = '';
  circles.forEach(circle => {
    svg += _circle({strokeAttributes, cx:circle.cx, cy:circle.cy, r:circle.r});
  });
  return svg;
};

const _polyline = ({strokeAttributes, line}) => {
  let svg = `<polyline fill='none' ${strokeAttributes} points='`;
  line.forEach((point,i) => {
    svg += `${r(point[0])},${r(point[1])}`;
    if (i < line.length) { svg += ' '; }
  });
  svg += `'/>`;
  return svg;
};

const _polylines = ({strokeAttributes, lines}) => {
  let svg = '';
  lines.forEach((line) => {
    svg += _polyline({strokeAttributes, line});
  });
  return svg;
};

const _svgStart = ({width, height, opacity}) => {
  return `<svg className='hatcher-svg' xmlns='http://www.w3.org/2000/svg' ` +
    `opacity='${opacity}' width='${width}' height='${height}'>`;
}

const _svgEnd = () => `</svg>`;

export const createSvgFromDrawset = (drawset) => {
  if (!drawset) { return ''; }

  const {stroke, strokeWidth, width, height, opacity} = drawset;
  const strokeAttributes = _getStrokeAttributesFromDrawStyle({stroke, strokeWidth});

  let svg = _svgStart({width, height, opacity});
  svg += _polylines({strokeAttributes, lines:drawset.lines});
  svg += _svgEnd();

  return svg;
};

export const createSvgFromDrawsets = (drawsets) => {
  if (!drawsets || drawsets.length < 1) { return ''; }

  const {width, height, opacity} = drawsets[0];

  let svg = _svgStart({width, height, opacity});
  drawsets.forEach(drawset => {
    const {stroke, strokeWidth} = drawset;
    const strokeAttributes = _getStrokeAttributesFromDrawStyle({stroke, strokeWidth});
    svg += _polylines({strokeAttributes, lines:drawset.lines});
  });
  svg += _svgEnd();

  return svg;
};
