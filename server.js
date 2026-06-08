const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
let express;
try {
  express = require("express");
} catch {
  express = require("./lib/mini-express");
}

const PORT = Number(process.env.PORT || 3000);
const APP_ROOT = __dirname;
const STORAGE_PATH = path.join(__dirname, "data", "subscribers.json");
const OFFICIAL_LOCALITIES_PATH = path.join(__dirname, "data", "localities.official.json");
const FALLBACK_FACT = "אין מידע קצר זמין כרגע";
const LIVE_SEND_DELAY_MIN_MS = 700;
const LIVE_SEND_DELAY_MAX_MS = 1200;
const LOCALITY_DATA = loadLocalities();
const LOCALITIES = LOCALITY_DATA.localities;

const app = express();

app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "256kb" }));

app.get("/api/status", (request, response) => {
  response.json({
    backendRunning: true,
    whatsappMode: isMockMode() ? "mock" : "live",
    hasToken: Boolean(process.env.WHATSAPP_TOKEN),
    hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    localitiesCount: LOCALITIES.length,
    dataSource: LOCALITY_DATA.source
  });
});

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    backendRunning: true,
    whatsappMode: isMockMode() ? "mock" : "live",
    dataSource: LOCALITY_DATA.source,
    localities: LOCALITIES.length
  });
});

app.get("/api/localities/count", (request, response) => {
  response.json({
    count: LOCALITIES.length,
    dataSource: LOCALITY_DATA.source
  });
});

app.get("/api/localities/sample", (request, response) => {
  const limit = Math.min(20, Math.max(1, Number(request.query.limit || 5)));
  const orderMode = ["random", "region", "official"].includes(request.query.orderMode) ? request.query.orderMode : "region";
  response.json({
    dataSource: LOCALITY_DATA.source,
    count: LOCALITIES.length,
    localities: getOrderedLocalities(orderMode).slice(0, limit)
  });
});

app.get("/api/localities/regions", (request, response) => {
  const regions = [...new Set(LOCALITIES.map((locality) => locality.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
  response.json({
    dataSource: LOCALITY_DATA.source,
    count: regions.length,
    regions
  });
});

app.get("/api/today-preview", (request, response) => {
  const settings = normalizeSettings(request.query);
  const batch = pickNextBatch({ ...settings, shownLocalityIds: [] });
  const messages = createLocalityMessages(settings, batch);

  response.json({
    mockMode: isMockMode(),
    batch,
    messages,
    message: messages.join("\n\n")
  });
});

app.post("/api/subscribe", (request, response) => {
  const settings = normalizeSettings(request.body);
  if (!settings.consentAccepted) {
    response.status(400).json({ error: "consent_required" });
    return;
  }
  if (!settings.phoneNumber) {
    response.status(400).json({ error: "phone_required" });
    return;
  }
  if (!isValidIsraeliPhone(settings.phoneNumber)) {
    response.status(400).json({ error: "invalid_israeli_phone" });
    return;
  }

  const storage = readStorage();
  const now = new Date().toISOString();
  let subscriber = storage.subscribers.find((item) => item.phoneNumber === settings.phoneNumber);

  if (!subscriber) {
    subscriber = {
      id: crypto.randomUUID(),
      shownLocalityIds: [],
      completedCycles: 0,
      totalShownCount: 0,
      lastSentDate: null,
      createdAt: now
    };
    storage.subscribers.push(subscriber);
  }

  Object.assign(subscriber, {
    name: settings.name,
    phoneNumber: settings.phoneNumber,
    dailyCount: settings.dailyCount,
    sendTime: settings.sendTime,
    orderMode: settings.orderMode,
    messageStyle: settings.messageStyle,
    timezone: settings.timezone,
    consentAccepted: true,
    isActive: true
  });

  writeStorage(storage);

  const batch = pickNextBatch(subscriber);
  const messages = createLocalityMessages(subscriber, batch);
  response.json({
    ok: true,
    mockMode: isMockMode(),
    subscriber: publicSubscriber(subscriber),
    batch,
    messages,
    message: messages.join("\n\n")
  });
});

app.post("/api/unsubscribe", (request, response) => {
  const phoneNumber = normalizePhone(request.body.phoneNumber || "");
  const id = String(request.body.id || "");
  const storage = readStorage();
  const subscriber = storage.subscribers.find((item) => item.id === id || item.phoneNumber === phoneNumber);

  if (!subscriber) {
    response.status(404).json({ error: "subscriber_not_found" });
    return;
  }

  subscriber.isActive = false;
  writeStorage(storage);
  response.json({ ok: true, subscriber: publicSubscriber(subscriber) });
});

app.post("/api/send-test", async (request, response) => {
  const settings = normalizeSettings(request.body);
  if (!settings.consentAccepted) {
    response.status(400).json({ error: "consent_required" });
    return;
  }
  if (!settings.phoneNumber) {
    response.status(400).json({ error: "phone_required" });
    return;
  }
  if (!isValidIsraeliPhone(settings.phoneNumber)) {
    response.status(400).json({ error: "invalid_israeli_phone" });
    return;
  }

  const batch = pickNextBatch({ ...settings, shownLocalityIds: [] });
  const messages = createLocalityMessages(settings, batch);
  const result = await sendWhatsAppMessages(settings.phoneNumber, messages);

  response.status(result.ok ? 200 : 502).json({
    ok: result.ok,
    ...result,
    batch,
    messages,
    message: messages.join("\n\n")
  });
});

app.post("/api/reset-progress", (request, response) => {
  const phoneNumber = normalizePhone(request.body.phoneNumber || "");
  const id = String(request.body.id || "");
  const storage = readStorage();
  const subscriber = storage.subscribers.find((item) => item.id === id || item.phoneNumber === phoneNumber);

  if (!subscriber) {
    response.status(404).json({ error: "subscriber_not_found" });
    return;
  }

  subscriber.shownLocalityIds = [];
  subscriber.lastSentDate = null;
  writeStorage(storage);
  response.json({ ok: true, subscriber: publicSubscriber(subscriber) });
});

app.use(express.static(APP_ROOT));
app.get("*", (request, response) => {
  response.sendFile(path.join(APP_ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log(`יישוב יומי running at http://localhost:${PORT}`);
  console.log(isMockMode() ? "WhatsApp mock mode: missing Cloud API env vars." : "WhatsApp Cloud API mode enabled.");
});

setInterval(runScheduler, 60 * 1000);
runScheduler();

function loadLocalities() {
  if (fs.existsSync(OFFICIAL_LOCALITIES_PATH)) {
    const payload = JSON.parse(fs.readFileSync(OFFICIAL_LOCALITIES_PATH, "utf8"));
    if (Array.isArray(payload.localities) && payload.localities.length) {
      return {
        source: "official",
        localities: payload.localities,
        importedAt: payload.importedAt || null,
        resourceId: payload.resourceId || null
      };
    }
  }

  const dataPath = path.join(APP_ROOT, "data", "localities.mock.js");
  const code = fs.readFileSync(dataPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: dataPath });
  return {
    source: "mock",
    localities: context.window.YISHUV_LOCALITIES || [],
    importedAt: null,
    resourceId: null
  };
}

function readStorage() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(STORAGE_PATH, "utf8"));
}

function writeStorage(storage) {
  fs.writeFileSync(STORAGE_PATH, `${JSON.stringify(storage, null, 2)}\n`, "utf8");
}

function ensureStorage() {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  if (!fs.existsSync(STORAGE_PATH)) {
    writeStorage({ subscribers: [], mockMessages: [] });
  }
}

function normalizeSettings(input) {
  return {
    id: input.id || "",
    name: String(input.name || "יונדב").trim() || "יונדב",
    phoneNumber: normalizePhone(input.phoneNumber || ""),
    dailyCount: Math.min(5, Math.max(1, Number(input.dailyCount || 3))),
    sendTime: /^\d{2}:\d{2}$/.test(String(input.sendTime || "")) ? String(input.sendTime) : "09:00",
    orderMode: ["random", "region", "official"].includes(input.orderMode) ? input.orderMode : "region",
    messageStyle: ["short", "detailed", "challenge"].includes(input.messageStyle) ? input.messageStyle : "short",
    timezone: String(input.timezone || "Asia/Jerusalem"),
    consentAccepted: input.consentAccepted === true || input.consentAccepted === "true",
    shownLocalityIds: Array.isArray(input.shownLocalityIds) ? input.shownLocalityIds : []
  };
}

function normalizePhone(phoneNumber) {
  const compact = String(phoneNumber || "").replace(/[\s\-().]/g, "");
  let digits = compact.startsWith("+") ? compact.slice(1) : compact.replace(/[^\d]/g, "");

  if (/^0\d{9}$/.test(digits)) {
    digits = `972${digits.slice(1)}`;
  }

  if (/^9720\d{9}$/.test(digits)) {
    digits = `972${digits.slice(4)}`;
  }

  return digits;
}

function isValidIsraeliPhone(phoneNumber) {
  return /^9725\d{8}$/.test(String(phoneNumber || ""));
}

function publicSubscriber(subscriber) {
  return {
    id: subscriber.id,
    name: subscriber.name,
    phoneNumber: subscriber.phoneNumber,
    dailyCount: subscriber.dailyCount,
    sendTime: subscriber.sendTime,
    orderMode: subscriber.orderMode,
    messageStyle: subscriber.messageStyle,
    timezone: subscriber.timezone,
    consentAccepted: subscriber.consentAccepted,
    isActive: subscriber.isActive,
    shownCount: subscriber.shownLocalityIds.length,
    completedCycles: Number(subscriber.completedCycles || 0),
    totalShownCount: Number(subscriber.totalShownCount || 0),
    lastSentDate: subscriber.lastSentDate,
    createdAt: subscriber.createdAt
  };
}

function pickNextBatch(user) {
  const shown = new Set(user.shownLocalityIds || []);
  const ordered = getOrderedLocalities(user.orderMode);
  let remaining = ordered.filter((locality) => !shown.has(locality.id));

  if (!remaining.length) {
    user.completedCycles = Number(user.completedCycles || 0) + 1;
    user.shownLocalityIds = [];
    remaining = ordered;
  }

  return remaining.slice(0, Math.min(5, Math.max(1, Number(user.dailyCount || 3))));
}

function getOrderedLocalities(orderMode) {
  if (orderMode === "official") {
    return [...LOCALITIES].sort((a, b) => Number(a.officialCode || 0) - Number(b.officialCode || 0));
  }

  if (orderMode === "random") {
    return shuffle(LOCALITIES);
  }

  return [...LOCALITIES].sort((a, b) => {
    const region = String(a.region || "").localeCompare(String(b.region || ""), "he");
    return region || Number(a.officialCode || 0) - Number(b.officialCode || 0);
  });
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createLocalityMessages(user, batch) {
  return batch.map((locality, index) => createSingleLocalityMessage(user, locality, index, batch.length));
}

function createSingleLocalityMessage(user, locality, index, total) {
  const facts = Array.isArray(locality.facts) && locality.facts.length ? locality.facts : [FALLBACK_FACT];
  const factLimit = user.messageStyle === "detailed" ? 4 : 3;
  const lines = [
    `יישוב ${index + 1} מתוך ${total}:`,
    locality.hebrewName,
    `אזור: ${locality.region || "אזור לא זמין"}`,
    `סוג: ${locality.localityType || "סוג לא זמין"}`,
    "עובדות:",
    ...facts.slice(0, factLimit).map((fact) => `• ${fact}`)
  ];

  if (user.messageStyle === "challenge") {
    lines.push("", `ניחוש מהיר: באיזה מחוז נמצא ${locality.hebrewName}?`);
  }

  return lines.join("\n");
}

function createCombinedMessage(user, batch) {
  return [`בוקר טוב ${user.name || "יונדב"} 🌍`, `${batch.length} היישובים שלך להיום:`, "", ...createLocalityMessages(user, batch)].join("\n\n");
}

async function runScheduler() {
  const storage = readStorage();
  let changed = false;

  for (const subscriber of storage.subscribers) {
    if (!subscriber.isActive || !subscriber.consentAccepted || !isDueNow(subscriber)) {
      continue;
    }

    const batch = pickNextBatch(subscriber);
    const messages = createLocalityMessages(subscriber, batch);
    const result = await sendWhatsAppMessages(subscriber.phoneNumber, messages);

    if (result.ok) {
      subscriber.shownLocalityIds = Array.from(new Set([...(subscriber.shownLocalityIds || []), ...batch.map((item) => item.id)]));
      subscriber.totalShownCount = Number(subscriber.totalShownCount || 0) + batch.length;
      subscriber.lastSentDate = localDateKey(new Date(), subscriber.timezone);
      changed = true;
    }

    if (result.mockMode) {
      messages.forEach((message) => {
        storage.mockMessages.push({
          id: crypto.randomUUID(),
          subscriberId: subscriber.id,
          phoneNumber: subscriber.phoneNumber,
          message,
          createdAt: new Date().toISOString()
        });
      });
      changed = true;
    }
  }

  if (changed) {
    writeStorage(storage);
  }
}

function isDueNow(subscriber) {
  const now = new Date();
  const dateKey = localDateKey(now, subscriber.timezone);
  if (subscriber.lastSentDate === dateKey) {
    return false;
  }

  return localTime(now, subscriber.timezone) === subscriber.sendTime;
}

function localDateKey(date, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function localTime(date, timezone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function isMockMode() {
  return !process.env.WHATSAPP_TOKEN
    || !process.env.WHATSAPP_PHONE_NUMBER_ID
    || !process.env.WHATSAPP_TEMPLATE_NAME
    || !process.env.WHATSAPP_TEMPLATE_LANGUAGE;
}

async function sendWhatsAppMessages(phoneNumber, messages) {
  if (isMockMode()) {
    messages.forEach((message, index) => {
      console.log(`\n--- WhatsApp mock message ${index + 1}/${messages.length} ---`);
      console.log(`To: ${phoneNumber}`);
      console.log(message);
      console.log("--- end mock message ---\n");
    });
    return { ok: true, mockMode: true, sentCount: messages.length };
  }

  const results = [];
  for (const message of messages) {
    const result = await sendWhatsAppTemplate(phoneNumber, message);
    results.push(result);
    if (!result.ok) {
      return { ok: false, mockMode: false, sentCount: results.filter((item) => item.ok).length, results };
    }
    await delay(randomBetween(LIVE_SEND_DELAY_MIN_MS, LIVE_SEND_DELAY_MAX_MS));
  }

  return { ok: true, mockMode: false, sentCount: messages.length, results };
}

async function sendWhatsAppTemplate(phoneNumber, message) {
  const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: message }]
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("WhatsApp API send failed:", details);
    return { ok: false, error: "whatsapp_send_failed", details };
  }

  return { ok: true, details: await response.json() };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
