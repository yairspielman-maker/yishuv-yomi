(function initializeEnrichmentModule(browserWindow) {
  "use strict";

  function enrichLocalitiesWithPrototypeData(localities, enrichmentIndex = {}) {
    return localities.map((locality) => {
      const officialCode = String(locality?.officialCode || "").trim();
      if (!officialCode
        || !Object.prototype.hasOwnProperty.call(enrichmentIndex, officialCode)
        || !isObject(enrichmentIndex[officialCode])) {
        return locality;
      }

      return {
        ...locality,
        enrichedData: enrichmentIndex[officialCode]
      };
    });
  }

  function buildEnrichedSections(enrichedData) {
    if (!isObject(enrichedData)) {
      return [];
    }

    const sections = [];
    addTextSection(sections, "summary", "תקציר", enrichedData.summary);
    addTextSection(
      sections,
      "landscape",
      "הנוף והסביבה",
      enrichedData.landscapeSummary
    );
    addTextSection(
      sections,
      "flora-fauna",
      "חי וצומח",
      enrichedData.floraFaunaSummary
    );
    addTextSection(
      sections,
      "history",
      "הסיפור ההיסטורי",
      enrichedData.historicalSummary
    );
    addTextSection(
      sections,
      "remember",
      "מה לזכור",
      enrichedData.rememberThis
    );
    addListSection(
      sections,
      "sources",
      "מקורות",
      formatSources(enrichedData.sources)
    );

    return sections;
  }

  function renderEnrichedDataMarkup(enrichedData) {
    const sections = buildEnrichedSections(enrichedData);
    if (!sections.length) {
      return "";
    }

    return `
      <section class="enriched-content" aria-label="מידע מורחב על היישוב">
        ${sections.map((section) => `
          <div class="secret-line enriched-section" data-enriched-section="${escapeHtml(section.key)}">
            <h4>${escapeHtml(section.title)}</h4>
            ${section.items.length === 1
              ? `<p>${escapeHtml(section.items[0])}</p>`
              : `<ul class="facts">${section.items
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("")}</ul>`}
          </div>
        `).join("")}
      </section>
    `;
  }

  function addTextSection(sections, key, title, value) {
    addListSection(sections, key, title, uniqueTexts([value]));
  }

  function addListSection(sections, key, title, values) {
    const items = uniqueTexts(values);
    if (items.length) {
      sections.push({ key, title, items });
    }
  }

  function formatSources(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map((source) => {
        if (!isObject(source)) {
          return cleanText(source);
        }
        const label = firstText(source.title, source.name, source.label);
        const url = cleanText(source.url);
        if (label && url) {
          return `${label}: ${url}`;
        }
        return label || url;
      })
      .filter(Boolean);
  }

  function firstText(...values) {
    return values.map(cleanText).find(Boolean) || "";
  }

  function uniqueTexts(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(cleanText)
      .filter(Boolean))];
  }

  function cleanText(value) {
    return typeof value === "string" || typeof value === "number"
      ? String(value).trim()
      : "";
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const api = {
    enrichLocalitiesWithPrototypeData,
    buildEnrichedSections,
    renderEnrichedDataMarkup
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (browserWindow) {
    browserWindow.YISHUV_ENRICHMENT = api;
    
  }
})(typeof window === "undefined" ? null : window);
