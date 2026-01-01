// assets/app2.js
(async () => {
  // =========================
  // CONFIG
  // =========================
  const DATA_URL = "./assets/data/directory2.json";
  const WORKER_URL = "https://fhmc-pager.msayan92.workers.dev"; // root is fine
  const SHARED_TOKEN = ""; // only if env.PAGER_SHARED_TOKEN is set
  const FROM_NAME = "FHMC Directory";

  // =========================
  // DOM
  // =========================
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  const search = document.getElementById("search");

  if (!content || !status || !search) {
    console.error("Missing required elements: #content, #status, #search");
    return;
  }

  // =========================
  // State  ✅ (FIX: declare BEFORE any applyFilter call)
  // =========================
  let all = [];
  let q = "";

  // =========================
  // Helpers
  // =========================
  const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");
  const norm = (s) => String(s ?? "").toLowerCase().trim();
  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function formatPhone(d) {
    const x = digitsOnly(d);
    if (x.length === 10) return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`;
    return String(d || "");
  }

  function telHref(d) {
    const x = digitsOnly(d);
    return x ? `tel:${x}` : "#";
  }

  function matchesEntry(entry, query) {
    if (!query) return true;
    const hay = [
      entry.category,
      entry.name,
      (entry.call || []).join(" "),
      (entry.fax || []).join(" "),
      entry.pager ?? "",
      entry.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  }

  // =========================
  // Toast (uses your .toast)
  // =========================
  const toastEl = document.querySelector(".toast");
  function toast(msg, ms = 2600) {
    if (!toastEl) {
      status.textContent = msg;
      return;
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  // =========================
  // Cloudflare paging (matches your Worker body: {pager, message, fromName})
  // =========================
  async function sendPageToWorker({ pager, message }) {
    if (!WORKER_URL) throw new Error("WORKER_URL missing in app2.js");

    const payload = {
      pager: String(pager || ""),
      message: String(message || ""),
      fromName: FROM_NAME,
    };

    const headers = { "Content-Type": "application/json" };
    if (SHARED_TOKEN) headers["x-pager-token"] = SHARED_TOKEN;

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    // Worker might return JSON (recommended) or plain text
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      return { ok: true, raw: text };
    }

    if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  }

  // =========================
  // Modal (message only)
  // =========================
  const modal = (() => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 14px;
      z-index: 9999;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      width: min(560px, 100%);
      background: #0f1620;
      color: #e9eef5;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 14px;
      box-shadow: 0 18px 60px rgba(0,0,0,.45);
      overflow: hidden;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 12px;
      background: rgba(255,255,255,.03);
      border-bottom: 1px solid rgba(255,255,255,.08);
    `;

    const title = document.createElement("div");
    title.style.cssText = "font-weight: 900; font-size: 14px;";
    title.textContent = "Send Page";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.05);
      color: #fff;
      border-radius: 10px;
      padding: 6px 10px;
      cursor: pointer;
      font-weight: 900;
      line-height: 1;
    `;

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "padding: 12px; display: grid; gap: 10px;";

    const meta = document.createElement("div");
    meta.style.cssText = "font-size: 13px; opacity: .85;";

    const textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.placeholder = "Type message…";
    textarea.style.cssText = `
      width: 100%;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.05);
      color: #fff;
      outline: none;
      resize: vertical;
      font-size: 14px;
      box-sizing: border-box;
    `;

    const footer = document.createElement("div");
    footer.style.cssText = `
      padding: 12px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      border-top: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.02);
    `;

    const pmStatus = document.createElement("div");
    pmStatus.style.cssText = "font-size: 13px; opacity: .85;";

    const btns = document.createElement("div");
    btns.style.cssText = "display: flex; gap: 10px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.05);
      color: #fff;
      border-radius: 12px;
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 900;
      font-size: 13px;
    `;

    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.textContent = "Send";
    sendBtn.style.cssText = `
      border: 1px solid rgba(160,255,180,.35);
      background: rgba(160,255,180,.14);
      color: #e9fff0;
      border-radius: 12px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 950;
      font-size: 13px;
    `;

    btns.appendChild(cancelBtn);
    btns.appendChild(sendBtn);

    footer.appendChild(pmStatus);
    footer.appendChild(btns);

    body.appendChild(meta);
    body.appendChild(textarea);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let current = { name: "", pager: "" };

    function open({ name, pager }) {
      current = { name: name || "Recipient", pager: digitsOnly(pager) };
      meta.textContent = `To: ${current.name} (pager ${current.pager})`;
      pmStatus.textContent = "";
      textarea.value = "";
      overlay.style.display = "flex";
      setTimeout(() => textarea.focus(), 0);
    }

    function close() {
      overlay.style.display = "none";
    }

    async function send() {
      const pager = current.pager;
      const msg = textarea.value.trim();

      if (!pager) return (pmStatus.textContent = "Missing pager.");
      if (!msg) return (pmStatus.textContent = "Message required.");

      try {
        pmStatus.textContent = "Sending…";
        sendBtn.disabled = true;
        cancelBtn.disabled = true;

        await sendPageToWorker({ pager, message: msg });

        pmStatus.textContent = "Sent ✅";
        toast(`Page sent to ${current.name} (${pager})`);
        setTimeout(close, 250);
      } catch (e) {
        console.error(e);
        pmStatus.textContent = `Failed: ${e.message}`;
      } finally {
        sendBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    }

    closeBtn.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (overlay.style.display !== "none" && e.key === "Escape") close();
    });
    sendBtn.addEventListener("click", send);

    return { open, close };
  })();

  // =========================
  // Render using your CSS classes
  // =========================
  function render(list) {
    const groups = new Map();
    for (const e of list) {
      const cat = String(e.category || "Other").trim() || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(e);
    }

    const cats = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    for (const cat of cats) {
      groups.get(cat).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    const html = [];
    for (const cat of cats) {
      const items = groups.get(cat);

      html.push(`
        <div class="card">
          <div class="row">
            <div style="font-weight:900">${escapeHtml(cat)}</div>
          </div>
      `);

      for (const e of items) {
        const name = String(e.name || "Unknown");
        const notes = String(e.notes || "").trim();
        const calls = Array.isArray(e.call) ? e.call.filter(Boolean) : [];
        const faxes = Array.isArray(e.fax) ? e.fax.filter(Boolean) : [];
        const pagerDigits = digitsOnly(e.pager);

        html.push(`
          <div class="row">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
              <div style="min-width:0;">
                <div style="font-weight:950">${escapeHtml(name)}</div>
                ${notes ? `<div class="muted" style="font-size:12px; margin-top:3px;">${escapeHtml(notes)}</div>` : ""}
                ${pagerDigits ? `<div class="muted" style="font-size:12px; margin-top:3px;">Pager: ${escapeHtml(pagerDigits)}</div>` : ""}
              </div>
            </div>

            <div class="chips">
              ${calls
                .map((c) => {
                  const d = digitsOnly(c);
                  if (!d) return "";
                  return `<a class="chip" href="${telHref(d)}">Call ${escapeHtml(formatPhone(c))}</a>`;
                })
                .join("")}

              ${faxes
                .map((f) => {
                  const d = digitsOnly(f);
                  if (!d) return "";
                  return `<a class="chip chip--fax" href="${telHref(d)}">Fax ${escapeHtml(formatPhone(f))}</a>`;
                })
                .join("")}

              ${
                pagerDigits
                  ? `<button class="chip chip--page" type="button" data-name="${escapeHtml(
                      name
                    )}" data-pager="${escapeHtml(pagerDigits)}">Page</button>`
                  : ""
              }
            </div>
          </div>
        `);
      }

      html.push(`</div>`);
    }

    content.innerHTML = html.join("");

    content.querySelectorAll('button.chip--page[data-pager]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name") || "Recipient";
        const pager = btn.getAttribute("data-pager") || "";
        modal.open({ name, pager });
      });
    });
  }

  function applyFilter() {
    const query = norm(q);
    const filtered = all.filter((e) => matchesEntry(e, query));
    status.textContent = `Loaded ${all.length} entries • Showing ${filtered.length}`;
    render(filtered);
  }

  // =========================
  // Load directory JSON
  // =========================
  try {
    status.textContent = "Loading…";
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error("directory2.json must be a JSON array");
    all = json;
    applyFilter();
  } catch (err) {
    console.error(err);
    status.textContent = `Failed to load directory2.json: ${err.message}`;
    content.innerHTML = `<div class="card"><div class="row">Load failed: ${escapeHtml(
      err.message
    )}</div></div>`;
  }

  // Search
  let t = null;
  search.addEventListener("input", (e) => {
    q = e.target.value || "";
    clearTimeout(t);
    t = setTimeout(applyFilter, 120);
  });
})();
