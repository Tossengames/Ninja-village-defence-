const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let players = {};
let selfId = null;
let movement = { up: false, down: false, left: false, right: false };

// Receive init
socket.on("init", (id, serverPlayers) => {
  selfId = id;
  players = serverPlayers;
});

// Receive updates
socket.on("update", (serverPlayers) => {
  players = serverPlayers;
});

// Send movement to server
setInterval(() => {
  socket.emit("move", movement);
}, 1000 / 30);

// Keyboard input
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") movement.up = true;
  if (e.key === "ArrowDown" || e.key === "s") movement.down = true;
  if (e.key === "ArrowLeft" || e.key === "a") movement.left = true;
  if (e.key === "ArrowRight" || e.key === "d") movement.right = true;
  if (e.key === " " || e.key === "Enter") socket.emit("action");
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") movement.up = false;
  if (e.key === "ArrowDown" || e.key === "s") movement.down = false;
  if (e.key === "ArrowLeft" || e.key === "a") movement.left = false;
  if (e.key === "ArrowRight" || e.key === "d") movement.right = false;
});

// Touch input
const btns = document.querySelectorAll(".btn[data-dir]");
btns.forEach(btn => {
  btn.addEventListener("touchstart", () => {
    movement[btn.dataset.dir] = true;
  });
  btn.addEventListener("touchend", () => {
    movement[btn.dataset.dir] = false;
  });
});

document.getElementById("actionBtn").addEventListener("touchstart", () => {
  socket.emit("action");
});

// Draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let id in players) {
    let p = players[id];
    ctx.fillStyle = id === selfId ? "lime" : "red";
    ctx.fillRect(p.x, p.y, 20, 20);

    ctx.fillStyle = "white";
    ctx.fillText(p.name, p.x, p.y - 5);

    // health bar
    ctx.fillStyle = "green";
    ctx.fillRect(p.x, p.y + 22, (p.health / 100) * 20, 3);
  }

  requestAnimationFrame(draw);
}
draw();