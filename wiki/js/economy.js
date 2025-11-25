class EconomySystem {
    constructor() {
        this.ownedShips = ['airship'];
        this.ownedWeapons = [];
        this.equippedWeapon = null;
        this.shipUpgrades = {};
        
        // Каталог кораблей
        this.shipCatalog = {
            airship: {
                id: 'airship',
                name: 'Дирижабль',
                description: 'Сбалансированный корабль для начинающих',
                price: 0,
                level: 1,
                stats: {
                    speed: 120,
                    armor: 100,
                    maneuverability: 85
                },
                icon: '🎈',
                owned: true
            },
            scout: {
                id: 'scout',
                name: 'Разведчик',
                description: 'Быстрый и манёвренный легкий корабль',
                price: 2500,
                level: 5,
                stats: {
                    speed: 180,
                    armor: 60,
                    maneuverability: 95
                },
                icon: '⚡',
                owned: false
            },
            battleship: {
                id: 'battleship',
                name: 'Боевой Крейсер',
                description: 'Тяжелый бронированный военный корабль',
                price: 5000,
                level: 10,
                stats: {
                    speed: 80,
                    armor: 200,
                    maneuverability: 50
                },
                icon: '⚔️',
                owned: false
            },
            interceptor: {
                id: 'interceptor',
                name: 'Перехватчик',
                description: 'Элитный скоростной корабль',
                price: 10000,
                level: 15,
                stats: {
                    speed: 220,
                    armor: 80,
                    maneuverability: 100
                },
                icon: '🚀',
                owned: false
            },
            dreadnought: {
                id: 'dreadnought',
                name: 'Дредноут',
                description: 'Летающая крепость',
                price: 25000,
                level: 20,
                stats: {
                    speed: 60,
                    armor: 300,
                    maneuverability: 40
                },
                icon: '🏰',
                owned: false
            }
        };
        
        // Каталог оружия
        this.weaponCatalog = {
            cannon_basic: {
                id: 'cannon_basic',
                name: 'Базовая пушка',
                description: 'Простая паровая пушка',
                price: 500,
                level: 1,
                damage: 10,
                fireRate: 1,
                icon: '🔫'
            },
            cannon_heavy: {
                id: 'cannon_heavy',
                name: 'Тяжелая пушка',
                description: 'Мощное орудие с высоким уроном',
                price: 1500,
                level: 5,
                damage: 25,
                fireRate: 0.5,
                icon: '💣'
            },
            machine_gun: {
                id: 'machine_gun',
                name: 'Скорострельный пулемёт',
                description: 'Быстрая стрельба, низкий урон',
                price: 2000,
                level: 7,
                damage: 5,
                fireRate: 5,
                icon: '🔫'
            },
            rocket_launcher: {
                id: 'rocket_launcher',
                name: 'Ракетная установка',
                description: 'Самонаводящиеся ракеты',
                price: 5000,
                level: 12,
                damage: 50,
                fireRate: 0.3,
                icon: '🚀'
            },
            plasma_cannon: {
                id: 'plasma_cannon',
                name: 'Плазменная пушка',
                description: 'Экспериментальное оружие',
                price: 15000,
                level: 18,
                damage: 100,
                fireRate: 0.2,
                icon: '⚡'
            }
        };
        
        // Каталог улучшений
        this.upgradeCatalog = {
            engine_1: {
                id: 'engine_1',
                name: 'Улучшенный двигатель I',
                description: '+10% к скорости',
                price: 800,
                level: 3,
                effect: { speed: 1.1 },
                icon: '⚙️'
            },
            engine_2: {
                id: 'engine_2',
                name: 'Улучшенный двигатель II',
                description: '+25% к скорости',
                price: 2500,
                level: 8,
                requires: 'engine_1',
                effect: { speed: 1.25 },
                icon: '⚙️'
            },
            armor_1: {
                id: 'armor_1',
                name: 'Укрепленная броня I',
                description: '+20% к прочности',
                price: 1000,
                level: 4,
                effect: { armor: 1.2 },
                icon: '🛡️'
            },
            armor_2: {
                id: 'armor_2',
                name: 'Укрепленная броня II',
                description: '+50% к прочности',
                price: 3000,
                level: 10,
                requires: 'armor_1',
                effect: { armor: 1.5 },
                icon: '🛡️'
            },
            maneuver_1: {
                id: 'maneuver_1',
                name: 'Стабилизаторы I',
                description: '+15% к манёвренности',
                price: 700,
                level: 3,
                effect: { maneuverability: 1.15 },
                icon: '🎯'
            }
        };
        
        // Каталог расходников
        this.consumablesCatalog = {
            repair_kit: {
                id: 'repair_kit',
                name: 'Ремонтный набор',
                description: 'Восстанавливает 50% здоровья',
                price: 100,
                level: 1,
                icon: '🔧',
                stackable: true
            },
            fuel_boost: {
                id: 'fuel_boost',
                name: 'Топливный ускоритель',
                description: '+50% скорости на 30 секунд',
                price: 150,
                level: 2,
                icon: '⛽',
                stackable: true
            },
            shield: {
                id: 'shield',
                name: 'Энергощит',
                description: 'Защита от урона на 1 минуту',
                price: 300,
                level: 5,
                icon: '🛡️',
                stackable: true
            }
        };
        
        this.inventory = {};
        this.load();
    }
    
    // Покупка корабля
    buyShip(shipId) {
        const ship = this.shipCatalog[shipId];
        
        if (!ship) {
            return { success: false, message: 'Корабль не найден' };
        }
        
        if (ship.owned || this.ownedShips.includes(shipId)) {
            return { success: false, message: 'Корабль уже куплен' };
        }
        
        if (progression.level < ship.level) {
            return { success: false, message: `Требуется ${ship.level} уровень` };
        }
        
        if (!progression.spendGold(ship.price)) {
            return { success: false, message: 'Недостаточно золота' };
        }
        
        this.ownedShips.push(shipId);
        ship.owned = true;
        this.save();
        
        questSystem.updateProgress('purchase', { itemType: 'ship' });
        questSystem.updateProgress('collection', { ownedShips: this.ownedShips });
        
        return { success: true, message: `Корабль "${ship.name}" куплен!` };
    }
    
    // Покупка оружия
    buyWeapon(weaponId) {
        const weapon = this.weaponCatalog[weaponId];
        
        if (!weapon) {
            return { success: false, message: 'Оружие не найдено' };
        }
        
        if (this.ownedWeapons.includes(weaponId)) {
            return { success: false, message: 'Оружие уже куплено' };
        }
        
        if (progression.level < weapon.level) {
            return { success: false, message: `Требуется ${weapon.level} уровень` };
        }
        
        if (!progression.spendGold(weapon.price)) {
            return { success: false, message: 'Недостаточно золота' };
        }
        
        this.ownedWeapons.push(weaponId);
        this.save();
        
        questSystem.updateProgress('purchase', { itemType: 'weapon' });
        
        return { success: true, message: `Оружие "${weapon.name}" куплено!` };
    }
    
    // Экипировка оружия
    equipWeapon(weaponId) {
        if (!this.ownedWeapons.includes(weaponId)) {
            return { success: false, message: 'Оружие не куплено' };
        }
        
        this.equippedWeapon = weaponId;
        this.save();
        
        return { success: true, message: 'Оружие экипировано' };
    }
    
    // Покупка улучшения
    buyUpgrade(upgradeId, shipId) {
        const upgrade = this.upgradeCatalog[upgradeId];
        
        if (!upgrade) {
            return { success: false, message: 'Улучшение не найдено' };
        }
        
        if (progression.level < upgrade.level) {
            return { success: false, message: `Требуется ${upgrade.level} уровень` };
        }
        
        // Проверка требований
        if (upgrade.requires) {
            const shipUpgrades = this.shipUpgrades[shipId] || [];
            if (!shipUpgrades.includes(upgrade.requires)) {
                const requiredUpgrade = this.upgradeCatalog[upgrade.requires];
                return { 
                    success: false, 
                    message: `Требуется: ${requiredUpgrade.name}` 
                };
            }
        }
        
        if (!progression.spendGold(upgrade.price)) {
            return { success: false, message: 'Недостаточно золота' };
        }
        
        if (!this.shipUpgrades[shipId]) {
            this.shipUpgrades[shipId] = [];
        }
        
        this.shipUpgrades[shipId].push(upgradeId);
        this.save();
        
        return { success: true, message: `Улучшение "${upgrade.name}" установлено!` };
    }
    
    // Покупка расходника
    buyConsumable(itemId, quantity = 1) {
        const item = this.consumablesCatalog[itemId];
        
        if (!item) {
            return { success: false, message: 'Предмет не найден' };
        }
        
        const totalPrice = item.price * quantity;
        
        if (!progression.spendGold(totalPrice)) {
            return { success: false, message: 'Недостаточно золота' };
        }
        
        if (!this.inventory[itemId]) {
            this.inventory[itemId] = 0;
        }
        
        this.inventory[itemId] += quantity;
        this.save();
        
        return { 
            success: true, 
            message: `Куплено: ${item.name} x${quantity}` 
        };
    }
    
    // Использование расходника
    useConsumable(itemId) {
        if (!this.inventory[itemId] || this.inventory[itemId] <= 0) {
            return { success: false, message: 'Предмет отсутствует' };
        }
        
        const item = this.consumablesCatalog[itemId];
        this.inventory[itemId]--;
        this.save();
        
        return { success: true, item: item };
    }
    
    // Ремонт корабля
    repairShip() {
        const repairCost = Math.ceil((100 - ship.health) * 10);
        
        if (ship.health >= 100) {
            return { success: false, message: 'Корабль не поврежден' };
        }
        
        if (!progression.spendGold(repairCost)) {
            return { success: false, message: 'Недостаточно золота' };
        }
        
        ship.health = 100;
        
        return { 
            success: true, 
            message: `Корабль отремонтирован! (-${repairCost} золота)` 
        };
    }
    
    // Получить список доступных кораблей
    getAvailableShips() {
        return Object.values(this.shipCatalog).filter(ship => 
            !ship.owned && ship.level <= progression.level
        );
    }
    
    // Получить список доступного оружия
    getAvailableWeapons() {
        return Object.values(this.weaponCatalog).filter(weapon => 
            !this.ownedWeapons.includes(weapon.id) && weapon.level <= progression.level
        );
    }
    
    // Получить список доступных улучшений
    getAvailableUpgrades(shipId) {
        const shipUpgrades = this.shipUpgrades[shipId] || [];
        return Object.values(this.upgradeCatalog).filter(upgrade => {
            if (shipUpgrades.includes(upgrade.id)) return false;
            if (upgrade.level > progression.level) return false;
            if (upgrade.requires && !shipUpgrades.includes(upgrade.requires)) return false;
            return true;
        });
    }
    
    // Получить статистику корабля с учетом улучшений
    getShipStats(shipId) {
        const baseShip = this.shipCatalog[shipId];
        if (!baseShip) return null;
        
        let stats = { ...baseShip.stats };
        const upgrades = this.shipUpgrades[shipId] || [];
        
        upgrades.forEach(upgradeId => {
            const upgrade = this.upgradeCatalog[upgradeId];
            if (upgrade && upgrade.effect) {
                Object.keys(upgrade.effect).forEach(stat => {
                    stats[stat] = Math.floor(stats[stat] * upgrade.effect[stat]);
                });
            }
        });
        
        return stats;
    }
    
    // Сохранение/загрузка
    save() {
        const data = gameStorage.load();
        data.ships = {
            owned: this.ownedShips,
            current: selectedShipType,
            upgrades: this.shipUpgrades
        };
        data.weapons = {
            owned: this.ownedWeapons,
            equipped: this.equippedWeapon
        };
        data.inventory = this.inventory;
        gameStorage.save(data);
    }
    
    load() {
        const data = gameStorage.load();
        this.ownedShips = data.ships.owned || ['airship'];
        this.shipUpgrades = data.ships.upgrades || {};
        this.ownedWeapons = data.weapons.owned || [];
        this.equippedWeapon = data.weapons.equipped || null;
        this.inventory = data.inventory || {};
        
        // Обновляем статус владения в каталоге
        this.ownedShips.forEach(shipId => {
            if (this.shipCatalog[shipId]) {
                this.shipCatalog[shipId].owned = true;
            }
        });
    }
}

// Глобальный экземпляр
const economy = new EconomySystem();