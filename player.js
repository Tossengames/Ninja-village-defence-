// ============================================
// PLAYER MOVEMENT, ITEM PLACEMENT & ATTACK
// ============================================

function handlePlayerMove(targetX, targetY) {
    if(!playerTurn || gameOver) return;
    
    if(hasReachedExit) {
        log("✅ Already escaped!", "#0f0");
        return;
    }
    
    const path = findPath(player.x, player.y, targetX, targetY);
    if(!path || path.length === 0) {
        log("❌ No path available!", "#f00");
        return;
    }
    
    if(grid[targetY][targetX] === EXIT) {
        log("🚪 Exit reached!", "#0f0");
        hasReachedExit = true;
        playerTurn = false;
        
        document.getElementById('resultScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        showVictoryStats();
        
        animMove(player, targetX, targetY, 0.15, () => {
            player.x = targetX;
            player.y = targetY;
        });
        return;
    }
    
    let stepsTaken = 0;
    
    function takeStep() {
        if(stepsTaken >= path.length) {
            playerTurn = false;
            
            // Check for combat after moving
            if(!checkCombat()) {
                endTurn();
            }
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
        
        // Check if moving into enemy (combat)
        const enemyAtTile = enemies.find(e => e.alive && e.x === step.x && e.y === step.y);
        if(enemyAtTile) {
            // Enter combat with enemy
            log(`⚔️ Engaged in combat with ${enemyAtTile.type} guard!`, "#ff3333");
            playerTurn = false;
            combatMode = true;
            
            // Player attacks first
            enemyAtTile.hp -= 2; // Player damage
            createDamageEffect(step.x, step.y);
            log(`🗡️ You hit guard for 2 damage!`, "#00d2ff");
            
            if(enemyAtTile.hp <= 0) {
                enemyAtTile.alive = false;
                enemyAtTile.state = 'dead';
                stats.kills++;
                createDeathEffect(step.x, step.y);
                log(`💀 Guard eliminated!`, "#ff00ff");
                
                // Continue movement if enemy died
                animMove(player, step.x, step.y, 0.15, () => {
                    player.x = step.x;
                    player.y = step.y;
                    stepsTaken++;
                    takeStep();
                });
            } else {
                // Enemy counterattacks
                playerHP -= enemyAtTile.damage;
                createDamageEffect(player.x, player.y, true);
                log(`💥 Guard hit you for ${enemyAtTile.damage} damage!`, "#ff3333");
                updateHPDisplay();
                
                if(playerHP <= 0) {
                    gameOver = true;
                    document.getElementById('gameOverScreen').classList.remove('hidden');
                    document.getElementById('resultScreen').classList.add('hidden');
                    log("☠️ You were defeated in combat!", "#f00");
                    return;
                }
                
                // Move to tile after combat
                animMove(player, step.x, step.y, 0.15, () => {
                    player.x = step.x;
                    player.y = step.y;
                    stepsTaken++;
                    takeStep();
                });
            }
            return;
        }
        
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

function handleAttack(targetX, targetY) {
    if(!playerTurn || gameOver) return;
    
    // Check if target tile has an enemy
    const enemy = enemies.find(e => e.alive && e.x === targetX && e.y === targetY);
    if(!enemy) {
        log("❌ No enemy to attack!", "#f00");
        return;
    }
    
    // Check if enemy can see player (no stealth kill if seen)
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    if(canSeePlayer) {
        // Normal combat
        log(`⚔️ Attacking ${enemy.type} guard!`, "#ff3333");
        enemy.hp -= 2; // Player damage
        createDamageEffect(targetX, targetY);
        playSound('attack');
        log(`🗡️ You hit guard for 2 damage!`, "#00d2ff");
        
        if(enemy.hp <= 0) {
            enemy.alive = false;
            enemy.state = 'dead';
            stats.kills++;
            createDeathEffect(targetX, targetY);
            log(`💀 Guard eliminated!`, "#ff00ff");
        } else {
            // Enemy counterattacks if in range
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if(dist <= enemy.attackRange) {
                playerHP -= enemy.damage;
                createDamageEffect(player.x, player.y, true);
                log(`💥 Guard hit you for ${enemy.damage} damage!`, "#ff3333");
                updateHPDisplay();
                
                if(playerHP <= 0) {
                    gameOver = true;
                    document.getElementById('gameOverScreen').classList.remove('hidden');
                    document.getElementById('resultScreen').classList.add('hidden');
                    log("☠️ You were defeated in combat!", "#f00");
                    return;
                }
            }
        }
    } else {
        // Stealth kill
        log(`🗡️ Stealth kill!`, "#00ff00");
        enemy.alive = false;
        enemy.state = 'dead';
        stats.kills++;
        createDeathEffect(targetX, targetY);
        playSound('attack');
        log(`💀 Guard silently eliminated!`, "#00ff00");
    }
    
    playerTurn = false;
    autoSwitchToMove(); // Auto switch back to move mode
    
    // Check for additional combat
    if(!checkCombat()) {
        endTurn();
    }
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
    autoSwitchToMove(); // Auto switch back to move mode
    endTurn();
}

// A* Pathfinding Algorithm
function findPath(startX, startY, targetX, targetY) {
    if(startX === targetX && startY === targetY) return [];
    
    const openSet = [];
    const closedSet = new Set();
    const startNode = {x: startX, y: startY, g: 0, h: 0, f: 0, parent: null};
    
    openSet.push(startNode);
    
    while(openSet.length > 0) {
        let lowestIndex = 0;
        for(let i = 1; i < openSet.length; i++) {
            if(openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        
        const current = openSet[lowestIndex];
        
        if(current.x === targetX && current.y === targetY) {
            const path = [];
            let temp = current;
            while(temp) {
                path.push({x: temp.x, y: temp.y});
                temp = temp.parent;
            }
            return path.reverse().slice(1);
        }
        
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);
        
        const neighbors = [
            {x: current.x, y: current.y - 1},
            {x: current.x, y: current.y + 1},
            {x: current.x - 1, y: current.y},
            {x: current.x + 1, y: current.y}
        ];
        
        for(const neighbor of neighbors) {
            if(neighbor.x < 0 || neighbor.x >= mapDim || neighbor.y < 0 || neighbor.y >= mapDim) {
                continue;
            }
            
            if(grid[neighbor.y][neighbor.x] === WALL || grid[neighbor.y][neighbor.x] === undefined) {
                continue;
            }
            
            // Check if tile is occupied by alive enemy
            const enemyAtTile = enemies.find(e => e.alive && e.x === neighbor.x && e.y === neighbor.y);
            if(enemyAtTile) {
                continue; // Can't move through enemies
            }
            
            if(closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }
            
            const gScore = current.g + 1;
            const hScore = Math.abs(neighbor.x - targetX) + Math.abs(neighbor.y - targetY);
            const fScore = gScore + hScore;
            
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
    
    return null;
}