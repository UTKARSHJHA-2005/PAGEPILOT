if (window.__PAGEPILOT__) {
  // Clean up old instance first
  document.getElementById("pp-avatar-wrapper")?.remove();
  document.getElementById("pagepilot-chat")?.remove();
  window.__PAGEPILOT__ = false; // Reset the flag
} else {
  window.__PAGEPILOT__ = true;

  let avatar = null;
  let bounceInterval = null;
  let lottieInstance = null;
  let aiResponses = []; // stores all AI explanations for PDF
  let currentLang = "en";

  // ─── Lottie ───────────────────────────────────────────────────────────────
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

  // ─── Load jsPDF ───────────────────────────────────────────────────────────
  function loadJsPDF() {
    return new Promise((resolve) => {
      if (window.jspdf && window.jspdf.jsPDF) {
        return resolve(window.jspdf.jsPDF);
      }
      let attempts = 0;
      const interval = setInterval(() => {
        if (window.jspdf && window.jspdf.jsPDF) {
          clearInterval(interval);
          resolve(window.jspdf.jsPDF);
        } else if (++attempts > 20) {
          clearInterval(interval);
          console.error("jsPDF failed to load");
          resolve(null);
        }
      }, 100);
    });
  }

  // ─── Fetch NotoSans font as base64 for Unicode support ───────────────────
  async function loadUnicodeFont(doc) {
    try {
      const fontUrl = chrome.runtime.getURL("NotoSans-Regular.ttf");
      const resp = await fetch(fontUrl);
      if (!resp.ok) throw new Error("font fetch failed");
      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      doc.addFileToVFS("NotoSans-Regular.ttf", base64);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      return true;
    } catch (e) {
      console.warn("⚠️ Unicode font not loaded, using helvetica:", e);
      return false;
    }
  }

  async function downloadAsPDF() {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      alert("Could not load PDF library. Please try again.");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Load Unicode font so non-Latin text renders correctly
    const hasUnicodeFont = await loadUnicodeFont(doc);
    const bodyFont = hasUnicodeFont ? "NotoSans" : "helvetica";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(60, 60, 180);
    doc.text("PagePilot AI Summary", margin, y);
    y += 8;

    // Page URL + date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const urlLines = doc.splitTextToSize(
      `Source: ${window.location.href}`,
      maxWidth,
    );
    doc.text(urlLines, margin, y);
    y += urlLines.length * 4 + 2;
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 8;

    // Divider
    doc.setDrawColor(180, 180, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const sections = document.querySelectorAll("h1, h2, h3");

    if (aiResponses.length === 0) {
      doc.setFont(bodyFont, "normal");
      doc.setFontSize(11);
      doc.setTextColor(150, 80, 80);
      doc.text("No AI explanations yet. Start the guide first!", margin, y);
    } else {
      aiResponses.forEach((item, i) => {
        const heading = sections[i]?.innerText?.trim() || `Section ${i + 1}`;
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        // Section heading — use unicode font for heading text too
        doc.setFont(bodyFont, "normal");
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 150);
        const headingLines = doc.splitTextToSize(
          `${i + 1}. ${heading}`,
          maxWidth,
        );
        doc.text(headingLines, margin, y);
        y += headingLines.length * 6 + 2;

        // AI text
        doc.setFont(bodyFont, "normal");
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        const bodyLines = doc.splitTextToSize(item, maxWidth);
        bodyLines.forEach((line) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 5.5;
        });
        y += 5;
      });
    }

    // Footer on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`PagePilot AI — Page ${p} of ${totalPages}`, margin, 290);
    }

    doc.save(
      `PagePilot_${(document.title.slice(0, 30) || "summary").replace(/\s+/g, "_")}.pdf`,
    );
  }

  // ─── Chat Panel ───────────────────────────────────────────────────────────
  function createChatPanel(lang) {
    document.getElementById("pagepilot-chat")?.remove();

    const panel = document.createElement("div");
    panel.id = "pagepilot-chat";
    panel.style.cssText = `
      position:fixed; bottom:20px; right:20px; width:320px;
      background:#fff; border-radius:16px;
      box-shadow:0 8px 32px rgba(0,0,0,0.18);
      z-index:9999999; font-family:sans-serif;
      display:flex; flex-direction:column; overflow:hidden;
      border:1.5px solid #e0e0f0;
    `;

    panel.innerHTML = `
      <div style="background:linear-gradient(135deg,#5c6bc0,#7c4dff);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#fff;font-weight:700;font-size:14px;">🤖 Ask PagePilot</span>
        <button id="pp-close-chat" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div id="pp-messages" style="flex:1;height:220px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f7fb;"></div>
      <div style="padding:10px;border-top:1px solid #eee;display:flex;gap:6px;background:#fff;align-items:center;">
        <input id="pp-input" placeholder="Ask something..." style="
          flex:1;padding:8px 12px;border-radius:20px;
          border:1.5px solid #c5cae9;font-size:13px;outline:none;
        " />
        <button id="pp-mic" title="Speak your question" style="
          background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
          border:none;border-radius:50%;width:36px;height:36px;
          cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;
          flex-shrink:0;transition:background 0.2s;
        ">🎙️</button>
        <button id="pp-send" style="
          background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
          border:none;border-radius:20px;padding:8px 14px;
          cursor:pointer;font-size:13px;font-weight:600;flex-shrink:0;
        ">Send</button>
      </div>
      <div id="pp-mic-status" style="
        display:none;text-align:center;font-size:11px;color:#7c4dff;
        padding:4px 0 6px;background:#fff;
      ">🔴 Listening... speak now</div>
    `;

    document.body.appendChild(panel);

    document.getElementById("pp-close-chat").onclick = () => panel.remove();

    document.getElementById("pp-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("pp-send").click();
    });

    // ─── Mic / Voice Input ─────────────────────────────────────────────────
    const micBtn = document.getElementById("pp-mic");
    const micStatus = document.getElementById("pp-mic-status");
    let isListening = false;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      micBtn.title = "Voice input not supported in this browser";
      micBtn.style.opacity = "0.4";
      micBtn.style.cursor = "not-allowed";
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Use the selected language for recognition
      recognition.lang = getLangCode(lang);

      recognition.onstart = () => {
        isListening = true;
        micBtn.textContent = "⏹️";
        micBtn.style.background = "linear-gradient(135deg,#e53935,#e91e63)";
        micStatus.style.display = "block";
      };

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        document.getElementById("pp-input").value = transcript;
        // Auto-send after voice input
        setTimeout(() => document.getElementById("pp-send").click(), 300);
      };

      recognition.onerror = (e) => {
        console.warn("🎙️ Recognition error:", e.error);
        addChatMessage(`❌ Mic error: ${e.error}. Try again.`, "bot");
      };

      recognition.onend = () => {
        isListening = false;
        micBtn.textContent = "🎙️";
        micBtn.style.background = "linear-gradient(135deg,#5c6bc0,#7c4dff)";
        micStatus.style.display = "none";
      };

      micBtn.onclick = () => {
        if (isListening) {
          recognition.stop();
        } else {
          recognition.lang = getLangCode(lang);
          recognition.start();
        }
      };
    }

    // ─── Send button ───────────────────────────────────────────────────────
    document.getElementById("pp-send").onclick = async () => {
      const input = document.getElementById("pp-input");
      const q = input.value.trim();
      if (!q) return;
      input.value = "";

      addChatMessage(q, "user");
      const thinkingId = addChatMessage("⏳ Thinking...", "bot", true);
      const langName = getLangName(lang);

      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "GET_AI",
            prompt: `You are an enthusiastic AI assistant who loves giving context and insights.

The user is browsing a webpage and asked you a question.

Page context:
${getFullPageContent().slice(0, 2000)}

User question: ${q}

Instructions:
- Answer in ${langName} ONLY
- First, directly answer the question in 1-2 simple sentences in ${langName} only.
- Then add YOUR own insight in ${langName} only — a related fact, real-world example, or interesting angle
- Start your insight with phrases in ${langName} only like "What's interesting is...", "Fun fact:", "Think of it like...", or "My take is..."
- Keep total response to 3-4 sentences max in ${langName} only.
- Be friendly and conversational`,
          },
          resolve,
        );
      });

      document.getElementById(thinkingId)?.remove();

      if (!res || !res.success) {
        addChatMessage("❌ AI failed. Try again.", "bot");
        return;
      }

      const answer = res.text.replace(/```json|```/g, "").trim();
      addChatMessage(answer, "bot");
      await speak(answer, getLangCode(lang));
    };
  }

  function addChatMessage(text, sender, isTemp = false) {
    const messages = document.getElementById("pp-messages");
    if (!messages) return null;
    const id = "msg-" + Date.now() + Math.random().toString(36).slice(2);
    const bubble = document.createElement("div");
    bubble.id = id;
    bubble.style.cssText = `
      max-width:85%; padding:8px 12px; word-wrap:break-word;
      border-radius:${sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
      background:${sender === "user" ? "linear-gradient(135deg,#5c6bc0,#7c4dff)" : "#fff"};
      color:${sender === "user" ? "#fff" : "#333"};
      font-size:13px; line-height:1.5;
      align-self:${sender === "user" ? "flex-end" : "flex-start"};
      box-shadow:0 1px 4px rgba(0,0,0,0.08);
      border:${sender === "bot" ? "1px solid #e8e8f0" : "none"};
    `;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }

  // ─── Hover Menu ───────────────────────────────────────────────────────────
  function attachHoverMenu(lang) {
    const menu = document.createElement("div");
    menu.id = "pp-hover-menu";
    menu.style.cssText = `
      position:absolute; top:88px; left:0;
      background:#fff; border-radius:12px;
      box-shadow:0 6px 24px rgba(0,0,0,0.16);
      border:1.5px solid #e0e0f0;
      padding:6px; display:none; flex-direction:column;
      gap:4px; min-width:160px; z-index:9999999; font-family:sans-serif;
    `;

    const mkBtn = (icon, label) => {
      const btn = document.createElement("button");
      btn.style.cssText = `
        display:flex; align-items:center; gap:8px;
        padding:8px 12px; border:none; background:none;
        border-radius:8px; cursor:pointer; font-size:13px;
        font-weight:600; color:#333; width:100%; text-align:left;
      `;
      btn.innerHTML = `<span>${icon}</span><span>${label}</span>`;
      btn.onmouseenter = () => (btn.style.background = "#f0f0ff");
      btn.onmouseleave = () => (btn.style.background = "none");
      return btn;
    };

    const downloadBtn = mkBtn("📄", "Download PDF");
    const chatBtn = mkBtn("💬", "Ask & Speak");
    menu.appendChild(downloadBtn);
    menu.appendChild(chatBtn);

    downloadBtn.onclick = () => {
      menu.style.display = "none";
      downloadAsPDF();
    };
    chatBtn.onclick = () => {
      menu.style.display = "none";
      createChatPanel(lang);
    };

    const wrapper = document.createElement("div");
    wrapper.id = "pp-avatar-wrapper";
    wrapper.style.cssText = `position:fixed; left:20px; top:20px; width:80px; z-index:999998;`;
    wrapper.appendChild(avatar);
    wrapper.appendChild(menu);
    document.body.appendChild(wrapper);

    let hideTimeout;
    wrapper.onmouseenter = () => {
      clearTimeout(hideTimeout);
      menu.style.display = "flex";
    };
    wrapper.onmouseleave = () => {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
      }, 350);
    };
  }

  function moveTo(element) {
    const wrapper = document.getElementById("pp-avatar-wrapper");
    if (!wrapper) return;

    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    // Place avatar to LEFT of heading, vertically centered on it
    const top = scrollY + rect.top + rect.height / 2 - 40;
    const left = scrollX + rect.left - 96; // 80px avatar + 16px gap

    wrapper.style.transition = "all 0.7s cubic-bezier(0.34,1.56,0.64,1)";
    wrapper.style.position = "absolute"; // switch from fixed to absolute for scroll-following
    wrapper.style.top = Math.max(scrollY + 10, top) + "px";
    wrapper.style.left = Math.max(10, left) + "px";

    // Bounce
    if (bounceInterval) clearInterval(bounceInterval);
    let bounce = true;
    bounceInterval = setInterval(() => {
      wrapper.style.transform = bounce
        ? "translateY(-5px) scale(1.05)"
        : "translateY(5px) scale(0.97)";
      bounce = !bounce;
    }, 400);
    setTimeout(() => {
      clearInterval(bounceInterval);
      wrapper.style.transform = "none";
    }, 1600);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isBadAI(text) {
    return !text || typeof text !== "string" || text.trim().length < 5;
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
      console.log("🎤 Voice:", voice.name);
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

  function scrollToElement(el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function getFullPageContent() {
    let content = "";
    document.querySelectorAll("h1,h2,h3,p").forEach((el) => {
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
      const v = speechSynthesis.getVoices();
      if (v.length) return resolve(v);
      speechSynthesis.onvoiceschanged = () =>
        resolve(speechSynthesis.getVoices());
      setTimeout(() => resolve(speechSynthesis.getVoices()), 2000);
    });
  }

  function getLangName(code) {
    return fallbackNames[code] || "English";
  }

  // ─── AI Explanation ───────────────────────────────────────────────────────
  async function getFullExplanation(content, sectionCount, lang) {
    console.log("📤 Sending to background...");
    const langName = getLangName(lang);
    const cappedCount = Math.min(sectionCount, 6);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "GET_AI",
          prompt: `You are an enthusiastic AI guide explaining a webpage to a curious beginner.

For each section, do TWO things:
1. Explain what the section says in simple words
2. ADD your own thought — a fun fact, real-world example, why it matters, or your personal take

Rules:
- Language: ${langName} ONLY
- Do NOT copy the original text word for word
- Keep each part to 3-4 sentences max in ${langName} only.
- First 2 sentences: explain the content simply in ${langName} only.
- Last 1-2 sentences: YOUR own insight in ${langName} ONLY — start with "What I find interesting is...", "Think of it like...", "In real life this means...", or "My take is..."
- Be conversational and engaging, like a smart friend explaining it in ${langName} only.
- Divide into EXACTLY ${cappedCount} parts

IMPORTANT: Output ONLY a raw JSON array of ${cappedCount} strings.
No markdown, no code blocks, no extra text. Start with [ and end with ]

Example: ["This section talks about X. In real life this means Y.","This part explains Z. What I find interesting is W."]

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

  function cleanAIResponse(text) {
    if (!text) return null;
    try {
      text = text.replace(/```json|```/g, "").trim();
      const m = text.match(/\[[\s\S]*\]/);
      if (m) text = m[0];
      if (!text.endsWith("]")) {
        if ((text.match(/"/g) || []).length % 2 !== 0) text += '"';
        text += "]";
      }
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return null;
    } catch {
      const matches = text.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
      if (matches?.length > 0) return matches.map((m) => m.slice(1, -1));
      return null;
    }
  }

  function isYouTubePage() {
    return (
      location.hostname.includes("youtube.com") &&
      location.pathname === "/watch"
    );
  }

  function getYouTubeData() {
    const title =
      document
        .querySelector(
          "h1.ytd-video-primary-info-renderer, yt-formatted-string.ytd-video-primary-info-renderer",
        )
        ?.innerText?.trim() || document.title.replace(" - YouTube", "").trim();

    const description =
      document
        .querySelector(
          "ytd-text-inline-expander yt-attributed-string, #description-inline-expander, #description yt-formatted-string",
        )
        ?.innerText?.trim()
        ?.slice(0, 1500) || "";

    const chapters = [];
    document
      .querySelectorAll(
        "ytd-macro-markers-list-item-renderer, #endpoint.ytd-chapter-renderer",
      )
      .forEach((el) => {
        const time = el
          .querySelector("#time, .macro-markers")
          ?.innerText?.trim();
        const label = el
          .querySelector("#title, #chapter-title")
          ?.innerText?.trim();
        if (time && label) chapters.push({ time, label });
      });

    return { title, description, chapters };
  }

  async function startYouTubeTour(lang = "en") {
    const { title, description, chapters } = getYouTubeData();
    const langName = getLangName(lang);
    const langCode = getLangCode(lang);

    // ── Insert avatar panel below the video
    let panel = document.getElementById("pp-yt-panel");
    if (panel) panel.remove();

    panel = document.createElement("div");
    panel.id = "pp-yt-panel";
    panel.style.cssText = `
    margin: 12px 0 0 0;
    background: #fff;
    border-radius: 16px;
    border: 1.5px solid #e0e0f0;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    font-family: sans-serif;
    overflow: hidden;
  `;

    panel.innerHTML = `
    <div style="background:linear-gradient(135deg,#5c6bc0,#7c4dff);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:#fff;font-weight:700;font-size:14px;">🤖 PagePilot — Video Guide</span>
      <button id="pp-yt-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">✕</button>
    </div>

    <div style="padding:14px 18px;display:flex;gap:10px;flex-wrap:wrap;border-bottom:1px solid #f0f0f8;">
      <button id="pp-yt-summarize" style="
        background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
        border:none;border-radius:20px;padding:8px 18px;
        cursor:pointer;font-size:13px;font-weight:600;">
        📋 Summarize
      </button>
      <button id="pp-yt-chapters" style="
        background:#f0f0ff;color:#5c6bc0;
        border:1.5px solid #c5cae9;border-radius:20px;padding:8px 18px;
        cursor:pointer;font-size:13px;font-weight:600;">
        📑 Walk Chapters
      </button>
      <button id="pp-yt-dl" style="
        background:#f0f0ff;color:#5c6bc0;
        border:1.5px solid #c5cae9;border-radius:20px;padding:8px 18px;
        cursor:pointer;font-size:13px;font-weight:600;">
        📄 Download PDF
      </button>
    </div>

    <div id="pp-yt-output" style="
      padding:16px 18px;min-height:80px;max-height:260px;
      overflow-y:auto;font-size:13px;color:#333;line-height:1.7;
      background:#fafafe;
    ">
      <span style="color:#aaa;">Press a button above to start ✨</span>
    </div>

    <div style="padding:10px 18px;border-top:1px solid #eee;display:flex;gap:6px;background:#fff;align-items:center;">
      <input id="pp-yt-input" placeholder="Ask anything about this video..." style="
        flex:1;padding:8px 12px;border-radius:20px;
        border:1.5px solid #c5cae9;font-size:13px;outline:none;
      "/>
      <button id="pp-yt-mic" title="Voice input" style="
        background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
        border:none;border-radius:50%;width:36px;height:36px;
        cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      ">🎙️</button>
      <button id="pp-yt-send" style="
        background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
        border:none;border-radius:20px;padding:8px 14px;
        cursor:pointer;font-size:13px;font-weight:600;flex-shrink:0;
      ">Ask</button>
    </div>
  `;

    // Insert below the video title area
    const target =
      document.querySelector("ytd-watch-metadata") ||
      document.querySelector("#above-the-fold") ||
      document.querySelector("#primary-inner");

    if (target) {
      target.insertAdjacentElement("afterend", panel);
    } else {
      document.body.appendChild(panel);
    }

    // ── Close
    document.getElementById("pp-yt-close").onclick = () => panel.remove();

    // ── Output helper
    function setOutput(html, append = false) {
      const out = document.getElementById("pp-yt-output");
      if (!out) return;
      if (append) out.innerHTML += html;
      else out.innerHTML = html;
      out.scrollTop = out.scrollHeight;
    }

    function loadingHTML(msg = "Thinking...") {
      return `<span style="color:#7c4dff;">⏳ ${msg}</span>`;
    }

    // ── Summarize
    document.getElementById("pp-yt-summarize").onclick = async () => {
      setOutput(loadingHTML("Summarizing the video..."));
      aiResponses = [];

      const res = await new Promise((resolve) =>
        chrome.runtime.sendMessage(
          {
            action: "GET_AI",
            prompt: `You are an enthusiastic AI guide explaining a YouTube video.

Video title: "${title}"
Description: "${description}"

Instructions:
- Respond in ${langName} ONLY
- Write a rich summary in 4-6 sentences in ${langName}
- Cover: what the video is about, who it's for, key points, and why it's worth watching
- Start with "This video is about..." in ${langName}
- Add your own take at the end: what you find most interesting about it
- Be conversational, warm, and engaging`,
          },
          resolve,
        ),
      );

      if (!res?.success) {
        setOutput("❌ AI failed. Try again.");
        return;
      }
      const text = res.text.replace(/```json|```/g, "").trim();
      aiResponses.push(text);
      setOutput(`<div style="line-height:1.8;">${text}</div>`);
      await speak(text, langCode);
    };

    // ── Walk Chapters
    document.getElementById("pp-yt-chapters").onclick = async () => {
      if (!chapters.length) {
        setOutput(
          `<span style="color:#e57373;">⚠️ No chapters found for this video. Try Summarize instead.</span>`,
        );
        return;
      }

      setOutput(loadingHTML(`Explaining ${chapters.length} chapters...`));
      aiResponses = [];

      const chapterList = chapters
        .map((c, i) => `${i + 1}. [${c.time}] ${c.label}`)
        .join("\n");

      const res = await new Promise((resolve) =>
        chrome.runtime.sendMessage(
          {
            action: "GET_AI",
            prompt: `You are an enthusiastic AI guide explaining a YouTube video chapter by chapter.

Video title: "${title}"
Chapters:
${chapterList}

Instructions:
- Respond in ${langName} ONLY
- Output ONLY a raw JSON array of ${chapters.length} strings. No markdown, no code blocks.
- Each string = a 2-3 sentence explanation of that chapter in ${langName}
- First sentence: what this chapter is about
- Second sentence: why it matters or an interesting insight
- Be conversational and engaging in ${langName}

Example: ["This chapter covers X. What's great about this is Y.","This part explains Z. Think of it like W."]`,
          },
          resolve,
        ),
      );

      if (!res?.success) {
        setOutput("❌ AI failed. Try again.");
        return;
      }

      const parts = cleanAIResponse(res.text);
      if (!parts) {
        setOutput("❌ Could not parse chapters. Try again.");
        return;
      }

      let html = "";
      for (let i = 0; i < chapters.length; i++) {
        const text = parts[i] || `Chapter: ${chapters[i].label}`;
        aiResponses.push(text);
        html += `
        <div style="margin-bottom:14px;padding:10px 14px;background:#f0f0ff;border-radius:10px;border-left:3px solid #5c6bc0;">
          <div style="font-weight:700;color:#3949ab;font-size:12px;margin-bottom:4px;">
            ⏱ ${chapters[i].time} — ${chapters[i].label}
          </div>
          <div style="color:#333;font-size:13px;line-height:1.7;">${text}</div>
        </div>`;
      }
      setOutput(html);

      // Read aloud each chapter with a small pause
      for (let i = 0; i < aiResponses.length; i++) {
        await speak(aiResponses[i], langCode);
        await new Promise((r) => setTimeout(r, 400));
      }
    };

    // ── Download PDF
    document.getElementById("pp-yt-dl").onclick = async () => {
      if (!aiResponses.length) {
        setOutput(
          `<span style="color:#e57373;">⚠️ Run Summarize or Walk Chapters first to generate content for the PDF.</span>`,
        );
        return;
      }
      await downloadYouTubePDF(title);
    };

    // ── Chat / Ask
    const sendBtn = document.getElementById("pp-yt-send");
    const inputEl = document.getElementById("pp-yt-input");

    async function handleYTChat() {
      const q = inputEl.value.trim();
      if (!q) return;
      inputEl.value = "";
      setOutput(loadingHTML(`Answering: "${q}"`));
      console.log("Chat Sent");

      const res = await new Promise((resolve) =>
        chrome.runtime.sendMessage(
          {
            action: "GET_AI",
            prompt: `You are an AI assistant. The user is watching a YouTube video and asked a question about it.

Video title: "${title}"
Description: "${description.slice(0, 800)}"
${chapters.length ? `Chapters:\n${chapters.map((c) => `[${c.time}] ${c.label}`).join("\n")}` : ""}

User question: ${q}

Instructions:
- Answer in ${langName} ONLY
- Answer directly in 2-3 sentences in ${langName}
- Then add your own insight or related fact in ${langName}
- Be friendly and conversational`,
          },
          resolve,
        ),
      );

      if (!res?.success) {
        setOutput("❌ AI failed. Try again.");
        return;
      }
      const text = res.text.replace(/```json|```/g, "").trim();
      setOutput(`
      <div style="margin-bottom:8px;font-size:12px;color:#7c4dff;font-weight:600;">You asked: ${q}</div>
      <div style="line-height:1.8;">${text}</div>
    `);
      await speak(text, langCode);
    }

    sendBtn.onclick = handleYTChat;
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleYTChat();
    });

    // ── Mic
    const micBtn = document.getElementById("pp-yt-mic");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micBtn.style.opacity = "0.4";
      micBtn.style.cursor = "not-allowed";
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = langCode;
      let listening = false;

      rec.onstart = () => {
        listening = true;
        micBtn.textContent = "⏹️";
        micBtn.style.background = "linear-gradient(135deg,#e53935,#e91e63)";
      };
      rec.onresult = (e) => {
        inputEl.value = e.results[0][0].transcript;
        setTimeout(() => sendBtn.click(), 300);
      };
      rec.onerror = (e) => console.warn("Mic error:", e.error);
      rec.onend = () => {
        listening = false;
        micBtn.textContent = "🎙️";
        micBtn.style.background = "linear-gradient(135deg,#5c6bc0,#7c4dff)";
      };
      micBtn.onclick = () => (listening ? rec.stop() : rec.start());
    }
  }

  async function downloadYouTubePDF(videoTitle) {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      alert("Could not load PDF library.");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const hasUnicodeFont = await loadUnicodeFont(doc);
    const bodyFont = hasUnicodeFont ? "NotoSans" : "helvetica";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(60, 60, 180);
    doc.text("PagePilot — YouTube Summary", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const urlLines = doc.splitTextToSize(
      `Video: ${window.location.href}`,
      maxWidth,
    );
    doc.text(urlLines, margin, y);
    y += urlLines.length * 4 + 2;
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 8;

    doc.setDrawColor(180, 180, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const { chapters } = getYouTubeData();

    aiResponses.forEach((text, i) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const heading = chapters[i]
        ? `[${chapters[i].time}] ${chapters[i].label}`
        : i === 0
          ? "Video Summary"
          : `Section ${i + 1}`;

      doc.setFont(bodyFont, "normal");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 150);
      const headingLines = doc.splitTextToSize(
        `${i + 1}. ${heading}`,
        maxWidth,
      );
      doc.text(headingLines, margin, y);
      y += headingLines.length * 6 + 2;

      doc.setFont(bodyFont, "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const bodyLines = doc.splitTextToSize(text, maxWidth);
      bodyLines.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5.5;
      });
      y += 5;
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`PagePilot AI — Page ${p} of ${totalPages}`, margin, 290);
    }

    doc.save(
      `PagePilot_YT_${(videoTitle.slice(0, 30) || "video").replace(/\s+/g, "_")}.pdf`,
    );
  }

  async function createAvatar(lang = "en") {
    currentLang = lang;

    avatar = document.createElement("div");
    avatar.style.cssText = `width:80px;height:80px;cursor:pointer;`;

    // Inline SVG humanoid — no external dependency
    avatar.innerHTML = `
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pp-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FDDBB4"/>
          <stop offset="100%" stop-color="#F5C48A"/>
        </linearGradient>
        <linearGradient id="pp-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5c6bc0"/>
          <stop offset="100%" stop-color="#3949ab"/>
        </linearGradient>
      </defs>

      <!-- Shadow -->
      <ellipse cx="40" cy="77" rx="20" ry="4" fill="#9FA8DA" opacity="0.3"/>

      <!-- Legs -->
      <rect x="27" y="58" width="9" height="16" rx="4" fill="#3949ab"/>
      <rect x="38" y="58" width="9" height="16" rx="4" fill="#3949ab"/>
      <!-- Shoes -->
      <ellipse cx="31" cy="74" rx="8" ry="4" fill="#283593"/>
      <ellipse cx="42" cy="74" rx="8" ry="4" fill="#283593"/>

      <!-- Body -->
      <rect x="22" y="42" width="36" height="20" rx="8" fill="url(#pp-body)"/>
      <!-- Tie -->
      <polygon points="38,44 42,44 43,55 40,58 37,55" fill="#7986CB" opacity="0.9"/>

      <!-- Neck -->
      <rect x="33" y="39" width="14" height="10" rx="5" fill="url(#pp-skin)"/>

      <!-- Left arm (raised / pointing) -->
      <rect x="8" y="44" width="16" height="9" rx="4" fill="url(#pp-body)"/>
      <rect x="3" y="37" width="10" height="9" rx="4" fill="url(#pp-skin)" transform="rotate(-30,8,42)"/>
      <!-- pointing finger -->
      <rect x="1" y="27" width="5" height="13" rx="2.5" fill="url(#pp-skin)" transform="rotate(-20,3,33)"/>

      <!-- Right arm (relaxed) -->
      <rect x="58" y="44" width="14" height="9" rx="4" fill="url(#pp-body)"/>
      <rect x="69" y="46" width="9" height="16" rx="4" fill="url(#pp-skin)"/>

      <!-- Head -->
      <ellipse cx="40" cy="28" rx="17" ry="18" fill="url(#pp-skin)"/>

      <!-- Hair -->
      <ellipse cx="40" cy="12" rx="16" ry="7" fill="#4A2C0A"/>
      <ellipse cx="24" cy="20" rx="6" ry="9" fill="#4A2C0A"/>
      <ellipse cx="56" cy="20" rx="6" ry="9" fill="#4A2C0A"/>

      <!-- Eyes -->
      <ellipse cx="33" cy="27" rx="4" ry="4.5" fill="#fff"/>
      <ellipse cx="47" cy="27" rx="4" ry="4.5" fill="#fff"/>
      <circle cx="34" cy="28" r="2.5" fill="#1a1a2e"/>
      <circle cx="48" cy="28" r="2.5" fill="#1a1a2e"/>
      <circle cx="35" cy="26.5" r="1" fill="#fff"/>
      <circle cx="49" cy="26.5" r="1" fill="#fff"/>

      <!-- Eyebrows -->
      <path d="M28 21 Q33 18 38 21" fill="none" stroke="#5D3A1A" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M42 21 Q47 18 52 21" fill="none" stroke="#5D3A1A" stroke-width="1.8" stroke-linecap="round"/>

      <!-- Smile -->
      <path d="M33 36 Q40 42 47 36" fill="none" stroke="#C87941" stroke-width="2" stroke-linecap="round"/>

      <!-- Ears -->
      <ellipse cx="23" cy="28" rx="3" ry="5" fill="#F0B47A"/>
      <ellipse cx="57" cy="28" rx="3" ry="5" fill="#F0B47A"/>

      <!-- Animated glow ring (speaking indicator) -->
      <circle id="pp-pulse" cx="40" cy="40" r="36" fill="none" stroke="#5c6bc0" stroke-width="2.5" opacity="0.6"
        style="transform-origin:center;animation:pp-ring 1.4s ease-out infinite"/>
    </svg>
    <style>
      @keyframes pp-ring {
        0%   { r: 36; opacity: 0.6; }
        100% { r: 46; opacity: 0; }
      }
    </style>
  `;

    attachHoverMenu(lang);
  }

  // ─── Tour ─────────────────────────────────────────────────────────────────
  async function startTour(totalTime = 30000, useAI = true, lang = "en") {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) {
      console.warn("⚠️ No headings found");
      return;
    }

    const pageContent = getFullPageContent();
    const cappedCount = Math.min(sections.length, 6);
    aiResponses = [];

    let parts = null;
    if (useAI) {
      const raw = await getFullExplanation(pageContent, cappedCount, lang);
      parts = cleanAIResponse(raw);
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      console.warn("⚠️ AI failed → fallback");
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

      let text = parts[i];
      if (typeof text === "object" && text !== null)
        text = Object.values(text)[0];

      console.log(`📢 Section ${i + 1}:`, text);
      if (isBadAI(text)) {
        console.warn("⚠️ Skipping invalid text");
        continue;
      }

      aiResponses.push(text);
      await speak(text, langCode);
    }

    console.log(
      "✅ Tour complete! PDF ready with",
      aiResponses.length,
      "sections.",
    );
  }

  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      const lang = req.lang || "en";
      await createAvatar(lang);

      if (isYouTubePage()) {
        // YouTube mode — panel below video, no heading tour
        startYouTubeTour(lang);
      } else {
        // Normal webpage mode — heading-by-heading tour
        startTour(req.time || 40000, req.useAI, lang);
      }
    }
  });
}
