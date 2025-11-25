class ProgressionSystem {
    constructor() {
        this.level = 1;
        this.exp = 0;
        this.gold = 1000;
        this.gems = 0;
        
        // Таблица уровней
        this.expTable = this.generateExpTable(100);
        
        // Статистика
        this.stats = {
            distanceTraveled: 0,
            enemiesDefeated: 0,
            timePlayedMinutes: 0,
            questsCompleted: 0
        };
        
        this.listeners = [];
    }
    
    // Генерация таблицы опыта
    generateExpTable(maxLevel) {
        const table = [0];
        for (let i = 1; i <= maxLevel; i++) {
            // Формула: baseExp * level^1.5
            const expNeeded = Math.floor(100 * Math.pow(i, 1.5));
            table.push(expNeeded);
        }
        return table;
    }
    
    // Получение опыта
    addExp(amount, reason = '') {
        this.exp += amount;
        
        // Проверка повышения уровня
        while (this.exp >= this.getExpForNextLevel() && this.level < this.expTable.length - 1) {
            this.levelUp();
        }
        
        this.showExpGain(amount, reason);
        this.notifyListeners('exp', { amount, reason });
        this.save();
    }
    
    // Повышение уровня
    levelUp() {
        this.exp -= this.getExpForNextLevel();
        this.level++;
        
        // Награды за уровень
        const rewards = this.getLevelRewards();
        
        this.showLevelUp(rewards);
        this.notifyListeners('levelup', { level: this.level, rewards });
        this.save();
    }
    
    // Награды за уровень
    getLevelRewards() {
        const rewards = {
            gold: this.level * 100,
            gems: Math.floor(this.level / 5)
        };
        
        this.gold += rewards.gold;
        this.gems += rewards.gems;
        
        // Особые награды
        if (this.level === 5) rewards.ship = 'scout';
        if (this.level === 10) rewards.ship = 'battleship';
        if (this.level % 10 === 0) rewards.special = 'Легендарный сундук';
        
        return rewards;
    }
    
    // Получение золота
    addGold(amount, reason = '') {
        this.gold += amount;
        this.showGoldGain(amount, reason);
        this.notifyListeners('gold', { amount, reason });
        this.save();
    }
    
    // Трата золота
    spendGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;
            this.save();
            return true;
        }
        return false;
    }
    
    // Получение гемов
    addGems(amount) {
        this.gems += amount;
        this.notifyListeners('gems', { amount });
        this.save();
    }
    
    // Трата гемов
    spendGems(amount) {
        if (this.gems >= amount) {
            this.gems -= amount;
            this.save();
            return true;
        }
        return false;
    }
    
    // Получение опыта для следующего уровня
    getExpForNextLevel() {
        return this.expTable[this.level] || 999999;
    }
    
    // Прогресс до следующего уровня (0-1)
    getExpProgress() {
        const current = this.exp;
        const needed = this.getExpForNextLevel();
        return Math.min(current / needed, 1);
    }
    
    // Показать получение опыта
    showExpGain(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'exp-notification';
        notification.innerHTML = `
            <div class="exp-amount">+${amount} EXP</div>
            ${reason ? `<div class="exp-reason">${reason}</div>` : ''}
        `;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4A90E2, #357ABD);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(74, 144, 226, 0.6);
            animation: expPop 2s forwards;
            pointer-events: none;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
    
    // Показать повышение уровня
    showLevelUp(rewards) {
        const modal = document.createElement('div');
        modal.className = 'levelup-modal';
        modal.innerHTML = `
            <div class="levelup-content">
                <h1>⭐ НОВЫЙ УРОВЕНЬ! ⭐</h1>
                <div class="levelup-number">${this.level}</div>
                <div class="levelup-rewards">
                    <h3>Награды:</h3>
                    <div class="reward-item">💰 ${rewards.gold} золота</div>
                    ${rewards.gems > 0 ? `<div class="reward-item">💎 ${rewards.gems} гемов</div>` : ''}
                    ${rewards.ship ? `<div class="reward-item">🚢 Новый корабль: ${rewards.ship}</div>` : ''}
                    ${rewards.special ? `<div class="reward-item">🎁 ${rewards.special}</div>` : ''}
                </div>
                <button class="btn-steam" onclick="this.parentElement.parentElement.remove()">
                    <span>ПРОДОЛЖИТЬ</span>
                </button>
            </div>
        `;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.5s;
        `;
        document.body.appendChild(modal);
        
        // Звук (если есть)
        this.playSound('levelup');
    }
    
    // Показать получение золота
    showGoldGain(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'gold-notification';
        notification.textContent = `+${amount} 💰`;
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            z-index: 9999;
            animation: slideInRight 0.5s, fadeOut 0.5s 1.5s forwards;
            pointer-events: none;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
    
    // Воспроизведение звуков
    playSound(type) {
        // TODO: добавить звуки
    }
    
    // Подписка на события
    on(event, callback) {
        this.listeners.push({ event, callback });
    }
    
    notifyListeners(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }
    
    // Сохранение
    save() {
        const data = gameStorage.load();
        data.player.level = this.level;
        data.player.exp = this.exp;
        data.player.gold = this.gold;
        data.player.gems = this.gems;
        data.stats = this.stats;
        gameStorage.save(data);
    }
    
    // Загрузка
    load() {
        const data = gameStorage.load();
        this.level = data.player.level || 1;
        this.exp = data.player.exp || 0;
        this.gold = data.player.gold || 1000;
        this.gems = data.player.gems || 0;
        this.stats = data.stats || this.stats;
    }
}

// Глобальный экземпляр
const progression = new ProgressionSystem();