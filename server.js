const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

// ===== DEFAULT ROOM (easy to remove) =====
// Just comment this block for final production
rooms["lobby"] = {
  players: {},
  spectators: [],
  usernames: {},
  board: ["", "", "", "", "", "", "", "", ""],
  turn: "X",
  over: false,
};
// ========================================

// WIN LINES
const winLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinData(board) {
  for (let i = 0; i < winLines.length; i++) {
    const [a, b, c] = winLines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

// =============================
// ROOM DELETE TIMER FUNCTION
// =============================
function scheduleRoomDeletion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.deleteTimer) return; // Already scheduled

  room.deleteTimer = setTimeout(() => {
    const current = rooms[roomCode];
    if (!current) return;

    const noPlayers = !current.players.X && !current.players.O;
    const noSpectators = current.spectators.length === 0;

    if (noPlayers && noSpectators) {
      console.log("Deleting empty room:", roomCode);
      delete rooms[roomCode];
    } else {
      // Someone rejoined before timeout
      current.deleteTimer = null;
    }
  }, 2 * 60 * 1000); // 2 minutes
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // =============== ROOM LIST REQUEST ===============
  socket.on("getRooms", () => {
    socket.emit("roomList", Object.keys(rooms));
  });

  // =============== JOIN ROOM ===============
  socket.on("joinRoom", ({ roomCode, username }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: {},
        spectators: [],
        usernames: {},
        board: ["", "", "", "", "", "", "", "", ""],
        turn: "X",
        over: false,
        deleteTimer: null,
      };
    }

    const room = rooms[roomCode];

    // If room had a delete timer because it was empty, cancel it
    if (room.deleteTimer) {
      clearTimeout(room.deleteTimer);
      room.deleteTimer = null;
    }

    room.usernames[socket.id] = username;

    // assign X or O
    let symbol = "";
    if (!room.players.X) {
      room.players.X = socket.id;
      symbol = "X";
    } else if (!room.players.O) {
      room.players.O = socket.id;
      symbol = "O";
    } else {
      room.spectators.push(socket.id);
      socket.emit("spectator");
      socket.join(roomCode);
      io.to(roomCode).emit("update", room);
      return;
    }

    socket.join(roomCode);
    socket.emit("symbol", symbol);
    io.to(roomCode).emit("update", room);
  });

  // =============== PLAY MOVE ===============
  socket.on("play", ({ roomCode, index }) => {
    const room = rooms[roomCode];
    if (!room || room.over) return;

    const symbol =
      room.players.X === socket.id
        ? "X"
        : room.players.O === socket.id
        ? "O"
        : "";

    if (symbol !== room.turn) return;
    if (room.board[index] !== "") return;

    // Make move
    room.board[index] = symbol;

    // Immediately update board so final move shows
    io.to(roomCode).emit("update", room);

    // Check win
    const winData = getWinData(room.board);
    if (winData) {
      room.over = true;
      io.to(roomCode).emit("gameOver", winData);
      return;
    }

    // Check draw
    if (!room.board.includes("")) {
      room.over = true;
      io.to(roomCode).emit("gameOver", { winner: "draw", line: [] });
      return;
    }

    // Switch turns
    room.turn = room.turn === "X" ? "O" : "X";
  });

  // =============== RESTART ===============
  socket.on("restart", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.board = ["", "", "", "", "", "", "", "", ""];
    room.turn = "X";
    room.over = false;

    io.to(roomCode).emit("update", room);
  });

  // =============== DISCONNECT ===============
  socket.on("disconnect", () => {
    for (const r in rooms) {
      const room = rooms[r];
      if (!room) continue;

      // Remove player/spectator
      if (room.players.X === socket.id) delete room.players.X;
      if (room.players.O === socket.id) delete room.players.O;
      room.spectators = room.spectators.filter((s) => s !== socket.id);
      delete room.usernames[socket.id];

      // AUTO RESET when both players gone
      if (!room.players.X && !room.players.O) {
        room.board = ["", "", "", "", "", "", "", "", ""];
        room.turn = "X";
        room.over = false;
        io.to(r).emit("update", room);
      }

      io.to(r).emit("update", room);

      // AUTO DELETE if room empty
      const noPlayers = !room.players.X && !room.players.O;
      const noSpectators = room.spectators.length === 0;

      if (noPlayers && noSpectators) {
        scheduleRoomDeletion(r);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server on " + PORT));
