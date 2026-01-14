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
    
    // Check if guard is standing on rice
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
    
    // Check if guard sees player (with wall obstruction and limited range)
    if(!player.isHidden && canSeePlayer(e)) {
        e.state = 'alerted';
        e.thought = '❗';
        e.thoughtTimer = 3;
        checkGameOver();
        return;
    }
    
    // Check for nearby items (rice within 1 tile)
    const foundItem = checkForNearbyItems(e);
    if(foundItem) return;
    
    // Check if heard bomb explosion
    if(e.hasHeardSound && e.soundLocation) {
        e.state = 'investigating';
        e.investigationTarget = {x: e.soundLocation.x, y: e.soundLocation.y};
        e.investigationTurns = 5;
        e.thought = '👂';
        e.thoughtTimer = 3;
        e.hasHeardSound = false;
        return;
    }
    
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
    e.investigationTurns = 3; // Eat for 3 turns then die
    e.thought = '🍚';
    e.thoughtTimer = 3;
    log("Guard found rice and is eating!", "#ff9900");
    stats.itemsUsed++;
}

// FIXED: Check line of sight with walls and limited range (1-3 tiles)
function canSeePlayer(e) {
    const px = player.x;
    const py = player.y;
    
    // Calculate distance
    const dx = px - e.x;
    const dy = py - e.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Can't see beyond their vision range (1-3 tiles)
    if(distance > e.visionRange) return false;
    
    // Also check if player is within vision cone angle (not just distance)
    const angleToPlayer = Math.atan2(dy, dx);
    const enemyAngle = Math.atan2(e.dir.y, e.dir.x);
    let angleDiff = Math.abs(angleToPlayer - enemyAngle);
    
    // Normalize angle difference to 0-PI range
    if(angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    // Vision cone is 140 degrees (0.7 radians each side = 1.4 total = ~80 degrees)
    // Actually make it narrower - about 90 degrees total (0.8 radians each side)
    if(angleDiff > 0.8) return false;
    
    // Now check line of sight with Bresenham's algorithm
    let x0 = e.x;
    let y0 = e.y;
    let x1 = px;
    let y1 = py;
    
    const dx2 = Math.abs(x1 - x0);
    const dy2 = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx2 - dy2;
    
    while(true) {
        // Don't check the starting point (enemy's position)
        if(x0 !== e.x || y0 !== e.y) {
            // If we hit a wall before reaching player, can't see
            if(grid[y0][x0] === WALL) {
                return false;
            }
        }
        
        // If we reached the player's position
        if(x0 === x1 && y0 === y1) {
            return true;
        }
        
        const e2 = 2 * err;
        if(e2 > -dy2) {
            err -= dy2;
            x0 += sx;
        }
        if(e2 < dx2) {
            err += dx2;
            y0 += sy;
        }
    }
}

function checkForNearbyItems(e) {
    // Check adjacent tiles for rice (up, down, left, right)
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
        // Also check diagonals
        {x: 1, y: 1}, {x: -1, y: 1}, {x: 1, y: -1}, {x: -1, y: -1}
    ];
    
    for(const dir of directions) {
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;
        
        // Make sure tile is within bounds
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim) {
            if(grid[ny][nx] === RICE && e.state !== 'investigating' && e.state !== 'eating') {
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
        // If it was rice, start eating
        if(grid[e.y][e.x] === RICE) {
            startEating(e);
        } else {
            // If it was a sound location (bomb), look around
            e.investigationTarget = null;
            if(e.investigationTurns <= 0) {
                e.state = 'patrolling';
                e.thought = '';
                e.thoughtTimer = 0;
                log("Guard gave up investigation", "#aaa");
            }
        }
        return;
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
    const moves = [
        {x: 1, y: 0}, {x: -1, y: 0}, 
        {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    // Filter out moves that hit walls
    const validMoves = moves.filter(move => {
        const checkX = e.x + move.x;
        const checkY = e.y + move.y;
        return checkX >= 0 && checkX < mapDim && 
               checkY >= 0 && checkY < mapDim &&
               grid[checkY][checkX] !== WALL;
    });
    
    // If there are valid moves, pick one randomly
    if(validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        nx += randomMove.x;
        ny += randomMove.y;
        
        // Update direction for vision cone
        e.dir = randomMove;
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