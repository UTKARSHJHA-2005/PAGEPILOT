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

  const fallbackNames = {
    en: "English",
    hi: "Hindi",
    ta: "Tamil",
    te: "Telugu",
    bn: "Bengali",
    mr: "Marathi",
    gu: "Gujarati",
    kn: "Kannada",
    ml: "Malayalam",
    pa: "Punjabi",
    fr: "French",
    es: "Spanish",
    de: "German",
    ar: "Arabic",
    zh: "Chinese",
    ja: "Japanese",
  };

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
    const inputBox = document.createElement("div");

    inputBox.style.position = "fixed";
    inputBox.style.bottom = "20px";
    inputBox.style.right = "20px";
    inputBox.style.zIndex = "999999";

    inputBox.innerHTML = `
  <input id="aiQuestion" placeholder="Ask something..."
    style="padding:8px;width:200px;border-radius:8px;border:1px solid #ccc;" />
  <button id="askAI">Ask</button>
`;

    document.body.appendChild(inputBox);
    const askBtn = document.getElementById("askAI");

    if (askBtn) {
      askBtn.onclick = async () => {
        const input = document.getElementById("aiQuestion");
        const q = input?.value;

        if (!q) return;

        console.log("🧑 User asked:", q);

        const langName = getLangName("en");

        const res = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "GET_AI",
              prompt: `Answer in ${langName} in simple words:\n${q}`,
            },
            resolve,
          );
        });

        if (!res || !res.success) {
          console.error("❌ AI failed");
          return;
        }

        let answer = res.text;
        answer = answer.replace(/```json|```/g, "").trim();

        console.log("AI Answer:", answer);

        const code = getLangCode("en");
        await speak(answer, code);
      };
    } else {
      console.error("❌ askAI button not found");
    }

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

  // function speak(text, lang) {
  //   return new Promise((resolve) => {
  //     if (!text) return resolve();

  //     speechSynthesis.cancel();

  //     const prefixes = [
  //       "Here's the idea: ",
  //       "In simple terms: ",
  //       "What this means is: ",
  //       "Basically: ",
  //     ];

  //     const speech = new SpeechSynthesisUtterance(
  //       prefixes[Math.floor(Math.random() * prefixes.length)] + text,
  //     );
  //     speech.lang = lang;

  //     // 🔥 pick best voice
  //     const voices = speechSynthesis.getVoices();
  //     const voice = voices.find((v) => v.lang === lang);

  //     if (voice) {
  //       speech.voice = voice;
  //     } else {
  //       console.warn("⚠️ Voice not found for", lang);
  //     }

  //     speech.rate = 0.95;
  //     speech.pitch = 1;

  //     speech.onend = resolve;
  //     speech.onerror = resolve;

  //     speechSynthesis.speak(speech);
  //   });
  // }

  async function speak(text, lang) {
    if (!text) return;

    speechSynthesis.cancel();

    const voices = await loadVoices();

    // 🎯 find exact match first
    let voice =
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang.startsWith(lang.split("-")[0]));

    // fallback to any Indian voice
    if (!voice) {
      voice = voices.find((v) =>
        ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml"].some((l) =>
          v.lang.startsWith(l),
        ),
      );
    }

    const speech = new SpeechSynthesisUtterance(text);

    if (voice) {
      speech.voice = voice;
      console.log("🎤 Using voice:", voice.name, voice.lang);
    } else {
      console.warn("⚠️ No matching voice found");
    }

    speech.lang = lang;
    speech.rate = 0.9;
    speech.pitch = 1;

    return new Promise((resolve) => {
      speech.onend = resolve;
      speech.onerror = resolve;
      speechSynthesis.speak(speech);
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

  function loadVoices() {
    return new Promise((resolve) => {
      let voices = speechSynthesis.getVoices();

      if (voices.length) return resolve(voices);

      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        resolve(voices);
      };
    });
  }

  function getLangName(code) {
    return fallbackNames[code] || "English";
  }

  async function getFullExplanation(content, sectionCount, lang) {
    console.log("📤 Sending to background...");
    const langName = getLangName(lang);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "GET_AI",
          prompt: `You are a professional teacher.

Explain the following webpage in VERY SIMPLE terms.

STRICT RULES:
- Use ONLY ${langName} language
- DO NOT mix any other language
- DO NOT include English words unless necessary
- DO NOT copy the original text
- Explain like teaching a beginner
- Keep sentences short and clear

Divide into EXACTLY ${sectionCount} parts.

Return ONLY a JSON array of strings. Do not wrap the response in code blocks or markdown.

Content:
${content}`,
        },
        (response) => {
          if (!response || !response.success) {
            console.error("AI error:", response?.error);
            return resolve(null);
          }
          try {
            let aiText = null;

            if (response && response.success && response.text) {
              aiText = response.text;
            } else {
              console.error("❌ Invalid AI response:", response);
              return resolve(null);
            }
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

      const parsed = JSON.parse(text);

      if (Array.isArray(parsed)) return parsed;

      return null;
    } catch (e) {
      console.warn("⚠️ JSON parse failed:", text);
      return null;
    }
  }

  async function startTour(totalTime = 30000, useAI = true, lang = "en") {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) return;

    const pageContent = getFullPageContent();

    let parts = [];
    let aiReady = false;

    // ⚡ start AI in background (no await)
    if (useAI) {
      getFullExplanation(pageContent, sections.length, lang).then((res) => {
        const parsed = cleanAIResponse(res);
        if (Array.isArray(parsed)) {
          parts = parsed;
          aiReady = true;
          console.log("⚡ AI ready");
        }
      });
    }

    if (!Array.isArray(parts)) {
      console.warn("⚠️ AI failed → fallback mode");
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
      let text = null;

      if (aiReady && parts[i]) {
        text = parts[i];
      } else {
        text = getSectionContent(el); // instant fallback
      }
      if (typeof text === "object" && text !== null) {
        text = Object.values(text)[0];
      }
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
