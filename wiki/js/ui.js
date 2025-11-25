class GameUI {
    constructor() {
        this.speedElement = document.getElementById('speed');
        this.altitudeElement = document.getElementById('altitude');
        this.temperatureElement = document.getElementById('temperature');
        this.steamLevelElement = document.getElementById('steam-level');
        this.healthLevelElement = document.getElementById('health-level');
        
        // Новые элементы прогрессии
        this.playerLevelElement = document.getElementById('player-level');
        this.playerGoldElement = document.getElementById('player-gold');
        this.expFillElement = document.getElementById('exp-fill');
        this.currentExpElement = document.getElementById('current-exp');
        this.neededExpElement = document.getElementById('needed-exp');
        this.nextLevelElement = document.getElementById('next-level');
        this.activeQuestsDisplay = document.getElementById('active-quests-display');
        
        // Canvas элементы
        this.compassCanvas = document.getElementById('compass');
        this.compassCtx = this.compassCanvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.init();
    }
    
    init() {
        this.drawCompassBackground();
    }
    
    update(ship) {
        if(!ship) return;
        
        // Обновление корабельных данных
        this.updateShipStats(ship);
        
        // Обновление прогрессии
        this.updateProgressionUI();
        
        // Обновление баров
        this.updateBars(ship);
        
        // Обновление компаса
        this.updateCompass(ship);
        
        // Обновление мини-карты
        this.updateMinimap(ship);
        
        // Обновление квестов
        this.updateActiveQuests();
    }
    
    updateShipStats(ship) {
        // Скорость
        this.speedElement.textContent = Math.round(ship.speed);
        
        // Высота
        this.altitudeElement.textContent = Math.round(ship.altitude);
        
        // Температура
        this.temperatureElement.textContent = Math.round(ship.temperature) + '°C';
        
        // Цветовое кодирование
        if(ship.temperature > 100) {
            this.temperatureElement.style.color = '#FF4500';
        } else if(ship.temperature > 90) {
            this.temperatureElement.style.color = '#FFA500';
        } else {
            this.temperatureElement.style.color = '#D4AF37';
        }
    }
    
    updateProgressionUI() {
        // Уровень
        if(this.playerLevelElement) {
            this.playerLevelElement.textContent = progression.level;
        }
        
        // Золото
        if(this.playerGoldElement) {
            this.playerGoldElement.textContent = progression.gold;
        }
        
        // Опыт
        const expProgress = progression.getExpProgress();
        const expNeeded = progression.getExpForNextLevel();
        
        if(this.expFillElement) {
            this.expFillElement.style.width = (expProgress * 100) + '%';
        }
        
        if(this.currentExpElement) {
            this.currentExpElement.textContent = Math.round(progression.exp);
        }
        
        if(this.neededExpElement) {
            this.neededExpElement.textContent = expNeeded;
        }
        
        if(this.nextLevelElement) {
            this.nextLevelElement.textContent = progression.level + 1;
        }
    }
    
    updateBars(ship) {
        // Паровое давление
        const steamPercent = (ship.steamPressure / 100) * 100;
        this.steamLevelElement.style.width = steamPercent + '%';
        
        if(ship.steamPressure < 30) {
            this.steamLevelElement.style.background = 'linear-gradient(90deg, #E24A4A, #FF6B6B)';
        } else {
            this.steamLevelElement.style.background = 'linear-gradient(90deg, #4A90E2, #87CEEB)';
        }
        
        // Здоровье
        const healthPercent = (ship.health / 100) * 100;
        this.healthLevelElement.style.width = healthPercent + '%';
        
        if(ship.health < 30) {
            this.healthLevelElement.style.background = 'linear-gradient(90deg, #8B0000, #FF0000)';
        } else if(ship.health < 60) {
            this.healthLevelElement.style.background = 'linear-gradient(90deg, #FF8C00, #FFA500)';
        } else {
            this.healthLevelElement.style.background = 'linear-gradient(90deg, #E24A4A, #FF6B6B)';
        }
    }
    
    updateActiveQuests() {
        if(!this.activeQuestsDisplay) return;
        
        if(questSystem.activeQuests.length === 0) {
            this.activeQuestsDisplay.innerHTML = '<p style="color: #B87333; text-align: center; padding: 10px;">Нет активных квестов</p>';
            return;
        }
        
        this.activeQuestsDisplay.innerHTML = questSystem.activeQuests.map(quest => {
            const progress = questSystem.getQuestProgress(quest.id);
            return `
                <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-left: 3px solid #D4AF37; border-radius: 5px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <span style="font-size: 20px;">${quest.icon}</span>
                        <strong style="color: #D4AF37;">${quest.title}</strong>
                    </div>
                    ${progress !== null ? `
                        <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.5); border-radius: 3px; overflow: hidden; margin-top: 5px;">
                            <div style="width: ${progress * 100}%; height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); border-radius: 3px;"></div>
                        </div>
                        <small style="color: #B87333;">${Math.round(progress * 100)}% завершено</small>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    drawCompassBackground() {
        const ctx = this.compassCtx;
        const canvas = this.compassCanvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 50;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(44, 36, 22, 0.9)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#B87333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 14px Cinzel';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const directions = ['N', 'E', 'S', 'W'];
        const angles = [0, Math.PI/2, Math.PI, Math.PI*3/2];
        
        directions.forEach((dir, i) => {
            const angle = angles[i] - Math.PI/2;
            const x = centerX + Math.cos(angle) * (radius - 20);
            const y = centerY + Math.sin(angle) * (radius - 20);
            
            ctx.fillStyle = dir === 'N' ? '#FF4500' : '#D4AF37';
            ctx.fillText(dir, x, y);
        });
        
        ctx.strokeStyle = '#B87333';
        ctx.lineWidth = 1;
        for(let i = 0; i < 360; i += 10) {
            const angle = (i * Math.PI / 180) - Math.PI/2;
            const length = i % 30 === 0 ? 10 : 5;
            
            const x1 = centerX + Math.cos(angle) * (radius - 5);
            const y1 = centerY + Math.sin(angle) * (radius - 5);
            const x2 = centerX + Math.cos(angle) * (radius - 5 - length);
            const y2 = centerY + Math.sin(angle) * (radius - 5 - length);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    updateCompass(ship) {
        const ctx = this.compassCtx;
        const canvas = this.compassCanvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        this.drawCompassBackground();
        
        const heading = ship.mesh.rotation.y;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(heading);
        
        ctx.fillStyle = '#FF4500';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(-8, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(-5, 15);
        ctx.lineTo(5, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        const degrees = Math.round(((heading * 180 / Math.PI) % 360 + 360) % 360);
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(degrees + '°', centerX, canvas.height - 10);
    }
    
    updateMinimap(ship) {
        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const scale = 0.5;
        
        ctx.fillStyle = 'rgba(26, 20, 16, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#B87333';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(184, 115, 51, 0.3)';
        ctx.lineWidth = 1;
        for(let i = 0; i <= canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Город на карте
        if(citySystem) {
            const cityX = centerX + (citySystem.cityPosition.x - ship.mesh.position.x) * scale;
            const cityZ = centerY + (citySystem.cityPosition.z - ship.mesh.position.z) * scale;
            
            if(Math.abs(cityX - centerX) < 100 && Math.abs(cityZ - centerY) < 100) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🏛️', cityX, cityZ);
            }
        }
        
        // Острова
        if(world && world.islands) {
            ctx.fillStyle = '#4A90E2';
            world.islands.forEach(island => {
                const relX = (island.position.x - ship.mesh.position.x) * scale;
                const relZ = (island.position.z - ship.mesh.position.z) * scale;
                
                const mapX = centerX + relX;
                const mapZ = centerY + relZ;
                
                if(Math.abs(relX) < 100 && Math.abs(relZ) < 100) {
                    ctx.beginPath();
                    ctx.arc(mapX, mapZ, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        
        // Корабль игрока
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(ship.mesh.rotation.y);
        
        ctx.fillStyle = '#FF4500';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-5, 8);
        ctx.lineTo(0, 5);
        ctx.lineTo(5, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 10px Cinzel';
        ctx.textAlign = 'center';
        ctx.fillText('N', centerX, 12);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(44, 36, 22, 0.95);
            border: 3px solid var(--copper);
            padding: 20px 40px;
            border-radius: 10px;
            color: var(--gear-gold);
            font-size: 24px;
            font-family: 'Cinzel', serif;
            z-index: 10000;
            animation: fadeInOut 3s forwards;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    
    .exp-panel {
        margin-top: 15px;
        padding: 15px;
    }
    
    .exp-label {
        color: var(--brass);
        font-size: 12px;
        margin-bottom: 5px;
        font-family: 'Orbitron', sans-serif;
    }
    
    .exp-bar {
        width: 100%;
        height: 12px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid var(--copper);
        border-radius: 6px;
        overflow: hidden;
        margin: 5px 0;
    }
    
    .exp-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #4A90E2, #87CEEB);
        border-radius: 4px;
        transition: width 0.5s;
        box-shadow: 0 0 10px rgba(74, 144, 226, 0.8);
    }
    
    .exp-text {
        color: var(--gear-gold);
        font-size: 11px;
        text-align: center;
        font-family: 'Orbitron', sans-serif;
    }
`;
document.head.appendChild(style);