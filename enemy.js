// ============================================
// ENEMY MODULE - ENEMY AI & BEHAVIOR
// ============================================

// Enemy states
const ENEMY_STATES = {
    PATROLLING: 'patrolling',
    INVESTIGATING: 'investigating',
    ALERTED: 'alerted',
    EATING: 'eating',
    DEAD: 'dead'
};

// Thought bubble emojis
const THOUGHTS = {
    INVESTIGATE: '👂',
    CURIOUS: '❓',
    EATING: '🍚',
    ALERT: '❗',
    DEAD: '💀',
    TRAPPED: '⚙️'
};

function initEnemies(count, grid, mapDim, player) {
    const enemies = [];
    
    for(let i = 0; i < count; i++) {
        let ex, ey; 
        do { 
            ex = rand(mapDim); 
            ey = rand(mapDim); 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex - player.x, ey - player.y) < 4);
        
        enemies.push(createEnemy(ex, ey));
    }
    
    return enemies;
}

function rand(m) { 
    return Math.floor(Math.random() * (m - 2)) + 1; 
}

function createEnemy(x, y) {
    return {
        x: x,
        y: y,
        ax: x,
        ay: y,
        dir: {x: 1, y: 0},
        alive: true,
        range: 4,
        state: ENEMY_STATES.PATROLLING,
        investigationTarget: null,
        investigationTurns: 0,
        thought: '',
        thoughtTimer: 0,
        hearingRange: 6,
        hasHeardSound: false,
        soundLocation: null,
        returnToPatrolPos: {x: x, y: y}
    };
}

function drawEnemy(e, ctx, grid, mapDim, player) {
    // Draw guard with state-based tint
    if(e.state === ENEMY_STATES.ALERTED) {
        ctx.fillStyle = "rgba(255, 50, 50, 0.3)";
        ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
    } else if(e.state === ENEMY_STATES.INVESTIGATING) {
        ctx.fillStyle = "rgba(255, 200, 50, 0.3)";
        ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
    } else if(e.state === ENEMY_STATES.EATING) {
        ctx.fillStyle = "rgba(50, 255, 50, 0.3)";
        ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
    }
    
    // Draw guard sprite
    if(sprites.guard) {
        ctx.drawImage(sprites.guard, e.ax * TILE, e.ay * TILE, TILE, TILE);
    }
    
    // Draw thought bubble
    if(e.thought && e.thoughtTimer > 0) {
        drawThoughtBubble(e, ctx);
    }
    
    // Draw vision cone
    if(!player.isHidden && e.state !== ENEMY_STATES.DEAD) {
        drawVisionCone(e, ctx, grid, mapDim);
    }
}

function drawThoughtBubble(e, ctx) {
    // Draw bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(e.ax * TILE + TILE/2, e.ay * TILE - 10, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bubble border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.ax * TILE + TILE/2, e.ay * TILE - 10, 12, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw thought emoji
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(e.thought, e.ax * TILE + TILE/2, e.ay * TILE - 10);
}

function drawVisionCone(e, ctx, grid, mapDim) {
    const gradient = ctx.createRadialGradient(
        e.ax * TILE + 30, e.ay * TILE + 30, 10,
        e.ax * TILE + 30, e.ay * TILE + 30, e.range * TILE
    );
    gradient.addColorStop(0, 'rgba(255, 50, 50, 0.2)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(e.ax * TILE + 30, e.ay * TILE + 30);
    
    const baseA = Math.atan2(e.dir.y, e.dir.x);
    const visionAngle = e.state === ENEMY_STATES.ALERTED ? 1.0 : 0.7;
    
    for(let a = baseA - visionAngle; a <= baseA + visionAngle; a += 0.1) {
        let d = 0;
        let hitWall = false;
        while(d < e.range && !hitWall) { 
            d += 0.2; 
            const checkX = Math.floor(e.x + Math.cos(a) * d);
            const checkY = Math.floor(e.y + Math.sin(a) * d);
            
            if(checkX < 0 || checkX >= mapDim || checkY < 0 || checkY >= mapDim) {
                hitWall = true;
            } else if(grid[checkY][checkX] === WALL) {
                hitWall = true;
            }
            
            if(!hitWall) {
                ctx.lineTo(
                    e.ax * TILE + 30 + Math.cos(a) * d * TILE, 
                    e.ay * TILE + 30 + Math.sin(a) * d * TILE
                );
            }
        }
    }
    ctx.closePath();
    ctx.fill();
}

async function processEnemyTurn(e, grid, player, mapDim) {
    // Check if guard is on a trap
    if(grid[e.y][e.x] === TRAP) { 
        killEnemy(e, 'trapped');
        grid[e.y][e.x] = FLOOR; 
        return;
    }
    
    // Check if guard sees rice
    if(grid[e.y][e.x] === RICE && e.state !== ENEMY_STATES.EATING) {
        startEating(e);
        grid[e.y][e.x] = FLOOR;
        return;
    }
    
    // Handle eating rice
    if(e.state === ENEMY_STATES.EATING) {
        e.investigationTurns--;
        if(e.investigationTurns <= 0) {
            killEnemy(e, 'poisoned');
        }
        return;
    }
    
    // Check if guard sees player (with wall obstruction)
    if(!player.isHidden && hasLineOfSight(e, player.x, player.y, grid, mapDim)) {
        e.state = ENEMY_STATES.ALERTED;
        setThought(e, THOUGHTS.ALERT, 3);
        checkGameOver();
        return;
    }
    
    // Check for nearby items
    const foundItem = checkForNearbyItems(e, grid);
    if(foundItem) return;
    
    // Handle investigation state
    if(e.state === ENEMY_STATES.INVESTIGATING) {
        await handleInvestigation(e, grid, mapDim);
        return;
    }
    
    // Normal patrolling
    if(e.state === ENEMY_STATES.PATROLLING) {
        await patrolMovement(e, grid, mapDim);
    }
}

function killEnemy(e, cause) {
    e.alive = false;
    e.state = ENEMY_STATES.DEAD;
    
    const thought = cause === 'trapped' ? THOUGHTS.TRAPPED : THOUGHTS.DEAD;
    setThought(e, thought, 2);
    
    stats.kills++;
    const message = cause === 'trapped' ? "Guard Trapped!" : "Guard died from poisoned rice!";
    log(message, cause === 'trapped' ? "#ff0" : "#0f0");
}

function startEating(e) {
    e.state = ENEMY_STATES.EATING;
    e.investigationTurns = 3;
    setThought(e, THOUGHTS.EATING, 3);
    log("Guard found rice and is eating!", "#ff9900");
    stats.itemsUsed++;
}

function hasLineOfSight(e, px, py, grid, mapDim) {
    const dx = px - e.x, dy = py - e.y, dist = Math.hypot(dx, dy);
    if(dist > e.range) return false;
    
    for(let d = 0.5; d < dist; d += 0.5) {
        const checkX = Math.floor(e.x + (dx/dist) * d);
        const checkY = Math.floor(e.y + (dy/dist) * d);
        
        if(checkX < 0 || checkX >= mapDim || checkY < 0 || checkY >= mapDim) {
            return false;
        }
        if(grid[checkY][checkX] === WALL) {
            return false;
        }
    }
    return true;
}

function checkForNearbyItems(e, grid) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    for(const dir of directions) {
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;
        
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim) {
            if(grid[ny][nx] === RICE && e.state !== ENEMY_STATES.INVESTIGATING) {
                e.state = ENEMY_STATES.INVESTIGATING;
                e.investigationTarget = {x: nx, y: ny};
                e.investigationTurns = 8;
                setThought(e, THOUGHTS.CURIOUS, 3);
                log("Guard noticed rice!", "#ff9900");
                return true;
            }
        }
    }
    
    return false;
}

async function handleInvestigation(e, grid, mapDim) {
    e.investigationTurns--;
    
    // If reached investigation target
    if(e.investigationTarget && (e.x === e.investigationTarget.x && e.y === e.investigationTarget.y)) {
        e.investigationTarget = null;
        if(e.investigationTurns <= 0) {
            e.state = ENEMY_STATES.PATROLLING;
            setThought(e, '', 0);
            log("Guard gave up investigation", "#aaa");
        }
    }
    
    // Move toward investigation target
    if(e.investigationTarget && e.investigationTurns > 0) {
        const nextMove = findPath(e.x, e.y, e.investigationTarget.x, e.investigationTarget.y, grid, mapDim);
        if(nextMove) {
            const nx = e.x + nextMove.x;
            const ny = e.y + nextMove.y;
            
            if(grid[ny][nx] !== WALL) {
                await new Promise(r => animMove(e, nx, ny, 0.2, r));
                return;
            }
        }
    }
    
    // If investigation time is up, return to patrol
    if(e.investigationTurns <= 0) {
        e.state = ENEMY_STATES.PATROLLING;
        e.investigationTarget = null;
        e.hasHeardSound = false;
        e.soundLocation = null;
        setThought(e, '', 0);
    }
}

async function patrolMovement(e, grid, mapDim) {
    let nx = e.x, ny = e.y;
    const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const d = moves[Math.floor(Math.random() * 4)];
    
    // Check for walls before moving
    if(e.y + d.y >= 0 && e.y + d.y < mapDim && 
       e.x + d.x >= 0 && e.x + d.x < mapDim &&
       grid[e.y + d.y][e.x + d.x] !== WALL) {
        nx += d.x; 
        ny += d.y; 
    }
    
    await new Promise(r => animMove(e, nx, ny, 0.2, r));
}

function findPath(startX, startY, targetX, targetY, grid, mapDim) {
    // Simple BFS pathfinding
    const queue = [{x: startX, y: startY, path: []}];
    const visited = new Set();
    visited.add(`${startX},${startY}`);
    
    const directions = [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1}
    ];
    
    while(queue.length > 0) {
        const current = queue.shift();
        
        if(current.x === targetX && current.y === targetY) {
            return current.path.length > 0 ? current.path[0] : null;
        }
        
        for(const dir of directions) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            
            if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim) {
                if(grid[ny][nx] !== WALL && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({
                        x: nx,
                        y: ny,
                        path: current.path.length === 0 ? [dir] : [...current.path, dir]
                    });
                }
            }
        }
    }
    
    return null;
}

function setThought(e, thought, duration = 2) {
    e.thought = thought;
    e.thoughtTimer = duration;
}

// Export enemy functions
window.initEnemies = initEnemies;
window.drawEnemy = drawEnemy;
window.processEnemyTurn = processEnemyTurn;
window.setEnemyThought = setThought;