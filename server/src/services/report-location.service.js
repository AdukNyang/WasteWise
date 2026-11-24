const parseGpsCoordinates = (latitudeValue, longitudeValue) => {
  const hasLatitude = latitudeValue !== undefined && latitudeValue !== null && String(latitudeValue).trim() !== "";
  const hasLongitude = longitudeValue !== undefined && longitudeValue !== null && String(longitudeValue).trim() !== "";

  if (hasLatitude !== hasLongitude)
    return { error: "Both latitude and longitude are required" };
  if (!hasLatitude) return { latitude: null, longitude: null };

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    return { error: "Latitude must be between -90 and 90" };
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    return { error: "Longitude must be between -180 and 180" };

  return { latitude, longitude };
};

const parseGpsAccuracy = (accuracyValue, hasCoordinates) => {
  const provided = accuracyValue !== undefined && accuracyValue !== null && String(accuracyValue).trim() !== "";
  if (!provided) return { accuracyMeters: null };
  if (!hasCoordinates) return { error: "GPS accuracy requires GPS coordinates" };

  const accuracyMeters = Number(accuracyValue);
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 100000)
    return { error: "GPS accuracy must be between 0 and 100000 meters" };

  return { accuracyMeters };
};

const calculateDistanceMeters = (first, second) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(second.latitude - first.latitude);
  const longitudeDifference = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371000 * 2 * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
};

const getResolutionGpsCheck = (report, stakeholder) => {
  if (report.latitude == null || report.longitude == null)
    return { verified: false, withinLimit: true, distanceMeters: null };

  const distanceMeters = calculateDistanceMeters(
    { latitude: report.latitude, longitude: report.longitude },
    stakeholder,
  );
  return {
    verified: true,
    withinLimit: distanceMeters <= 50,
    distanceMeters,
  };
};

module.exports = {
  calculateDistanceMeters,
  getResolutionGpsCheck,
  parseGpsAccuracy,
  parseGpsCoordinates,
};
