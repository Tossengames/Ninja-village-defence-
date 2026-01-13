// ============================================
// ENEMY MODULE - ENEMY AI & BEHAVIOR
// ============================================

async function processEnemyTurn(e) {
    // Check if guard is on a trap
    if(grid[e.y][e.x] === TRAP) { 
        killEnemy(e, 'trapped');
        grid[e.y][e.x] = FLOOR; 
        return;
    }
    
    // Check if guard sees rice
    if(grid[e.y][e.x] === RICE && e.state !== 'eating') {
        startEating(e);
        grid[e.y][e.x] = FLOOR;
        return;
    }
    
    // Handle eating rice
    if(e.state === 'eating') {
        e.investigationTurns--;
        if(e.investigationTurns <= 0) {
            killEnemy(e, 'poisoned');
        }
        return;
    }
    
    // Check if guard sees player (with wall obstruction)
    if(!player.isHidden && hasLineOfSight(e, player.x, player.y)) {
        e.state = 'alerted';
        e.thought = '❗';
        e.thoughtTimer = 3;
        checkGameOver();
        return;
    }
    
    // Check for nearby items
    const foundItem = checkForNearbyItems(e);
    if(foundItem) return;
    
    // Handle investigation state
    if(e.state === 'investigating') {
        await handleInvestigation(e);
        return;
    }
    
    // Normal patrolling
    if(e.state === 'patrolling') {
        await patrolMovement(e);
    }
}

function killEnemy(e, cause) {
    e.alive = false;
    e.state = 'dead';
    
    e.thought = cause === 'trapped' ? '⚙️' : '💀';
    e.thoughtTimer = 2;
    
    stats.kills++;
    const message = cause === 'trapped' ? "Guard Trapped!" : "Guard died from poisoned rice!";
    log(message, cause === 'trapped' ? "#ff0" : "#0f0");
}

function startEating(e) {
    e.state = 'eating';
    e.investigationTurns = 3;
    e.thought = '🍚';
    e.thoughtTimer = 3;
    log("Guard found rice and is eating!", "#ff9900");
    stats.itemsUsed++;
}

function hasLineOfSight(e, px, py) {
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

function checkForNearbyItems(e) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    for(const dir of directions) {
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;
        
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim) {
            if(grid[ny][nx] === RICE && e.state !== 'investigating') {
                e.state = 'investigating';
                e.investigationTarget = {x: nx, y: ny};
                e.investigationTurns = 8;
                e.thought = '❓';
                e.thoughtTimer = 3;
                log("Guard noticed rice!", "#ff9900");
                return true;
            }
        }
    }
    
    return false;
}

async function handleInvestigation(e) {
    e.investigationTurns--;
    
    // If reached investigation target
    if(e.investigationTarget && (e.x === e.investigationTarget.x && e.y === e.investigationTarget.y)) {
        e.investigationTarget = null;
        if(e.investigationTurns <= 0) {
            e.state = 'patrolling';
            e.thought = '';
            e.thoughtTimer = 0;
            log("Guard gave up investigation", "#aaa");
        }
    }
    
    // Move toward investigation target
    if(e.investigationTarget && e.investigationTurns > 0) {
        const nextMove = findPath(e.x, e.y, e.investigationTarget.x, e.investigationTarget.y);
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
        e.state = 'patrolling';
        e.investigationTarget = null;
        e.hasHeardSound = false;
        e.soundLocation = null;
        e.thought = '';
        e.thoughtTimer = 0;
    }
}

async function patrolMovement(e) {
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

function findPath(startX, startY, targetX, targetY) {
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

// Export enemy function
window.processEnemyTurn = processEnemyTurn;