(() => {
  "use strict";

  // عناصر الصفحة
  const startBtn = document.getElementById("startRecBtn");
  const stopBtn = document.getElementById("stopRecBtn");
  const clearAudioBtn = document.getElementById("clearAudioBtn");
  const statusPill = document.getElementById("statusPill");
  const recTimer = document.getElementById("recTimer");
  const audioInfo = document.getElementById("audioInfo");
  const msg = document.getElementById("messageBox");
  const editor = document.getElementById("editor");

  // أدوات النص (اختياري—إذا موجودة تشتغل)
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

  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");

  // ===== Helpers =====
  function show(text, type = "") {
    if (!msg) return;
    msg.textContent = text || "";
    msg.className = "message-box";
    if (type) msg.classList.add(type);
  }

  function setStatus(text) {
    if (statusPill) statusPill.textContent = text;
  }

  function redirectToLogin() {
    location.href = "/login";
  }

  // يلقط التوكن من أي تخزين سابق عندك
  function getToken() {
    // 1) شكل قديم: {access_token, user}
    try {
      const a = JSON.parse(localStorage.getItem("nebras_auth") || "null");
      if (a && a.access_token) return a.access_token;
    } catch {}

    // 2) شكل ثاني: {token, username}
    try {
      const b = JSON.parse(localStorage.getItem("nebras_auth_v2") || "null");
      if (b && b.token) return b.token;
    } catch {}

    // 3) تخزين مباشر
    const t = localStorage.getItem("nebras_token");
    if (t) return t;

    // 4) تخزين باسم access_token
    const t2 = localStorage.getItem("access_token");
    if (t2) return t2;

    return null;
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    if (!token) redirectToLogin();

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    // لا نحط Content-Type إذا FormData
    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

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

  // ===== Recording =====
  let mediaRecorder = null;
  let chunks = [];
  let timerId = null;
  let startAt = 0;

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
    // أفضلية ogg (شائع مع opus) — وإلا webm
    const candidates = [
      "audio/ogg;codecs=opus",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/webm",
    ];
    for (const m of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
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

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      stopTimer();

      const blob = new Blob(chunks, { type: mimeType || "audio/webm" });

      if (audioInfo) {
        audioInfo.textContent = `Captured audio: ${(blob.size / 1024).toFixed(1)} KB`;
      }

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
    setStatus("Ready");
    show("");
  }

  async function transcribeBlob(blob) {
    try {
      const fd = new FormData();

      // مهم: اسم ملف بامتداد ogg عشان يمر من فلتر الامتدادات بالسيرفر
      const file = new File([blob], "live.ogg", { type: blob.type || "audio/ogg" });
      fd.append("audio", file);

      const data = await apiFetch("/transcribe", { method: "POST", body: fd });

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

  // ===== Text tools (خفيفة وآمنة) =====
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
    show("Cleaned.", "success");
  }

  async function copyAll() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.innerText || "");
    show("Copied.", "success");
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
    if (!editor) return;
    editor.innerHTML = "";
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

    if (idx === -1) {
      show("No match.", "error");
      lastFind = -1;
      return;
    }
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

  // ===== Bind =====
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

  if (cleanBtn) cleanBtn.addEventListener("click", cleanText);
  if (copyBtn) copyBtn.addEventListener("click", () => copyAll().catch(() => show("Copy failed.", "error")));
  if (saveDraftBtn) saveDraftBtn.addEventListener("click", saveDraft);
  if (clearTextBtn) clearTextBtn.addEventListener("click", clearText);

  if (findBtn) findBtn.addEventListener("click", () => findText(false));
  if (findNextBtn) findNextBtn.addEventListener("click", () => findText(true));
  if (clearFindBtn) clearFindBtn.addEventListener("click", clearFind);
  if (replaceOneBtn) replaceOneBtn.addEventListener("click", replaceOne);
  if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAll);

  // init
  if (recTimer) recTimer.textContent = "00:00";
  setStatus("Ready");
  loadDraft();
})();
