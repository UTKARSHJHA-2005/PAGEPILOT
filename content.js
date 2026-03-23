if (window.__PAGEPILOT__) {
  console.log("⚠️ Already running");
} else {
  window.__PAGEPILOT__ = true;

  let avatar = null;
  let bounceInterval = null;
  let lottieInstance = null;

  // ✅ Wait for Lottie (since loaded via manifest)
  async function waitForLottie() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (typeof lottie !== "undefined") {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  async function createAvatar() {
    await waitForLottie();

    avatar = document.createElement("div");

    avatar.style.position = "absolute"; // IMPORTANT FIX
    avatar.style.left = "20px";
    avatar.style.top = "20px";
    avatar.style.width = "80px";
    avatar.style.height = "80px";
    avatar.style.zIndex = "999999";

    document.body.appendChild(avatar);

    try {
      const url = chrome.runtime.getURL("AIbot.json");
      const res = await fetch(url);
      const animationData = await res.json();

      lottieInstance = lottie.loadAnimation({
        container: avatar,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData,
      });
    } catch (err) {
      console.error("❌ Lottie load failed:", err);
    }
  }

  function speak(text, maxDuration) {
    return new Promise((resolve) => {
      if (!text) return resolve();

      speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(text);

      speech.rate = 1;
      speech.pitch = 1;

      let finished = false;

      speech.onend = () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };

      speech.onerror = () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };

      speechSynthesis.speak(speech);

      // OPTIONAL timeout (only if stuck)
      // setTimeout(() => {
      //   if (!finished) {
      //     speechSynthesis.cancel();
      //     finished = true;
      //     resolve();
      //   }
      // }, maxDuration);
    });
  }

  function getSectionContent(heading) {
    let content = heading.innerText + ". ";

    let next = heading.nextElementSibling;

    while (next && !/^H[1-3]$/.test(next.tagName)) {
      if (next.innerText) {
        content += next.innerText + " ";
      }
      next = next.nextElementSibling;
    }

    return content.slice(0, 2000);
  }

  function moveTo(element) {
    const rect = element.getBoundingClientRect();

    const top = window.scrollY + rect.top;
    const left = rect.left - 100;

    avatar.style.transition = "all 1.5s linear";
    avatar.style.top = top + "px";
    avatar.style.left = left + "px";

    if (bounceInterval) clearInterval(bounceInterval);

    let bounce = true;

    bounceInterval = setInterval(() => {
      avatar.style.transform = bounce ? "translateY(-8px)" : "translateY(8px)";
      bounce = !bounce;
    }, 300);

    setTimeout(() => {
      clearInterval(bounceInterval);
      avatar.style.transform = "translateY(0px)";
    }, 1500);
  }

  function scrollToElement(element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function getFullPageContent() {
    const elements = document.querySelectorAll("h1, h2, h3, p");

    let content = "";

    elements.forEach((el) => {
      if (el.innerText) {
        content += el.innerText + "\n";
      }
    });

    return content.slice(0, 4000);
  }

  async function getFullExplanation(content, sectionCount) {
    console.log("📤 Sending to background...");
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "GET_AI",
          prompt: `Divide into EXACTLY ${sectionCount} sections. Return ONLY JSON array.\n${content}`,
        },
        (response) => {
          if (!response || !response.success) {
            console.error("AI error:", response?.error);
            return resolve(null);
          }
          const aiText = response.data?.choices?.[0]?.message?.content;
          console.log("🧠 RAW AI RESPONSE:\n", aiText);
          try {
            resolve(response.data.choices[0].message.content);
          } catch (e) {
            console.error("Parse error:", e);
            resolve(null);
          }
        },
      );
    });
  }

  function cleanAIResponse(text) {
    if (!text) return null;

    try {
      // remove markdown ```json ```
      text = text.replace(/```json|```/g, "").trim();

      // extract JSON array only
      const match = text.match(/\[.*\]/s);
      if (match) {
        return JSON.parse(match[0]);
      }

      return null;
    } catch (e) {
      console.warn("⚠️ Clean parse failed:", e);
      return null;
    }
  }

  async function startTour(totalTime = 30000, useAI = true) {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) return;

    const pageContent = getFullPageContent();

    let fullExplanation = null;

    if (useAI) {
      fullExplanation = await getFullExplanation(pageContent, sections.length);
    }

    let parts = cleanAIResponse(fullExplanation);

    if (!Array.isArray(parts)) {
      console.warn("⚠️ AI failed → fallback mode");
      parts = [];
    }

    if (!Array.isArray(parts)) {
      parts = [];
    }

    const wordsPerMinute = 150;
    const timePerSection = (text) =>
      Math.max((text.split(" ").length / wordsPerMinute) * 60000, 3000);

    for (let i = 0; i < sections.length; i++) {
      const el = sections[i];

      scrollToElement(el);
      await new Promise((r) => setTimeout(r, 800));

      moveTo(el);

      el.style.background = "yellow";

      let text = parts[i] ? parts[i] : getSectionContent(el);

      console.log(`📢 Section ${i + 1}:`, text);

      await speak(text, timePerSection(text));
    }
  }

  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      await createAvatar();
      startTour(req.time || 40000);
    }
  });
}
