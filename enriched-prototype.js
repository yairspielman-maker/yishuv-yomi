(function initializeEnrichedPrototypeModule(browserWindow) {
  "use strict";

  const ENRICHED_PROTOTYPE_NAMES = Object.freeze([
    "קצרין",
    "עין זיוון",
    "מרום גולן",
    "אניעם",
    "רמות"
  ]);

  function isEnrichedPrototypeSearch(search) {
    return new URLSearchParams(String(search || ""))
      .get("prototype") === "enriched";
  }

  function selectEnrichedPrototypeLocalities(
    localities,
    names = ENRICHED_PROTOTYPE_NAMES,
    logger = console
  ) {
    const localitiesByName = new Map(
      localities.map((locality) => [locality.hebrewName, locality])
    );
    const selected = [];
    const missing = [];

    for (const name of names) {
      const locality = localitiesByName.get(name);
      if (!locality) {
        reportMissing(missing, logger, name, "locality_not_found");
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(locality, "enrichedData")) {
        reportMissing(missing, logger, name, "enriched_data_missing");
        continue;
      }
      selected.push(locality);
    }

    return {
      localities: selected,
      missing,
      officialCodes: selected.map((locality) => String(locality.officialCode))
    };
  }

  function nextPrototypeIndex(currentIndex, localityCount) {
    const count = Number(localityCount);
    if (!Number.isInteger(count) || count <= 0) {
      return 0;
    }
    return (Number(currentIndex) + 1) % count;
  }

  function reportMissing(missing, logger, name, reason) {
    missing.push({ name, reason });
    const explanation = reason === "locality_not_found"
      ? "was not found in the official locality data"
      : "does not have enrichedData";
    logger?.error?.(`[Enriched prototype] ${name} ${explanation}.`);
  }

  const api = {
    ENRICHED_PROTOTYPE_NAMES,
    isEnrichedPrototypeSearch,
    selectEnrichedPrototypeLocalities,
    nextPrototypeIndex
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (browserWindow) {
    browserWindow.YISHUV_ENRICHED_PROTOTYPE = api;
  }
})(typeof window === "undefined" ? null : window);
