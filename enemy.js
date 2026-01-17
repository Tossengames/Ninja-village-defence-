// ============================================
// ENEMY AI & DETECTION SYSTEM (FULL SCRIPT)
// ============================================

async function processEnemyTurn(e) {
    if (!e.alive) return;

    // INSTANT TRAP CHECK (START OF TURN)
    if (grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createTrapEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
        return;
    }

    // Sleeping
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

    // Poisoned rice death
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

    // Sleeping gas
    const gas = activeGas.find(g => g.x === e.x && g.y === e.y);
    if (gas && !e.isSleeping) {
        e.isSleeping = true;
        e.sleepTimer = Math.floor(Math.random() * 5) + 2;
        createSpeechBubble(e.x, e.y, "💤 Sleeping gas!", "#9932cc", 2);
        return;
    }

    const canSeePlayer =
        !e.isSleeping &&
        !player.isHidden &&
        hasLineOfSight(e, player.x, player.y);

    // PLAYER SPOTTED
    if (canSeePlayer) {
        if (e.state !== 'chasing') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            playSound('alert');
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
        }

        e.state = 'chasing';
        e.lastSeenPlayer = { x: player.x, y: player.y };
        e.alertTurns = Math.floor(Math.random() * 4) + 5;

        await chasePlayer(e);
        return;
    }

    // ALERT BUT LOST PLAYER
    if ((e.state === 'chasing' || e.state === 'alerted') && !canSeePlayer) {
        e.alertTurns--;

        if (e.alertTurns <= 0) {
            e.state = 'patrolling';
            e.lastSeenPlayer = null;
            createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);
            return;
        }

        await moveTowardLastSeen(e);
        return;
    }

    // DEFAULT BEHAVIOR
    if (e.state === 'patrolling' || !e.state) {
        await patrolBehavior(e);
    }
}

// ============================================
// CHASE PLAYER (REWRITTEN, ATTACK RANGE KEPT)
// ============================================
async function chasePlayer(e) {
    if (!e.alive || e.isSleeping) return;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    // ATTACK WHEN IN RANGE (UNCHANGED)
    if (dist <= e.attackRange) {
        createSpeechBubble(e.x, e.y, "🎯 ATTACK!", e.color, 2);

        await new Promise(r => setTimeout(r, 300));

        playerHP -= e.damage;
        playerHP = Math.max(0, playerHP);

        createDamageEffect(player.x, player.y, e.damage, true);
        createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 2);
        shake = 15;

        if (playerHP <= 0) {
            gameOver = true;
            setTimeout(showGameOverScreen, 500);
        }
        return;
    }

    // MOVE TOWARD PLAYER (STOP AT ATTACK RANGE)
    const maxSteps = Math.min(3, dist - e.attackRange);
    let steps = 0;

    while (steps < maxSteps) {
        let moveX = 0;
        let moveY = 0;

        const ddx = player.x - e.x;
        const ddy = player.y - e.y;

        if (Math.abs(ddx) > Math.abs(ddy)) {
            moveX = ddx > 0 ? 1 : -1;
        } else {
            moveY = ddy > 0 ? 1 : -1;
        }

        const nx = e.x + moveX;
        const ny = e.y + moveY;

        if (
            nx < 0 || nx >= mapDim ||
            ny < 0 || ny >= mapDim ||
            grid[ny][nx] === WALL
        ) break;

        const enemyThere = enemies.find(o =>
            o.alive && o !== e && o.x === nx && o.y === ny
        );
        if (enemyThere) break;

        await animMove(e, nx, ny, e.speed * 1.4, () => {
            e.x = nx;
            e.y = ny;
            e.dir = { x: moveX, y: moveY };
        });

        steps++;

        // INSTANT TRAP DEATH
        if (grid[e.y][e.x] === TRAP) {
            grid[e.y][e.x] = FLOOR;
            e.alive = false;
            e.state = 'dead';
            e.hp = 0;
            stats.kills++;
            createDeathEffect(e.x, e.y);
            createTrapEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
            return;
        }

        await new Promise(r => setTimeout(r, 120));
    }
}

// ============================================
// MOVE TOWARD LAST SEEN
// ============================================
async function moveTowardLastSeen(e) {
    if (!e.lastSeenPlayer) return;

    const dx = e.lastSeenPlayer.x - e.x;
    const dy = e.lastSeenPlayer.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist <= 1) return;

    let moveX = Math.sign(dx);
    let moveY = Math.sign(dy);

    const nx = e.x + (Math.abs(dx) > Math.abs(dy) ? moveX : 0);
    const ny = e.y + (Math.abs(dx) > Math.abs(dy) ? 0 : moveY);

    if (
        nx >= 0 && nx < mapDim &&
        ny >= 0 && ny < mapDim &&
        grid[ny][nx] !== WALL
    ) {
        await animMove(e, nx, ny, e.speed * 1.2, () => {
            e.x = nx;
            e.y = ny;
        });
    }
}

// ============================================
// PATROL BEHAVIOR
// ============================================
async function patrolBehavior(e) {
    const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = e.x + dir.x;
    const ny = e.y + dir.y;

    if (
        nx >= 0 && nx < mapDim &&
        ny >= 0 && ny < mapDim &&
        grid[ny][nx] !== WALL
    ) {
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
            e.dir = dir;
        });
    }
}