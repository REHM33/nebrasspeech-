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

  const sessionAudioPlayer = document.getElementById("sessionAudioPlayer");
  const audioContainer = document.getElementById("audioContainer");
  const translationBox = document.getElementById("translationBox");
  const translationPanel = document.getElementById("translationPanel");
  const editorsWrap = document.getElementById("editorsWrap");

  let sessions = [];
  let active = null;
  let reading = false;
  let lastFind = -1;

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

  function getToken() {
    try {
      const a = JSON.parse(localStorage.getItem("nebras_auth") || "null");
      if (a && a.access_token) return a.access_token;
    } catch {}
    return localStorage.getItem("nebras_token") || localStorage.getItem("access_token") || null;
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    if (!token) location.href = "/login";
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  function updateCounts() {
    const text = (editor?.innerText || "").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    if (wordCount) wordCount.textContent = `Words: ${words}`;
    if (charCount) charCount.textContent = `Chars: ${text.length}`;
  }

  function renderList() {
    if (!sessionsList) return;
    sessionsList.innerHTML = "";
    const q = String(filterInput?.value || "").trim().toLowerCase();
    const filtered = sessions.filter(s => String(s.title || "").toLowerCase().includes(q));
    if (filtered.length === 0) { showList("No sessions found.", "error"); return; }
    showList("");
    filtered.forEach(s => {
      const li = document.createElement("li");
      li.className = "sessions-item";
      const btn = document.createElement("button");
      btn.className = "sessions-item-btn";
      const date = s.created_at ? new Date(s.created_at).toLocaleString() : "";
      btn.textContent = `${s.title || "Untitled"}${date ? " • " + date : ""}`;
      btn.onclick = () => openSession(s);
      li.appendChild(btn);
      sessionsList.appendChild(li);
    });
  }

  function openSession(s) {
    active = s;
    if (sessionTitleInput) sessionTitleInput.value = s.title || "";
    if (editor) editor.textContent = s.transcript || "";
    
    if (translationBox && s.translation) {
      translationBox.textContent = s.translation;
      editorsWrap.classList.add("show-translation");
    } else {
      translationBox.textContent = "";
      editorsWrap.classList.remove("show-translation");
    }

    if (sessionAudioPlayer && s.audio_url) {
      sessionAudioPlayer.src = s.audio_url;
      audioContainer.style.display = "block";
    } else {
      audioContainer.style.display = "none";
    }

    activeMeta.textContent = `Active ID: ${s.id}`;
    exportTxtBtn.disabled = false;
    updateSessionBtn.disabled = false;
    updateCounts();
    showView("");
  }

  async function loadSessions() {
    try {
      showList("Loading…");
      const data = await apiFetch("/api/sessions");
      sessions = Array.isArray(data.sessions) ? data.sessions : [];
      renderList();
    } catch (err) { showList(err.message, "error"); }
  }

  async function updateSession() {
    if (!active) return;
    const payload = {
      title: sessionTitleInput.value.trim(),
      transcript: editor.innerText.trim(),
      translation: translationBox.innerText.trim()
    };
    try {
      showView("Saving…");
      await apiFetch(`/api/sessions/${active.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      active.title = payload.title;
      active.transcript = payload.transcript;
      active.translation = payload.translation;
      renderList();
      showView("Updated.", "success");
    } catch (err) { showView(err.message, "error"); }
  }

  function exportTxt() {
    if (!active) return;
    const blob = new Blob([editor.innerText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.title || "session"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function setFontSize(delta) {
    const cur = parseFloat(getComputedStyle(editor).fontSize);
    editor.style.fontSize = `${Math.min(28, Math.max(12, cur + delta))}px`;
  }

  function setFontFamily(v) {
    editor.style.fontFamily = v === "serif" ? "serif" : v === "mono" ? "monospace" : "sans-serif";
  }

  function cleanText() {
    editor.textContent = editor.innerText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    updateCounts();
  }

  function findText(next) {
    const q = findInput.value.trim().toLowerCase();
    if (!q) return;
    const idx = editor.innerText.toLowerCase().indexOf(q, next ? lastFind + 1 : 0);
    if (idx === -1) { lastFind = -1; showView("Not found", "error"); return; }
    lastFind = idx;
    showView(`Found at ${idx + 1}`, "success");
  }

  if (editor) editor.oninput = updateCounts;
  if (translationBox) translationBox.oninput = updateCounts;
  if (refreshBtn) refreshBtn.onclick = loadSessions;
  if (filterInput) filterInput.oninput = renderList;
  if (updateSessionBtn) updateSessionBtn.onclick = updateSession;
  if (exportTxtBtn) exportTxtBtn.onclick = exportTxt;
  if (fontMinusBtn) fontMinusBtn.onclick = () => setFontSize(-1);
  if (fontPlusBtn) fontPlusBtn.onclick = () => setFontSize(1);
  if (fontFamilySelect) fontFamilySelect.onchange = () => setFontFamily(fontFamilySelect.value);
  if (alignLeftBtn) alignLeftBtn.onclick = () => editor.style.textAlign = "left";
  if (alignCenterBtn) alignCenterBtn.onclick = () => editor.style.textAlign = "center";
  if (alignRightBtn) alignRightBtn.onclick = () => editor.style.textAlign = "right";
  if (readingModeBtn) readingModeBtn.onclick = () => document.body.classList.toggle("reading-mode");
  if (cleanBtn) cleanBtn.onclick = cleanText;
  if (copyBtn) copyBtn.onclick = () => navigator.clipboard.writeText(editor.innerText);
  if (clearTextBtn) clearTextBtn.onclick = () => { editor.innerHTML = ""; updateCounts(); };
  if (findBtn) findBtn.onclick = () => findText(false);
  if (findNextBtn) findNextBtn.onclick = () => findText(true);
  if (clearFindBtn) clearFindBtn.onclick = () => { findInput.value = ""; lastFind = -1; };

  loadSessions();
})();
