(() => {
  "use strict";

  const startBtn = document.getElementById("startRecBtn");
  const stopBtn = document.getElementById("stopRecBtn");
  const clearAudioBtn = document.getElementById("clearAudioBtn");
  const statusPill = document.getElementById("statusPill");
  const recTimer = document.getElementById("recTimer");
  const audioInfo = document.getElementById("audioInfo");
  const msg = document.getElementById("messageBox");
  const editor = document.getElementById("editor");
  const translationBox = document.getElementById("translationBox");
  const editorsWrap = document.getElementById("editorsWrap");

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
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const clearTextBtn = document.getElementById("clearTextBtn");

  const findInput = document.getElementById("findInput");
  const replaceInput = document.getElementById("replaceInput");
  const findBtn = document.getElementById("findBtn");
  const findNextBtn = document.getElementById("findNextBtn");
  const clearFindBtn = document.getElementById("clearFindBtn");
  const replaceOneBtn = document.getElementById("replaceOneBtn");
  const replaceAllBtn = document.getElementById("replaceAllBtn");

  const translateBtn = document.getElementById("translateBtn");
  const translateLangSelect = document.getElementById("translateLangSelect");
  const copyTranslationBtn = document.getElementById("copyTranslationBtn");

  const saveSessionBtn = document.getElementById("saveSessionBtn");
  const sessionTitleInput = document.getElementById("sessionTitle");

  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");

  function show(text, type = "") {
    if (!msg) return;
    msg.textContent = text || "";
    msg.className = "message-box";
    if (type) msg.classList.add(type);
  }

  function setStatus(text) {
    if (statusPill) statusPill.textContent = text;
  }

  function redirectToLogin() { location.href = "/login"; }

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
    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    const res = await fetch(url, { ...options, headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");
    if (!res.ok) throw new Error((data && data.error) ? data.error : `Request failed (${res.status})`);
    return data;
  }

  function updateCounts() {
    if (!editor) return;
    const text = (editor.innerText || "").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    if (wordCount) wordCount.textContent = `Words: ${words}`;
    if (charCount) charCount.textContent = `Chars: ${text.length}`;
  }

  let mediaRecorder = null;
  let chunks = [];
  let timerId = null;
  let startAt = 0;
  let lastBlob = null;

  function startTimer() {
    startAt = Date.now();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      const s = Math.floor((Date.now() - startAt) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      if (recTimer) recTimer.textContent = `${mm}:${ss}`;
    }, 250);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function pickMimeType() {
    const candidates = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/ogg", "audio/webm"];
    for (const m of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
    }
    return "";
  }

  async function startRecording() {
    show("");
    setStatus("Recording…");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    const mimeType = pickMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      stopTimer();
      const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
      lastBlob = blob;
      if (audioInfo) audioInfo.textContent = `Captured audio: ${(blob.size / 1024).toFixed(1)} KB`;
      setStatus("Uploading…");
      await transcribeBlob(blob);
    };
    mediaRecorder.start();
    startTimer();
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  }

  function stopRecording() {
    if (!mediaRecorder) return;
    setStatus("Processing…");
    if (stopBtn) stopBtn.disabled = true;
    if (startBtn) startBtn.disabled = false;
    mediaRecorder.stop();
  }

  function clearAll() {
    if (audioInfo) audioInfo.textContent = "";
    lastBlob = null;
    setStatus("Ready");
    show("");
  }

  async function transcribeBlob(blob) {
    try {
      const fd = new FormData();
      const file = new File([blob], "live.ogg", { type: blob.type || "audio/ogg" });
      fd.append("audio", file);
      const data = await apiFetch("/live-transcribe", { method: "POST", body: fd });
      const text = data && data.transcription ? String(data.transcription) : "";
      if (editor) editor.textContent = text;
      updateCounts();
      setStatus("Ready");
      show("Transcription completed.", "success");
    } catch (err) {
      setStatus("Error");
      show(err.message || "Transcription failed.", "error");
    }
  }

  async function translateText() {
    const text = (editor?.innerText || "").trim();
    if (!text) { show("No text to translate.", "error"); return; }

    const targetLang = translateLangSelect?.value || "ar";
    setStatus("Translating…");
    show("Translating…");

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`
      );
      const data = await res.json();

      if (data && data.responseData && data.responseData.translatedText) {
        if (translationBox) translationBox.textContent = data.responseData.translatedText;
        if (editorsWrap) editorsWrap.classList.add("show-translation");
        setStatus("Ready");
        show("Translation completed.", "success");
      } else {
        throw new Error("Translation failed");
      }
    } catch {
      setStatus("Error");
      show("Translation failed. Try again.", "error");
    }
  }

  async function saveSession() {
    try {
      const title = (sessionTitleInput?.value || "").trim() || "Live Session";
      const transcript = (editor?.innerText || "").trim();
      if (!transcript) { show("No text to save.", "error"); return; }
      setStatus("Saving…");

      if (lastBlob) {
        const fd = new FormData();
        const file = new File([lastBlob], "live.ogg", { type: lastBlob.type || "audio/ogg" });
        fd.append("audio", file);
        fd.append("title", title);
        fd.append("transcript", transcript);
        await apiFetch("/live-final-save", { method: "POST", body: fd });
      } else {
        await apiFetch("/api/sessions-text", {
          method: "POST",
          body: JSON.stringify({ title, transcript })
        });
      }

      setStatus("Ready");
      show("Session saved successfully.", "success");
    } catch (err) {
      setStatus("Error");
      show(err.message || "Failed to save session.", "error");
    }
  }

  function setFontSize(delta) {
    if (!editor) return;
    const cur = parseFloat(getComputedStyle(editor).fontSize) || 16;
    editor.style.fontSize = `${Math.min(28, Math.max(12, cur + delta))}px`;
  }

  function setFontFamily(v) {
    if (!editor) return;
    if (v === "serif") editor.style.fontFamily = "Georgia, 'Times New Roman', serif";
    else if (v === "mono") editor.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    else editor.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  }

  function setAlign(a) { if (editor) editor.style.textAlign = a; }

  function cleanText() {
    if (!editor) return;
    let t = editor.innerText || "";
    t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
    editor.textContent = t.trim();
    updateCounts();
    show("Cleaned.", "success");
  }

  async function copyAll() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.innerText || "");
    show("Copied.", "success");
  }

  async function copyTranslation() {
    if (!translationBox) return;
    await navigator.clipboard.writeText(translationBox.innerText || "");
    show("Translation copied.", "success");
  }

  function saveDraft() {
    if (!editor) return;
    localStorage.setItem("nebras_live_draft", editor.innerHTML || "");
    show("Draft saved.", "success");
  }

  function loadDraft() {
    const raw = localStorage.getItem("nebras_live_draft");
    if (raw && editor) editor.innerHTML = raw;
    updateCounts();
  }

  function clearText() {
    if (editor) editor.innerHTML = "";
    if (translationBox) translationBox.innerHTML = "";
    if (editorsWrap) editorsWrap.classList.remove("show-translation");
    updateCounts();
  }

  let lastFind = -1;

  function findText(next = false) {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    if (!q) return;
    const text = editor.innerText || "";
    const start = next ? lastFind + 1 : 0;
    const idx = text.toLowerCase().indexOf(q.toLowerCase(), start);
    if (idx === -1) { show("No match.", "error"); lastFind = -1; return; }
    lastFind = idx;
    show(`Found at position ${idx + 1}.`, "success");
  }

  function replaceOne() {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q) return;
    const text = editor.innerText || "";
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return show("No match to replace.", "error");
    editor.textContent = text.slice(0, idx) + r + text.slice(idx + q.length);
    updateCounts();
    show("Replaced one.", "success");
  }

  function replaceAll() {
    if (!editor) return;
    const q = String(findInput?.value || "").trim();
    const r = String(replaceInput?.value || "");
    if (!q) return;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    editor.textContent = (editor.innerText || "").replace(re, r);
    updateCounts();
    show("Replaced all.", "success");
  }

  function clearFind() {
    if (findInput) findInput.value = "";
    if (replaceInput) replaceInput.value = "";
    lastFind = -1;
    show("");
  }

  let reading = false;
  function toggleReading() {
    reading = !reading;
    document.body.classList.toggle("reading-mode", reading);
  }

  const token = getToken();
  if (!token) redirectToLogin();

  if (editor) editor.addEventListener("input", updateCounts);

  if (startBtn) startBtn.addEventListener("click", () => startRecording().catch(e => show(e.message, "error")));
  if (stopBtn) stopBtn.addEventListener("click", stopRecording);
  if (clearAudioBtn) clearAudioBtn.addEventListener("click", clearAll);

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
      if (!sel || sel.isCollapsed) { show("Please select text first.", "error"); return; }
      const color = highlightSelect.value;
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.backgroundColor =
        color === "hl-yellow" ? "#fff7b2" :
        color === "hl-blue"   ? "#d9f2ff" :
        color === "hl-green"  ? "#d9ffe8" :
        color === "hl-pink"   ? "#ffe3f1" : "#fff7b2";
      try { range.surroundContents(span); }
      catch { const f = range.extractContents(); span.appendChild(f); range.insertNode(span); }
      sel.removeAllRanges();
      updateCounts();
    });
  }

  if (cleanBtn) cleanBtn.addEventListener("click", cleanText);
  if (copyBtn) copyBtn.addEventListener("click", () => copyAll().catch(() => show("Copy failed.", "error")));
  if (copyTranslationBtn) copyTranslationBtn.addEventListener("click", () => copyTranslation().catch(() => show("Copy failed.", "error")));
  if (saveDraftBtn) saveDraftBtn.addEventListener("click", saveDraft);
  if (clearTextBtn) clearTextBtn.addEventListener("click", clearText);

  if (findBtn) findBtn.addEventListener("click", () => findText(false));
  if (findNextBtn) findNextBtn.addEventListener("click", () => findText(true));
  if (clearFindBtn) clearFindBtn.addEventListener("click", clearFind);
  if (replaceOneBtn) replaceOneBtn.addEventListener("click", replaceOne);
  if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAll);

  if (translateBtn) translateBtn.addEventListener("click", translateText);
  if (saveSessionBtn) saveSessionBtn.addEventListener("click", saveSession);

  if (recTimer) recTimer.textContent = "00:00";
  setStatus("Ready");
  loadDraft();
})();
