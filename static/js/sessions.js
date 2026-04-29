(() => {
  "use strict";

  const refreshBtn = document.getElementById("refreshBtn");
  const sessionsList = document.getElementById("sessionsList");
  const filterInput = document.getElementById("filterInput");
  const clearFilterBtn = document.getElementById("clearFilterBtn");
  const sessionTitleInput = document.getElementById("sessionTitleInput");
  const updateSessionBtn = document.getElementById("updateSessionBtn");
  const translateBtn = document.getElementById("translateBtn");
  const exportTxtBtn = document.getElementById("exportTxtBtn");
  const editor = document.getElementById("editor");
  const translationBox = document.getElementById("translationBox");
  const translationPanel = document.getElementById("translationPanel");
  const editorsWrap = document.getElementById("editorsWrap");
  const activeMeta = document.getElementById("activeSessionMeta");
  const listMsg = document.getElementById("listMessageBox");
  const viewMsg = document.getElementById("viewerMessageBox");
  const sessionAudioPlayer = document.getElementById("sessionAudioPlayer");
  const audioContainer = document.getElementById("audioContainer");
  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");

  let sessions = [];
  let active = null;
  let lastFind = -1;

  function showList(text, type = "") {
    if (!listMsg) return;
    listMsg.textContent = text || "";
    listMsg.className = "message-box " + type;
  }

  function showView(text, type = "") {
    if (!viewMsg) return;
    viewMsg.textContent = text || "";
    viewMsg.className = "message-box " + type;
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
      btn.textContent = `${s.title || "Untitled"} • ${date}`;
      btn.onclick = () => openSession(s);
      li.appendChild(btn);
      sessionsList.appendChild(li);
    });
  }

  function openSession(s) {
    active = s;
    if (sessionTitleInput) sessionTitleInput.value = s.title || "";
    if (editor) editor.textContent = s.transcription || s.transcript || "";
    
    if (translationBox) {
      const tText = s.translation || "";
      translationBox.textContent = tText;
      if (tText.trim() !== "") {
        translationPanel.style.display = "block";
        editorsWrap.classList.add("show-translation");
      } else {
        translationPanel.style.display = "none";
        editorsWrap.classList.remove("show-translation");
      }
    }

    if (sessionAudioPlayer) {
      let path = s.audio_url || s.file_path || "";
      if (path) {
        if (!path.startsWith('http')) {
            path = window.location.origin + (path.startsWith('/') ? '' : '/') + path;
        }
        sessionAudioPlayer.src = path;
        audioContainer.style.display = "block";
        sessionAudioPlayer.load();
      } else {
        audioContainer.style.display = "none";
        sessionAudioPlayer.src = "";
      }
    }

    activeMeta.textContent = `Active ID: ${s.id}`;
    updateSessionBtn.disabled = false;
    exportTxtBtn.disabled = false;
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

  async function handleTranslate() {
    const text = (editor?.innerText || "").trim();
    if (!text) return showView("No text to translate.", "error");
    try {
      showView("Translating...", "loading");
      const res = await apiFetch("/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: text, target: "ar" })
      });
      if (res && res.translatedText) {
        translationBox.textContent = res.translatedText;
        translationPanel.style.display = "block";
        editorsWrap.classList.add("show-translation");
        showView("Translated successfully!", "success");
      }
    } catch (err) { showView("Translation failed: " + err.message, "error"); }
  }

  async function updateSession() {
    if (!active) return;
    const payload = {
      title: sessionTitleInput.value.trim(),
      transcription: editor.innerText.trim(),
      translation: translationBox.innerText.trim()
    };
    try {
      showView("Saving…");
      await apiFetch(`/api/sessions/${active.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      active.title = payload.title;
      active.transcription = payload.transcription;
      active.translation = payload.translation;
      renderList();
      showView("Session updated.", "success");
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

  if (editor) editor.oninput = updateCounts;
  if (translationBox) translationBox.oninput = updateCounts;
  if (refreshBtn) refreshBtn.onclick = loadSessions;
  if (filterInput) filterInput.oninput = renderList;
  if (updateSessionBtn) updateSessionBtn.onclick = updateSession;
  if (translateBtn) translateBtn.onclick = handleTranslate;
  if (exportTxtBtn) exportTxtBtn.onclick = exportTxt;
  
  document.getElementById("fontMinusBtn").onclick = () => {
    const cur = parseFloat(getComputedStyle(editor).fontSize);
    editor.style.fontSize = (cur - 1) + "px";
  };
  document.getElementById("fontPlusBtn").onclick = () => {
    const cur = parseFloat(getComputedStyle(editor).fontSize);
    editor.style.fontSize = (cur + 1) + "px";
  };
  document.getElementById("fontFamilySelect").onchange = (e) => {
    editor.style.fontFamily = e.target.value === "serif" ? "serif" : e.target.value === "mono" ? "monospace" : "sans-serif";
  };
  document.getElementById("alignLeftBtn").onclick = () => editorsWrap.style.textAlign = "left";
  document.getElementById("alignCenterBtn").onclick = () => editorsWrap.style.textAlign = "center";
  document.getElementById("alignRightBtn").onclick = () => editorsWrap.style.textAlign = "right";
  document.getElementById("readingModeBtn").onclick = () => document.body.classList.toggle("reading-mode");
  document.getElementById("cleanBtn").onclick = () => {
    editor.textContent = editor.innerText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    updateCounts();
  };
  document.getElementById("copyBtn").onclick = () => navigator.clipboard.writeText(editor.innerText);
  document.getElementById("clearTextBtn").onclick = () => { editor.innerHTML = ""; translationBox.innerHTML = ""; updateCounts(); };

  loadSessions();
})();
