document.getElementById("start").onclick = async () => {
  let [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  // 🔥 Inject content.js manually
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });

  // small delay to ensure script loads
  await new Promise((r) => setTimeout(r, 200));

  // send message
  chrome.tabs.sendMessage(tab.id, {
    action: "START",
    time: 40000,
  });
};
