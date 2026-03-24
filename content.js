// if (window.__PAGEPILOT__) {
//   console.log("⚠️ Already running");
// } else {
//   window.__PAGEPILOT__ = true;

//   let avatar = null;
//   let bounceInterval = null;
//   let lottieInstance = null;
//   let aiResponses = []; // stores all AI explanations for PDF
//   let currentLang = "en";

//   // ─── Lottie ───────────────────────────────────────────────────────────────
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

//   // ─── Load jsPDF ───────────────────────────────────────────────────────────
//   function loadJsPDF() {
//     return new Promise((resolve) => {
//       if (window.jspdf && window.jspdf.jsPDF) {
//         return resolve(window.jspdf.jsPDF);
//       }
//       let attempts = 0;
//       const interval = setInterval(() => {
//         if (window.jspdf && window.jspdf.jsPDF) {
//           clearInterval(interval);
//           resolve(window.jspdf.jsPDF);
//         } else if (++attempts > 20) {
//           clearInterval(interval);
//           console.error("jsPDF failed to load");
//           resolve(null);
//         }
//       }, 100);
//     });
//   }

//   // ─── Fetch NotoSans font as base64 for Unicode support ───────────────────
//   // We fetch the font from the extension's own files (must be in web_accessible_resources)
//   // Falls back gracefully if not available
//   async function loadUnicodeFont(doc) {
//     try {
//       const fontUrl = chrome.runtime.getURL("NotoSans-Regular.ttf");
//       const resp = await fetch(fontUrl);
//       if (!resp.ok) throw new Error("font fetch failed");
//       const buffer = await resp.arrayBuffer();
//       const bytes = new Uint8Array(buffer);
//       let binary = "";
//       for (let i = 0; i < bytes.byteLength; i++) {
//         binary += String.fromCharCode(bytes[i]);
//       }
//       const base64 = btoa(binary);
//       doc.addFileToVFS("NotoSans-Regular.ttf", base64);
//       doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
//       return true;
//     } catch (e) {
//       console.warn("⚠️ Unicode font not loaded, using helvetica:", e);
//       return false;
//     }
//   }

//   // ─── PDF Download ─────────────────────────────────────────────────────────
//   async function downloadAsPDF() {
//     const jsPDF = await loadJsPDF();
//     if (!jsPDF) {
//       alert("Could not load PDF library. Please try again.");
//       return;
//     }

//     const doc = new jsPDF({ unit: "mm", format: "a4" });
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const margin = 15;
//     const maxWidth = pageWidth - margin * 2;
//     let y = 20;

//     // Load Unicode font so non-Latin text renders correctly
//     const hasUnicodeFont = await loadUnicodeFont(doc);
//     const bodyFont = hasUnicodeFont ? "NotoSans" : "helvetica";

//     // Title (latin only — safe with helvetica)
//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(18);
//     doc.setTextColor(60, 60, 180);
//     doc.text("PagePilot AI Summary", margin, y);
//     y += 8;

//     // Page URL + date
//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(9);
//     doc.setTextColor(120, 120, 120);
//     const urlLines = doc.splitTextToSize(
//       `Source: ${window.location.href}`,
//       maxWidth,
//     );
//     doc.text(urlLines, margin, y);
//     y += urlLines.length * 4 + 2;
//     doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
//     y += 8;

//     // Divider
//     doc.setDrawColor(180, 180, 220);
//     doc.line(margin, y, pageWidth - margin, y);
//     y += 8;

//     const sections = document.querySelectorAll("h1, h2, h3");

//     if (aiResponses.length === 0) {
//       doc.setFont(bodyFont, "normal");
//       doc.setFontSize(11);
//       doc.setTextColor(150, 80, 80);
//       doc.text("No AI explanations yet. Start the guide first!", margin, y);
//     } else {
//       aiResponses.forEach((item, i) => {
//         const heading = sections[i]?.innerText?.trim() || `Section ${i + 1}`;
//         if (y > 260) {
//           doc.addPage();
//           y = 20;
//         }

//         // Section heading — use unicode font for heading text too
//         doc.setFont(bodyFont, "normal");
//         doc.setFontSize(12);
//         doc.setTextColor(40, 40, 150);
//         const headingLines = doc.splitTextToSize(
//           `${i + 1}. ${heading}`,
//           maxWidth,
//         );
//         doc.text(headingLines, margin, y);
//         y += headingLines.length * 6 + 2;

//         // AI text
//         doc.setFont(bodyFont, "normal");
//         doc.setFontSize(10);
//         doc.setTextColor(40, 40, 40);
//         const bodyLines = doc.splitTextToSize(item, maxWidth);
//         bodyLines.forEach((line) => {
//           if (y > 270) {
//             doc.addPage();
//             y = 20;
//           }
//           doc.text(line, margin, y);
//           y += 5.5;
//         });
//         y += 5;
//       });
//     }

//     // Footer on all pages
//     const totalPages = doc.internal.getNumberOfPages();
//     for (let p = 1; p <= totalPages; p++) {
//       doc.setPage(p);
//       doc.setFont("helvetica", "italic");
//       doc.setFontSize(8);
//       doc.setTextColor(160, 160, 160);
//       doc.text(`PagePilot AI — Page ${p} of ${totalPages}`, margin, 290);
//     }

//     doc.save(
//       `PagePilot_${(document.title.slice(0, 30) || "summary").replace(/\s+/g, "_")}.pdf`,
//     );
//   }

//   // ─── Chat Panel ───────────────────────────────────────────────────────────
//   function createChatPanel(lang) {
//     document.getElementById("pagepilot-chat")?.remove();

//     const panel = document.createElement("div");
//     panel.id = "pagepilot-chat";
//     panel.style.cssText = `
//       position:fixed; bottom:20px; right:20px; width:320px;
//       background:#fff; border-radius:16px;
//       box-shadow:0 8px 32px rgba(0,0,0,0.18);
//       z-index:9999999; font-family:sans-serif;
//       display:flex; flex-direction:column; overflow:hidden;
//       border:1.5px solid #e0e0f0;
//     `;

//     panel.innerHTML = `
//       <div style="background:linear-gradient(135deg,#5c6bc0,#7c4dff);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
//         <span style="color:#fff;font-weight:700;font-size:14px;">🤖 Ask PagePilot</span>
//         <button id="pp-close-chat" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;">✕</button>
//       </div>
//       <div id="pp-messages" style="flex:1;height:220px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f7fb;"></div>
//       <div style="padding:10px;border-top:1px solid #eee;display:flex;gap:6px;background:#fff;align-items:center;">
//         <input id="pp-input" placeholder="Ask something..." style="
//           flex:1;padding:8px 12px;border-radius:20px;
//           border:1.5px solid #c5cae9;font-size:13px;outline:none;
//         " />
//         <button id="pp-mic" title="Speak your question" style="
//           background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
//           border:none;border-radius:50%;width:36px;height:36px;
//           cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;
//           flex-shrink:0;transition:background 0.2s;
//         ">🎙️</button>
//         <button id="pp-send" style="
//           background:linear-gradient(135deg,#5c6bc0,#7c4dff);color:#fff;
//           border:none;border-radius:20px;padding:8px 14px;
//           cursor:pointer;font-size:13px;font-weight:600;flex-shrink:0;
//         ">Send</button>
//       </div>
//       <div id="pp-mic-status" style="
//         display:none;text-align:center;font-size:11px;color:#7c4dff;
//         padding:4px 0 6px;background:#fff;
//       ">🔴 Listening... speak now</div>
//     `;

//     document.body.appendChild(panel);

//     document.getElementById("pp-close-chat").onclick = () => panel.remove();

//     document.getElementById("pp-input").addEventListener("keydown", (e) => {
//       if (e.key === "Enter") document.getElementById("pp-send").click();
//     });

//     // ─── Mic / Voice Input ─────────────────────────────────────────────────
//     const micBtn = document.getElementById("pp-mic");
//     const micStatus = document.getElementById("pp-mic-status");
//     let isListening = false;

//     const SpeechRecognition =
//       window.SpeechRecognition || window.webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       micBtn.title = "Voice input not supported in this browser";
//       micBtn.style.opacity = "0.4";
//       micBtn.style.cursor = "not-allowed";
//     } else {
//       const recognition = new SpeechRecognition();
//       recognition.continuous = false;
//       recognition.interimResults = false;

//       // Use the selected language for recognition
//       recognition.lang = getLangCode(lang);

//       recognition.onstart = () => {
//         isListening = true;
//         micBtn.textContent = "⏹️";
//         micBtn.style.background = "linear-gradient(135deg,#e53935,#e91e63)";
//         micStatus.style.display = "block";
//       };

//       recognition.onresult = (e) => {
//         const transcript = e.results[0][0].transcript;
//         document.getElementById("pp-input").value = transcript;
//         // Auto-send after voice input
//         setTimeout(() => document.getElementById("pp-send").click(), 300);
//       };

//       recognition.onerror = (e) => {
//         console.warn("🎙️ Recognition error:", e.error);
//         addChatMessage(`❌ Mic error: ${e.error}. Try again.`, "bot");
//       };

//       recognition.onend = () => {
//         isListening = false;
//         micBtn.textContent = "🎙️";
//         micBtn.style.background = "linear-gradient(135deg,#5c6bc0,#7c4dff)";
//         micStatus.style.display = "none";
//       };

//       micBtn.onclick = () => {
//         if (isListening) {
//           recognition.stop();
//         } else {
//           recognition.lang = getLangCode(lang);
//           recognition.start();
//         }
//       };
//     }

//     // ─── Send button ───────────────────────────────────────────────────────
//     document.getElementById("pp-send").onclick = async () => {
//       const input = document.getElementById("pp-input");
//       const q = input.value.trim();
//       if (!q) return;
//       input.value = "";

//       addChatMessage(q, "user");
//       const thinkingId = addChatMessage("⏳ Thinking...", "bot", true);
//       const langName = getLangName(lang);

//       const res = await new Promise((resolve) => {
//         chrome.runtime.sendMessage(
//           {
//             action: "GET_AI",
//             prompt: `You are an enthusiastic AI assistant who loves giving context and insights.

// The user is browsing a webpage and asked you a question.

// Page context:
// ${getFullPageContent().slice(0, 2000)}

// User question: ${q}

// Instructions:
// - Answer in ${langName} ONLY
// - First, directly answer the question in 1-2 simple sentences in ${langName} only.
// - Then add YOUR own insight in ${langName} only — a related fact, real-world example, or interesting angle
// - Start your insight with phrases in ${langName} only like "What's interesting is...", "Fun fact:", "Think of it like...", or "My take is..."
// - Keep total response to 3-4 sentences max in ${langName} only.
// - Be friendly and conversational`,
//           },
//           resolve,
//         );
//       });

//       document.getElementById(thinkingId)?.remove();

//       if (!res || !res.success) {
//         addChatMessage("❌ AI failed. Try again.", "bot");
//         return;
//       }

//       const answer = res.text.replace(/```json|```/g, "").trim();
//       addChatMessage(answer, "bot");
//       await speak(answer, getLangCode(lang));
//     };
//   }

//   function addChatMessage(text, sender, isTemp = false) {
//     const messages = document.getElementById("pp-messages");
//     if (!messages) return null;
//     const id = "msg-" + Date.now() + Math.random().toString(36).slice(2);
//     const bubble = document.createElement("div");
//     bubble.id = id;
//     bubble.style.cssText = `
//       max-width:85%; padding:8px 12px; word-wrap:break-word;
//       border-radius:${sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
//       background:${sender === "user" ? "linear-gradient(135deg,#5c6bc0,#7c4dff)" : "#fff"};
//       color:${sender === "user" ? "#fff" : "#333"};
//       font-size:13px; line-height:1.5;
//       align-self:${sender === "user" ? "flex-end" : "flex-start"};
//       box-shadow:0 1px 4px rgba(0,0,0,0.08);
//       border:${sender === "bot" ? "1px solid #e8e8f0" : "none"};
//     `;
//     bubble.textContent = text;
//     messages.appendChild(bubble);
//     messages.scrollTop = messages.scrollHeight;
//     return id;
//   }

//   // ─── Hover Menu ───────────────────────────────────────────────────────────
//   function attachHoverMenu(lang) {
//     const menu = document.createElement("div");
//     menu.id = "pp-hover-menu";
//     menu.style.cssText = `
//       position:absolute; top:88px; left:0;
//       background:#fff; border-radius:12px;
//       box-shadow:0 6px 24px rgba(0,0,0,0.16);
//       border:1.5px solid #e0e0f0;
//       padding:6px; display:none; flex-direction:column;
//       gap:4px; min-width:160px; z-index:9999999; font-family:sans-serif;
//     `;

//     const mkBtn = (icon, label) => {
//       const btn = document.createElement("button");
//       btn.style.cssText = `
//         display:flex; align-items:center; gap:8px;
//         padding:8px 12px; border:none; background:none;
//         border-radius:8px; cursor:pointer; font-size:13px;
//         font-weight:600; color:#333; width:100%; text-align:left;
//       `;
//       btn.innerHTML = `<span>${icon}</span><span>${label}</span>`;
//       btn.onmouseenter = () => (btn.style.background = "#f0f0ff");
//       btn.onmouseleave = () => (btn.style.background = "none");
//       return btn;
//     };

//     const downloadBtn = mkBtn("📄", "Download PDF");
//     const chatBtn = mkBtn("💬", "Ask & Speak");
//     menu.appendChild(downloadBtn);
//     menu.appendChild(chatBtn);

//     downloadBtn.onclick = () => {
//       menu.style.display = "none";
//       downloadAsPDF();
//     };
//     chatBtn.onclick = () => {
//       menu.style.display = "none";
//       createChatPanel(lang);
//     };

//     const wrapper = document.createElement("div");
//     wrapper.id = "pp-avatar-wrapper";
//     wrapper.style.cssText = `position:fixed; left:20px; top:20px; width:80px; z-index:999998;`;
//     wrapper.appendChild(avatar);
//     wrapper.appendChild(menu);
//     document.body.appendChild(wrapper);

//     let hideTimeout;
//     wrapper.onmouseenter = () => {
//       clearTimeout(hideTimeout);
//       menu.style.display = "flex";
//     };
//     wrapper.onmouseleave = () => {
//       hideTimeout = setTimeout(() => {
//         menu.style.display = "none";
//       }, 350);
//     };
//   }

//   // ─── Create Avatar ────────────────────────────────────────────────────────
//   async function createAvatar(lang = "en") {
//     await waitForLottie();
//     currentLang = lang;

//     avatar = document.createElement("div");
//     avatar.style.cssText = `width:80px;height:80px;cursor:pointer;`;

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
//       console.error("❌ Lottie failed:", err);
//       avatar.textContent = "🤖";
//       avatar.style.cssText += `font-size:48px;line-height:80px;text-align:center;`;
//     }

//     attachHoverMenu(lang);
//   }

//   // ─── moveTo ───────────────────────────────────────────────────────────────
//   function moveTo(element) {
//     const wrapper = document.getElementById("pp-avatar-wrapper");
//     if (!wrapper) return;

//     const rect = element.getBoundingClientRect();
//     const top = Math.max(10, rect.top + rect.height / 2 - 40);
//     const left = Math.max(10, rect.left - 100);

//     wrapper.style.transition = "all 1s ease";
//     wrapper.style.top = top + "px";
//     wrapper.style.left = left + "px";

//     if (bounceInterval) clearInterval(bounceInterval);
//     let bounce = true;
//     bounceInterval = setInterval(() => {
//       wrapper.style.transform = bounce ? "translateY(-6px)" : "translateY(6px)";
//       bounce = !bounce;
//     }, 300);
//     setTimeout(() => {
//       clearInterval(bounceInterval);
//       wrapper.style.transform = "translateY(0)";
//     }, 1500);
//   }

//   // ─── Helpers ──────────────────────────────────────────────────────────────
//   function isBadAI(text) {
//     return !text || typeof text !== "string" || text.trim().length < 5;
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
//       console.log("🎤 Voice:", voice.name);
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

//   function scrollToElement(el) {
//     el.scrollIntoView({ behavior: "smooth", block: "center" });
//   }

//   function getFullPageContent() {
//     let content = "";
//     document.querySelectorAll("h1,h2,h3,p").forEach((el) => {
//       if (el.innerText) content += el.innerText + "\n";
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
//       const v = speechSynthesis.getVoices();
//       if (v.length) return resolve(v);
//       speechSynthesis.onvoiceschanged = () =>
//         resolve(speechSynthesis.getVoices());
//       setTimeout(() => resolve(speechSynthesis.getVoices()), 2000);
//     });
//   }

//   function getLangName(code) {
//     return fallbackNames[code] || "English";
//   }

//   // ─── AI Explanation ───────────────────────────────────────────────────────
//   async function getFullExplanation(content, sectionCount, lang) {
//     console.log("📤 Sending to background...");
//     const langName = getLangName(lang);
//     const cappedCount = Math.min(sectionCount, 6);

//     return new Promise((resolve) => {
//       chrome.runtime.sendMessage(
//         {
//           action: "GET_AI",
//           prompt: `You are an enthusiastic AI guide explaining a webpage to a curious beginner.

// For each section, do TWO things:
// 1. Explain what the section says in simple words
// 2. ADD your own thought — a fun fact, real-world example, why it matters, or your personal take

// Rules:
// - Language: ${langName} ONLY
// - Do NOT copy the original text word for word
// - Keep each part to 3-4 sentences max
// - First 2 sentences: explain the content simply
// - Last 1-2 sentences: YOUR own insight in ${langName} ONLY — start with "What I find interesting is...", "Think of it like...", "In real life this means...", or "My take is..."
// - Be conversational and engaging, like a smart friend explaining it
// - Divide into EXACTLY ${cappedCount} parts

// IMPORTANT: Output ONLY a raw JSON array of ${cappedCount} strings.
// No markdown, no code blocks, no extra text. Start with [ and end with ]

// Example: ["This section talks about X. In real life this means Y.","This part explains Z. What I find interesting is W."]

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

//   function cleanAIResponse(text) {
//     if (!text) return null;
//     try {
//       text = text.replace(/```json|```/g, "").trim();
//       const m = text.match(/\[[\s\S]*\]/);
//       if (m) text = m[0];
//       if (!text.endsWith("]")) {
//         if ((text.match(/"/g) || []).length % 2 !== 0) text += '"';
//         text += "]";
//       }
//       const parsed = JSON.parse(text);
//       if (Array.isArray(parsed) && parsed.length > 0) return parsed;
//       return null;
//     } catch {
//       const matches = text.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
//       if (matches?.length > 0) return matches.map((m) => m.slice(1, -1));
//       return null;
//     }
//   }

//   // ─── Tour ─────────────────────────────────────────────────────────────────
//   async function startTour(totalTime = 30000, useAI = true, lang = "en") {
//     const sections = document.querySelectorAll("h1, h2, h3");
//     if (!sections.length) {
//       console.warn("⚠️ No headings found");
//       return;
//     }

//     const pageContent = getFullPageContent();
//     const cappedCount = Math.min(sections.length, 6);
//     aiResponses = [];

//     let parts = null;
//     if (useAI) {
//       const raw = await getFullExplanation(pageContent, cappedCount, lang);
//       parts = cleanAIResponse(raw);
//     }

//     if (!Array.isArray(parts) || parts.length === 0) {
//       console.warn("⚠️ AI failed → fallback");
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

//       let text = parts[i];
//       if (typeof text === "object" && text !== null)
//         text = Object.values(text)[0];

//       console.log(`📢 Section ${i + 1}:`, text);
//       if (isBadAI(text)) {
//         console.warn("⚠️ Skipping invalid text");
//         continue;
//       }

//       aiResponses.push(text);
//       await speak(text, langCode);
//     }

//     console.log(
//       "✅ Tour complete! PDF ready with",
//       aiResponses.length,
//       "sections.",
//     );
//   }

//   // ─── Entry ────────────────────────────────────────────────────────────────
//   chrome.runtime.onMessage.addListener(async (req) => {
//     if (req.action === "START") {
//       const lang = req.lang || "en";
//       await createAvatar(lang);
//       startTour(req.time || 40000, req.useAI, lang);
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
  let aiResponses = []; // stores translated AI explanations (for speech)
  let englishResponses = []; // stores English AI explanations (always for PDF)
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
  // We fetch the font from the extension's own files (must be in web_accessible_resources)
  // Falls back gracefully if not available
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

  // ─── PDF Download ─────────────────────────────────────────────────────────
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

    // Title (latin only — safe with helvetica)
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
      englishResponses.forEach((item, i) => {
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

  // ─── Create Avatar ────────────────────────────────────────────────────────
  async function createAvatar(lang = "en") {
    await waitForLottie();
    currentLang = lang;

    avatar = document.createElement("div");
    avatar.style.cssText = `width:80px;height:80px;cursor:pointer;`;

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
      console.error("❌ Lottie failed:", err);
      avatar.textContent = "🤖";
      avatar.style.cssText += `font-size:48px;line-height:80px;text-align:center;`;
    }

    attachHoverMenu(lang);
  }

  // ─── moveTo ───────────────────────────────────────────────────────────────
  function moveTo(element) {
    const wrapper = document.getElementById("pp-avatar-wrapper");
    if (!wrapper) return;

    const rect = element.getBoundingClientRect();
    const top = Math.max(10, rect.top + rect.height / 2 - 40);
    const left = Math.max(10, rect.left - 100);

    wrapper.style.transition = "all 1s ease";
    wrapper.style.top = top + "px";
    wrapper.style.left = left + "px";

    if (bounceInterval) clearInterval(bounceInterval);
    let bounce = true;
    bounceInterval = setInterval(() => {
      wrapper.style.transform = bounce ? "translateY(-6px)" : "translateY(6px)";
      bounce = !bounce;
    }, 300);
    setTimeout(() => {
      clearInterval(bounceInterval);
      wrapper.style.transform = "translateY(0)";
    }, 1500);
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
- Keep each part to 3-4 sentences max
- First 2 sentences: explain the content simply
- Last 1-2 sentences: YOUR own insight in ${langName} ONLY — start with "What I find interesting is...", "Think of it like...", "In real life this means...", or "My take is..."
- Be conversational and engaging, like a smart friend explaining it
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

  async function getEnglishExplanation(content, sectionCount) {
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
- Language: English ONLY
- Do NOT copy the original text word for word
- Keep each part to 3-4 sentences max
- First 2 sentences: explain the content simply
- Last 1-2 sentences: YOUR own insight — start with "What I find interesting is...", "Think of it like...", "In real life this means...", or "My take is..."
- Be conversational and engaging, like a smart friend explaining it
- Divide into EXACTLY ${cappedCount} parts

IMPORTANT: Output ONLY a raw JSON array of ${cappedCount} strings.
No markdown, no code blocks, no extra text. Start with [ and end with ]

Example: ["This section talks about X. In real life this means Y.","This part explains Z. What I find interesting is W."]

Webpage content:
${content.slice(0, 2500)}`,
        },
        (response) => {
          if (!response || !response.success) {
            console.error("English AI error:", response?.error);
            return resolve(null);
          }
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
    englishResponses = [];

    let parts = null;
    let englishParts = null;
    const isNonEnglish = lang !== "en";

    if (useAI) {
      // Always fetch the selected-language version for speech
      const raw = await getFullExplanation(pageContent, cappedCount, lang);
      parts = cleanAIResponse(raw);

      // If non-English, also fetch English version for the PDF
      if (isNonEnglish) {
        const rawEn = await getEnglishExplanation(pageContent, cappedCount);
        englishParts = cleanAIResponse(rawEn);
      }
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

      // Store English version for PDF (fall back to translated if English fetch failed)
      const englishText =
        isNonEnglish && englishParts && englishParts[i]
          ? englishParts[i]
          : text;
      englishResponses.push(englishText);

      await speak(text, langCode);
    }

    console.log(
      "✅ Tour complete! PDF ready with",
      aiResponses.length,
      "sections.",
    );
  }

  // ─── Entry ────────────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      const lang = req.lang || "en";
      await createAvatar(lang);
      startTour(req.time || 40000, req.useAI, lang);
    }
  });
}