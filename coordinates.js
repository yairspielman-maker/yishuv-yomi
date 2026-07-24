"use strict";

function enrichLocalitiesWithCoordinates(localities, coordinateIndex = {}) {
  return localities.map((locality) => {
    if (hasValidCoordinate(locality)) {
      return {
        ...locality,
        latitude: Number(locality.latitude),
        longitude: Number(locality.longitude),
        coordinateSource: locality.coordinateSource || "official"
      };
    }

    const prototypeCoordinate = coordinateIndex[String(locality.officialCode || "")];
    if (!isVerifiedPrototypeCoordinate(prototypeCoordinate)) {
      return locality;
    }

    return {
      ...locality,
      latitude: Number(prototypeCoordinate.latitude),
      longitude: Number(prototypeCoordinate.longitude),
      coordinateSource: prototypeCoordinate.source
    };
  });
}

function hasValidCoordinate(value) {
  if (value?.latitude === null
    || value?.latitude === undefined
    || value?.longitude === null
    || value?.longitude === undefined
    || String(value.latitude).trim() === ""
    || String(value.longitude).trim() === "") {
    return false;
  }

  const latitude = Number(value?.latitude);
  const longitude = Number(value?.longitude);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function isVerifiedPrototypeCoordinate(value) {
  return value?.verified === true
    && value.source === "prototype-geocoding"
    && hasValidCoordinate(value);
}

module.exports = {
  enrichLocalitiesWithCoordinates,
  hasValidCoordinate,
  isVerifiedPrototypeCoordinate
};
