let avatar;
const script = document.createElement("script");
script.src = "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js";
document.head.appendChild(script);

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
      path: chrome.runtime.getURL("avatar.json") // your Lottie file
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