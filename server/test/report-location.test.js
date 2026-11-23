const test = require("node:test");
const assert = require("node:assert/strict");
const { parseGpsCoordinates } = require("../src/services/report-location.service");

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
