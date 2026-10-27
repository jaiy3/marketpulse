(() => {
  const SYMBOLS = [
    { id: "BTCUSDT", name: "Bitcoin", base: "BTC" },
    { id: "ETHUSDT", name: "Ethereum", base: "ETH" },
    { id: "SOLUSDT", name: "Solana", base: "SOL" },
    { id: "BNBUSDT", name: "BNB", base: "BNB" },
  ];
  const SPARK_POINTS = 120;
  const FEED_SIZE = 18;

  const $ = (id) => document.getElementById(id);
  const state = {};
  let total = 0;
  let windowCount = 0;
  let historySymbol = SYMBOLS[0].id;

  const fmtPrice = (p) => {
    const n = Number(p);
    const digits = n >= 1000 ? 2 : n >= 1 ? 3 : 5;
    return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const fmtQty = (q) => Number(q).toLocaleString("en-US", { maximumFractionDigits: 5 });
  const fmtTime = (ms) => new Date(ms).toISOString().slice(11, 19);

  // ---- Cards ----
  const cards = $("cards");
  for (const s of SYMBOLS) {
    state[s.id] = { first: null, last: null, points: [] };
    const el = document.createElement("article");
    el.className = "card";
    el.id = `card-${s.id}`;
    el.innerHTML = `
      <div class="card-top"><span class="sym">${s.base}<small>${s.name}</small></span><span class="chg" id="chg-${s.id}"></span></div>
      <div class="price" id="price-${s.id}">—</div>
      <div class="meta" id="meta-${s.id}">Waiting for a trade…</div>
      <canvas class="spark" id="spark-${s.id}" aria-hidden="true"></canvas>`;
    cards.appendChild(el);
  }

  function drawSpark(symbol) {
    const canvas = $(`spark-${symbol}`);
    const pts = state[symbol].points;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (pts.length < 2) return;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const up = pts[pts.length - 1] >= pts[0];
    ctx.strokeStyle = up ? "#22c38e" : "#f2555a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - 3 - ((p - min) / span) * (h - 6);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  function applyTick(tick, { live = true } = {}) {
    const s = state[tick.symbol];
    if (!s) return;
    const price = Number(tick.price);
    const prev = s.last;
    if (s.first === null) s.first = price;
    s.last = price;
    s.points.push(price);
    if (s.points.length > SPARK_POINTS) s.points.shift();

    $(`price-${tick.symbol}`).textContent = `$${fmtPrice(price)}`;
    $(`meta-${tick.symbol}`).textContent = `Last trade ${fmtTime(tick.eventTime)} UTC`;
    const change = ((price - s.first) / s.first) * 100;
    const chg = $(`chg-${tick.symbol}`);
    chg.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;
    chg.style.color = change >= 0 ? "var(--up)" : "var(--down)";
    chg.title = "Change since you opened this page";

    if (live && prev !== null && price !== prev) {
      const card = $(`card-${tick.symbol}`);
      card.classList.remove("flash-up", "flash-down");
      card.classList.add(price > prev ? "flash-up" : "flash-down");
      clearTimeout(card._t);
      card._t = setTimeout(() => card.classList.remove("flash-up", "flash-down"), 500);
    }
  }

  // ---- Feed ----
  const feed = $("feed");
  function addToFeed(tick) {
    const s = state[tick.symbol];
    const base = SYMBOLS.find((x) => x.id === tick.symbol)?.base ?? tick.symbol;
    const li = document.createElement("li");
    const pts = s.points;
    const dir = pts.length > 1 && pts[pts.length - 1] < pts[pts.length - 2] ? "var(--down)" : "var(--up)";
    li.innerHTML = `<span class="t">${fmtTime(tick.eventTime)}</span><span>${base}</span><span class="r" style="color:${dir}">${fmtPrice(tick.price)}</span><span class="r t">${fmtQty(tick.quantity)}</span>`;
    feed.querySelector(".empty")?.remove();
    feed.prepend(li);
    while (feed.children.length > FEED_SIZE) feed.lastChild.remove();
  }

  // Throttle the feed so a burst of trades stays readable.
  let feedBudget = 0;
  setInterval(() => { feedBudget = 6; }, 1000);

  // ---- WebSocket ----
  let backoff = 1000;
  function setLive(status) {
    const dot = $("live-dot");
    const label = $("live-label");
    const ws = $("s-ws");
    if (status === "live") {
      dot.className = "dot live"; label.textContent = "Live · streaming from Binance";
      ws.textContent = "Connected"; ws.className = "v ok";
    } else {
      dot.className = "dot"; label.textContent = status === "connecting" ? "Connecting…" : "Reconnecting…";
      ws.textContent = status === "connecting" ? "Connecting" : "Reconnecting"; ws.className = "v bad";
    }
  }

  // Quiet pairs may not have traded in the last 30s (the cache TTL). Show their last
  // stored trade, clearly timestamped, instead of an empty card.
  async function fillFromHistory() {
    await Promise.all(
      SYMBOLS.filter((s) => state[s.id].last === null).map(async (s) => {
        try {
          const res = await fetch(`/api/market/history?symbol=${s.id}&limit=1`);
          const item = (await res.json()).data?.items?.[0];
          if (item && state[s.id].last === null) {
            applyTick({ symbol: s.id, price: item.price, quantity: item.quantity, eventTime: Date.parse(item.eventTime) }, { live: false });
          }
        } catch { /* leave the card waiting */ }
      })
    );
  }

  function connect() {
    setLive("connecting");
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);

    ws.onopen = () => {
      backoff = 1000;
      ws.send(JSON.stringify({ type: "subscribe", symbols: SYMBOLS.map((s) => s.id) }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "subscribed") {
        setLive("live");
        (msg.snapshot || []).forEach((t) => applyTick(t, { live: false }));
        void fillFromHistory();
        return;
      }
      if (msg.type === "connected" || msg.type === "error") return;
      if (!msg.symbol) return;
      total += 1;
      windowCount += 1;
      applyTick(msg);
      if (feedBudget > 0) { feedBudget -= 1; addToFeed(msg); }
    };

    ws.onclose = () => {
      setLive("reconnecting");
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 15000);
    };
  }
  connect();

  // Repaint sparklines and counters a few times a second rather than on every trade.
  setInterval(() => SYMBOLS.forEach((s) => drawSpark(s.id)), 250);
  setInterval(() => {
    $("s-count").textContent = total.toLocaleString("en-US");
    $("s-rate").textContent = String(windowCount);
    windowCount = 0;
  }, 1000);

  // ---- Health ----
  async function refreshHealth() {
    try {
      const res = await fetch("/health");
      const body = await res.json();
      for (const [key, el] of [["database", "s-db"], ["redis", "s-redis"]]) {
        const up = body.checks?.[key] === "up";
        $(el).textContent = up ? "Healthy" : "Down";
        $(el).className = `v ${up ? "ok" : "bad"}`;
      }
    } catch {
      $("s-db").textContent = $("s-redis").textContent = "Unknown";
    }
  }
  refreshHealth();
  setInterval(refreshHealth, 15000);

  // ---- History ----
  const tabs = $("history-tabs");
  for (const s of SYMBOLS) {
    const b = document.createElement("button");
    b.textContent = s.base;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(s.id === historySymbol));
    b.onclick = () => {
      historySymbol = s.id;
      [...tabs.children].forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      loadHistory();
    };
    tabs.appendChild(b);
  }

  async function loadHistory() {
    const tbody = $("history");
    try {
      const started = performance.now();
      const res = await fetch(`/api/market/history?symbol=${historySymbol}&limit=10`);
      const ms = Math.round(performance.now() - started);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Request failed");
      const items = body.data.items;
      tbody.innerHTML = items.length
        ? items.map((i) => `<tr><td>${i.eventTime.slice(11, 19)}</td><td class="r">${fmtPrice(i.price)}</td><td class="r">${fmtQty(i.quantity)}</td></tr>`).join("")
        : `<tr><td colspan="3" class="empty">No stored history yet. It fills within seconds of the stream starting.</td></tr>`;
      $("history-meta").innerHTML = `REST <code>/api/market/history</code> · ${body.data.pagination.total.toLocaleString("en-US")} rows stored · ${ms} ms`;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty">Could not load history: ${err.message}</td></tr>`;
    }
  }
  loadHistory();
  setInterval(loadHistory, 10000);

  // ---- Try the API ----
  const origin = location.origin;
  $("c1").textContent = `curl "${origin}/api/market/latest?symbols=BTCUSDT,ETHUSDT"`;
  $("c2").textContent = `curl "${origin}/api/market/history?symbol=BTCUSDT&limit=5"`;
  $("c3").textContent = `websocat ${origin.replace(/^http/, "ws")}/ws  # then send {"type":"subscribe","symbols":["BTCUSDT"]}`;
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText($(btn.dataset.copy).textContent);
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      } catch { /* clipboard unavailable */ }
    };
  });
})();
