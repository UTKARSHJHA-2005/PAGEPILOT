chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("📩 Received in background:", req);

  if (req.action === "GET_AI") {
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:
          "Bearer ",
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
        const text = await res.text(); // 🔥 ALWAYS safe

        let data;

        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("❌ Invalid JSON from API:", text);
          return sendResponse({
            success: false,
            error: "Invalid JSON response",
          });
        }

        console.log("🧠 RAW API RESPONSE:", data);

        if (!res.ok) {
          return sendResponse({
            success: false,
            error: data.error?.message || "HTTP error",
          });
        }

        if (!data.choices || !data.choices.length) {
          return sendResponse({
            success: false,
            error: "No choices in response",
          });
        }

        sendResponse({
          success: true,
          text: data.choices[0].message.content,
        });
      })
      .catch((err) => {
        console.error("❌ Fetch error:", err);
        sendResponse({ success: false, error: err.toString() });
      });

    return true;
  }
  if (req.action === "TRANSLATE") {
    fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: req.text,
        source: "en",
        target: req.lang,
        format: "text",
      }),
    })
      .then(async (res) => {
        const text = await res.text();

        let data;

        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("❌ Translate JSON error:", text);
          return sendResponse({
            success: false,
            error: "Invalid translate response",
          });
        }

        sendResponse({
          success: true,
          text: data.translatedText,
        });
      })
      .catch((err) => {
        console.error("❌ Translate error:", err);
        sendResponse({ success: false, error: err.toString() });
      });

    return true;
  }
});
