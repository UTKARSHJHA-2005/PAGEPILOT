document.getElementById("start").onclick = async () => {
  let [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.tabs.sendMessage(tab.id, {
    action: "START"
  });
};