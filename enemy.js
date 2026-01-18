// ============================================
// ENEMY AI & DETECTION SYSTEM (FIXED)
// ============================================

async function processEnemyTurn(e) {
    if (!e.alive) return;

    // INSTANT TRAP CHECK (START TURN)
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

    // SLEEP
    if (e.isSleeping) {
        e.sleepTimer--;
        if (e.sleepTimer > 0) {
            createSpeechBubble(e.x, e.y, "💤 Zzz...", "#888", 2);
            return;
        }
        e.isSleeping = false;
    }

    // POISON RICE
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

    // GAS
    const gas = activeGas.find(g => g.x === e.x && g.y === e.y);
    if (gas && !e.isSleeping) {
        e.isSleeping = true;
        e.sleepTimer = Math.floor(Math.random() * 5) + 2;
        createSpeechBubble(e.x, e.y, "💤 Gas!", "#9932cc", 2);
        return;
    }

    const canSeePlayer =
        !player.isHidden &&
        !e.isSleeping &&
        hasLineOfSight(e, player.x, player.y);

    // =========================
    // PLAYER SEEN → CHASE
    // =========================
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

    // =========================
    // LOST PLAYER → INVESTIGATE
    // =========================
    if (e.state === 'chasing' && !canSeePlayer) {
        e.alertTurns--;

        if (e.alertTurns <= 0) {
            e.state = 'patrolling';
            e.lastSeenPlayer = null;
            return;
        }

        e.state = 'investigating';
        await investigateBehavior(e);
        return;
    }

    // =========================
    // INVESTIGATING
    // =========================
    if (e.state === 'investigating') {
        await investigateBehavior(e);
        return;
    }

    // =========================
    // PATROL
    // =========================
    await patrolBehavior(e);
}

// ============================================
// CHASE PLAYER (FIXED)
// ============================================
async function chasePlayer(e) {
    if (!e.alive || e.isSleeping) return;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    // ATTACK
    if (dist <= e.attackRange) {
        createSpeechBubble(e.x, e.y, "🎯 ATTACK!", e.color, 2);

        await new Promise(r => setTimeout(r, 300));

        playerHP -= e.damage;
        playerHP = Math.max(0, playerHP);
        createDamageEffect(player.x, player.y, e.damage, true);
        shake = 15;

        if (playerHP <= 0) {
            gameOver = true;
            setTimeout(showGameOverScreen, 500);
        }
        return;
    }

    // MOVE TOWARD PLAYER
    let moveX = 0;
    let moveY = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
        moveX = Math.sign(dx);
    } else {
        moveY = Math.sign(dy);
    }

    const nx = e.x + moveX;
    const ny = e.y + moveY;

    if (
        nx < 0 || nx >= mapDim ||
        ny < 0 || ny >= mapDim ||
        grid[ny][nx] === WALL
    ) return;

    const enemyThere = enemies.find(o =>
        o.alive && o !== e && o.x === nx && o.y === ny
    );
    if (enemyThere) return;

    await animMove(e, nx, ny, e.speed * 1.4, () => {
        e.x = nx;
        e.y = ny;
        e.dir = { x: moveX, y: moveY };
    });

    // TRAP
    if (grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createTrapEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
    }
}

// ============================================
// INVESTIGATE LAST SEEN POSITION (FIXED)
// ============================================
async function investigateBehavior(e) {
    if (!e.lastSeenPlayer) {
        e.state = 'patrolling';
        return;
    }

    const dx = e.lastSeenPlayer.x - e.x;
    const dy = e.lastSeenPlayer.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    if (dist <= 1) {
        createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);
        e.state = 'patrolling';
        e.lastSeenPlayer = null;
        return;
    }

    let moveX = 0;
    let moveY = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
        moveX = Math.sign(dx);
    } else {
        moveY = Math.sign(dy);
    }

    const nx = e.x + moveX;
    const ny = e.y + moveY;

    if (
        nx < 0 || nx >= mapDim ||
        ny < 0 || ny >= mapDim ||
        grid[ny][nx] === WALL
    ) return;

    const enemyThere = enemies.find(o =>
        o.alive && o !== e && o.x === nx && o.y === ny
    );
    if (enemyThere) return;

    await animMove(e, nx, ny, e.speed * 1.2, () => {
        e.x = nx;
        e.y = ny;
        e.dir = { x: moveX, y: moveY };
    });

    // TRAP
    if (grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createTrapEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);
    }
}

// ============================================
// PATROL (UNCHANGED SIMPLE)
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