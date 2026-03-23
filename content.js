let avatar;
let bounceInterval;
let lottieInstance;

function createAvatar() {
  avatar = document.createElement("div");

  avatar.style.position = "absolute";
  avatar.style.width = "80px";
  avatar.style.height = "80px";
  avatar.style.zIndex = "9999";

  document.body.appendChild(avatar);

  // Load Lottie after script is ready
  setTimeout(() => {
    lottieInstance = lottie.loadAnimation({
      container: avatar,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: chrome.runtime.getURL("AIbot.json"), // your Lottie file
    });
  }, 500);
}

function speak(text, duration) {
  return new Promise((resolve) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;

    speech.onend = resolve;
    speechSynthesis.speak(speech);

    // fallback in case speech fails
    setTimeout(resolve, duration);
  });
}

function getSectionContent(heading) {
  let content = heading.innerText + ". ";

  let next = heading.nextElementSibling;

  while (next && !/^H[1-3]$/.test(next.tagName)) {
    content += next.innerText + " ";
    next = next.nextElementSibling;
  }

  return content.slice(0, 2000); // limit size
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

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "START") {
    createAvatar();
    startTour(req.time || 40000);
  }
});
