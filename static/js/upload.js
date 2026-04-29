// 1. أضف هذه الثوابت في بداية الملف مع التعريفات
const translateBtn = document.getElementById("translateBtn");
const translateLangSelect = document.getElementById("translateLangSelect");
const translationBox = document.getElementById("translationBox");
const copyTranslationBtn = document.getElementById("copyTranslationBtn");
const editorsWrap = document.getElementById("editorsWrap");

// 2. أضف دالة الترجمة (Translate)
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

// 3. أضف دالة نسخ الترجمة
async function copyTranslation() {
  if (!translationBox) return;
  await navigator.clipboard.writeText(translationBox.innerText || "");
  show("Translation copied.", "success");
}

// 4. أضف دالة لتفريغ النصوص (تعديل للدالة القديمة)
function clearText() {
  if (editor) editor.innerHTML = "";
  if (translationBox) translationBox.innerHTML = "";
  if (editorsWrap) editorsWrap.classList.remove("show-translation");
  updateCounts();
}

// 5. أضف مستمعات الأحداث (Event Listeners) في نهاية الملف
if (translateBtn) translateBtn.addEventListener("click", translateText);
if (copyTranslationBtn) copyTranslationBtn.addEventListener("click", () => copyTranslation().catch(() => show("Copy failed.", "error")));

// أضف كود الـ Highlight أيضاً لأنه لم يكن مفعلاً بالكامل في الـ JS المرسل
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
  });
}
