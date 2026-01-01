window.Paging = (() => {
  let CONFIG = null;

  async function loadConfig() {
    if (CONFIG) return CONFIG;
    const res = await fetch("./assets/data/config.json", { cache: "no-store" });
    CONFIG = await res.json();
    return CONFIG;
  }

  function showToast(text, ms = 2200) {
    const el = document.getElementById("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), ms);
  }

  function digitsOnly(s) { return String(s || "").replace(/\D/g, ""); }

  function ensureModal() {
    let modal = document.getElementById("pageModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "pageModal";
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.55);
      display:none;align-items:flex-end;justify-content:center;z-index:9999;
      padding:14px;
    `;
    modal.innerHTML = `
      <div style="width:100%;max-width:520px;background:#141a22;border:1px solid rgba(255,255,255,.12);
                  border-radius:16px;padding:14px;color:#e9eef5">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div style="font-weight:800">Send Page</div>
          <button id="pageClose" style="background:transparent;border:0;color:#e9eef5;font-size:18px;cursor:pointer">✕</button>
        </div>

        <textarea id="pageMsg" rows="4"
          style="width:100%;margin-top:10px;padding:12px;border-radius:12px;
                 border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);
                 color:#e9eef5;resize:vertical"
          placeholder=""></textarea>

        <div style="display:flex;gap:10px;margin-top:10px">
          <button id="pageSend" class="chip chip--page" style="border:none">Send</button>
          <button id="pageCancel" class="chip" style="border:none">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#pageClose").onclick = () => (modal.style.display = "none");
    modal.querySelector("#pageCancel").onclick = () => (modal.style.display = "none");
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    return modal;
  }

  async function promptAndSendPage(pagerDigits) {
    const cfg = await loadConfig();
    const pager = digitsOnly(pagerDigits);
    if (!pager) { showToast("Invalid pager"); return; }

    const modal = ensureModal();
    const textarea = modal.querySelector("#pageMsg");
    const sendBtn = modal.querySelector("#pageSend");

    textarea.value = "";
    modal.style.display = "flex";
    textarea.focus();

    sendBtn.onclick = async () => {
      const message = textarea.value.trim();
      if (!message) {
        showToast("Type a message to send.", 2500);
        textarea.focus();
        return;
      }

      modal.style.display = "none";

      const endpoint = cfg.pagerSendEndpoint || "";
      if (!endpoint || endpoint.includes("REPLACE-WITH-YOUR-WORKER-URL")) {
        showToast("Not configured: add Worker URL in config.json", 3500);
        return;
      }

      showToast("Sending…", 2500);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // recommended if your site is public:
            ...(cfg.pagerSharedToken ? { "x-pager-token": cfg.pagerSharedToken } : {})
          },
          body: JSON.stringify({
            pager,
            message,
            fromName: cfg.fromName || "FHMC Directory"
          })
        });

        if (res.ok) showToast("Page sent ✅");
        else showToast("Failed ❌", 3500);
      } catch {
        showToast("Failed ❌", 3500);
      }
    };
  }

  return { loadConfig, promptAndSendPage, showToast };
})();
