const TILE = 60;
const FLOOR = 0, WALL = 1, HIDE = 2, EXIT = 3, COIN = 5, TRAP = 6, RICE = 7, BOMB = 8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let showHighlights = true;
let lastHighlightTime = 0;
let highlightedTiles = [];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
assetNames.forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => { sprites[n] = img; };
});

// Mode colors for highlighting
const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' }
};

function log(msg, color="#aaa") {
    const logDiv = document.getElementById('missionLog');
    const d = document.createElement('div');
    d.style.color = color;
    d.innerText = `> ${msg}`;
    logDiv.prepend(d);
    if(logDiv.children.length > 5) logDiv.lastChild.remove();
}

function centerCamera() {
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
    clampCamera();
}

function clampCamera() {
    const mapSize = mapDim * TILE * zoom;
    const pad = 100;
    camX = Math.min(pad, Math.max(camX, canvas.width - mapSize - pad));
    camY = Math.min(pad, Math.max(camY, canvas.height - mapSize - pad));
}

function initGame() {
    mapDim = Math.min(20, Math.max(8, parseInt(document.getElementById('mapSize').value) || 12));
    showHighlights = document.getElementById('showHighlights').checked;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    
    if(showHighlights) {
        document.getElementById('modeIndicator').classList.remove('hidden');
        document.getElementById('rangeIndicator').classList.remove('hidden');
    }
    
    generateLevel();
    centerCamera();
    updateToolCounts();
    updateModeIndicator();
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    
    grid = Array.from({length: mapDim}, (_, y) => 
        Array.from({length: mapDim}, (_, x) => 
            (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : 
            Math.random() < 0.18 ? WALL : 
            Math.random() < 0.08 ? HIDE : FLOOR
        )
    );
    
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    // Add some coins
    for(let i = 0; i < 3; i++) {
        let cx, cy;
        do {
            cx = rand(mapDim);
            cy = rand(mapDim);
        } while(grid[cy][cx] !== FLOOR || Math.hypot(cx-player.x, cy-player.y) < 3);
        grid[cy][cx] = COIN;
    }
    
    enemies = [];
    const gc = Math.min(15, Math.max(1, parseInt(document.getElementById('guardCount').value) || 5));
    for(let i=0; i<gc; i++){
        let ex, ey; 
        do { 
            ex = rand(mapDim); 
            ey = rand(mapDim); 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        enemies.push({
            x: ex, y: ey, 
            ax: ex, ay: ey, 
            dir: {x: 1, y: 0}, 
            alive: true, 
            range: 4, 
            distracted: 0, 
            alert: false
        });
    }
}

function rand(m) { return Math.floor(Math.random()*(m-2))+1; }

function drawSprite(n, x, y) { 
    if(sprites[n]) ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE); 
}

function drawTileHighlight(x, y, colorSet, pulse = true) {
    const time = Date.now() / 1000;
    const pulseFactor = pulse ? (Math.sin(time * 6) * 0.1 + 0.9) : 1;
    
    // Inner glow
    ctx.fillStyle = colorSet.fill;
    ctx.fillRect(x*TILE + 4, y*TILE + 4, TILE - 8, TILE - 8);
    
    // Border
    ctx.strokeStyle = colorSet.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(x*TILE + 2, y*TILE + 2, TILE - 4, TILE - 4);
    
    // Outer glow
    ctx.strokeStyle = colorSet.glow;
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
        const offset = i * 2 * pulseFactor;
        ctx.strokeRect(
            x*TILE + 1 - offset, 
            y*TILE + 1 - offset, 
            TILE - 2 + offset*2, 
            TILE - 2 + offset*2
        );
    }
    
    // Corner accents
    ctx.fillStyle = colorSet.border;
    const cornerSize = 6;
    ctx.fillRect(x*TILE + 2, y*TILE + 2, cornerSize, 2);
    ctx.fillRect(x*TILE + 2, y*TILE + 2, 2, cornerSize);
    ctx.fillRect(x*TILE + TILE - cornerSize - 2, y*TILE + 2, cornerSize, 2);
    ctx.fillRect(x*TILE + TILE - 2, y*TILE + 2, 2, cornerSize);
    ctx.fillRect(x*TILE + 2, y*TILE + TILE - 2, cornerSize, 2);
    ctx.fillRect(x*TILE + 2, y*TILE + TILE - cornerSize - 2, 2, cornerSize);
    ctx.fillRect(x*TILE + TILE - cornerSize - 2, y*TILE + TILE - 2, cornerSize, 2);
    ctx.fillRect(x*TILE + TILE - 2, y*TILE + TILE - cornerSize - 2, 2, cornerSize);
}

function calculateHighlightedTiles() {
    highlightedTiles = [];
    if(!showHighlights || !playerTurn) return;
    
    const range = 2;
    const colorSet = modeColors[selectMode];
    
    for(let dy = -range; dy <= range; dy++) {
        for(let dx = -range; dx <= range; dx++) {
            const tx = player.x + dx;
            const ty = player.y + dy;
            
            if(tx < 0 || ty < 0 || tx >= mapDim || ty >= mapDim) continue;
            
            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            if(dist > range) continue;
            
            const tile = grid[ty][tx];
            
            if(selectMode === 'move') {
                if(tile !== WALL && tile !== undefined) {
                    highlightedTiles.push({
                        x: tx, y: ty, 
                        color: colorSet,
                        type: tile === EXIT ? 'exit' : 
                              tile === HIDE ? 'hide' : 
                              tile === COIN ? 'coin' : 'move'
                    });
                }
            } else {
                if(tile === FLOOR) {
                    highlightedTiles.push({
                        x: tx, y: ty, 
                        color: colorSet,
                        type: selectMode
                    });
                }
            }
        }
    }
}

function gameLoop() {
    if(gameOver) return;
    
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; 
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    const s = (Math.random()-0.5)*shake;
    ctx.translate(camX+s, camY+s); 
    ctx.scale(zoom, zoom);

    // Draw floor and walls
    for(let y=0; y<mapDim; y++) {
        for(let x=0; x<mapDim; x++) {
            drawSprite('floor', x, y);
            const c = grid[y][x];
            if(c !== FLOOR) {
                const spriteMap = ['','wall','hide','exit','','coin','trap','rice','bomb'];
                drawSprite(spriteMap[c] || '', x, y);
            }
        }
    }

    // Calculate and draw highlights
    if(showHighlights && playerTurn) {
        calculateHighlightedTiles();
        highlightedTiles.forEach(tile => {
            drawTileHighlight(tile.x, tile.y, tile.color);
            
            // Add special icons for special tiles
            if(tile.type === 'exit') {
                ctx.fillStyle = "rgba(0, 255, 100, 0.3)";
                ctx.fillRect(tile.x*TILE + 15, tile.y*TILE + 15, TILE - 30, TILE - 30);
            } else if(tile.type === 'coin') {
                ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
                ctx.beginPath();
                ctx.arc(tile.x*TILE + TILE/2, tile.y*TILE + TILE/2, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Draw enemies
    enemies.forEach(e => {
        if(!e.alive) return;
        
        // Draw guard
        drawSprite('guard', e.ax, e.ay);
        
        // Draw vision cone with gradient
        if(!player.isHidden) {
            const gradient = ctx.createRadialGradient(
                e.ax*TILE + 30, e.ay*TILE + 30, 10,
                e.ax*TILE + 30, e.ay*TILE + 30, e.range * TILE
            );
            gradient.addColorStop(0, 'rgba(255, 50, 50, 0.2)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(e.ax*TILE + 30, e.ay*TILE + 30);
            
            const baseA = Math.atan2(e.dir.y, e.dir.x);
            for(let a = baseA - 0.7; a <= baseA + 0.7; a += 0.1) {
                let d = 0;
                while(d < e.range) { 
                    d += 0.2; 
                    const checkX = Math.floor(e.x + Math.cos(a) * d);
                    const checkY = Math.floor(e.y + Math.sin(a) * d);
                    if(grid[checkY]?.[checkX] === WALL) break;
                }
                ctx.lineTo(
                    e.ax*TILE + 30 + Math.cos(a) * d * TILE, 
                    e.ay*TILE + 30 + Math.sin(a) * d * TILE
                );
            }
            ctx.closePath();
            ctx.fill();
        }
    });

    // Draw player with shadow
    ctx.shadowColor = player.isHidden ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 15;
    drawSprite('player', player.ax, player.ay);
    ctx.shadowBlur = 0;

    // Draw active bombs with timer
    activeBombs.forEach(b => {
        drawSprite('bomb', b.x, b.y);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.t.toString(), b.x*TILE + TILE/2, b.y*TILE + TILE/2 + 7);
    });

    // Draw minimap
    if(showMinimap) {
        ctx.setTransform(1,0,0,1,0,0);
        const ms = 5;
        const mx = canvas.width - mapDim * ms - 20;
        const my = 75;
        
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(mx-5, my, mapDim*ms+10, mapDim*ms+10);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.strokeRect(mx-5, my, mapDim*ms+10, mapDim*ms+10);
        
        for(let y=0; y<mapDim; y++) {
            for(let x=0; x<mapDim; x++) {
                if(grid[y][x] === WALL) {
                    ctx.fillStyle = "#666";
                    ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
                } else if(grid[y][x] === EXIT) {
                    ctx.fillStyle = "#0f0";
                    ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
                }
            }
        }
        
        // Player on minimap
        ctx.fillStyle = "#00d2ff";
        ctx.beginPath();
        ctx.arc(mx + player.x*ms + ms/2, my + 5 + player.y*ms + ms/2, ms/2, 0, Math.PI*2);
        ctx.fill();
        
        // Enemies on minimap
        enemies.filter(e => e.alive).forEach(e => {
            ctx.fillStyle = "#ff3333";
            ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
        });
    }
    
    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}

function toggleMinimap() { 
    showMinimap = !showMinimap; 
    log(showMinimap ? "Minimap ON" : "Minimap OFF", "#aaa");
}

function toggleHighlights() { 
    showHighlights = !showHighlights; 
    document.getElementById('modeIndicator').classList.toggle('hidden', !showHighlights);
    document.getElementById('rangeIndicator').classList.toggle('hidden', !showHighlights);
    log(showHighlights ? "Highlights ON" : "Highlights OFF", showHighlights ? "#0f0" : "#f00");
}

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    const modeName = selectMode.toUpperCase();
    indicator.innerHTML = `Mode: <span class="mode-name">${modeName}</span>`;
    
    // Update color based on mode
    const colors = {
        'move': '#00d2ff',
        'trap': '#ff6464',
        'rice': '#ffff64',
        'bomb': '#ff3296'
    };
    indicator.style.borderLeftColor = colors[selectMode] || '#00d2ff';
}

function updateToolCounts() {
    document.getElementById('trapCount').textContent = inv.trap;
    document.getElementById('riceCount').textContent = inv.rice;
    document.getElementById('bombCount').textContent = inv.bomb;
}

async function endTurn() {
    // Process Bombs
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if(b.t <= 0) { 
            exploding.push(b); 
            return false; 
        }
        return true;
    });

    exploding.forEach(b => {
        grid[b.y][b.x] = FLOOR; 
        shake = 20; 
        log("BOOM!", "#f44");
        enemies.forEach(e => { 
            if(Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1) { 
                e.alive=false; 
                stats.kills++;
                log("Guard eliminated!", "#0f0");
            }
        });
    });

    // Process Guards
    for(let e of enemies.filter(g => g.alive)) {
        if(grid[e.y][e.x] === TRAP) { 
            e.alive=false; 
            grid[e.y][e.x]=FLOOR; 
            log("Guard Trapped!", "#ff0");
            stats.kills++;
            continue; 
        }
        
        if(e.distracted > 0) { 
            e.distracted--; 
            if(e.distracted === 0) log("Guard no longer distracted", "#aaa");
            continue; 
        }

        // Check for rice distraction
        if(grid[e.y][e.x] === RICE) {
            e.distracted = 3;
            grid[e.y][e.x] = FLOOR;
            log("Guard distracted by rice!", "#ff0");
            stats.itemsUsed++;
            continue;
        }

        let nx = e.x, ny = e.y;
        const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const d = moves[Math.floor(Math.random()*4)];
        if(grid[e.y+d.y]?.[e.x+d.x] === FLOOR) { 
            nx += d.x; 
            ny += d.y; 
        }

        await new Promise(r => animMove(e, nx, ny, 0.2, r));

        if(!player.isHidden && hasLineOfSight(e, player.x, player.y)) {
            gameOver = true; 
            document.getElementById('gameOverScreen').classList.remove('hidden');
            log("YOU WERE SPOTTED!", "#f00");
            return;
        }
    }
    
    turnCount++; 
    playerTurn = true;
    if(showHighlights) calculateHighlightedTiles();
}

function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax, sy = obj.ay; 
    let p = 0;
    
    if(obj !== player) {
        obj.dir = {
            x: Math.sign(tx-obj.x) || obj.dir.x, 
            y: Math.sign(ty-obj.y) || obj.dir.y
        };
    }
    
    function step() {
        p += speed; 
        obj.ax = sx + (tx - sx) * p; 
        obj.ay = sy + (ty - sy) * p;
        if(p < 1) {
            requestAnimationFrame(step);
        } else { 
            obj.x = tx; 
            obj.y = ty; 
            obj.ax = tx; 
            obj.ay = ty; 
            cb(); 
        }
    }
    step();
}

function hasLineOfSight(e, px, py) {
    const dx = px - e.x, dy = py - e.y, dist = Math.hypot(dx, dy);
    if(dist > e.range) return false;
    
    for(let d = 0.5; d < dist; d += 0.5) {
        const checkX = Math.floor(e.x + (dx/dist) * d);
        const checkY = Math.floor(e.y + (dy/dist) * d);
        if(grid[checkY]?.[checkX] === WALL) return false;
    }
    return true;
}

let lastDist = 0, isDragging = false, lastTouch = {x:0, y:0};

canvas.addEventListener('touchstart', e => {
    if(e.touches.length === 2) {
        lastDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY
        );
    } else {
        isDragging = false;
        lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
    }
}, {passive: false});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if(e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY
        );
        zoom = Math.min(2, Math.max(0.5, zoom * (dist/lastDist)));
        lastDist = dist;
    } else {
        const dx = e.touches[0].pageX - lastTouch.x;
        const dy = e.touches[0].pageY - lastTouch.y;
        if(Math.hypot(dx, dy) > 10) { 
            isDragging = true; 
            camX += dx; 
            camY += dy; 
            lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
        }
    }
    clampCamera();
}, {passive: false});

canvas.addEventListener('touchend', e => {
    if(isDragging || !playerTurn || gameOver || e.touches.length > 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((lastTouch.x - rect.left - camX)/zoom)/TILE);
    const ty = Math.floor(((lastTouch.y - rect.top - camY)/zoom)/TILE);
    
    if(grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    const isValidMove = highlightedTiles.some(t => t.x === tx && t.y === ty);

    if(selectMode === 'move' && dist <= 2 && isValidMove) {
        playerTurn = false;
        animMove(player, tx, ty, 0.2, () => {
            player.isHidden = (grid[ty][tx] === HIDE);
            
            if(grid[ty][tx] === COIN) { 
                stats.coins++; 
                grid[ty][tx] = FLOOR; 
                log("Found Gold!", "#ff0");
            }
            
            if(grid[ty][tx] === EXIT) { 
                gameOver = true; 
                document.getElementById('resultScreen').classList.remove('hidden');
                showVictoryStats();
            }
            endTurn();
        });
    } else if(selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR && isValidMove) {
        if(selectMode === 'trap' && inv.trap > 0) {
            grid[ty][tx] = TRAP;
            inv.trap--;
            stats.itemsUsed++;
            log("Trap set!", "#0f0");
        } else if(selectMode === 'rice' && inv.rice > 0) {
            grid[ty][tx] = RICE;
            inv.rice--;
            stats.itemsUsed++;
            log("Rice scattered!", "#ff0");
        } else if(selectMode === 'bomb' && inv.bomb > 0) {
            activeBombs.push({x: tx, y: ty, t: 3});
            inv.bomb--;
            stats.itemsUsed++;
            log("Bomb placed! (3 turns)", "#f00");
        } else {
            log("No more items!", "#f00");
            return;
        }
        
        updateToolCounts();
        playerTurn = false; 
        endTurn();
    } else if(!isValidMove) {
        log("Out of range!", "#f00");
    }
});

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
    updateModeIndicator();
    if(showHighlights) calculateHighlightedTiles();
}

function playerWait() { 
    if(playerTurn) { 
        playerTurn = false; 
        log("Waiting...", "#aaa");
        endTurn(); 
    } 
}

function showVictoryStats() {
    const statsTable = document.getElementById('statsTable');
    const rankLabel = document.getElementById('rankLabel');
    
    // Calculate rank
    let rank = "Novice";
    let score = stats.kills * 100 + stats.coins * 50 - turnCount * 5 - stats.itemsUsed * 10;
    
    if(score > 500) rank = "Grand Master";
    else if(score > 300) rank = "Expert";
    else if(score > 150) rank = "Adept";
    
    rankLabel.textContent = rank;
    
    statsTable.innerHTML = `
        <div><span>Turns:</span><span>${turnCount}</span></div>
        <div><span>Guards Eliminated:</span><span>${stats.kills}</span></div>
        <div><span>Gold Collected:</span><span>${stats.coins}</span></div>
        <div><span>Items Used:</span><span>${stats.itemsUsed}</span></div>
        <div><span>Final Score:</span><span>${score}</span></div>
    `;
}

// Initialize UI on load
window.addEventListener('load', () => {
    // Add highlight toggle button
    const uiControls = document.getElementById('ui-controls');
    if(!document.getElementById('highlightToggle')) {
        const btn = document.createElement('button');
        btn.id = 'highlightToggle';
        btn.onclick = toggleHighlights;
        btn.textContent = '✨ Highlights';
        uiControls.appendChild(btn);
    }
});