const fs = require("fs");
const path = require("path");

const DATASET_ID = "citiesandsettelments";
const PREFERRED_RESOURCE_ID = "8f714b6f-c35c-4b40-a0e7-547b675eee0e";
const CKAN_BASE = "https://data.gov.il/api/3/action";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "localities.official.json");
const MAPPING_PATH = path.join(__dirname, "..", "data", "region-mapping.json");
const FALLBACK_FACT = "אין מידע קצר זמין כרגע";

main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});

async function main() {
  const mapping = readJson(MAPPING_PATH, { districtDefaults: {}, nameRules: [] });
  const resource = await findResource();
  const records = await fetchAllRecords(resource.id);
  const localities = normalizeRecords(records, mapping);

  if (localities.length < 1000) {
    throw new Error(`Official import produced only ${localities.length} localities; expected 1000+.`);
  }

  const payload = {
    source: "official",
    datasetId: DATASET_ID,
    resourceId: resource.id,
    resourceName: resource.name,
    importedAt: new Date().toISOString(),
    count: localities.length,
    localities
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Imported ${localities.length} official localities into ${OUTPUT_PATH}`);
}

async function findResource() {
  const metadata = await fetchJson(`${CKAN_BASE}/package_show?id=${encodeURIComponent(DATASET_ID)}`);
  const resources = metadata.result?.resources || [];
  const preferred = resources.find((resource) => resource.id === PREFERRED_RESOURCE_ID);
  if (preferred?.datastore_active) {
    return preferred;
  }

  const english = resources.find((resource) =>
    resource.datastore_active
    && String(resource.format).toUpperCase() === "CSV"
    && /אנגלית|english/i.test(resource.name || "")
  );
  if (english) {
    return english;
  }

  const csv = resources.find((resource) => resource.datastore_active && String(resource.format).toUpperCase() === "CSV");
  if (!csv) {
    throw new Error("No datastore-active CSV resource found in official dataset.");
  }
  return csv;
}

async function fetchAllRecords(resourceId) {
  const limit = 1000;
  let offset = 0;
  const records = [];

  while (true) {
    const url = `${CKAN_BASE}/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}`;
    const page = await fetchJson(url);
    const pageRecords = page.result?.records || [];
    records.push(...pageRecords);
    if (pageRecords.length < limit) {
      break;
    }
    offset += limit;
  }

  return records;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  const json = await response.json();
  if (json.success === false) {
    throw new Error(`CKAN error for ${url}: ${JSON.stringify(json.error)}`);
  }
  return json;
}

function normalizeRecords(records, mapping) {
  const seen = new Set();
  return records
    .map((record) => normalizeRecord(record, mapping))
    .filter((locality) => locality.hebrewName && locality.officialCode)
    .filter((locality) => {
      if (seen.has(locality.id)) {
        return false;
      }
      seen.add(locality.id);
      return true;
    })
    .sort((a, b) => Number(a.officialCode) - Number(b.officialCode));
}

function normalizeRecord(record, mapping) {
  const officialCode = pick(record, [
    "city_code", "semel_yeshuv", "SEMEL_YISHUV", "semel_yishuv", "symbol", "code", "סמל_ישוב", "סמל יישוב", "סמל"
  ]);
  const hebrewName = cleanName(pick(record, [
    "city_name_he", "shem_yeshuv", "SHEM_YISHUV", "שם_ישוב", "שם יישוב", "שם ישוב", "שם"
  ]));
  const englishName = cleanName(pick(record, [
    "city_name_en", "shem_yeshuv_english", "SHEM_YISHUV_ENGLISH", "english_name", "name_en", "שם_ישוב_לועזי", "שם לועזי"
  ]));
  const district = cleanName(pick(record, [
    "PIBA_bureau_name", "piba_bureau_name", "shem_machoz", "SHEM_MACHOZ", "machoz", "district", "שם_מחוז", "מחוז"
  ]));
  const localityType = normalizeType(cleanName(pick(record, [
    "sug_yeshuv", "SUG_YISHUV", "sug", "type", "locality_type", "צורת_ישוב", "צורת יישוב", "סוג ישוב", "סוג יישוב"
  ])));
  const subDistrict = cleanName(pick(record, [
    "region_name", "shem_nafa", "SHEM_NAFA", "nafa", "sub_district", "שם_נפה", "נפה"
  ]));
  const council = cleanName(pick(record, [
    "shem_moatza", "SHEM_MOATZA", "moatza", "regional_council", "שם_מועצה", "מועצה אזורית"
  ]));
  const region = inferLearningRegion({ hebrewName, district, subDistrict, council }, mapping);
  const facts = buildFacts({ localityType, district, region });

  return {
    id: `official-${String(officialCode || "").trim()}`,
    hebrewName,
    englishName,
    officialCode: String(officialCode || "").trim(),
    district,
    region,
    localityType,
    facts
  };
}

function pick(record, aliases) {
  const entries = Object.entries(record);
  const normalizedAliases = aliases.map(normalizeKey);
  for (const [key, value] of entries) {
    if (normalizedAliases.includes(normalizeKey(key)) && value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  for (const [key, value] of entries) {
    const normalizedKey = normalizeKey(key);
    if (normalizedAliases.some((alias) => normalizedKey.includes(alias) || alias.includes(normalizedKey))
      && value !== null
      && value !== undefined
      && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function normalizeKey(key) {
  return String(key)
    .toLowerCase()
    .replace(/[\s_\-"'׳״]/g, "")
    .replace(/[^a-z0-9א-ת]/g, "");
}

function cleanName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeType(value) {
  const text = cleanName(value);
  if (!text) {
    return "";
  }

  const numericMap = {
    "10": "עיר",
    "20": "מועצה מקומית",
    "30": "מושב",
    "31": "מושב",
    "32": "מושב שיתופי",
    "33": "קיבוץ",
    "34": "יישוב קהילתי",
    "35": "יישוב כפרי",
    "40": "יישוב מוסדי"
  };

  return numericMap[text] || text;
}

function inferLearningRegion(locality, mapping) {
  const name = locality.hebrewName || "";
  const rule = (mapping.nameRules || []).find((item) => (item.includes || []).some((part) => name.includes(part)));
  if (rule) {
    return rule.region;
  }

  if (locality.subDistrict) {
    return locality.subDistrict;
  }

  return mapping.districtDefaults?.[locality.district] || locality.district || "";
}

function buildFacts({ localityType, district, region }) {
  const facts = [];
  facts.push(localityType ? `סוג היישוב: ${localityType}` : FALLBACK_FACT);
  facts.push(district ? `מחוז: ${district}` : FALLBACK_FACT);
  facts.push(region ? `אזור לימודי: ${region}` : FALLBACK_FACT);
  return facts;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
