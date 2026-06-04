const LANGUAGES = [
  { code: "auto", name: "Auto Detect", speech: "" },
  { code: "te", name: "Telugu", speech: "te-IN" },
  { code: "en", name: "English", speech: "en-US" },
  { code: "es", name: "Spanish", speech: "es-ES" },
  { code: "fr", name: "French", speech: "fr-FR" },
  { code: "de", name: "German", speech: "de-DE" },
  { code: "it", name: "Italian", speech: "it-IT" },
  { code: "pt", name: "Portuguese", speech: "pt-PT" },
  { code: "nl", name: "Dutch", speech: "nl-NL" },
  { code: "ru", name: "Russian", speech: "ru-RU" },
  { code: "zh", name: "Chinese", speech: "zh-CN" },
  { code: "ja", name: "Japanese", speech: "ja-JP" },
  { code: "ko", name: "Korean", speech: "ko-KR" },
  { code: "ar", name: "Arabic", speech: "ar-SA" },
  { code: "hi", name: "Hindi", speech: "hi-IN" },
  { code: "tr", name: "Turkish", speech: "tr-TR" },
  { code: "pl", name: "Polish", speech: "pl-PL" },
  { code: "sv", name: "Swedish", speech: "sv-SE" },
  { code: "uk", name: "Ukrainian", speech: "uk-UA" },
  { code: "vi", name: "Vietnamese", speech: "vi-VN" },
  { code: "id", name: "Indonesian", speech: "id-ID" },
];

const findLang = (c) => LANGUAGES.find((l) => l.code === c) || LANGUAGES[1];

/* ---------- DOM refs ---------- */
const sourceSel   = document.getElementById("sourceLang");
const targetSel   = document.getElementById("targetLang");
const sourceLabel = document.getElementById("sourceLabel");
const targetLabel = document.getElementById("targetLabel");
const inputText   = document.getElementById("inputText");
const outputText  = document.getElementById("outputText");
const charCount   = document.getElementById("charCount");
const outCount    = document.getElementById("outCount");
const translateBtn= document.getElementById("translateBtn");
const swapBtn     = document.getElementById("swapBtn");
const micBtn      = document.getElementById("micBtn");
const speakBtn    = document.getElementById("speakBtn");
const copyBtn     = document.getElementById("copyBtn");
const autoPlay    = document.getElementById("autoPlay");
const listenStatus= document.getElementById("listenStatus");
const themeToggle = document.getElementById("themeToggle");
const toastEl     = document.getElementById("toast");

/* ---------- Populate language dropdowns ---------- */
function fillSelect(sel, excludeAuto = false) {
  const list = excludeAuto ? LANGUAGES.filter((l) => l.code !== "auto") : LANGUAGES;
  sel.innerHTML = list
    .map((l) => `<option value="${l.code}">${l.name}</option>`)
    .join("");
}
fillSelect(sourceSel);
fillSelect(targetSel, true);
sourceSel.value = "auto";
targetSel.value = "es";

sourceSel.addEventListener("change", () => sourceLabel.textContent = findLang(sourceSel.value).name);
targetSel.addEventListener("change", () => targetLabel.textContent = findLang(targetSel.value).name);

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

/* ---------- Theme ---------- */
const stored = localStorage.getItem("lv-theme");
if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.setAttribute("data-theme", "dark");
  themeToggle.textContent = "☀️";
}
themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    themeToggle.textContent = "🌙";
    localStorage.setItem("lv-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.textContent = "☀️";
    localStorage.setItem("lv-theme", "dark");
  }
});

/* ---------- Character counter ---------- */
inputText.addEventListener("input", () => {
  charCount.textContent = inputText.value.length;
});

/* ---------- Swap languages ---------- */
swapBtn.addEventListener("click", () => {
  if (sourceSel.value === "auto") {
    toast("Pick a source language to swap.");
    return;
  }
  const s = sourceSel.value;
  sourceSel.value = targetSel.value;
  targetSel.value = s;
  sourceSel.dispatchEvent(new Event("change"));
  targetSel.dispatchEvent(new Event("change"));

  const plainText = outputText.querySelector(".placeholder") ? "" : outputText.textContent;
  const oldInput = inputText.value;
  inputText.value = plainText;
  charCount.textContent = inputText.value.length;
  setOutput(oldInput || "");
});

/* ---------- Output helper ---------- */
function setOutput(text) {
  if (!text) {
    outputText.innerHTML = `<span class="placeholder">Translation will appear here.</span>`;
    outCount.innerHTML = "&nbsp;";
  } else {
    outputText.textContent = text;
    outCount.textContent = `${text.length} characters`;
  }
}

/* ---------- Translation (MyMemory API) ---------- */
async function translate() {
  const text = inputText.value.trim();
  if (!text) { toast("Enter some text to translate."); return; }

  translateBtn.disabled = true;
  translateBtn.innerHTML = `<span class="spinner"></span> Translating`;
  outputText.innerHTML = `<span class="loading"><span class="spinner" style="border-top-color:var(--primary)"></span> Translating with AI...</span>`;

  try {
    const src = sourceSel.value === "auto" ? "Autodetect" : sourceSel.value;
    const tgt = targetSel.value;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    const translated = data?.responseData?.translatedText || "";
    if (!translated) throw new Error("No translation returned");

    setOutput(translated);
    if (autoPlay.checked) speak(translated, findLang(targetSel.value).speech);
  } catch (err) {
    toast("Translation failed. Try again.");
    setOutput("");
  } finally {
    translateBtn.disabled = false;
    translateBtn.innerHTML = "✨ Translate";
  }
}
translateBtn.addEventListener("click", translate);

/* ---------- Copy ---------- */
copyBtn.addEventListener("click", async () => {
  const text = outputText.textContent.trim();
  if (!text || outputText.querySelector(".placeholder")) return;
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    toast("Copy failed");
  }
});

/* ---------- Text-to-Speech ---------- */
let speaking = false;
function speak(text, lang) {
  if (!("speechSynthesis" in window)) {
    toast("Text-to-speech not supported.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (lang) u.lang = lang;
  u.onend = () => { speaking = false; speakBtn.textContent = "🔈"; };
  u.onerror = () => { speaking = false; speakBtn.textContent = "🔈"; };
  speaking = true;
  speakBtn.textContent = "⏹";
  window.speechSynthesis.speak(u);
}
speakBtn.addEventListener("click", () => {
  if (speaking) {
    window.speechSynthesis.cancel();
    speaking = false;
    speakBtn.textContent = "🔈";
    return;
  }
  const text = outputText.textContent.trim();
  if (text && !outputText.querySelector(".placeholder")) {
    speak(text, findLang(targetSel.value).speech);
  }
});

/* ---------- Speech Recognition ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;

micBtn.addEventListener("click", () => {
  if (!SR) { toast("Speech recognition not supported."); return; }
  if (listening) { recog?.stop(); return; }

  recog = new SR();
  recog.lang = sourceSel.value === "auto" ? "en-US" : (findLang(sourceSel.value).speech || "en-US");
  recog.continuous = false;
  recog.interimResults = true;

  let finalText = "";
  recog.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    inputText.value = (finalText + interim).slice(0, 5000);
    charCount.textContent = inputText.value.length;
  };
  recog.onerror = (e) => {
    toast(`Mic error: ${e.error || "unknown"}`);
    stopListening();
  };
  recog.onend = stopListening;

  listening = true;
  micBtn.classList.add("recording");
  listenStatus.textContent = "Listening...";
  recog.start();
});

function stopListening() {
  listening = false;
  micBtn.classList.remove("recording");
  listenStatus.innerHTML = "&nbsp;";
}

/* ---------- Smooth scroll for anchor nav ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});