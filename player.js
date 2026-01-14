// ============================================
// PLAYER MOVEMENT & ITEM PLACEMENT
// ============================================

function handlePlayerMove(targetX, targetY) {
    if(!playerTurn || gameOver) return;
    
    // Check if player has reached exit
    if(hasReachedExit) {
        log("✅ Already escaped!", "#0f0");
        return;
    }
    
    // ORIGINAL LOGIC: Move to target position directly with pathfinding
    const path = findPath(player.x, player.y, targetX, targetY);
    if(!path || path.length === 0) {
        log("❌ No path available!", "#f00");
        return;
    }
    
    // ORIGINAL: Check if exit is clicked directly
    if(grid[targetY][targetX] === EXIT) {
        log("🚪 Exit reached!", "#0f0");
        hasReachedExit = true;
        playerTurn = false;
        
        // Show victory screen immediately (ORIGINAL BEHAVIOR)
        document.getElementById('resultScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        showVictoryStats();
        
        // Move player to exit
        animMove(player, targetX, targetY, 0.15, () => {
            player.x = targetX;
            player.y = targetY;
        });
        return;
    }
    
    // ORIGINAL: Move through entire path (not limited to 2 tiles)
    let stepsTaken = 0;
    
    function takeStep() {
        if(stepsTaken >= path.length) {
            playerTurn = false;
            endTurn();
            return;
        }
        
        const step = path[stepsTaken];
        const tile = grid[step.y][step.x];
        
        // Check for coin pickup
        if(tile === COIN) {
            stats.coins++;
            grid[step.y][step.x] = FLOOR;
            createCoinPickupEffect(step.x, step.y);
            log("💰 +1 Gold", "#ffd700");
        }
        
        // Check for hide spot
        const wasHidden = player.isHidden;
        player.isHidden = (tile === HIDE);
        if(player.isHidden !== wasHidden) {
            createHideEffect(step.x, step.y, player.isHidden);
        }
        
        // ORIGINAL: Player doesn't trigger traps - only enemies do
        // Removed trap activation for player
        
        // Normal move
        log(`📍 Moving to (${step.x}, ${step.y})`, "#00d2ff");
        animMove(player, step.x, step.y, 0.15, () => {
            player.x = step.x;
            player.y = step.y;
            stepsTaken++;
            takeStep();
        });
    }
    
    takeStep();
}

function handleItemPlacement(x, y, type) {
    if(!playerTurn || gameOver) return;
    
    if(inv[type] <= 0) {
        log(`❌ No ${type}s left!`, "#f00");
        return;
    }
    
    if(grid[y][x] !== FLOOR) {
        log("❌ Can't place here!", "#f00");
        return;
    }
    
    inv[type]--;
    stats.itemsUsed++;
    updateToolCounts();
    
    switch(type) {
        case 'trap':
            grid[y][x] = TRAP;
            log(`⚠️ Trap placed at (${x}, ${y})`, "#ff6464");
            break;
        case 'rice':
            grid[y][x] = RICE;
            log(`🍚 Rice placed at (${x}, ${y})`, "#ffff64");
            break;
        case 'bomb':
            grid[y][x] = BOMB;
            activeBombs.push({x: x, y: y, t: 3});
            log(`💣 Bomb placed at (${x}, ${y}) - 3 turns`, "#ff3296");
            break;
    }
    
    playerTurn = false;
    endTurn();
}

// A* Pathfinding Algorithm (ORIGINAL - UNCHANGED)
function findPath(startX, startY, targetX, targetY) {
    if(startX === targetX && startY === targetY) return [];
    
    const openSet = [];
    const closedSet = new Set();
    const startNode = {x: startX, y: startY, g: 0, h: 0, f: 0, parent: null};
    
    openSet.push(startNode);
    
    while(openSet.length > 0) {
        // Find node with lowest f score
        let lowestIndex = 0;
        for(let i = 1; i < openSet.length; i++) {
            if(openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        
        const current = openSet[lowestIndex];
        
        // Found target
        if(current.x === targetX && current.y === targetY) {
            const path = [];
            let temp = current;
            while(temp) {
                path.push({x: temp.x, y: temp.y});
                temp = temp.parent;
            }
            return path.reverse().slice(1); // Exclude starting position
        }
        
        // Move current from open to closed
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);
        
        // Check neighbors
        const neighbors = [
            {x: current.x, y: current.y - 1},
            {x: current.x, y: current.y + 1},
            {x: current.x - 1, y: current.y},
            {x: current.x + 1, y: current.y}
        ];
        
        for(const neighbor of neighbors) {
            // Check bounds
            if(neighbor.x < 0 || neighbor.x >= mapDim || neighbor.y < 0 || neighbor.y >= mapDim) {
                continue;
            }
            
            // Check if walkable (not wall and not undefined)
            if(grid[neighbor.y][neighbor.x] === WALL || grid[neighbor.y][neighbor.x] === undefined) {
                continue;
            }
            
            // Skip if in closed set
            if(closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }
            
            // Calculate scores
            const gScore = current.g + 1;
            const hScore = Math.abs(neighbor.x - targetX) + Math.abs(neighbor.y - targetY);
            const fScore = gScore + hScore;
            
            // Check if already in open set
            let existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if(existingNode) {
                if(gScore < existingNode.g) {
                    existingNode.g = gScore;
                    existingNode.f = gScore + existingNode.h;
                    existingNode.parent = current;
                }
            } else {
                const newNode = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: gScore,
                    h: hScore,
                    f: fScore,
                    parent: current
                };
                openSet.push(newNode);
            }
        }
    }
    
    return null; // No path found
}