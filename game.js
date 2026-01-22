// ============================================
// LEVEL LOADER & SELECTOR
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// CONFIGURATION: Add your JSON filenames here
const levelFiles = ["level1.json", "level2.json"];

let currentMapData = null;

// Tile Color Map (for preview - optional)
const tileColors = {
    0: "#555555", // Floor
    1: "#111111", // Wall
    2: "#00ff00", // Player
    3: "#ff3300", // Enemy
    4: "#ffcc00"  // Exit
};

// 1. Initialize the scrollable menu
function initMenu() {
    const list = document.getElementById('level-list');
    if (!list) return;
    
    list.innerHTML = ""; // Clear list
    
    levelFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'level-item';
        // Display name without .json extension
        item.innerText = file.replace('.json', '').toUpperCase();
        item.onclick = () => loadLevelInfo(file);
        list.appendChild(item);
    });
}

// 2. Fetch JSON and show the Info Screen
async function loadLevelInfo(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error("Could not find " + fileName);
        
        currentMapData = await response.json();

        // Populate Info Screen
        const infoName = document.getElementById('info-name');
        const infoStory = document.getElementById('info-story');
        const infoRules = document.getElementById('info-rules');
        
        if (infoName) infoName.innerText = currentMapData.name;
        if (infoStory) infoStory.innerText = currentMapData.story;
        if (infoRules) infoRules.innerText = currentMapData.rules;

        // Switch to level info screen
        hideAllScreens();
        document.getElementById('levelInfo').classList.remove('hidden');
        
        // Store globally for core_main.js
        window.currentMapData = currentMapData;
        
    } catch (err) {
        alert(err.message);
    }
}

// 3. Helper to hide all screens
function hideAllScreens() {
    const screens = document.querySelectorAll('.overlay-screen');
    screens.forEach(screen => {
        screen.classList.add('hidden');
    });
}

// 4. Convert JSON grid to core_main.js format
function convertJsonToGameFormat(jsonData) {
    const { rows, cols, grid } = jsonData;
    
    // Convert flat array to 2D grid for core_main.js
    const gameGrid = [];
    for (let y = 0; y < rows; y++) {
        gameGrid[y] = [];
        for (let x = 0; x < cols; x++) {
            const tileIndex = y * cols + x;
            const tileID = grid[tileIndex];
            
            // Map JSON tile IDs to core_main.js tile IDs
            // This mapping needs to match your game's tile system
            switch(tileID) {
                case 0: // Floor
                    gameGrid[y][x] = 0; // FLOOR in core_main.js
                    break;
                case 1: // Wall
                    gameGrid[y][x] = 1; // WALL in core_main.js
                    break;
                case 2: // Player start (special - will be handled separately)
                    gameGrid[y][x] = 0; // Make it floor
                    break;
                case 3: // Enemy (red blocks)
                    gameGrid[y][x] = 0; // Make it floor, enemy placed separately
                    break;
                case 4: // Exit (gold blocks)
                    gameGrid[y][x] = 3; // EXIT in core_main.js
                    break;
                default:
                    gameGrid[y][x] = 0; // Default to floor
            }
        }
    }
    
    // Extract player start position
    let playerStart = { x: 1, y: 1 }; // Default
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const tileIndex = y * cols + x;
            if (grid[tileIndex] === 2) {
                playerStart = { x, y };
                break;
            }
        }
    }
    
    // Extract enemy positions
    const enemies = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const tileIndex = y * cols + x;
            if (grid[tileIndex] === 3) {
                enemies.push({ x, y });
            }
        }
    }
    
    // Return data in format core_main.js can use
    return {
        name: jsonData.name,
        story: jsonData.story,
        rules: jsonData.rules,
        rows: rows,
        cols: cols,
        grid: gameGrid,
        playerStart: playerStart,
        enemies: enemies,
        originalJson: jsonData // Keep original for reference
    };
}

// 5. Export function for core_main.js to use
window.getLevelData = function() {
    if (!currentMapData) return null;
    return convertJsonToGameFormat(currentMapData);
};

// 6. Function to check if level is selected
window.hasLevelSelected = function() {
    return currentMapData !== null;
};

// 7. Preview function (optional - for debugging)
function previewMap() {
    if (!currentMapData || !ctx || !canvas) return;
    
    const map = currentMapData;
    canvas.width = map.cols * map.tilesize;
    canvas.height = map.rows * map.tilesize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    map.grid.forEach((tileID, index) => {
        const x = (index % map.cols) * map.tilesize;
        const y = Math.floor(index / map.cols) * map.tilesize;

        ctx.fillStyle = tileColors[tileID] || "#000";
        ctx.fillRect(x, y, map.tilesize, map.tilesize);

        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.strokeRect(x, y, map.tilesize, map.tilesize);
    });
}

// Initialize on load
if (typeof initMenu === 'function') {
    window.addEventListener('load', initMenu);
}