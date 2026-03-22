let avatar;
const script=document.createElement("script");
script.src="";
document.head.appendChild(script);

function createAvatar() {
  avatar = document.createElement("div");
  avatar.innerText = "🤖";

  avatar.style.position = "absolute";
  avatar.style.fontSize = "40px";
  avatar.style.zIndex = "9999";

  document.body.appendChild(avatar);
}

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 1;
  speechSynthesis.speak(speech);
}

function moveTo(element) {
  const rect = element.getBoundingClientRect();

  avatar.style.top = window.scrollY + rect.top + "px";
  avatar.style.left = rect.left - 60 + "px";
}

function startTour() {
  const sections = document.querySelectorAll("h1, h2, h3");

  let i = 0;

  function next() {
    if (i >= sections.length) return;

    const el = sections[i];

    moveTo(el);

    speak("This section talks about " + el.innerText);

    i++;
    setTimeout(next, 4000);
  }

  next();
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "START") {
    createAvatar();
    startTour();
  }
});