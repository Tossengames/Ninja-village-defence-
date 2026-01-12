const TILE = 60;
const [FLOOR, WALL, HIDE, EXIT, COIN, TRAP, RICE, BOMB] = [0, 1, 2, 3, 5, 6, 7, 8];

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// Helper to get random coord within bounds
const randPos = () => Math.floor(Math.random() * (mapDim - 2)) + 1;

// Image loader
['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'].forEach(n => {
    const img = new Image(); img.src = `sprites/${n}.png`;
    img.onload = () => sprites[n] = img;
});
