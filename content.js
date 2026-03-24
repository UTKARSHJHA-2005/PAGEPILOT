// if (window.__PAGEPILOT__) {
//   console.log("⚠️ Already running");
// } else {
//   window.__PAGEPILOT__ = true;

//   let avatar = null;
//   let bounceInterval = null;
//   let lottieInstance = null;

//   // ✅ Wait for Lottie (since loaded via manifest)
//   async function waitForLottie() {
//     return new Promise((resolve) => {
//       const check = setInterval(() => {
//         if (typeof lottie !== "undefined") {
//           clearInterval(check);
//           resolve();
//         }
//       }, 100);
//     });
//   }

//   const fallbackNames = {
//     en: "English",
//     hi: "Hindi",
//     ta: "Tamil",
//     te: "Telugu",
//     bn: "Bengali",
//     mr: "Marathi",
//     gu: "Gujarati",
//     kn: "Kannada",
//     ml: "Malayalam",
//     pa: "Punjabi",
//     fr: "French",
//     es: "Spanish",
//     de: "German",
//     ar: "Arabic",
//     zh: "Chinese",
//     ja: "Japanese",
//   };

//   async function createAvatar() {
//     await waitForLottie();

//     avatar = document.createElement("div");

//     avatar.style.position = "absolute"; // IMPORTANT FIX
//     avatar.style.left = "20px";
//     avatar.style.top = "20px";
//     avatar.style.width = "80px";
//     avatar.style.height = "80px";
//     avatar.style.zIndex = "999999";

//     document.body.appendChild(avatar);
//     const inputBox = document.createElement("div");

//     inputBox.style.position = "fixed";
//     inputBox.style.bottom = "20px";
//     inputBox.style.right = "20px";
//     inputBox.style.zIndex = "999999";

//     inputBox.innerHTML = `
//   <input id="aiQuestion" placeholder="Ask something..."
//     style="padding:8px;width:200px;border-radius:8px;border:1px solid #ccc;" />
//   <button id="askAI">Ask</button>
// `;

//     document.body.appendChild(inputBox);
//     const askBtn = document.getElementById("askAI");

//     if (askBtn) {
//       askBtn.onclick = async () => {
//         const input = document.getElementById("aiQuestion");
//         const q = input?.value;

//         if (!q) return;

//         console.log("🧑 User asked:", q);

//         const langName = getLangName("en");

//         const res = await new Promise((resolve) => {
//           chrome.runtime.sendMessage(
//             {
//               action: "GET_AI",
//               prompt: `You are an AI assistant.

// Context:
// ${getFullPageContent().slice(0, 2000)}

// User question:
// ${q}

// Answer in ${langName}, simple and short.`,
//             },
//             resolve,
//           );
//         });

//         if (!res || !res.success) {
//           console.error("❌ AI failed");
//           return;
//         }

//         let answer = res.text;
//         answer = answer.replace(/```json|```/g, "").trim();

//         console.log("AI Answer:", answer);

//         const code = getLangCode("en");
//         await speak(answer, code);
//       };
//     } else {
//       console.error("❌ askAI button not found");
//     }

//     try {
//       const url = chrome.runtime.getURL("AIbot.json");
//       const res = await fetch(url);
//       const animationData = await res.json();

//       lottieInstance = lottie.loadAnimation({
//         container: avatar,
//         renderer: "svg",
//         loop: true,
//         autoplay: true,
//         animationData,
//       });
//     } catch (err) {
//       console.error("❌ Lottie load failed:", err);
//     }
//   }

//   function isBadAI(text) {
//     if (!text || typeof text !== "string") return true;
//     if (text.trim().length < 5) return true;
//     return false;
//   }

//   async function speak(text, lang) {
//     if (!text) return;
//     speechSynthesis.cancel();

//     const voices = await loadVoices();

//     let voice =
//       voices.find((v) => v.lang === lang) ||
//       voices.find((v) => v.lang.startsWith(lang.split("-")[0]));

//     if (!voice) {
//       voice = voices.find((v) =>
//         ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml"].some((l) =>
//           v.lang.startsWith(l),
//         ),
//       );
//     }
//     const speech = new SpeechSynthesisUtterance(text);
//     if (voice) {
//       speech.voice = voice;
//       console.log("🎤 Using voice:", voice.name, voice.lang);
//     } else {
//       console.warn("⚠️ No matching voice found, using default");
//     }

//     speech.lang = lang;
//     speech.rate = 0.9;
//     speech.pitch = 1;

//     return new Promise((resolve) => {
//       speech.onend = resolve;
//       speech.onerror = (e) => {
//         console.warn("⚠️ Speech error:", e);
//         resolve();
//       };
//       speechSynthesis.speak(speech);
//     });
//   }

//   // function speak(text, lang) {
//   //   return new Promise((resolve) => {
//   //     if (!text) return resolve();

//   //     speechSynthesis.cancel();

//   //     const prefixes = [
//   //       "Here's the idea: ",
//   //       "In simple terms: ",
//   //       "What this means is: ",
//   //       "Basically: ",
//   //     ];

//   //     const speech = new SpeechSynthesisUtterance(
//   //       prefixes[Math.floor(Math.random() * prefixes.length)] + text,
//   //     );
//   //     speech.lang = lang;

//   //     // 🔥 pick best voice
//   //     const voices = speechSynthesis.getVoices();
//   //     const voice = voices.find((v) => v.lang === lang);

//   //     if (voice) {
//   //       speech.voice = voice;
//   //     } else {
//   //       console.warn("⚠️ Voice not found for", lang);
//   //     }

//   //     speech.rate = 0.95;
//   //     speech.pitch = 1;

//   //     speech.onend = resolve;
//   //     speech.onerror = resolve;

//   //     speechSynthesis.speak(speech);
//   //   });
//   // }

//   async function speak(text, lang) {
//     if (!text) return;

//     speechSynthesis.cancel();

//     const voices = await loadVoices();

//     // 🎯 find exact match first
//     let voice =
//       voices.find((v) => v.lang === lang) ||
//       voices.find((v) => v.lang.startsWith(lang.split("-")[0]));

//     // fallback to any Indian voice
//     if (!voice) {
//       voice = voices.find((v) =>
//         ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml"].some((l) =>
//           v.lang.startsWith(l),
//         ),
//       );
//     }

//     const speech = new SpeechSynthesisUtterance(text);

//     if (voice) {
//       speech.voice = voice;
//       console.log("🎤 Using voice:", voice.name, voice.lang);
//     } else {
//       console.warn("⚠️ No matching voice found");
//     }

//     speech.lang = lang;
//     speech.rate = 0.9;
//     speech.pitch = 1;

//     return new Promise((resolve) => {
//       speech.onend = resolve;
//       speech.onerror = resolve;
//       speechSynthesis.speak(speech);
//     });
//   }

//   function getSectionContent(heading) {
//     let content = heading.innerText + ". ";

//     let next = heading.nextElementSibling;

//     while (next && !/^H[1-3]$/.test(next.tagName)) {
//       if (next.innerText) {
//         content += next.innerText + " ";
//       }
//       next = next.nextElementSibling;
//     }

//     return content.slice(0, 2000);
//   }

//   function moveTo(element) {
//     const rect = element.getBoundingClientRect();

//     // Position relative to viewport (FIXED)
//     const top = rect.top + rect.height / 2 - 40; // center vertically
//     const left = rect.left - 100; // left side

//     avatar.style.position = "fixed"; // 🔥 IMPORTANT
//     avatar.style.transition = "all 1s ease";

//     avatar.style.top = Math.max(10, top) + "px";
//     avatar.style.left = Math.max(10, left) + "px";

//     // Bounce animation
//     if (bounceInterval) clearInterval(bounceInterval);

//     let bounce = true;

//     bounceInterval = setInterval(() => {
//       avatar.style.transform = bounce ? "translateY(-6px)" : "translateY(6px)";
//       bounce = !bounce;
//     }, 300);

//     setTimeout(() => {
//       clearInterval(bounceInterval);
//       avatar.style.transform = "translateY(0px)";
//     }, 1500);
//   }

//   function scrollToElement(element) {
//     element.scrollIntoView({
//       behavior: "smooth",
//       block: "center",
//     });
//   }

//   function getFullPageContent() {
//     const elements = document.querySelectorAll("h1, h2, h3, p");

//     let content = "";

//     elements.forEach((el) => {
//       if (el.innerText) {
//         content += el.innerText + "\n";
//       }
//     });

//     return content.slice(0, 4000);
//   }

//   function getLangCode(code) {
//     const map = {
//       en: "en-US",
//       hi: "hi-IN",
//       ta: "ta-IN",
//       te: "te-IN",
//       bn: "bn-IN",
//       mr: "mr-IN",
//       gu: "gu-IN",
//       kn: "kn-IN",
//       ml: "ml-IN",
//       pa: "pa-IN",
//       fr: "fr-FR",
//       es: "es-ES",
//       de: "de-DE",
//       ar: "ar-SA",
//       zh: "zh-CN",
//       ja: "ja-JP",
//     };
//     return map[code] || "en-US";
//   }

//   function loadVoices() {
//     return new Promise((resolve) => {
//       let voices = speechSynthesis.getVoices();
//       if (voices.length) return resolve(voices);
//       speechSynthesis.onvoiceschanged = () => {
//         voices = speechSynthesis.getVoices();
//         resolve(voices);
//       };
//       // ✅ Safety timeout — don't hang forever if event never fires
//       setTimeout(() => resolve(speechSynthesis.getVoices()), 2000);
//     });
//   }

//   function getLangName(code) {
//     return fallbackNames[code] || "English";
//   }

//   async function getFullExplanation(content, sectionCount, lang) {
//     console.log("📤 Sending to background...");
//     const langName = getLangName(lang);
//     const cappedCount = Math.min(sectionCount, 6); // ✅ prevents truncated JSON

//     return new Promise((resolve) => {
//       chrome.runtime.sendMessage(
//         {
//           action: "GET_AI",
//           prompt: `You are a teacher explaining a webpage simply.

// Rules:
// - Language: ${langName} ONLY
// - Do NOT copy original text
// - Short, simple sentences
// - Divide into EXACTLY ${cappedCount} parts

// IMPORTANT: Output ONLY a raw JSON array of ${cappedCount} strings.
// No markdown, no code blocks, no extra text.
// Start your response with [ and end with ]

// Example format: ["part1","part2","part3"]

// Webpage content:
// ${content.slice(0, 2500)}`,
//         },
//         (response) => {
//           if (!response || !response.success) {
//             console.error("AI error:", response?.error);
//             return resolve(null);
//           }
//           console.log("🧠 RAW AI RESPONSE:\n", response.text);
//           resolve(response.text);
//         },
//       );
//     });
//   }

//   function cleanAIResponse(text, expectedCount) {
//     if (!text) return null;

//     try {
//       // Strip markdown fences
//       text = text.replace(/```json|```/g, "").trim();

//       // Extract only the JSON array portion (ignore any text before/after)
//       const arrayMatch = text.match(/\[[\s\S]*\]/);
//       if (arrayMatch) {
//         text = arrayMatch[0];
//       }

//       // Auto-close truncated array
//       if (!text.endsWith("]")) {
//         // Close any open string
//         if ((text.match(/"/g) || []).length % 2 !== 0) {
//           text += '"';
//         }
//         text += "]";
//       }

//       const parsed = JSON.parse(text);
//       if (Array.isArray(parsed) && parsed.length > 0) {
//         console.log(`✅ Parsed ${parsed.length} AI parts`);
//         return parsed;
//       }
//       return null;
//     } catch (e) {
//       console.warn("⚠️ JSON parse failed, attempting line-by-line recovery...");

//       // Last resort: extract quoted strings manually
//       const matches = text.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
//       if (matches && matches.length > 0) {
//         const recovered = matches.map((m) => m.slice(1, -1));
//         console.log(`🔧 Recovered ${recovered.length} parts from broken JSON`);
//         return recovered;
//       }

//       console.error("❌ Could not recover JSON");
//       return null;
//     }
//   }

//   async function startTour(totalTime = 30000, useAI = true, lang = "en") {
//     const sections = document.querySelectorAll("h1, h2, h3");
//     if (!sections.length) {
//       console.warn("⚠️ No headings found on this page");
//       return;
//     }

//     const pageContent = getFullPageContent();
//     // ✅ Cap to match what we send to AI
//     const cappedCount = Math.min(sections.length, 6);

//     let parts = null;

//     if (useAI) {
//       const fullExplanation = await getFullExplanation(
//         pageContent,
//         cappedCount,
//         lang,
//       );
//       parts = cleanAIResponse(fullExplanation, cappedCount);
//     }

//     if (!Array.isArray(parts) || parts.length === 0) {
//       console.warn("⚠️ AI failed → using section headings as fallback");
//       // ✅ Graceful fallback: read heading text directly
//       parts = Array.from(sections)
//         .slice(0, cappedCount)
//         .map((el) => `This section is about: ${el.innerText.trim()}`);
//     }

//     const langCode = getLangCode(lang);

//     for (let i = 0; i < cappedCount; i++) {
//       const el = sections[i];

//       scrollToElement(el);
//       await new Promise((r) => setTimeout(r, 800));
//       moveTo(el);

//       el.style.background = "yellow";

//       // ✅ FIX: Removed the infinite `while (!aiReady)` loop — it was the main bug
//       let text = parts[i];

//       // Handle object values (rare edge case)
//       if (typeof text === "object" && text !== null) {
//         text = Object.values(text)[0];
//       }

//       console.log(`📢 Section ${i + 1}:`, text);

//       // ✅ FIX: isBadAI no longer compares with original — just checks validity
//       if (isBadAI(text)) {
//         console.warn("⚠️ Skipping invalid text for section", i + 1);
//         continue;
//       }

//       await speak(text, langCode);
//     }

//     console.log("✅ Tour complete!");
//   }

//   chrome.runtime.onMessage.addListener(async (req) => {
//     if (req.action === "START") {
//       await createAvatar();
//       startTour(req.time || 40000, req.useAI, req.lang || "en");
//     }
//   });
// }
if (window.__PAGEPILOT__) {
  console.log("⚠️ Already running");
} else {
  window.__PAGEPILOT__ = true;

  let avatar = null;
  let bounceInterval = null;
  let lottieInstance = null;

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
    avatar.style.position = "fixed";
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
              prompt: `You are an AI assistant.\n\nContext:\n${getFullPageContent().slice(0, 2000)}\n\nUser question:\n${q}\n\nAnswer in ${langName}, simple and short.`,
            },
            resolve,
          );
        });

        if (!res || !res.success) {
          console.error("❌ AI failed");
          return;
        }

        let answer = res.text.replace(/```json|```/g, "").trim();
        console.log("AI Answer:", answer);
        const code = getLangCode("en");
        await speak(answer, code);
      };
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

  // ✅ FIX: Less aggressive — only reject if literally empty or not a string
  function isBadAI(text) {
    if (!text || typeof text !== "string") return true;
    if (text.trim().length < 5) return true;
    return false;
  }

  async function speak(text, lang) {
    if (!text) return;
    speechSynthesis.cancel();

    const voices = await loadVoices();

    let voice =
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang.startsWith(lang.split("-")[0]));

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
      console.warn("⚠️ No matching voice found, using default");
    }

    speech.lang = lang;
    speech.rate = 0.9;
    speech.pitch = 1;

    return new Promise((resolve) => {
      speech.onend = resolve;
      speech.onerror = (e) => {
        console.warn("⚠️ Speech error:", e);
        resolve();
      };
      speechSynthesis.speak(speech);
    });
  }

  function moveTo(element) {
    const rect = element.getBoundingClientRect();
    const top = rect.top + rect.height / 2 - 40;
    const left = rect.left - 100;

    avatar.style.position = "fixed";
    avatar.style.transition = "all 1s ease";
    avatar.style.top = Math.max(10, top) + "px";
    avatar.style.left = Math.max(10, left) + "px";

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
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function getFullPageContent() {
    const elements = document.querySelectorAll("h1, h2, h3, p");
    let content = "";
    elements.forEach((el) => {
      if (el.innerText) content += el.innerText + "\n";
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
      // ✅ Safety timeout — don't hang forever if event never fires
      setTimeout(() => resolve(speechSynthesis.getVoices()), 2000);
    });
  }

  function getLangName(code) {
    return fallbackNames[code] || "English";
  }

  // ✅ FIX: Cap sections to 6 max so AI doesn't produce truncated JSON
  async function getFullExplanation(content, sectionCount, lang) {
    console.log("📤 Sending to background...");
    const langName = getLangName(lang);
    const cappedCount = Math.min(sectionCount, 6); // ✅ prevents truncated JSON

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "GET_AI",
          prompt: `You are a teacher explaining a webpage simply.

Rules:
- Language: ${langName} ONLY
- Do NOT copy original text
- Short, simple sentences
- Divide into EXACTLY ${cappedCount} parts

IMPORTANT: Output ONLY a raw JSON array of ${cappedCount} strings.
No markdown, no code blocks, no extra text.
Start your response with [ and end with ]

Example format: ["part1","part2","part3"]

Webpage content:
${content.slice(0, 2500)}`,
        },
        (response) => {
          if (!response || !response.success) {
            console.error("AI error:", response?.error);
            return resolve(null);
          }
          console.log("🧠 RAW AI RESPONSE:\n", response.text);
          resolve(response.text);
        },
      );
    });
  }

  // ✅ FIX: Robust JSON repair — handles truncated arrays, extra text, etc.
  function cleanAIResponse(text, expectedCount) {
    if (!text) return null;

    try {
      // Strip markdown fences
      text = text.replace(/```json|```/g, "").trim();

      // Extract only the JSON array portion (ignore any text before/after)
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        text = arrayMatch[0];
      }

      // Auto-close truncated array
      if (!text.endsWith("]")) {
        // Close any open string
        if ((text.match(/"/g) || []).length % 2 !== 0) {
          text += '"';
        }
        text += "]";
      }

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`✅ Parsed ${parsed.length} AI parts`);
        return parsed;
      }
      return null;
    } catch (e) {
      console.warn("⚠️ JSON parse failed, attempting line-by-line recovery...");

      // Last resort: extract quoted strings manually
      const matches = text.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
      if (matches && matches.length > 0) {
        const recovered = matches.map((m) => m.slice(1, -1));
        console.log(`🔧 Recovered ${recovered.length} parts from broken JSON`);
        return recovered;
      }

      console.error("❌ Could not recover JSON");
      return null;
    }
  }

  async function startTour(totalTime = 30000, useAI = true, lang = "en") {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) {
      console.warn("⚠️ No headings found on this page");
      return;
    }

    const pageContent = getFullPageContent();
    // ✅ Cap to match what we send to AI
    const cappedCount = Math.min(sections.length, 6);

    let parts = null;

    if (useAI) {
      const fullExplanation = await getFullExplanation(
        pageContent,
        cappedCount,
        lang,
      );
      parts = cleanAIResponse(fullExplanation, cappedCount);
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      console.warn("⚠️ AI failed → using section headings as fallback");
      // ✅ Graceful fallback: read heading text directly
      parts = Array.from(sections)
        .slice(0, cappedCount)
        .map((el) => `This section is about: ${el.innerText.trim()}`);
    }

    const langCode = getLangCode(lang);

    for (let i = 0; i < cappedCount; i++) {
      const el = sections[i];

      scrollToElement(el);
      await new Promise((r) => setTimeout(r, 800));
      moveTo(el);

      el.style.background = "yellow";

      // ✅ FIX: Removed the infinite `while (!aiReady)` loop — it was the main bug
      let text = parts[i];

      // Handle object values (rare edge case)
      if (typeof text === "object" && text !== null) {
        text = Object.values(text)[0];
      }

      console.log(`📢 Section ${i + 1}:`, text);

      // ✅ FIX: isBadAI no longer compares with original — just checks validity
      if (isBadAI(text)) {
        console.warn("⚠️ Skipping invalid text for section", i + 1);
        continue;
      }

      await speak(text, langCode);
    }

    console.log("✅ Tour complete!");
  }

  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      await createAvatar();
      startTour(req.time || 40000, req.useAI, req.lang || "en");
    }
  });
}
