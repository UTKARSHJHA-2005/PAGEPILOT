let avatar;
let bounceInterval;
let lottieInstance;

const script = document.createElement("script");
script.src = chrome.runtime.getURL("lottie.min.js");
document.head.appendChild(script);
if (window.__AI_AVATAR_RUNNING__) {
  console.log("⚠️ Already running");
} else {
  window.__AI_AVATAR_RUNNING__ = true;
  async function createAvatar() {
    await waitForLottie(); // ✅ WAIT FIRST

    avatar = document.createElement("div");

    avatar.style.position = "fixed";
    avatar.style.bottom = "20px";
    avatar.style.left = "20px";
    avatar.style.width = "80px";
    avatar.style.height = "80px";
    avatar.style.zIndex = "999999";

    document.body.appendChild(avatar);

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
  }

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

  function speak(text, maxDuration) {
    return new Promise((resolve) => {
      speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(text);

      // dynamic speed based on time
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

    return content.slice(0, 3000);
  }

  function moveTo(element) {
    const rect = element.getBoundingClientRect();

    const top = window.scrollY + rect.top;
    const left = rect.left - 90;

    avatar.style.transition = "all 1.5s linear";

    avatar.style.top = top + "px";
    avatar.style.left = left + "px";

    // CLEAR previous interval
    if (bounceInterval) clearInterval(bounceInterval);

    let bounce = true;

    bounceInterval = setInterval(() => {
      avatar.style.transform = bounce
        ? "translateY(-10px)"
        : "translateY(10px)";
      bounce = !bounce;
    }, 300);

    // stop after movement
    setTimeout(() => {
      clearInterval(bounceInterval);
      avatar.style.transform = "translateY(0px)";
    }, 1500);
  }

  function getFullPageContent() {
    const elements = document.querySelectorAll("h1, h2, h3, p");

    let content = "";

    elements.forEach((el) => {
      if (el.innerText) {
        content += el.innerText + "\n";
      }
    });

    return content.slice(0, 5000); // limit
  }

  async function getFullExplanation(content, retries = 2) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer ",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: `
Divide this webpage into ${sections.length} sections.
Return ONLY JSON like:

["section1 explanation", "section2 explanation", ...]

Content:
${content}
            `,
            },
          ],
        }),
      });

      if (res.status === 429) {
        if (retries > 0) {
          console.warn("⏳ Rate limited. Retrying...");
          await new Promise((r) => setTimeout(r, 2000)); // wait 2 sec
          return getFullExplanation(content, retries - 1);
        } else {
          throw new Error("Rate limit exceeded");
        }
      }

      const data = await res.json();

      if (!data.choices) throw new Error("No response");

      return data.choices[0].message.content;
    } catch (err) {
      console.error("AI error:", err);
      return "Unable to generate explanation.";
    }
  }

  function scrollToElement(element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  async function startTour(totalTime = 30000) {
    const sections = document.querySelectorAll("h1, h2, h3");
    if (!sections.length) return;

    const pageContent = getFullPageContent();

    let fullExplanation = await getFullExplanation(pageContent);

    const timePerSection = totalTime / sections.length;

    for (let i = 0; i < sections.length; i++) {
      const el = sections[i];

      scrollToElement(el);
      await new Promise((r) => setTimeout(r, 1000));

      moveTo(el);
      el.style.background = "yellow";

      let text;

      if (fullExplanation) {
        const parts = fullExplanation.split("\n");
        text = parts[i] || el.innerText;
      } else {
        // 🔥 FALLBACK MODE (NO AI)
        text = getSectionContent(el);
      }

      await speak(text, timePerSection);
    }
  }

  chrome.runtime.onMessage.addListener(async (req) => {
    if (req.action === "START") {
      await createAvatar();
      startTour(req.time || 40000, req.useAI);
    }
  });
}
