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

// WIN LINES (client will animate)
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
        players: {}, // X, O
        spectators: [], // infinite
        usernames: {}, // socketID -> username
        board: ["", "", "", "", "", "", "", "", ""],
        turn: "X",
        over: false,
      };
    }

    const room = rooms[roomCode];
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

    let symbol =
      room.players.X === socket.id
        ? "X"
        : room.players.O === socket.id
        ? "O"
        : "";

    if (symbol !== room.turn) return;
    if (room.board[index] !== "") return;

    room.board[index] = symbol;

    const winData = getWinData(room.board);
    if (winData) {
      room.board[index] = symbol;

      room.over = true;

      io.to(roomCode).emit("gameOver", winData);
      return;
    }

    if (!room.board.includes("")) {
      room.over = true;
      io.to(roomCode).emit("gameOver", { winner: "draw", line: [] });
      return;
    }

    room.turn = room.turn === "X" ? "O" : "X";
    io.to(roomCode).emit("update", room);
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

  socket.on("disconnect", () => {
    for (const r in rooms) {
      const room = rooms[r];
      if (!room) continue;

      if (room.players.X === socket.id) delete room.players.X;
      if (room.players.O === socket.id) delete room.players.O;

      room.spectators = room.spectators.filter((s) => s !== socket.id);
      delete room.usernames[socket.id];

      io.to(r).emit("update", room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server on " + PORT));
