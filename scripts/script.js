//global variables

let worktime = 25 * 60;
let breaktime = 5 * 60;
let timerInterval;
let isRunning = false;
let timeLeft = worktime;

//DOM Elements

const sessionLabel = document.getElementById("session-label");
const timeLeftDisplay = document.getElementById("time-left");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const resetBtn = document.getElementById("reset-btn");

//Audio element for the alarm sound

const alarmSound = new Audio("/assets/alarm-sound.mp3");

//Function to format time left minutes:seconds
function formatTime(time) {
  let minutes = Math.floor(time / 60);
  let seconds = time % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

//Function to update time left display
function updateTimer() {
  timeLeftDisplay.textContent = formatTime(timeLeft);
}

//Function to start timer
function startTimer() {
  if (!isRunning) {
    isRunning = true;
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimer();

      if (timeLeft === 0) {
        //Time is up, check if it's work session or break
        if (sessionLabel.textContent === "Work Session") {
          sessionLabel.textContent = "Break Session";
          timeLeft = breaktime;
        } else {
          sessionLabel.textContent = "Work Session";
          timeLeft = worktime;
        }

        alarmSound.play();

        // Show notification
        if (Notification.permission === "granted") {
          new Notification("Timer Finished", {
            body: "The timer has finished.",
          });
        }
      }
    }, 1000);
  }
}

//Function to pause timer
function pauseTimer() {
  if (isRunning) {
    isRunning = false;
    clearInterval(timerInterval);
  }
}

//Function to stop timer
function stopTimer() {
  pauseTimer();
  timeLeft = worktime;
  sessionLabel.textContent = "Work Session";
  updateTimer();
}

//function to reset timer
function resetTimer() {
  stopTimer();
  timeLeft = worktime;
}

//Event listeners to buttons
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
stopBtn.addEventListener("click", stopTimer);
resetBtn.addEventListener("click", resetTimer);

//initialize the timer
updateTimer();

//Request permission for notifications
if (Notofication.permission !== "granted") {
  Notification.requestPermission();
}
