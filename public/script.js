const socket = io(); // Remove hardcoded URL, or use your actual URL

let currentRoom = ""; // Track which room user is in

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
  if (msg !== "" && currentRoom) {
    socket.emit("roomMessage", { roomCode: currentRoom, msg });
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

// =============== GAME ROOM JOINING ===============
// Call this when user joins a room
function joinGameRoom(roomCode, username) {
  currentRoom = roomCode;
  socket.emit("joinRoom", { roomCode, username });

  // Clear chat when joining new room
  if (roomMessages) {
    roomMessages.innerHTML = "";
  }
}

// Example: If you have a join button
// document.getElementById("joinBtn").addEventListener("click", () => {
//   const roomCode = document.getElementById("roomCodeInput").value;
//   const username = document.getElementById("usernameInput").value;
//   joinGameRoom(roomCode, username);
// });

// =============== GAME LOGIC (Keep your existing game code) ===============
// Your existing socket.on("symbol"), socket.on("update"), etc.
