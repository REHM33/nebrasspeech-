(() => {
  "use strict";

  const refreshBtn = document.getElementById("refreshBtn");
  const sessionsList = document.getElementById("sessionsList");
  const filterInput = document.getElementById("filterInput");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  const sessionTitleInput = document.getElementById("sessionTitleInput");
  const updateSessionBtn = document.getElementById("updateSessionBtn");
  const exportTxtBtn = document.getElementById("exportTxtBtn");

  const editor = document.getElementById("editor");
  const activeMeta = document.getElementById("activeSessionMeta");

  const listMsg = document.getElementById("listMessageBox");
  const viewMsg = document.getElementById("viewerMessageBox");

  const fontMinusBtn = document.getElementById("fontMinusBtn");
  const fontPlusBtn = document.getElementById("fontPlusBtn");
  const fontFamilySelect = document.getElementById("fontFamilySelect");
  const alignLeftBtn = document.getElementById("alignLeftBtn");
  const alignCenterBtn = document.getElementById("alignCenterBtn");
  const alignRightBtn = document.getElementById("alignRightBtn");
  const readingModeBtn = document.getElementById("readingModeBtn");

  const highlightSelect = document.getElementById("highlightSelect");
  const applyHighlightBtn = document.getElementById("applyHighlightBtn");

  const cleanBtn = document.getElementById("cleanBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearTextBtn = document.getElementById("clearTextBtn");

  const findInput = document.getElementById("findInput");
  const replaceInput = document.getElementById("replaceInput");
  const findBtn = document.getElementById("findBtn");
  const findNextBtn = document.getElementById("findNextBtn");
  const clearFindBtn = document.getElementById("clearFindBtn");
  const replaceOneBtn = document.getElementById("replaceOneBtn");
  const replaceAllBtn = document.getElementById("replaceAllBtn");

  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");

  function showList(text, type = "") {
    if (!listMsg) return;
    listMsg.textContent = text || "";
    listMsg.className = "message-box";
    if (type) listMsg.classList.add(type);
  }

  function showView(text, type = "") {
    if (!viewMsg) return;
    viewMsg.textContent = text || "";
    viewMsg.className = "message-box";
    if (type) viewMsg.classList.add(type);
  }

  function redirectToLogin() {
    location.href = "/login";
  }

  function getToken() {
    try {
      const a = JSON.parse(localStorage.getItem("nebras_auth") || "null");
      if (a && a.access_token) return a.access_token;
    } catch {}

    try {
      const b = JSON.parse(localStorage.getItem("nebras_auth_v2") || "null");
      if (b && b.token) return b.token;
    } catch {}

    return localStorage.getItem("nebras_token") || localStorage.getItem("access_token") || null;
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    if (!token) redirectToLogin();

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(url, { ...options, headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      const errMsg = (data && data.error) ? data.error : `Request failed (${res.status})`;
      throw new Error(errMsg);
    }
    return data;
  }

  function updateCounts() {
    if (!editor) return;
    const text = (editor.innerText || "").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    if (wordCount) wordCount.textContent = `Words: ${words}`;
    if (charCount) charCount.textContent = `Chars: ${chars}`;
  }

  let sessions = [];
  let active = null;
  let reading = false;
  let lastFind = -1;

  function renderList() {
    if (!sessionsList) return;
    sessionsList.innerHTML = "";

    const q = String(filterInput?.value || "").trim().toLowerCase();
    const filtered = sessions.filter(s => String(s.title || "").toLowerCase().includes(q));

    if (filtered.length === 0) {
      showList("No sessions found.", "error");
      return;
    }
    showList("");

    for (const s of filtered) {
      const li = document.createElement("li");
      li.className = "sessions-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sessions-item-btn";

      const date = s.created_at ? new Date(s.created_at).toLocaleString() : "";
      btn.textContent = `${s.title || "Untitled"}${date ? " • " + date : ""}`;

      btn.addEventListener("click", () => openSession(s));
      li.appendChild(btn);
      sessionsList.appendChild(li);
    }
  }

  function openSession(s) {
    active = s;

    if (sessionTitleInput) sessionTitleInput.value = s.title || "";
    if (editor) editor.textContent = s.transcript || "";
    if (activeMeta) activeMeta.textContent = `Active session: ${s.id}`;

    if (exportTxtBtn) exportTxtBtn.disabled = false;
    if (updateSessionBtn) updateSessionBtn.disabled = false;

    updateCounts();
    showView("");
  }

  async function loadSessions() {
    try {
      showList("Loading…");
      const data = await apiFetch("/api/sessions", { method: "GET" });

      sessions = Array.isArray(data.sessions) ? data.sessions : [];
      renderList();

      if (sessions.length === 0) showList("No sessions yet.", "error");
    } catch (err) {
      showList(err.message || "Failed to load sessions.", "error");
    }
  }

  function exportTxt() {
    if (!active) return;
    const title = (active.title || "session").replace(/[^\w\-]+/g, "_");
    const text = editor ? (editor.innerText || "") : (active.transcript || "");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function updateSession() {
    if (!active) return;

    const newTitle = (sessionTitleInput?.value || "").trim();
    const newTranscript = (editor?.innerText || "").trim();

    try {
      showView("Saving…");
      await apiFetch(`/api/sessions/${active.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: newTitle, transcript: newTranscript })
      });

      active.title = newTitle;
      active.transcript = newTranscript;

      const idx = sessions.findIndex(s => s.id === active.id);
      if (idx !== -1) sessions[idx] = { ...sessions[idx], title: newTitle, transcript: newTranscript };

      renderList();
      showView("Session saved.", "success");
    } catch (err) {
      showView(err.message || "Failed to save session.", "error");
    }
  }

  function setFontSize(delta) {
    if (!editor) return;
    const cur = parseFloat(getComputedStyle(editor).fontSize) || 16;
    const next = Math.min(28, Math.max(12, cur + delta));
    editor.style.fontSize = `${next}px`;
  }

  function setFontFamily(v) {
    if (!editor) return;
    if (v === "serif") editor.style.fontFamily = "Georgia, 'Times New Roman', serif";
    else if (v === "mono") editor.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    else editor.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  }

  function setAlign(a) {
    if (!editor) return;
    editor.style.textAlign = a;
  }

  function cleanText() {
    if (!editor) return;
    let t = editor.innerText || "";
    t = t.replace(/[ \t]+/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n");
    editor.textContent = t.trim();
    updateCounts();
    showView("Cleaned.", "success");
  }

  async function copyAll() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.innerText || "");
    showView("Copied.", "success");
  }

  function clearText() {
    if (!editor) return;
    editor.innerHTML = "";
    updateCounts();
  }

  function findText(next = false) {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    if (!q) return;

    const text = editor.innerText || "";
    const start = next ? lastFind + 1 : 0;
    const idx = text.toLowerCase().indexOf(q.toLowerCase(), start);

    if (idx === -1) {
      showView("No match.", "error");
      lastFind = -1;
      return;
    }
    lastFind = idx;
    showView(`Found at position ${idx + 1}.`, "success");
  }

  function replaceOne() {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q) return;

    const text = editor.innerText || "";
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return showView("No match to replace.", "error");

    editor.textContent = text.slice(0, idx) + r + text.slice(idx + q.length);
    updateCounts();
    showView("Replaced one.", "success");
  }

  function replaceAll() {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q) return;

    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    editor.textContent = (editor.innerText || "").replace(re, r);
    updateCounts();
    showView("Replaced all.", "success");
  }

  function clearFind() {
    if (findInput) findInput.value = "";
    if (replaceInput) replaceInput.value = "";
    lastFind = -1;
    showView("");
  }

  function toggleReading() {
    reading = !reading;
    document.body.classList.toggle("reading-mode", reading);
  }

  const token = getToken();
  if (!token) redirectToLogin();

  if (editor) editor.addEventListener("input", updateCounts);

  if (refreshBtn) refreshBtn.addEventListener("click", loadSessions);
  if (clearFilterBtn) clearFilterBtn.addEventListener("click", () => {
    if (filterInput) filterInput.value = "";
    renderList();
  });
  if (filterInput) filterInput.addEventListener("input", renderList);

  if (exportTxtBtn) exportTxtBtn.addEventListener("click", exportTxt);
  if (updateSessionBtn) updateSessionBtn.addEventListener("click", updateSession);

  if (fontMinusBtn) fontMinusBtn.addEventListener("click", () => setFontSize(-1));
  if (fontPlusBtn) fontPlusBtn.addEventListener("click", () => setFontSize(1));
  if (fontFamilySelect) fontFamilySelect.addEventListener("change", () => setFontFamily(fontFamilySelect.value));

  if (alignLeftBtn) alignLeftBtn.addEventListener("click", () => setAlign("left"));
  if (alignCenterBtn) alignCenterBtn.addEventListener("click", () => setAlign("center"));
  if (alignRightBtn) alignRightBtn.addEventListener("click", () => setAlign("right"));
  if (readingModeBtn) readingModeBtn.addEventListener("click", toggleReading);

  if (applyHighlightBtn && highlightSelect) {
    applyHighlightBtn.addEventListener("click", () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;

      const span = document.createElement("span");
      span.className = highlightSelect.value;
      range.surroundContents(span);
      sel.removeAllRanges();
      updateCounts();
    });
  }

  if (cleanBtn) cleanBtn.addEventListener("click", cleanText);
  if (copyBtn) copyBtn.addEventListener("click", () => copyAll().catch(() => showView("Copy failed.", "error")));
  if (clearTextBtn) clearTextBtn.addEventListener("click", clearText);

  if (findBtn) findBtn.addEventListener("click", () => findText(false));
  if (findNextBtn) findNextBtn.addEventListener("click", () => findText(true));
  if (clearFindBtn) clearFindBtn.addEventListener("click", clearFind);
  if (replaceOneBtn) replaceOneBtn.addEventListener("click", replaceOne);
  if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAll);

  if (exportTxtBtn) exportTxtBtn.disabled = true;
  if (updateSessionBtn) updateSessionBtn.disabled = true;
  loadSessions();
})();
