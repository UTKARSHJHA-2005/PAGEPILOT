document.getElementById("start").onclick = async () => {
  let [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const time = document.getElementById("time").value;

  chrome.tabs.sendMessage(tab.id, {
    action: "START",
    time: Number(time) * 1000,
  });
};
