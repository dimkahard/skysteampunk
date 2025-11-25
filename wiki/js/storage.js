class GameStorage {
    constructor() {
        this.storageKey = 'skyships_save';
        this.defaultData = {
            player: {
                name: 'Captain',
                level: 1,
                exp: 0,
                gold: 1000,
                gems: 0
            },
            ships: {
                owned: ['airship'],
                current: 'airship',
                upgrades: {}
            },
            weapons: {
                owned: [],
                equipped: null
            },
            quests: {
                completed: [],
                active: [],
                dailyCompleted: []
            },
            stats: {
                distanceTraveled: 0,
                enemiesDefeated: 0,
                timePlayedMinutes: 0,
                questsCompleted: 0
            },
            settings: {
                sound: true,
                music: true,
                quality: 'high'
            },
            lastSave: Date.now()
        };
    }
    
    // Загрузка данных
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                console.log('✅ Игра загружена');
                return this.mergeWithDefaults(data);
            }
        } catch (e) {
            console.error('❌ Ошибка загрузки:', e);
        }
        console.log('🆕 Новая игра');
        return JSON.parse(JSON.stringify(this.defaultData));
    }
    
    // Сохранение данных
    save(data) {
        try {
            data.lastSave = Date.now();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('💾 Игра сохранена');
            return true;
        } catch (e) {
            console.error('❌ Ошибка сохранения:', e);
            return false;
        }
    }
    
    // Автосохранение
    enableAutoSave(getData, interval = 30000) {
        setInterval(() => {
            const data = getData();
            this.save(data);
        }, interval);
        console.log(`🔄 Автосохранение каждые ${interval/1000}с`);
    }
    
    // Слияние с дефолтными значениями
    mergeWithDefaults(data) {
        return {
            ...JSON.parse(JSON.stringify(this.defaultData)),
            ...data
        };
    }
    
    // Сброс прогресса
    reset() {
        if (confirm('⚠️ Вы уверены? Весь прогресс будет удален!')) {
            localStorage.removeItem(this.storageKey);
            location.reload();
        }
    }
    
    // Экспорт сохранения
    export() {
        const data = this.load();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skyships_save_${Date.now()}.json`;
        a.click();
        console.log('📥 Сохранение экспортировано');
    }
    
    // Импорт сохранения
    import(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.save(data);
                location.reload();
            } catch (err) {
                alert('❌ Ошибка импорта файла');
            }
        };
        reader.readAsText(file);
    }
}

// Глобальный экземпляр
const gameStorage = new GameStorage();