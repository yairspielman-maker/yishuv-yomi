"use strict";

const ENABLE_CONTEXT_MAP_PROTOTYPE = true;
const IS_ENRICHED_PROTOTYPE =
  window.YISHUV_ENRICHED_PROTOTYPE?.isEnrichedPrototypeSearch(
    window.location.search
  ) || false;
const STORAGE_KEY = "yishuv-yomi-whatsapp-v1";
const FALLBACK_FACT = "אין מידע קצר זמין כרגע";
const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
const MAP_RADIUS_METERS = 5000;
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const state = loadState();

const elements = {
  backendStatus: document.getElementById("backendStatus"),
  messagePreview: document.getElementById("messagePreview"),
  subscribeForm: document.getElementById("subscribeForm"),
  dailyCountInput: document.getElementById("dailyCountInput"),
  sendTimeInput: document.getElementById("sendTimeInput"),
  orderModeInput: document.getElementById("orderModeInput"),
  phoneInput: document.getElementById("phoneInput"),
  messageStyleInput: document.getElementById("messageStyleInput"),
  nameInput: document.getElementById("nameInput"),
  consentInput: document.getElementById("consentInput"),
  formStatus: document.getElementById("formStatus"),
  sendTestButton: document.getElementById("sendTestButton"),
  manualWhatsAppButton: document.getElementById("manualWhatsAppButton"),
  unsubscribeButton: document.getElementById("unsubscribeButton"),
  browserReminderButton: document.getElementById("browserReminderButton"),
  localityCard: document.getElementById("localityCard"),
  revealRegionButton: document.getElementById("revealRegionButton"),
  revealFactsButton: document.getElementById("revealFactsButton"),
  nextLocalityButton: document.getElementById("nextLocalityButton"),
  cardProgress: document.getElementById("cardProgress"),
  microChallenge: document.getElementById("microChallenge"),
  streakCount: document.getElementById("streakCount"),
  regionsUnlocked: document.getElementById("regionsUnlocked"),
  shownCount: document.getElementById("shownCount"),
  albumFill: document.getElementById("albumFill"),
  tomorrowMoreButton: document.getElementById("tomorrowMoreButton"),
  enrichedPrototypeNotice: document.getElementById("enrichedPrototypeNotice"),
  enrichedPrototypeMissing: document.getElementById("enrichedPrototypeMissing")
};

let todaysBatch = [];
let todaysMessages = [];
let currentIndex = 0;
let regionRevealed = false;
let factsRevealed = false;
let activeLocalityMap = null;
let localityLoadSequence = 0;
let prototypeDiagnosticsLogged = false;
let enrichedPrototypeMissing = [];
let progress = {
  shownCount: 0,
  remainingCount: 0,
  totalCount: 0,
  regionsUnlocked: 0,
  completedCycles: 0,
  totalShownCount: 0
};
let backendStatus = {
  backendRunning: false,
  whatsappMode: "mock",
  hasToken: false,
  hasPhoneNumberId: false,
  dataSource: "unknown",
  localitiesCount: 0,
  mapPrototypeCount: 0
};

function loadState() {
  const defaults = {
    settings: {
      id: "",
      name: "יונדב",
      phoneNumber: "",
      dailyCount: 3,
      sendTime: "09:00",
      orderMode: "region",
      messageStyle: "short",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem"
    },
    streak: 1,
    lastVisitDate: null
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      settings: { ...defaults.settings, ...(stored.settings || {}) },
      streak: Number(stored.streak || defaults.streak),
      lastVisitDate: stored.lastVisitDate || defaults.lastVisitDate
    };
  } catch {
    return defaults;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getFormSettings() {
  return {
    id: state.settings.id || "",
    name: elements.nameInput.value.trim() || "יונדב",
    phoneNumber: elements.phoneInput.value.trim(),
    dailyCount: Number(elements.dailyCountInput.value),
    sendTime: elements.sendTimeInput.value || "09:00",
    orderMode: elements.orderModeInput.value,
    messageStyle: elements.messageStyleInput.value,
    timezone: state.settings.timezone,
    consentAccepted: elements.consentInput.checked
  };
}

function applySettingsToForm() {
  elements.nameInput.value = state.settings.name;
  elements.phoneInput.value = state.settings.phoneNumber;
  elements.dailyCountInput.value = String(state.settings.dailyCount);
  elements.sendTimeInput.value = state.settings.sendTime;
  elements.orderModeInput.value = state.settings.orderMode;
  elements.messageStyleInput.value = state.settings.messageStyle;
}

function requirePhoneValue() {
  if (elements.phoneInput.value.trim()) {
    return true;
  }
  elements.formStatus.textContent = "יש להזין מספר WhatsApp ישראלי.";
  return false;
}

function getDisplayFacts(locality) {
  const facts = Array.isArray(locality?.facts)
    ? locality.facts.map((fact) => String(fact || "").trim()).filter(Boolean)
    : [];
  return facts.length ? facts.slice(0, 4) : [FALLBACK_FACT];
}

function renderEnrichedData(enrichedData) {
  const renderer = window.YISHUV_ENRICHMENT?.renderEnrichedDataMarkup;
  return typeof renderer === "function" ? renderer(enrichedData) : "";
}

async function loadBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/status`);
    if (!response.ok) {
      throw new Error("status failed");
    }
    backendStatus = await response.json();
    if (!progress.totalCount) {
      progress.totalCount = backendStatus.localitiesCount;
      progress.remainingCount = backendStatus.localitiesCount;
    }
    renderBackendStatus();
    renderAlbum();
  } catch {
    backendStatus = {
      backendRunning: false,
      whatsappMode: "mock",
      hasToken: false,
      hasPhoneNumberId: false,
      dataSource: "unavailable",
      localitiesCount: 0,
      mapPrototypeCount: 0
    };
    renderBackendStatus(true);
  }
}

function renderBackendStatus(isOffline = false) {
  if (isOffline) {
    elements.backendStatus.textContent = "סטטוס מפתחים: השרת לא זמין. הריצו npm start ופתחו http://localhost:3000.";
    return;
  }

  elements.backendStatus.textContent = `סטטוס מפתחים: backend פעיל: ${backendStatus.backendRunning ? "true" : "false"}, מקור נתונים: ${backendStatus.dataSource}, יישובים: ${backendStatus.localitiesCount}, מפות אב-טיפוס: ${backendStatus.mapPrototypeCount || 0}, WhatsApp: ${backendStatus.whatsappMode}, token: ${backendStatus.hasToken ? "יש" : "אין"}, phone id: ${backendStatus.hasPhoneNumberId ? "יש" : "אין"}.`;
}

function previewParams(settings) {
  return new URLSearchParams({
    id: settings.id,
    name: settings.name,
    phoneNumber: settings.phoneNumber,
    dailyCount: String(settings.dailyCount),
    sendTime: settings.sendTime,
    orderMode: settings.orderMode,
    messageStyle: settings.messageStyle,
    timezone: settings.timezone
  });
}

async function fetchPreview(settings) {
  const response = await fetch(`${API_BASE}/api/today-preview?${previewParams(settings)}`);
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error || "preview_failed");
  }
  if (!Array.isArray(data.batch) || data.batch.length === 0) {
    throw new Error("preview_empty_batch");
  }
  return data;
}

async function fetchLocalitySample(settings) {
  const params = new URLSearchParams({
    limit: String(normalizeDailyCount(settings.dailyCount)),
    orderMode: settings.orderMode
  });
  const response = await fetch(`${API_BASE}/api/localities/sample?${params}`);
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error || "sample_failed");
  }
  if (!Array.isArray(data.localities) || data.localities.length === 0) {
    throw new Error("sample_empty");
  }
  return data;
}

async function fetchMapPrototypeLocalities(settings) {
  const params = new URLSearchParams({
    limit: "20",
    orderMode: settings.orderMode,
    withCoordinates: "true"
  });
  const response = await fetch(`${API_BASE}/api/localities/sample?${params}`);
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error || "prototype_sample_failed");
  }

  const availableLocalities = Array.isArray(data.localities)
    ? data.localities.filter(hasLocalityCoordinates)
    : [];
  const coordinateCount = Number(data.eligibleCount || availableLocalities.length);

  if (!prototypeDiagnosticsLogged) {
    console.info(`[Map prototype] ${coordinateCount} localities have coordinates.`);
    console.info(
      `[Map prototype] Available test localities: ${availableLocalities
        .slice(0, 10)
        .map((locality) => locality.hebrewName)
        .join(", ")}`
    );
    prototypeDiagnosticsLogged = true;
  }

  if (coordinateCount === 0 || availableLocalities.length === 0) {
    console.error(
      "[Map prototype] No localities with coordinates were loaded from data/locality-coordinates.prototype.json."
    );
    const error = new Error("prototype_coordinates_empty");
    error.code = "prototype_coordinates_empty";
    throw error;
  }

  const batch = availableLocalities.slice(0, normalizeDailyCount(settings.dailyCount));
  if (!hasLocalityCoordinates(batch[0])) {
    const error = new Error("prototype_first_locality_has_no_coordinates");
    error.code = "prototype_coordinates_invalid";
    throw error;
  }

  console.info(
    `[Map prototype] First locality: ${batch[0].hebrewName} (${batch[0].latitude}, ${batch[0].longitude}).`
  );
  return {
    source: "map-prototype",
    batch,
    totalCount: coordinateCount,
    coordinateCount
  };
}

async function fetchEnrichedPrototypeLocalities() {
  const response = await fetch(`${API_BASE}/api/localities/enriched-prototype`);
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error || "enriched_prototype_failed");
  }
  if (!Array.isArray(data.localities) || !Array.isArray(data.missing)) {
    throw new Error("enriched_prototype_invalid_response");
  }

  return {
    source: "enriched-prototype",
    batch: data.localities,
    totalCount: data.localities.length,
    missing: data.missing,
    officialCodes: data.officialCodes
  };
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    throw new Error(`invalid_json_response:${response.status}`);
  }
}

async function loadLocalities(settings) {
  if (IS_ENRICHED_PROTOTYPE) {
    return fetchEnrichedPrototypeLocalities();
  }

  let previewError;
  try {
    return {
      source: "daily-preview",
      previewData: await fetchPreview(settings)
    };
  } catch (error) {
    previewError = error;
    console.warn("Failed to load daily preview:", error);
  }

  try {
    const sample = await fetchLocalitySample(settings);
    return {
      source: "backend-sample",
      batch: sample.localities,
      totalCount: Number(sample.count || sample.localities.length),
      warning: `טעינת המקבץ היומי נכשלה (${previewError.message}); מוצג מדגם מהשרת.`
    };
  } catch (sampleError) {
    console.warn("Failed to load backend locality sample:", sampleError);
  }

  const fallbackLocalities = getFallbackLocalities(settings);
  if (fallbackLocalities.length) {
    return {
      source: "local-fallback",
      batch: fallbackLocalities,
      totalCount: window.YISHUV_LOCALITIES.length,
      warning: "ה-API אינו זמין; מוצגים נתוני fallback מקומיים לצורכי פיתוח."
    };
  }

  throw previewError || new Error("localities_unavailable");
}

function getFallbackLocalities(settings) {
  const available = Array.isArray(window.YISHUV_LOCALITIES)
    ? window.YISHUV_LOCALITIES.filter((locality) => locality?.hebrewName)
    : [];
  const ordered = [...available];

  if (settings.orderMode === "official") {
    ordered.sort((left, right) =>
      Number(left.officialCode || 0) - Number(right.officialCode || 0));
  } else if (settings.orderMode === "region") {
    ordered.sort((left, right) => {
      const byRegion = String(left.region || "").localeCompare(
        String(right.region || ""),
        "he"
      );
      return byRegion || String(left.hebrewName).localeCompare(String(right.hebrewName), "he");
    });
  }

  return ordered.slice(0, normalizeDailyCount(settings.dailyCount));
}

function normalizeDailyCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(5, Math.max(1, parsed)) : 3;
}

function applyPreviewData(data) {
  todaysBatch = Array.isArray(data.batch) ? data.batch : [];
  todaysMessages = Array.isArray(data.messages) ? data.messages : [];
  progress = data.progress || progress;

  if (data.subscriber?.id) {
    state.settings.id = data.subscriber.id;
  }
  if (data.normalizedPhone && data.phoneValid) {
    state.settings.phoneNumber = data.normalizedPhone;
  }
  saveState();

  elements.messagePreview.textContent = todaysMessages.length
    ? todaysMessages.join("\n\n---\n\n")
    : data.message || "";
}

function setLocalities(result) {
  if (result.previewData) {
    applyPreviewData(result.previewData);
    return;
  }

  todaysBatch = Array.isArray(result.batch) ? result.batch : [];
  todaysMessages = [];
  enrichedPrototypeMissing = result.source === "enriched-prototype"
    ? result.missing
    : [];
  renderEnrichedPrototypeStatus();
  progress = {
    ...progress,
    shownCount: 0,
    remainingCount: Number(result.totalCount || todaysBatch.length),
    totalCount: Number(result.totalCount || todaysBatch.length),
    regionsUnlocked: 0
  };
  elements.messagePreview.textContent = result.warning || "";

  if (result.warning) {
    elements.backendStatus.textContent = `סטטוס מפתחים: ${result.warning}`;
  }
}

function initializeDailyBatch() {
  currentIndex = 0;
  regionRevealed = IS_ENRICHED_PROTOTYPE;
  factsRevealed = IS_ENRICHED_PROTOTYPE;
}

function renderApp() {
  renderLocalityCard();
  renderAlbum();
}

async function refreshPreview() {
  const loadSequence = ++localityLoadSequence;
  const settings = getFormSettings();
  if (!IS_ENRICHED_PROTOTYPE) {
    state.settings = { ...state.settings, ...settings };
    saveState();
  }

  try {
    const result = await loadLocalities(settings);
    if (loadSequence !== localityLoadSequence) {
      return;
    }
    setLocalities(result);
    initializeDailyBatch();
    renderApp();
  } catch (error) {
    if (loadSequence !== localityLoadSequence) {
      return;
    }
    console.error("Failed to refresh localities:", error);
    if (!todaysBatch.length) {
      if (error.code === "prototype_coordinates_empty"
        || error.code === "prototype_coordinates_invalid") {
        showPrototypeCoordinatesError();
      } else {
        showLocalitiesLoadError();
      }
    } else {
      elements.backendStatus.textContent =
        "סטטוס מפתחים: עדכון הנתונים נכשל; המקבץ האחרון נשאר מוצג.";
    }
  }
}

function renderLocalityCard() {
  disposeActiveLocalityMap();
  const locality = todaysBatch[currentIndex];
  if (!locality) {
    if (IS_ENRICHED_PROTOTYPE && enrichedPrototypeMissing.length) {
      showEnrichedPrototypeEmptyState();
    } else {
      showLocalitiesLoadError();
    }
    return;
  }

  elements.cardProgress.textContent = `${currentIndex + 1} מתוך ${todaysBatch.length}`;
  elements.localityCard.innerHTML = `
    <h3 class="locality-name">${escapeHtml(locality.hebrewName)}</h3>
    <p class="english-name">${escapeHtml(locality.englishName || "")}</p>
    ${renderLocalityMapMarkup(locality)}
    <p class="secret-line">${regionRevealed ? `${escapeHtml(locality.region || "אזור לא זמין")} · ${escapeHtml(locality.district || "מחוז לא זמין")} · ${escapeHtml(locality.localityType || "סוג לא זמין")}` : "האזור עדיין מוסתר"}</p>
    <div class="secret-line">
      ${factsRevealed ? `<ul class="facts">${getDisplayFacts(locality).map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>` : "העובדות יופיעו אחרי לחיצה"}
    </div>
    ${renderEnrichedData(locality.enrichedData)}
  `;
  elements.microChallenge.textContent = `ניחוש מהיר: באיזה אזור זה? ${regionRevealed ? locality.region : "לחצו על גלו אזור כדי לבדוק"}`;

  if (!ENABLE_CONTEXT_MAP_PROTOTYPE || !hasLocalityCoordinates(locality)) {
    return;
  }

  const mapElement = elements.localityCard.querySelector("#localityMap");
  if (!mapElement) {
    console.error(
      `[Map prototype] Map container was not found in the DOM for ${locality.hebrewName}.`
    );
    renderMapFallback();
    return;
  }

  try {
    renderLocalityMap(locality, mapElement);
  } catch (error) {
    console.error("Map prototype failed:", error);
    renderMapFallback();
  }
}

function renderLoadingState() {
  elements.localityCard.innerHTML = "<p>טוען יישובים...</p>";
  elements.cardProgress.textContent = "טוען...";
  elements.microChallenge.textContent = "";
}

function showLocalitiesLoadError() {
  elements.localityCard.innerHTML =
    "<p>לא הצלחנו לטעון את היישובים. ודאו שהשרת פועל ונסו לרענן את הדף.</p>";
  elements.cardProgress.textContent = "הנתונים לא נטענו";
  elements.microChallenge.textContent = "";
  elements.backendStatus.textContent =
    "סטטוס מפתחים: טעינת היישובים נכשלה גם מה-API וגם מנתוני ה-fallback.";
}

function showPrototypeCoordinatesError() {
  elements.localityCard.innerHTML =
    "<p>אב־טיפוס המפה לא מצא יישובים עם קואורדינטות. בדקו את קובץ הקואורדינטות ואת השרת.</p>";
  elements.cardProgress.textContent = "0 יישובים עם קואורדינטות";
  elements.microChallenge.textContent = "";
  elements.backendStatus.textContent =
    "סטטוס מפתחים: שגיאה — לא נטענו קואורדינטות מ-data/locality-coordinates.prototype.json.";
}

function renderEnrichedPrototypeStatus() {
  if (!IS_ENRICHED_PROTOTYPE) {
    return;
  }

  elements.enrichedPrototypeNotice.hidden = false;
  if (!enrichedPrototypeMissing.length) {
    elements.enrichedPrototypeMissing.textContent = "";
    return;
  }

  const missingNames = enrichedPrototypeMissing.map((item) => item.name);
  const message = `לא ניתן להציג את יישובי הפיילוט הבאים: ${missingNames.join(", ")}.`;
  elements.enrichedPrototypeMissing.textContent = message;
  console.error(`[Enriched prototype] ${message}`);
}

function showEnrichedPrototypeEmptyState() {
  elements.localityCard.innerHTML =
    "<p>לא נמצאו יישובי פיילוט זמינים להצגה. פרטי היישובים החסרים מופיעים מעל הכרטיס.</p>";
  elements.cardProgress.textContent = "אין יישובי פיילוט זמינים";
  elements.microChallenge.textContent = "";
}

function renderLocalityMapMarkup(locality) {
  if (!ENABLE_CONTEXT_MAP_PROTOTYPE) {
    return "";
  }

  // A later experiment can hide the map until the user guesses the region.
  if (!hasLocalityCoordinates(locality)) {
    return `
      <div class="locality-map-fallback" role="status">
        מפת ההתמצאות עדיין אינה זמינה ליישוב זה.
      </div>
    `;
  }

  return `
    <div class="locality-map-wrapper">
      <div class="locality-map" id="localityMap" aria-label="מפת התמצאות עבור ${escapeHtml(locality.hebrewName)}"></div>
      <p class="locality-map-caption">מפת התמצאות · רדיוס 5 ק״מ ממרכז היישוב</p>
    </div>
  `;
}

function renderLocalityMap(locality, mapElement) {
  if (!ENABLE_CONTEXT_MAP_PROTOTYPE || !hasLocalityCoordinates(locality)) {
    return;
  }

  if (!mapElement || !mapElement.isConnected) {
    console.error(
      `[Map prototype] Refusing to initialize the map before its container is in the DOM for ${locality.hebrewName}.`
    );
    return;
  }

  if (!window.L) {
    showMapUnavailable(mapElement);
    return;
  }

  try {
    const center = [Number(locality.latitude), Number(locality.longitude)];
    activeLocalityMap = window.L.map(mapElement, {
      scrollWheelZoom: false,
      attributionControl: true
    }).setView(center, 12);

    window.L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(activeLocalityMap);

    const markerIcon = window.L.divIcon({
      className: "locality-map-marker-shell",
      html: '<span class="locality-map-marker-dot" aria-hidden="true"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16]
    });
    const popupName = document.createElement("strong");
    popupName.textContent = locality.hebrewName;
    window.L.marker(center, {
      icon: markerIcon,
      title: locality.hebrewName,
      alt: `מרכז ${locality.hebrewName}`
    }).addTo(activeLocalityMap).bindPopup(popupName);

    const radiusCircle = window.L.circle(center, {
      radius: MAP_RADIUS_METERS,
      color: "#104b33",
      weight: 2,
      opacity: 0.9,
      fillColor: "#25d366",
      fillOpacity: 0.11
    }).addTo(activeLocalityMap);
    activeLocalityMap.fitBounds(radiusCircle.getBounds(), {
      padding: [18, 18],
      animate: false
    });

    window.setTimeout(() => {
      activeLocalityMap?.invalidateSize({ animate: false });
    }, 0);
  } catch (error) {
    console.error("Context map prototype failed:", error);
    mapElement.dataset.mapError = error instanceof Error ? error.message : String(error);
    disposeActiveLocalityMap();
    showMapUnavailable(mapElement);
  }
}

function disposeActiveLocalityMap() {
  if (!activeLocalityMap) {
    return;
  }
  try {
    activeLocalityMap.remove();
  } catch (error) {
    console.error("Failed to dispose context map:", error);
  } finally {
    activeLocalityMap = null;
  }
}

function showMapUnavailable(mapElement) {
  mapElement.classList.add("locality-map-unavailable");
  mapElement.textContent = "מפת ההתמצאות אינה זמינה כרגע.";
}

function renderMapFallback() {
  const mapElement = document.getElementById("localityMap");
  if (mapElement) {
    showMapUnavailable(mapElement);
    return;
  }

  if (!elements.localityCard.querySelector(".locality-map-fallback")) {
    const fallback = document.createElement("div");
    fallback.className = "locality-map-fallback";
    fallback.setAttribute("role", "status");
    fallback.textContent = "מפת ההתמצאות אינה זמינה כרגע.";
    elements.localityCard.append(fallback);
  }
}

function hasLocalityCoordinates(locality) {
  if (locality?.latitude === null
    || locality?.latitude === undefined
    || locality?.longitude === null
    || locality?.longitude === undefined
    || String(locality.latitude).trim() === ""
    || String(locality.longitude).trim() === "") {
    return false;
  }

  const latitude = Number(locality?.latitude);
  const longitude = Number(locality?.longitude);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAlbum() {
  const total = Number(progress.totalCount || backendStatus.localitiesCount || 0);
  const shown = Number(progress.shownCount || 0);
  const percent = total ? Math.round((shown / total) * 100) : 0;

  elements.streakCount.textContent = state.streak;
  elements.regionsUnlocked.textContent = Number(progress.regionsUnlocked || 0);
  elements.shownCount.textContent = shown;
  elements.albumFill.style.width = `${percent}%`;
}

async function subscribe(event) {
  event.preventDefault();
  if (blockPrototypeMutation()) {
    return;
  }
  if (!requirePhoneValue()) {
    return;
  }

  const settings = getFormSettings();
  if (!settings.consentAccepted) {
    elements.formStatus.textContent = "צריך לאשר קבלת הודעת WhatsApp יומית לפני ההרשמה.";
    return;
  }

  state.settings = { ...state.settings, ...settings };
  saveState();

  try {
    const response = await fetch(`${API_BASE}/api/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "subscribe_failed");
    }

    state.settings.id = data.subscriber.id;
    state.settings.phoneNumber = data.subscriber.phoneNumber;
    elements.phoneInput.value = data.subscriber.phoneNumber;
    progress = data.progress || progress;
    applyPreviewData(data);
    elements.formStatus.textContent = data.mockMode
      ? "נרשמת במצב בדיקה. ההודעות יודפסו בשרת ולא יישלחו בפועל."
      : "נרשמת. ההודעות יישלחו דרך WhatsApp Cloud API.";
    renderLocalityCard();
    renderAlbum();
  } catch (error) {
    elements.formStatus.textContent = friendlyApiError(error.message, "לא הצלחתי להירשם מול השרת.");
  }
}

async function sendTest() {
  if (blockPrototypeMutation()) {
    return;
  }
  if (!requirePhoneValue()) {
    return;
  }

  const settings = getFormSettings();
  if (!settings.consentAccepted) {
    elements.formStatus.textContent = "צריך לאשר הסכמה לפני הודעת בדיקה.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "send_test_failed");
    }

    progress = data.progress || progress;
    todaysBatch = data.batch || todaysBatch;
    todaysMessages = data.messages || todaysMessages;
    elements.messagePreview.textContent = todaysMessages.join("\n\n---\n\n");
    elements.formStatus.textContent = data.mockMode
      ? "מצב בדיקה: ההודעה הודפסה בשרת ולא נשלחה בפועל"
      : "הודעת בדיקה נשלחה ל-WhatsApp.";
    renderLocalityCard();
    renderAlbum();
  } catch (error) {
    elements.formStatus.textContent = friendlyApiError(error.message, "השרת לא זמין לשליחת בדיקה.");
  }
}

async function unsubscribe() {
  if (blockPrototypeMutation()) {
    return;
  }
  if (!requirePhoneValue() && !state.settings.id) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: state.settings.id,
        phoneNumber: elements.phoneInput.value.trim()
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "unsubscribe_failed");
    }
    progress = data.progress || progress;
    elements.formStatus.textContent = "המנוי כובה.";
  } catch (error) {
    elements.formStatus.textContent = friendlyApiError(error.message, "לא הצלחתי לכבות את המנוי מול השרת.");
  }
}

async function openManualWhatsApp() {
  if (blockPrototypeMutation()) {
    return;
  }
  if (!requirePhoneValue()) {
    return;
  }

  try {
    const data = await fetchPreview(getFormSettings());
    if (!data.phoneValid || !data.normalizedPhone) {
      throw new Error("invalid_israeli_phone");
    }
    applyPreviewData(data);
    const url = `https://wa.me/${data.normalizedPhone}?text=${encodeURIComponent(data.message || "")}`;
    window.open(url, "_blank", "noopener");
    elements.formStatus.textContent = "שליחה ידנית זמינה עכשיו. פתחנו WhatsApp עם ההודעה מוכנה.";
  } catch (error) {
    elements.formStatus.textContent = friendlyApiError(error.message, "לא הצלחתי להכין שליחה ידנית.");
  }
}

function updateVisitStreak() {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (state.lastVisitDate === todayKey) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  state.streak = state.lastVisitDate === yesterdayKey ? state.streak + 1 : 1;
  state.lastVisitDate = todayKey;
  saveState();
}

function revealRegion() {
  regionRevealed = true;
  renderLocalityCard();
}

function revealFacts() {
  factsRevealed = true;
  renderLocalityCard();
}

async function nextLocality() {
  const locality = todaysBatch[currentIndex];
  if (!IS_ENRICHED_PROTOTYPE
    && locality
    && (state.settings.id || elements.phoneInput.value.trim())) {
    try {
      const response = await fetch(`${API_BASE}/api/progress/mark-shown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.settings.id,
          phoneNumber: elements.phoneInput.value.trim(),
          localityId: locality.id
        })
      });
      const data = await response.json();
      if (response.ok) {
        progress = data.progress || progress;
      }
    } catch {
      elements.formStatus.textContent = "ההתקדמות לא נשמרה כי השרת אינו זמין.";
    }
  }

  currentIndex = IS_ENRICHED_PROTOTYPE
    ? (window.YISHUV_ENRICHED_PROTOTYPE?.nextPrototypeIndex(
        currentIndex,
        todaysBatch.length
      ) ?? 0)
    : (currentIndex + 1) % Math.max(1, todaysBatch.length);
  regionRevealed = IS_ENRICHED_PROTOTYPE;
  factsRevealed = IS_ENRICHED_PROTOTYPE;
  renderLocalityCard();
  renderAlbum();
}

function requestBrowserReminder() {
  if (blockPrototypeMutation()) {
    return;
  }
  if (!("Notification" in window)) {
    elements.formStatus.textContent = "הדפדפן לא תומך בהתראות. הכיוון המרכזי הוא WhatsApp.";
    return;
  }

  Notification.requestPermission().then((permission) => {
    elements.formStatus.textContent = permission === "granted"
      ? "התראות דפדפן אושרו. זה משני ל-WhatsApp ותלוי בדפדפן."
      : "התראות דפדפן לא אושרו.";
  });
}

function tomorrowMore() {
  if (blockPrototypeMutation()) {
    return;
  }
  elements.dailyCountInput.value = "5";
  refreshPreview();
  elements.formStatus.textContent = "סידרתי את ההגדרה ל-5 יישובים. שמרו הרשמה כדי לעדכן את השרת.";
}

function friendlyApiError(code, fallback) {
  const messages = {
    consent_required: "צריך לאשר קבלת הודעת WhatsApp יומית.",
    phone_required: "יש להזין מספר WhatsApp ישראלי.",
    invalid_israeli_phone: "מספר WhatsApp ישראלי לא תקין. נסו פורמט כמו 05XXXXXXXX או +9725XXXXXXXX.",
    subscriber_not_found: "לא נמצא מנוי מתאים.",
    invalid_locality: "היישוב שנבחר אינו תקין."
  };
  return messages[code] || fallback;
}

function blockPrototypeMutation() {
  if (!IS_ENRICHED_PROTOTYPE) {
    return false;
  }
  elements.formStatus.textContent =
    "מצב הפיילוט הוא לצפייה בלבד. חזרו למסלול היומי כדי לשנות הגדרות.";
  return true;
}

function configureEnrichedPrototypeMode() {
  if (!IS_ENRICHED_PROTOTYPE) {
    return;
  }
  elements.enrichedPrototypeNotice.hidden = false;
  elements.subscribeForm
    .querySelectorAll("input, select, button")
    .forEach((control) => {
      control.disabled = true;
    });
}

[
  elements.dailyCountInput,
  elements.sendTimeInput,
  elements.orderModeInput,
  elements.messageStyleInput
].forEach((element) => element.addEventListener("change", refreshPreview));
elements.nameInput.addEventListener("input", refreshPreview);

elements.subscribeForm.addEventListener("submit", subscribe);
elements.sendTestButton.addEventListener("click", sendTest);
elements.manualWhatsAppButton.addEventListener("click", openManualWhatsApp);
elements.unsubscribeButton.addEventListener("click", unsubscribe);
elements.revealRegionButton.addEventListener("click", revealRegion);
elements.revealFactsButton.addEventListener("click", revealFacts);
elements.nextLocalityButton.addEventListener("click", nextLocality);
elements.browserReminderButton.addEventListener("click", requestBrowserReminder);
elements.tomorrowMoreButton.addEventListener("click", tomorrowMore);

document.getElementById("leafletScript")?.addEventListener("load", () => {
  const locality = todaysBatch[currentIndex];
  if (ENABLE_CONTEXT_MAP_PROTOTYPE && locality && !activeLocalityMap) {
    renderLocalityCard();
  }
});

async function initializeApp() {
  const loadSequence = ++localityLoadSequence;
  configureEnrichedPrototypeMode();
  applySettingsToForm();
  if (!IS_ENRICHED_PROTOTYPE) {
    updateVisitStreak();
  }
  renderLoadingState();
  await loadBackendStatus();

  try {
    const result = await loadLocalities(getFormSettings());
    if (loadSequence !== localityLoadSequence) {
      return;
    }
    setLocalities(result);
    initializeDailyBatch();
    renderApp();
  } catch (error) {
    if (loadSequence !== localityLoadSequence) {
      return;
    }
    console.error("Failed to initialize localities:", error);
    if (error.code === "prototype_coordinates_empty"
      || error.code === "prototype_coordinates_invalid") {
      showPrototypeCoordinatesError();
    } else {
      showLocalitiesLoadError();
    }
  }
}

void initializeApp();
