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
async function loadLanguages() {
  const res = await fetch("https://libretranslate.de/languages");
  const data = await res.json();

  const select = document.getElementById("lang");

  select.innerHTML = "";

  data.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code; // 🔥 important
    option.textContent = lang.name;
    select.appendChild(option);
  });
}
