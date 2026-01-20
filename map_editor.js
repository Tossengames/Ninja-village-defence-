// ============================================
// MAP EDITOR - FIXED VERSION
// ============================================

// Tile types
const TILE_TYPES = {
    // Walkable tiles
    FLOOR1: 0,
    FLOOR2: 21,
    GRASS1: 22,
    
    // Not walkable
    WALL1: 1,
    WALL2: 23,
    WATER: 24,
    TREE1: 25,
    TREE2: 26,
    
    // Hiding places
    BUSH1: 2,
    BUSH2: 27,
    BOX1: 28,
    
    // Special tiles
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
    // Walkable
    { id: TILE_TYPES.FLOOR1, name: "Floor 1", sprite: "floor", color: "#666666", category: "walkable" },
    { id: TILE_TYPES.FLOOR2, name: "Floor 2", sprite: "floor2", color: "#777777", category: "walkable" },
    { id: TILE_TYPES.GRASS1, name: "Grass", sprite: "grass", color: "#33aa33", category: "walkable" },
    
    // Obstacles
    { id: TILE_TYPES.WALL1, name: "Wall 1", sprite: "wall", color: "#888888", category: "obstacle" },
    { id: TILE_TYPES.WALL2, name: "Wall 2", sprite: "wall2", color: "#999999", category: "obstacle" },
    { id: TILE_TYPES.WATER, name: "Water", sprite: "water", color: "#3366cc", category: "obstacle" },
    { id: TILE_TYPES.TREE1, name: "Tree 1", sprite: "tree1", color: "#228822", category: "obstacle" },
    { id: TILE_TYPES.TREE2, name: "Tree 2", sprite: "tree2", color: "#226622", category: "obstacle" },
    
    // Hiding
    { id: TILE_TYPES.BUSH1, name: "Bush 1", sprite: "bush1", color: "#33cc33", category: "hiding" },
    { id: TILE_TYPES.BUSH2, name: "Bush 2", sprite: "bush2", color: "#44dd44", category: "hiding" },
    { id: TILE_TYPES.BOX1, name: "Box", sprite: "box", color: "#996633", category: "hiding" },
    
    // Special
    { id: TILE_TYPES.EXIT, name: "Exit", sprite: "exit", color: "#00ff00", category: "special" },
    { id: TILE_TYPES.COIN, name: "Coin", sprite: "coin", color: "#ffd700", category: "special" },
    { id: TILE_TYPES.SCROLL, name: "Scroll", sprite: "scroll", color: "#9932cc", category: "special" },
    
    // Entities (not actual tiles, but placed as objects)
    { id: 'player', name: "Player", sprite: "player", color: "#00d2ff", isEntity: true },
    { id: 'enemy_normal', name: "Guard", sprite: "guard", color: "#ff3333", isEntity: true },
    { id: 'enemy_archer', name: "Archer", sprite: "archer", color: "#33cc33", isEntity: true },
    { id: 'enemy_spear', name: "Spear", sprite: "spear", color: "#3366ff", isEntity: true }
];

let editorCanvas, editorCtx;
let tileSize = 40;
let loadedSprites = {};

// Initialize editor
function initMapEditor() {
    console.log("Initializing Map Editor...");
    
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
    
    // Set up event listeners
    setupEditorEvents();
    
    // Initialize empty map
    createEmptyMap();
    
    // Populate tile palette - SIMPLE VERSION
    populateTilePaletteSimple();
    
    // Render initial state
    renderEditor();
    
    console.log("Map Editor initialized");
}

// Create editor screen HTML - SIMPLIFIED
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
                    <div class="tool-btn-small active" id="toolBrush" onclick="setEditorTool('brush')">
                        <div>🖌️</div>
                        <div>Brush</div>
                    </div>
                    <div class="tool-btn-small" id="toolFill" onclick="setEditorTool('fill')">
                        <div>🎨</div>
                        <div>Fill</div>
                    </div>
                    <div class="tool-btn-small" id="toolEraser" onclick="setEditorTool('eraser')">
                        <div>🧹</div>
                        <div>Eraser</div>
                    </div>
                    <div class="tool-btn-small" onclick="clearMap()">
                        <div>🗑️</div>
                        <div>Clear</div>
                    </div>
                    <div class="tool-btn-small" onclick="randomizeWalls()">
                        <div>🎲</div>
                        <div>Random</div>
                    </div>
                    <div class="tool-btn-small" onclick="addBorderWalls()">
                        <div>🔲</div>
                        <div>Border</div>
                    </div>
                </div>
                
                <div class="map-size-controls">
                    <div class="size-input">
                        <label>Width (8-20):</label>
                        <input type="number" id="mapWidthInput" min="8" max="20" value="12">
                    </div>
                    <div class="size-input">
                        <label>Height (8-20):</label>
                        <input type="number" id="mapHeightInput" min="8" max="20" value="12">
                    </div>
                </div>
                <button class="editor-action-btn" onclick="resizeMap()">RESIZE MAP</button>
            </div>
            
            <!-- Center Panel - Drawing Canvas -->
            <div class="editor-center">
                <div class="editor-canvas-container">
                    <canvas id="editorCanvas"></canvas>
                    <div class="grid-overlay" id="gridOverlay"></div>
                </div>
                <div class="editor-status">
                    <div>Selected: <span id="selectedTileName">Wall 1</span></div>
                    <div>Tool: <span id="currentToolName">Brush</span></div>
                </div>
                <div class="validation-message" id="validationMessage"></div>
            </div>
            
            <!-- Right Panel - Mission Info -->
            <div class="editor-panel editor-right">
                <div class="editor-title">MISSION INFO</div>
                <div class="mission-info-form">
                    <div class="form-group">
                        <label>Mission Name:</label>
                        <input type="text" id="missionNameInput" value="New Mission" maxlength="30">
                    </div>
                    
                    <div class="form-group">
                        <label>Mission Story:</label>
                        <textarea id="missionStoryInput" placeholder="Enter mission briefing..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Goal Type:</label>
                        <select id="missionGoalSelect">
                            <option value="escape">Escape</option>
                            <option value="kill_all">Kill All Enemies</option>
                            <option value="steal">Steal Scroll</option>
                            <option value="pacifist">Pacifist (No Kills)</option>
                            <option value="time_trial">Time Trial</option>
                            <option value="collect_all_coins">Collect All Coins</option>
                        </select>
                    </div>
                    
                    <div class="editor-actions" style="margin-top: 20px;">
                        <button class="editor-action-btn primary" onclick="exportMissionJSON()">📤 EXPORT JSON</button>
                        <button class="editor-action-btn" onclick="testMission()">▶️ TEST</button>
                        <button class="editor-action-btn" onclick="backToMainMenu()">← BACK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(editorScreen);
    
    // Set up form inputs
    document.getElementById('mapWidthInput').addEventListener('change', function() {
        editorState.mapWidth = Math.min(20, Math.max(8, parseInt(this.value) || 12));
        this.value = editorState.mapWidth;
    });
    document.getElementById('mapHeightInput').addEventListener('change', function() {
        editorState.mapHeight = Math.min(20, Math.max(8, parseInt(this.value) || 12));
        this.value = editorState.mapHeight;
    });
    document.getElementById('missionNameInput').addEventListener('input', function() {
        editorState.missionName = this.value || "New Mission";
    });
}

// SIMPLE tile palette population
function populateTilePaletteSimple() {
    const palette = document.getElementById('tilePalette');
    if (!palette) {
        console.error("Tile palette element not found!");
        return;
    }
    
    palette.innerHTML = ''; // Clear any existing content
    
    console.log("Creating", ALL_TILES.length, "tile buttons");
    
    ALL_TILES.forEach(tile => {
        const tileBtn = document.createElement('div');
        tileBtn.className = 'tile-btn';
        tileBtn.dataset.tileId = tile.id;
        tileBtn.title = tile.name;
        
        // Create a simple colored square
        tileBtn.innerHTML = `
            <div class="tile-icon" style="background-color: ${tile.color}; width: 32px; height: 32px; margin: 0 auto 5px; border-radius: 4px;"></div>
            <div class="tile-name" style="font-size: 10px; color: #aaa; text-align: center;">${tile.name}</div>
        `;
        
        tileBtn.style.cursor = 'pointer';
        tileBtn.style.padding = '8px';
        tileBtn.style.border = '2px solid #444';
        tileBtn.style.borderRadius = '8px';
        tileBtn.style.backgroundColor = '#222';
        tileBtn.style.transition = 'all 0.2s';
        
        tileBtn.onmouseenter = function() {
            this.style.borderColor = '#666';
            this.style.transform = 'translateY(-2px)';
        };
        
        tileBtn.onmouseleave = function() {
            this.style.borderColor = '#444';
            this.style.transform = 'translateY(0)';
        };
        
        tileBtn.onclick = function(e) {
            e.stopPropagation();
            selectTile(tile.id, tile.isEntity);
            
            // Update selected style
            document.querySelectorAll('.tile-btn').forEach(btn => {
                btn.style.borderColor = '#444';
                btn.style.backgroundColor = '#222';
            });
            this.style.borderColor = '#00d2ff';
            this.style.backgroundColor = '#1e2a30';
        };
        
        palette.appendChild(tileBtn);
    });
    
    // Select first tile by default
    if (ALL_TILES.length > 0) {
        selectTile(ALL_TILES[0].id, ALL_TILES[0].isEntity);
        const firstBtn = palette.querySelector('.tile-btn');
        if (firstBtn) {
            firstBtn.style.borderColor = '#00d2ff';
            firstBtn.style.backgroundColor = '#1e2a30';
        }
    }
}

// Select a tile
function selectTile(tileId, isEntity = false) {
    editorState.selectedTile = tileId;
    
    // Find tile name
    const tile = ALL_TILES.find(t => t.id === tileId);
    const tileName = tile ? tile.name : "Unknown";
    
    // Update status display
    const selectedTileName = document.getElementById('selectedTileName');
    if (selectedTileName) {
        selectedTileName.textContent = tileName;
    }
    
    console.log("Selected:", tileName, "ID:", tileId);
}

// Set editor tool
function setEditorTool(tool) {
    editorState.currentTool = tool;
    
    // Update UI
    document.querySelectorAll('.tool-btn-small').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const toolBtn = document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1));
    if (toolBtn) {
        toolBtn.classList.add('active');
    }
    
    // Update status
    const toolName = document.getElementById('currentToolName');
    if (toolName) {
        toolName.textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
    }
}

// Create empty map
function createEmptyMap() {
    const width = editorState.mapWidth;
    const height = editorState.mapHeight;
    
    // Initialize empty tiles
    editorState.tiles = Array(height).fill().map(() => Array(width).fill(TILE_TYPES.FLOOR1));
    
    // Reset other data
    editorState.playerStart = null;
    editorState.exitPos = null;
    editorState.enemies = [];
    editorState.items = [];
    
    // Add border walls
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
    
    renderEditor();
}

// Update canvas size
function updateCanvasSize() {
    const container = document.querySelector('.editor-canvas-container');
    if (!container || !editorCanvas) return;
    
    // Set canvas size to fit container
    editorCanvas.width = container.clientWidth;
    editorCanvas.height = container.clientHeight;
    
    // Calculate tile size to fit map
    const maxTileWidth = Math.floor(editorCanvas.width / editorState.mapWidth);
    const maxTileHeight = Math.floor(editorCanvas.height / editorState.mapHeight);
    tileSize = Math.min(maxTileWidth, maxTileHeight, 60);
    
    console.log("Canvas size:", editorCanvas.width, "x", editorCanvas.height, "Tile size:", tileSize);
}

// Setup editor event listeners
function setupEditorEvents() {
    if (!editorCanvas) {
        console.error("Editor canvas not found!");
        return;
    }
    
    console.log("Setting up editor events...");
    
    // Mouse events
    editorCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    editorCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    editorCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    editorCanvas.addEventListener('mouseleave', handleCanvasMouseUp);
    
    // Touch events for mobile
    editorCanvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    editorCanvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
    editorCanvas.addEventListener('touchend', handleCanvasTouchEnd);
    
    // Right-click for erase
    editorCanvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        setEditorTool('eraser');
        const pos = getCanvasCoordinates(e);
        if (pos) placeTile(pos.x, pos.y);
        setEditorTool('brush');
        return false;
    });
    
    // Window resize
    window.addEventListener('resize', function() {
        updateCanvasSize();
        renderEditor();
    });
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

// Handle mouse down
function handleCanvasMouseDown(e) {
    e.preventDefault();
    editorState.isDragging = true;
    
    const pos = getCanvasCoordinates(e);
    if (pos) {
        editorState.lastTile = { x: pos.x, y: pos.y };
        placeTile(pos.x, pos.y);
    }
}

// Handle mouse move
function handleCanvasMouseMove(e) {
    e.preventDefault();
    
    const pos = getCanvasCoordinates(e);
    if (!pos) return;
    
    // Draw while dragging
    if (editorState.isDragging && editorState.lastTile && 
        (pos.x !== editorState.lastTile.x || pos.y !== editorState.lastTile.y)) {
        placeTile(pos.x, pos.y);
        editorState.lastTile = { x: pos.x, y: pos.y };
    }
}

// Handle mouse up
function handleCanvasMouseUp(e) {
    e.preventDefault();
    editorState.isDragging = false;
    editorState.lastTile = null;
}

// Handle touch events
function handleCanvasTouchStart(e) {
    e.preventDefault();
    handleCanvasMouseDown(e.touches[0]);
}

function handleCanvasTouchMove(e) {
    e.preventDefault();
    handleCanvasMouseMove(e.touches[0]);
}

function handleCanvasTouchEnd(e) {
    e.preventDefault();
    handleCanvasMouseUp(e.changedTouches[0]);
}

// Place tile at position
function placeTile(x, y) {
    if (x < 0 || x >= editorState.mapWidth || y < 0 || y >= editorState.mapHeight) return;
    
    const selected = editorState.selectedTile;
    
    console.log("Placing tile at", x, y, "ID:", selected);
    
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
    
    // Handle tools
    if (editorState.currentTool === 'eraser') {
        eraseTile(x, y);
        return;
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

// Render editor
function renderEditor() {
    if (!editorCtx || !editorCanvas) {
        console.error("Canvas context not available!");
        return;
    }
    
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
    if (editorState.gridVisible) {
        drawGrid();
    }
    
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
    }
}

// Randomize walls
function randomizeWalls() {
    const width = editorState.mapWidth;
    const height = editorState.mapHeight;
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if ((editorState.playerStart && x === editorState.playerStart.x && y === editorState.playerStart.y) ||
                (editorState.exitPos && x === editorState.exitPos.x && y === editorState.exitPos.y)) {
                continue;
            }
            
            const hasItem = editorState.items.some(item => item.x === x && item.y === y);
            const hasEnemy = editorState.enemies.some(enemy => enemy.x === x && enemy.y === y);
            
            if (!hasItem && !hasEnemy) {
                editorState.tiles[y][x] = Math.random() < 0.2 ? TILE_TYPES.WALL1 : TILE_TYPES.FLOOR1;
            }
        }
    }
    
    renderEditor();
}

// Resize map
function resizeMap() {
    const widthInput = document.getElementById('mapWidthInput');
    const heightInput = document.getElementById('mapHeightInput');
    
    const newWidth = Math.min(20, Math.max(8, parseInt(widthInput.value) || 12));
    const newHeight = Math.min(20, Math.max(8, parseInt(heightInput.value) || 12));
    
    editorState.mapWidth = newWidth;
    editorState.mapHeight = newHeight;
    
    const newTiles = Array(newHeight).fill().map(() => Array(newWidth).fill(TILE_TYPES.FLOOR1));
    
    for (let y = 0; y < Math.min(newHeight, editorState.tiles.length); y++) {
        for (let x = 0; x < Math.min(newWidth, editorState.tiles[0].length); x++) {
            newTiles[y][x] = editorState.tiles[y][x];
        }
    }
    
    editorState.tiles = newTiles;
    
    editorState.enemies = editorState.enemies.filter(e => 
        e.x >= 0 && e.x < newWidth && e.y >= 0 && e.y < newHeight
    );
    editorState.items = editorState.items.filter(item => 
        item.x >= 0 && item.x < newWidth && item.y >= 0 && item.y < newHeight
    );
    
    if (editorState.playerStart && 
        (editorState.playerStart.x >= newWidth || editorState.playerStart.y >= newHeight)) {
        editorState.playerStart = null;
    }
    if (editorState.exitPos && 
        (editorState.exitPos.x >= newWidth || editorState.exitPos.y >= newHeight)) {
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
    
    // Try to copy to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonString).then(() => {
            alert("Mission JSON copied to clipboard!");
        }).catch(() => {
            showJSONPopup(jsonString);
        });
    } else {
        showJSONPopup(jsonString);
    }
}

function showJSONPopup(jsonString) {
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
    popup.style.maxWidth = '90%';
    popup.style.maxHeight = '80%';
    popup.style.overflow = 'auto';
    
    popup.innerHTML = `
        <h3 style="color: var(--accent); margin-top: 0;">Mission JSON</h3>
        <textarea style="width: 100%; height: 300px; background: #222; color: #fff; border: 1px solid #444; padding: 10px; font-family: monospace;">${jsonString}</textarea>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
            <button onclick="navigator.clipboard.writeText(this.parentElement.parentElement.querySelector('textarea').value).then(() => alert('Copied!'))" style="flex: 1; padding: 10px; background: var(--accent); color: white; border: none; border-radius: 5px;">Copy</button>
            <button onclick="this.parentElement.parentElement.remove()" style="flex: 1; padding: 10px; background: #333; color: #aaa; border: none; border-radius: 5px;">Close</button>
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
    console.log("Map Editor script loaded");
});