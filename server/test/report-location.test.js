const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateDistanceMeters,
  getResolutionGpsCheck,
  parseGpsAccuracy,
  parseGpsCoordinates,
} = require("../src/services/report-location.service");

test("manual location has no GPS coordinates", () => {
  assert.deepEqual(parseGpsCoordinates(undefined, undefined), { latitude: null, longitude: null });
});

test("valid GPS coordinates are parsed as numbers", () => {
  assert.deepEqual(parseGpsCoordinates("-19.70943", "29.32155"), {
    latitude: -19.70943,
    longitude: 29.32155,
  });
});

test("GPS coordinates must be supplied as a valid pair", () => {
  assert.deepEqual(parseGpsCoordinates("1.2", ""), { error: "Both latitude and longitude are required" });
  assert.deepEqual(parseGpsCoordinates("91", "29"), { error: "Latitude must be between -90 and 90" });
  assert.deepEqual(parseGpsCoordinates("1", "181"), { error: "Longitude must be between -180 and 180" });
  assert.deepEqual(parseGpsCoordinates("north", "29"), { error: "Latitude must be between -90 and 90" });
});

test("GPS accuracy is optional but requires valid coordinates when provided", () => {
  assert.deepEqual(parseGpsAccuracy(undefined, false), { accuracyMeters: null });
  assert.deepEqual(parseGpsAccuracy("12.5", true), { accuracyMeters: 12.5 });
  assert.deepEqual(parseGpsAccuracy("12.5", false), { error: "GPS accuracy requires GPS coordinates" });
  assert.deepEqual(parseGpsAccuracy("-1", true), { error: "GPS accuracy must be between 0 and 100000 meters" });
});

test("GPS distance calculates proximity in metres", () => {
  const reportedLocation = { latitude: 0, longitude: 0 };
  assert.equal(calculateDistanceMeters(reportedLocation, reportedLocation), 0);
  assert.ok(calculateDistanceMeters(reportedLocation, { latitude: 0.0004, longitude: 0 }) < 50);
  assert.ok(calculateDistanceMeters(reportedLocation, { latitude: 0.0005, longitude: 0 }) > 50);
});

test("resolution GPS is verified within 50 metres or marked unverified without report GPS", () => {
  const stakeholderLocation = { latitude: 0, longitude: 0 };
  assert.deepEqual(
    getResolutionGpsCheck({ latitude: null, longitude: null }, stakeholderLocation),
    { verified: false, withinLimit: true, distanceMeters: null },
  );
  assert.equal(
    getResolutionGpsCheck({ latitude: 0, longitude: 0 }, stakeholderLocation).withinLimit,
    true,
  );
  assert.equal(
    getResolutionGpsCheck({ latitude: 0.0005, longitude: 0 }, stakeholderLocation).withinLimit,
    false,
  );
});
