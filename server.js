"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadEnvFile } = require("./lib/env");
const { normalizeIsraeliPhone, isValidIsraeliPhone } = require("./lib/phone");
const { normalizeSettings } = require("./lib/settings");
const {
  sortLocalities,
  pickDailyBatch,
  markLocalityShown,
  createSeededRandom
} = require("./lib/localities");
const { createLocalityMessages } = require("./lib/messages");
const {
  enrichLocalitiesWithCoordinates,
  hasValidCoordinate
} = require("./lib/coordinates");
const {
  enrichLocalitiesWithPrototypeData
} = require("./lib/enrichment");
const {
  selectEnrichedPrototypeLocalities
} = require("./lib/enriched-prototype");

const ENV_PATH = process.env.YISHUV_ENV_PATH
  ? path.resolve(process.env.YISHUV_ENV_PATH)
  : path.join(__dirname, ".env");
loadEnvFile(ENV_PATH);

let express;
try {
  express = require("express");
} catch {
  express = require("./lib/mini-express");
}

const PORT = Number(process.env.PORT || 3000);
const APP_ROOT = __dirname;
const STORAGE_PATH = process.env.YISHUV_STORAGE_PATH
  ? path.resolve(process.env.YISHUV_STORAGE_PATH)
  : path.join(__dirname, "data", "subscribers.json");
const OFFICIAL_LOCALITIES_PATH = path.join(__dirname, "data", "localities.official.json");
const PROTOTYPE_COORDINATES_PATH = path.join(
  __dirname,
  "data",
  "locality-coordinates.prototype.json"
);
const PROTOTYPE_ENRICHMENT_PATH = path.join(
  __dirname,
  "data",
  "localities.enriched.prototype.json"
);
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
    hasToken: hasEnvValue("WHATSAPP_TOKEN"),
    hasPhoneNumberId: hasEnvValue("WHATSAPP_PHONE_NUMBER_ID"),
    localitiesCount: LOCALITIES.length,
    dataSource: LOCALITY_DATA.source,
    mapPrototypeCount: LOCALITY_DATA.mapPrototypeCount
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
  const limit = Math.min(20, Math.max(1, Number.parseInt(request.query.limit, 10) || 5));
  const orderMode = ["random", "region", "official"].includes(request.query.orderMode)
    ? request.query.orderMode
    : "region";
  const random = createSeededRandom(`sample:${localDateKey(new Date(), "Asia/Jerusalem")}`);
  const coordinateOnly = request.query.withCoordinates === "true";
  const samplePool = coordinateOnly
    ? LOCALITIES.filter(hasValidCoordinate)
    : LOCALITIES;

  response.json({
    dataSource: LOCALITY_DATA.source,
    count: LOCALITIES.length,
    eligibleCount: samplePool.length,
    localities: sortLocalities(samplePool, orderMode, { random }).slice(0, limit)
  });
});

app.get("/api/localities/enriched-prototype", (request, response) => {
  const selection = selectEnrichedPrototypeLocalities(LOCALITIES);
  response.json({
    prototype: "enriched",
    count: selection.localities.length,
    localities: selection.localities,
    missing: selection.missing,
    officialCodes: selection.officialCodes
  });
});

app.get("/api/localities/regions", (request, response) => {
  const regions = [...new Set(LOCALITIES.map((locality) => locality.region).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "he"));
  response.json({
    dataSource: LOCALITY_DATA.source,
    count: regions.length,
    regions
  });
});

app.get("/api/today-preview", (request, response) => {
  const settings = normalizeSettings(request.query);
  const storage = readStorage();
  const subscriber = findSubscriber(storage, settings);
  const learner = mergeLearnerSettings(subscriber, settings);
  const selection = selectBatch(learner);
  const messages = createLocalityMessages(learner, selection.batch);

  response.json({
    mockMode: isMockMode(),
    batch: selection.batch,
    messages,
    message: messages.join("\n\n"),
    normalizedPhone: settings.phoneNumber,
    phoneValid: isValidIsraeliPhone(settings.phoneNumber),
    subscriber: subscriber ? publicSubscriber(subscriber) : null,
    progress: createProgressSummary(subscriber || learner)
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
  let subscriber = findSubscriber(storage, settings);

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

  const selection = selectBatch(subscriber);
  const messages = createLocalityMessages(subscriber, selection.batch);
  response.json({
    ok: true,
    mockMode: isMockMode(),
    subscriber: publicSubscriber(subscriber),
    progress: createProgressSummary(subscriber),
    batch: selection.batch,
    messages,
    message: messages.join("\n\n")
  });
});

app.post("/api/unsubscribe", (request, response) => {
  const storage = readStorage();
  const subscriber = findSubscriber(storage, request.body || {});

  if (!subscriber) {
    response.status(404).json({ error: "subscriber_not_found" });
    return;
  }

  subscriber.isActive = false;
  writeStorage(storage);
  response.json({
    ok: true,
    subscriber: publicSubscriber(subscriber),
    progress: createProgressSummary(subscriber)
  });
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

  const storage = readStorage();
  const subscriber = findSubscriber(storage, settings);
  const learner = mergeLearnerSettings(subscriber, settings);
  const selection = selectBatch(learner);
  const messages = createLocalityMessages(learner, selection.batch);
  const result = await sendWhatsAppMessages(settings.phoneNumber, messages);

  response.status(result.ok ? 200 : 502).json({
    ok: result.ok,
    ...result,
    batch: selection.batch,
    messages,
    message: messages.join("\n\n"),
    progress: createProgressSummary(subscriber || learner)
  });
});

app.post("/api/progress/mark-shown", (request, response) => {
  const storage = readStorage();
  const subscriber = findSubscriber(storage, request.body || {});

  if (!subscriber) {
    response.status(404).json({ error: "subscriber_not_found" });
    return;
  }

  const localityId = String(request.body.localityId || "");
  if (!LOCALITIES.some((locality) => locality.id === localityId)) {
    response.status(400).json({ error: "invalid_locality" });
    return;
  }

  const nextProgress = markLocalityShown(LOCALITIES, subscriber, localityId);
  subscriber.shownLocalityIds = nextProgress.shownLocalityIds;
  subscriber.completedCycles = nextProgress.completedCycles;
  if (nextProgress.added) {
    subscriber.totalShownCount = Number(subscriber.totalShownCount || 0) + 1;
  }
  writeStorage(storage);

  response.json({
    ok: true,
    added: nextProgress.added,
    subscriber: publicSubscriber(subscriber),
    progress: createProgressSummary(subscriber)
  });
});

app.post("/api/reset-progress", (request, response) => {
  const storage = readStorage();
  const subscriber = findSubscriber(storage, request.body || {});

  if (!subscriber) {
    response.status(404).json({ error: "subscriber_not_found" });
    return;
  }

  subscriber.shownLocalityIds = [];
  subscriber.lastSentDate = null;
  writeStorage(storage);
  response.json({
    ok: true,
    subscriber: publicSubscriber(subscriber),
    progress: createProgressSummary(subscriber)
  });
});

app.use(express.static(APP_ROOT));
app.get("*", (request, response) => {
  response.sendFile(path.join(APP_ROOT, "index.html"));
});

function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`יישוב יומי running at http://localhost:${port}`);
    console.log(isMockMode()
      ? "WhatsApp mock mode: missing Cloud API env vars."
      : "WhatsApp Cloud API mode enabled.");
  });
  const schedulerTimer = setInterval(() => {
    runScheduler().catch((error) => console.error("Scheduler failed:", error));
  }, 60 * 1000);
  runScheduler().catch((error) => console.error("Scheduler failed:", error));
  return { server, schedulerTimer };
}

function loadLocalities() {
  const prototypeCoordinates = loadPrototypeCoordinates();
  const prototypeEnrichment = loadPrototypeEnrichment();
  const mapPrototypeCount = Object.entries(prototypeCoordinates)
    .filter(([key, value]) =>
      key !== "_meta"
      && value?.verified === true
      && hasValidCoordinate(value))
    .length;

  if (fs.existsSync(OFFICIAL_LOCALITIES_PATH)) {
    const payload = JSON.parse(fs.readFileSync(OFFICIAL_LOCALITIES_PATH, "utf8"));
    if (Array.isArray(payload.localities) && payload.localities.length) {
      return {
        source: "official",
        localities: enrichLocalitiesWithPrototypeData(
          enrichLocalitiesWithCoordinates(payload.localities, prototypeCoordinates),
          prototypeEnrichment
        ),
        importedAt: payload.importedAt || null,
        resourceId: payload.resourceId || null,
        mapPrototypeCount
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
    localities: enrichLocalitiesWithPrototypeData(
      enrichLocalitiesWithCoordinates(
        context.window.YISHUV_LOCALITIES || [],
        prototypeCoordinates
      ),
      prototypeEnrichment
    ),
    importedAt: null,
    resourceId: null,
    mapPrototypeCount
  };
}

function loadPrototypeCoordinates() {
  try {
    const payload = JSON.parse(fs.readFileSync(PROTOTYPE_COORDINATES_PATH, "utf8"));
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function loadPrototypeEnrichment() {
  try {
    const payload = JSON.parse(fs.readFileSync(PROTOTYPE_ENRICHMENT_PATH, "utf8"));
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  } catch {
    return {};
  }
}

function readStorage() {
  ensureStorage();
  const storage = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf8"));
  return {
    subscribers: Array.isArray(storage.subscribers) ? storage.subscribers : [],
    mockMessages: Array.isArray(storage.mockMessages) ? storage.mockMessages : []
  };
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

function findSubscriber(storage, input = {}) {
  const id = String(input.id || "");
  const phoneNumber = normalizeIsraeliPhone(input.phoneNumber);
  return storage.subscribers.find((item) =>
    (id && item.id === id) || (phoneNumber && item.phoneNumber === phoneNumber));
}

function mergeLearnerSettings(subscriber, settings) {
  if (!subscriber) {
    return {
      ...settings,
      shownLocalityIds: [],
      completedCycles: 0,
      totalShownCount: 0
    };
  }

  return {
    ...subscriber,
    ...settings,
    id: subscriber.id,
    shownLocalityIds: subscriber.shownLocalityIds || [],
    completedCycles: Number(subscriber.completedCycles || 0),
    totalShownCount: Number(subscriber.totalShownCount || 0)
  };
}

function selectBatch(learner) {
  const dateKey = localDateKey(new Date(), learner.timezone);
  const identity = learner.id || learner.phoneNumber || learner.name || "anonymous";
  const cycle = Number(learner.completedCycles || 0);
  const random = createSeededRandom(`${identity}:${cycle}:${dateKey}`);
  return pickDailyBatch(LOCALITIES, learner, { random });
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
    shownCount: Array.isArray(subscriber.shownLocalityIds)
      ? subscriber.shownLocalityIds.length
      : 0,
    completedCycles: Number(subscriber.completedCycles || 0),
    totalShownCount: Number(subscriber.totalShownCount || 0),
    lastSentDate: subscriber.lastSentDate,
    createdAt: subscriber.createdAt
  };
}

function createProgressSummary(learner = {}) {
  const validIds = new Set(LOCALITIES.map((locality) => locality.id));
  const shownIds = [...new Set(Array.isArray(learner.shownLocalityIds)
    ? learner.shownLocalityIds.filter((id) => validIds.has(id))
    : [])];
  const shownSet = new Set(shownIds);
  const regionsUnlocked = new Set(
    LOCALITIES
      .filter((locality) => shownSet.has(locality.id))
      .map((locality) => locality.region)
      .filter(Boolean)
  ).size;

  return {
    shownCount: shownIds.length,
    remainingCount: Math.max(0, LOCALITIES.length - shownIds.length),
    totalCount: LOCALITIES.length,
    regionsUnlocked,
    completedCycles: Number(learner.completedCycles || 0),
    totalShownCount: Number(learner.totalShownCount || 0)
  };
}

async function runScheduler() {
  const storage = readStorage();
  let changed = false;

  for (const subscriber of storage.subscribers) {
    if (!subscriber.isActive || !subscriber.consentAccepted || !isDueNow(subscriber)) {
      continue;
    }

    const selection = selectBatch(subscriber);
    const messages = createLocalityMessages(subscriber, selection.batch);
    const result = await sendWhatsAppMessages(subscriber.phoneNumber, messages);

    if (result.ok) {
      subscriber.shownLocalityIds = [...new Set([
        ...selection.shownLocalityIds,
        ...selection.batch.map((item) => item.id)
      ])];
      subscriber.completedCycles = selection.completedCycles;
      subscriber.totalShownCount = Number(subscriber.totalShownCount || 0) + selection.batch.length;
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

function hasEnvValue(key) {
  return Boolean(String(process.env[key] || "").trim());
}

function isMockMode() {
  return !hasEnvValue("WHATSAPP_TOKEN")
    || !hasEnvValue("WHATSAPP_PHONE_NUMBER_ID")
    || !hasEnvValue("WHATSAPP_TEMPLATE_NAME")
    || !hasEnvValue("WHATSAPP_TEMPLATE_LANGUAGE");
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
      return {
        ok: false,
        mockMode: false,
        sentCount: results.filter((item) => item.ok).length,
        results
      };
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

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  runScheduler
};
