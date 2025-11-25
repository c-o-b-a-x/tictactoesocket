const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// serve static files for client
app.use(express.static(path.join(__dirname, "public")));

const rooms = {};
/*
rooms = {
  roomCode: {
    players: { X: socketID, O: socketID },
    board: ["","","","","","","","",""],
    turn: "X",
    gameOver: false
  }
}
*/

function checkWin(b) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b2, c] of wins) {
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) {
      return b[a];
    }
  }
  return null;
}

io.on("connection", (socket) => {
  console.log("User entered:", socket.id);

  socket.on("joinRoom", (roomCode) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: {},
        board: ["", "", "", "", "", "", "", "", ""],
        turn: "X",
        gameOver: false,
      };
    }

    const room = rooms[roomCode];

    // assign symbol
    let symbol = "";
    if (!room.players.X) {
      room.players.X = socket.id;
      symbol = "X";
    } else if (!room.players.O) {
      room.players.O = socket.id;
      symbol = "O";
    } else {
      socket.emit("full");
      return;
    }

    socket.join(roomCode);
    socket.emit("symbol", symbol);
    io.to(roomCode).emit("update", room);
  });

  socket.on("play", ({ roomCode, index }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;

    // Check if its player's turn
    const symbol =
      room.players.X === socket.id
        ? "X"
        : room.players.O === socket.id
        ? "O"
        : "";

    if (symbol !== room.turn) return;
    if (room.board[index] !== "") return;

    room.board[index] = symbol;

    // check win
    const winner = checkWin(room.board);
    if (winner) {
      room.gameOver = true;
      io.to(roomCode).emit("gameOver", { winner });
      return;
    }

    // check draw
    if (!room.board.includes("")) {
      room.gameOver = true;
      io.to(roomCode).emit("gameOver", { winner: "draw" });
      return;
    }

    // switch turn
    room.turn = room.turn === "X" ? "O" : "X";

    io.to(roomCode).emit("update", room);
  });

  socket.on("restart", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.board = ["", "", "", "", "", "", "", "", ""];
    room.turn = "X";
    room.gameOver = false;

    io.to(roomCode).emit("update", room);
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      if (room.players.X === socket.id) delete room.players.X;
      if (room.players.O === socket.id) delete room.players.O;
      io.to(roomCode).emit("update", room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on " + PORT));
