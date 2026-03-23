let avatar;
const script = document.createElement("script");
script.src = "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js";
document.head.appendChild(script);

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

function moveTo(element) {
  const rect = element.getBoundingClientRect();

  const top = window.scrollY + rect.top;
  const left = rect.left - 70;

  avatar.style.top = top + "px";
  avatar.style.left = left + "px";
}

function scrollToElement(element) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "center"
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
    const text = "This section talks about " + el.innerText;

    // speak + wait
    await speak(text, timePerSection);
  }
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "START") {
    createAvatar();
    startTour(40000); // total tour time (40 sec)
  }
});