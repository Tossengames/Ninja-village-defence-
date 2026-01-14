// ============================================
// PLAYER MODULE - PLAYER LOGIC & ACTIONS
// ============================================

let currentPath = [];
let isMoving = false;

function handlePlayerMove(tx, ty) {
    // Find path to target
    const path = findPathToTarget(player.x, player.y, tx, ty);
    
    if(path && path.length > 0) {
        playerTurn = false;
        currentPath = path;
        isMoving = true;
        followPath();
    } else {
        log("Cannot reach that tile!", "#f00");
        playerTurn = true; // Give turn back if can't move
    }
}

async function followPath() {
    if(!isMoving || currentPath.length === 0) {
        isMoving = false;
        
        // Check final tile after movement
        const finalX = player.x;
        const finalY = player.y;
        player.isHidden = (grid[finalY][finalX] === HIDE);
        
        if(grid[finalY][finalX] === COIN) { 
            stats.coins++; 
            grid[finalY][finalX] = FLOOR; 
            log("Found Gold!", "#ff0");
        }
        
        if(grid[finalY][finalX] === EXIT) { 
            hasReachedExit = true;
            gameOver = true; 
            document.getElementById('resultScreen').classList.remove('hidden');
            showVictoryStats();
            log("MISSION COMPLETE! Escaped successfully!", "#0f0");
            return;
        }
        
        endTurn();
        return;
    }
    
    const nextStep = currentPath.shift();
    
    // Animate movement to next tile
    await new Promise(resolve => {
        animMove(player, nextStep.x, nextStep.y, 0.2, () => {
            // Update player direction based on movement
            const dx = nextStep.x - player.x;
            const dy = nextStep.y - player.y;
            if(dx !== 0 || dy !== 0) {
                player.dir = {x: Math.sign(dx), y: Math.sign(dy)};
            }
            
            // Check for items on this tile (except exit which is handled at end)
            if(grid[nextStep.y][nextStep.x] === COIN) { 
                stats.coins++; 
                grid[nextStep.y][nextStep.x] = FLOOR; 
                log("Found Gold!", "#ff0");
            }
            
            // Continue following path
            setTimeout(() => {
                resolve();
                followPath();
            }, 100); // Small delay between steps
        });
    });
}

function findPathToTarget(startX, startY, targetX, targetY) {
    // A* pathfinding algorithm
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    
    const gScore = new Map();
    const fScore = new Map();
    
    const startKey = `${startX},${startY}`;
    const targetKey = `${targetX},${targetY}`;
    
    // Check if target is valid
    if(targetX < 0 || targetX >= mapDim || targetY < 0 || targetY >= mapDim) {
        return null;
    }
    
    // Check if target is a wall
    if(grid[targetY][targetX] === WALL) {
        return null;
    }
    
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startX, startY, targetX, targetY));
    
    openSet.push({x: startX, y: startY, key: startKey, f: fScore.get(startKey)});
    
    while(openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        
        if(current.key === targetKey) {
            // Reconstruct path
            return reconstructPath(cameFrom, current.x, current.y, startX, startY);
        }
        
        closedSet.add(current.key);
        
        // Check all 4 directions (up, down, left, right)
        const neighbors = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
        ];
        
        for(const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            // Check if neighbor is valid
            if(neighbor.x < 0 || neighbor.x >= mapDim || neighbor.y < 0 || neighbor.y >= mapDim) {
                continue;
            }
            
            // Check for walls
            if(grid[neighbor.y][neighbor.x] === WALL) {
                continue;
            }
            
            if(closedSet.has(neighborKey)) {
                continue;
            }
            
            // Calculate tentative gScore (each step costs 1)
            const tentativeGScore = (gScore.get(current.key) || Infinity) + 1;
            
            // Check if neighbor is already in open set
            let neighborInOpenSet = openSet.find(node => node.key === neighborKey);
            
            if(!neighborInOpenSet) {
                neighborInOpenSet = {x: neighbor.x, y: neighbor.y, key: neighborKey, f: Infinity};
                openSet.push(neighborInOpenSet);
            } else if(tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                continue;
            }
            
            // This path is better
            cameFrom.set(neighborKey, {x: current.x, y: current.y});
            gScore.set(neighborKey, tentativeGScore);
            fScore.set(neighborKey, tentativeGScore + heuristic(neighbor.x, neighbor.y, targetX, targetY));
            neighborInOpenSet.f = fScore.get(neighborKey);
        }
    }
    
    // No path found
    return null;
}

function heuristic(x1, y1, x2, y2) {
    // Manhattan distance heuristic
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function reconstructPath(cameFrom, currentX, currentY, startX, startY) {
    const path = [];
    let currentKey = `${currentX},${currentY}`;
    let startKey = `${startX},${startY}`;
    
    while(currentKey !== startKey) {
        const current = cameFrom.get(currentKey);
        if(!current) break;
        
        // Add step to beginning of path
        path.unshift({x: currentX, y: currentY});
        currentX = current.x;
        currentY = current.y;
        currentKey = `${currentX},${currentY}`;
    }
    
    // Add final step
    if(path.length > 0) {
        path.unshift({x: currentX, y: currentY});
    }
    
    return path;
}

function handleItemPlacement(tx, ty, mode) {
    if(mode === 'trap' && inv.trap > 0) {
        grid[ty][tx] = TRAP;
        inv.trap--;
        stats.itemsUsed++;
        log("Trap set!", "#0f0");
    } else if(mode === 'rice' && inv.rice > 0) {
        grid[ty][tx] = RICE;
        inv.rice--;
        stats.itemsUsed++;
        log("Rice scattered!", "#ff0");
    } else if(mode === 'bomb' && inv.bomb > 0) {
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
}

// Export player functions
window.handlePlayerMove = handlePlayerMove;
window.handleItemPlacement = handleItemPlacement;