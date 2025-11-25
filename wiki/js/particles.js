class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleGroups = [];
    }
    
    createSteamEmitter(position, options = {}) {
        const defaults = {
            particleCount: 100,
            color: 0xFFFFFF,
            size: 2,
            lifetime: 2,
            speed: 2,
            spread: 0.5,
            opacity: 0.6
        };
        
        const config = { ...defaults, ...options };
        
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const lifetimes = [];
        const sizes = [];
        
        for(let i = 0; i < config.particleCount; i++) {
            positions.push(0, 0, 0);
            velocities.push(
                (Math.random() - 0.5) * config.spread,
                Math.random() * config.speed,
                (Math.random() - 0.5) * config.spread
            );
            lifetimes.push(Math.random() * config.lifetime);
            sizes.push(config.size);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.Float32BufferAttribute(lifetimes, 1));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: config.color,
            size: config.size,
            transparent: true,
            opacity: config.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            map: this.createParticleTexture()
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        
        const emitter = {
            particles: particles,
            config: config,
            time: 0
        };
        
        this.particleGroups.push(emitter);
        this.scene.add(particles);
        
        return emitter;
    }
    
    createSmokeEmitter(position, options = {}) {
        return this.createSteamEmitter(position, {
            color: 0x333333,
            size: 3,
            lifetime: 3,
            speed: 1.5,
            spread: 0.8,
            opacity: 0.4,
            ...options
        });
    }
    
    createEngineTrail(position, options = {}) {
        return this.createSteamEmitter(position, {
            color: 0x87CEEB,
            size: 1.5,
            lifetime: 1,
            speed: 0.5,
            spread: 0.3,
            opacity: 0.7,
            ...options
        });
    }
    
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    update(deltaTime = 0.016) {
        for(let i = this.particleGroups.length - 1; i >= 0; i--) {
            const emitter = this.particleGroups[i];
            emitter.time += deltaTime;
            
            this.updateParticles(emitter, deltaTime);
            
            if(emitter.time > emitter.config.lifetime * 2) {
                this.scene.remove(emitter.particles);
                this.particleGroups.splice(i, 1);
            }
        }
    }
    
    updateParticles(emitter, deltaTime) {
        const positions = emitter.particles.geometry.attributes.position.array;
        const velocities = emitter.particles.geometry.attributes.velocity.array;
        const lifetimes = emitter.particles.geometry.attributes.lifetime.array;
        
        for(let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;
            
            velocities[i + 1] -= 0.5 * deltaTime;
            
            velocities[i] *= 0.98;
            velocities[i + 1] *= 0.98;
            velocities[i + 2] *= 0.98;
            
            const idx = i / 3;
            lifetimes[idx] -= deltaTime;
            
            if(lifetimes[idx] <= 0) {
                positions[i] = 0;
                positions[i + 1] = 0;
                positions[i + 2] = 0;
                
                velocities[i] = (Math.random() - 0.5) * emitter.config.spread;
                velocities[i + 1] = Math.random() * emitter.config.speed;
                velocities[i + 2] = (Math.random() - 0.5) * emitter.config.spread;
                
                lifetimes[idx] = emitter.config.lifetime;
            }
        }
        
        emitter.particles.geometry.attributes.position.needsUpdate = true;
        emitter.particles.geometry.attributes.velocity.needsUpdate = true;
        emitter.particles.geometry.attributes.lifetime.needsUpdate = true;
        
        emitter.particles.material.opacity = Math.max(0, 
            emitter.config.opacity * (1 - emitter.time / (emitter.config.lifetime * 2))
        );
    }
    
    clear() {
        this.particleGroups.forEach(emitter => {
            this.scene.remove(emitter.particles);
        });
        this.particleGroups = [];
    }
}

let particleSystem;