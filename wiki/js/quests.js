class QuestSystem {
    constructor() {
        this.activeQuests = [];
        this.completedQuests = [];
        this.availableQuests = [];
        
        // База квестов
        this.questDatabase = this.createQuestDatabase();
        
        this.initQuests();
    }
    
    // База всех квестов
    createQuestDatabase() {
        return {
            // Начальные квесты
            tutorial_1: {
                id: 'tutorial_1',
                title: 'Первый полет',
                description: 'Пролетите 500 метров',
                type: 'travel',
                requirements: { distance: 500 },
                rewards: { exp: 50, gold: 100 },
                level: 1,
                icon: '✈️'
            },
            tutorial_2: {
                id: 'tutorial_2',
                title: 'Знакомство с городом',
                description: 'Посетите главный город',
                type: 'visit',
                requirements: { location: 'main_city' },
                rewards: { exp: 100, gold: 200 },
                level: 1,
                icon: '🏛️'
            },
            tutorial_3: {
                id: 'tutorial_3',
                title: 'Покупка снаряжения',
                description: 'Купите любое оружие в магазине',
                type: 'purchase',
                requirements: { itemType: 'weapon', count: 1 },
                rewards: { exp: 150, gold: 300 },
                level: 2,
                icon: '⚔️'
            },
            
            // Ежедневные квесты
            daily_travel: {
                id: 'daily_travel',
                title: 'Ежедневный маршрут',
                description: 'Пролетите 2000 метров',
                type: 'travel',
                requirements: { distance: 2000 },
                rewards: { exp: 200, gold: 500 },
                daily: true,
                level: 1,
                icon: '🗺️'
            },
            daily_altitude: {
                id: 'daily_altitude',
                title: 'Покоритель высот',
                description: 'Достигните высоты 350 метров',
                type: 'altitude',
                requirements: { height: 350 },
                rewards: { exp: 150, gold: 400 },
                daily: true,
                level: 3,
                icon: '⛰️'
            },
            
            // Квесты по уровням
            level_5_quest: {
                id: 'level_5_quest',
                title: 'Новые горизонты',
                description: 'Достигните 5 уровня',
                type: 'level',
                requirements: { level: 5 },
                rewards: { exp: 500, gold: 1000, gems: 5 },
                level: 1,
                icon: '⭐'
            },
            explore_islands: {
                id: 'explore_islands',
                title: 'Исследователь островов',
                description: 'Посетите 3 летающих острова',
                type: 'explore',
                requirements: { islands: 3 },
                rewards: { exp: 300, gold: 600 },
                level: 3,
                icon: '🏝️'
            },
            speed_demon: {
                id: 'speed_demon',
                title: 'Демон скорости',
                description: 'Разгонитесь до максимальной скорости',
                type: 'speed',
                requirements: { maxSpeed: true },
                rewards: { exp: 250, gold: 500 },
                level: 4,
                icon: '💨'
            },
            
            // Сложные квесты
            master_pilot: {
                id: 'master_pilot',
                title: 'Мастер-пилот',
                description: 'Пролетите 10000 метров без остановки',
                type: 'travel',
                requirements: { distance: 10000 },
                rewards: { exp: 1000, gold: 2500, gems: 10 },
                level: 8,
                icon: '🏆'
            },
            collector: {
                id: 'collector',
                title: 'Коллекционер',
                description: 'Соберите все 3 типа кораблей',
                type: 'collection',
                requirements: { ships: ['airship', 'scout', 'battleship'] },
                rewards: { exp: 800, gold: 2000, gems: 15 },
                level: 10,
                icon: '🚢'
            }
        };
    }
    
    // Инициализация квестов
    initQuests() {
        this.load();
        this.updateAvailableQuests();
    }
    
    // Обновление доступных квестов
    updateAvailableQuests() {
        this.availableQuests = [];
        
        Object.values(this.questDatabase).forEach(quest => {
            // Проверяем уровень и не завершен ли
            if (quest.level <= progression.level && 
                !this.isCompleted(quest.id) && 
                !this.isActive(quest.id)) {
                
                // Ежедневные квесты
                if (quest.daily && !this.isDailyCompleted(quest.id)) {
                    this.availableQuests.push(quest);
                } else if (!quest.daily) {
                    this.availableQuests.push(quest);
                }
            }
        });
    }
    
    // Принять квест
    acceptQuest(questId) {
        const quest = this.questDatabase[questId];
        if (!quest) return false;
        
        // Проверки
        if (this.isActive(questId)) {
            console.log('❌ Квест уже активен');
            return false;
        }
        
        if (quest.level > progression.level) {
            console.log(`❌ Требуется уровень ${quest.level}`);
            return false;
        }
        
        // Добавляем в активные
        const activeQuest = {
            ...quest,
            progress: {},
            startTime: Date.now()
        };
        
        this.activeQuests.push(activeQuest);
        this.updateAvailableQuests();
        this.save();
        
        console.log(`✅ Квест принят: ${quest.title}`);
        this.showQuestNotification(`Новый квест: ${quest.title}`, 'accept');
        
        return true;
    }
    
    // Обновление прогресса квеста
    updateProgress(type, data) {
        this.activeQuests.forEach(quest => {
            if (quest.type !== type) return;
            
            let completed = false;
            
            switch (type) {
                case 'travel':
                    quest.progress.distance = (quest.progress.distance || 0) + data.distance;
                    if (quest.progress.distance >= quest.requirements.distance) {
                        completed = true;
                    }
                    break;
                    
                case 'visit':
                    if (data.location === quest.requirements.location) {
                        quest.progress.visited = true;
                        completed = true;
                    }
                    break;
                    
                case 'purchase':
                    if (data.itemType === quest.requirements.itemType) {
                        quest.progress.count = (quest.progress.count || 0) + 1;
                        if (quest.progress.count >= quest.requirements.count) {
                            completed = true;
                        }
                    }
                    break;
                    
                case 'altitude':
                    quest.progress.maxHeight = Math.max(quest.progress.maxHeight || 0, data.height);
                    if (quest.progress.maxHeight >= quest.requirements.height) {
                        completed = true;
                    }
                    break;
                    
                case 'level':
                    if (progression.level >= quest.requirements.level) {
                        completed = true;
                    }
                    break;
                    
                case 'explore':
                    quest.progress.islands = quest.progress.islands || [];
                    if (!quest.progress.islands.includes(data.islandId)) {
                        quest.progress.islands.push(data.islandId);
                    }
                    if (quest.progress.islands.length >= quest.requirements.islands) {
                        completed = true;
                    }
                    break;
                    
                case 'speed':
                    if (data.atMaxSpeed) {
                        quest.progress.achieved = true;
                        completed = true;
                    }
                    break;
                    
                case 'collection':
                    quest.progress.ships = data.ownedShips;
                    const hasAll = quest.requirements.ships.every(ship => 
                        data.ownedShips.includes(ship)
                    );
                    if (hasAll) completed = true;
                    break;
            }
            
            if (completed) {
                this.completeQuest(quest.id);
            }
        });
        
        this.save();
    }
    
    // Завершение квеста
    completeQuest(questId) {
        const questIndex = this.activeQuests.findIndex(q => q.id === questId);
        if (questIndex === -1) return;
        
        const quest = this.activeQuests[questIndex];
        
        // Выдаем награды
        if (quest.rewards.exp) {
            progression.addExp(quest.rewards.exp, `Квест: ${quest.title}`);
        }
        if (quest.rewards.gold) {
            progression.addGold(quest.rewards.gold, `Квест: ${quest.title}`);
        }
        if (quest.rewards.gems) {
            progression.addGems(quest.rewards.gems);
        }
        
        // Переносим в завершенные
        this.activeQuests.splice(questIndex, 1);
        this.completedQuests.push(questId);
        
        // Если ежедневный - добавляем в список выполненных сегодня
        if (quest.daily) {
            const today = new Date().toDateString();
            const dailyKey = `${questId}_${today}`;
            const data = gameStorage.load();
            data.quests.dailyCompleted = data.quests.dailyCompleted || [];
            data.quests.dailyCompleted.push(dailyKey);
            gameStorage.save(data);
        }
        
        progression.stats.questsCompleted++;
        
        this.updateAvailableQuests();
        this.save();
        
        this.showQuestComplete(quest);
        console.log(`🎉 Квест завершен: ${quest.title}`);
    }
    
    // Проверки
    isActive(questId) {
        return this.activeQuests.some(q => q.id === questId);
    }
    
    isCompleted(questId) {
        return this.completedQuests.includes(questId);
    }
    
    isDailyCompleted(questId) {
        const today = new Date().toDateString();
        const dailyKey = `${questId}_${today}`;
        const data = gameStorage.load();
        return (data.quests.dailyCompleted || []).includes(dailyKey);
    }
    
    // Получить прогресс квеста
    getQuestProgress(questId) {
        const quest = this.activeQuests.find(q => q.id === questId);
        if (!quest) return null;
        
        switch (quest.type) {
            case 'travel':
                return (quest.progress.distance || 0) / quest.requirements.distance;
            case 'altitude':
                return (quest.progress.maxHeight || 0) / quest.requirements.height;
            case 'explore':
                return (quest.progress.islands?.length || 0) / quest.requirements.islands;
            case 'purchase':
                return (quest.progress.count || 0) / quest.requirements.count;
            default:
                return quest.progress.completed ? 1 : 0;
        }
    }
    
    // UI уведомления
    showQuestNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `quest-notification quest-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #2C2416, #1A1410);
            border: 2px solid #B87333;
            color: #D4AF37;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Cinzel', serif;
            z-index: 9999;
            animation: slideInRight 0.5s, fadeOut 0.5s 3s forwards;
            box-shadow: 0 0 20px rgba(184, 115, 51, 0.5);
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3500);
    }
    
    showQuestComplete(quest) {
        const modal = document.createElement('div');
        modal.className = 'quest-complete-modal';
        modal.innerHTML = `
            <div class="quest-complete-content">
                <h1>🎉 КВЕСТ ЗАВЕРШЕН! 🎉</h1>
                <div class="quest-icon">${quest.icon}</div>
                <h2>${quest.title}</h2>
                <div class="quest-rewards">
                    <h3>Награды:</h3>
                    ${quest.rewards.exp ? `<div>⭐ ${quest.rewards.exp} опыта</div>` : ''}
                    ${quest.rewards.gold ? `<div>💰 ${quest.rewards.gold} золота</div>` : ''}
                    ${quest.rewards.gems ? `<div>💎 ${quest.rewards.gems} гемов</div>` : ''}
                </div>
                <button class="btn-steam" onclick="this.parentElement.parentElement.remove()">
                    <span>ОТЛИЧНО!</span>
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
            z-index: 10002;
            animation: fadeIn 0.5s;
        `;
        document.body.appendChild(modal);
    }
    
    // Сохранение/загрузка
    save() {
        const data = gameStorage.load();
        data.quests.active = this.activeQuests.map(q => ({
            id: q.id,
            progress: q.progress,
            startTime: q.startTime
        }));
        data.quests.completed = this.completedQuests;
        gameStorage.save(data);
    }
    
    load() {
        const data = gameStorage.load();
        this.completedQuests = data.quests.completed || [];
        
        // Восстанавливаем активные квесты
        this.activeQuests = (data.quests.active || []).map(savedQuest => {
            const questTemplate = this.questDatabase[savedQuest.id];
            return {
                ...questTemplate,
                progress: savedQuest.progress,
                startTime: savedQuest.startTime
            };
        });
    }
}

// Глобальный экземпляр
const questSystem = new QuestSystem();