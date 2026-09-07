const DOMAIN = "https://introdayserver.onrender.com";
const LOGIN_ENDPOINT = DOMAIN + "/login";
const CHALLENGE_ENDPOINT = DOMAIN + "/challenge";
const SESSION_KEY = "cipherRelayUserId";
const COMPLETED_KEY = "cipherRelayCompleted";
const TIMER_KEY_PREFIX = "cipherRelayChallengeStartedAt:";

const challenges = {
  kx7qm2: "startup",
  a9f3zb: "hacker",
  p4w8ne: "safe",
  t2v6yc: "number",
  m5h1qd: "hashvault",
};

const challengePages = {
  kx7qm2: "kx7qm2.html",
  a9f3zb: "a9f3zb.html",
  p4w8ne: "p4w8ne.html",
  t2v6yc: "t2v6yc.html",
  m5h1qd: "m5h1qd.html",
};

const CHALLENGE_ORDER = Object.keys(challengePages);
const FIRST_SECOND_HALF_CHALLENGE = "p4w8ne";
const SECOND_HALF_UNLOCKED = true;

const getUserId = () => localStorage.getItem(SESSION_KEY);
const timerKey = (userId, challengeId) =>
  `${TIMER_KEY_PREFIX}${userId}:${challengeId}`;

function getCompletedChallenges() {
  try {
    const completed = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]");
    return Array.isArray(completed) ? completed : [];
  } catch {
    return [];
  }
}

function resolveResumePage() {
  const completed = getCompletedChallenges();
  for (const challengeId of CHALLENGE_ORDER) {
    if (completed.includes(challengeId)) continue;
    if (challengeId === FIRST_SECOND_HALF_CHALLENGE && !SECOND_HALF_UNLOCKED)
      return "standby.html";
    return challengePages[challengeId];
  }
  return "complete.html";
}

function enforceChallengeAccess(challengeId) {
  if (!getUserId()) {
    window.location.replace("index.html");
    return false;
  }
  const expectedPage = resolveResumePage();
  if (challengePages[challengeId] !== expectedPage) {
    window.location.replace(expectedPage);
    return false;
  }
  return true;
}

function enforceStaticPageAccess(selfPage) {
  if (!getUserId()) {
    window.location.replace("index.html");
    return;
  }
  const resumePage = resolveResumePage();
  if (resumePage !== selfPage) window.location.replace(resumePage);
}

const feedbackText = (element, text, type = "") => {
  element.textContent = text;
  element.className = type;
};

function responseMessage(data, fallback) {
  return data?.message || data?.error || data?.detail || fallback;
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

function redirectIfLoggedIn() {
  if (getUserId()) window.location.replace(resolveResumePage());
}

function startChallengeTimer(userId, challengeId) {
  const key = timerKey(userId, challengeId);
  if (!localStorage.getItem(key)) localStorage.setItem(key, String(Date.now()));
}

function getChallengeTimeCompleted(userId, challengeId) {
  const startedAt = Number(localStorage.getItem(timerKey(userId, challengeId)));
  const elapsedMs = Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
  return Math.max(1, Math.ceil(elapsedMs / 1000));
}

function clearChallengeTimer(userId, challengeId) {
  localStorage.removeItem(timerKey(userId, challengeId));
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.getElementById("feedback");
  const button = document.getElementById("login-btn");
  const name = form.name.value.trim();
  const email = form.email.value.trim();

  if (!name || !email || !form.email.validity.valid) {
    feedbackText(feedback, "Enter a valid name and email address.", "error");
    return;
  }

  button.disabled = true;
  feedbackText(feedback, "REGISTERING IDENTITY...");
  try {
    const response = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name, email }),
    });
    const data = await readResponse(response);
    if (!response.ok) {
      const duplicate = response.status === 409;
      feedbackText(
        feedback,
        duplicate
          ? "This name/email is already registered. Use the login details that created that entry, or contact the organizer."
          : responseMessage(data, "Unable to register. Please try again."),
        "error",
      );
      button.disabled = false;
      return;
    }

    const id =
      data.id ??
      data.userId ??
      data.user_id ??
      (typeof data === "string" || typeof data === "number" ? data : null);
    if (id === undefined || id === null)
      throw new Error("The server did not return a user id.");
    localStorage.setItem(SESSION_KEY, String(id));
    localStorage.removeItem(COMPLETED_KEY);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(TIMER_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
    window.location.replace(resolveResumePage());
  } catch (error) {
    feedbackText(
      feedback,
      error.message === "The server did not return a user id."
        ? error.message
        : "Network error. Check your connection and try again.",
      "error",
    );
    button.disabled = false;
  }
}

async function submitChallenge(event) {
  event.preventDefault();
  const page = document.querySelector(".challenge-page");
  const input = page.querySelector(".answer-input");
  const feedback = page.querySelector(".feedback");
  const button = page.querySelector("button");
  const challengeId = page.dataset.challengeId;
  const userId = getUserId();

  if (!userId) {
    window.location.replace("index.html");
    return;
  }
  if (input.value.trim().toLowerCase() !== challenges[challengeId]) {
    feedbackText(feedback, "ACCESS DENIED. INVALID DECRYPTION KEY.", "error");
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
    return;
  }

  button.disabled = true;
  feedbackText(feedback, "TRANSMITTING SCORE...");
  const timeCompleted = getChallengeTimeCompleted(userId, challengeId);
  try {
    const response = await fetch(CHALLENGE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, challengeId, timeCompleted }),
    });
    const data = await readResponse(response);

    if (
      response.ok ||
      (response.status === 409 &&
        /already|resubmit|submitted|complete/i.test(responseMessage(data, "")))
    ) {
      const completed = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]");
      if (!completed.includes(challengeId)) completed.push(challengeId);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
      clearChallengeTimer(userId, challengeId);
      feedbackText(
        feedback,
        response.ok
          ? "ACCESS GRANTED. LOADING NEXT PAYLOAD..."
          : "ALREADY SUBMITTED. LOADING NEXT PAYLOAD...",
        "success",
      );
      setTimeout(() => window.location.replace(page.dataset.next), 500);
      return;
    }

    feedbackText(
      feedback,
      response.status === 409
        ? "This challenge has already been submitted or cannot be resubmitted."
        : responseMessage(
            data,
            "The score could not be recorded. Please try again.",
          ),
      "error",
    );
    button.disabled = false;
  } catch {
    feedbackText(
      feedback,
      "Network error. Your answer was not recorded. Please try again.",
      "error",
    );
    button.disabled = false;
  }
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  redirectIfLoggedIn();
  loginForm.addEventListener("submit", login);
}

const answerForm = document.querySelector(".answer-form");
if (answerForm) {
  const userId = getUserId();
  const page = document.querySelector(".challenge-page");
  if (enforceChallengeAccess(page.dataset.challengeId))
    startChallengeTimer(userId, page.dataset.challengeId);
  answerForm.addEventListener("submit", submitChallenge);
}

if (document.querySelector("[data-page='standby']"))
  enforceStaticPageAccess("standby.html");

if (document.querySelector("[data-page='complete']"))
  enforceStaticPageAccess("complete.html");
