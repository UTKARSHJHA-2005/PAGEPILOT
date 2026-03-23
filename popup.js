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
