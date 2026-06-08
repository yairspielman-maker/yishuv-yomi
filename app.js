const STORAGE_KEY = "yishuv-yomi-whatsapp-v1";
const FALLBACK_FACT = "אין מידע קצר זמין כרגע";
const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

const localities = window.YISHUV_LOCALITIES || [];
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
  tomorrowMoreButton: document.getElementById("tomorrowMoreButton")
};

let todaysBatch = [];
let currentIndex = 0;
let regionRevealed = false;
let factsRevealed = false;
let backendStatus = {
  backendRunning: false,
  whatsappMode: "mock",
  hasToken: false,
  hasPhoneNumberId: false,
  dataSource: "mock",
  localitiesCount: localities.length
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      settings: {
        name: "יונדב",
        phoneNumber: "",
        dailyCount: 3,
        sendTime: "09:00",
        orderMode: "region",
        messageStyle: "short",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem",
        ...(stored.settings || {})
      },
      shownIds: Array.isArray(stored.shownIds) ? stored.shownIds : [],
      streak: Number(stored.streak || 1),
      lastVisitDate: stored.lastVisitDate || null
    };
  } catch {
    return {
      settings: {
        name: "יונדב",
        phoneNumber: "",
        dailyCount: 3,
        sendTime: "09:00",
        orderMode: "region",
        messageStyle: "short",
        timezone: "Asia/Jerusalem"
      },
      shownIds: [],
      streak: 1,
      lastVisitDate: null
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getFormSettings() {
  const normalizedPhone = normalizeIsraeliPhone(elements.phoneInput.value);
  return {
    name: elements.nameInput.value.trim() || "יונדב",
    phoneNumber: normalizedPhone.value || elements.phoneInput.value.trim(),
    dailyCount: clampDailyCount(elements.dailyCountInput.value),
    sendTime: elements.sendTimeInput.value || "09:00",
    orderMode: elements.orderModeInput.value,
    messageStyle: elements.messageStyleInput.value,
    timezone: state.settings.timezone,
    consentAccepted: elements.consentInput.checked
  };
}

function normalizeIsraeliPhone(rawPhone) {
  const compact = String(rawPhone || "").replace(/[\s\-().]/g, "");
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;

  if (/^0\d{9}$/.test(digits)) {
    digits = `972${digits.slice(1)}`;
  }

  if (/^9720\d{9}$/.test(digits)) {
    digits = `972${digits.slice(4)}`;
  }

  if (!/^9725\d{8}$/.test(digits)) {
    return { ok: false, value: "", error: "מספר וואטסאפ ישראלי לא תקין. נסו פורמט כמו 05XXXXXXXX, +9725XXXXXXXX או 9725XXXXXXXX." };
  }

  return { ok: true, value: digits, error: "" };
}

function requireValidPhone() {
  const result = normalizeIsraeliPhone(elements.phoneInput.value);
  if (!result.ok) {
    elements.formStatus.textContent = result.error;
    return null;
  }

  elements.phoneInput.value = result.value;
  return result.value;
}

function applySettingsToForm() {
  elements.nameInput.value = state.settings.name;
  elements.phoneInput.value = state.settings.phoneNumber;
  elements.dailyCountInput.value = String(state.settings.dailyCount);
  elements.sendTimeInput.value = state.settings.sendTime;
  elements.orderModeInput.value = state.settings.orderMode;
  elements.messageStyleInput.value = state.settings.messageStyle;
}

function clampDailyCount(value) {
  return Math.min(5, Math.max(1, Number(value) || 3));
}

function getOrderedLocalities(settings = state.settings) {
  if (settings.orderMode === "official") {
    return [...localities].sort((a, b) => Number(a.officialCode || 0) - Number(b.officialCode || 0));
  }

  if (settings.orderMode === "random") {
    return shuffle(localities);
  }

  return [...localities].sort((a, b) => {
    const region = String(a.region || "").localeCompare(String(b.region || ""), "he");
    return region || Number(a.officialCode || 0) - Number(b.officialCode || 0);
  });
}

function pickPreviewBatch(settings = state.settings) {
  const shown = new Set(state.shownIds);
  const ordered = getOrderedLocalities(settings);
  const remaining = ordered.filter((locality) => !shown.has(locality.id));
  const source = remaining.length ? remaining : ordered;
  return source.slice(0, clampDailyCount(settings.dailyCount));
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function getFacts(locality) {
  const facts = Array.isArray(locality.facts) ? locality.facts.filter(Boolean) : [];
  return facts.length ? facts.slice(0, 4) : [FALLBACK_FACT];
}

function createLocalityMessages(settings, batch) {
  return batch.map((locality, index) => createSingleLocalityMessage(settings, locality, index, batch.length));
}

function createSingleLocalityMessage(settings, locality, index, total) {
  const factLimit = settings.messageStyle === "detailed" ? 4 : 3;
  const lines = [
    `יישוב ${index + 1} מתוך ${total}:`,
    locality.hebrewName,
    `אזור: ${locality.region || "אזור לא זמין"}`,
    `סוג: ${locality.localityType || "סוג לא זמין"}`,
    "עובדות:",
    ...getFacts(locality).slice(0, factLimit).map((fact) => `• ${fact}`)
  ];

  if (settings.messageStyle === "challenge") {
    lines.push("", `ניחוש מהיר: באיזה מחוז נמצא ${locality.hebrewName}?`);
  }

  return lines.join("\n");
}

async function loadBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/status`);
    if (!response.ok) {
      throw new Error("status failed");
    }
    backendStatus = await response.json();
    renderBackendStatus();
  } catch {
    backendStatus = {
      backendRunning: false,
      whatsappMode: "mock",
      hasToken: false,
      hasPhoneNumberId: false,
      dataSource: "mock",
      localitiesCount: localities.length
    };
    renderBackendStatus(true);
  }
}

function renderBackendStatus(isOffline = false) {
  if (isOffline) {
    elements.backendStatus.textContent = "סטטוס מפתחים: השרת לא זמין. הריצו npm start ופתחו http://localhost:3000.";
    return;
  }

  elements.backendStatus.textContent = `סטטוס מפתחים: backend פעיל: ${backendStatus.backendRunning ? "true" : "false"}, מקור נתונים: ${backendStatus.dataSource}, יישובים: ${backendStatus.localitiesCount}, WhatsApp: ${backendStatus.whatsappMode}, token: ${backendStatus.hasToken ? "יש" : "אין"}, phone id: ${backendStatus.hasPhoneNumberId ? "יש" : "אין"}.`;
}

async function refreshPreview() {
  const settings = getFormSettings();
  state.settings = { ...state.settings, ...settings };
  saveState();

  try {
    const params = new URLSearchParams({
      name: settings.name,
      dailyCount: settings.dailyCount,
      orderMode: settings.orderMode,
      messageStyle: settings.messageStyle
    });
    const response = await fetch(`${API_BASE}/api/today-preview?${params}`);
    if (!response.ok) {
      throw new Error("preview failed");
    }
    const data = await response.json();
    todaysBatch = data.batch || [];
    elements.messagePreview.textContent = Array.isArray(data.messages) ? data.messages.join("\n\n---\n\n") : data.message;
  } catch {
    todaysBatch = pickPreviewBatch(settings);
    elements.messagePreview.textContent = createLocalityMessages(settings, todaysBatch).join("\n\n---\n\n");
  }

  currentIndex = 0;
  regionRevealed = false;
  factsRevealed = false;
  renderLocalityCard();
  renderAlbum();
}

function renderLocalityCard() {
  const locality = todaysBatch[currentIndex];
  if (!locality) {
    elements.localityCard.innerHTML = "<p>אין יישובים להצגה כרגע.</p>";
    return;
  }

  elements.cardProgress.textContent = `${currentIndex + 1} מתוך ${todaysBatch.length}`;
  elements.localityCard.innerHTML = `
    <h3 class="locality-name">${locality.hebrewName}</h3>
    <p class="english-name">${locality.englishName || ""}</p>
    <p class="secret-line">${regionRevealed ? `${locality.region || "אזור לא זמין"} · ${locality.district || "מחוז לא זמין"} · ${locality.localityType || "סוג לא זמין"}` : "האזור עדיין מוסתר"}</p>
    <div class="secret-line">
      ${factsRevealed ? `<ul class="facts">${getFacts(locality).map((fact) => `<li>${fact}</li>`).join("")}</ul>` : "העובדות יופיעו אחרי לחיצה"}
    </div>
  `;
  elements.microChallenge.textContent = `ניחוש מהיר: באיזה אזור זה? ${regionRevealed ? locality.region : "לחצו על גלו אזור כדי לבדוק"}`;
}

function renderAlbum() {
  const shown = new Set([...state.shownIds, ...todaysBatch.map((locality) => locality.id)]);
  const regions = new Set([...shown].map((id) => localities.find((locality) => locality.id === id)?.region).filter(Boolean));
  const percent = localities.length ? Math.round((shown.size / localities.length) * 100) : 0;

  elements.streakCount.textContent = state.streak;
  elements.regionsUnlocked.textContent = regions.size;
  elements.shownCount.textContent = shown.size;
  elements.albumFill.style.width = `${percent}%`;
}

async function subscribe(event) {
  event.preventDefault();
  if (!requireValidPhone()) {
    return;
  }
  const settings = getFormSettings();
  if (!settings.consentAccepted) {
    elements.formStatus.textContent = "צריך לאשר קבלת הודעת וואטסאפ יומית לפני הרשמה.";
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
      throw new Error(data.error || "subscribe failed");
    }
    elements.formStatus.textContent = data.mockMode
      ? "נרשמת במצב בדיקה. ההודעות יודפסו בשרת ולא יישלחו בפועל."
      : "נרשמת. ההודעות יישלחו דרך WhatsApp Cloud API.";
    elements.messagePreview.textContent = Array.isArray(data.messages) ? data.messages.join("\n\n---\n\n") : data.message || elements.messagePreview.textContent;
  } catch (error) {
    elements.formStatus.textContent = `לא הצלחתי להירשם מול השרת: ${error.message}`;
  }
}

async function sendTest() {
  if (!requireValidPhone()) {
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
      throw new Error(data.error || "send test failed");
    }
    elements.formStatus.textContent = data.mockMode
      ? "מצב בדיקה: ההודעה הודפסה בשרת ולא נשלחה בפועל"
      : "הודעת בדיקה נשלחה לוואטסאפ.";
    elements.messagePreview.textContent = Array.isArray(data.messages) ? data.messages.join("\n\n---\n\n") : data.message || elements.messagePreview.textContent;
  } catch (error) {
    elements.formStatus.textContent = `השרת לא זמין לשליחת בדיקה: ${error.message}`;
  }
}

async function unsubscribe() {
  const phoneNumber = requireValidPhone();
  if (!phoneNumber) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "unsubscribe failed");
    }
    elements.formStatus.textContent = "המנוי כובה.";
  } catch (error) {
    elements.formStatus.textContent = `לא הצלחתי לכבות מול השרת: ${error.message}`;
  }
}

function openManualWhatsApp() {
  const phoneNumber = requireValidPhone();
  if (!phoneNumber) {
    return;
  }

  const settings = getFormSettings();
  const batch = todaysBatch.length ? todaysBatch : pickPreviewBatch(settings);
  const message = createLocalityMessages(settings, batch).join("\n\n");
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
  elements.formStatus.textContent = "שליחה ידנית זמינה עכשיו. פתחנו וואטסאפ עם הודעה מוכנה. שליחה אוטומטית אמיתית תופעל רק אחרי חיבור WhatsApp Cloud API.";
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

function nextLocality() {
  const locality = todaysBatch[currentIndex];
  if (locality && !state.shownIds.includes(locality.id)) {
    state.shownIds.push(locality.id);
    saveState();
  }

  currentIndex = (currentIndex + 1) % Math.max(1, todaysBatch.length);
  regionRevealed = false;
  factsRevealed = false;
  renderLocalityCard();
  renderAlbum();
}

function requestBrowserReminder() {
  if (!("Notification" in window)) {
    elements.formStatus.textContent = "הדפדפן לא תומך בהתראות. הכיוון המרכזי הוא וואטסאפ.";
    return;
  }

  Notification.requestPermission().then((permission) => {
    elements.formStatus.textContent = permission === "granted"
      ? "התראות דפדפן אושרו. זה משני לוואטסאפ ותלוי בדפדפן."
      : "התראות דפדפן לא אושרו.";
  });
}

function tomorrowMore() {
  elements.dailyCountInput.value = "5";
  refreshPreview();
  elements.formStatus.textContent = "סידרתי את ההגדרה ל-5 יישובים. שמרו הרשמה כדי לעדכן את השרת.";
}

["change", "input"].forEach((eventName) => {
  [
    elements.dailyCountInput,
    elements.sendTimeInput,
    elements.orderModeInput,
    elements.messageStyleInput,
    elements.nameInput
  ].forEach((element) => element.addEventListener(eventName, refreshPreview));
});

elements.subscribeForm.addEventListener("submit", subscribe);
elements.sendTestButton.addEventListener("click", sendTest);
elements.manualWhatsAppButton.addEventListener("click", openManualWhatsApp);
elements.unsubscribeButton.addEventListener("click", unsubscribe);
elements.revealRegionButton.addEventListener("click", revealRegion);
elements.revealFactsButton.addEventListener("click", revealFacts);
elements.nextLocalityButton.addEventListener("click", nextLocality);
elements.browserReminderButton.addEventListener("click", requestBrowserReminder);
elements.tomorrowMoreButton.addEventListener("click", tomorrowMore);

applySettingsToForm();
updateVisitStreak();
loadBackendStatus();
refreshPreview();
