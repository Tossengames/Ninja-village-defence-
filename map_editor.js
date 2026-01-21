// ============================================
// MAP EDITOR - MOBILE FIXED VERSION (FULL)
// ============================================

/* ============================================================
   🔧 FIX 1: INJECT REQUIRED CSS (NO HTML CHANGES)
============================================================ */
(function injectEditorCSS() {
    if (document.getElementById('map-editor-style')) return;

    const style = document.createElement('style');
    style.id = 'map-editor-style';
    style.textContent = `
    :root { --accent:#d4af37; }

    .overlay-screen{
        position:fixed; inset:0;
        background:#050505;
        z-index:999;
        color:#fff;
        font-family:Arial,sans-serif;
    }
    .hidden{display:none}

    .editor-container{
        display:grid;
        grid-template-columns:260px 1fr 260px;
        height:100%;
    }
    .editor-panel{
        background:#0f0f0f;
        padding:10px;
        overflow-y:auto;
    }
    .editor-left{border-right:1px solid #222}
    .editor-right{border-left:1px solid #222}

    .editor-title{
        font-weight:bold;
        margin-bottom:8px;
        color:var(--accent);
    }

    .tile-palette{
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:8px;
    }
    .tile-btn{
        background:#1a1a1a;
        border:1px solid #333;
        border-radius:6px;
        padding:6px;
        cursor:pointer;
        text-align:center;
    }
    .tile-btn.selected{
        outline:2px solid var(--accent);
    }
    .tile-icon{
        height:30px;
        border-radius:4px;
        margin-bottom:4px;
    }

    .editor-tools{
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:6px;
    }
    .tool-btn-small{
        background:#1c1c1c;
        border:1px solid #333;
        border-radius:6px;
        padding:6px;
        cursor:pointer;
        font-size:12px;
        text-align:center;
    }
    .tool-btn-small.active{
        background:#2a2a2a;
        border-color:var(--accent);
    }

    .editor-center{
        display:flex;
        flex-direction:column;
        background:#080808;
    }
    .editor-canvas-container{
        flex:1;
        display:flex;
        align-items:center;
        justify-content:center;
    }
    #editorCanvas{
        background:#111;
        border:1px solid #333;
        touch-action:none;
    }
    .editor-status{
        display:flex;
        justify-content:space-between;
        padding:6px 10px;
        background:#111;
        font-size:12px;
    }

    .editor-action-btn{
        width:100%;
        margin-top:6px;
        padding:8px;
        border:none;
        border-radius:6px;
        background:#333;
        color:#fff;
        cursor:pointer;
    }
    .editor-action-btn.primary{
        background:var(--accent);
        color:#000;
    }
    `;
    document.head.appendChild(style);
})();

/* ============================================================
   🧠 ORIGINAL SCRIPT STARTS (UNCHANGED LOGIC)
============================================================ */

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

// ALL TILES
const ALL_TILES = [
    { id: TILE_TYPES.FLOOR1, name: "Floor 1", color: "#666" },
    { id: TILE_TYPES.FLOOR2, name: "Floor 2", color: "#777" },
    { id: TILE_TYPES.GRASS1, name: "Grass", color: "#33aa33" },
    { id: TILE_TYPES.WALL1, name: "Wall 1", color: "#888" },
    { id: TILE_TYPES.WALL2, name: "Wall 2", color: "#999" },
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

/* ============================================================
   🔧 FIX 2: CANVAS OFFSET (NO CLICK DESYNC)
============================================================ */
const _renderEditor = renderEditor;
renderEditor = function () {
    if (!editorCtx || !editorCanvas) return;

    editorCtx.fillStyle = '#111';
    editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);

    const offsetX = (editorCanvas.width - editorState.mapWidth * tileSize) / 2;
    const offsetY = (editorCanvas.height - editorState.mapHeight * tileSize) / 2;

    editorCtx.save();
    editorCtx.translate(offsetX, offsetY);

    for (let y = 0; y < editorState.mapHeight; y++) {
        for (let x = 0; x < editorState.mapWidth; x++) {
            drawTile(x, y, editorState.tiles[y][x]);
        }
    }

    drawGrid();
    editorState.enemies.forEach(e => drawEntity(e.x, e.y, e.type));
    editorState.items.forEach(i => drawEntity(i.x, i.y, i.type));
    if (editorState.playerStart) drawEntity(editorState.playerStart.x, editorState.playerStart.y, 'player');
    if (editorState.exitPos) drawEntity(editorState.exitPos.x, editorState.exitPos.y, 'exit');

    editorCtx.restore();
};

/* ============================================================
   🔧 FIX 3: EXPORT JSON = REAL MAP + COPY BUTTON
============================================================ */
exportMissionJSON = function () {
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
        createdAt: new Date().toISOString(),
        version: "1.0"
    };

    const json = JSON.stringify(missionData, null, 2);

    const popup = document.createElement('div');
    popup.style.cssText = `
        position:fixed; inset:10%;
        background:#111; border:2px solid var(--accent);
        padding:10px; z-index:9999;
        display:flex; flex-direction:column;
    `;

    popup.innerHTML = `
        <h3 style="color:var(--accent)">Mission JSON</h3>
        <textarea id="missionJsonOut" style="flex:1;background:#222;color:#fff">${json}</textarea>
        <button class="editor-action-btn primary">COPY</button>
        <button class="editor-action-btn">CLOSE</button>
    `;

    popup.querySelector('.primary').onclick = () => {
        const t = popup.querySelector('#missionJsonOut');
        t.select();
        document.execCommand('copy');
        alert('JSON copied');
    };

    popup.querySelectorAll('.editor-action-btn')[1].onclick = () => popup.remove();
    document.body.appendChild(popup);
};