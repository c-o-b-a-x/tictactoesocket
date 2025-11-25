const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// For Render: allow CORS automatically
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// serve client files
app.use(express.static(path.join(__dirname, "public")));

let players = {};
let board = ["", "", "", "", "", "", "", "", ""];
let currentTurn = "X";

// --- socket logic ---
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Assign symbol
  if (!players.X) players.X = socket.id;
  else if (!players.O) players.O = socket.id;
  else {
    socket.emit("full");
    return;
  }

  if (players.X === socket.id) socket.emit("symbol", "X");
  if (players.O === socket.id) socket.emit("symbol", "O");

  socket.emit("boardUpdate", { board, currentTurn });

  socket.on("play", (i) => {
    if (players[currentTurn] !== socket.id) return;
    if (board[i] !== "") return;

    board[i] = currentTurn;
    currentTurn = currentTurn === "X" ? "O" : "X";

    io.emit("boardUpdate", { board, currentTurn });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);

    if (players.X === socket.id) delete players.X;
    if (players.O === socket.id) delete players.O;

    board = ["", "", "", "", "", "", "", "", ""];
    currentTurn = "X";
    io.emit("boardUpdate", { board, currentTurn });
  });
});

// --- IMPORTANT for Render ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on " + PORT));
