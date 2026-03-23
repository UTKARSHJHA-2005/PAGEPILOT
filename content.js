let avatar;
let bounceInterval;
let lottieInstance;

async function createAvatar() {
  avatar = document.createElement("div");

  avatar.style.position = "fixed";
  avatar.style.bottom = "20px";
  avatar.style.left = "20px";
  avatar.style.width = "80px";
  avatar.style.height = "80px";
  avatar.style.zIndex = "999999";

  document.body.appendChild(avatar);

  try {
    if (typeof lottie === "undefined") {
      console.error("❌ Lottie not loaded. Check manifest!");
      return;
    }
    const url = chrome.runtime.getURL("AIbot.json");
    console.log("Fetching:", url);

    const res = await fetch(url);
    const animationData = await res.json();

    lottieInstance = lottie.loadAnimation({
      container: avatar,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animationData, // ✅ IMPORTANT FIX
    });
  } catch (err) {
    console.error("Lottie load failed:", err);
  }
}

function speak(text, maxDuration) {
  return new Promise((resolve) => {
    speechSynthesis.cancel(); // stop previous

    const speech = new SpeechSynthesisUtterance(text);

    // adjust speed dynamically
    speech.rate = text.length > 500 ? 1.2 : 1;

    speech.onend = resolve;

    speechSynthesis.speak(speech);

    // force stop if exceeds time
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

  return content.trim().slice(0, 3000);
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
    avatar.style.transform = bounce ? "translateY(-10px)" : "translateY(10px)";
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

async function getAIExplanation(text) {
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
            content: `Explain this in a clear, engaging way like a teacher:\n${text}`,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!data.choices) throw new Error("No response");

    return data.choices[0].message.content;
  } catch (err) {
    console.error(err);
    return "This section is about " + text; // fallback
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

  const timePerSection = totalTime / sections.length;

  for (let i = 0; i < sections.length; i++) {
    const el = sections[i];

    // scroll to section
    scrollToElement(el);

    await new Promise((r) => setTimeout(r, 1000));

    // move avatar
    moveTo(el);
    el.style.background = "yellow";
    const sectionText = getSectionContent(el);
    const aiText = await getAIExplanation(sectionText);
    await speak(aiText, timePerSection);
  }
}

chrome.runtime.onMessage.addListener(async (req) => {
  if (req.action === "START") {
    await createAvatar(); // ✅ WAIT for avatar
    startTour(req.time || 40000);
  }
});
