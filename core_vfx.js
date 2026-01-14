// ============================================
// VFX & AUDIO SYSTEM
// ============================================

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.3;
    } catch (e) {
        console.log("Audio not supported:", e);
    }
}

function playSound(type, options = {}) {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(gainNode);
        
        switch(type) {
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.5, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
                
            case 'coin':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1046.5, audioContext.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
                
            case 'step':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.08);
                gain.gain.setValueAtTime(0.1, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.08);
                break;
                
            case 'death':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.6);
                gain.gain.setValueAtTime(0.4, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.6);
                break;
                
            case 'hide':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(164.81, audioContext.currentTime + 0.2);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
                
            case 'trap':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
                
            case 'alert':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
                
            case 'attack':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
        }
        
    } catch (e) {
        console.log("Sound error:", e);
    }
}

// VFX Functions
function createBloodStain(x, y) {
    bloodStains.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        size: Math.random() * 20 + 10,
        opacity: 0.8,
        life: 1000
    });
}

function createDeathEffect(x, y) {
    for(let i = 0; i < 15; i++) {
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: `rgb(${Math.floor(Math.random() * 100 + 155)}, 0, 0)`,
            size: Math.random() * 5 + 3
        });
    }
    
    createBloodStain(x, y);
    playSound('death');
    createSpeechBubble(x, y, "💀 KILLED!", "#ff0000", 1);
}

function createExplosionEffect(x, y) {
    explosionEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        radius: 10,
        maxRadius: TILE * 1.5,
        life: 1.0,
        shockwave: 0
    });
    
    for(let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: `rgb(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100)}, 0)`,
            size: Math.random() * 4 + 2
        });
    }
    
    playSound('explosion');
    createSpeechBubble(x, y, "💥 BOOM!", "#ff9900", 1);
}

function createCoinPickupEffect(x, y) {
    coinPickupEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        particles: Array.from({length: 8}, (_, i) => ({
            angle: (i / 8) * Math.PI * 2,
            distance: 0,
            maxDistance: 30,
            speed: 1 + Math.random() * 0.5,
            life: 1.0
        })),
        life: 1.0
    });
    
    playSound('coin');
    createSpeechBubble(x, y, "💰 +1 GOLD", "#ffd700", 1);
}

function createHideEffect(x, y, isHiding) {
    hideEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        radius: isHiding ? TILE/2 : 0,
        targetRadius: isHiding ? TILE * 1.2 : 0,
        life: 1.0,
        color: isHiding ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255, 255, 255, 0.3)'
    });
    
    if(isHiding) {
        playSound('hide');
        createSpeechBubble(x, y, "🕶️ HIDING", "#00d2ff", 1);
    }
}

function createFootstepEffect(x, y) {
    footstepEffects.push({
        x: x * TILE + TILE/2 + (Math.random() - 0.5) * 10,
        y: y * TILE + TILE/2 + (Math.random() - 0.5) * 10,
        life: 1.0,
        size: Math.random() * 8 + 4
    });
    
    if(Math.random() < 0.3) {
        playSound('step');
    }
}

function createTrapEffect(x, y) {
    for(let i = 0; i < 10; i++) {
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 1.0,
            color: 'rgba(100, 100, 100, 0.7)',
            size: Math.random() * 4 + 2
        });
    }
    
    playSound('trap');
    createSpeechBubble(x, y, "⚠️ TRAP!", "#ff6464", 1);
}

function createAlertEffect(x, y) {
    particles.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2,
        vx: 0,
        vy: 0,
        life: 1.0,
        color: 'rgba(255, 0, 0, 0.8)',
        size: TILE/2,
        pulse: true
    });
    
    playSound('alert');
}

function createDamageEffect(x, y, damage, isPlayer = false) {
    for(let i = 0; i < 8; i++) {
        particles.push({
            x: x * TILE + TILE/2,
            y: y * TILE + TILE/2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            color: isPlayer ? 'rgba(255, 100, 255, 0.8)' : 'rgba(255, 100, 100, 0.8)',
            size: Math.random() * 3 + 2
        });
    }
    
    damageEffects.push({
        x: x * TILE + TILE/2,
        y: y * TILE + TILE/2 - 20,
        value: `-${damage}`,
        life: 1.0,
        color: isPlayer ? '#ff66ff' : '#ff6666'
    });
    
    playSound(isPlayer ? 'attack' : 'attack');
}

function createSpeechBubble(x, y, text, color = "#ffffff", duration = 1) {
    speechBubbles.push({
        x: x * TILE + TILE/2,
        y: y * TILE - 50,
        text: text,
        color: color,
        life: duration,
        maxLife: duration,
        scale: 0,
        vy: -0.3
    });
}

function updateVFX() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.03;
        return p.life > 0;
    });
    
    explosionEffects = explosionEffects.filter(e => {
        e.radius += 15;
        e.shockwave += 5;
        e.life -= 0.05;
        return e.life > 0;
    });
    
    coinPickupEffects = coinPickupEffects.filter(e => {
        e.particles.forEach(p => {
            p.distance = Math.min(p.distance + p.speed, p.maxDistance);
        });
        e.life -= 0.03;
        return e.life > 0;
    });
    
    hideEffects = hideEffects.filter(e => {
        e.radius += (e.targetRadius - e.radius) * 0.2;
        e.life -= 0.05;
        return e.life > 0;
    });
    
    footstepEffects = footstepEffects.filter(f => {
        f.life -= 0.1;
        return f.life > 0;
    });
    
    damageEffects = damageEffects.filter(d => {
        d.y -= 1;
        d.life -= 0.03;
        return d.life > 0;
    });
    
    speechBubbles = speechBubbles.filter(b => {
        b.life -= 0.04;
        b.scale = Math.min(1, (b.maxLife - b.life) * 2);
        if(b.life < 0.3) {
            b.scale = b.life / 0.3;
        }
        b.y += b.vy;
        return b.life > 0;
    });
    
    bloodStains = bloodStains.filter(stain => {
        stain.life -= 1;
        return stain.life > 0;
    });
}

function drawVFX() {
    // Draw blood stains
    bloodStains.forEach(stain => {
        ctx.fillStyle = `rgba(139, 0, 0, ${stain.opacity * (stain.life / 1000)})`;
        ctx.beginPath();
        ctx.arc(stain.x, stain.y, stain.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw particles
    particles.forEach(p => {
        if(p.pulse) {
            const pulseSize = p.size * (0.8 + Math.sin(Date.now() / 100) * 0.2);
            ctx.fillStyle = p.color.replace('0.8', p.life.toString());
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = p.color.replace('1.0', p.life.toString());
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw explosion effects
    explosionEffects.forEach(e => {
        ctx.strokeStyle = `rgba(255, 165, 0, ${e.life})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.shockwave, 0, Math.PI * 2);
        ctx.stroke();
        
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${e.life})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${e.life * 0.7})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw coin pickup effects
    coinPickupEffects.forEach(e => {
        e.particles.forEach(p => {
            const x = e.x + Math.cos(p.angle) * p.distance;
            const y = e.y + Math.sin(p.angle) * p.distance;
            
            ctx.fillStyle = `rgba(255, 215, 0, ${e.life})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    
    // Draw hide effects
    hideEffects.forEach(e => {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gradient.addColorStop(0, e.color.replace('0.3', (e.life * 0.3).toString()));
        gradient.addColorStop(1, e.color.replace('0.3', '0'));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw footstep effects
    footstepEffects.forEach(f => {
        ctx.fillStyle = `rgba(200, 200, 200, ${f.life * 0.5})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * f.life, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw damage effects
    damageEffects.forEach(d => {
        ctx.fillStyle = d.color.replace('1.0', d.life.toString());
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText(d.value, d.x, d.y);
    });
    
    // Draw speech bubbles
    speechBubbles.forEach(b => {
        const alpha = b.life * 0.8;
        const fontSize = Math.floor(12 * b.scale);
        const width = Math.min(120, b.text.length * 8);
        const height = 25;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(
            b.x - (width * b.scale) / 2,
            b.y - (height * b.scale) / 2,
            width * b.scale,
            height * b.scale
        );
        
        ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(
            b.x - (width * b.scale) / 2,
            b.y - (height * b.scale) / 2,
            width * b.scale,
            height * b.scale
        );
        
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.text, b.x, b.y);
    });
}