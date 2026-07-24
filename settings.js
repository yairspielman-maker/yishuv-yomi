"use strict";

const { normalizeIsraeliPhone } = require("./phone");

const DEFAULT_SETTINGS = Object.freeze({
  id: "",
  name: "יונדב",
  phoneNumber: "",
  dailyCount: 3,
  sendTime: "09:00",
  orderMode: "region",
  messageStyle: "short",
  timezone: "Asia/Jerusalem",
  consentAccepted: false
});

function normalizeDailyCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.dailyCount;
  }
  return Math.min(5, Math.max(1, parsed));
}

function normalizeSettings(input = {}) {
  const name = String(input.name || DEFAULT_SETTINGS.name).trim();
  const sendTime = String(input.sendTime || "");
  const timezone = String(input.timezone || DEFAULT_SETTINGS.timezone).trim();

  return {
    id: String(input.id || ""),
    name: name || DEFAULT_SETTINGS.name,
    phoneNumber: normalizeIsraeliPhone(input.phoneNumber),
    dailyCount: normalizeDailyCount(input.dailyCount),
    sendTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime) ? sendTime : DEFAULT_SETTINGS.sendTime,
    orderMode: ["random", "region", "official"].includes(input.orderMode)
      ? input.orderMode
      : DEFAULT_SETTINGS.orderMode,
    messageStyle: ["short", "detailed", "challenge"].includes(input.messageStyle)
      ? input.messageStyle
      : DEFAULT_SETTINGS.messageStyle,
    timezone: timezone || DEFAULT_SETTINGS.timezone,
    consentAccepted: input.consentAccepted === true || input.consentAccepted === "true"
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeDailyCount,
  normalizeSettings
};
