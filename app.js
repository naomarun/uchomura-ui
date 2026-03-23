const POLL_INTERVAL_MS = 15000;
const STALE_AFTER_MS = 2 * 60 * 1000;
const STATUS_URL = "./status.json";

const fallbackStatus = {
  updatedAt: "2026-03-23T20:43:00+09:00",
  connection: "mock",
  headline: "status.json が読めないときも、埋め込みモックで表示を維持します。",
  summary: {
    new: 2,
    running: 3,
    waitingApproval: 2,
    done: 6,
    error: 1
  },
  items: [
    {
      id: "req_101",
      kind: "request",
      label: "価格判断",
      state: "waiting_approval",
      needsNao: true,
      ageMin: 12,
      owner: "Nao",
      detail: "返信前の最終判断が必要",
      source: "slack",
      children: 0
    },
    {
      id: "req_102",
      kind: "request",
      label: "公開判断",
      state: "waiting_approval",
      needsNao: true,
      ageMin: 4,
      owner: "Nao",
      detail: "main Mac から即確認したい案件",
      source: "manual",
      children: 1
    },
    {
      id: "sub_201",
      kind: "subagent",
      label: "実装隊",
      state: "running",
      needsNao: false,
      ageMin: 17,
      owner: "Ucho",
      detail: "UI polish と README 更新",
      source: "openclaw",
      children: 0
    },
    {
      id: "sub_202",
      kind: "subagent",
      label: "調査隊",
      state: "running",
      needsNao: false,
      ageMin: 9,
      owner: "Ucho",
      detail: "配信方法を確認中",
      source: "openclaw",
      children: 0
    },
    {
      id: "req_103",
      kind: "request",
      label: "返信文案",
      state: "running",
      needsNao: false,
      ageMin: 6,
      owner: "Ucho",
      detail: "草案の仕上げ",
      source: "slack",
      children: 0
    },
    {
      id: "req_104",
      kind: "request",
      label: "LP確認",
      state: "new",
      needsNao: false,
      ageMin: 2,
      owner: "Queue",
      detail: "受信直後の新着依頼",
      source: "slack",
      children: 0
    },
    {
      id: "sub_203",
      kind: "subagent",
      label: "検証係",
      state: "new",
      needsNao: false,
      ageMin: 1,
      owner: "Queue",
      detail: "起動待ち",
      source: "openclaw",
      children: 0
    },
    {
      id: "req_105",
      kind: "request",
      label: "デプロイ失敗",
      state: "error",
      needsNao: false,
      ageMin: 8,
      owner: "Ucho",
      detail: "静的配信先の設定見直しが必要",
      source: "deploy",
      children: 0
    },
    {
      id: "req_106",
      kind: "request",
      label: "朝ブリーフ",
      state: "done",
      needsNao: false,
      ageMin: 35,
      owner: "Ucho",
      detail: "共有済み",
      source: "slack",
      children: 0
    },
    {
      id: "sub_204",
      kind: "subagent",
      label: "集計係",
      state: "done",
      needsNao: false,
      ageMin: 23,
      owner: "Ucho",
      detail: "件数集計を完了",
      source: "openclaw",
      children: 0
    },
    {
      id: "sub_205",
      kind: "subagent",
      label: "整形係",
      state: "done",
      needsNao: false,
      ageMin: 21,
      owner: "Ucho",
      detail: "イベント整形を完了",
      source: "openclaw",
      children: 0
    },
    {
      id: "req_107",
      kind: "request",
      label: "PR確認",
      state: "done",
      needsNao: false,
      ageMin: 18,
      owner: "Nao",
      detail: "確認完了",
      source: "github",
      children: 2
    }
  ],
  events: [
    { at: "20:43", level: "waiting_approval", text: "公開判断が なお待ち に移動" },
    { at: "20:41", level: "running", text: "実装隊が README 更新を開始" },
    { at: "20:39", level: "error", text: "デプロイ先の設定差異を検知" },
    { at: "20:37", level: "done", text: "PR確認が完了" }
  ]
};

const stateMeta = {
  waiting_approval: {
    label: "なお待ち",
    icon: "✋",
    face: "◉!",
    laneOrder: 0,
    description: "Nao の確認が必要なもの",
    tone: "attention"
  },
  error: {
    label: "エラー",
    icon: "⚠",
    face: ";_;",
    laneOrder: 1,
    description: "詰まりや失敗を検知",
    tone: "danger"
  },
  running: {
    label: "実行中",
    icon: "↻",
    face: "•ᴗ•",
    laneOrder: 2,
    description: "今まさに動いているもの",
    tone: "active"
  },
  new: {
    label: "新着",
    icon: "✦",
    face: "◕◕",
    laneOrder: 3,
    description: "まだ手をつけていない新しいもの",
    tone: "fresh"
  },
  done: {
    label: "完了",
    icon: "✓",
    face: "-ᴗ-",
    laneOrder: 4,
    description: "処理が落ち着いたもの",
    tone: "quiet"
  }
};

const summaryConfig = [
  ["waitingApproval", "なお待ち", "✋", "最優先"],
  ["error", "エラー", "⚠", "要確認"],
  ["running", "実行中", "↻", "処理中"],
  ["new", "新着", "✦", "未着手"],
  ["done", "完了", "✓", "処理済み"]
];

const dom = {
  summaryGrid: document.getElementById("summaryGrid"),
  lanes: document.getElementById("lanes"),
  eventsList: document.getElementById("eventsList"),
  priorityBanner: document.getElementById("priorityBanner"),
  priorityText: document.getElementById("priorityText"),
  prioritySubtext: document.getElementById("prioritySubtext"),
  priorityCount: document.getElementById("priorityCount"),
  staleBadge: document.getElementById("staleBadge"),
  sourceBadge: document.getElementById("sourceBadge"),
  sourceText: document.getElementById("sourceText"),
  connectionBadge: document.getElementById("connectionBadge"),
  connectionText: document.getElementById("connectionText"),
  headlineText: document.getElementById("headlineText"),
  updatedAt: document.getElementById("updatedAt"),
  detailCard: document.getElementById("detailCard"),
  cardTemplate: document.getElementById("cardTemplate"),
  laneTemplate: document.getElementById("laneTemplate"),
  characterTemplate: document.getElementById("characterTemplate")
};

let selectedId = null;
let lastRenderedData = null;

function normalizeData(raw, source) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const summary = raw.summary && typeof raw.summary === "object" ? raw.summary : summarizeItems(items);
  const updatedAt = raw.updatedAt || new Date().toISOString();
  const connection = raw.connection || (source === "fallback" ? "mock" : "ok");
  const headline = raw.headline || deriveHeadline(summary);
  const events = Array.isArray(raw.events) ? raw.events : [];

  return {
    updatedAt,
    connection,
    headline,
    source,
    summary: {
      new: summary.new ?? countState(items, "new"),
      running: summary.running ?? countState(items, "running"),
      waitingApproval: summary.waitingApproval ?? countState(items, "waiting_approval"),
      done: summary.done ?? countState(items, "done"),
      error: summary.error ?? countState(items, "error")
    },
    items: items.map((item) => ({
      id: item.id || `${item.kind || "item"}-${Math.random().toString(36).slice(2, 8)}`,
      kind: item.kind === "subagent" ? "subagent" : "request",
      label: item.label || item.title || "名称未設定",
      state: stateMeta[item.state] ? item.state : "new",
      needsNao: Boolean(item.needsNao),
      ageMin: Number.isFinite(item.ageMin) ? item.ageMin : 0,
      owner: item.owner || (item.needsNao ? "Nao" : "Ucho"),
      detail: item.detail || "詳細は exporter 側で追加できます。",
      source: item.source || "unknown",
      children: Number.isFinite(item.children) ? item.children : 0
    })),
    events: events.map((event) => normalizeEvent(event))
  };
}

function normalizeEvent(event) {
  if (typeof event === "string") {
    const [at, ...rest] = event.split(" ");
    return { at: at || "--:--", text: rest.join(" ") || event, level: "running" };
  }

  return {
    at: event.at || "--:--",
    text: event.text || "イベントなし",
    level: stateMeta[event.level] ? event.level : "running"
  };
}

function summarizeItems(items) {
  return {
    new: countState(items, "new"),
    running: countState(items, "running"),
    waitingApproval: countState(items, "waiting_approval"),
    done: countState(items, "done"),
    error: countState(items, "error")
  };
}

function countState(items, state) {
  return items.filter((item) => item.state === state).length;
}

function deriveHeadline(summary) {
  if ((summary.waitingApproval || 0) > 0) {
    return "なお待ちあり";
  }
  if ((summary.error || 0) > 0) {
    return "エラー対応を確認";
  }
  if ((summary.running || 0) > 0) {
    return "進行中タスクあり";
  }
  return "落ち着いています";
}

function formatUpdatedAt(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "更新時刻不明";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function ageFromTimestamp(isoString) {
  const time = new Date(isoString).getTime();
  if (Number.isNaN(time)) {
    return { stale: false, minutes: 0 };
  }

  const ageMs = Date.now() - time;
  return {
    stale: ageMs > STALE_AFTER_MS,
    minutes: Math.max(0, Math.round(ageMs / 60000))
  };
}

function render(data) {
  lastRenderedData = data;

  renderHeader(data);
  renderSummary(data.summary);
  renderLanes(data.items);
  renderEvents(data.events);

  const selected = data.items.find((item) => item.id === selectedId) || data.items[0] || null;
  selectedId = selected ? selected.id : null;
  renderDetail(selected);
}

function renderHeader(data) {
  const waitingCount = data.summary.waitingApproval || 0;
  const errorCount = data.summary.error || 0;
  const stale = ageFromTimestamp(data.updatedAt);

  dom.updatedAt.textContent = `${formatUpdatedAt(data.updatedAt)} 更新`;
  dom.sourceBadge.textContent = data.source === "remote" ? "status.json" : "埋め込みモック";
  dom.sourceBadge.className = `pill ${data.source === "remote" ? "neutral" : "warn"}`;
  dom.sourceText.textContent = data.source === "remote" ? STATUS_URL : "embedded fallback";

  const connectionView = getConnectionView(data.connection, data.source, stale.stale);
  dom.connectionBadge.textContent = connectionView.label;
  dom.connectionBadge.className = `pill ${connectionView.tone}`;
  dom.connectionText.textContent = connectionView.description;
  dom.headlineText.textContent = data.headline;

  dom.priorityCount.textContent = String(waitingCount);
  dom.priorityBanner.className = `priority-banner shell ${waitingCount > 0 ? "alert" : "calm"}${stale.stale ? " stale" : ""}`;

  if (waitingCount > 0) {
    dom.priorityText.textContent = `なお待ち ${waitingCount}件`;
    dom.prioritySubtext.textContent = errorCount > 0
      ? `なお待ち優先。加えてエラー ${errorCount}件もあります。`
      : "Nao が確認すべき案件を優先表示しています。";
  } else if (errorCount > 0) {
    dom.priorityText.textContent = `なお待ちは 0件 / エラー ${errorCount}件`;
    dom.prioritySubtext.textContent = "最優先の approval はありませんが、エラー確認は必要です。";
  } else {
    dom.priorityText.textContent = "なお待ちはありません";
    dom.prioritySubtext.textContent = stale.stale
      ? "表示は維持していますが、更新が古い可能性があります。"
      : "今は落ち着いています。進行中と新着を穏やかに監視できます。";
  }

  dom.staleBadge.classList.toggle("hidden", !stale.stale);
  if (stale.stale) {
    dom.staleBadge.textContent = `更新が ${stale.minutes}分前`;
  }
}

function getConnectionView(connection, source, stale) {
  if (source === "fallback") {
    return {
      label: "モック表示",
      tone: "warn",
      description: "fetch 失敗時の埋め込みデータ"
    };
  }

  if (stale || connection === "stale") {
    return {
      label: "更新古め",
      tone: "warn",
      description: "配信は見えているが新鮮さに注意"
    };
  }

  if (connection === "error") {
    return {
      label: "接続注意",
      tone: "error",
      description: "exporter 側を確認"
    };
  }

  return {
    label: "接続OK",
    tone: "ok",
    description: "status.json を取得中"
  };
}

function renderSummary(summary) {
  dom.summaryGrid.innerHTML = "";

  summaryConfig.forEach(([key, label, icon, note]) => {
    const node = dom.cardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".card-label").textContent = label;
    node.querySelector(".card-icon").textContent = icon;
    node.querySelector(".card-value").textContent = String(summary[key] ?? 0);
    node.querySelector(".card-note").textContent = note;
    dom.summaryGrid.appendChild(node);
  });
}

function renderLanes(items) {
  dom.lanes.innerHTML = "";

  Object.entries(stateMeta)
    .map(([state, meta]) => ({
      state,
      meta,
      items: items.filter((item) => item.state === state)
    }))
    .sort((a, b) => a.meta.laneOrder - b.meta.laneOrder)
    .forEach((group) => {
      const lane = dom.laneTemplate.content.firstElementChild.cloneNode(true);
      lane.classList.add(`state-${group.state}`);
      lane.querySelector("h3").textContent = `${group.meta.icon} ${group.meta.label}`;
      lane.querySelector(".lane-description").textContent = group.meta.description;
      lane.querySelector(".lane-count").textContent = `${group.items.length}件`;

      const chars = lane.querySelector(".characters");
      if (group.items.length === 0) {
        chars.appendChild(createEmptyState(group.meta));
      } else {
        group.items.forEach((item) => chars.appendChild(createCharacter(item)));
      }

      dom.lanes.appendChild(lane);
    });
}

function createEmptyState(meta) {
  const box = document.createElement("div");
  box.className = "empty-state";
  box.innerHTML = `
    <strong>${meta.label} はいま空です</strong>
    <p class="empty-copy">このレーンに入るものが出たら、ここにキャラが並びます。</p>
  `;
  return box;
}

function createCharacter(item) {
  const node = dom.characterTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(item.state, `state-${item.state}`);
  node.dataset.id = item.id;
  node.title = `${item.label} / ${stateMeta[item.state].label}`;
  node.setAttribute("aria-label", `${item.label} ${stateMeta[item.state].label}`);
  node.querySelector(".face").textContent = stateMeta[item.state].face;
  node.querySelector(".char-kind").textContent = item.kind === "subagent" ? "SUB" : "REQ";
  node.querySelector(".char-age").textContent = `${item.ageMin}分`;
  node.querySelector(".char-label").textContent = item.label;
  node.querySelector(".char-secondary").textContent = buildSecondaryLabel(item);
  node.classList.toggle("is-selected", item.id === selectedId);

  node.addEventListener("click", () => {
    selectedId = item.id;
    render(lastRenderedData);
  });

  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedId = item.id;
      render(lastRenderedData);
    }
  });

  return node;
}

function buildSecondaryLabel(item) {
  const bits = [item.owner, item.source];
  if (item.needsNao) {
    bits.unshift("NAO");
  }
  if (item.children > 0) {
    bits.push(`child ${item.children}`);
  }
  return bits.join(" / ");
}

function renderEvents(events) {
  dom.eventsList.innerHTML = "";

  if (!events.length) {
    const li = document.createElement("li");
    li.textContent = "イベントはまだありません。";
    dom.eventsList.appendChild(li);
    return;
  }

  events.forEach((event) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="event-time">${event.at}</span>${event.text}`;
    li.classList.add(`state-${event.level}`);
    dom.eventsList.appendChild(li);
  });
}

function renderDetail(item) {
  if (!item) {
    dom.detailCard.className = "detail-card empty";
    dom.detailCard.innerHTML = '<p class="detail-empty">表示できるキャラがありません。</p>';
    return;
  }

  const meta = stateMeta[item.state];
  dom.detailCard.className = "detail-card";
  dom.detailCard.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">${item.kind === "subagent" ? "Subagent" : "Request"}</p>
        <h3>${item.label}</h3>
      </div>
      <span class="detail-state state-${item.state}">
        ${meta.icon} ${meta.label}
      </span>
    </div>
    <div class="detail-grid">
      <div class="detail-block">
        <span class="detail-label">ID</span>
        <strong>${item.id}</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">経過</span>
        <strong>${item.ageMin}分</strong>
      </div>
      <div class="detail-block">
        <span class="detail-label">担当</span>
        <strong>${item.owner}</strong>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-block">
        <span class="detail-label">詳細</span>
        <p>${item.detail}</p>
      </div>
    </div>
    <div class="detail-tags">
      <span class="tag">${item.source}</span>
      <span class="tag">${item.needsNao ? "needs Nao" : "no approval"}</span>
      <span class="tag">${item.children} child</span>
    </div>
  `;
}

async function loadStatus() {
  try {
    const response = await fetch(STATUS_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    render(normalizeData(payload, "remote"));
  } catch (error) {
    console.warn("Failed to load status.json, using embedded fallback.", error);
    render(normalizeData({ ...fallbackStatus, updatedAt: new Date().toISOString() }, "fallback"));
  }
}

// --- Demo mode: rotate mock states every 8 seconds to show "life" ---
const DEMO_MODE = true; // Set false when real exporter is connected
const DEMO_INTERVAL_MS = 8000;

const demoScenarios = [
  // Scenario 0: Normal with 1 waiting
  (base) => base,
  // Scenario 1: 2 waiting, new subagent spawned
  (base) => {
    const items = [...base.items];
    items.push({
      id: "req_110",
      kind: "request",
      label: "採用面接日程",
      state: "waiting_approval",
      needsNao: true,
      ageMin: 1,
      owner: "Nao",
      detail: "候補日の最終確定が必要",
      source: "slack",
      children: 0
    });
    items.push({
      id: "sub_210",
      kind: "subagent",
      label: "リサーチ隊",
      state: "running",
      needsNao: false,
      ageMin: 0,
      owner: "Ucho",
      detail: "競合調査を開始",
      source: "openclaw",
      children: 0
    });
    return {
      ...base,
      updatedAt: new Date().toISOString(),
      headline: "なお待ち増加中 — 2件の判断が必要",
      summary: { new: 2, running: 4, waitingApproval: 3, done: 6, error: 1 },
      items,
      events: [
        { at: fmtNow(), level: "waiting_approval", text: "採用面接日程が なお待ちに追加" },
        { at: fmtNow(-1), level: "running", text: "リサーチ隊が起動" },
        ...base.events.slice(0, 2)
      ]
    };
  },
  // Scenario 2: Error resolved, things calming down
  (base) => {
    const items = base.items
      .filter((i) => i.state !== "error")
      .map((i) => i.state === "waiting_approval" && i.id === "req_101"
        ? { ...i, state: "done", needsNao: false, ageMin: i.ageMin + 5 }
        : i
      );
    return {
      ...base,
      updatedAt: new Date().toISOString(),
      headline: "落ち着いてきた — エラー解消済み",
      summary: { new: 2, running: 3, waitingApproval: 1, done: 7, error: 0 },
      items,
      events: [
        { at: fmtNow(), level: "done", text: "価格判断が完了（なお承認済み）" },
        { at: fmtNow(-1), level: "done", text: "デプロイ失敗が解消" },
        ...base.events.slice(0, 2)
      ]
    };
  },
  // Scenario 3: All clear
  (base) => {
    const items = base.items.map((i) =>
      i.state === "waiting_approval" || i.state === "new"
        ? { ...i, state: "done", needsNao: false, ageMin: i.ageMin + 10 }
        : i.state === "running"
          ? { ...i, state: "done", needsNao: false, ageMin: i.ageMin + 8 }
          : i
    );
    return {
      ...base,
      updatedAt: new Date().toISOString(),
      headline: "全て完了 — 穏やかです",
      summary: { new: 0, running: 0, waitingApproval: 0, done: items.length, error: 0 },
      items,
      events: [
        { at: fmtNow(), level: "done", text: "全タスク完了" },
        ...base.events.slice(0, 3)
      ]
    };
  },
  // Scenario 4: New burst
  (base) => {
    const items = [
      ...base.items.slice(0, 6),
      { id: "req_120", kind: "request", label: "SEO記事レビュー", state: "new", needsNao: false, ageMin: 0, owner: "Queue", detail: "新着依頼", source: "slack", children: 0 },
      { id: "req_121", kind: "request", label: "KPI集計依頼", state: "new", needsNao: false, ageMin: 0, owner: "Queue", detail: "新着依頼", source: "slack", children: 0 },
      { id: "sub_220", kind: "subagent", label: "速報チーム", state: "running", needsNao: false, ageMin: 1, owner: "Ucho", detail: "急ぎの調査", source: "openclaw", children: 0 }
    ];
    return {
      ...base,
      updatedAt: new Date().toISOString(),
      headline: "依頼が増えている — 新着3件",
      summary: { new: 4, running: 4, waitingApproval: 2, done: 6, error: 1 },
      items,
      events: [
        { at: fmtNow(), level: "new", text: "SEO記事レビュー・KPI集計が着信" },
        { at: fmtNow(-1), level: "running", text: "速報チームが起動" },
        ...base.events.slice(0, 2)
      ]
    };
  }
];

function fmtNow(offsetMin) {
  const d = new Date();
  if (offsetMin) d.setMinutes(d.getMinutes() + offsetMin);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

let demoIndex = 0;

function loadStatusOrDemo() {
  if (DEMO_MODE) {
    const baseData = normalizeData(fallbackStatus, "demo");
    const scenario = demoScenarios[demoIndex % demoScenarios.length];
    const transformed = scenario(baseData);
    // Re-normalize to ensure consistency
    render(normalizeData(transformed, "demo"));
    demoIndex++;
    return;
  }
  loadStatus();
}

loadStatusOrDemo();
window.setInterval(loadStatusOrDemo, DEMO_MODE ? DEMO_INTERVAL_MS : POLL_INTERVAL_MS);
