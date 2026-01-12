function log(msg, color = "#aaa") {
    const div = document.createElement('div');
    div.innerText = `> ${msg}`;
    div.style.color = color;
    document.getElementById('missionLog').prepend(div);
}

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
}

function showVictory() {
    gameOver = true;
    const score = (stats.kills * 50) + (stats.coins * 100) - (turnCount * 2);
    let rank = score > 500 ? "GRAND MASTER" : score > 250 ? "NINJA" : "NOVICE";
    
    document.getElementById('rankLabel').innerText = rank;
    document.getElementById('statsTable').innerHTML = `
        <div class="stat-line"><span>Kills</span><span>${stats.kills}</span></div>
        <div class="stat-line"><span>Coins</span><span>${stats.coins}</span></div>
        <div class="stat-line"><span>Turns</span><span>${turnCount}</span></div>
        <div class="stat-line" style="border-top:2px solid #333"><span>Total</span><span>${score}</span></div>
    `;
    document.getElementById('resultScreen').classList.remove('hidden');
}
