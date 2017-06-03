import { ContainsPoint as containsPoint } from 'polyk';

class DensityMap {
  constructor({defaultDensity = .1, densityZones = []}) {
    this.defaultDensity = defaultDensity;
    this.densityZones = densityZones;
  }

  getDensityAt(x, y) {
    const containingZone = this.densityZones && this.densityZones.find( (zone) => containsPoint(zone.polygon, x, y) );
    return containingZone ? containingZone.density : this.defaultDensity;
  }
};

export default DensityMap;
