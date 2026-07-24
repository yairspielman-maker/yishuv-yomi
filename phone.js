"use strict";

function normalizeIsraeliPhone(rawPhone) {
  const compact = String(rawPhone || "").trim().replace(/[\s\-().]/g, "");
  if (!compact || !/^\+?\d+$/.test(compact)) {
    return "";
  }

  let digits = compact.startsWith("+") ? compact.slice(1) : compact;

  if (/^05\d{8}$/.test(digits)) {
    digits = `972${digits.slice(1)}`;
  } else if (/^97205\d{8}$/.test(digits)) {
    digits = `972${digits.slice(4)}`;
  }

  return digits;
}

function isValidIsraeliPhone(rawPhone) {
  return /^9725\d{8}$/.test(normalizeIsraeliPhone(rawPhone));
}

module.exports = {
  normalizeIsraeliPhone,
  isValidIsraeliPhone
};
