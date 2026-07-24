"use strict";

const { normalizeDailyCount } = require("./settings");

function sortLocalities(localities, orderMode = "region", options = {}) {
  const items = Array.isArray(localities) ? [...localities] : [];

  if (orderMode === "random") {
    return shuffle(items, options.random || Math.random);
  }

  if (orderMode === "official") {
    return items.sort(compareOfficialOrder);
  }

  return items.sort((left, right) => {
    const regionComparison = String(left.region || "").localeCompare(String(right.region || ""), "he");
    return regionComparison || compareOfficialOrder(left, right);
  });
}

function pickDailyBatch(localities, learner = {}, options = {}) {
  const ordered = sortLocalities(localities, learner.orderMode, options);
  const validIds = new Set(ordered.map((locality) => locality.id).filter(Boolean));
  const shownLocalityIds = uniqueIds(learner.shownLocalityIds)
    .filter((id) => validIds.has(id));
  const completedAll = validIds.size > 0 && shownLocalityIds.length >= validIds.size;
  const cycleShownIds = completedAll ? [] : shownLocalityIds;
  const shownSet = new Set(cycleShownIds);
  const remaining = ordered.filter((locality) => !shownSet.has(locality.id));
  const dailyCount = normalizeDailyCount(learner.dailyCount);

  return {
    batch: remaining.slice(0, dailyCount),
    shownLocalityIds: cycleShownIds,
    completedCycles: Number(learner.completedCycles || 0) + (completedAll ? 1 : 0),
    cycleStarted: completedAll
  };
}

function markLocalityShown(localities, learner = {}, localityId) {
  const selection = pickDailyBatch(localities, learner, { random: () => 0.5 });
  const validIds = new Set((localities || []).map((locality) => locality.id));
  const normalizedId = String(localityId || "");
  const shown = new Set(selection.shownLocalityIds);
  let added = false;

  if (validIds.has(normalizedId) && !shown.has(normalizedId)) {
    shown.add(normalizedId);
    added = true;
  }

  return {
    shownLocalityIds: [...shown],
    completedCycles: selection.completedCycles,
    cycleStarted: selection.cycleStarted,
    added
  };
}

function createSeededRandom(seedValue) {
  let seed = hashString(String(seedValue || "yishuv-yomi"));
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compareOfficialOrder(left, right) {
  const leftCode = numericCode(left.officialCode);
  const rightCode = numericCode(right.officialCode);
  if (leftCode !== rightCode) {
    return leftCode - rightCode;
  }
  return String(left.hebrewName || "").localeCompare(String(right.hebrewName || ""), "he");
}

function numericCode(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function uniqueIds(ids) {
  return [...new Set(Array.isArray(ids) ? ids.filter(Boolean).map(String) : [])];
}

module.exports = {
  sortLocalities,
  pickDailyBatch,
  markLocalityShown,
  createSeededRandom
};
