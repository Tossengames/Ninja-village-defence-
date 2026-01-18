// ============================================
// ENEMY AI & DETECTION SYSTEM (FIXED + COMPLETE)
// ============================================

async function processEnemyTurn(e) {
    if (!e.alive) return;

    // ================= TRAP =================
    if (grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
        createTrapEffect(e.x, e.y);
        return;
    }

    // ================= SLEEP =================
    if (e.isSleeping) {
        e.sleepTimer--;
        if (e.sleepTimer <= 0) {
            e.isSleeping = false;
            createSpeechBubble(e.x, e.y, "Waking up...", "#aaa", 2);
        } else {
            createSpeechBubble(e.x, e.y, "💤 Zzz...", "#888", 2);
            return;
        }
    }

    // ================= POISON RICE =================
    if (e.ateRice) {
        e.riceDeathTimer--;
        if (e.riceDeathTimer <= 0) {
            e.alive = false;
            e.state = 'dead';
            e.hp = 0;
            stats.kills++;
            createDeathEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "💀 Poisoned!", "#ff0000", 2);
            return;
        }
    }

    // ================= GAS =================
    const gasAtTile = activeGas.find(g => g.x === e.x && g.y === e.y);
    if (gasAtTile && !e.isSleeping) {
        e.isSleeping = true;
        e.sleepTimer = Math.floor(Math.random() * 5) + 2;
        createSpeechBubble(e.x, e.y, "💤 Falling asleep!", "#9932cc", 2);
        return;
    }

    // ================= VISION =================
    const canSeePlayerNow =
        !e.isSleeping &&
        hasLineOfSight(e, player.x, player.y) &&
        !player.isHidden;

    // ================= PLAYER SEEN =================
    if (canSeePlayerNow) {
        if (e.state !== 'chasing') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
            playSound('alert');
        }

        e.state = 'chasing';
        e.lastSeenPlayer = { x: player.x, y: player.y };
        e.alertTurns = Math.floor(Math.random() * 4) + 5;
        e.investigationTarget = null;

        await chasePlayer(e);
        return;
    }

    // ================= LOST PLAYER =================
    if (e.state === 'chasing' && !canSeePlayerNow) {
        e.alertTurns--;

        if (e.alertTurns <= 0) {
            e.state = 'investigating';
            e.investigationTarget = { ...e.lastSeenPlayer };
            e.investigationTurns = Math.floor(Math.random() * 5) + 1;
            createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);
            await investigateBehavior(e);
            return;
        }

        createSpeechBubble(e.x, e.y, "Where did they go?", "#ff9900", 2);
        await moveTowardLastSeen(e);
        return;
    }

    // ================= SOUND INVESTIGATION =================
    if (e.hasHeardSound && e.soundLocation && e.state !== 'chasing') {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = Math.floor(Math.random() * 5) + 1;
        e.hasHeardSound = false;
        createSpeechBubble(e.x, e.y, "Hmm?", "#ff9900", 2);
        await investigateBehavior(e);
        return;
    }

    // ================= STATE FALLBACK =================
    if (e.state === 'investigating') {
        await investigateBehavior(e);
    } else if (e.state === 'eating') {
        await eatBehavior(e);
    } else {
        e.state = 'patrolling';
        await patrolBehavior(e);
    }
}

// ============================================
// CHASE PLAYER
// ============================================
async function chasePlayer(e) {
    if (!e.alive || e.isSleeping) return;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    // Attack if in range
    if (dist <= e.attackRange) {
        createSpeechBubble(e.x, e.y, `🎯 ATTACKING!`, e.color, 2);
        await new Promise(r => setTimeout(r, 300));

        playerHP -= e.damage;
        playerHP = Math.max(0, playerHP);
        createDamageEffect(player.x, player.y, e.damage, true);
        createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 2);
        shake = 15;

        await new Promise(r => setTimeout(r, 500));

        if (playerHP <= 0) {
            playerHP = 0;
            gameOver = true;
            setTimeout(showGameOverScreen, 500);
        }
        return;
    }

    let movesMade = 0;
    const maxDistance = Math.floor(Math.random() * 3) + 2; // 2-4 tiles
    let currentX = e.x;
    let currentY = e.y;

    while (movesMade < maxDistance && movesMade < dist) {
        let moveX = 0, moveY = 0;
        if (Math.abs(dx) > Math.abs(dy)) moveX = dx > 0 ? 1 : -1;
        else moveY = dy > 0 ? 1 : -1;

        const nx = currentX + moveX;
        const ny = currentY + moveY;

        if (
            nx >= 0 && nx < mapDim &&
            ny >= 0 && ny < mapDim &&
            grid[ny][nx] !== WALL
        ) {
            const enemyAtTile = enemies.find(o => o.alive && o !== e && o.x === nx && o.y === ny);
            if (!enemyAtTile) {
                await animMove(e, nx, ny, e.speed * 1.5, () => {
                    e.x = nx;
                    e.y = ny;
                    currentX = nx;
                    currentY = ny;
                    e.dir = { x: moveX, y: moveY };
                });
                movesMade++;

                if (grid[e.y][e.x] === TRAP) {
                    grid[e.y][e.x] = FLOOR;
                    e.alive = false;
                    e.state = 'dead';
                    e.hp = 0;
                    stats.kills++;
                    createDeathEffect(e.x, e.y);
                    createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
                    createTrapEffect(e.x, e.y);
                    return;
                }

                const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
                if (canSeePlayer) {
                    e.lastSeenPlayer = { x: player.x, y: player.y };
                    e.alertTurns = Math.floor(Math.random() * 4) + 5;
                }

                await new Promise(r => setTimeout(r, 100));
            } else break;
        } else break;
    }
}

// ============================================
// MOVE TOWARD LAST SEEN PLAYER
// ============================================
async function moveTowardLastSeen(e) {
    if (!e.lastSeenPlayer) return;

    const dx = e.lastSeenPlayer.x - e.x;
    const dy = e.lastSeenPlayer.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist <= 1) return;

    const maxDistance = Math.floor(Math.random() * 2) + 2;
    let movesMade = 0;
    let currentX = e.x, currentY = e.y;

    while (movesMade < maxDistance && movesMade < dist - 1) {
        let moveX = 0, moveY = 0;
        if (Math.abs(dx) > Math.abs(dy)) moveX = dx > 0 ? 1 : -1;
        else moveY = dy > 0 ? 1 : -1;

        const nx = currentX + moveX;
        const ny = currentY + moveY;

        if (
            nx >= 0 && nx < mapDim &&
            ny >= 0 && ny < mapDim &&
            grid[ny][nx] !== WALL
        ) {
            const enemyAtTile = enemies.find(o => o.alive && o !== e && o.x === nx && o.y === ny);
            if (!enemyAtTile) {
                await animMove(e, nx, ny, e.speed * 1.2, () => {
                    e.x = nx;
                    e.y = ny;
                    currentX = nx;
                    currentY = ny;
                    e.dir = { x: moveX, y: moveY };
                });
                movesMade++;

                if (grid[e.y][e.x] === TRAP) {
                    grid[e.y][e.x] = FLOOR;
                    e.alive = false;
                    e.state = 'dead';
                    e.hp = 0;
                    stats.kills++;
                    createDeathEffect(e.x, e.y);
                    createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
                    createTrapEffect(e.x, e.y);
                    return;
                }

                await new Promise(r => setTimeout(r, 100));
            } else break;
        } else break;
    }
}

// ============================================
// PATROL BEHAVIOR
// ============================================
async function patrolBehavior(e) {
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const maxDistance = Math.floor(Math.random() * 3) + 1;
    let movesMade = 0;

    while (movesMade < maxDistance) {
        let nx = e.x + e.dir.x;
        let ny = e.y + e.dir.y;

        if (nx < 0 || nx >= mapDim || ny < 0 || ny >= mapDim || grid[ny][nx] === WALL) {
            const validDirs = dirs.filter(d => {
                const tx = e.x + d.x;
                const ty = e.y + d.y;
                return tx >= 0 && tx < mapDim && ty >= 0 && ty < mapDim && grid[ty][tx] !== WALL;
            });
            if (validDirs.length > 0) e.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
            nx = e.x + e.dir.x;
            ny = e.y + e.dir.y;
            if (validDirs.length === 0) break;
        }

        await animMove(e, nx, ny, e.speed, () => { e.x = nx; e.y = ny; });
        movesMade++;

        if (grid[e.y][e.x] === TRAP) {
            grid[e.y][e.x] = FLOOR;
            e.alive = false;
            e.state = 'dead';
            e.hp = 0;
            stats.kills++;
            createDeathEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
            createTrapEffect(e.x, e.y);
            return;
        }

        const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
        if (canSeePlayer && e.state !== 'chasing') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
            playSound('alert');
            e.state = 'chasing';
            e.lastSeenPlayer = { x: player.x, y: player.y };
            e.alertTurns = Math.floor(Math.random() * 4) + 5;
            break;
        }

        await new Promise(r => setTimeout(r, 100));
    }
}

// ============================================
// INVESTIGATE BEHAVIOR
// ============================================
async function investigateBehavior(e) {
    if (!e.investigationTarget) { e.state = 'patrolling'; return; }

    await moveTowardLastSeen(e);

    const dx = e.investigationTarget.x - e.x;
    const dy = e.investigationTarget.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    if (dist <= 1) {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;
        if (nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && grid[ny][nx] !== WALL) {
            await animMove(e, nx, ny, e.speed, () => { e.x = nx; e.y = ny; e.dir = dir; });
        }
    }

    e.investigationTurns--;
    if (e.investigationTurns <= 0) {
        createSpeechBubble(e.x, e.y, "Must be nothing...", "#aaa", 2);
        e.state = 'patrolling';
        e.investigationTarget = null;
    }
}

// ============================================
// EAT BEHAVIOR
// ============================================
async function eatBehavior(e) {
    if (!e.investigationTarget) { e.state = 'patrolling'; return; }

    await moveTowardLastSeen(e);

    const dx = e.investigationTarget.x - e.x;
    const dy = e.investigationTarget.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    if (dist <= 1) {
        grid[e.investigationTarget.y][e.investigationTarget.x] = FLOOR;
        e.ateRice = true;
        e.state = 'patrolling';
        e.investigationTarget = null;
        createSpeechBubble(e.x, e.y, "Yum! 🍚", "#ffff00", 2);
    }
}