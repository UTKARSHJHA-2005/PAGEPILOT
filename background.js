chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "GET_AI") {
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer YOUR_NEW_API_KEY",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: req.prompt,
          },
        ],
      }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));

    return true; // VERY IMPORTANT
  }
});
