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
let combatSequence = false; // New: For turn-based combat sequences
let combatLog = []; // New: Store combat events

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
let unitTexts = []; // New: Text above units
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
                
            case 'hide':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(164.81, audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
                
            case 'trap':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.5);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
                
            case 'alert':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
                
            case 'attack':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
                
            case 'hurt':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
                
            case 'arrow':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.4);
                break;
                
            case 'spear':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
        }
        
    } catch (e) {
        console.log("Sound error:", e);
    }
}

// ============================================
// VFX SYSTEMS
// ============================================

function createBloodStain(x, y) {
    bloodStains.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        size: Math.random() * 20 + 10,
        opacity: 0.8,
        life: 1000
    });
}

function createDeathEffect(x, y) {
    for(let i = 0; i < 15; i++) {
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: `rgb(${Math.floor(Math.random() * 100 + 155)}, 0, 0)`,
            size: Math.random() * 5 + 3
        });
    }
    
    createBloodStain(x, y);
    playSound('death');
    addUnitText(x, y, "💀 KILLED!", "#ff0000", 3);
}

function createExplosionEffect(x, y) {
    explosionEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        radius: 10,
        maxRadius: TILE * 1.5,
        life: 1.0,
        shockwave: 0
    });
    
    for(let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: `rgb(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100)}, 0)`,
            size: Math.random() * 4 + 2
        });
    }
    
    playSound('explosion');
    addUnitText(x, y, "💥 BOOM!", "#ff9900", 2);
}

function createCoinPickupEffect(x, y) {
    coinPickupEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        particles: Array.from({length: 8}, (_, i) => ({
            angle: (i / 8) * Math.PI * 2,
            distance: 0,
            maxDistance: 30,
            speed: 1 + Math.random() * 0.5,
            life: 1.0
        })),
        life: 1.0
    });
    
    playSound('coin');
    addUnitText(x, y, "💰 +1 GOLD", "#ffd700", 2);
}

function createHideEffect(x, y, isHiding) {
    hideEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        radius: isHiding ? TILE/2 : 0,
        targetRadius: isHiding ? TILE * 1.2 : 0,
        life: 1.0,
        color: isHiding ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255, 255, 255, 0.3)'
    });
    
    if(isHiding) {
        playSound('hide');
        addUnitText(x, y, "🕶️ HIDING", "#00d2ff", 2);
    }
}

function createFootstepEffect(x, y) {
    footstepEffects.push({
        x: x * TILE + TILE/2 + (Math.random() - 0.5) * 10,
        y: y * TILE + TILE/2 + (Math.random() - 0.5) * 10,
        life: 1.0,
        size: Math.random() * 8 + 4
    });
    
    if(Math.random() < 0.3) {
        playSound('step');
    }
}

function createTrapEffect(x, y) {
    for(let i = 0; i < 10; i++) {
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 1.0,
            color: 'rgba(100, 100, 100, 0.7)',
            size: Math.random() * 4 + 2
        });
    }
    
    playSound('trap');
    addUnitText(x, y, "⚠️ TRAP!", "#ff6464", 2);
}

function createAlertEffect(x, y) {
    particles.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        vx: 0,
        vy: 0,
        life: 1.0,
        color: 'rgba(255, 0, 0, 0.8)',
        size: TILE/2,
        pulse: true
    });
    
    playSound('alert');
}

function createDamageEffect(x, y, damage, isPlayer = false) {
    for(let i = 0; i < 8; i++) {
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            color: isPlayer ? 'rgba(255, 100, 255, 0.8)' : 'rgba(255, 100, 100, 0.8)',
            size: Math.random() * 3 + 2
        });
    }
    
    damageEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2 - 20,
        value: `-${damage}`,
        life: 1.0,
        color: isPlayer ? '#ff66ff' : '#ff6666'
    });
    
    playSound(isPlayer ? 'hurt' : (damage > 2 ? 'spear' : damage === 1 ? 'arrow' : 'hurt'));
}

function addUnitText(x, y, text, color = "#ffffff", duration = 2) {
    unitTexts.push({
        x: x * TILE + TILE/2,
        y: y * TILE - 35,
        text: text,
        color: color,
        life: duration,
        vy: -0.5,
        size: 14
    });
}

function updateVFX() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;
        return p.life > 0;
    });
    
    explosionEffects = explosionEffects.filter(e => {
        e.radius += 15;
        e.shockwave += 5;
        e.life -= 0.05;
        return e.life > 0;
    });
    
    coinPickupEffects = coinPickupEffects.filter(e => {
        e.particles.forEach(p => {
            p.distance = Math.min(p.distance + p.speed, p.maxDistance);
        });
        e.life -= 0.03;
        return e.life > 0;
    });
    
    hideEffects = hideEffects.filter(e => {
        e.radius += (e.targetRadius - e.radius) * 0.2;
        e.life -= 0.05;
        return e.life > 0;
    });
    
    footstepEffects = footstepEffects.filter(f => {
        f.life -= 0.1;
        return f.life > 0;
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
    bloodStains.forEach(stain => {
        ctx.fillStyle = `rgba(139, 0, 0, ${stain.opacity})`;
        ctx.beginPath();
        ctx.arc(stain.x, stain.y, stain.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    particles.forEach(p => {
        if(p.pulse) {
            const pulseSize = p.size * (0.8 + Math.sin(Date.now() / 100) * 0.2);
            ctx.fillStyle = p.color.replace('0.8', p.life.toString());
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = p.color.replace('1.0', p.life.toString());
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    explosionEffects.forEach(e => {
        ctx.strokeStyle = `rgba(255, 165, 0, ${e.life})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.shockwave, 0, Math.PI * 2);
        ctx.stroke();
        
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${e.life})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${e.life * 0.7})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    coinPickupEffects.forEach(e => {
        e.particles.forEach(p => {
            const x = e.x + Math.cos(p.angle) * p.distance;
            const y = e.y + Math.sin(p.angle) * p.distance;
            
            ctx.fillStyle = `rgba(255, 215, 0, ${e.life})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    
    hideEffects.forEach(e => {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gradient.addColorStop(0, e.color.replace('0.3', (e.life * 0.3).toString()));
        gradient.addColorStop(1, e.color.replace('0.3', '0'));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    footstepEffects.forEach(f => {
        ctx.fillStyle = `rgba(200, 200, 200, ${f.life * 0.5})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * f.life, 0, Math.PI * 2);
        ctx.fill();
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
        
        // Text shadow for better visibility
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
    bloodStains = [];
    coinPickupEffects = [];
    hideEffects = [];
    explosionEffects = [];
    footstepEffects = [];
    damageEffects = [];
    unitTexts = [];
    
    showHighlights = true;
    showLog = true;
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('rangeIndicator').classList.remove('hidden');
    document.getElementById('logToggle').classList.remove('hidden');
    document.getElementById('hpDisplay').classList.remove('hidden');
    
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

    enemies.forEach(e => {
        if(!e.alive) return;
        
        // Draw enemy tint based on type
        ctx.fillStyle = e.tint;
        ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        
        // Draw health bar
        const healthPercent = e.hp / e.maxHP;
        ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.25 ? "#ff0" : "#f00";
        ctx.fillRect(e.ax * TILE + 5, e.ay * TILE - 8, (TILE - 10) * healthPercent, 4);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(e.ax * TILE + 5, e.ay * TILE - 8, TILE - 10, 4);
        
        // Draw HP text
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(e.hp.toString(), e.ax * TILE + TILE/2, e.ay * TILE - 4);
        
        // Draw type indicator
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
        
        // Draw thought bubble above unit
        if(e.thought && e.thoughtTimer > 0) {
            drawThoughtBubble(e);
        }
        
        if(!player.isHidden && e.state !== 'dead') {
            drawVisionCone(e);
        }
        
        // Draw attack range if alerted/chasing
        if((e.state === 'alerted' || e.state === 'chasing') && !player.isHidden) {
            ctx.strokeStyle = e.color + "80";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(e.ax * TILE + 30, e.ay * TILE + 30, e.attackRange * TILE, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    drawVFX();

    // Draw player health bar
    const playerHealthPercent = playerHP / playerMaxHP;
    ctx.fillStyle = playerHealthPercent > 0.5 ? "#0f0" : playerHealthPercent > 0.25 ? "#ff0" : "#f00";
    ctx.fillRect(player.ax * TILE + 5, player.ay * TILE - 8, (TILE - 10) * playerHealthPercent, 4);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(player.ax * TILE + 5, player.ay * TILE - 8, TILE - 10, 4);
    
    // Draw player HP text
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

function drawThoughtBubble(e) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(e.ax * TILE + TILE/2, e.ay * TILE - 25, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.ax * TILE + TILE/2, e.ay * TILE - 25, 15, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    
    // Wrap text if too long
    const words = e.thought.split(' ');
    let line = '';
    let lineCount = 0;
    const maxWidth = 24;
    
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if(testLine.length > maxWidth && n > 0) {
            ctx.fillText(line, e.ax * TILE + TILE/2, e.ay * TILE - 25 + (lineCount * 12));
            line = words[n] + ' ';
            lineCount++;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, e.ax * TILE + TILE/2, e.ay * TILE - 25 + (lineCount * 12));
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
    ctx.moveTo(e.ax * TILE + 30, e.ay * TILE + 30);
    
    const baseA = Math.atan2(e.dir.y, e.dir.x);
    const visionAngle = 0.7;
    
    const rayCount = 20;
    for(let i = 0; i <= rayCount; i++) {
        const angle = baseA - visionAngle + (2 * visionAngle * i / rayCount);
        let maxDistance = drawRange;
        
        for(let d = 0.1; d <= drawRange; d += 0.1) {
            const checkX = Math.floor(e.x + Math.cos(angle) * d);
            const checkY = Math.floor(e.y + Math.sin(angle) * d);
            
            if(checkX < 0 || checkX >= mapDim || checkY < 0 || checkY >= mapDim) {
                maxDistance = d - 0.1;
                break;
            }
            
            if(grid[checkY][checkX] === WALL) {
                maxDistance = d - 0.1;
                break;
            }
        }
        
        ctx.lineTo(
            e.ax * TILE + 30 + Math.cos(angle) * maxDistance * TILE,
            e.ay * TILE + 30 + Math.sin(angle) * maxDistance * TILE
        );
    }
    
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = e.state === 'alerted' || e.state === 'chasing' ? 'rgba(255, 0, 0, 0.8)' : 
                     e.state === 'investigating' ? 'rgba(255, 165, 0, 0.6)' :
                     e.state === 'eating' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.strokeStyle = e.state === 'alerted' || e.state === 'chasing' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(e.ax * TILE + 30, e.ay * TILE + 30, drawRange * TILE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
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
        
        ctx.strokeStyle = enemyColor + "80";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(mx + e.x*ms + ms/2, my + 5 + e.y*ms + ms/2, (e.visionRange || 2) * ms, 0, Math.PI * 2);
        ctx.stroke();
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
}

function toggleLog() {
    showLog = !showLog;
    document.getElementById('missionLog').style.display = showLog ? 'flex' : 'none';
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

    // Handle bomb explosions one by one
    for(let b of exploding) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait between explosions
        
        grid[b.y][b.x] = FLOOR; 
        shake = 20; 
        createExplosionEffect(b.x, b.y);
        
        // Alert nearby enemies to the sound
        enemies.forEach(e => {
            if(e.alive && e.state !== 'dead') {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                if(dist <= e.hearingRange) {
                    e.hasHeardSound = true;
                    e.soundLocation = {x: b.x, y: b.y};
                    e.investigationTurns = 5;
                    e.state = 'investigating';
                    e.thought = 'Heard explosion!';
                    e.thoughtTimer = 3;
                }
            }
        });
        
        // Kill enemies in blast radius one by one
        const enemiesInBlast = enemies.filter(e => 
            e.alive && Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1
        );
        
        for(let e of enemiesInBlast) {
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait between deaths
            e.alive = false; 
            e.state = 'dead';
            stats.kills++;
            createDeathEffect(e.x, e.y);
        }
    }

    // Process all enemies with delays
    for(let e of enemies.filter(g => g.alive)) {
        currentEnemyTurn = e;
        centerOnUnit(e.x, e.y);
        
        // Wait before enemy moves
        await new Promise(resolve => setTimeout(resolve, 800));
        
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
    addUnitText(player.x, player.y, "🗡️ ATTACK!", "#00d2ff", 2);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    enemy.hp -= playerDamage;
    createDamageEffect(enemy.x, enemy.y, playerDamage);
    addUnitText(enemy.x, enemy.y, `-${playerDamage}`, "#ff0000", 2);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if(enemy.hp <= 0) {
        enemy.alive = false;
        enemy.state = 'dead';
        stats.kills++;
        createDeathEffect(enemy.x, enemy.y);
        combatSequence = false;
        return true;
    }
    
    // Enemy counterattacks if in range
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if(dist <= enemy.attackRange) {
        addUnitText(enemy.x, enemy.y, `${enemy.type} ATTACK!`, enemy.color, 2);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        playerHP -= enemy.damage;
        createDamageEffect(player.x, player.y, enemy.damage, true);
        addUnitText(player.x, player.y, `-${enemy.damage}`, "#ff66ff", 2);
        updateHPDisplay();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if(playerHP <= 0) {
            gameOver = true;
            document.getElementById('gameOverScreen').classList.remove('hidden');
            document.getElementById('resultScreen').classList.add('hidden');
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
        
        if(Math.random() < 0.3 && obj === player) {
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
        addUnitText(player.x, player.y, "⏳ WAITING", "#aaaaaa", 2);
        endTurn(); 
    } 
}

function showVictoryStats() {
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
    const statsTable = document.getElementById('statsTable');
    
    // Calculate score even on game over
    let score = Math.max(0, stats.kills * 100 + stats.coins * 50 - turnCount * 5 - stats.itemsUsed * 10);
    
    statsTable.innerHTML = `
        <div><span>MISSION FAILED</span><span></span></div>
        <div><span>Turns Survived:</span><span>${turnCount}</span></div>
        <div><span>Guards Eliminated:</span><span>${stats.kills}</span></div>
        <div><span>Gold Collected:</span><span>${stats.coins}</span></div>
        <div><span>Items Used:</span><span>${stats.itemsUsed}</span></div>
        <div><span>Final Score:</span><span style="color: #ff3333; font-weight: bold;">${score}</span></div>
        <div style="font-size: 12px; margin-top: 15px; color: #aaa; font-style: italic;">Better luck next time!</div>
    `;
}

// ============================================
// LINE OF SIGHT CHECKING
// ============================================

function checkLineOfSightRay(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    
    let currentX = x0;
    let currentY = y0;
    
    let firstStep = true;
    
    while(true) {
        if(!firstStep) {
            if(grid[currentY][currentX] === WALL) {
                return false;
            }
        }
        firstStep = false;
        
        if(currentX === x1 && currentY === y1) {
            return true;
        }
        
        const e2 = 2 * err;
        if(e2 > -dy) {
            err -= dy;
            currentX += sx;
        }
        if(e2 < dx) {
            err += dx;
            currentY += sy;
        }
    }
}

function hasLineOfSight(e, px, py) {
    if(hasReachedExit) return false;
    
    const dx = px - e.x;
    const dy = py - e.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if(distance > e.visionRange) return false;
    
    const angleToPlayer = Math.atan2(dy, dx);
    const enemyAngle = Math.atan2(e.dir.y, e.dir.x);
    let angleDiff = Math.abs(angleToPlayer - enemyAngle);
    
    if(angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    if(angleDiff > 0.7) return false;
    
    return checkLineOfSightRay(e.x, e.y, px, py);
}

// ============================================
// INITIALIZATION ON LOAD
// ============================================

window.addEventListener('load', () => {
    loadSprites();
    initAudio();
});

// Export functions that other scripts need
window.animMove = animMove;
window.log = log;
window.processCombatSequence = processCombatSequence;
window.hasLineOfSight = hasLineOfSight;
window.checkLineOfSightRay = checkLineOfSightRay;
window.createDeathEffect = createDeathEffect;
window.createTrapEffect = createTrapEffect;
window.createAlertEffect = createAlertEffect;
window.createCoinPickupEffect = createCoinPickupEffect;
window.createHideEffect = createHideEffect;
window.playSound = playSound;
window.autoSwitchToMove = autoSwitchToMove;
window.addUnitText = addUnitText;