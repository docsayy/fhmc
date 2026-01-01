// assets/app2.js
(async () => {
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  const search = document.getElementById("search");

  if (!content || !status || !search) {
    console.error("Missing required elements: #content, #status, #search");
    return;
  }

  // ✅ Safari-safe absolute URL (avoids: "The string did not match the expected pattern.")
  const DATA_URL = new URL("assets/data/directory2.json", window.location.href).toString();

  // Load the FULL directory for testing paging + calls
  let data = [];
  try {
    // If you're accidentally on file://, fetch will fail in many browsers.
    if (window.location.protocol === "file:") {
      throw new Error(
        "This page is opened via file://. Use a local server (python3 -m http.server) or GitHub Pages."
      );
    }

    const res = await fetch(DATA_URL, { cache: "no-store" });
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

  function telHref(raw) {
    const d = digitsOnly(raw);
    if (!d) return null;

    // Full number (>=10 digits) -> dial directly
    if (d.length >= 10) return `tel:${d}`;

    // Extensions / short numbers -> dial as-is (desk phones handle this best)
    return `tel:${d}`;
  }

  function render(filter = "") {
    content.innerHTML = "";
    const term = safeText(filter).toLowerCase().trim();

    // Group by category after filtering
    const groups = {};
    for (const d of data) {
      const blob = JSON.stringify(d).toLowerCase();
      if (term && !blob.includes(term)) continue;

      const cat = safeText(d.category) || "Uncategorized";
      groups[cat] ??= [];
      groups[cat].push(d);
    }

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
        const pagerDigits = digitsOnly(d.pager);
        if (pagerDigits) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "chip chip--page";
          b.textContent = `Page ${pagerDigits}`;
          b.onclick = () => {
            if (window.Paging && typeof window.Paging.send === "function") {
              window.Paging.send(pagerDigits, d);
            } else if (window.Paging && typeof window.Paging.promptAndSendPage === "function") {
              window.Paging.promptAndSendPage(pagerDigits, d);
            } else {
              alert(
                `Paging test:\n${safeText(d.name)}\nPager: ${pagerDigits}\n\nPaging module not loaded (assets/paging.js).`
              );
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
    status.textContent = `Loaded ${data.length} entries • Showing ${shown}${
      term ? ` • Filter: "${term}"` : ""
    }`;
  }

  search.oninput = (e) => render(e.target.value);
  render();
})();
