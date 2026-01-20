// ============================================
// MAP EDITOR - COMPLETE EDITOR SYSTEM
// ============================================

// Tile types matching game constants
const TILE_TYPES = {
    // Walkable tiles
    FLOOR1: 0,
    FLOOR2: 21,
    GRASS1: 22,
    
    // Not walkable (walls/obstacles)
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
    currentTool: 'brush',
    spriteCache: {},
    currentPalette: 'tiles' // 'tiles', 'entities', 'items'
};

// Tile palette definitions with proper organization
const TILE_PALETTE = {
    // Walkable tiles
    walkable: [
        { id: TILE_TYPES.FLOOR1, name: "Floor 1", sprite: "floor", color: "#666666", category: "walkable" },
        { id: TILE_TYPES.FLOOR2, name: "Floor 2", sprite: "floor2", color: "#777777", category: "walkable" },
        { id: TILE_TYPES.GRASS1, name: "Grass", sprite: "grass", color: "#33aa33", category: "walkable" }
    ],
    
    // Not walkable
    obstacles: [
        { id: TILE_TYPES.WALL1, name: "Wall 1", sprite: "wall", color: "#888888", category: "obstacle" },
        { id: TILE_TYPES.WALL2, name: "Wall 2", sprite: "wall2", color: "#999999", category: "obstacle" },
        { id: TILE_TYPES.WATER, name: "Water", sprite: "water", color: "#3366cc", category: "obstacle" },
        { id: TILE_TYPES.TREE1, name: "Tree 1", sprite: "tree1", color: "#228822", category: "obstacle" },
        { id: TILE_TYPES.TREE2, name: "Tree 2", sprite: "tree2", color: "#226622", category: "obstacle" }
    ],
    
    // Hiding places
    hiding: [
        { id: TILE_TYPES.BUSH1, name: "Bush 1", sprite: "bush1", color: "#33cc33", category: "hiding" },
        { id: TILE_TYPES.BUSH2, name: "Bush 2", sprite: "bush2", color: "#44dd44", category: "hiding" },
        { id: TILE_TYPES.BOX1, name: "Box", sprite: "box", color: "#996633", category: "hiding" }
    ],
    
    // Special tiles
    special: [
        { id: TILE_TYPES.EXIT, name: "Exit", sprite: "exit", color: "#00ff00", category: "special" },
        { id: TILE_TYPES.COIN, name: "Coin", sprite: "coin", color: "#ffd700", category: "special" },
        { id: TILE_TYPES.SCROLL, name: "Scroll", sprite: "scroll", color: "#9932cc", category: "special" }
    ],
    
    // Characters (entities)
    characters: [
        { id: 'player', name: "Player Start", sprite: "player", color: "#00d2ff", isEntity: true },
        { id: 'enemy_normal', name: "Normal Guard", sprite: "guard", color: "#ff3333", isEntity: true },
        { id: 'enemy_archer', name: "Archer", sprite: "archer", color: "#33cc33", isEntity: true },
        { id: 'enemy_spear', name: "Spear Guard", sprite: "spear", color: "#3366ff", isEntity: true }
    ]
};

// Mission goals
const MISSION_GOALS = [
    { id: "escape", name: "Escape" },
    { id: "kill_all", name: "Kill All Enemies" },
    { id: "steal", name: "Steal Scroll" },
    { id: "pacifist", name: "Pacifist (No Kills)" },
    { id: "time_trial", name: "Time Trial" },
    { id: "collect_all_coins", name: "Collect All Coins" }
];

// Mission rules
const MISSION_RULES = [
    { id: "no_kills", name: "No Kills Allowed" },
    { id: "no_items", name: "No Items Allowed" },
    { id: "no_alert", name: "Don't Get Spotted" },
    { id: "all_coins", name: "Collect All Coins" },
    { id: "time_limit", name: "Time Limit" }
];

// DOM Elements
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
    
    // Load sprites
    loadAllSprites();
    
    // Set up event listeners
    setupEditorEvents();
    
    // Initialize empty map
    createEmptyMap();
    
    // Render initial state
    renderEditor();
    
    console.log("Map Editor initialized");
    
    // Update palette display
    updatePaletteDisplay();
}

// Load all sprites
function loadAllSprites() {
    // Collect all unique sprite names from palette
    const spriteNames = new Set();
    
    // Check each category
    Object.values(TILE_PALETTE).forEach(category => {
        category.forEach(item => {
            if (item.sprite) {
                spriteNames.add(item.sprite);
            }
        });
    });
    
    // Load each sprite
    spriteNames.forEach(spriteName => {
        const img = new Image();
        img.src = `sprites/${spriteName}.png`;
        img.onload = () => {
            loadedSprites[spriteName] = img;
            // Redraw if this was a missing sprite
            renderEditor();
        };
        img.onerror = () => {
            console.log(`Sprite not found: sprites/${spriteName}.png, using placeholder`);
            // Create placeholder
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Create colored placeholder based on tile type
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 64, 64);
            
            // Add text for debugging
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(spriteName, 32, 32);
            
            loadedSprites[spriteName] = canvas;
        };
    });
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
                
                <!-- Palette Tabs -->
                <div class="palette-tabs">
                    <button class="palette-tab active" onclick="switchPalette('tiles')">Tiles</button>
                    <button class="palette-tab" onclick="switchPalette('entities')">Entities</button>
                    <button class="palette-tab" onclick="switchPalette('items')">Items</button>
                </div>
                
                <!-- Tiles Palette -->
                <div id="tilesPalette" class="palette-content active">
                    <div class="palette-category">
                        <div class="category-title">Walkable</div>
                        <div id="walkableTiles" class="tile-grid"></div>
                    </div>
                    <div class="palette-category">
                        <div class="category-title">Obstacles</div>
                        <div id="obstacleTiles" class="tile-grid"></div>
                    </div>
                    <div class="palette-category">
                        <div class="category-title">Hiding Spots</div>
                        <div id="hidingTiles" class="tile-grid"></div>
                    </div>
                    <div class="palette-category">
                        <div class="category-title">Special</div>
                        <div id="specialTiles" class="tile-grid"></div>
                    </div>
                </div>
                
                <!-- Entities Palette -->
                <div id="entitiesPalette" class="palette-content">
                    <div class="palette-category">
                        <div class="category-title">Characters</div>
                        <div id="characterTiles" class="tile-grid"></div>
                    </div>
                </div>
                
                <!-- Items Palette -->
                <div id="itemsPalette" class="palette-content">
                    <div class="palette-category">
                        <div class="category-title">Collectibles</div>
                        <div id="collectibleTiles" class="tile-grid"></div>
                    </div>
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
                    <div>Position: <span id="cursorPosition">0,0</span></div>
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
                            ${MISSION_GOALS.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group" id="timeLimitGroup" style="display: none;">
                        <label>Time Limit (turns):</label>
                        <input type="number" id="timeLimitInput" min="10" max="100" value="20">
                    </div>
                    
                    <div class="editor-title" style="margin-top: 20px;">RULES</div>
                    <div class="rules-checklist" id="rulesChecklist">
                        ${MISSION_RULES.map(rule => `
                            <label class="checkbox-item">
                                <input type="checkbox" value="${rule.id}"> ${rule.name}
                            </label>
                        `).join('')}
                    </div>
                    
                    <div class="editor-title" style="margin-top: 20px;">MAP INFO</div>
                    <div class="map-stats" id="mapStats">
                        <div>Player: <span id="playerStat">Not placed</span></div>
                        <div>Exit: <span id="exitStat">Not placed</span></div>
                        <div>Enemies: <span id="enemyStat">0</span></div>
                        <div>Coins: <span id="coinStat">0</span></div>
                        <div>Scrolls: <span id="scrollStat">0</span></div>
                    </div>
                    
                    <div class="editor-title" style="margin-top: 20px;">EXPORT</div>
                    <textarea id="jsonOutput" class="json-preview" readonly placeholder="JSON will appear here..."></textarea>
                    
                    <div class="editor-actions">
                        <button class="editor-action-btn" onclick="saveToLocalStorage()">💾 SAVE DRAFT</button>
                        <button class="editor-action-btn" onclick="loadFromLocalStorage()">📂 LOAD DRAFT</button>
                        <button class="editor-action-btn primary" onclick="exportMissionJSON()">📤 EXPORT JSON</button>
                        <button class="editor-action-btn" onclick="importMissionJSON()">📥 IMPORT JSON</button>
                        <button class="editor-action-btn" onclick="testMission()">▶️ TEST MISSION</button>
                        <button class="editor-action-btn" onclick="backToMainMenu()">← BACK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(editorScreen);
    
    // Set up event listeners for form inputs
    document.getElementById('missionGoalSelect').addEventListener('change', updateGoalSettings);
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
    document.getElementById('missionStoryInput').addEventListener('input', function() {
        editorState.missionStory = this.value;
    });
    document.getElementById('timeLimitInput').addEventListener('input', function() {
        editorState.timeLimit = parseInt(this.value) || 20;
    });
    
    // Populate tile palette
    updatePaletteDisplay();
}

// Update palette display based on current category
function updatePaletteDisplay() {
    // Clear all grids
    document.getElementById('walkableTiles').innerHTML = '';
    document.getElementById('obstacleTiles').innerHTML = '';
    document.getElementById('hidingTiles').innerHTML = '';
    document.getElementById('specialTiles').innerHTML = '';
    document.getElementById('characterTiles').innerHTML = '';
    document.getElementById('collectibleTiles').innerHTML = '';
    
    // Populate walkable tiles
    TILE_PALETTE.walkable.forEach(tile => {
        createTileButton(tile, 'walkableTiles');
    });
    
    // Populate obstacle tiles
    TILE_PALETTE.obstacles.forEach(tile => {
        createTileButton(tile, 'obstacleTiles');
    });
    
    // Populate hiding tiles
    TILE_PALETTE.hiding.forEach(tile => {
        createTileButton(tile, 'hidingTiles');
    });
    
    // Populate special tiles
    TILE_PALETTE.special.forEach(tile => {
        createTileButton(tile, 'specialTiles');
    });
    
    // Populate characters
    TILE_PALETTE.characters.forEach(tile => {
        createTileButton(tile, 'characterTiles');
    });
    
    // Populate collectibles (already in special, but we can add more)
    const collectibles = TILE_PALETTE.special.filter(t => t.id === TILE_TYPES.COIN || t.id === TILE_TYPES.SCROLL);
    collectibles.forEach(tile => {
        createTileButton(tile, 'collectibleTiles');
    });
}

// Create a tile button
function createTileButton(tile, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const tileBtn = document.createElement('div');
    tileBtn.className = 'tile-btn';
    tileBtn.dataset.tileId = tile.id;
    tileBtn.title = tile.name;
    
    // Check if we have a sprite for this tile
    const hasSprite = loadedSprites[tile.sprite];
    
    tileBtn.innerHTML = `
        <div class="tile-icon">
            ${hasSprite ? 
                `<img src="${hasSprite.src || ''}" alt="${tile.name}" style="width: 32px; height: 32px;">` : 
                `<div style="width: 32px; height: 32px; background-color: ${tile.color};"></div>`
            }
        </div>
        <div class="tile-name">${tile.name}</div>
    `;
    
    tileBtn.onclick = (e) => {
        e.stopPropagation();
        selectTile(tile.id, tile.isEntity);
    };
    
    container.appendChild(tileBtn);
}

// Switch palette category
function switchPalette(category) {
    editorState.currentPalette = category;
    
    // Update active tab
    document.querySelectorAll('.palette-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.palette-tab[onclick*="${category}"]`).classList.add('active');
    
    // Update active content
    document.querySelectorAll('.palette-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(category + 'Palette').classList.add('active');
}

// Select a tile
function selectTile(tileId, isEntity = false) {
    editorState.selectedTile = tileId;
    
    // Update UI
    document.querySelectorAll('.tile-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedBtn = document.querySelector(`[data-tile-id="${tileId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
    
    // Update status display
    let tileName = "Unknown";
    if (isEntity) {
        const entity = TILE_PALETTE.characters.find(t => t.id === tileId);
        if (entity) tileName = entity.name;
    } else {
        // Search through all tile categories
        for (const category of Object.values(TILE_PALETTE)) {
            if (Array.isArray(category)) {
                const tile = category.find(t => t.id === tileId);
                if (tile) {
                    tileName = tile.name;
                    break;
                }
            }
        }
    }
    
    document.getElementById('selectedTileName').textContent = tileName;
    
    console.log("Selected tile:", tileId, tileName);
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
    document.getElementById('currentToolName').textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
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
    
    updateValidation();
    updateMapStats();
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
    updateValidation();
}

// Randomize walls
function randomizeWalls() {
    const width = editorState.mapWidth;
    const height = editorState.mapHeight;
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            // Don't randomize special positions
            if ((editorState.playerStart && x === editorState.playerStart.x && y === editorState.playerStart.y) ||
                (editorState.exitPos && x === editorState.exitPos.x && y === editorState.exitPos.y)) {
                continue;
            }
            
            // Check if this tile has an item or enemy
            const hasItem = editorState.items.some(item => item.x === x && item.y === y);
            const hasEnemy = editorState.enemies.some(enemy => enemy.x === x && enemy.y === y);
            
            if (!hasItem && !hasEnemy) {
                editorState.tiles[y][x] = Math.random() < 0.2 ? TILE_TYPES.WALL1 : TILE_TYPES.FLOOR1;
            }
        }
    }
    
    renderEditor();
}

// Clear map
function clearMap() {
    if (confirm("Clear the entire map? This will remove all tiles, enemies, and items.")) {
        createEmptyMap();
    }
}

// Resize map
function resizeMap() {
    const widthInput = document.getElementById('mapWidthInput');
    const heightInput = document.getElementById('mapHeightInput');
    
    const newWidth = Math.min(20, Math.max(8, parseInt(widthInput.value) || 12));
    const newHeight = Math.min(20, Math.max(8, parseInt(heightInput.value) || 12));
    
    // Update state
    editorState.mapWidth = newWidth;
    editorState.mapHeight = newHeight;
    
    // Create new empty tiles array
    const newTiles = Array(newHeight).fill().map(() => Array(newWidth).fill(TILE_TYPES.FLOOR1));
    
    // Copy existing tiles that fit
    for (let y = 0; y < Math.min(newHeight, editorState.tiles.length); y++) {
        for (let x = 0; x < Math.min(newWidth, editorState.tiles[0].length); x++) {
            newTiles[y][x] = editorState.tiles[y][x];
        }
    }
    
    editorState.tiles = newTiles;
    
    // Filter out enemies and items that are out of bounds
    editorState.enemies = editorState.enemies.filter(e => 
        e.x >= 0 && e.x < newWidth && e.y >= 0 && e.y < newHeight
    );
    editorState.items = editorState.items.filter(item => 
        item.x >= 0 && item.x < newWidth && item.y >= 0 && item.y < newHeight
    );
    
    // Check player and exit positions
    if (editorState.playerStart && 
        (editorState.playerStart.x >= newWidth || editorState.playerStart.y >= newHeight)) {
        editorState.playerStart = null;
    }
    if (editorState.exitPos && 
        (editorState.exitPos.x >= newWidth || editorState.exitPos.y >= newHeight)) {
        editorState.exitPos = null;
    }
    
    // Add border walls
    addBorderWalls();
    
    // Update canvas size
    updateCanvasSize();
    
    renderEditor();
    updateValidation();
    updateMapStats();
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
    
    // Update grid overlay
    const gridOverlay = document.getElementById('gridOverlay');
    if (gridOverlay) {
        const cellSize = tileSize;
        gridOverlay.style.backgroundSize = `${cellSize}px ${cellSize}px`;
        gridOverlay.style.backgroundImage = 
            `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`;
    }
}

// Setup editor event listeners
function setupEditorEvents() {
    if (!editorCanvas) return;
    
    // Mouse events
    editorCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    editorCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    editorCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    editorCanvas.addEventListener('mouseleave', handleCanvasMouseUp);
    
    // Touch events for mobile
    editorCanvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    editorCanvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
    editorCanvas.addEventListener('touchend', handleCanvasTouchEnd);
    editorCanvas.addEventListener('touchcancel', handleCanvasTouchEnd);
    
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
    
    // Update cursor position display
    editorCanvas.addEventListener('mousemove', updateCursorPosition);
    editorCanvas.addEventListener('touchmove', updateCursorPosition);
}

// Get canvas coordinates from mouse/touch event
function getCanvasCoordinates(event) {
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

// Update cursor position display
function updateCursorPosition(e) {
    const pos = getCanvasCoordinates(e);
    if (pos) {
        document.getElementById('cursorPosition').textContent = `${pos.x},${pos.y}`;
    }
}

// Handle canvas mouse down
function handleCanvasMouseDown(e) {
    e.preventDefault();
    editorState.isDragging = true;
    
    const pos = getCanvasCoordinates(e);
    if (pos) {
        editorState.lastTile = { x: pos.x, y: pos.y };
        placeTile(pos.x, pos.y);
    }
}

// Handle canvas mouse move
function handleCanvasMouseMove(e) {
    e.preventDefault();
    
    const pos = getCanvasCoordinates(e);
    if (!pos) return;
    
    // Highlight hovered tile
    renderEditor();
    if (editorState.gridVisible) {
        drawTileHighlight(pos.x, pos.y, '#ffffff40');
    }
    
    // Draw while dragging
    if (editorState.isDragging && editorState.lastTile && 
        (pos.x !== editorState.lastTile.x || pos.y !== editorState.lastTile.y)) {
        placeTile(pos.x, pos.y);
        editorState.lastTile = { x: pos.x, y: pos.y };
    }
}

// Handle canvas mouse up
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
    
    // Handle entity placement (player, enemies)
    if (typeof selected === 'string') {
        if (selected === 'player') {
            // Set player start
            setPlayerStart(x, y);
            return;
        } else if (selected.startsWith('enemy_')) {
            // Add enemy
            const enemyType = selected.replace('enemy_', '').toUpperCase();
            addEnemy(x, y, enemyType);
            return;
        }
    }
    
    // Handle tools
    if (editorState.currentTool === 'eraser') {
        // Erase tile
        eraseTile(x, y);
        return;
    } else if (editorState.currentTool === 'fill') {
        // Fill tool
        fillArea(x, y, selected);
        return;
    }
    
    // Remove any existing enemy/item at this position
    removeEntityAt(x, y);
    
    // Handle special tile placements
    if (selected === TILE_TYPES.EXIT) {
        // Set exit position
        setExitPos(x, y);
    } else if (selected === TILE_TYPES.COIN) {
        // Add coin item
        addItem(x, y, 'coin');
    } else if (selected === TILE_TYPES.SCROLL) {
        // Add scroll item
        addItem(x, y, 'scroll');
    } else {
        // Regular tile
        editorState.tiles[y][x] = selected;
    }
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Erase tile
function eraseTile(x, y) {
    // Remove tile
    editorState.tiles[y][x] = TILE_TYPES.FLOOR1;
    
    // Remove any entity at this position
    removeEntityAt(x, y);
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Fill area with tile
function fillArea(startX, startY, tileId) {
    const targetTile = editorState.tiles[startY][startX];
    if (targetTile === tileId) return;
    
    const visited = new Set();
    const queue = [{x: startX, y: startY}];
    
    while (queue.length > 0) {
        const {x, y} = queue.shift();
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        if (x < 0 || x >= editorState.mapWidth || y < 0 || y >= editorState.mapHeight) continue;
        if (editorState.tiles[y][x] !== targetTile) continue;
        
        visited.add(key);
        editorState.tiles[y][x] = tileId;
        
        // Remove any entity at this position
        removeEntityAt(x, y);
        
        // Add neighbors
        queue.push({x: x+1, y});
        queue.push({x: x-1, y});
        queue.push({x, y: y+1});
        queue.push({x, y: y-1});
    }
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Add enemy
function addEnemy(x, y, type) {
    // Remove any existing entity at this position
    removeEntityAt(x, y);
    
    // Add enemy
    editorState.enemies.push({ x, y, type });
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Set player start
function setPlayerStart(x, y) {
    // Remove any existing entity at this position
    removeEntityAt(x, y);
    
    editorState.playerStart = { x, y };
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Set exit position
function setExitPos(x, y) {
    // Remove any existing entity at this position
    removeEntityAt(x, y);
    
    editorState.exitPos = { x, y };
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Add item
function addItem(x, y, type) {
    // Remove any existing entity at this position
    removeEntityAt(x, y);
    
    editorState.items.push({ x, y, type });
    
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Remove any entity at position
function removeEntityAt(x, y) {
    // Remove enemy
    editorState.enemies = editorState.enemies.filter(e => !(e.x === x && e.y === y));
    
    // Remove item
    editorState.items = editorState.items.filter(item => !(item.x === x && item.y === y));
    
    // Remove player start
    if (editorState.playerStart && editorState.playerStart.x === x && editorState.playerStart.y === y) {
        editorState.playerStart = null;
    }
    
    // Remove exit
    if (editorState.exitPos && editorState.exitPos.x === x && editorState.exitPos.y === y) {
        editorState.exitPos = null;
    }
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
            const tile = editorState.tiles[y][x];
            drawTile(x, y, tile);
        }
    }
    
    // Draw grid
    if (editorState.gridVisible) {
        drawGrid();
    }
    
    // Draw enemies
    editorState.enemies.forEach(enemy => {
        drawEntity(enemy.x, enemy.y, enemy.type);
    });
    
    // Draw items
    editorState.items.forEach(item => {
        drawEntity(item.x, item.y, item.type);
    });
    
    // Draw player start
    if (editorState.playerStart) {
        drawEntity(editorState.playerStart.x, editorState.playerStart.y, 'player');
    }
    
    // Draw exit
    if (editorState.exitPos) {
        drawEntity(editorState.exitPos.x, editorState.exitPos.y, 'exit');
    }
}

// Draw a tile
function drawTile(x, y, tileId) {
    // Find tile definition
    let tileDef = null;
    for (const category of Object.values(TILE_PALETTE)) {
        if (Array.isArray(category)) {
            tileDef = category.find(t => t.id === tileId);
            if (tileDef) break;
        }
    }
    
    if (!tileDef) {
        tileDef = { color: '#ff00ff', name: 'Unknown' }; // Fallback
    }
    
    const tx = x * tileSize;
    const ty = y * tileSize;
    
    // Draw tile background
    editorCtx.fillStyle = tileDef.color + '40';
    editorCtx.fillRect(tx, ty, tileSize, tileSize);
    
    // Draw tile border
    editorCtx.strokeStyle = tileDef.color + '80';
    editorCtx.lineWidth = 1;
    editorCtx.strokeRect(tx, ty, tileSize, tileSize);
    
    // Try to draw sprite if available
    if (tileDef.sprite && loadedSprites[tileDef.sprite]) {
        const sprite = loadedSprites[tileDef.sprite];
        editorCtx.drawImage(sprite, tx, ty, tileSize, tileSize);
    } else {
        // Fallback: draw colored square
        editorCtx.fillStyle = tileDef.color;
        editorCtx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
    }
}

// Draw an entity (enemy, item, player, exit)
function drawEntity(x, y, type) {
    const tx = x * tileSize;
    const ty = y * tileSize;
    
    let spriteName, color, isCharacter = false;
    
    switch(type) {
        case 'player':
            spriteName = 'player';
            color = '#00d2ff';
            isCharacter = true;
            break;
        case 'exit':
            spriteName = 'exit';
            color = '#0f0';
            break;
        case 'coin':
            spriteName = 'coin';
            color = '#ffd700';
            break;
        case 'scroll':
            spriteName = 'scroll';
            color = '#9932cc';
            break;
        case 'NORMAL':
            spriteName = 'guard';
            color = '#ff3333';
            isCharacter = true;
            break;
        case 'ARCHER':
            spriteName = 'archer';
            color = '#33cc33';
            isCharacter = true;
            break;
        case 'SPEAR':
            spriteName = 'spear';
            color = '#3366ff';
            isCharacter = true;
            break;
        default:
            spriteName = 'unknown';
            color = '#fff';
    }
    
    // Draw background for characters
    if (isCharacter) {
        editorCtx.fillStyle = color + '40';
        editorCtx.beginPath();
        editorCtx.arc(tx + tileSize/2, ty + tileSize/2, tileSize/2 - 2, 0, Math.PI * 2);
        editorCtx.fill();
        
        editorCtx.strokeStyle = color + '80';
        editorCtx.lineWidth = 2;
        editorCtx.beginPath();
        editorCtx.arc(tx + tileSize/2, ty + tileSize/2, tileSize/2 - 2, 0, Math.PI * 2);
        editorCtx.stroke();
    }
    
    // Draw sprite if available
    if (loadedSprites[spriteName]) {
        const sprite = loadedSprites[spriteName];
        editorCtx.drawImage(sprite, tx, ty, tileSize, tileSize);
    } else {
        // Fallback: draw colored circle/square
        if (isCharacter) {
            editorCtx.fillStyle = color;
            editorCtx.beginPath();
            editorCtx.arc(tx + tileSize/2, ty + tileSize/2, tileSize/3, 0, Math.PI * 2);
            editorCtx.fill();
        } else {
            editorCtx.fillStyle = color;
            editorCtx.fillRect(tx + 4, ty + 4, tileSize - 8, tileSize - 8);
        }
        
        // Draw type indicator
        editorCtx.fillStyle = '#fff';
        editorCtx.font = 'bold ' + (tileSize/3) + 'px Arial';
        editorCtx.textAlign = 'center';
        editorCtx.textBaseline = 'middle';
        editorCtx.fillText(type.charAt(0), tx + tileSize/2, ty + tileSize/2);
    }
}

// Draw grid
function drawGrid() {
    editorCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    editorCtx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= editorState.mapWidth; x++) {
        editorCtx.beginPath();
        editorCtx.moveTo(x * tileSize, 0);
        editorCtx.lineTo(x * tileSize, editorState.mapHeight * tileSize);
        editorCtx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= editorState.mapHeight; y++) {
        editorCtx.beginPath();
        editorCtx.moveTo(0, y * tileSize);
        editorCtx.lineTo(editorState.mapWidth * tileSize, y * tileSize);
        editorCtx.stroke();
    }
}

// Draw tile highlight
function drawTileHighlight(x, y, color) {
    const tx = x * tileSize;
    const ty = y * tileSize;
    
    editorCtx.fillStyle = color;
    editorCtx.fillRect(tx, ty, tileSize, tileSize);
}

// Update validation
function updateValidation() {
    const validationEl = document.getElementById('validationMessage');
    if (!validationEl) return;
    
    let messages = [];
    
    // Check requirements
    if (!editorState.playerStart) {
        messages.push("⚠️ No player start position set");
    }
    if (!editorState.exitPos) {
        messages.push("⚠️ No exit position set");
    }
    
    // Check for steal goal requirements
    if (editorState.missionGoal === 'steal') {
        const hasScroll = editorState.items.some(item => item.type === 'scroll');
        if (!hasScroll) {
            messages.push("⚠️ Steal goal requires at least one scroll item");
        }
    }
    
    // Check for coin collection requirements
    if (editorState.missionGoal === 'collect_all_coins') {
        const coinCount = editorState.items.filter(item => item.type === 'coin').length;
        if (coinCount === 0) {
            messages.push("⚠️ Coin collection goal requires at least one coin");
        }
    }
    
    // Check map connectivity (basic)
    if (editorState.playerStart && editorState.exitPos) {
        const startX = editorState.playerStart.x;
        const startY = editorState.playerStart.y;
        const exitX = editorState.exitPos.x;
        const exitY = editorState.exitPos.y;
        
        // Check if start or exit are on walls
        const isWallTile = (x, y) => {
            const tile = editorState.tiles[y][x];
            return tile === TILE_TYPES.WALL1 || tile === TILE_TYPES.WALL2 || 
                   tile === TILE_TYPES.WATER || tile === TILE_TYPES.TREE1 || 
                   tile === TILE_TYPES.TREE2;
        };
        
        if (isWallTile(startX, startY)) {
            messages.push("❌ Player start is on an impassable tile!");
        }
        if (isWallTile(exitX, exitY)) {
            messages.push("❌ Exit is on an impassable tile!");
        }
    }
    
    // Update validation display
    if (messages.length > 0) {
        validationEl.innerHTML = messages.join('<br>');
        validationEl.className = 'validation-message warning';
    } else {
        validationEl.innerHTML = "✅ Map is valid!";
        validationEl.className = 'validation-message success';
    }
    
    // Update JSON preview
    updateJSONPreview();
}

// Update map statistics
function updateMapStats() {
    const playerStat = document.getElementById('playerStat');
    const exitStat = document.getElementById('exitStat');
    const enemyStat = document.getElementById('enemyStat');
    const coinStat = document.getElementById('coinStat');
    const scrollStat = document.getElementById('scrollStat');
    
    if (playerStat) playerStat.textContent = editorState.playerStart ? 
        `(${editorState.playerStart.x},${editorState.playerStart.y})` : 'Not placed';
    
    if (exitStat) exitStat.textContent = editorState.exitPos ? 
        `(${editorState.exitPos.x},${editorState.exitPos.y})` : 'Not placed';
    
    if (enemyStat) enemyStat.textContent = editorState.enemies.length;
    
    const coinCount = editorState.items.filter(item => item.type === 'coin').length;
    const scrollCount = editorState.items.filter(item => item.type === 'scroll').length;
    
    if (coinStat) coinStat.textContent = coinCount;
    if (scrollStat) scrollStat.textContent = scrollCount;
}

// Update JSON preview
function updateJSONPreview() {
    const jsonOutput = document.getElementById('jsonOutput');
    if (!jsonOutput) return;
    
    try {
        const missionData = getMissionData();
        jsonOutput.value = JSON.stringify(missionData, null, 2);
    } catch (error) {
        jsonOutput.value = "Error generating JSON: " + error.message;
    }
}

// Get mission data for export
function getMissionData() {
    // Update form values to state
    updateEditorStateFromForm();
    
    // Convert tiles to numeric IDs
    const exportTiles = editorState.tiles.map(row => 
        row.map(tile => typeof tile === 'number' ? tile : TILE_TYPES.FLOOR1)
    );
    
    return {
        name: editorState.missionName,
        story: editorState.missionStory,
        goal: editorState.missionGoal,
        rules: editorState.missionRules,
        timeLimit: editorState.timeLimit,
        width: editorState.mapWidth,
        height: editorState.mapHeight,
        tiles: exportTiles,
        playerStart: editorState.playerStart,
        exit: editorState.exitPos,
        enemies: editorState.enemies,
        items: editorState.items,
        difficulty: "medium",
        createdAt: new Date().toISOString(),
        version: "1.0"
    };
}

// Update editor state from form
function updateEditorStateFromForm() {
    editorState.missionName = document.getElementById('missionNameInput').value || "New Mission";
    editorState.missionStory = document.getElementById('missionStoryInput').value;
    editorState.missionGoal = document.getElementById('missionGoalSelect').value;
    editorState.timeLimit = parseInt(document.getElementById('timeLimitInput').value) || 20;
    
    // Get checked rules
    editorState.missionRules = [];
    document.querySelectorAll('#rulesChecklist input:checked').forEach(checkbox => {
        editorState.missionRules.push(checkbox.value);
    });
}

// Update goal settings
function updateGoalSettings() {
    const goal = document.getElementById('missionGoalSelect').value;
    const timeLimitGroup = document.getElementById('timeLimitGroup');
    
    if (goal === 'time_trial') {
        timeLimitGroup.style.display = 'block';
    } else {
        timeLimitGroup.style.display = 'none';
    }
}

// Export mission as JSON
function exportMissionJSON() {
    updateEditorStateFromForm();
    
    try {
        const missionData = getMissionData();
        const jsonString = JSON.stringify(missionData, null, 2);
        
        // Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(jsonString).then(() => {
                alert("Mission JSON copied to clipboard!\n\nYou can save it as a .json file and load it in the game.");
            }).catch(err => {
                // Fallback if clipboard fails
                copyToClipboardFallback(jsonString);
            });
        } else {
            // Fallback for non-HTTPS or older browsers
            copyToClipboardFallback(jsonString);
        }
        
        // Also show in textarea
        const jsonOutput = document.getElementById('jsonOutput');
        if (jsonOutput) {
            jsonOutput.value = jsonString;
        }
        
    } catch (error) {
        alert("Error exporting mission: " + error.message);
    }
}

// Fallback clipboard copy
function copyToClipboardFallback(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        alert("Mission JSON copied to clipboard!");
    } catch (err) {
        alert("Failed to copy to clipboard. Please copy the JSON from the textarea below.");
    }
    
    document.body.removeChild(textArea);
}

// Import mission from JSON
function importMissionJSON() {
    const jsonString = prompt("Paste your mission JSON here:");
    if (!jsonString) return;
    
    try {
        const missionData = JSON.parse(jsonString);
        loadMissionData(missionData);
        alert("Mission imported successfully!");
    } catch (error) {
        alert("Error importing mission: " + error.message);
    }
}

// Load mission data into editor
function loadMissionData(data) {
    // Basic validation
    if (!data.width || !data.height || !data.tiles) {
        throw new Error("Invalid mission data");
    }
    
    // Update dimensions
    editorState.mapWidth = Math.min(20, Math.max(8, data.width));
    editorState.mapHeight = Math.min(20, Math.max(8, data.height));
    
    // Update form inputs
    document.getElementById('mapWidthInput').value = editorState.mapWidth;
    document.getElementById('mapHeightInput').value = editorState.mapHeight;
    
    // Load tiles
    editorState.tiles = Array(editorState.mapHeight).fill().map(() => Array(editorState.mapWidth).fill(TILE_TYPES.FLOOR1));
    
    for (let y = 0; y < Math.min(editorState.mapHeight, data.tiles.length); y++) {
        for (let x = 0; x < Math.min(editorState.mapWidth, data.tiles[y].length); x++) {
            editorState.tiles[y][x] = data.tiles[y][x] || TILE_TYPES.FLOOR1;
        }
    }
    
    // Load entities
    editorState.playerStart = data.playerStart || null;
    editorState.exitPos = data.exit || null;
    editorState.enemies = data.enemies || [];
    editorState.items = data.items || [];
    
    // Load mission info
    editorState.missionName = data.name || "New Mission";
    editorState.missionStory = data.story || "";
    editorState.missionGoal = data.goal || "escape";
    editorState.missionRules = data.rules || [];
    editorState.timeLimit = data.timeLimit || 20;
    
    // Update form
    document.getElementById('missionNameInput').value = editorState.missionName;
    document.getElementById('missionStoryInput').value = editorState.missionStory;
    document.getElementById('missionGoalSelect').value = editorState.missionGoal;
    document.getElementById('timeLimitInput').value = editorState.timeLimit;
    
    // Update rules checkboxes
    document.querySelectorAll('#rulesChecklist input').forEach(checkbox => {
        checkbox.checked = editorState.missionRules.includes(checkbox.value);
    });
    
    // Update UI
    updateGoalSettings();
    updateCanvasSize();
    renderEditor();
    updateValidation();
    updateMapStats();
}

// Save to localStorage
function saveToLocalStorage() {
    updateEditorStateFromForm();
    
    try {
        const missionData = getMissionData();
        localStorage.setItem('stealthGame_editorDraft', JSON.stringify(missionData));
        alert("Draft saved to browser storage!");
    } catch (error) {
        alert("Error saving draft: " + error.message);
    }
}

// Load from localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('stealthGame_editorDraft');
    if (!saved) {
        alert("No saved draft found in browser storage.");
        return;
    }
    
    try {
        const missionData = JSON.parse(saved);
        loadMissionData(missionData);
        alert("Draft loaded from browser storage!");
    } catch (error) {
        alert("Error loading draft: " + error.message);
    }
}

// Test mission
function testMission() {
    updateEditorStateFromForm();
    
    // Validate mission
    if (!editorState.playerStart) {
        alert("Cannot test mission: No player start position set");
        return;
    }
    if (!editorState.exitPos) {
        alert("Cannot test mission: No exit position set");
        return;
    }
    
    // Get mission data
    const missionData = getMissionData();
    
    // Hide editor
    document.getElementById('mapEditorScreen').classList.add('hidden');
    
    // Start the mission
    if (typeof startCustomMission === 'function') {
        startCustomMission(missionData);
    } else {
        alert("Error: Game functions not available. Please reload the page.");
        document.getElementById('mapEditorScreen').classList.remove('hidden');
    }
}

// Initialize when page loads
window.addEventListener('load', function() {
    // Override the showMapEditor function
    window.showMapEditor = initMapEditor;
    
    console.log("Map Editor loaded and ready");
    
    // Add CSS for new editor components
    if (!document.querySelector('style#editor-styles')) {
        const style = document.createElement('style');
        style.id = 'editor-styles';
        style.textContent = `
            .palette-tabs {
                display: flex;
                margin-bottom: 10px;
                border-bottom: 1px solid #444;
            }
            
            .palette-tab {
                flex: 1;
                background: #222;
                border: none;
                border-bottom: 2px solid transparent;
                color: #aaa;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
                text-align: center;
            }
            
            .palette-tab:hover {
                background: #2a2a2a;
                color: #ccc;
            }
            
            .palette-tab.active {
                border-bottom-color: var(--accent);
                color: #fff;
                background: #2a1a1a;
            }
            
            .palette-content {
                display: none;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .palette-content.active {
                display: block;
            }
            
            .palette-category {
                margin-bottom: 15px;
            }
            
            .category-title {
                font-size: 11px;
                color: var(--accent);
                margin-bottom: 5px;
                padding-left: 5px;
                border-left: 2px solid var(--accent);
            }
            
            .tile-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 5px;
                margin-bottom: 10px;
            }
            
            .tile-grid .tile-btn {
                min-height: 60px;
                padding: 8px 4px;
            }
            
            .tile-grid .tile-icon img {
                width: 24px;
                height: 24px;
                object-fit: contain;
            }
            
            .tile-grid .tile-name {
                font-size: 9px;
                margin-top: 3px;
            }
            
            .editor-status {
                background: rgba(0, 0, 0, 0.3);
                padding: 8px;
                border-radius: 6px;
                margin-top: 10px;
                font-size: 12px;
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .editor-status div {
                color: #aaa;
            }
            
            .editor-status span {
                color: #fff;
                font-weight: bold;
            }
            
            .map-stats {
                background: rgba(0, 0, 0, 0.3);
                padding: 10px;
                border-radius: 6px;
                font-size: 12px;
            }
            
            .map-stats div {
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
            }
            
            .map-stats div:last-child {
                margin-bottom: 0;
            }
            
            .map-stats span {
                color: var(--green);
                font-weight: bold;
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .editor-container {
                    flex-direction: column;
                }
                
                .editor-left, .editor-right {
                    width: 100%;
                    max-height: 300px;
                }
                
                .editor-center {
                    min-height: 300px;
                }
                
                .tile-grid {
                    grid-template-columns: repeat(4, 1fr);
                }
                
                .editor-tools {
                    grid-template-columns: repeat(6, 1fr);
                }
                
                .editor-actions {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .editor-status {
                    flex-direction: column;
                    gap: 5px;
                }
            }
            
            /* Touch optimizations */
            .tile-btn:active,
            .tool-btn-small:active,
            .editor-action-btn:active {
                transform: scale(0.95);
                transition: transform 0.1s;
            }
            
            /* Better scrollbars for mobile */
            .palette-content::-webkit-scrollbar {
                width: 4px;
            }
            
            .palette-content::-webkit-scrollbar-thumb {
                background: var(--accent);
                border-radius: 2px;
            }
        `;
        document.head.appendChild(style);
    }
});