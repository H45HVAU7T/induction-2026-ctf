const levels = [
    {
        prompt: "LEVEL 1: Decode the Base64 transmission.<br><br><code>U3RhcnR1cA==</code><br><span style='font-size:0.8rem; color:#537a63;'>Hint: Use an online Base64 decoder.</span>",
        answer: "startup"
    },
    {
        prompt: "LEVEL 2: Shift cipher detected (Shift -3).<br><br><code>Kdqgduh</code><br><span style='font-size:0.8rem; color:#537a63;'>Hint: Move each letter back by 3 in the alphabet.</span>",
        answer: "hacker"
    },
    {
        prompt: "LEVEL 3: Binary sequence conversion required.<br><br><code>01110011 01100001 01100110 01100101</code><br><span style='font-size:0.8rem; color:#537a63;'>Hint: Convert 8-bit binary blocks to ASCII characters.</span>",
        answer: "safe"
    },
    {
        prompt: "LEVEL 4: Reverse the hexadecimal payload.<br><br><code>7265626d756e</code><br><span style='font-size:0.8rem; color:#537a63;'>Hint: Convert hex pairs to text.</span>",
        answer: "number"
    },
    {
        prompt: "LEVEL 5: Final Security Pass. What is the official name of this club?<br><br><code>SGFzaFdvcmxk</code><br><span style='font-size:0.8rem; color:#537a63;'>Hint: Base64 decode the club's name.</span>",
        answer: "hashvault"
    }
];

let currentLevelIndex = 0;
let timeLeft = 600;
let timerInterval;

const challengeContainer = document.getElementById('challenge-container');
const userInput = document.getElementById('user-input');
const feedback = document.getElementById('feedback');
const currentLevelSpan = document.getElementById('current-level');
const timeLeftSpan = document.getElementById('time-left');
const gameBox = document.getElementById('game-box');
const winScreen = document.getElementById('win-screen');
const finalTimeSpan = document.getElementById('final-time');

function initGame() {
    loadLevel();
    startTimer();
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("TIME EXPIRED. CONNECTION TERMINATED.");
            location.reload();
        }
    }, 1000);
}

function loadLevel() {
    if (currentLevelIndex < levels.length) {
        challengeContainer.innerHTML = levels[currentLevelIndex].prompt;
        currentLevelSpan.textContent = currentLevelIndex + 1;
        userInput.value = "";
        feedback.textContent = "";
    } else {
        clearInterval(timerInterval);
        gameBox.classList.add('hidden');
        winScreen.classList.remove('hidden');
        finalTimeSpan.textContent = 600 - timeLeft;
    }
}

function verifyAnswer() {
    const val = userInput.value.trim().toLowerCase();
    if (val === levels[currentLevelIndex].answer) {
        feedback.textContent = "ACCESS GRANTED. LOADING NEXT PAYLOAD...";
        feedback.className = "success";
        currentLevelIndex++;
        setTimeout(loadLevel, 1000);
    } else {
        feedback.textContent = "ACCESS DENIED. INVALID DECRYPTION KEY.";
        feedback.className = "error";
        userInput.style.transform = "translateX(5px)";
        setTimeout(() => userInput.style.transform = "translateX(0)", 100);
    }
}

userInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        verifyAnswer();
    }
});

initGame();