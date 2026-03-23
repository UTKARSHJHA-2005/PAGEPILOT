chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("📩 Received in background:", req);

  if (req.action === "GET_AI") {
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer YOUR_API_KEY_HERE",
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
      .then(async (res) => {
        const data = await res.json();

        console.log("🧠 RAW API RESPONSE:", data); // 👈 IMPORTANT

        if (!res.ok) {
          return sendResponse({
            success: false,
            error: data.error?.message || "HTTP error",
          });
        }

        if (!data.choices) {
          return sendResponse({
            success: false,
            error: "No choices in response",
          });
        }

        sendResponse({
          success: true,
          text: data.choices[0].message.content, // 👈 send CLEAN text
        });
      })
      .catch((err) => {
        console.error("❌ Fetch error:", err);
        sendResponse({ success: false, error: err.toString() });
      });

    return true;
  }
});
