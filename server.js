const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Game state
let players = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Initialize new player
  players[socket.id] = {
    id: socket.id,
    x: Math.random() * 700 + 50,
    y: Math.random() * 500 + 50,
    name: "Ninja" + Math.floor(Math.random() * 1000),
    health: 100,
  };

  // Send init data to player
  socket.emit("init", socket.id, players);

  // Broadcast updated state
  io.emit("update", players);

  // Handle movement
  socket.on("move", (movement) => {
    const speed = 3;
    let p = players[socket.id];
    if (!p) return;
    if (movement.up) p.y -= speed;
    if (movement.down) p.y += speed;
    if (movement.left) p.x -= speed;
    if (movement.right) p.x += speed;

    // Boundaries
    p.x = Math.max(0, Math.min(780, p.x));
    p.y = Math.max(0, Math.min(580, p.y));
  });

  // Handle action (attack/heal/fix)
  socket.on("action", () => {
    let p = players[socket.id];
    if (!p) return;
    console.log(`${p.name} used action!`);
    // Example: heal self
    p.health = Math.min(100, p.health + 10);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    delete players[socket.id];
    io.emit("update", players);
  });
});

// Broadcast game state 30 fps
setInterval(() => {
  io.emit("update", players);
}, 1000 / 30);

http.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});