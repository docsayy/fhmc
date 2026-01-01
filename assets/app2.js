// assets/app2.js
// Directory + Paging (Cloudflare Worker) — complete file
// Requires in index2.html:
//   <div id="status"></div>
//   <input id="search" ...>
//   <div id="content"></div>
//
// Data file:
//   ./assets/data/directory2.json  (must be a JSON array of entries)
//
// Entry shape supported:
//   {
//     "category": "Radiology — Radiologists (Onsite)",
//     "name": "Dr Arnuk",
//     "call": ["7182066955"],          // optional
//     "fax": ["..."],                  // optional (not used)
//     "pager": "11171" | null,         // optional; if present shows Page button
//     "notes": "Onsite (ext 7753)"     // optional
//   }

(() => {
  // =========================
  // CONFIG — EDIT THESE
  // =========================
  const DATA_URL = "./assets/data/directory2.json";

  // Cloudflare Worker endpoint that accepts JSON: { pager, message, fromName }
  // Example: "https://fhmc-pager.yourname.workers.dev/page"
  const WORKER_URL = "https://YOUR-WORKER-DOMAIN/page";

  // If you set env.PAGER_SHARED_TOKEN in the worker, put the same value here.
  // Otherwise leave "".
  const SHARED_TOKEN = "";

  // Sender name for the page
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
  // State
  // =========================
  let all = [];
  let filtered = [];
  let q = "";

  // =========================
  // Utils
  // =========================
  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");
  const norm = (s) => String(s ?? "").toLowerCase().trim();

  function formatPhone(d) {
    const x = digitsOnly(d);
    if (x.length === 10) return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`;
    return d;
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
      entry.pager ?? "",
      entry.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  }

  // =========================
  // Paging backend call
  // =========================
  async function sendPageToCloudflare({ pager, message, fromName }) {
    if (!WORKER_URL || WORKER_URL.includes("YOUR-WORKER-DOMAIN")) {
      throw new Error("WORKER_URL not set in app2.js");
    }

    const payload = {
      pager: String(pager || ""),
      message: String(message || ""),
      fromName: fromName || FROM_NAME,
    };

    const headers = { "Content-Type": "application/json" };
    if (SHARED_TOKEN) headers["x-pager-token"] = SHARED_TOKEN;

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    // Worker should return JSON like {ok:true} / {ok:false,error:"..."}
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // If worker returned plain text, surface it
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      return { ok: true, raw: text };
    }

    if (!res.ok || !json.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    return json;
  }

  // =========================
  // Modal UI (created dynamically)
  // =========================
  const modal = (() => {
    const overlay = document.createElement("div");
    overlay.id = "pageModalOverlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: none; align-items: center; justify-content: center;
      padding: 16px; z-index: 9999;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      width: min(520px, 100%);
      background: #fff; border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,.25);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
      padding: 14px 16px; border-bottom: 1px solid #eee;
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px;
    `;

    const title = document.createElement("div");
    title.style.cssText = `font-weight: 700; font-size: 16px;`;
    title.textContent = "Send Page";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.style.cssText = `
      border: none; background: transparent; cursor: pointer;
      font-size: 18px; line-height: 1; padding: 8px; border-radius: 10px;
    `;
    closeBtn.onmouseenter = () => (closeBtn.style.background = "#f3f3f3");
    closeBtn.onmouseleave = () => (closeBtn.style.background = "transparent");

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = `padding: 14px 16px; display: grid; gap: 10px;`;

    const meta = document.createElement("div");
    meta.style.cssText = `font-size: 13px; color: #444;`;
    meta.innerHTML = `<div><b>To:</b> <span id="pmTo"></span></div>`;

    const cbLabel = document.createElement("label");
    cbLabel.style.cssText = `display: grid; gap: 6px; font-size: 13px; color: #222;`;
    cbLabel.innerHTML = `<span>Callback extension/number (optional)</span>`;

    const cbInput = document.createElement("input");
    cbInput.id = "pmCallback";
    cbInput.type = "text";
    cbInput.placeholder = "e.g., 5559 or 718-xxx-xxxx";
    cbInput.style.cssText = `
      width: 100%; padding: 10px 12px; border-radius: 12px;
      border: 1px solid #ddd; outline: none; font-size: 14px;
    `;
    cbInput.onfocus = () => (cbInput.style.borderColor = "#999");
    cbInput.onblur = () => (cbInput.style.borderColor = "#ddd");
    cbLabel.appendChild(cbInput);

    const msgLabel = document.createElement("label");
    msgLabel.style.cssText = `display: grid; gap: 6px; font-size: 13px; color: #222;`;
    msgLabel.innerHTML = `<span>Message</span>`;

    const msgArea = document.createElement("textarea");
    msgArea.id = "pmMessage";
    msgArea.rows = 4;
    msgArea.placeholder = "Type message…";
    msgArea.style.cssText = `
      width: 100%; padding: 10px 12px; border-radius: 12px;
      border: 1px solid #ddd; outline: none; font-size: 14px; resize: vertical;
    `;
    msgArea.onfocus = () => (msgArea.style.borderColor = "#999");
    msgArea.onblur = () => (msgArea.style.borderColor = "#ddd");
    msgLabel.appendChild(msgArea);

    const footer = document.createElement("div");
    footer.style.cssText = `
      padding: 12px 16px; border-top: 1px solid #eee;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    `;

    const pmStatus = document.createElement("div");
    pmStatus.id = "pmStatus";
    pmStatus.style.cssText = `font-size: 13px; color: #444;`;

    const actions = document.createElement("div");
    actions.style.cssText = `display: flex; gap: 10px;`;

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText = `
      padding: 10px 12px; border-radius: 12px;
      border: 1px solid #ddd; background: #fff; cursor: pointer; font-weight: 600;
    `;

    const send = document.createElement("button");
    send.type = "button";
    send.textContent = "Send";
    send.style.cssText = `
      padding: 10px 14px; border-radius: 12px;
      border: 1px solid #111; background: #111; color: #fff;
      cursor: pointer; font-weight: 700;
    `;

    actions.appendChild(cancel);
    actions.appendChild(send);

    footer.appendChild(pmStatus);
    footer.appendChild(actions);

    body.appendChild(meta);
    body.appendChild(cbLabel);
    body.appendChild(msgLabel);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let current = { name: "", pager: "" };

    function open({ name, pager }) {
      current = { name: name || "Recipient", pager: digitsOnly(pager) };
      document.getElementById("pmTo").textContent = `${name || ""} (pager ${current.pager})`;
      pmStatus.textContent = "";
      cbInput.value = "";
      msgArea.value = "";
      overlay.style.display = "flex";
      setTimeout(() => msgArea.focus(), 0);
    }

    function close() {
      overlay.style.display = "none";
    }

    async function doSend() {
      const pager = current.pager;
      const cb = cbInput.value.trim();
      const msg = msgArea.value.trim();

      const parts = [];
      if (cb) parts.push(`Callback: ${cb}`);
      if (msg) parts.push(msg);
      const finalMsg = parts.join("\n").trim();

      if (!pager) {
        pmStatus.textContent = "Missing pager.";
        return;
      }
      if (!finalMsg) {
        pmStatus.textContent = "Message is empty.";
        return;
      }

      try {
        pmStatus.textContent = "Sending…";
        send.disabled = true;
        cancel.disabled = true;

        await sendPageToCloudflare({ pager, message: finalMsg, fromName: FROM_NAME });

        pmStatus.textContent = "Sent ✅";
        status.textContent = `Page sent to ${current.name} (pager ${pager})`;
        setTimeout(close, 350);
      } catch (e) {
        console.error(e);
        pmStatus.textContent = `Failed: ${e.message}`;
      } finally {
        send.disabled = false;
        cancel.disabled = false;
      }
    }

    // Close behaviors
    closeBtn.addEventListener("click", close);
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (overlay.style.display !== "none" && e.key === "Escape") close();
    });

    send.addEventListener("click", doSend);

    return { open, close };
  })();

  // =========================
  // Rendering
  // =========================
  function render(list) {
    if (!Array.isArray(list)) list = [];

    // Group by category
    const groups = new Map();
    for (const entry of list) {
      const cat = String(entry.category || "Other").trim() || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(entry);
    }

    // Sort categories, then names
    const cats = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    for (const cat of cats) {
      groups.get(cat).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    // Build HTML
    const out = [];
    for (const cat of cats) {
      out.push(`
        <section class="dir-group" style="margin: 14px 0;">
          <div class="dir-cat" style="
            font-weight: 800; font-size: 14px; letter-spacing: .2px;
            margin: 10px 2px; color: #222;">
            ${escapeHtml(cat)}
          </div>
          <div class="dir-list" style="display: grid; gap: 10px;">
      `);

      for (const e of groups.get(cat)) {
        const name = String(e.name || "Unknown");
        const notes = String(e.notes || "").trim();
        const calls = Array.isArray(e.call) ? e.call.filter(Boolean) : [];
        const pager = e.pager != null ? String(e.pager) : "";

        // Action buttons
        const callBtns = calls
          .map((c) => {
            const d = digitsOnly(c);
            const label = formatPhone(c);
            if (!d) return "";
            return `<a class="btn call" href="${telHref(d)}"
                      style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center;
                      padding:8px 10px; border-radius:12px; border:1px solid #ddd; font-weight:700; color:#111;">
                      Call ${escapeHtml(label)}
                    </a>`;
          })
          .join(" ");

        const pageBtn = digitsOnly(pager)
          ? `<button class="btn page" data-name="${escapeHtml(name)}" data-pager="${escapeHtml(pager)}"
              style="display:inline-flex; align-items:center; justify-content:center;
              padding:8px 10px; border-radius:12px; border:1px solid #111; background:#111; color:#fff; font-weight:800; cursor:pointer;">
              Page
            </button>`
          : "";

        out.push(`
          <div class="dir-card" style="
            background:#fff; border:1px solid #eee; border-radius:14px;
            box-shadow: 0 8px 22px rgba(0,0,0,.06);
            padding:12px 12px; display:grid; gap:8px;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
              <div style="min-width:0;">
                <div style="font-weight:900; font-size:15px; color:#111; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(name)}
                </div>
                ${
                  notes
                    ? `<div style="margin-top:4px; font-size:13px; color:#444;">${escapeHtml(notes)}</div>`
                    : ""
                }
                ${
                  digitsOnly(pager)
                    ? `<div style="margin-top:4px; font-size:12px; color:#666;">Pager: ${escapeHtml(
                        digitsOnly(pager)
                      )}</div>`
                    : ""
                }
              </div>
            </div>
            <div class="dir-actions" style="display:flex; flex-wrap:wrap; gap:8px;">
              ${callBtns}
              ${pageBtn}
            </div>
          </div>
        `);
      }

      out.push(`</div></section>`);
    }

    content.innerHTML = out.join("");

    // Wire Page buttons
    content.querySelectorAll("button.btn.page").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name") || "Recipient";
        const pager = btn.getAttribute("data-pager") || "";
        modal.open({ name, pager });
      });
    });
  }

  function applyFilter() {
    const query = norm(q);
    filtered = all.filter((e) => matchesEntry(e, query));
    status.textContent = `Loaded ${all.length} entries • Showing ${filtered.length}`;
    render(filtered);
  }

  // =========================
  // Load
  // =========================
  async function load() {
    status.textContent = "Loading directory…";
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("directory2.json must be a JSON array");
      all = json;
      applyFilter();
    } catch (err) {
      console.error(err);
      status.textContent = `Failed to load directory2.json: ${err.message}`;
      content.innerHTML = `
        <div style="padding:14px; background:#fff; border:1px solid #eee; border-radius:14px;">
          <div style="font-weight:900; margin-bottom:6px;">Could not load directory</div>
          <div style="color:#444; font-size:13px;">${escapeHtml(err.message)}</div>
        </div>
      `;
    }
  }

  // =========================
  // Search
  // =========================
  let t = null;
  search.addEventListener("input", (e) => {
    q = e.target.value || "";
    clearTimeout(t);
    t = setTimeout(applyFilter, 120);
  });

  // Go
  load();
})();
