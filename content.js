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

      const words = text.split(" ").length;
      const estimatedTime = (words / 2.5) * 1000;

      speech.rate = estimatedTime > maxDuration ? 1.5 : 1;

      speech.onend = resolve;

      speechSynthesis.speak(speech);

      setTimeout(() => {
        speechSynthesis.cancel();
        resolve();
      }, maxDuration);
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

  async function startTour(totalTime = 30000, useAI = true) {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) return;

    const pageContent = getFullPageContent();

    let fullExplanation = null;

    if (useAI) {
      fullExplanation = await getFullExplanation(pageContent, sections.length);
    }

    let parts = [];

    try {
      parts = JSON.parse(fullExplanation);
    } catch {
      console.warn("⚠️ AI parse failed, fallback mode");
    }

    const timePerSection = totalTime / sections.length;

    for (let i = 0; i < sections.length; i++) {
      const el = sections[i];

      scrollToElement(el);
      await new Promise((r) => setTimeout(r, 800));

      moveTo(el);
      el.style.background = "yellow";

      let text = parts[i] || getSectionContent(el);

      await speak(text, timePerSection);
    }
  }

  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      await createAvatar();
      startTour(req.time || 40000);
    }
  });
}
