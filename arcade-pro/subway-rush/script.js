// ===== CONFIGURATION =====
const CONFIG = {
    LANE_WIDTH: 2.5,
    LANE_POSITIONS: [-2.5, 0, 2.5],
    TRACK_WIDTH: 10,
    VISIBLE_DISTANCE: 120,
    GROUND_Y: 0,
    PLAYER_HEIGHT: 1.8,
    CAMERA_HEIGHT: 6,
    CAMERA_DISTANCE: 10,
    CAMERA_FOV: 70,
    BASE_SPEED: 20,
    MAX_SPEED: 45,
    ACCELERATION: 0.18,
    JUMP_HEIGHT: 3.5,
    JUMP_DURATION: 550,
    SUPER_JUMP_HEIGHT: 5.5,
    SLIDE_DURATION: 500,
    LANE_SWITCH_DURATION: 140,
    COIN_RADIUS: 0.4,
    COIN_SPIN_SPEED: 200,
    COIN_MAGNET_RANGE: 6,
    OBSTACLE_MIN_GAP: 18,
    OBSTACLE_MAX_GAP: 35,
    PLAYER_HITBOX_SHRINK: 0.15,
    OBSTACLE_HITBOX_SHRINK: 0.1,
    JETPACK_DURATION: 8000,
    MAGNET_DURATION: 10000,
    SNEAKERS_DURATION: 10000,
    HOVERBOARD_DURATION: 30000,
    DEFAULT_COINS: 5000
};

const COLORS = {
    SKY_TOP: '#4A90D9',
    SKY_BOTTOM: '#87CEEB',
    GROUND: '#8B7355',
    GROUND_ALT: '#7A6449',
    RAIL: '#708090',
    TIE: '#654321',
    GRAFFITI: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#74B9FF'],
    WALL: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'],
    TRAIN: '#2C3E50',
    TRAIN_LIGHT: '#3D566E',
    TRAIN_STRIPE: '#E74C3C',
    TRAIN_WINDOW: '#85C1E9',
    COIN: '#FFD700',
    COIN_EDGE: '#FFA500',
    BARRIER: '#FF6B35',
    BARRIER_STRIPE: '#FFE66D',
    OVERHEAD: '#2ECC71'
};

// ===== UTILITY FUNCTIONS =====
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInCubic = t => t * t * t;
const easeOutQuad = t => 1 - (1 - t) * (1 - t);
const easeInQuad = t => t * t;
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function formatNumber(num) {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ===== SOUND MANAGER =====
class SoundManager {
    constructor() {
        this.enabled = true;
        this.context = null;
        this.initialized = false;
        this.masterVolume = 0.5;
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }
    
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.context) return;
        
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
        
        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        
        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    }
    
    playNoise(duration, volume = 0.2) {
        if (!this.enabled || !this.context) return;
        
        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.context.createBufferSource();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        
        source.start();
    }
    
    playCoin() {
        this.playTone(880, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(1320, 0.15, 'sine', 0.2), 50);
    }
    
    playJump() {
        this.playTone(300, 0.1, 'sine', 0.3);
        this.playTone(400, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(500, 0.15, 'sine', 0.2), 50);
    }
    
    playSlide() {
        this.playNoise(0.2, 0.15);
    }
    
    playFootstep() {
        this.playNoise(0.05, 0.08);
    }
    
    playPowerUp() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTone(400 + i * 100, 0.1, 'sine', 0.25), i * 40);
        }
    }
    
    playTrainHorn() {
        this.playTone(180, 0.4, 'sawtooth', 0.3);
        this.playTone(220, 0.4, 'sawtooth', 0.25);
    }
    
    playGameOver() {
        this.playTone(400, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(300, 0.2, 'sawtooth', 0.25), 150);
        setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.3), 300);
    }
    
    playClick() {
        this.playTone(600, 0.05, 'square', 0.2);
    }
    
    playHoverboard() {
        this.playTone(200, 0.1, 'sine', 0.2);
        this.playTone(250, 0.1, 'sine', 0.15);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// ===== 3D MATH =====
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    clone() { return new Vector3(this.x, this.y, this.z); }
    add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
    scale(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() {
        const len = this.length();
        return len === 0 ? new Vector3() : this.scale(1 / len);
    }
    distanceTo(v) { return this.sub(v).length(); }
}

// ===== CAMERA =====
class Camera {
    constructor() {
        this.position = new Vector3(0, CONFIG.CAMERA_HEIGHT, -CONFIG.CAMERA_DISTANCE);
        this.fov = CONFIG.CAMERA_FOV;
        this.shake = { x: 0, y: 0, intensity: 0 };
        this.tilt = 0;
        this.targetTilt = 0;
    }
    
    project(point, screenWidth, screenHeight) {
        const relativePos = point.sub(this.position);
        if (relativePos.z <= 0.1) return null;
        
        const fovRad = this.fov * Math.PI / 180;
        const aspect = screenWidth / screenHeight;
        const scale = 1 / Math.tan(fovRad / 2);
        
        let x = (relativePos.x * scale / relativePos.z) / aspect;
        let y = -(relativePos.y * scale / relativePos.z);
        
        const tiltRad = this.tilt * Math.PI / 180;
        const rotatedX = x * Math.cos(tiltRad) - y * Math.sin(tiltRad) * 0.1;
        
        const screenX = (rotatedX + 1) * screenWidth / 2 + this.shake.x;
        const screenY = (y + 1) * screenHeight / 2 + this.shake.y;
        
        return { x: screenX, y: screenY, z: relativePos.z, scale: scale / relativePos.z };
    }
    
    update(dt) {
        this.tilt = lerp(this.tilt, this.targetTilt, 0.1);
        if (this.shake.intensity > 0) {
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity * 25;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity * 25;
            this.shake.intensity *= 0.88;
            if (this.shake.intensity < 0.01) this.shake.intensity = 0;
        } else {
            this.shake.x = 0;
            this.shake.y = 0;
        }
    }
    
    addShake(intensity) {
        this.shake.intensity = Math.min(1, this.shake.intensity + intensity);
    }
    
    setTilt(tilt) {
        this.targetTilt = tilt;
    }
}

// ===== RENDERER =====
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    clear() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
        gradient.addColorStop(0, COLORS.SKY_TOP);
        gradient.addColorStop(1, COLORS.SKY_BOTTOM);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    drawQuad(p1, p2, p3, p4, color, stroke = null) {
        if (!p1 || !p2 || !p3 || !p4) return;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
    
    drawCircle(x, y, radius, color, stroke = null, strokeWidth = 2) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.stroke();
        }
    }
    
    drawEllipse(x, y, radiusX, radiusY, color, stroke = null) {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, Math.max(0.1, radiusX), Math.max(0.1, radiusY), 0, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
    
    drawRoundedRect(x, y, w, h, radius, color, stroke = null) {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, radius);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }
}

// ===== PARTICLE SYSTEM =====
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 200;
    }
    
    emit(x, y, count, color, options = {}) {
        const { speed = 5, size = 4, life = 1, gravity = 0.2, spread = 1 } = options;
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * speed * spread,
                vy: (Math.random() - 0.5) * speed - 1,
                life,
                maxLife: life,
                decay: 0.02 + Math.random() * 0.02,
                size: size + Math.random() * size,
                color,
                gravity
            });
        }
    }
    
    emitTrail(x, y, color) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + Math.random() * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 2,
                life: 0.5,
                maxLife: 0.5,
                decay: 0.03,
                size: 3 + Math.random() * 4,
                color,
                gravity: -0.1
            });
        }
    }
    
    update(dt) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= p.decay;
            return p.life > 0;
        });
    }
    
    render(renderer) {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            renderer.ctx.globalAlpha = alpha;
            renderer.ctx.fillStyle = p.color;
            renderer.ctx.beginPath();
            renderer.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            renderer.ctx.fill();
        });
        renderer.ctx.globalAlpha = 1;
    }
    
    clear() {
        this.particles = [];
    }
}

// ===== PLAYER =====
class Player {
    constructor() {
        this.lane = 1;
        this.targetLane = 1;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.state = 'RUNNING';
        this.stateTime = 0;
        this.animTime = 0;
        this.footstepTimer = 0;
        this.laneChangeFrom = 1;
        this.jumpStartY = 0;
        this.speed = CONFIG.BASE_SPEED;
        this.powerUps = {
            jetpack: { active: false, timeLeft: 0 },
            magnet: { active: false, timeLeft: 0 },
            sneakers: { active: false, timeLeft: 0 },
            hoverboard: { active: false, timeLeft: 0 }
        };
        this.colors = {
            skin: '#F4C7A1',
            shirt: '#4A90D9',
            pants: '#2C3E50',
            shoes: '#E74C3C',
            hair: '#5D4E37'
        };
    }
    
    update(dt, sound) {
        this.animTime += dt * 1000;
        this.stateTime += dt * 1000;
        
        if (this.state === 'RUNNING' && !this.powerUps.jetpack.active && this.y < 0.1) {
            this.footstepTimer += dt * 1000;
            if (this.footstepTimer > 200 - (this.speed * 2)) {
                sound.playFootstep();
                this.footstepTimer = 0;
            }
        }
        
        Object.keys(this.powerUps).forEach(key => {
            if (this.powerUps[key].active) {
                this.powerUps[key].timeLeft -= dt * 1000;
                if (this.powerUps[key].timeLeft <= 0) {
                    this.powerUps[key].active = false;
                    this.powerUps[key].timeLeft = 0;
                }
            }
        });
        
        if (this.powerUps.jetpack.active) {
            this.y = lerp(this.y, 5, 2 * dt);
            this.state = 'RUNNING';
        } else if (this.y > 0 && this.state !== 'JUMPING') {
            this.y = lerp(this.y, 0, 5 * dt);
            if (this.y < 0.05) this.y = 0;
        }
        
        if (this.lane !== this.targetLane) {
            const progress = Math.min(1, this.stateTime / CONFIG.LANE_SWITCH_DURATION);
            const eased = easeOutCubic(progress);
            this.x = lerp(CONFIG.LANE_POSITIONS[this.laneChangeFrom], CONFIG.LANE_POSITIONS[this.targetLane], eased);
            if (progress >= 1) {
                this.lane = this.targetLane;
                this.x = CONFIG.LANE_POSITIONS[this.lane];
                if (this.state === 'LANE_CHANGE') {
                    this.setState('RUNNING');
                }
            }
        } else {
            this.x = CONFIG.LANE_POSITIONS[this.lane];
        }
        
        if (this.state === 'JUMPING' && !this.powerUps.jetpack.active) {
            const jumpHeight = this.powerUps.sneakers.active ? CONFIG.SUPER_JUMP_HEIGHT : CONFIG.JUMP_HEIGHT;
            const progress = this.stateTime / CONFIG.JUMP_DURATION;
            if (progress < 0.45) {
                const t = progress / 0.45;
                this.y = this.jumpStartY + jumpHeight * easeOutQuad(t);
            } else if (progress < 1) {
                const t = (progress - 0.45) / 0.55;
                this.y = this.jumpStartY + jumpHeight * (1 - easeInQuad(t));
            } else {
                this.y = 0;
                this.setState('RUNNING');
            }
        }
        
        if (this.state === 'SLIDING') {
            if (this.stateTime >= CONFIG.SLIDE_DURATION) {
                this.setState('RUNNING');
            }
        }
        
        if (this.speed < CONFIG.MAX_SPEED) {
            this.speed += CONFIG.ACCELERATION * dt;
        }
        
        if (this.powerUps.hoverboard.active) {
            this.speed = Math.min(CONFIG.MAX_SPEED, this.speed * 1.001);
        }
    }
    
    setState(newState) {
        this.state = newState;
        this.stateTime = 0;
        if (newState === 'JUMPING') {
            this.jumpStartY = this.y;
        }
    }
    
    jump(sound) {
        if (this.powerUps.jetpack.active) return;
        if (this.state === 'RUNNING' || this.state === 'LANE_CHANGE') {
            this.setState('JUMPING');
            sound.playJump();
        }
    }
    
    slide(sound) {
        if (this.powerUps.jetpack.active) return;
        if (this.state === 'RUNNING' || this.state === 'LANE_CHANGE') {
            this.setState('SLIDING');
            sound.playSlide();
        }
    }
    
    moveLeft(camera) {
        if (this.targetLane > 0) {
            this.laneChangeFrom = this.targetLane;
            this.targetLane--;
            camera.setTilt(-5);
            setTimeout(() => camera.setTilt(0), 200);
            if (this.state !== 'JUMPING' && this.state !== 'SLIDING') {
                this.setState('LANE_CHANGE');
            } else {
                this.stateTime = 0;
            }
        }
    }
    
    moveRight(camera) {
        if (this.targetLane < 2) {
            this.laneChangeFrom = this.targetLane;
            this.targetLane++;
            camera.setTilt(5);
            setTimeout(() => camera.setTilt(0), 200);
            if (this.state !== 'JUMPING' && this.state !== 'SLIDING') {
                this.setState('LANE_CHANGE');
            } else {
                this.stateTime = 0;
            }
        }
    }
    
    activatePowerUp(type, sound) {
        const durations = {
            jetpack: CONFIG.JETPACK_DURATION,
            magnet: CONFIG.MAGNET_DURATION,
            sneakers: CONFIG.SNEAKERS_DURATION,
            hoverboard: CONFIG.HOVERBOARD_DURATION
        };
        this.powerUps[type].active = true;
        this.powerUps[type].timeLeft = durations[type];
        sound.playPowerUp();
    }
    
    getHitbox() {
        const shrink = CONFIG.PLAYER_HITBOX_SHRINK;
        const height = this.state === 'SLIDING' ? 0.7 : 1.5;
        const yOffset = this.state === 'SLIDING' ? 0.35 : 0.75;
        return {
            x: this.x - 0.35 + shrink,
            y: this.y + yOffset - height / 2,
            z: this.z - 0.25 + shrink,
            width: 0.7 - shrink * 2,
            height: height,
            depth: 0.5 - shrink * 2
        };
    }
    
    render(renderer, camera, particles) {
        const basePos = new Vector3(this.x, this.y, this.z);
        if (this.powerUps.jetpack.active) this.renderJetpackEffects(renderer, camera, basePos, particles);
        if (this.powerUps.hoverboard.active) this.renderHoverboard(renderer, camera, basePos);
        if (this.powerUps.sneakers.active) this.renderSneakersGlow(renderer, camera, basePos);
        if (this.powerUps.magnet.active) this.renderMagnetField(renderer, camera, basePos);
        
        const runCycle = (this.animTime % 250) / 250;
        const bobHeight = Math.sin(runCycle * Math.PI * 2) * 0.1;
        const armSwing = Math.sin(runCycle * Math.PI * 2) * 0.35;
        const legSwing = Math.sin(runCycle * Math.PI * 2) * 0.45;
        
        if (this.state === 'SLIDING') {
            this.renderSliding(renderer, camera, basePos);
        } else if (this.state === 'JUMPING' || this.powerUps.jetpack.active) {
            this.renderJumping(renderer, camera, basePos);
        } else {
            this.renderRunning(renderer, camera, basePos, bobHeight, armSwing, legSwing);
        }
    }
    
    renderJetpackEffects(renderer, camera, basePos, particles) {
        const packPos = basePos.add(new Vector3(0, 1.0, -0.3));
        const proj = camera.project(packPos, renderer.width, renderer.height);
        if (proj && proj.z > 0) {
            const size = 0.4 * proj.scale * renderer.height;
            renderer.drawRoundedRect(proj.x - size/2, proj.y - size, size, size * 1.5, 5, '#555', '#333');
            particles.emitTrail(proj.x, proj.y + size, '#FF6B6B');
            particles.emitTrail(proj.x, proj.y + size, '#FFE66D');
        }
    }
    
    renderHoverboard(renderer, camera, basePos) {
        const boardPos = basePos.add(new Vector3(0, 0.1, 0));
        const proj = camera.project(boardPos, renderer.width, renderer.height);
        if (proj && proj.z > 0) {
            const width = 0.8 * proj.scale * renderer.height;
            const height = 0.15 * proj.scale * renderer.height;
            const gradient = renderer.ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, width);
            gradient.addColorStop(0, 'rgba(170, 150, 218, 0.5)');
            gradient.addColorStop(1, 'rgba(170, 150, 218, 0)');
            renderer.ctx.fillStyle = gradient;
            renderer.ctx.fillRect(proj.x - width, proj.y - height * 2, width * 2, height * 4);
            renderer.drawRoundedRect(proj.x - width/2, proj.y - height/2, width, height, height/2, '#AA96DA', '#8B7AC7');
        }
    }
    
    renderSneakersGlow(renderer, camera, basePos) {
        const proj = camera.project(basePos.add(new Vector3(0, 0.2, 0)), renderer.width, renderer.height);
        if (proj && proj.z > 0) {
            const size = 0.5 * proj.scale * renderer.height;
            const gradient = renderer.ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size);
            gradient.addColorStop(0, 'rgba(149, 225, 211, 0.6)');
            gradient.addColorStop(1, 'rgba(149, 225, 211, 0)');
            renderer.ctx.fillStyle = gradient;
            renderer.ctx.beginPath();
            renderer.ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
            renderer.ctx.fill();
        }
    }
    
    renderMagnetField(renderer, camera, basePos) {
        const proj = camera.project(basePos.add(new Vector3(0, 1, 0)), renderer.width, renderer.height);
        if (proj && proj.z > 0) {
            const size = CONFIG.COIN_MAGNET_RANGE * proj.scale * renderer.height * 0.5;
            renderer.ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
            renderer.ctx.lineWidth = 3;
            renderer.ctx.setLineDash([10, 10]);
            renderer.ctx.beginPath();
            renderer.ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
            renderer.ctx.stroke();
            renderer.ctx.setLineDash([]);
        }
    }
    
    renderRunning(renderer, camera, basePos, bob, armSwing, legSwing) {
        const parts = [];
        parts.push({ pos: basePos.add(new Vector3(-0.15, 0.53 + bob, legSwing * 0.3)), w: 0.14, h: 0.5, color: this.colors.pants, z: 0.3 });
        parts.push({ pos: basePos.add(new Vector3(0.15, 0.53 + bob, -legSwing * 0.3)), w: 0.14, h: 0.5, color: this.colors.pants, z: -0.3 });
        parts.push({ pos: basePos.add(new Vector3(-0.15, 0.25 + bob, legSwing * 0.4)), w: 0.16, h: 0.15, color: this.colors.shoes, z: 0.4 });
        parts.push({ pos: basePos.add(new Vector3(0.15, 0.25 + bob, -legSwing * 0.4)), w: 0.16, h: 0.15, color: this.colors.shoes, z: -0.4 });
        parts.push({ pos: basePos.add(new Vector3(0, 1.05 + bob, 0)), w: 0.32, h: 0.55, color: this.colors.shirt, z: 0 });
        parts.push({ pos: basePos.add(new Vector3(-0.38, 1.0 + bob, -armSwing * 0.35)), w: 0.12, h: 0.45, color: this.colors.shirt, z: -armSwing * 0.35 });
        parts.push({ pos: basePos.add(new Vector3(0.38, 1.0 + bob, armSwing * 0.35)), w: 0.12, h: 0.45, color: this.colors.shirt, z: armSwing * 0.35 });
        parts.push({ pos: basePos.add(new Vector3(-0.38, 0.68 + bob, -armSwing * 0.45)), w: 0.1, h: 0.1, color: this.colors.skin, round: true, z: -armSwing * 0.45 });
        parts.push({ pos: basePos.add(new Vector3(0.38, 0.68 + bob, armSwing * 0.45)), w: 0.1, h: 0.1, color: this.colors.skin, round: true, z: armSwing * 0.45 });
        parts.push({ pos: basePos.add(new Vector3(0, 1.6 + bob * 0.4, 0)), w: 0.28, h: 0.28, color: this.colors.skin, round: true, z: 0 });
        parts.push({ pos: basePos.add(new Vector3(0, 1.75 + bob * 0.4, -0.03)), w: 0.25, h: 0.2, color: this.colors.hair, round: true, z: -0.03 });
        this.renderParts(renderer, camera, parts);
    }
    
    renderJumping(renderer, camera, basePos) {
        const jumpProgress = this.stateTime / CONFIG.JUMP_DURATION;
        const tuck = Math.sin(jumpProgress * Math.PI) * 0.25;
        const parts = [];
        parts.push({ pos: basePos.add(new Vector3(-0.18, 0.55 + tuck, 0.25)), w: 0.14, h: 0.4, color: this.colors.pants, z: 0.25 });
        parts.push({ pos: basePos.add(new Vector3(0.18, 0.55 + tuck, 0.25)), w: 0.14, h: 0.4, color: this.colors.pants, z: 0.25 });
        parts.push({ pos: basePos.add(new Vector3(0, 1.05, 0)), w: 0.32, h: 0.55, color: this.colors.shirt, z: 0 });
        parts.push({ pos: basePos.add(new Vector3(-0.5, 1.15, 0)), w: 0.12, h: 0.4, color: this.colors.shirt, z: 0 });
        parts.push({ pos: basePos.add(new Vector3(0.5, 1.15, 0)), w: 0.12, h: 0.4, color: this.colors.shirt, z: 0 });
        parts.push({ pos: basePos.add(new Vector3(0, 1.6, 0)), w: 0.28, h: 0.28, color: this.colors.skin, round: true, z: 0 });
        parts.push({ pos: basePos.add(new Vector3(0, 1.75, -0.03)), w: 0.25, h: 0.2, color: this.colors.hair, round: true, z: -0.03 });
        this.renderParts(renderer, camera, parts);
    }
    
    renderSliding(renderer, camera, basePos) {
        const slideY = 0.4;
        const parts = [];
        parts.push({ pos: basePos.add(new Vector3(0, slideY, 0.5)), w: 0.18, h: 0.65, color: this.colors.pants, z: 0.5 });
        parts.push({ pos: basePos.add(new Vector3(-0.2, slideY + 0.18, -0.1)), w: 0.14, h: 0.38, color: this.colors.pants, z: -0.1 });
        parts.push({ pos: basePos.add(new Vector3(0, slideY + 0.35, -0.15)), w: 0.32, h: 0.48, color: this.colors.shirt, z: -0.15 });
        parts.push({ pos: basePos.add(new Vector3(-0.35, slideY + 0.4, -0.25)), w: 0.12, h: 0.35, color: this.colors.shirt, z: -0.25 });
        parts.push({ pos: basePos.add(new Vector3(0.35, slideY + 0.4, -0.25)), w: 0.12, h: 0.35, color: this.colors.shirt, z: -0.25 });
        parts.push({ pos: basePos.add(new Vector3(0, slideY + 0.72, -0.2)), w: 0.26, h: 0.26, color: this.colors.skin, round: true, z: -0.2 });
        parts.push({ pos: basePos.add(new Vector3(0, slideY + 0.85, -0.22)), w: 0.22, h: 0.18, color: this.colors.hair, round: true, z: -0.22 });
        this.renderParts(renderer, camera, parts);
    }
    
    renderParts(renderer, camera, parts) {
        parts.sort((a, b) => b.z - a.z);
        parts.forEach(part => {
            const proj = camera.project(part.pos, renderer.width, renderer.height);
            if (!proj || proj.z <= 0) return;
            const w = part.w * proj.scale * renderer.height;
            const h = part.h * proj.scale * renderer.height;
            const darkerColor = this.darkenColor(part.color, 25);
            if (part.round) {
                renderer.drawCircle(proj.x, proj.y, w, part.color, darkerColor);
            } else {
                renderer.drawRoundedRect(proj.x - w/2, proj.y - h/2, w, h, w/4, part.color, darkerColor);
            }
        });
    }
    
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
        return `rgb(${r},${g},${b})`;
    }
}

// ===== TRACK SYSTEM =====
class TrackSystem {
    constructor() {
        this.offset = 0;
        this.segments = [];
        this.decorations = [];
        this.generateInitialTrack();
    }
    
    generateInitialTrack() {
        for (let i = 0; i < 6; i++) {
            this.segments.push(this.createSegment(i * 25));
        }
        for (let i = 0; i < 25; i++) {
            this.decorations.push(this.createDecoration(i * 12));
        }
    }
    
    createSegment(z) {
        return {
            z,
            leftWallColor: randomChoice(COLORS.WALL),
            rightWallColor: randomChoice(COLORS.WALL),
            graffitiColors: [randomChoice(COLORS.GRAFFITI), randomChoice(COLORS.GRAFFITI)],
            hasGraffiti: Math.random() > 0.4
        };
    }
    
    createDecoration(z) {
        return {
            z,
            side: Math.random() > 0.5 ? 1 : -1,
            type: randomChoice(['building', 'warehouse', 'tower']),
            height: randomRange(6, 18),
            width: randomRange(3, 6),
            color: randomChoice(COLORS.WALL),
            windows: Math.random() > 0.3
        };
    }
    
    update(dt, speed) {
        this.offset += speed * dt;
        this.segments = this.segments.filter(s => s.z - this.offset > -30);
        while (this.segments.length < 6) {
            const lastZ = this.segments.length > 0 ? this.segments[this.segments.length - 1].z : this.offset;
            this.segments.push(this.createSegment(lastZ + 25));
        }
        this.decorations = this.decorations.filter(d => d.z - this.offset > -15);
        while (this.decorations.length < 25) {
            const lastZ = this.decorations.length > 0 ? this.decorations[this.decorations.length - 1].z : this.offset;
            this.decorations.push(this.createDecoration(lastZ + 12));
        }
    }
    
    render(renderer, camera) {
        this.renderGround(renderer, camera);
        this.renderRails(renderer, camera);
        const sortedDecos = [...this.decorations].sort((a, b) => b.z - a.z);
        sortedDecos.forEach(d => this.renderDecoration(renderer, camera, d));
        this.segments.forEach(s => this.renderWalls(renderer, camera, s));
    }
    
    renderGround(renderer, camera) {
        const groundWidth = 9;
        const near = this.offset - 5;
        const far = this.offset + CONFIG.VISIBLE_DISTANCE;
        
        for (let z = near; z < far; z += 2.5) {
            const relZ = z - this.offset;
            const shade = Math.floor(z / 2.5) % 2 === 0 ? COLORS.GROUND : COLORS.GROUND_ALT;
            const p1 = camera.project(new Vector3(-groundWidth, 0, relZ), renderer.width, renderer.height);
            const p2 = camera.project(new Vector3(groundWidth, 0, relZ), renderer.width, renderer.height);
            const p3 = camera.project(new Vector3(groundWidth, 0, relZ + 2.5), renderer.width, renderer.height);
            const p4 = camera.project(new Vector3(-groundWidth, 0, relZ + 2.5), renderer.width, renderer.height);
            if (p1 && p2 && p3 && p4 && p1.z > 0) renderer.drawQuad(p1, p2, p3, p4, shade);
        }
        
        for (let z = near; z < far; z += 1.2) {
            const relZ = z - this.offset;
            const p1 = camera.project(new Vector3(-4.5, 0.03, relZ), renderer.width, renderer.height);
            const p2 = camera.project(new Vector3(4.5, 0.03, relZ), renderer.width, renderer.height);
            const p3 = camera.project(new Vector3(4.5, 0.03, relZ + 0.25), renderer.width, renderer.height);
            const p4 = camera.project(new Vector3(-4.5, 0.03, relZ + 0.25), renderer.width, renderer.height);
            if (p1 && p2 && p3 && p4 && p1.z > 0) renderer.drawQuad(p1, p2, p3, p4, COLORS.TIE);
        }
    }
    
    renderRails(renderer, camera) {
        CONFIG.LANE_POSITIONS.forEach(laneX => {
            [-0.35, 0.35].forEach(offset => {
                const x = laneX + offset;
                const near = this.offset - 5;
                const far = this.offset + CONFIG.VISIBLE_DISTANCE;
                for (let z = near; z < far; z += 4) {
                    const relZ = z - this.offset;
                    const p1 = camera.project(new Vector3(x - 0.06, 0.08, relZ), renderer.width, renderer.height);
                    const p2 = camera.project(new Vector3(x + 0.06, 0.08, relZ), renderer.width, renderer.height);
                    const p3 = camera.project(new Vector3(x + 0.06, 0.08, relZ + 4), renderer.width, renderer.height);
                    const p4 = camera.project(new Vector3(x - 0.06, 0.08, relZ + 4), renderer.width, renderer.height);
                    if (p1 && p2 && p3 && p4 && p1.z > 0) renderer.drawQuad(p1, p2, p3, p4, COLORS.RAIL);
                }
            });
        });
    }
    
    renderWalls(renderer, camera, segment) {
        const relZ = segment.z - this.offset;
        if (relZ < -10 || relZ > CONFIG.VISIBLE_DISTANCE) return;
        const wallHeight = 5;
        const wallX = 7;
        const segLength = 25;
        this.renderWall(renderer, camera, -wallX, relZ, segLength, wallHeight, segment.leftWallColor);
        this.renderWall(renderer, camera, wallX, relZ, segLength, wallHeight, segment.rightWallColor);
        if (segment.hasGraffiti) {
            this.renderGraffiti(renderer, camera, -wallX + 0.02, relZ + 3, 1.2, 2.8, 8, segment.graffitiColors[0]);
            this.renderGraffiti(renderer, camera, wallX - 0.02, relZ + 12, 1.5, 2.2, 6, segment.graffitiColors[1]);
        }
    }
    
    renderWall(renderer, camera, x, z, length, height, color) {
        const p1 = camera.project(new Vector3(x, 0, z), renderer.width, renderer.height);
        const p2 = camera.project(new Vector3(x, height, z), renderer.width, renderer.height);
        const p3 = camera.project(new Vector3(x, height, z + length), renderer.width, renderer.height);
        const p4 = camera.project(new Vector3(x, 0, z + length), renderer.width, renderer.height);
        if (p1 && p2 && p3 && p4 && p1.z > 0) renderer.drawQuad(p1, p2, p3, p4, color);
    }
    
    renderGraffiti(renderer, camera, x, z, y, height, width, color) {
        const g1 = camera.project(new Vector3(x, y, z), renderer.width, renderer.height);
        const g2 = camera.project(new Vector3(x, y + height, z), renderer.width, renderer.height);
        const g3 = camera.project(new Vector3(x, y + height, z + width), renderer.width, renderer.height);
        const g4 = camera.project(new Vector3(x, y, z + width), renderer.width, renderer.height);
        if (g1 && g2 && g3 && g4 && g1.z > 0) renderer.drawQuad(g1, g2, g3, g4, color);
    }
    
    renderDecoration(renderer, camera, deco) {
        const relZ = deco.z - this.offset;
        if (relZ < -10 || relZ > CONFIG.VISIBLE_DISTANCE) return;
        const x = deco.side * 14;
        const hw = deco.width / 2;
        const p1 = camera.project(new Vector3(x - hw, 0, relZ), renderer.width, renderer.height);
        const p2 = camera.project(new Vector3(x + hw, 0, relZ), renderer.width, renderer.height);
        const p3 = camera.project(new Vector3(x + hw, deco.height, relZ), renderer.width, renderer.height);
        const p4 = camera.project(new Vector3(x - hw, deco.height, relZ), renderer.width, renderer.height);
        if (p1 && p2 && p3 && p4 && p1.z > 0) {
            renderer.drawQuad(p1, p2, p3, p4, deco.color);
            if (deco.windows) {
                const windowColor = '#85C1E9';
                for (let row = 0; row < Math.min(4, deco.height / 3); row++) {
                    const wy = 2 + row * 3;
                    const w1 = camera.project(new Vector3(x - hw * 0.6, wy, relZ + 0.02), renderer.width, renderer.height);
                    const w2 = camera.project(new Vector3(x + hw * 0.6, wy, relZ + 0.02), renderer.width, renderer.height);
                    const w3 = camera.project(new Vector3(x + hw * 0.6, wy + 1.5, relZ + 0.02), renderer.width, renderer.height);
                    const w4 = camera.project(new Vector3(x - hw * 0.6, wy + 1.5, relZ + 0.02), renderer.width, renderer.height);
                    if (w1 && w2 && w3 && w4) renderer.drawQuad(w1, w2, w3, w4, windowColor);
                }
            }
        }
    }
    
    reset() {
        this.offset = 0;
        this.segments = [];
        this.decorations = [];
        this.generateInitialTrack();
    }
}

// ===== OBSTACLE MANAGER =====
class ObstacleManager {
    constructor() {
        this.obstacles = [];
        this.nextSpawnZ = 60;
        this.minGap = CONFIG.OBSTACLE_MIN_GAP;
        this.trainWarningPlayed = false;
    }
    
    reset() {
        this.obstacles = [];
        this.nextSpawnZ = 60;
        this.minGap = CONFIG.OBSTACLE_MIN_GAP;
        this.trainWarningPlayed = false;
    }
    
    update(dt, speed, trackOffset, distance, sound) {
        this.obstacles.forEach(obs => {
            if (obs.moving) obs.z -= obs.moveSpeed * dt;
        });
        this.obstacles = this.obstacles.filter(obs => obs.z - trackOffset > -15);
        while (this.nextSpawnZ - trackOffset < CONFIG.VISIBLE_DISTANCE) {
            this.spawnObstacle(this.nextSpawnZ, distance, sound);
            const gap = randomRange(this.minGap, CONFIG.OBSTACLE_MAX_GAP);
            this.nextSpawnZ += gap;
            this.minGap = Math.max(12, CONFIG.OBSTACLE_MIN_GAP - distance / 400);
        }
    }
    
    spawnObstacle(z, distance, sound) {
        const patterns = this.getPatterns(distance);
        const pattern = randomChoice(patterns);
        pattern.forEach(obs => {
            if (obs.type === 'train' && !this.trainWarningPlayed) {
                sound.playTrainHorn();
                this.trainWarningPlayed = true;
                setTimeout(() => this.trainWarningPlayed = false, 3000);
            }
            this.obstacles.push({ ...obs, z: z + (obs.zOffset || 0), active: true });
        });
    }
    
    getPatterns(distance) {
        const lane = () => randomInt(0, 2);
        const patterns = [
            [{ lane: lane(), type: 'barrier', width: 2.0, height: 1.1, depth: 0.7 }],
            (() => {
                const l = lane();
                const other = l === 1 ? (Math.random() > 0.5 ? 0 : 2) : 1;
                return [
                    { lane: l, type: 'barrier', width: 2.0, height: 1.1, depth: 0.7 },
                    { lane: other, type: 'barrier', width: 2.0, height: 1.1, depth: 0.7 }
                ];
            })(),
            [{ lane: lane(), type: 'overhead', width: 2.3, height: 0.9, depth: 0.5, y: 1.25 }],
        ];
        if (distance > 200) {
            patterns.push(
                [{ lane: -1, type: 'overhead_full', width: 8.5, height: 1.0, depth: 0.5, y: 1.15 }],
                [{ lane: lane(), type: 'train', width: 2.2, height: 3.3, depth: 12 }]
            );
        }
        if (distance > 500) {
            patterns.push(
                (() => {
                    const center = lane();
                    const trains = [0, 1, 2].filter(l => l !== center);
                    return trains.map(l => ({ lane: l, type: 'train', width: 2.2, height: 3.3, depth: 18 }));
                })(),
                [
                    { lane: 1, type: 'barrier', width: 2.0, height: 1.1, depth: 0.7, zOffset: 0 },
                    { lane: 1, type: 'overhead', width: 2.3, height: 0.9, depth: 0.5, y: 1.25, zOffset: 7 }
                ]
            );
        }
        if (distance > 800) {
            patterns.push([{ lane: lane(), type: 'train', width: 2.2, height: 3.3, depth: 10, moving: true, moveSpeed: 12 }]);
        }
        return patterns;
    }
    
    render(renderer, camera, trackOffset) {
        const sorted = [...this.obstacles].sort((a, b) => b.z - a.z);
        sorted.forEach(obs => {
            const relZ = obs.z - trackOffset;
            if (relZ < -10 || relZ > CONFIG.VISIBLE_DISTANCE) return;
            const x = obs.lane >= 0 ? CONFIG.LANE_POSITIONS[obs.lane] : 0;
            const y = obs.y || 0;
            switch (obs.type) {
                case 'barrier': this.renderBarrier(renderer, camera, x, y, relZ, obs); break;
                case 'overhead': case 'overhead_full': this.renderOverhead(renderer, camera, x, y, relZ, obs); break;
                case 'train': this.renderTrain(renderer, camera, x, y, relZ, obs); break;
            }
        });
    }
    
    renderBarrier(renderer, camera, x, y, z, obs) {
        const hw = obs.width / 2;
        const hd = obs.depth / 2;
        const f1 = camera.project(new Vector3(x - hw, y, z - hd), renderer.width, renderer.height);
        const f2 = camera.project(new Vector3(x + hw, y, z - hd), renderer.width, renderer.height);
        const f3 = camera.project(new Vector3(x + hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const f4 = camera.project(new Vector3(x - hw, y + obs.height, z - hd), renderer.width, renderer.height);
        if (f1 && f2 && f3 && f4 && f1.z > 0) {
            renderer.drawQuad(f1, f2, f3, f4, COLORS.BARRIER);
            for (let i = 0; i < 3; i++) {
                const sy = y + (obs.height / 3) * i;
                const stripeColor = i % 2 === 0 ? COLORS.BARRIER_STRIPE : COLORS.BARRIER;
                const s1 = camera.project(new Vector3(x - hw, sy, z - hd - 0.01), renderer.width, renderer.height);
                const s2 = camera.project(new Vector3(x + hw, sy, z - hd - 0.01), renderer.width, renderer.height);
                const s3 = camera.project(new Vector3(x + hw, sy + obs.height / 6, z - hd - 0.01), renderer.width, renderer.height);
                const s4 = camera.project(new Vector3(x - hw, sy + obs.height / 6, z - hd - 0.01), renderer.width, renderer.height);
                if (s1 && s2 && s3 && s4) renderer.drawQuad(s1, s2, s3, s4, stripeColor);
            }
        }
        const t1 = camera.project(new Vector3(x - hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const t2 = camera.project(new Vector3(x + hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const t3 = camera.project(new Vector3(x + hw, y + obs.height, z + hd), renderer.width, renderer.height);
        const t4 = camera.project(new Vector3(x - hw, y + obs.height, z + hd), renderer.width, renderer.height);
        if (t1 && t2 && t3 && t4 && t1.z > 0) renderer.drawQuad(t1, t2, t3, t4, '#E55A2B');
    }
    
    renderOverhead(renderer, camera, x, y, z, obs) {
        const hw = obs.width / 2;
        const hd = obs.depth / 2;
        if (obs.type === 'overhead_full') {
            [-4, 4].forEach(px => {
                const pole1 = camera.project(new Vector3(px - 0.12, 0, z), renderer.width, renderer.height);
                const pole2 = camera.project(new Vector3(px + 0.12, 0, z), renderer.width, renderer.height);
                const pole3 = camera.project(new Vector3(px + 0.12, y + obs.height, z), renderer.width, renderer.height);
                const pole4 = camera.project(new Vector3(px - 0.12, y + obs.height, z), renderer.width, renderer.height);
                if (pole1 && pole2 && pole3 && pole4 && pole1.z > 0) renderer.drawQuad(pole1, pole2, pole3, pole4, '#444');
            });
        }
        const b1 = camera.project(new Vector3(x - hw, y, z - hd), renderer.width, renderer.height);
        const b2 = camera.project(new Vector3(x + hw, y, z - hd), renderer.width, renderer.height);
        const b3 = camera.project(new Vector3(x + hw, y, z + hd), renderer.width, renderer.height);
        const b4 = camera.project(new Vector3(x - hw, y, z + hd), renderer.width, renderer.height);
        if (b1 && b2 && b3 && b4 && b1.z > 0) renderer.drawQuad(b1, b2, b3, b4, '#1E8449');
        const f1 = camera.project(new Vector3(x - hw, y, z - hd), renderer.width, renderer.height);
        const f2 = camera.project(new Vector3(x + hw, y, z - hd), renderer.width, renderer.height);
        const f3 = camera.project(new Vector3(x + hw, y + obs.height, z - hd), renderer.width, renderer.height);
        const f4 = camera.project(new Vector3(x - hw, y + obs.height, z - hd), renderer.width, renderer.height);
        if (f1 && f2 && f3 && f4 && f1.z > 0) renderer.drawQuad(f1, f2, f3, f4, COLORS.OVERHEAD);
    }
    
    renderTrain(renderer, camera, x, y, z, obs) {
        const hw = obs.width / 2;
        const depth = obs.depth;
        const l1 = camera.project(new Vector3(x - hw, y, z), renderer.width, renderer.height);
        const l2 = camera.project(new Vector3(x - hw, y + obs.height, z), renderer.width, renderer.height);
        const l3 = camera.project(new Vector3(x - hw, y + obs.height, z + depth), renderer.width, renderer.height);
        const l4 = camera.project(new Vector3(x - hw, y, z + depth), renderer.width, renderer.height);
        if (l1 && l2 && l3 && l4 && l1.z > 0) renderer.drawQuad(l1, l2, l3, l4, COLORS.TRAIN);
        
        const r1 = camera.project(new Vector3(x + hw, y, z), renderer.width, renderer.height);
        const r2 = camera.project(new Vector3(x + hw, y + obs.height, z), renderer.width, renderer.height);
        const r3 = camera.project(new Vector3(x + hw, y + obs.height, z + depth), renderer.width, renderer.height);
        const r4 = camera.project(new Vector3(x + hw, y, z + depth), renderer.width, renderer.height);
        if (r1 && r2 && r3 && r4 && r1.z > 0) renderer.drawQuad(r1, r2, r3, r4, COLORS.TRAIN_LIGHT);
        
        const f1 = camera.project(new Vector3(x - hw, y, z), renderer.width, renderer.height);
        const f2 = camera.project(new Vector3(x + hw, y, z), renderer.width, renderer.height);
        const f3 = camera.project(new Vector3(x + hw, y + obs.height, z), renderer.width, renderer.height);
        const f4 = camera.project(new Vector3(x - hw, y + obs.height, z), renderer.width, renderer.height);
        if (f1 && f2 && f3 && f4 && f1.z > 0) renderer.drawQuad(f1, f2, f3, f4, '#1A252F');
        
        const roof1 = camera.project(new Vector3(x - hw, y + obs.height, z), renderer.width, renderer.height);
        const roof2 = camera.project(new Vector3(x + hw, y + obs.height, z), renderer.width, renderer.height);
        const roof3 = camera.project(new Vector3(x + hw, y + obs.height, z + depth), renderer.width, renderer.height);
        const roof4 = camera.project(new Vector3(x - hw, y + obs.height, z + depth), renderer.width, renderer.height);
        if (roof1 && roof2 && roof3 && roof4 && roof1.z > 0) renderer.drawQuad(roof1, roof2, roof3, roof4, '#4A6278');
        
        const stripeY = y + obs.height * 0.55;
        const stripe1 = camera.project(new Vector3(x - hw - 0.02, stripeY, z), renderer.width, renderer.height);
        const stripe2 = camera.project(new Vector3(x - hw - 0.02, stripeY + 0.35, z), renderer.width, renderer.height);
        const stripe3 = camera.project(new Vector3(x - hw - 0.02, stripeY + 0.35, z + depth), renderer.width, renderer.height);
        const stripe4 = camera.project(new Vector3(x - hw - 0.02, stripeY, z + depth), renderer.width, renderer.height);
        if (stripe1 && stripe2 && stripe3 && stripe4 && stripe1.z > 0) renderer.drawQuad(stripe1, stripe2, stripe3, stripe4, COLORS.TRAIN_STRIPE);
        
        const windowY = y + obs.height * 0.5;
        for (let wz = z + 1.5; wz < z + depth - 1.5; wz += 2.5) {
            const w1 = camera.project(new Vector3(x - hw - 0.03, windowY, wz), renderer.width, renderer.height);
            const w2 = camera.project(new Vector3(x - hw - 0.03, windowY + 1.0, wz), renderer.width, renderer.height);
            const w3 = camera.project(new Vector3(x - hw - 0.03, windowY + 1.0, wz + 1.5), renderer.width, renderer.height);
            const w4 = camera.project(new Vector3(x - hw - 0.03, windowY, wz + 1.5), renderer.width, renderer.height);
            if (w1 && w2 && w3 && w4 && w1.z > 0) renderer.drawQuad(w1, w2, w3, w4, COLORS.TRAIN_WINDOW);
        }
    }
    
    checkCollision(playerHitbox, trackOffset, isFlying) {
        if (isFlying) return false;
        for (const obs of this.obstacles) {
            if (!obs.active) continue;
            const relZ = obs.z - trackOffset;
            const x = obs.lane >= 0 ? CONFIG.LANE_POSITIONS[obs.lane] : 0;
            const y = obs.y || 0;
            const shrink = CONFIG.OBSTACLE_HITBOX_SHRINK;
            const obsBox = {
                x: x - obs.width / 2 + shrink,
                y: y + shrink,
                z: relZ - obs.depth / 2 + shrink,
                width: obs.width - shrink * 2,
                height: obs.height - shrink * 2,
                depth: obs.depth - shrink * 2
            };
            if (this.boxIntersect(playerHitbox, obsBox)) return true;
        }
        return false;
    }
    
    boxIntersect(a, b) {
        const buffer = 0.05;
        return (
            a.x + buffer < b.x + b.width &&
            a.x + a.width - buffer > b.x &&
            a.y + buffer < b.y + b.height &&
            a.y + a.height - buffer > b.y &&
            a.z + buffer < b.z + b.depth &&
            a.z + a.depth - buffer > b.z
        );
    }
}

// ===== COIN MANAGER =====
class CoinManager {
    constructor() {
        this.coins = [];
        this.nextSpawnZ = 25;
        this.rotation = 0;
        this.lastPattern = '';
    }
    
    reset() {
        this.coins = [];
        this.nextSpawnZ = 25;
        this.lastPattern = '';
    }
    
    update(dt, speed, trackOffset) {
        this.rotation += CONFIG.COIN_SPIN_SPEED * dt;
        this.coins = this.coins.filter(c => c.active && c.z - trackOffset > -5);
        while (this.nextSpawnZ - trackOffset < CONFIG.VISIBLE_DISTANCE) {
            this.spawnCoinPattern(this.nextSpawnZ);
            this.nextSpawnZ += randomRange(12, 22);
        }
    }
    
    spawnCoinPattern(z) {
        const patterns = ['line', 'arc', 'diagonal', 'zigzag', 'double'];
        let pattern;
        do { pattern = randomChoice(patterns); } while (pattern === this.lastPattern);
        this.lastPattern = pattern;
        
        const lane = randomInt(0, 2);
        const spacing = 3; 

        switch (pattern) {
            case 'line':
                for (let i = 0; i < 5; i++) this.addCoin(CONFIG.LANE_POSITIONS[lane], 1.0, z + i * spacing);
                break;
            case 'arc':
                for (let i = 0; i < 7; i++) {
                    const arcY = 1.0 + Math.sin(i / 6 * Math.PI) * 2.2;
                    this.addCoin(CONFIG.LANE_POSITIONS[lane], arcY, z + i * spacing * 0.8);
                }
                break;
            case 'diagonal':
                const dir = Math.random() > 0.5 ? 1 : -1;
                for (let i = 0; i < 5; i++) {
                    const l = clamp(lane + Math.floor((i - 2) * dir * 0.5), 0, 2);
                    this.addCoin(CONFIG.LANE_POSITIONS[l], 1.0, z + i * spacing);
                }
                break;
            case 'zigzag':
                for (let i = 0; i < 6; i++) {
                    const l = i % 2 === 0 ? lane : clamp(lane + 1, 0, 2);
                    this.addCoin(CONFIG.LANE_POSITIONS[l], 1.0, z + i * spacing);
                }
                break;
            case 'double':
                const lanes = [0, 2];
                for (let i = 0; i < 4; i++) {
                    lanes.forEach(l => this.addCoin(CONFIG.LANE_POSITIONS[l], 1.0, z + i * spacing));
                }
                break;
        }
    }
    
    addCoin(x, y, z) {
        this.coins.push({ x, y, z, active: true, collected: false, collectTime: 0 });
    }
    
    render(renderer, camera, trackOffset) {
        this.coins.forEach(coin => {
            if (!coin.active) return;
            const relZ = coin.z - trackOffset;
            if (relZ < -2 || relZ > CONFIG.VISIBLE_DISTANCE) return;
            
            const bobY = Math.sin(Date.now() / 180 + coin.z * 0.5) * 0.12;
            const pos = new Vector3(coin.x, coin.y + bobY, relZ);
            const proj = camera.project(pos, renderer.width, renderer.height);
            
            if (!proj || proj.z <= 0) return;
            
            const radius = CONFIG.COIN_RADIUS * proj.scale * renderer.height;
            const scaleX = Math.abs(Math.cos(this.rotation * Math.PI / 180));
            
            const gradient = renderer.ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, radius * 2);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
            gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            renderer.ctx.fillStyle = gradient;
            renderer.ctx.beginPath();
            renderer.ctx.arc(proj.x, proj.y, radius * 2, 0, Math.PI * 2);
            renderer.ctx.fill();
            
            renderer.drawEllipse(proj.x, proj.y, radius * scaleX, radius, COLORS.COIN, COLORS.COIN_EDGE);
            
            if (scaleX > 0.4) {
                renderer.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                renderer.ctx.beginPath();
                renderer.ctx.ellipse(proj.x - radius * 0.25, proj.y - radius * 0.25, radius * 0.35 * scaleX, radius * 0.35, 0, 0, Math.PI * 2);
                renderer.ctx.fill();
            }
        });
    }
    
    checkCollection(playerHitbox, trackOffset, hasMagnet, particles, camera, renderer, sound) {
        let collected = 0;
        const magnetRange = hasMagnet ? CONFIG.COIN_MAGNET_RANGE : 1.5;
        
        this.coins.forEach(coin => {
            if (!coin.active) return;
            const relZ = coin.z - trackOffset;
            const playerCenter = {
                x: playerHitbox.x + playerHitbox.width / 2,
                y: playerHitbox.y + playerHitbox.height / 2,
                z: playerHitbox.z + playerHitbox.depth / 2
            };
            
            const dx = coin.x - playerCenter.x;
            const dy = coin.y - playerCenter.y;
            const dz = relZ - playerCenter.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist < magnetRange) {
                if (dist < 1.2 || hasMagnet) {
                    coin.active = false;
                    collected++;
                    sound.playCoin();
                    
                    const pos = new Vector3(coin.x, coin.y, relZ);
                    const proj = camera.project(pos, renderer.width, renderer.height);
                    if (proj) particles.emit(proj.x, proj.y, 8, COLORS.COIN, { speed: 4, size: 5, life: 0.8 });
                }
            }
        });
        return collected;
    }
}

// ===== POWER-UP MANAGER =====
class PowerUpManager {
    constructor() {
        this.powerUps = [];
        this.nextSpawnZ = 150;
    }
    
    reset() {
        this.powerUps = [];
        this.nextSpawnZ = 150;
    }
    
    update(dt, speed, trackOffset, distance) {
        this.powerUps = this.powerUps.filter(p => p.active && p.z - trackOffset > -5);
        if (this.nextSpawnZ - trackOffset < CONFIG.VISIBLE_DISTANCE && distance > 100) {
            this.spawnPowerUp(this.nextSpawnZ);
            this.nextSpawnZ += randomRange(400, 400);
        }
    }
    
    spawnPowerUp(z) {
        const types = ['jetpack', 'magnet', 'sneakers', 'hoverboard'];
        this.powerUps.push({
            type: randomChoice(types),
            lane: randomInt(0, 2),
            z,
            y: 1.2,
            active: true
        });
    }
    
    render(renderer, camera, trackOffset) {
        const icons = { jetpack: '🚀', magnet: '🧲', sneakers: '👟', hoverboard: '🛹' };
        const colors = { jetpack: '#FF6B6B', magnet: '#4ECDC4', sneakers: '#95E1D3', hoverboard: '#AA96DA' };
        
        this.powerUps.forEach(pu => {
            if (!pu.active) return;
            const relZ = pu.z - trackOffset;
            if (relZ < 0 || relZ > CONFIG.VISIBLE_DISTANCE) return;
            
            const bobY = Math.sin(Date.now() / 200) * 0.15;
            const pos = new Vector3(CONFIG.LANE_POSITIONS[pu.lane], pu.y + bobY, relZ);
            const proj = camera.project(pos, renderer.width, renderer.height);
            if (!proj || proj.z <= 0) return;
            
            const size = 0.6 * proj.scale * renderer.height;
            const gradient = renderer.ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size * 2);
            gradient.addColorStop(0, colors[pu.type] + '80');
            gradient.addColorStop(1, colors[pu.type] + '00');
            renderer.ctx.fillStyle = gradient;
            renderer.ctx.beginPath();
            renderer.ctx.arc(proj.x, proj.y, size * 2, 0, Math.PI * 2);
            renderer.ctx.fill();
            
            renderer.drawRoundedRect(proj.x - size, proj.y - size, size * 2, size * 2, size * 0.3, colors[pu.type], 'white');
            renderer.ctx.font = `${size}px Arial`;
            renderer.ctx.textAlign = 'center';
            renderer.ctx.textBaseline = 'middle';
            renderer.ctx.fillText(icons[pu.type], proj.x, proj.y);
        });
    }
    
    checkCollection(playerHitbox, trackOffset) {
        for (let i = 0; i < this.powerUps.length; i++) {
            const pu = this.powerUps[i];
            if (!pu.active) continue;
            const relZ = pu.z - trackOffset;
            const x = CONFIG.LANE_POSITIONS[pu.lane];
            const dist = Math.sqrt(
                Math.pow(x - (playerHitbox.x + playerHitbox.width / 2), 2) +
                Math.pow(pu.y - (playerHitbox.y + playerHitbox.height / 2), 2) +
                Math.pow(relZ - (playerHitbox.z + playerHitbox.depth / 2), 2)
            );
            if (dist < 1.5) {
                pu.active = false;
                return pu.type;
            }
        }
        return null;
    }
}

// ===== INPUT MANAGER =====
class InputManager {
    constructor() {
        this.keys = {};
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30;
        this.active = false;
        
        window.addEventListener('keydown', e => this.handleKey(e, true));
        window.addEventListener('keyup', e => this.handleKey(e, false));
        
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchend', e => this.handleTouchEnd(e), { passive: false });
        
        this.handlers = { left: () => {}, right: () => {}, up: () => {}, down: () => {} };
    }
    
    bind(handlers) {
        this.handlers = handlers;
        this.active = true;
    }
    
    handleKey(e, isDown) {
        if (!this.active) return;
        this.keys[e.code] = isDown;
        if (isDown) {
            switch(e.code) {
                case 'ArrowLeft': case 'KeyA': this.handlers.left(); break;
                case 'ArrowRight': case 'KeyD': this.handlers.right(); break;
                case 'ArrowUp': case 'KeyW': case 'Space': this.handlers.up(); break;
                case 'ArrowDown': case 'KeyS': this.handlers.down(); break;
                case 'Escape': this.handlers.pause(); break;
                case 'Digit1': this.handlers.useItem('hoverboard'); break;
                case 'Digit2': this.handlers.useItem('jetpack'); break;
                case 'Digit3': this.handlers.useItem('sneakers'); break;
                case 'Digit4': this.handlers.useItem('magnet'); break;
            }
        }
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    }
    
    handleTouchEnd(e) {
        if (!this.active) return;
        e.preventDefault();
        const dx = e.changedTouches[0].screenX - this.touchStartX;
        const dy = e.changedTouches[0].screenY - this.touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > this.swipeThreshold) dx > 0 ? this.handlers.right() : this.handlers.left();
        } else {
            if (Math.abs(dy) > this.swipeThreshold) dy < 0 ? this.handlers.up() : this.handlers.down();
        }
    }
}

// ===== GAME ENGINE =====
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.sound = new SoundManager();
        this.input = new InputManager();
        this.camera = new Camera();
        
        this.player = new Player();
        this.track = new TrackSystem();
        this.obstacles = new ObstacleManager();
        this.coins = new CoinManager();
        this.powerUps = new PowerUpManager();
        this.particles = new ParticleSystem();
        
        this.state = 'MENU';
        this.lastTime = 0;
        this.distance = 0;
        this.score = 0;
        this.coinCount = 0;
        this.totalCoins = 0;
        this.highScore = 0;
        this.inventory = {};
        
        // Initialize Shop Manager
        this.shop = new ShopManager(this);
        
        this.loadData();
        this.initUI();
        
        this.input.bind({
            left: () => this.player.moveLeft(this.camera),
            right: () => this.player.moveRight(this.camera),
            up: () => this.player.jump(this.sound),
            down: () => this.player.slide(this.sound),
            pause: () => this.togglePause(),
            useItem: (type) => this.useInventoryItem(type || 'hoverboard') 
        });
        
        requestAnimationFrame(t => this.loop(t));
    }
    
    loadData() {
        this.highScore = parseInt(localStorage.getItem('subwayRush_highScore')) || 0;
        const savedCoins = localStorage.getItem('subwayRush_coins');
        if (savedCoins === null) {
            this.totalCoins = CONFIG.DEFAULT_COINS;
            localStorage.setItem('subwayRush_coins', this.totalCoins);
        } else {
            this.totalCoins = parseInt(savedCoins);
        }
        this.inventory = JSON.parse(localStorage.getItem('subwayRush_inventory')) || {};
    }
    
    saveData() {
        localStorage.setItem('subwayRush_highScore', this.highScore);
        localStorage.setItem('subwayRush_coins', this.totalCoins);
        localStorage.setItem('subwayRush_inventory', JSON.stringify(this.inventory));
    }
    
    initUI() {
        const ui = document.getElementById('ui-container');
        ui.innerHTML = `
            <div id="hud" style="display:none">
                <div id="pauseBtn">||</div>
                <div id="distance">0m</div>
                <div id="statsContainer">
                    <div id="score">0</div>
                    <div id="coinDisplay">
                        <div class="coin-icon-hud"></div>
                        <span id="hudCoins">0</span>
                    </div>
                </div>
                <div id="powerUpContainer"></div>
                <div id="activeItems"></div>
            </div>

            <div id="mainMenu" class="overlay">
                <div class="menu-panel">
                    <h1 class="game-title">SUBWAY<br>RUSH</h1>
                    <button class="menu-btn btn-play" onclick="game.start()">TAP TO PLAY</button>
                    <button class="menu-btn btn-shop" onclick="game.shop.openShop()">SHOP</button>
                    <div class="total-coins-display">
                        <div class="coin-icon-hud"></div>
                        <span id="menuCoins">${formatNumber(this.totalCoins)}</span>
                    </div>
                    <div class="high-score-display">High Score: <span id="menuHighScore">${formatNumber(this.highScore)}</span></div>
                </div>
            </div>

            <div id="shopMenu" class="overlay" style="display:none">
                <div class="menu-panel" style="width: 500px">
                    <h2>SHOP</h2>
                    <div class="shop-coins">
                        <div class="coin-icon-hud"></div>
                        <span id="shopCoins">${formatNumber(this.totalCoins)}</span>
                    </div>
                    <div class="shop-grid" id="shopGrid"></div>
                    <button class="menu-btn btn-secondary" onclick="game.shop.closeShop()">BACK</button>
                </div>
            </div>

            <div id="gameOverMenu" class="overlay" style="display:none; z-index: 2000;">
                <div class="menu-panel">
                    <h2 style="color:#E74C3C">CRASHED!</h2>
                    <div class="stat-row">
                        <span>SCORE</span>
                        <span class="stat-value" id="goScore">0</span>
                    </div>
                    <div class="stat-row">
                        <span>COINS</span>
                        <span class="stat-value" id="goCoins">0</span>
                    </div>
                    <div class="stat-row">
                        <span>HIGH SCORE</span>
                        <span class="stat-value" id="goHighScore">0</span>
                    </div>
                    <button class="menu-btn btn-play" style="margin-top: 30px" onclick="game.start()">RUN AGAIN</button>
                    <button class="menu-btn btn-secondary" onclick="game.showMainMenu()">MAIN MENU</button>
                </div>
            </div>

            <div id="pauseMenu" class="overlay" style="display:none">
                <div class="menu-panel">
                    <h2>PAUSED</h2>
                    <button class="menu-btn btn-play" onclick="game.resume()">RESUME</button>
                    <button class="menu-btn btn-secondary" onclick="game.showMainMenu()">QUIT</button>
                </div>
            </div>
        `;
        
        document.getElementById('pauseBtn').onclick = () => this.togglePause();
        this.shop.renderShop();
    }
    
    useInventoryItem(type) {
        if (this.state !== 'PLAYING') return;
        if (this.player.powerUps[type].active) {
            this.showMessage("Already Active!", "error");
            return;
        }
        const count = this.inventory[type] || 0;
        if (count > 0) {
            this.inventory[type]--;
            this.saveData();
            this.player.activatePowerUp(type, this.sound);
            if (type === 'hoverboard') {
                this.showMessage("Hoverboard!", "success");
            } else {
                this.showMessage(type.toUpperCase() + "!", "success");
            }
            this.updateHUD();
        } else {
            this.sound.playClick();
        }
    }
    
    showMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = `message-popup ${type}`;
        msg.innerText = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
    }
    
    start() {
        this.sound.init();
        this.state = 'PLAYING';
        this.score = 0;
        this.distance = 0;
        this.coinCount = 0;
        this.player = new Player();
        this.track.reset();
        this.obstacles.reset();
        this.coins.reset();
        this.powerUps.reset();
        this.camera.position.z = -CONFIG.CAMERA_DISTANCE;
        this.camera.shake.intensity = 0;
        
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameOverMenu').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';
        
        this.lastTime = performance.now();
    }
    
    loop(now) {
        requestAnimationFrame(t => this.loop(t));
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        if (this.state === 'PLAYING') this.update(dt);
        this.draw();
    }
    
    update(dt) {
        const speed = this.player.speed;
        this.distance += speed * dt;
        this.score = Math.floor(this.distance * 2) + (this.coinCount * 10);
        
        this.camera.update(dt);
        this.track.update(dt, speed);
        this.obstacles.update(dt, speed, this.track.offset, this.distance, this.sound);
        this.coins.update(dt, speed, this.track.offset);
        this.powerUps.update(dt, speed, this.track.offset, this.distance);
        this.player.update(dt, this.sound);
        this.particles.update(dt);
        
        this.camera.position.x = lerp(this.camera.position.x, this.player.x * 0.7, 0.1);
        
        const playerHitbox = this.player.getHitbox();
        
        const collected = this.coins.checkCollection(playerHitbox, this.track.offset, this.player.powerUps.magnet.active, this.particles, this.camera, this.renderer, this.sound);
        this.coinCount += collected;
        
        const powerUpType = this.powerUps.checkCollection(playerHitbox, this.track.offset);
        if (powerUpType) {
            this.player.activatePowerUp(powerUpType, this.sound);
            this.showMessage(powerUpType.toUpperCase() + '!', 'success');
        }
        
        if (this.obstacles.checkCollision(playerHitbox, this.track.offset, this.player.powerUps.jetpack.active)) {
            if (this.player.powerUps.hoverboard.active) {
                this.player.powerUps.hoverboard.active = false;
                this.player.powerUps.hoverboard.timeLeft = 0;
                this.sound.playHoverboard();
                this.camera.addShake(1.0);
                this.particles.emit(0, 0, 50, '#AA96DA', { speed: 10, size: 5 });
                this.obstacles.obstacles.forEach(o => {
                     if (o.z - this.track.offset < 20) o.active = false;
                });
                this.showMessage("SAVED!", "success");
            } else {
                this.gameOver();
            }
        }
        
        this.updateHUD();
    }
    
    updateHUD() {
        document.getElementById('score').innerText = formatNumber(this.score);
        document.getElementById('hudCoins').innerText = this.coinCount;
        document.getElementById('distance').innerText = Math.floor(this.distance) + 'm';
        
        const pc = document.getElementById('powerUpContainer');
        pc.innerHTML = '';
        Object.entries(this.player.powerUps).forEach(([k, v]) => {
            if (v.active) {
                const d = document.createElement('div');
                d.className = `power-up-indicator ${k}`;
                d.innerHTML = `<div class="power-up-icon">⚡</div><div class="power-up-timer"><div class="power-up-timer-fill" style="width:${(v.timeLeft/CONFIG[k.toUpperCase()+'_DURATION'])*100}%"></div></div>`;
                pc.appendChild(d);
            }
        });

        const ac = document.getElementById('activeItems');
        ac.innerHTML = '';
        const buttons = [
            { id: 'hoverboard', icon: '🛹', key: '1' },
            { id: 'jetpack', icon: '🚀', key: '2' },
            { id: 'sneakers', icon: '👟', key: '3' },
            { id: 'magnet', icon: '🧲', key: '4' }
        ];

        buttons.forEach(btn => {
            const count = this.inventory[btn.id] || 0;
            if (count > 0) {
                const div = document.createElement('div');
                div.className = 'item-btn';
                div.onclick = (e) => {
                    e.stopPropagation();
                    this.useInventoryItem(btn.id);
                };
                div.innerHTML = `
                    <div class="item-count">${count}</div>
                    <div class="item-btn-icon">${btn.icon}</div>
                    <div class="item-key">${btn.key}</div>
                `;
                ac.appendChild(div);
            }
        });
    }
    
    getIcon(type) {
        const icons = { jetpack: '🚀', magnet: '🧲', sneakers: '👟', hoverboard: '🛹' };
        return icons[type] || '';
    }
    
    draw() {
        this.renderer.clear();
        this.track.render(this.renderer, this.camera);
        this.obstacles.render(this.renderer, this.camera, this.track.offset);
        this.coins.render(this.renderer, this.camera, this.track.offset);
        this.powerUps.render(this.renderer, this.camera, this.track.offset);
        this.player.render(this.renderer, this.camera, this.particles);
        this.particles.render(this.renderer);
        
        if (this.player.speed > 30 || this.player.powerUps.jetpack.active) {
            this.renderSpeedLines();
        }
    }
    
    renderSpeedLines() {
        this.renderer.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.renderer.ctx.lineWidth = 2;
        const centerX = this.renderer.width / 2;
        const centerY = this.renderer.height / 2;
        
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 100 + 50;
            const startR = 100 + Math.random() * 100;
            
            this.renderer.ctx.beginPath();
            this.renderer.ctx.moveTo(centerX + Math.cos(angle) * startR, centerY + Math.sin(angle) * startR);
            this.renderer.ctx.lineTo(centerX + Math.cos(angle) * (startR + length), centerY + Math.sin(angle) * (startR + length));
            this.renderer.ctx.stroke();
        }
    }
    
    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pauseMenu').style.display = 'flex';
            this.sound.context.suspend();
        }
    }
    
    resume() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pauseMenu').style.display = 'none';
            this.sound.resume();
            this.lastTime = performance.now();
        }
    }
    
    gameOver() {
        this.state = 'GAMEOVER';
        this.sound.playGameOver();
        
        this.totalCoins += this.coinCount;
        if (this.score > this.highScore) this.highScore = this.score;
        this.saveData();
        
        document.getElementById('goScore').innerText = formatNumber(this.score);
        document.getElementById('goCoins').innerText = this.coinCount;
        
        const highScoreEl = document.getElementById('goHighScore');
        if (highScoreEl) highScoreEl.innerText = formatNumber(this.highScore);

        document.getElementById('hud').style.display = 'none';
        document.getElementById('gameOverMenu').style.display = 'flex';
        
        this.camera.addShake(1.0);
    }
    
    showMainMenu() {
        this.state = 'MENU';
        document.getElementById('gameOverMenu').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
        document.getElementById('menuCoins').innerText = formatNumber(this.totalCoins);
        document.getElementById('menuHighScore').innerText = formatNumber(this.highScore);
    }
    
    openSettings() {
        this.sound.toggle();
        this.showMessage(this.sound.enabled ? 'Sound ON' : 'Sound OFF', 'success');
    }
}

// Initialize Game
window.onload = () => {
    window.game = new Game();
};