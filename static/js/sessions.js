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
    
    // حل مشكلة الترجمة
    if (translationBox) {
      const tText = s.translation || "";
      translationBox.textContent = tText;
      // إظهار لوحة الترجمة دائماً عند فتح الجلسة لتتمكن من الكتابة فيها
      translationPanel.style.display = "block";
      editorsWrap.classList.add("show-translation");
    }

    // حل مشكلة الصوت - ERR_NAME_NOT_RESOLVED
    if (sessionAudioPlayer) {
      let path = s.audio_url || s.file_path || "";
      if (path) {
        // إذا كان الرابط يبدأ بـ http، نتأكد أنه لا يحتوي على أخطاء في الـ Domain
        // إذا كان مجرد مسار (مثل uploads/file.mp3)، نربطه بالدومين الحالي
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

  async function updateSession() {
    if (!active) return;
    
    // التأكد من جلب النصوص من الـ ContentEditable
    const payload = {
      title: sessionTitleInput.value.trim(),
      transcription: editor.innerText.trim(),
      translation: translationBox.innerText.trim()
    };

    try {
      showView("Saving…", "loading");
      await apiFetch(`/api/sessions/${active.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      
      // تحديث البيانات محلياً
      active.title = payload.title;
      active.transcription = payload.transcription;
      active.translation = payload.translation;
      
      renderList();
      showView("Saved successfully!", "success");
    } catch (err) { 
      showView("Save failed: " + err.message, "error"); 
    }
  }

  function exportTxt() {
    if (!active) return;
    const content = `Title: ${active.title}\n\nOriginal:\n${editor.innerText}\n\nTranslation:\n${translationBox.innerText}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.title || "session"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Event Listeners
  if (editor) editor.oninput = updateCounts;
  if (translationBox) translationBox.oninput = updateCounts;
  if (refreshBtn) refreshBtn.onclick = loadSessions;
  if (filterInput) filterInput.oninput = renderList;
  if (updateSessionBtn) updateSessionBtn.onclick = updateSession;
  if (exportTxtBtn) exportTxtBtn.onclick = exportTxt;
  
  // Font/UI Controls
  document.getElementById("fontMinusBtn").onclick = () => {
    const cur = parseFloat(getComputedStyle(editor).fontSize);
    editor.style.fontSize = (cur - 1) + "px";
  };
  document.getElementById("fontPlusBtn").onclick = () => {
    const cur = parseFloat(getComputedStyle(editor).fontSize);
    editor.style.fontSize = (cur + 1) + "px";
  };
  document.getElementById("fontFamilySelect").onchange = (e) => {
    const f = e.target.value === "serif" ? "serif" : e.target.value === "mono" ? "monospace" : "sans-serif";
    editor.style.fontFamily = f;
    translationBox.style.fontFamily = f;
  };
  document.getElementById("alignLeftBtn").onclick = () => editorsWrap.style.textAlign = "left";
  document.getElementById("alignCenterBtn").onclick = () => editorsWrap.style.textAlign = "center";
  document.getElementById("alignRightBtn").onclick = () => editorsWrap.style.textAlign = "right";
  document.getElementById("readingModeBtn").onclick = () => document.body.classList.toggle("reading-mode");
  document.getElementById("cleanBtn").onclick = () => {
    editor.textContent = editor.innerText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    updateCounts();
  };
  document.getElementById("copyBtn").onclick = () => navigator.clipboard.writeText(editor.innerText + "\n\n" + translationBox.innerText);
  document.getElementById("clearTextBtn").onclick = () => { 
      if(confirm("Clear everything?")) { editor.innerHTML = ""; translationBox.innerHTML = ""; updateCounts(); }
  };

  loadSessions();
})();
