document.getElementById("start").onclick = async () => {
  let [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const time = document.getElementById("time").value;
};
