// ============================================
// MAP EDITOR - MOBILE FIXED VERSION
// ============================================

// Tile types
const TILE_TYPES = {
    FLOOR1: 0,
    FLOOR2: 21,
    GRASS1: 22,
    WALL1: 1,
    WALL2: 23,
    WATER: 24,
    TREE1: 25,
    TREE2: 26,
    BUSH1: 2,
    BUSH2: 27,
    BOX1: 28,
    EXIT: 3,
    COIN: 5,
    SCROLL: 10
};

// Editor state
let editorState = {
    selectedTile: TILE_TYPES.WALL1,
    mapWidth: 12,
    mapHeight: 12,
    tiles: [],
    playerStart: null,
    exitPos: null,
    enemies: [],
    items: [],
    missionName: "New Mission",
    missionStory: "",
    missionGoal: "escape",
    missionRules: [],
    timeLimit: 20,
    isDragging: false,
    brushSize: 1,
    gridVisible: true,
    showValidation: true,
    lastTile: null,
    currentTool: 'brush'
};

// ALL TILES IN ONE SIMPLE ARRAY
const ALL_TILES = [
    { id: TILE_TYPES.FLOOR1, name: "Floor 1", color: "#666666" },
    { id: TILE_TYPES.FLOOR2, name: "Floor 2", color: "#777777" },
    { id: TILE_TYPES.GRASS1, name: "Grass", color: "#33aa33" },
    { id: TILE_TYPES.WALL1, name: "Wall 1", color: "#888888" },
    { id: TILE_TYPES.WALL2, name: "Wall 2", color: "#999999" },
    { id: TILE_TYPES.WATER, name: "Water", color: "#3366cc" },
    { id: TILE_TYPES.TREE1, name: "Tree 1", color: "#228822" },
    { id: TILE_TYPES.TREE2, name: "Tree 2", color: "#226622" },
    { id: TILE_TYPES.BUSH1, name: "Bush 1", color: "#33cc33" },
    { id: TILE_TYPES.BUSH2, name: "Bush 2", color: "#44dd44" },
    { id: TILE_TYPES.BOX1, name: "Box", color: "#996633" },
    { id: TILE_TYPES.EXIT, name: "Exit", color: "#00ff00" },
    { id: TILE_TYPES.COIN, name: "Coin", color: "#ffd700" },
    { id: TILE_TYPES.SCROLL, name: "Scroll", color: "#9932cc" },
    { id: 'player', name: "Player", color: "#00d2ff", isEntity: true },
    { id: 'enemy_normal', name: "Guard", color: "#ff3333", isEntity: true },
    { id: 'enemy_archer', name: "Archer", color: "#33cc33", isEntity: true },
    { id: 'enemy_spear', name: "Spear", color: "#3366ff", isEntity: true }
];

let editorCanvas, editorCtx;
let tileSize = 40;
let selectedTileElement = null;

// Initialize editor
function initMapEditor() {
    // Create editor screen if it doesn't exist
    if (!document.getElementById('mapEditorScreen')) {
        createEditorScreen();
    }
    
    // Show editor screen
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('mapEditorScreen').classList.remove('hidden');
    
    // Initialize canvas
    editorCanvas = document.getElementById('editorCanvas');
    editorCtx = editorCanvas.getContext('2d');
    
    // Set canvas for mobile
    editorCanvas.style.touchAction = 'none';
    editorCanvas.style.userSelect = 'none';
    
    // Set up event listeners
    setupEditorEvents();
    
    // Initialize empty map
    createEmptyMap();
    
    // Populate tile palette
    populateTilePaletteSimple();
    
    // Render initial state
    renderEditor();
}

// Create editor screen HTML
function createEditorScreen() {
    const editorScreen = document.createElement('div');
    editorScreen.id = 'mapEditorScreen';
    editorScreen.className = 'overlay-screen hidden';
    
    editorScreen.innerHTML = `
        <div class="editor-container">
            <!-- Left Panel - Tile Palette -->
            <div class="editor-panel editor-left">
                <div class="editor-title">TILE PALETTE</div>
                <div id="tilePalette" class="tile-palette">
                    <!-- Tiles will be added here -->
                </div>
                
                <div class="editor-title" style="margin-top: 20px;">TOOLS</div>
                <div class="editor-tools">
                    <div class="tool-btn-small active" id="toolBrush">
                        <div>🖌️</div>
                        <div>Brush</div>
                    </div>
                    <div class="tool-btn-small" id="toolFill">
                        <div>🎨</div>
                        <div>Fill</div>
                    </div>
                    <div class="tool-btn-small" id="toolEraser">
                        <div>🧹</div>
                        <div>Eraser</div>
                    </div>
                    <div class="tool-btn-small" id="toolClear">
                        <div>🗑️</div>
                        <div>Clear</div>
                    </div>
                </div>
                
                <div class="map-size-controls">
                    <div class="size-input">
                        <label>Width:</label>
                        <input type="number" id="mapWidthInput" min="8" max="20" value="12">
                    </div>
                    <div class="size-input">
                        <label>Height:</label>
                        <input type="number" id="mapHeightInput" min="8" max="20" value="12">
                    </div>
                </div>
                <button class="editor-action-btn" id="resizeBtn">RESIZE MAP</button>
            </div>
            
            <!-- Center Panel - Drawing Canvas -->
            <div class="editor-center">
                <div class="editor-canvas-container">
                    <canvas id="editorCanvas"></canvas>
                </div>
                <div class="editor-status">
                    <div>Selected: <span id="selectedTileName">Wall 1</span></div>
                    <div>Tool: <span id="currentToolName">Brush</span></div>
                </div>
            </div>
            
            <!-- Right Panel - Mission Info -->
            <div class="editor-panel editor-right">
                <div class="editor-title">MISSION INFO</div>
                <div class="mission-info-form">
                    <div class="form-group">
                        <label>Mission Name:</label>
                        <input type="text" id="missionNameInput" value="New Mission">
                    </div>
                    
                    <div class="editor-actions" style="margin-top: 20px;">
                        <button class="editor-action-btn primary" id="exportBtn">EXPORT JSON</button>
                        <button class="editor-action-btn" id="testBtn">TEST</button>
                        <button class="editor-action-btn" id="backBtn">BACK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(editorScreen);
    
    // Set up button listeners
    setupButtonListeners();
}

// Set up button listeners
function setupButtonListeners() {
    // Tool buttons
    document.getElementById('toolBrush').onclick = () => setEditorTool('brush');
    document.getElementById('toolFill').onclick = () => setEditorTool('fill');
    document.getElementById('toolEraser').onclick = () => setEditorTool('eraser');
    document.getElementById('toolClear').onclick = clearMap;
    document.getElementById('resizeBtn').onclick = resizeMap;
    document.getElementById('exportBtn').onclick = exportMissionJSON;
    document.getElementById('testBtn').onclick = testMission;
    document.getElementById('backBtn').onclick = backToMainMenu;
    
    // Form inputs
    document.getElementById('mapWidthInput').onchange = function() {
        editorState.mapWidth = Math.min(20, Math.max(8, parseInt(this.value) || 12));
        this.value = editorState.mapWidth;
    };
    
    document.getElementById('mapHeightInput').onchange = function() {
        editorState.mapHeight = Math.min(20, Math.max(8, parseInt(this.value) || 12));
        this.value = editorState.mapHeight;
    };
    
    document.getElementById('missionNameInput').oninput = function() {
        editorState.missionName = this.value || "New Mission";
    };
}

// Populate tile palette
function populateTilePaletteSimple() {
    const palette = document.getElementById('tilePalette');
    if (!palette) return;
    
    palette.innerHTML = '';
    
    ALL_TILES.forEach(tile => {
        const tileBtn = document.createElement('div');
        tileBtn.className = 'tile-btn';
        tileBtn.dataset.tileId = tile.id;
        
        tileBtn.innerHTML = `
            <div class="tile-icon" style="background-color: ${tile.color};"></div>
            <div class="tile-name">${tile.name}</div>
        `;
        
        // Add touch/click event
        tileBtn.ontouchstart = tileBtn.onclick = function(e) {
            if (e.cancelable) e.preventDefault();
            
            // Remove selection from all tiles
            document.querySelectorAll('.tile-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Select this tile
            this.classList.add('selected');
            selectedTileElement = this;
            
            // Update editor state
            selectTile(tile.id, tile.isEntity);
        };
        
        palette.appendChild(tileBtn);
    });
    
    // Select first tile
    const firstTile = palette.querySelector('.tile-btn');
    if (firstTile) {
        firstTile.classList.add('selected');
        selectedTileElement = firstTile;
        selectTile(ALL_TILES[0].id, ALL_TILES[0].isEntity);
    }
}

// Select a tile
function selectTile(tileId, isEntity = false) {
    editorState.selectedTile = tileId;
    
    // Find tile name
    const tile = ALL_TILES.find(t => t.id === tileId);
    const tileName = tile ? tile.name : "Unknown";
    
    // Update status display
    document.getElementById('selectedTileName').textContent = tileName;
}

// Set editor tool
function setEditorTool(tool) {
    editorState.currentTool = tool;
    
    // Update UI
    document.querySelectorAll('.tool-btn-small').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1)).classList.add('active');
    
    // Update status
    document.getElementById('currentToolName').textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
}

// Setup event listeners for canvas
function setupEditorEvents() {
    if (!editorCanvas) return;
    
    // Prevent default touch behaviors
    editorCanvas.addEventListener('touchstart', function(e) {
        if (e.cancelable) e.preventDefault();
        handleCanvasTouchStart(e);
    }, { passive: false });
    
    editorCanvas.addEventListener('touchmove', function(e) {
        if (e.cancelable) e.preventDefault();
        handleCanvasTouchMove(e);
    }, { passive: false });
    
    editorCanvas.addEventListener('touchend', function(e) {
        if (e.cancelable) e.preventDefault();
        handleCanvasTouchEnd(e);
    }, { passive: false });
    
    // Mouse events for desktop
    editorCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    editorCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    editorCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    
    // Window resize
    window.addEventListener('resize', function() {
        updateCanvasSize();
        renderEditor();
    });
    
    // Initial canvas size
    setTimeout(updateCanvasSize, 100);
}

// Get canvas coordinates
function getCanvasCoordinates(event) {
    if (!editorCanvas) return null;
    
    const rect = editorCanvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (event.type.includes('touch')) {
        if (!event.touches || event.touches.length === 0) return null;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    const x = Math.floor((clientX - rect.left) / tileSize);
    const y = Math.floor((clientY - rect.top) / tileSize);
    
    if (x >= 0 && x < editorState.mapWidth && y >= 0 && y < editorState.mapHeight) {
        return { x, y };
    }
    
    return null;
}

// Touch handlers
function handleCanvasTouchStart(e) {
    editorState.isDragging = true;
    const pos = getCanvasCoordinates(e);
    if (pos) {
        editorState.lastTile = { x: pos.x, y: pos.y };
        placeTile(pos.x, pos.y);
    }
}

function handleCanvasTouchMove(e) {
    if (!editorState.isDragging) return;
    
    const pos = getCanvasCoordinates(e);
    if (!pos) return;
    
    if (editorState.lastTile && (pos.x !== editorState.lastTile.x || pos.y !== editorState.lastTile.y)) {
        placeTile(pos.x, pos.y);
        editorState.lastTile = { x: pos.x, y: pos.y };
    }
}

function handleCanvasTouchEnd() {
    editorState.isDragging = false;
    editorState.lastTile = null;
}

// Mouse handlers
function handleCanvasMouseDown(e) {
    editorState.isDragging = true;
    const pos = getCanvasCoordinates(e);
    if (pos) {
        editorState.lastTile = { x: pos.x, y: pos.y };
        placeTile(pos.x, pos.y);
    }
}

function handleCanvasMouseMove(e) {
    if (!editorState.isDragging) return;
    
    const pos = getCanvasCoordinates(e);
    if (!pos) return;
    
    if (editorState.lastTile && (pos.x !== editorState.lastTile.x || pos.y !== editorState.lastTile.y)) {
        placeTile(pos.x, pos.y);
        editorState.lastTile = { x: pos.x, y: pos.y };
    }
}

function handleCanvasMouseUp() {
    editorState.isDragging = false;
    editorState.lastTile = null;
}

// Place tile at position
function placeTile(x, y) {
    if (x < 0 || x >= editorState.mapWidth || y < 0 || y >= editorState.mapHeight) return;
    
    const selected = editorState.selectedTile;
    
    // Handle tools
    if (editorState.currentTool === 'eraser') {
        eraseTile(x, y);
        return;
    } else if (editorState.currentTool === 'fill') {
        // Simple fill (fills entire map with selected tile)
        fillMap(selected);
        return;
    }
    
    // Handle entity placement
    if (typeof selected === 'string') {
        if (selected === 'player') {
            setPlayerStart(x, y);
            return;
        } else if (selected.startsWith('enemy_')) {
            const enemyType = selected.replace('enemy_', '').toUpperCase();
            addEnemy(x, y, enemyType);
            return;
        }
    }
    
    // Handle special tiles
    if (selected === TILE_TYPES.EXIT) {
        setExitPos(x, y);
    } else if (selected === TILE_TYPES.COIN) {
        addItem(x, y, 'coin');
    } else if (selected === TILE_TYPES.SCROLL) {
        addItem(x, y, 'scroll');
    } else {
        // Regular tile
        editorState.tiles[y][x] = selected;
    }
    
    renderEditor();
}

// Fill entire map with tile
function fillMap(tileId) {
    for (let y = 0; y < editorState.mapHeight; y++) {
        for (let x = 0; x < editorState.mapWidth; x++) {
            editorState.tiles[y][x] = tileId;
        }
    }
    renderEditor();
}

// Basic functions
function eraseTile(x, y) {
    editorState.tiles[y][x] = TILE_TYPES.FLOOR1;
    removeEntityAt(x, y);
    renderEditor();
}

function addEnemy(x, y, type) {
    removeEntityAt(x, y);
    editorState.enemies.push({ x, y, type });
    renderEditor();
}

function setPlayerStart(x, y) {
    removeEntityAt(x, y);
    editorState.playerStart = { x, y };
    renderEditor();
}

function setExitPos(x, y) {
    removeEntityAt(x, y);
    editorState.exitPos = { x, y };
    renderEditor();
}

function addItem(x, y, type) {
    removeEntityAt(x, y);
    editorState.items.push({ x, y, type });
    renderEditor();
}

function removeEntityAt(x, y) {
    editorState.enemies = editorState.enemies.filter(e => !(e.x === x && e.y === y));
    editorState.items = editorState.items.filter(item => !(item.x === x && item.y === y));
    if (editorState.playerStart && editorState.playerStart.x === x && editorState.playerStart.y === y) {
        editorState.playerStart = null;
    }
    if (editorState.exitPos && editorState.exitPos.x === x && editorState.exitPos.y === y) {
        editorState.exitPos = null;
    }
}

// Create empty map
function createEmptyMap() {
    const width = editorState.mapWidth;
    const height = editorState.mapHeight;
    
    editorState.tiles = Array(height).fill().map(() => Array(width).fill(TILE_TYPES.FLOOR1));
    editorState.playerStart = null;
    editorState.exitPos = null;
    editorState.enemies = [];
    editorState.items = [];
    
    addBorderWalls();
    updateCanvasSize();
}

// Add border walls
function addBorderWalls() {
    const width = editorState.mapWidth;
    const height = editorState.mapHeight;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                editorState.tiles[y][x] = TILE_TYPES.WALL1;
            }
        }
    }
}

// Update canvas size
function updateCanvasSize() {
    const container = document.querySelector('.editor-canvas-container');
    if (!container || !editorCanvas) return;
    
    editorCanvas.width = container.clientWidth;
    editorCanvas.height = container.clientHeight;
    
    const maxTileWidth = Math.floor(editorCanvas.width / editorState.mapWidth);
    const maxTileHeight = Math.floor(editorCanvas.height / editorState.mapHeight);
    tileSize = Math.min(maxTileWidth, maxTileHeight, 60);
}

// Render editor
function renderEditor() {
    if (!editorCtx || !editorCanvas) return;
    
    // Clear canvas
    editorCtx.fillStyle = '#111';
    editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
    
    const width = editorState.mapWidth;
    const height = editorState.mapHeight;
    
    // Draw tiles
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            drawTile(x, y, editorState.tiles[y][x]);
        }
    }
    
    // Draw grid
    drawGrid();
    
    // Draw entities
    editorState.enemies.forEach(enemy => drawEntity(enemy.x, enemy.y, enemy.type));
    editorState.items.forEach(item => drawEntity(item.x, item.y, item.type));
    if (editorState.playerStart) drawEntity(editorState.playerStart.x, editorState.playerStart.y, 'player');
    if (editorState.exitPos) drawEntity(editorState.exitPos.x, editorState.exitPos.y, 'exit');
}

// Draw a tile
function drawTile(x, y, tileId) {
    const tile = ALL_TILES.find(t => t.id === tileId) || { color: '#ff00ff' };
    const tx = x * tileSize;
    const ty = y * tileSize;
    
    editorCtx.fillStyle = tile.color + '80';
    editorCtx.fillRect(tx, ty, tileSize, tileSize);
    
    editorCtx.strokeStyle = tile.color;
    editorCtx.lineWidth = 1;
    editorCtx.strokeRect(tx, ty, tileSize, tileSize);
}

// Draw an entity
function drawEntity(x, y, type) {
    const tx = x * tileSize;
    const ty = y * tileSize;
    
    let color = '#fff';
    let symbol = '?';
    
    switch(type) {
        case 'player': color = '#00d2ff'; symbol = 'P'; break;
        case 'exit': color = '#0f0'; symbol = 'E'; break;
        case 'coin': color = '#ffd700'; symbol = 'C'; break;
        case 'scroll': color = '#9932cc'; symbol = 'S'; break;
        case 'NORMAL': color = '#ff3333'; symbol = 'G'; break;
        case 'ARCHER': color = '#33cc33'; symbol = 'A'; break;
        case 'SPEAR': color = '#3366ff'; symbol = 'S'; break;
    }
    
    editorCtx.fillStyle = color + '40';
    editorCtx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
    
    editorCtx.fillStyle = color;
    editorCtx.font = `bold ${tileSize/2}px Arial`;
    editorCtx.textAlign = 'center';
    editorCtx.textBaseline = 'middle';
    editorCtx.fillText(symbol, tx + tileSize/2, ty + tileSize/2);
}

// Draw grid
function drawGrid() {
    editorCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    editorCtx.lineWidth = 1;
    
    for (let x = 0; x <= editorState.mapWidth; x++) {
        editorCtx.beginPath();
        editorCtx.moveTo(x * tileSize, 0);
        editorCtx.lineTo(x * tileSize, editorState.mapHeight * tileSize);
        editorCtx.stroke();
    }
    
    for (let y = 0; y <= editorState.mapHeight; y++) {
        editorCtx.beginPath();
        editorCtx.moveTo(0, y * tileSize);
        editorCtx.lineTo(editorState.mapWidth * tileSize, y * tileSize);
        editorCtx.stroke();
    }
}

// Clear map
function clearMap() {
    if (confirm("Clear the entire map?")) {
        createEmptyMap();
        renderEditor();
    }
}

// Resize map
function resizeMap() {
    const newWidth = Math.min(20, Math.max(8, parseInt(document.getElementById('mapWidthInput').value) || 12));
    const newHeight = Math.min(20, Math.max(8, parseInt(document.getElementById('mapHeightInput').value) || 12));
    
    editorState.mapWidth = newWidth;
    editorState.mapHeight = newHeight;
    
    const newTiles = Array(newHeight).fill().map(() => Array(newWidth).fill(TILE_TYPES.FLOOR1));
    
    for (let y = 0; y < Math.min(newHeight, editorState.tiles.length); y++) {
        for (let x = 0; x < Math.min(newWidth, editorState.tiles[0].length); x++) {
            newTiles[y][x] = editorState.tiles[y][x];
        }
    }
    
    editorState.tiles = newTiles;
    
    // Filter out of bounds entities
    editorState.enemies = editorState.enemies.filter(e => e.x < newWidth && e.y < newHeight);
    editorState.items = editorState.items.filter(item => item.x < newWidth && item.y < newHeight);
    
    if (editorState.playerStart && (editorState.playerStart.x >= newWidth || editorState.playerStart.y >= newHeight)) {
        editorState.playerStart = null;
    }
    if (editorState.exitPos && (editorState.exitPos.x >= newWidth || editorState.exitPos.y >= newHeight)) {
        editorState.exitPos = null;
    }
    
    addBorderWalls();
    updateCanvasSize();
    renderEditor();
}

// Export mission
function exportMissionJSON() {
    const missionData = {
        name: editorState.missionName,
        story: editorState.missionStory,
        goal: editorState.missionGoal,
        rules: editorState.missionRules,
        timeLimit: editorState.timeLimit,
        width: editorState.mapWidth,
        height: editorState.mapHeight,
        tiles: editorState.tiles,
        playerStart: editorState.playerStart,
        exit: editorState.exitPos,
        enemies: editorState.enemies,
        items: editorState.items,
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        version: "1.0"
    };
    
    const jsonString = JSON.stringify(missionData, null, 2);
    
    // Show popup with JSON
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#111';
    popup.style.border = '2px solid var(--accent)';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.zIndex = '1000';
    popup.style.width = '90%';
    popup.style.maxHeight = '80%';
    popup.style.overflow = 'auto';
    
    popup.innerHTML = `
        <h3 style="color: var(--accent); margin-top: 0;">Mission JSON</h3>
        <textarea style="width: 100%; height: 200px; background: #222; color: #fff; border: 1px solid #444; padding: 10px; font-family: monospace;">${jsonString}</textarea>
        <div style="margin-top: 10px;">
            <p style="color: #aaa; font-size: 12px;">Copy this JSON and save it as a .json file</p>
            <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; padding: 10px; background: var(--accent); color: white; border: none; border-radius: 5px;">OK</button>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Test mission
function testMission() {
    if (!editorState.playerStart) {
        alert("Cannot test: No player start position set");
        return;
    }
    if (!editorState.exitPos) {
        alert("Cannot test: No exit position set");
        return;
    }
    
    const missionData = {
        name: editorState.missionName,
        story: editorState.missionStory,
        goal: editorState.missionGoal,
        rules: editorState.missionRules,
        timeLimit: editorState.timeLimit,
        width: editorState.mapWidth,
        height: editorState.mapHeight,
        tiles: editorState.tiles,
        playerStart: editorState.playerStart,
        exit: editorState.exitPos,
        enemies: editorState.enemies,
        items: editorState.items
    };
    
    document.getElementById('mapEditorScreen').classList.add('hidden');
    
    if (typeof startCustomMission === 'function') {
        startCustomMission(missionData);
    } else {
        alert("Game functions not available");
        document.getElementById('mapEditorScreen').classList.remove('hidden');
    }
}

// Initialize when page loads
window.addEventListener('load', function() {
    window.showMapEditor = initMapEditor;
});