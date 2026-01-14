// ============================================
// CORE GAME ENGINE - MAIN LOGIC & RENDERING
// ============================================

const TILE = 60;
const FLOOR = 0, WALL = 1, HIDE = 2, EXIT = 3, COIN = 5, TRAP = 6, RICE = 7, BOMB = 8;

// Global game state
let grid, player, enemies = [], activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let showHighlights = true;
let showLog = true;
let highlightedTiles = [];
let hasReachedExit = false;
let currentEnemyTurn = null;
let combatMode = false;
let combatSequence = false;
let combatLog = [];

// Player stats
let playerHP = 10;
let playerMaxHP = 10;

// VFX Systems
let particles = [];
let bloodStains = [];
let coinPickupEffects = [];
let hideEffects = [];
let explosionEffects = [];
let footstepEffects = [];
let damageEffects = [];
let unitTexts = [];
let speechBubbles = []; // New: Cartoon-style speech bubbles
let soundQueue = [];

// Canvas and rendering
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// Audio context for programmatic SFX
let audioContext;
let gainNode;

// Mode colors for highlighting
const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' },
    'attack': { fill: 'rgba(255, 0, 0, 0.3)', border: 'rgba(255, 0, 0, 0.8)', glow: 'rgba(255, 0, 0, 0.5)' }
};

// Enemy types with distinct colors
const ENEMY_TYPES = {
    NORMAL: { range: 1, hp: 10, speed: 0.08, damage: 2, color: '#ff3333', tint: 'rgba(255, 50, 50, 0.3)' },
    ARCHER: { range: 3, hp: 8, speed: 0.06, damage: 1, color: '#33cc33', tint: 'rgba(50, 255, 50, 0.3)' },
    SPEAR: { range: 2, hp: 12, speed: 0.07, damage: 3, color: '#3366ff', tint: 'rgba(50, 100, 255, 0.3)' }
};

// ============================================
// AUDIO SYSTEM (Programmatic SFX)
// ============================================

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.3;
    } catch (e) {
        console.log("Audio not supported:", e);
    }
}

function playSound(type, options = {}) {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(gainNode);
        
        switch(type) {
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.5);
                gain.gain.setValueAtTime(0.5, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.7);
                break;
                
            case 'coin':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1046.5, audioContext.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
                
            case 'step':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
                
            case 'death':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.8);
                gain.gain.setValueAtTime(0.4, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.8);
                break;
        }
        
    } catch (e) {
        console.log("Sound error:", e);
    }
}

// ============================================
// VFX SYSTEMS
// ============================================

function createFootstepEffect(x, y) {
    for(let i = 0; i < 3; i++) {
        particles.push({
            x: x * TILE + TILE/2 + (Math.random() - 0.5) * 15,
            y: y * TILE + TILE/2 + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 0.8,
            color: `rgba(200, 200, 200, ${Math.random() * 0.5 + 0.3})`,
            size: Math.random() * 3 + 2,
            gravity: 0.1
        });
    }
    
    if(Math.random() < 0.3) {
        playSound('step');
    }
}

function createSpeechBubble(x, y, text, color = "#ffffff", duration = 2) {
    speechBubbles.push({
        x: x * TILE + TILE/2,
        y: y * TILE - 50,
        text: text,
        color: color,
        life: duration,
        maxLife: duration,
        scale: 0,
        vy: -0.3
    });
}

function updateVFX() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0.2;
        p.life -= 0.03;
        return p.life > 0;
    });
    
    speechBubbles = speechBubbles.filter(b => {
        b.life -= 0.03;
        b.scale = Math.min(1, (b.maxLife - b.life) * 2);
        if(b.life < 0.3) {
            b.scale = b.life / 0.3;
        }
        b.y += b.vy;
        return b.life > 0;
    });
    
    damageEffects = damageEffects.filter(d => {
        d.y -= 1;
        d.life -= 0.03;
        return d.life > 0;
    });
    
    unitTexts = unitTexts.filter(t => {
        t.y += t.vy;
        t.life -= 0.03;
        return t.life > 0;
    });
}

function drawVFX() {
    particles.forEach(p => {
        ctx.fillStyle = p.color.replace('0.8', p.life.toString());
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    speechBubbles.forEach(b => {
        const alpha = b.life * 0.8;
        const fontSize = Math.floor(10 * b.scale);
        
        // Bubble background
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 20 * b.scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Bubble border
        ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Text
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.text, b.x, b.y);
    });
    
    damageEffects.forEach(d => {
        ctx.fillStyle = d.color.replace('1.0', d.life.toString());
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText(d.value, d.x, d.y);
    });
    
    unitTexts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.font = `bold ${t.size}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.text, t.x, t.y);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(t.text, t.x + 1, t.y + 1);
    });
}

// ============================================
// INITIALIZATION
// ============================================

function initGame() {
    mapDim = Math.min(20, Math.max(8, parseInt(document.getElementById('mapSize').value) || 12));
    
    hasReachedExit = false;
    playerHP = playerMaxHP;
    combatMode = false;
    combatSequence = false;
    
    particles = [];
    speechBubbles = [];
    unitTexts = [];
    
    showHighlights = true;
    showLog = true;
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('rangeIndicator').classList.remove('hidden');
    document.getElementById('logToggle').classList.remove('hidden');
    document.getElementById('hpDisplay').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    
    generateLevel();
    centerCamera();
    updateToolCounts();
    updateHPDisplay();
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
    
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false, dir: {x: 0, y: 0} };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    for(let i = 0; i < 3; i++) {
        let cx, cy;
        do {
            cx = rand(mapDim);
            cy = rand(mapDim);
        } while(grid[cy][cx] !== FLOOR || Math.hypot(cx-player.x, cy-player.y) < 3);
        grid[cy][cx] = COIN;
    }
    
    const gc = Math.min(15, Math.max(1, parseInt(document.getElementById('guardCount').value) || 5));
    enemies = [];
    for(let i=0; i<gc; i++){
        let ex, ey; 
        do { 
            ex = rand(mapDim); 
            ey = rand(mapDim); 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        
        const visionRange = Math.floor(Math.random() * 3) + 1;
        
        const typeRoll = Math.random();
        let enemyType, enemyStats;
        if(typeRoll < 0.6) {
            enemyType = 'NORMAL';
            enemyStats = ENEMY_TYPES.NORMAL;
        } else if(typeRoll < 0.85) {
            enemyType = 'SPEAR';
            enemyStats = ENEMY_TYPES.SPEAR;
        } else {
            enemyType = 'ARCHER';
            enemyStats = ENEMY_TYPES.ARCHER;
        }
        
        enemies.push({
            x: ex, y: ey, 
            ax: ex, ay: ey, 
            dir: {x: 1, y: 0}, 
            alive: true,
            hp: enemyStats.hp,
            maxHP: enemyStats.hp,
            type: enemyType,
            attackRange: enemyStats.range,
            damage: enemyStats.damage,
            speed: enemyStats.speed,
            visionRange: visionRange,
            state: 'patrolling',
            investigationTarget: null,
            investigationTurns: 0,
            thought: '',
            thoughtTimer: 0,
            poisonTimer: 0,
            poisonCounter: 0,
            hearingRange: 6,
            hasHeardSound: false,
            soundLocation: null,
            returnToPatrolPos: {x: ex, y: ey},
            lastSeenPlayer: null,
            chaseTurns: 0,
            color: enemyStats.color,
            tint: enemyStats.tint
        });
    }
}

function rand(m) { return Math.floor(Math.random()*(m-2))+1; }

// ============================================
// SPRITE LOADING
// ============================================

function loadSprites() {
    const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
    assetNames.forEach(n => {
        const img = new Image();
        img.src = `sprites/${n}.png`;
        img.onload = () => { sprites[n] = img; };
        img.onerror = () => { console.warn(`Failed to load sprite: ${n}.png`); };
    });
}

// ============================================
// RENDERING ENGINE
// ============================================

function drawSprite(n, x, y) { 
    if(sprites[n]) {
        ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE);
    } else {
        ctx.fillStyle = '#666';
        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    }
}

function calculateHighlightedTiles() {
    highlightedTiles = [];
    if(!playerTurn) return;
    
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
            } else if(selectMode === 'attack') {
                if(dist === 1 && (tile === FLOOR || tile === HIDE)) {
                    highlightedTiles.push({
                        x: tx, y: ty,
                        color: colorSet,
                        type: 'attack'
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

    if(playerTurn) {
        calculateHighlightedTiles();
        highlightedTiles.forEach(tile => {
            drawTileHighlight(tile.x, tile.y, tile.color);
        });
    }

    enemies.forEach(e => {
        if(!e.alive) return;
        
        ctx.fillStyle = e.tint;
        ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        
        const healthPercent = e.hp / e.maxHP;
        ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.25 ? "#ff0" : "#f00";
        ctx.fillRect(e.ax * TILE + 5, e.ay * TILE - 8, (TILE - 10) * healthPercent, 4);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(e.ax * TILE + 5, e.ay * TILE - 8, TILE - 10, 4);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(e.hp.toString(), e.ax * TILE + TILE/2, e.ay * TILE - 4);
        
        ctx.fillStyle = e.color;
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(e.type.charAt(0), e.ax * TILE + 3, e.ay * TILE + 10);
        
        if(e.state === 'alerted' || e.state === 'chasing') {
            ctx.fillStyle = "rgba(255, 50, 50, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        } else if(e.state === 'investigating') {
            ctx.fillStyle = "rgba(255, 200, 50, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        } else if(e.state === 'eating') {
            ctx.fillStyle = "rgba(50, 255, 50, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        }
        
        drawSprite('guard', e.ax, e.ay);
        
        if(!player.isHidden && e.state !== 'dead') {
            drawVisionCone(e);
        }
    });

    drawVFX();

    const playerHealthPercent = playerHP / playerMaxHP;
    ctx.fillStyle = playerHealthPercent > 0.5 ? "#0f0" : playerHealthPercent > 0.25 ? "#ff0" : "#f00";
    ctx.fillRect(player.ax * TILE + 5, player.ay * TILE - 8, (TILE - 10) * playerHealthPercent, 4);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(player.ax * TILE + 5, player.ay * TILE - 8, TILE - 10, 4);
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(playerHP.toString(), player.ax * TILE + TILE/2, player.ay * TILE - 4);

    ctx.shadowColor = player.isHidden ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 15;
    drawSprite('player', player.ax, player.ay);
    ctx.shadowBlur = 0;

    activeBombs.forEach(b => {
        drawSprite('bomb', b.x, b.y);
        ctx.fillStyle = b.t <= 1 ? "#ff0000" : "#ffffff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.t.toString(), b.x*TILE + TILE/2, b.y*TILE + TILE/2 + 7);
    });

    if(showMinimap) {
        drawMinimap();
    }
    
    updateVFX();
    
    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}

function drawTileHighlight(x, y, colorSet, pulse = true) {
    const time = Date.now() / 1000;
    const pulseFactor = pulse ? (Math.sin(time * 6) * 0.1 + 0.9) : 1;
    
    ctx.fillStyle = colorSet.fill;
    ctx.fillRect(x*TILE + 4, y*TILE + 4, TILE - 8, TILE - 8);
    
    ctx.strokeStyle = colorSet.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(x*TILE + 2, y*TILE + 2, TILE - 4, TILE - 4);
    
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
}

function drawVisionCone(e) {
    const drawRange = e.visionRange || 2;
    
    const gradient = ctx.createRadialGradient(
        e.ax * TILE + 30, e.ay * TILE + 30, 5,
        e.ax * TILE + 30, e.ay * TILE + 30, drawRange * TILE
    );
    
    if(e.state === 'alerted' || e.state === 'chasing') {
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
        gradient.addColorStop(0.3, 'rgba(255, 50, 50, 0.4)');
        gradient.addColorStop(0.7, 'rgba(255, 100, 100, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 150, 150, 0)');
    } else if(e.state === 'investigating') {
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.5)');
        gradient.addColorStop(0.3, 'rgba(255, 195, 50, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 215, 100, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 235, 150, 0)');
    } else if(e.state === 'eating') {
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.5)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.4)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 150, 0.2)');
        gradient.addColorStop(0.7, 'rgba(255, 200, 200, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(e.ax * TILE + 30, e.ay * TILE + 30, drawRange * TILE, 0, Math.PI * 2);
    ctx.fill();
}

function drawMinimap() {
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
    
    ctx.fillStyle = "#00d2ff";
    ctx.beginPath();
    ctx.arc(mx + player.x*ms + ms/2, my + 5 + player.y*ms + ms/2, ms/2, 0, Math.PI*2);
    ctx.fill();
    
    enemies.filter(e => e.alive).forEach(e => {
        const enemyColor = e.state === 'alerted' || e.state === 'chasing' ? e.color :
                          e.state === 'investigating' ? "#ff9900" :
                          e.state === 'eating' ? "#00ff00" : e.color;
        ctx.fillStyle = enemyColor;
        ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
    });
}

// ============================================
// CAMERA & UI FUNCTIONS
// ============================================

function centerCamera() {
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
    clampCamera();
}

function centerOnUnit(x, y) {
    camX = (canvas.width/2) - (x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (y*TILE + TILE/2)*zoom;
    clampCamera();
}

function clampCamera() {
    const mapSize = mapDim * TILE * zoom;
    const pad = Math.min(100, canvas.width * 0.1);
    camX = Math.min(pad, Math.max(camX, canvas.width - mapSize - pad));
    camY = Math.min(pad, Math.max(camY, canvas.height - mapSize - pad));
}

function toggleMinimap() { 
    showMinimap = !showMinimap; 
    log("Minimap toggled", showMinimap ? "#0f0" : "#f00");
}

function toggleLog() {
    showLog = !showLog;
    document.getElementById('missionLog').style.display = showLog ? 'flex' : 'none';
    log("Log toggled", showLog ? "#0f0" : "#f00");
}

function updateToolCounts() {
    document.getElementById('trapCount').textContent = inv.trap;
    document.getElementById('riceCount').textContent = inv.rice;
    document.getElementById('bombCount').textContent = inv.bomb;
}

function updateHPDisplay() {
    document.getElementById('playerHP').textContent = `${playerHP}/${playerMaxHP}`;
}

// ============================================
// TURN PROCESSING
// ============================================

async function endTurn() {
    if(hasReachedExit) {
        turnCount++; 
        playerTurn = true;
        return;
    }
    
    // Process Bombs first
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if(b.t <= 0) { 
            exploding.push(b); 
            return false; 
        }
        return true;
    });

    for(let b of exploding) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        grid[b.y][b.x] = FLOOR; 
        shake = 20; 
        
        // Alert nearby enemies to the sound
        enemies.forEach(e => {
            if(e.alive && e.state !== 'dead') {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                if(dist <= e.hearingRange) {
                    e.hasHeardSound = true;
                    e.soundLocation = {x: b.x, y: b.y};
                    e.investigationTurns = 5;
                    e.state = 'investigating';
                    createSpeechBubble(e.x, e.y, "What was that?", "#ff9900");
                }
            }
        });
        
        const enemiesInBlast = enemies.filter(e => 
            e.alive && Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1
        );
        
        for(let e of enemiesInBlast) {
            await new Promise(resolve => setTimeout(resolve, 300));
            e.alive = false; 
            e.state = 'dead';
            stats.kills++;
            createSpeechBubble(e.x, e.y, "💀", "#ff0000");
        }
    }

    // Process all enemies with random delays
    for(let e of enemies.filter(g => g.alive)) {
        currentEnemyTurn = e;
        centerOnUnit(e.x, e.y);
        
        // Random wait before enemy moves (300-1200ms)
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 900));
        
        await processEnemyTurn(e);
        
        // Wait after enemy moves
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    currentEnemyTurn = null;
    centerCamera();
    
    // Small wait before returning to player
    await new Promise(resolve => setTimeout(resolve, 300));
    
    turnCount++; 
    playerTurn = true;
}

async function processCombatSequence(playerAttack, enemy, playerDamage = 2) {
    combatSequence = true;
    
    // Player attacks first
    createSpeechBubble(player.x, player.y, "🗡️ ATTACK!", "#00d2ff", 1.5);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    enemy.hp -= playerDamage;
    createSpeechBubble(enemy.x, enemy.y, `-${playerDamage}`, "#ff0000", 1.5);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if(enemy.hp <= 0) {
        enemy.alive = false;
        enemy.state = 'dead';
        stats.kills++;
        createSpeechBubble(enemy.x, enemy.y, "💀", "#ff0000", 2);
        combatSequence = false;
        return true;
    }
    
    // Enemy counterattacks if in range
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if(dist <= enemy.attackRange) {
        createSpeechBubble(enemy.x, enemy.y, `${enemy.type} ATTACK!`, enemy.color, 1.5);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        playerHP -= enemy.damage;
        createSpeechBubble(player.x, player.y, `-${enemy.damage}`, "#ff66ff", 1.5);
        updateHPDisplay();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if(playerHP <= 0) {
            gameOver = true;
            document.getElementById('gameOverScreen').classList.remove('hidden');
            showGameOverStats();
            combatSequence = false;
            return false;
        }
    }
    
    combatSequence = false;
    return false;
}

// ============================================
// INPUT HANDLING
// ============================================

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
        handlePlayerMove(tx, ty);
    } else if(selectMode === 'attack' && dist === 1 && isValidMove) {
        handleAttack(tx, ty);
    } else if(selectMode !== 'move' && selectMode !== 'attack' && dist <= 2 && grid[ty][tx] === FLOOR && isValidMove) {
        handleItemPlacement(tx, ty, selectMode);
    } else if(!isValidMove) {
        log("Out of range!", "#f00");
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(msg, color="#aaa") {
    if(!showLog) return;
    
    const logDiv = document.getElementById('missionLog');
    const d = document.createElement('div');
    d.style.color = color;
    d.innerText = `> ${msg}`;
    logDiv.prepend(d);
    if(logDiv.children.length > 5) logDiv.lastChild.remove();
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
        
        if(Math.random() < 0.5 && obj === player) {
            createFootstepEffect(sx + (tx - sx) * p, sy + (ty - sy) * p);
        }
        
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

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
}

function autoSwitchToMove() {
    setMode('move');
}

function playerWait() { 
    if(playerTurn) { 
        playerTurn = false; 
        createSpeechBubble(player.x, player.y, "⏳ WAITING", "#aaaaaa", 1.5);
        endTurn(); 
    } 
}

function showVictoryStats() {
    document.getElementById('resultScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    const statsTable = document.getElementById('statsTable');
    const rankLabel = document.getElementById('rankLabel');
    
    // Calculate score
    let score = Math.max(0, stats.kills * 100 + stats.coins * 50 - turnCount * 5 - stats.itemsUsed * 10);
    
    // Tenchu-style rankings
    let rank = "Novice";
    let rankDescription = "";
    let rankColor = "#888";
    
    if(score >= 1000) {
        rank = "Grand Master";
        rankDescription = "Perfect stealth, maximum efficiency";
        rankColor = "#ffd700";
    } else if(score >= 750) {
        rank = "Shadow Master";
        rankDescription = "Flawless execution, unseen and unheard";
        rankColor = "#c0c0c0";
    } else if(score >= 500) {
        rank = "Master Ninja";
        rankDescription = "Superior technique, few could match";
        rankColor = "#cd7f32";
    } else if(score >= 350) {
        rank = "Expert";
        rankDescription = "Skilled infiltration, clean work";
        rankColor = "#00ff00";
    } else if(score >= 200) {
        rank = "Adept";
        rankDescription = "Competent performance, room for improvement";
        rankColor = "#00ccff";
    } else if(score >= 100) {
        rank = "Assassin";
        rankDescription = "Ruthless but sloppy";
        rankColor = "#ff4444";
    } else if(score >= 50) {
        rank = "Initiate";
        rankDescription = "Basic skills shown";
        rankColor = "#aaa";
    } else {
        rank = "Novice";
        rankDescription = "Survived, but barely";
        rankColor = "#888";
    }
    
    // Set rank text
    rankLabel.textContent = rank;
    rankLabel.style.color = rankColor;
    rankLabel.style.textShadow = `0 0 20px ${rankColor}80`;
    
    // Show detailed stats
    statsTable.innerHTML = `
        <div><span>MISSION COMPLETE</span><span></span></div>
        <div><span>Turns Taken:</span><span>${turnCount}</span></div>
        <div><span>Guards Eliminated:</span><span>${stats.kills}</span></div>
        <div><span>Gold Collected:</span><span>${stats.coins}</span></div>
        <div><span>Items Used:</span><span>${stats.itemsUsed}</span></div>
        <div><span>Final Health:</span><span>${playerHP}/${playerMaxHP}</span></div>
        <div style="border-top: 1px solid rgba(255,255,255,0.2); margin-top: 10px; padding-top: 10px;">
            <span>Final Score:</span><span style="color: ${rankColor}; font-weight: bold;">${score}</span>
        </div>
        <div style="font-size: 12px; margin-top: 15px; color: #aaa; font-style: italic;">${rankDescription}</div>
    `;
}

function showGameOverStats() {
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
    
    const statsTable = document.getElementById('statsTable');
    
    statsTable.innerHTML = `
        <div><span>MISSION FAILED</span><span></span></div>
        <div><span>You were defeated!</span><span></span></div>
        <div><span>Turns Survived:</span><span>${turnCount}</span></div>
        <div><span>Guards Eliminated:</span><span>${stats.kills}</span></div>
        <div><span>Gold Collected:</span><span>${stats.coins}</span></div>
        <div style="font-size: 12px; margin-top: 15px; color: #aaa; font-style: italic;">Better luck next time!</div>
    `;
}

// ============================================
// LINE OF SIGHT CHECKING - FIXED
// ============================================

function hasLineOfSight(e, px, py) {
    if(hasReachedExit) return false;
    
    const dx = px - e.x;
    const dy = py - e.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if(distance > e.visionRange) return false;
    
    // Check if anything blocks the line
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for(let i = 1; i <= steps; i++) {
        const tx = Math.round(e.x + (dx / steps) * i);
        const ty = Math.round(e.y + (dy / steps) * i);
        
        if(tx === px && ty === py) break; // Reached target
        
        if(tx < 0 || tx >= mapDim || ty < 0 || ty >= mapDim) return false;
        if(grid[ty][tx] === WALL) return false;
    }
    
    return true;
}

// ============================================
// INITIALIZATION ON LOAD
// ============================================

window.addEventListener('load', () => {
    loadSprites();
    initAudio();
    log("Game loaded. Press START MISSION to begin.", "#0f0");
});

// Export functions that other scripts need
window.animMove = animMove;
window.log = log;
window.processCombatSequence = processCombatSequence;
window.hasLineOfSight = hasLineOfSight;
window.createSpeechBubble = createSpeechBubble;
window.createFootstepEffect = createFootstepEffect;
window.autoSwitchToMove = autoSwitchToMove;