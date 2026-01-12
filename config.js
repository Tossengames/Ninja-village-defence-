const TILE = 60;
const [FLOOR, WALL, HIDE, EXIT, COIN, TRAP, RICE, BOMB] = [0, 1, 2, 3, 5, 6, 7, 8];

let grid, player, enemies, activeBombs = [], particles = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0;

// Camera and Scale
let mapDim = 30;
let zoom = 1.0;
let cam = { x: 0, y: 0 };

let stats = { kills: 0, coins: 0 };
let inv = { trap: 5, rice: 5, bomb: 3 };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

const randPos = () => Math.floor(Math.random() * (mapDim - 2)) + 1;

// Load images - fallback to geometric shapes if missing
['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'].forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => sprites[n] = img;
});
