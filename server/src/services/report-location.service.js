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

module.exports = { parseGpsCoordinates };
