import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function AdminReportMap({ reports }) {
  const mapElement = useRef(null);
  const reportsWithCoordinates = useMemo(
    () => reports.filter(
      (report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude),
    ),
    [reports],
  );

  useEffect(() => {
    if (!mapElement.current || !reportsWithCoordinates.length) return undefined;

    const map = L.map(mapElement.current, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markers = reportsWithCoordinates.map((report) => {
      const reporterName = typeof report.submittedBy?.name === "string" ? report.submittedBy.name.trim() : "";
      const reporterRank = Number.isFinite(report.reporterRank) ? report.reporterRank : null;
      const reporterLabel = reporterName
        ? reporterRank == null ? reporterName : `${reporterName} · Rank ${reporterRank}`
        : reporterRank == null ? "Community report" : `Reporter rank ${reporterRank}`;
      const marker = L.marker([report.latitude, report.longitude], {
        icon: L.divIcon({
          className: "wastewise-map-pin-icon",
          html: "<span></span>",
          iconSize: [26, 38],
          iconAnchor: [13, 38],
          popupAnchor: [0, -34],
        }),
      }).addTo(map);
      const markerLabel = document.createElement("span");
      markerLabel.textContent = reporterLabel;
      marker.bindTooltip(markerLabel, {
        permanent: true,
        direction: "right",
        offset: [8, -18],
        className: "wastewise-map-label",
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = report.category;
      const reporter = document.createElement("small");
      reporter.textContent = reporterLabel;
      const location = document.createElement("p");
      location.textContent = report.location;
      const status = document.createElement("small");
      status.textContent = `Status: ${report.status.replaceAll("_", " ")}`;
      const accuracy = document.createElement("small");
      accuracy.textContent = report.locationAccuracyMeters == null
        ? "GPS accuracy not recorded"
        : `Estimated accuracy ±${Math.ceil(report.locationAccuracyMeters)} m`;
      popup.append(title, reporter, location, status, accuracy);
      marker.bindPopup(popup);
      return marker;
    });

    const bounds = L.featureGroup(markers).getBounds();
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });

    return () => map.remove();
  }, [reportsWithCoordinates]);

  if (!reportsWithCoordinates.length) {
    return (
      <p className="admin-map-empty">
        No reports have GPS coordinates yet. Reports with GPS will appear on the map here.
      </p>
    );
  }

  return (
    <div
      className="admin-report-map"
      ref={mapElement}
      role="region"
      aria-label="Map of reports with GPS coordinates"
    />
  );
}

export default AdminReportMap;
