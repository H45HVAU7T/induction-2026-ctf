const DOMAIN = "http://localhost:3002";
const LOGIN_ENDPOINT = DOMAIN + "/login";
const CHALLENGE_ENDPOINT = DOMAIN + "/challenge";
const SESSION_KEY = "cipherRelayUserId";
const COMPLETED_KEY = "cipherRelayCompleted";
const TIMER_KEY_PREFIX = "cipherRelayChallengeStartedAt:";

const challenges = {
  "challenge-1": "startup",
  "challenge-2": "hacker",
  "challenge-3": "safe",
  "challenge-4": "number",
  "challenge-5": "hashvault",
};

const getUserId = () => localStorage.getItem(SESSION_KEY);
const timerKey = (userId, challengeId) =>
  `${TIMER_KEY_PREFIX}${userId}:${challengeId}`;
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
  if (getUserId()) window.location.replace("challenge-1.html");
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
    console.log("Hello");
    const response = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name, email }),
    });
    const data = await readResponse(response);
    console.log("data", data);
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
    window.location.replace("challenge-1.html");
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
  if (!userId) window.location.replace("index.html");
  else startChallengeTimer(userId, page.dataset.challengeId);
  answerForm.addEventListener("submit", submitChallenge);
}
