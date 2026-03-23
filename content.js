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

  function getLangCode(name) {
    const map = {
      English: "en-US",
      Hindi: "hi-IN",
      Tamil: "ta-IN",
      Telugu: "te-IN",
      Bengali: "bn-IN",
      Marathi: "mr-IN",
      Gujarati: "gu-IN",
      French: "fr-FR",
      Spanish: "es-ES",
      German: "de-DE",
    };

    return map[name] || "en-US";
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

  function isBadAI(text, original) {
    if (!text || typeof text !== "string") return true;

    const similarity = text.length / original.length;

    if (similarity > 0.8) return true;

    if (original.includes(text.slice(0, 50))) return true;

    return false;
  }

  function speak(text, lang) {
    return new Promise((resolve) => {
      if (!text) return resolve();

      speechSynthesis.cancel();

      const prefixes = [
        "Here's the idea: ",
        "In simple terms: ",
        "What this means is: ",
        "Basically: ",
      ];

      const speech = new SpeechSynthesisUtterance(
        prefixes[Math.floor(Math.random() * prefixes.length)] + text,
      );

      // ✅ ADD THIS
      speech.lang = lang;
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

    // Position relative to viewport (FIXED)
    const top = rect.top + rect.height / 2 - 40; // center vertically
    const left = rect.left - 100; // left side

    avatar.style.position = "fixed"; // 🔥 IMPORTANT
    avatar.style.transition = "all 1s ease";

    avatar.style.top = Math.max(10, top) + "px";
    avatar.style.left = Math.max(10, left) + "px";

    // Bounce animation
    if (bounceInterval) clearInterval(bounceInterval);

    let bounce = true;

    bounceInterval = setInterval(() => {
      avatar.style.transform = bounce ? "translateY(-6px)" : "translateY(6px)";
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

  function getLangCode(code) {
    const map = {
      en: "en-US",
      hi: "hi-IN",
      ta: "ta-IN",
      te: "te-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      gu: "gu-IN",
      kn: "kn-IN",
      ml: "ml-IN",
      pa: "pa-IN",
      fr: "fr-FR",
      es: "es-ES",
      de: "de-DE",
      ar: "ar-SA",
      zh: "zh-CN",
      ja: "ja-JP",
    };

    return map[code] || "en-US";
  }

  async function getFullExplanation(content, sectionCount, lang) {
    console.log("📤 Sending to background...");
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "GET_AI",
          prompt: `You are an AI tutor.

Explain the following webpage in SIMPLE, HUMAN, BEGINNER-FRIENDLY language.

Rules:
- Do NOT copy the content
- Do NOT repeat sentences
- EXPLAIN like a teacher
- Use simple words
- Keep each explanation short (10-20 lines)
- Make it engaging

IMPORTANT:
- Explain everything in ${lang} language

Divide into EXACTLY ${sectionCount} sections.

Return ONLY a JSON array.

Content:${content}`,
        },
        (response) => {
          if (!response || !response.success) {
            console.error("AI error:", response?.error);
            return resolve(null);
          }
          try {
            const aiText = response.data.choices[0].message.content;
            console.log("🧠 RAW AI RESPONSE:\n", aiText);

            resolve(aiText);
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
      text = text.replace(/```json|```/g, "").trim();

      // ✅ safer extraction
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");

      if (start !== -1 && end !== -1) {
        const jsonString = text.slice(start, end + 1);
        return JSON.parse(jsonString);
      }

      return null;
    } catch (e) {
      console.warn("⚠️ Clean parse failed:", e);
      return null;
    }
  }

  async function startTour(totalTime = 30000, useAI = true, lang = "en") {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) return;

    const pageContent = getFullPageContent();

    let fullExplanation = null;

    if (useAI) {
      fullExplanation = await getFullExplanation(
        pageContent,
        sections.length,
        lang,
      );
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

      // let text = parts[i] ? parts[i] : getSectionContent(el);
      let text = parts[i];
      console.log("🔍 TEXT TYPE:", typeof text, text);
      if (typeof text !== "string") {
        console.warn("⚠️ Invalid AI text → fallback");
        text = getSectionContent(el);
      }

      if (!text || isBadAI(text, pageContent)) {
        console.warn("⚠️ Using fallback (AI weak)");
        text = getSectionContent(el);
      }

      console.log(`📢 Section ${i + 1}:`, text);

      const code = getLangCode(lang);
      await speak(text, code);
    }
  }

  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      await createAvatar();
      startTour(req.time || 40000, req.useAI, req.lang || "en");
    }
  });
}
