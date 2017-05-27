import { ContainsPoint as containsPoint } from 'polyk';

export const getDensityAtPoint = ({x, y, defaultDensity, densityZones}) => {
  const containingZone = densityZones && densityZones.find( (zone) => containsPoint(zone.polygon, x, y) );
  return containingZone ? containingZone.density : defaultDensity;
};
