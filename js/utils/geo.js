// GPS wrapper + Haversine distance calculation
const Geo = {
  /** Get current position as a Promise */
  getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000, ...options }
      );
    });
  },

  /** Watch position changes, returns watchId for clearing */
  watchPosition(callback, errorCallback) {
    if (!navigator.geolocation) return null;
    return navigator.geolocation.watchPosition(
      pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      errorCallback || (() => {}),
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
  },

  /** Stop watching */
  clearWatch(watchId) {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  /** Haversine distance in kilometers between two lat/lng points */
  distance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLng = this._toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  /** Format distance for display */
  formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  },

  /** Sort places by distance from a point */
  sortByDistance(places, lat, lng) {
    return places
      .map(p => ({ ...p, _dist: this.distance(lat, lng, p.lat, p.lng) }))
      .sort((a, b) => a._dist - b._dist);
  },

  _toRad(deg) { return deg * Math.PI / 180; },

  /** Default center: Tokyo Station */
  TOKYO_CENTER: { lat: 35.6812, lng: 139.7671 }
};
