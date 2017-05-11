import { ContainsPoint as containsPoint } from 'polyk';

export const getDensityAtPoint = ({x, y, defaultDensity, densityZones}) => {
  densityZones.forEach( (zone) => {
    if (containsPoint(zone.polygon, x, y)) { return zone.density; }
  });
  return defaultDensity;
};
