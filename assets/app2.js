// assets/app2.js
(async () => {
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  const search = document.getElementById("search");

  if (!content || !status || !search) {
    console.error("Missing required elements: #content, #status, #search");
    return;
  }

  // Load the FULL directory for testing paging + calls
  let data = [];
  try {
    const res = await fetch("./assets/data/directory2.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error("directory2.json must be a JSON array");
    data = json;
    status.textContent = `Loaded ${data.length} entries (test mode: directory2.json)`;
  } catch (err) {
    console.error(err);
    status.textContent = `Failed to load directory2.json: ${err.message}`;
    return;
  }

  // Helpers
  const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");
  const safeText = (v) => (v == null ? "" : String(v));

  // Build tel: links safely:
  // - if 10+ digits => use as full number
  // - if 4-5 digits => treat as extension (tel:EXT or tel:+1718206XXXX??) -> we will do tel:ext only
  // - otherwise => still dial whatever digits exist
  function telHref(raw) {
    const d = digitsOnly(raw);

    if (!d) return null;

    // If it's clearly a full number (>=10 digits), dial it directly
    if (d.length >= 10) return `tel:${d}`;

    // If it's an extension (common 4-5 digits), use tel: + extension (mobile behavior varies)
    // Better: use plain tel:<ext> so hospital phones can interpret; mobiles may not.
    return `tel:${d}`;
  }

  function render(filter = "") {
    content.innerHTML = "";
    const term = filter.toLowerCase().trim();

    // Group by category after filtering
    const groups = {};
    for (const d of data) {
      const blob = JSON.stringify(d).toLowerCase();
      if (term && !blob.includes(term)) continue;
      const cat = safeText(d.category) || "Uncategorized";
      groups[cat] ??= [];
      groups[cat].push(d);
    }

    // Sort categories for consistent UI
    const cats = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    for (const cat of cats) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<div class="row"><strong>${cat}</strong></div>`;

      groups[cat].forEach((d) => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<div>${safeText(d.name) || "Unknown"}</div>`;

        const chips = document.createElement("div");
        chips.className = "chips";

        // CALL chips
        const calls = Array.isArray(d.call) ? d.call : [];
        calls.forEach((c) => {
          const href = telHref(c);
          if (!href) return;

          const a = document.createElement("a");
          a.className = "chip";
          a.href = href;

          const dials = digitsOnly(c);
          const isExt = dials.length > 0 && dials.length <= 5;
          a.textContent = `Call ${isExt ? "ext " : ""}${dials || safeText(c)}`;

          chips.appendChild(a);
        });

        // PAGER chip (test)
        // Keep existing behavior: calls window.Paging.send(pager)
        const pagerDigits = digitsOnly(d.pager);
        if (pagerDigits) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "chip chip--page";
          b.textContent = `Page ${pagerDigits}`;
          b.onclick = () => {
            if (window.Paging && typeof window.Paging.send === "function") {
              window.Paging.send(pagerDigits, d); // pass entry as 2nd arg (optional, non-breaking)
            } else {
              alert(`Paging test:\n${safeText(d.name)}\nPager: ${pagerDigits}\n\nwindow.Paging.send() not loaded yet.`);
            }
          };
          chips.appendChild(b);
        }

        row.appendChild(chips);
        card.appendChild(row);
      });

      content.appendChild(card);
    }

    // Update status with filtered count
    const shown = cats.reduce((sum, c) => sum + groups[c].length, 0);
    status.textContent = `Loaded ${data.length} entries • Showing ${shown}${term ? ` • Filter: "${term}"` : ""}`;
  }

  search.oninput = (e) => render(e.target.value);
  render();
})();
