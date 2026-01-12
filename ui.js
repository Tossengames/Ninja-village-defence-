function log(msg, color = "#aaa") {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerText = `> ${msg}`;
    div.style.color = color;
    document.getElementById('missionLog').prepend(div);
}

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if (document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1))) {
        document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
    }
}

function adjustZoom(amt) {
    zoom = Math.max(0.4, Math.min(2.0, zoom + amt));
}

function showVictory() {
    gameOver = true;
    const killBonus = stats.kills * 50;
    const coinBonus = stats.coins * 100;
    const timePenalty = turnCount * 2;
    const score = killBonus + coinBonus - timePenalty;
    
    let rank = "NOVICE";
    if (score > 800) rank = "GRAND MASTER";
    else if (score > 400) rank = "EXPERT";
    else if (score > 200) rank = "NINJA";
    
    document.getElementById('rankLabel').innerText = rank;
    document.getElementById('statsTable').innerHTML = `
        <div class="stat-line"><span>Kills</span><span>${stats.kills}</span></div>
        <div class="stat-line"><span>Coins</span><span>${stats.coins}</span></div>
        <div class="stat-line"><span>Turns</span><span>${turnCount}</span></div>
        <div class="stat-line" style="border-top:2px solid #333; font-weight:bold;"><span>Score</span><span>${score}</span></div>
    `;
    document.getElementById('resultScreen').classList.remove('hidden');
}
