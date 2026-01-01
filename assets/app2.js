(function () {
  const data = Array.isArray(window.DIRECTORY) ? window.DIRECTORY : [];

  // Helpers
  const normArr = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
  const clean = (v) => (v == null ? "" : String(v).trim());
  const digitsOnly = (s) => clean(s).replace(/\D/g, "");

  function groupByCategory(items) {
    const map = new Map();
    for (const item of items) {
      const cat = clean(item.category) || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    return map;
  }

  function makeBtn(label, href) {
    const a = document.createElement("a");
    a.className = "btn"; // match your CSS button class
    a.textContent = label;
    a.href = href;
    return a;
  }

  function render() {
    const root = document.getElementById("directoryRoot");
    if (!root) return;

    root.innerHTML = "";

    const grouped = groupByCategory(data);

    for (const [category, items] of grouped.entries()) {
      const section = document.createElement("section");
      section.className = "category";

      const h = document.createElement("h2");
      h.textContent = category;
      section.appendChild(h);

      for (const item of items) {
        const name = clean(item.name) || "Unknown";

        const card = document.createElement("div");
        card.className = "card";

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = name;
        card.appendChild(title);

        const notes = clean(item.notes);
        if (notes) {
          const n = document.createElement("div");
          n.className = "notes";
          n.textContent = notes;
          card.appendChild(n);
        }

        const actions = document.createElement("div");
        actions.className = "actions";

        // CALL buttons
        const calls = normArr(item.call).map(digitsOnly).filter(Boolean);
        for (const c of calls) {
          actions.appendChild(makeBtn(`Call ${c.length <= 5 ? "ext " : ""}${c}`, `tel:${c}`));
        }

        // PAGER button (test)
        const pager = digitsOnly(item.pager);
        if (pager) {
          // For now just opens your paging test modal/box (you can wire this)
          const b = document.createElement("button");
          b.className = "btn secondary";
          b.type = "button";
          b.textContent = `Page ${pager}`;
          b.addEventListener("click", () => {
            openPagerBox({ name, pager });
          });
          actions.appendChild(b);
        }

        card.appendChild(actions);
        section.appendChild(card);
      }

      root.appendChild(section);
    }
  }

  // Simple pager box for testing (no send logic required yet)
  function openPagerBox({ name, pager }) {
    const overlay = document.getElementById("pagerOverlay");
    const who = document.getElementById("pagerWho");
    const num = document.getElementById("pagerNum");
    const msg = document.getElementById("pagerMsg");

    if (!overlay || !who || !num || !msg) {
      alert(`Paging test:\n${name}\nPager: ${pager}`);
      return;
    }

    who.textContent = name;
    num.textContent = pager;
    msg.value = "";
    overlay.style.display = "block";
    msg.focus();
  }

  // Close button wiring
  window.closePagerBox = function () {
    const overlay = document.getElementById("pagerOverlay");
    if (overlay) overlay.style.display = "none";
  };

  render();
})();
