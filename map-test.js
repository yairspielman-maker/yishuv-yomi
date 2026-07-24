"use strict";

const locality = {
  name: "קצרין",
  latitude: 32.991,
  longitude: 35.691
};

const RADIUS_METERS = 5000;

function initializeMapTest(mapContainer, mapStatus) {
  if (!mapContainer) {
    throw new Error("Map container #map was not found.");
  }
  if (!window.L) {
    throw new Error("Leaflet JavaScript did not load.");
  }

  const center = [locality.latitude, locality.longitude];
  const map = window.L.map(mapContainer, {
    scrollWheelZoom: true
  }).setView(center, 12);

  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const marker = window.L.marker(center)
    .addTo(map)
    .bindPopup(locality.name)
    .openPopup();

  const circle = window.L.circle(center, {
    radius: RADIUS_METERS,
    color: "#156b43",
    weight: 2,
    fillColor: "#2ea86b",
    fillOpacity: 0.12
  }).addTo(map);

  map.fitBounds(circle.getBounds(), {
    padding: [24, 24],
    animate: false
  });

  mapStatus.textContent = "המפה נטענה בהצלחה.";
  window.mapTest = { locality, map, marker, circle };
  console.info(
    `[Map test] Leaflet initialized for ${locality.name} with a ${RADIUS_METERS}-meter radius.`
  );

  window.setTimeout(() => map.invalidateSize({ animate: false }), 0);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const mapContainer = document.getElementById("map");
  const mapStatus = document.getElementById("mapStatus");

  try {
    initializeMapTest(mapContainer, mapStatus);
  } catch (error) {
    mapStatus.dataset.error = "true";
    mapStatus.textContent = `שגיאה בטעינת המפה: ${error.message}`;
    console.error("[Map test] Initialization failed:", error);
  }
}
