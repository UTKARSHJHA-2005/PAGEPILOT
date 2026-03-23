document.getElementById("start").onclick = async () => {
  const time = document.getElementById("time").value * 1000;
  const useAI = document.getElementById("useAI").checked;

  let [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  try {
    // ✅ Try sending message first
    await chrome.tabs.sendMessage(tab.id, {
      action: "START",
      time,
      useAI,
    });
    console.log("Started");
  } catch (err) {
    console.log("⚠️ Content script not ready, injecting...");

    // ✅ Inject BOTH scripts (important for Lottie)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lottie.min.js", "content.js"],
    });

    // wait for script to initialize
    await new Promise((r) => setTimeout(r, 500));

    // ✅ Send message again
    chrome.tabs.sendMessage(tab.id, {
      action: "START",
      time,
      useAI,
    });
  }
};
const fallbackNames = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  fr: "French",
  es: "Spanish",
  de: "German",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
};

async function loadLanguages() {
  try {
    const res = await fetch("https://libretranslate.de/languages");
    const data = await res.json();

    const select = document.getElementById("lang");
    select.innerHTML = "";

    data.forEach((lang) => {
      const option = document.createElement("option");

      const name = lang.name || fallbackNames[lang.code] || lang.code;

      option.value = lang.code;
      option.textContent = name;

      select.appendChild(option);
    });

    select.value = "en";
  } catch (err) {
    console.error("❌ API failed, using fallback list");

    const select = document.getElementById("lang");
    select.innerHTML = "";

    Object.entries(fallbackNames).forEach(([code, name]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      select.appendChild(option);
    });
  }
}

loadLanguages();
