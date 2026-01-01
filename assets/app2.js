(async () => {
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  const search = document.getElementById("search");

  const data = await (await fetch("./assets/data/directory2.json")).json();
  status.textContent = `Loaded ${data.length} entries`;

  function render(filter = "") {
    content.innerHTML = "";
    const term = filter.toLowerCase();
(async () => {
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  const search = document.getElementById("search");

  const data = await (await fetch("./assets/data/directory2.json")).json();
  status.textContent = `Loaded ${data.length} entries`;

  function render(filter = "") {
    content.innerHTML = "";
    const term = filter.toLowerCase();

    const groups = {};
    data.forEach(d => {
      const blob = JSON.stringify(d).toLowerCase();
      if (!blob.includes(term)) return;
      groups[d.category] ??= [];
      groups[d.category].push(d);
    });

    for (const cat in groups) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<div class="row"><strong>${cat}</strong></div>`;

      groups[cat].forEach(d => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<div>${d.name}</div>`;

        const chips = document.createElement("div");
        chips.className = "chips";

        d.call?.forEach(c => {
          const a = document.createElement("a");
          a.className = "chip";
          a.href = `tel:+1718670${c}`;
          a.textContent = `Call ${c}`;
          chips.appendChild(a);
        });

        if (d.pager) {
          const b = document.createElement("button");
          b.className = "chip chip--page";
          b.textContent = `Page ${d.pager}`;
          b.onclick = () => window.Paging.send(d.pager);
          chips.appendChild(b);
        }

        row.appendChild(chips);
        card.appendChild(row);
      });

      content.appendChild(card);
    }
  }

  search.oninput = e => render(e.target.value);
  render();
})();
    const groups = {};
    data.forEach(d => {
      const blob = JSON.stringify(d).toLowerCase();
      if (!blob.includes(term)) return;
      groups[d.category] ??= [];
      groups[d.category].push(d);
    });

    for (const cat in groups) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<div class="row"><strong>${cat}</strong></div>`;

      groups[cat].forEach(d => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<div>${d.name}</div>`;

        const chips = document.createElement("div");
        chips.className = "chips";

        d.call?.forEach(c => {
          const a = document.createElement("a");
          a.className = "chip";
          a.href = `tel:+1718670${c}`;
          a.textContent = `Call ${c}`;
          chips.appendChild(a);
        });

        if (d.pager) {
          const b = document.createElement("button");
          b.className = "chip chip--page";
          b.textContent = `Page ${d.pager}`;
          b.onclick = () => window.Paging.send(d.pager);
          chips.appendChild(b);
        }

        row.appendChild(chips);
        card.appendChild(row);
      });

      content.appendChild(card);
    }
  }

  search.oninput = e => render(e.target.value);
  render();
})();
