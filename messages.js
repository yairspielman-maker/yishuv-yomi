"use strict";

const { FALLBACK_FACT } = require("./constants");

function getLocalityFacts(locality) {
  const facts = Array.isArray(locality?.facts)
    ? locality.facts.map((fact) => String(fact || "").trim()).filter(Boolean)
    : [];
  return facts.length ? facts : [FALLBACK_FACT];
}

function createLocalityMessages(settings, batch) {
  const localities = Array.isArray(batch) ? batch : [];
  return localities.map((locality, index) =>
    createSingleLocalityMessage(settings, locality, index, localities.length));
}

function createSingleLocalityMessage(settings = {}, locality = {}, index = 0, total = 1) {
  const factLimit = settings.messageStyle === "detailed" ? 4 : 3;
  const lines = [
    `יישוב ${index + 1} מתוך ${total}:`,
    locality.hebrewName || "שם היישוב לא זמין",
    `אזור: ${locality.region || "אזור לא זמין"}`,
    `סוג: ${locality.localityType || "סוג לא זמין"}`,
    "עובדות:",
    ...getLocalityFacts(locality).slice(0, factLimit).map((fact) => `• ${fact}`)
  ];

  if (settings.messageStyle === "challenge") {
    lines.push("", `ניחוש מהיר: באיזה מחוז נמצא ${locality.hebrewName || "היישוב"}?`);
  }

  return lines.join("\n");
}

function createCombinedMessage(settings, batch) {
  return [
    `בוקר טוב ${settings?.name || "יונדב"} 🌍`,
    `${batch.length} היישובים שלך להיום:`,
    "",
    ...createLocalityMessages(settings, batch)
  ].join("\n\n");
}

module.exports = {
  getLocalityFacts,
  createLocalityMessages,
  createSingleLocalityMessage,
  createCombinedMessage
};
