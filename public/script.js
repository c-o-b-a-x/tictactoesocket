// This script.js assumes socket is already initialized in the HTML
// and that roomCode variable exists in the global scope

// =============== CHAT FUNCTIONALITY ===============
const roomInput = document.getElementById("roomInput");
const roomBtn = document.getElementById("roomSendBtn");
const roomMessages = document.getElementById("roomMessages");

// Send message button
if (roomBtn) {
  roomBtn.addEventListener("click", () => {
    sendMessage();
  });
}

// Send message on Enter key
if (roomInput) {
  roomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

function sendMessage() {
  const msg = roomInput.value.trim();

  // Use the global roomCode variable from index.html
  if (msg !== "" && window.roomCode) {
    socket.emit("roomMessage", { roomCode: window.roomCode, msg });
    roomInput.value = "";
  }
}

// Receive messages
socket.on("roomMessage", ({ username, message, socketId }) => {
  if (!roomMessages) return;

  const li = document.createElement("li");

  // Style your own messages differently
  if (socketId === socket.id) {
    li.innerHTML = `<strong>You:</strong> ${message}`;
    li.style.color = "#0084ff";
  } else {
    li.innerHTML = `<strong>${username}:</strong> ${message}`;
  }

  roomMessages.appendChild(li);
  roomMessages.scrollTop = roomMessages.scrollHeight;
});
