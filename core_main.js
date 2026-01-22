/**
 * SIMPLE MAP LOADER & RENDERER
 * Only loads and displays map from JSON
 */

const TILE_SIZE = 64;
const WALL = 1, FLOOR = 0, HIDE = 2, EXIT = 3;

let canvas, ctx;
let grid = [];
let mapDim = 0;
let player = { x: 0, y: 0 };
let enemies = [];
let items = [];

// Colors for tiles
const TILE_COLORS = {
    [WALL]: "#333333",      // Dark gray
    [FLOOR]: "#111111",     // Black
    [HIDE]: "#1a3d1a",      // Dark green
    [EXIT]: "#ff9900"       // Orange
};

async function initGame(levelPath) {
    console.log("Loading level from:", levelPath);
    
    try {
        // Load the JSON file
        const response = await fetch(levelPath);
        if (!response.ok) {
            throw new Error(`Failed to load ${levelPath}: ${response.status}`);
        }
        
        const levelData = await response.json();
        console.log("Loaded level data:", levelData);
        
        // Extract data from JSON
        mapDim = levelData.mapDim;
        grid = levelData.grid;
        player.x = levelData.playerStart.x;
        player.y = levelData.playerStart.y;
        
        enemies = levelData.enemies || [];
        items = levelData.items || [];
        
        console.log(`Map loaded: ${mapDim}x${mapDim}`);
        console.log("Player at:", player.x, player.y);
        console.log("Enemies:", enemies.length);
        console.log("Items:", items.length);
        
        // Setup canvas
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }
        
        ctx = canvas.getContext('2d');
        resizeCanvas();
        
        // Hide menu and show game
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        
        // Show a log message
        if (typeof addLogEntry === 'function') {
            addLogEntry(`Loaded: ${levelData.name}`, "success");
            addLogEntry(`Map size: ${mapDim}x${mapDim}`, "info");
        }
        
        // Start rendering
        requestAnimationFrame(gameLoop);
        
    } catch (error) {
        console.error("Error loading level:", error);
        alert(`Failed to load level: ${error.message}`);
    }
}

function gameLoop() {
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate camera position to center on player
    const camX = player.x * TILE_SIZE - canvas.width / 2;
    const camY = player.y * TILE_SIZE - canvas.height / 2;
    
    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-camX, -camY);
    
    // Draw all tiles
    for (let y = 0; y < mapDim; y++) {
        for (let x = 0; x < mapDim; x++) {
            drawTile(x, y);
        }
    }
    
    // Draw items
    drawItems();
    
    // Draw enemies
    drawEnemies();
    
    // Draw player
    drawPlayer();
    
    // Draw grid lines (optional)
    drawGridLines();
    
    // Restore context
    ctx.restore();
    
    // Continue the loop
    requestAnimationFrame(gameLoop);
}

function drawTile(x, y) {
    if (!grid[y] || grid[y][x] === undefined) return;
    
    const tileType = grid[y][x];
    const color = TILE_COLORS[tileType] || "#ff00ff"; // Magenta for unknown
    
    // Draw tile
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    
    // Draw tile border
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;
    ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    
    // Draw tile type indicator (for debugging)
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        tileType,
        x * TILE_SIZE + TILE_SIZE/2,
        y * TILE_SIZE + TILE_SIZE/2
    );
}

function drawGridLines() {
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= mapDim; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, mapDim * TILE_SIZE);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= mapDim; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(mapDim * TILE_SIZE, y * TILE_SIZE);
        ctx.stroke();
    }
}

function drawPlayer() {
    // Draw player shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(
        player.x * TILE_SIZE + TILE_SIZE/2,
        player.y * TILE_SIZE + TILE_SIZE/2 + 5,
        TILE_SIZE/3,
        TILE_SIZE/6,
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw player circle
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(
        player.x * TILE_SIZE + TILE_SIZE/2,
        player.y * TILE_SIZE + TILE_SIZE/2,
        TILE_SIZE/3,
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw player emoji
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        "🥷",
        player.x * TILE_SIZE + TILE_SIZE/2,
        player.y * TILE_SIZE + TILE_SIZE/2
    );
    
    // Draw coordinates (debug)
    ctx.font = "10px Arial";
    ctx.fillText(
        `${player.x},${player.y}`,
        player.x * TILE_SIZE + TILE_SIZE/2,
        player.y * TILE_SIZE + TILE_SIZE/2 + 25
    );
}

function drawEnemies() {
    enemies.forEach(enemy => {
        // Draw enemy circle
        ctx.fillStyle = enemy.type === "ARCHER" ? "#33cc33" : 
                       enemy.type === "SPEAR" ? "#3366ff" : "#ff3333";
        ctx.beginPath();
        ctx.arc(
            enemy.x * TILE_SIZE + TILE_SIZE/2,
            enemy.y * TILE_SIZE + TILE_SIZE/2,
            TILE_SIZE/3,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw enemy emoji
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let emoji = "👤";
        if (enemy.type === "ARCHER") emoji = "🏹";
        if (enemy.type === "SPEAR") emoji = "🔱";
        
        ctx.fillText(
            emoji,
            enemy.x * TILE_SIZE + TILE_SIZE/2,
            enemy.y * TILE_SIZE + TILE_SIZE/2
        );
        
        // Draw coordinates (debug)
        ctx.font = "10px Arial";
        ctx.fillText(
            enemy.type,
            enemy.x * TILE_SIZE + TILE_SIZE/2,
            enemy.y * TILE_SIZE + TILE_SIZE/2 + 25
        );
    });
}

function drawItems() {
    items.forEach(item => {
        // Draw item emoji
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let emoji = "❓";
        if (item.type === "coin") emoji = "💰";
        if (item.type === "health") emoji = "❤️";
        
        ctx.fillText(
            emoji,
            item.x * TILE_SIZE + TILE_SIZE/2,
            item.y * TILE_SIZE + TILE_SIZE/2
        );
        
        // Draw value (debug)
        ctx.font = "10px Arial";
        ctx.fillText(
            item.value,
            item.x * TILE_SIZE + TILE_SIZE/2,
            item.y * TILE_SIZE + TILE_SIZE/2 + 20
        );
    });
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
}

// Make functions available globally
window.initGame = initGame;
window.initCustomGame = function(params) {
    // For now, just use a default map for custom games
    console.log("Custom game requested:", params);
    initGame("levels/tutorial.json"); // Use tutorial as default
};

// Initialize on window resize
window.addEventListener('resize', resizeCanvas);

// Debug: Test loading immediately
window.addEventListener('load', function() {
    console.log("Map loader ready");
    
    // Optional: Auto-load the tutorial level for testing
    // Remove this in production
    // setTimeout(() => initGame("levels/tutorial.json"), 1000);
});