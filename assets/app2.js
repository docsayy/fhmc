// assets/app.js
(() => {
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  const search = document.getElementById("search");
  const clearBtn = document.getElementById("clear");

  const norm = (v) => String(v ?? "").toLowerCase().trim();
  const digitsOnly = (v) => String(v ?? "").replace(/\D+/g, "");

  // Build a searchable text blob per entry
  const entryHaystack = (e) => {
    const calls = Array.isArray(e.call) ? e.call.join(" ") : "";
    const faxes = Array.isArray(e.fax) ? e.fax.join(" ") : "";
    return [
      e.category, e.name, e.notes,
      e.pager,
      calls,
      faxes
    ].map(norm).join(" ");
  };

  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function telHref(raw) {
    const d = digitsOnly(raw);
    // If you store FHMC extensions (e.g., "5559"), tel:5559 still works on many hospital VoIP apps,
    // but phones typically want full numbers. We keep it literal for now.
    return `tel:${d || String(raw).trim()}`;
  }

  function renderEntries(entries) {
    if (!entries.length) {
      content.innerHTML = `<div class="empty">No results.</div>`;
      return;
    }

    // Group by category (keep insertion order)
    const groups = new Map();
    for (const e of entries) {
      const cat = (e.category && String(e.category).trim()) || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(e);
    }

    let html = "";
    for (const [cat, list] of groups.entries()) {
      html += `<section class="section">
        <div class="section-title">${escapeHtml(cat)}</div>
        <div class="cards">`;

      for (const e of list) {
        const calls = Array.isArray(e.call) ? e.call : [];
        const faxes = Array.isArray(e.fax) ? e.fax : [];
        const pager = e.pager ? String(e.pager).trim() : "";

        html += `<div class="card">
          <div class="row">
            <div class="name">${escapeHtml(e.name ?? "")}</div>
          </div>`;

        if (e.notes) {
          html += `<div class="notes">${escapeHtml(e.notes)}</div>`;
        }

        if (calls.length) {
          html += `<div class="line">
            <span class="label">call:</span>
            <span class="chips">`;
          for (const c of calls) {
            const label = String(c).trim();
            html += `<a class="chip" href="${telHref(label)}">${escapeHtml(label)}</a>`;
          }
          html += `</span></div>`;
        }

        if (faxes.length) {
          html += `<div class="line">
            <span class="label">fax:</span>
            <span class="chips">`;
          for (const f of faxes) {
            const label = String(f).trim();
            html += `<span class="chip chip-passive">${escapeHtml(label)}</span>`;
          }
          html += `</span></div>`;
        }

        if (pager) {
          // No paging UI, no API calls, no popups: just display it.
          html += `<div class="line">
            <span class="label">pager:</span>
            <span class="pager">page ${escapeHtml(pager)}</span>
          </div>`;
        }

        html += `</div>`;
      }

      html += `</div></section>`;
    }

    content.innerHTML = html;
  }

  async function loadDirectory() {
    try {
      const res = await fetch("directory2.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("directory.json must be a JSON array");

      // Precompute haystacks for fast search
      const enriched = data.map((e) => ({ ...e, __h: entryHaystack(e) }));

      status.textContent = `Loaded ${enriched.length} entries`;
      renderEntries(enriched);

      const runSearch = () => {
        const q = norm(search.value);
        if (!q) {
          status.textContent = `Loaded ${enriched.length} entries`;
          renderEntries(enriched);
          return;
        }
        const filtered = enriched.filter((e) => e.__h.includes(q));
        status.textContent = `Showing ${filtered.length} of ${enriched.length}`;
        renderEntries(filtered);
      };

      search.addEventListener("input", runSearch);
      clearBtn.addEventListener("click", () => {
        search.value = "";
        search.focus();
        runSearch();
      });
    } catch (err) {
      console.error(err);
      status.textContent = `Failed to load directory.json: ${err.message}`;
      content.innerHTML = `<div class="empty">Directory failed to load.</div>`;
    }
  }

  loadDirectory();
})();
