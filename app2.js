(() => {
  const ROOT = document.getElementById("root");
  const STATUS = document.getElementById("status");
  const SEARCH = document.getElementById("searchInput");
  const COUNT = document.getElementById("countPill");

  // Modal elements
  const overlay = document.getElementById("pagerOverlay");
  const pagerWho = document.getElementById("pagerWho");
  const pagerMeta = document.getElementById("pagerMeta");
  const pagerMsg = document.getElementById("pagerMsg");
  const pagerCloseBtn = document.getElementById("pagerCloseBtn");
  const pagerCopyBtn = document.getElementById("pagerCopyBtn");

  let DIRECTORY = [];

  const clean = (v) => (v == null ? "" : String(v).trim());
  const digitsOnly = (s) => clean(s).replace(/\D/g, "");
  const normArr = (v) => (Array.isArray(v) ? v.filter(Boolean).map((x) => String(x)) : []);
  const hasAny = (arr) => Array.isArray(arr) && arr.length > 0;

  function normalizeEntry(item) {
    const category = clean(item.category) || "Uncategorized";
    const name = clean(item.name) || "Unknown";
    const notes = clean(item.notes);

    const call = normArr(item.call)
      .map((x) => x.trim())
      .filter(Boolean);

    const fax = normArr(item.fax)
      .map((x) => x.trim())
      .filter(Boolean);

    const pager = clean(item.pager); // keep as string; may be numeric-looking

    return { category, name, notes, call, fax, pager };
  }

  function groupByCategory(items) {
    const map = new Map();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    // Sort categories alphabetically
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }

  function makeEl(tag, attrs = {}, text = "") {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    if (text) el.textContent = text;
    return el;
  }

  function makeLinkBtn(label, href, cls = "btn") {
    const a = makeEl("a", { class: cls, href });
    a.textContent = label;
    return a;
  }

  function openPagerModal({ name, pager }) {
    const pagerDigits = digitsOnly(pager);
    pagerWho.textContent = `Page: ${name}`;
    pagerMeta.textContent = pagerDigits ? `Pager: ${pagerDigits}` : `Pager: ${clean(pager) || "—"}`;
    pagerMsg.value = "";
    overlay.style.display = "flex";
    setTimeout(() => pagerMsg.focus(), 0);
  }

  function closePagerModal() {
    overlay.style.display = "none";
  }

  pagerCloseBtn.addEventListener("click", closePagerModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePagerModal();
  });

  pagerCopyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pagerMsg.value || "");
      pagerCopyBtn.textContent = "Copied!";
      setTimeout(() => (pagerCopyBtn.textContent = "Copy message"), 900);
    } catch {
      alert("Copy failed (browser blocked clipboard).");
    }
  });

  function matchesQuery(entry, q) {
    if (!q) return true;
    const hay = [
      entry.category,
      entry.name,
      entry.notes,
      ...entry.call,
      ...entry.fax,
      entry.pager
    ]
      .join(" ")
      .toLowerCase();

    return hay.includes(q.toLowerCase());
  }

  function render(items) {
    ROOT.innerHTML = "";
    COUNT.textContent = `${items.length} entries`;

    const grouped = groupByCategory(items);

    for (const [category, entries] of grouped.entries()) {
      const section = makeEl("div", { class: "category" });
      section.appendChild(makeEl("h2", {}, category));

      const grid = makeEl("div", { class: "grid" });

      for (const e of entries) {
        const card = makeEl("div", { class: "card" });

        card.appendChild(makeEl("div", { class: "title" }, e.name));
        if (e.notes) card.appendChild(makeEl("div", { class: "notes" }, e.notes));

        const actions = makeEl("div", { class: "actions" });

        // Call buttons
        const calls = e.call.map((x) => digitsOnly(x)).filter(Boolean);
        for (const c of calls) {
          const isExt = c.length <= 5;
          actions.appendChild(makeLinkBtn(`Call ${isExt ? "ext " : ""}${c}`, `tel:${c}`, "btn"));
        }

        // Pager button (test)
        const pagerDigits = digitsOnly(e.pager);
        if (pagerDigits) {
          const b = makeEl("button", {
            class: "btn secondary",
            type: "button",
            onclick: () => openPagerModal({ name: e.name, pager: e.pager })
          });
          b.textContent = `Page ${pagerDigits}`;
          actions.appendChild(b);
        }

        // Optional fax display as info-only (no button)
        if (hasAny(e.fax)) {
          const fx = makeEl("div", { class: "muted" }, `Fax: ${e.fax.join(", ")}`);
          card.appendChild(fx);
        }

        card.appendChild(actions);
        grid.appendChild(card);
      }

      section.appendChild(grid);
      ROOT.appendChild(section);
    }
  }

  function setStatusOk() {
    STATUS.style.display = "none";
  }

  function setStatusError(msg) {
    STATUS.className = "error";
    STATUS.textContent = msg;
    STATUS.style.display = "block";
  }

  async function load() {
    try {
      const res = await fetch("directory2.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("directory2.json must be a JSON array of objects.");

      DIRECTORY = raw.map(normalizeEntry);

      setStatusOk();
      render(DIRECTORY);

      SEARCH.addEventListener("input", () => {
        const q = clean(SEARCH.value);
        const filtered = DIRECTORY.filter((e) => matchesQuery(e, q));
        render(filtered);
      });
    } catch (err) {
      setStatusError(
        `Failed to load directory2.json. Check file name/path and JSON validity.\n\nDetails: ${err.message}`
      );
      console.error(err);
    }
  }

  load();
})();
