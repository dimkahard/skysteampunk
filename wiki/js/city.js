class CitySystem {
    constructor() {
        this.currentLocation = null;
        this.inCity = false;
        this.cityPosition = new THREE.Vector3(0, 200, 0);
        this.cityRadius = 100;
        this.exitCooldown = false; // Добавлена задержка при выходе
        
        // NPC и локации в городе
        this.locations = {
            shipyard: {
                id: 'shipyard',
                name: 'Верфь',
                description: 'Покупка кораблей',
                icon: '🚢',
                npc: 'Мастер Гирс',
                position: { x: -30, z: 20 }
            },
            weaponShop: {
                id: 'weaponShop',
                name: 'Оружейная',
                description: 'Покупка оружия',
                icon: '⚔️',
                npc: 'Кузнец Болтон',
                position: { x: 30, z: 20 }
            },
            upgradeShop: {
                id: 'upgradeShop',
                name: 'Мастерская',
                description: 'Улучшения кораблей',
                icon: '⚙️',
                npc: 'Инженер Коггинс',
                position: { x: -30, z: -20 }
            },
            generalStore: {
                id: 'generalStore',
                name: 'Лавка',
                description: 'Расходники и ремонт',
                icon: '🏪',
                npc: 'Торговец Флинн',
                position: { x: 30, z: -20 }
            },
            questBoard: {
                id: 'questBoard',
                name: 'Доска заданий',
                description: 'Квесты и задания',
                icon: '📜',
                npc: 'Гильдмастер',
                position: { x: 0, z: 40 }
            },
            tavern: {
                id: 'tavern',
                name: 'Таверна',
                description: 'Отдых и слухи',
                icon: '🍺',
                npc: 'Бармен Сид',
                position: { x: 0, z: -40 }
            }
        };
    }
    
    // Проверка нахождения в городе
    checkCityProximity(playerPosition) {
        // Если есть задержка выхода - не входим обратно
        if (this.exitCooldown) return;
        
        const distance = playerPosition.distanceTo(this.cityPosition);
        
        if (distance < this.cityRadius && !this.inCity) {
            this.enterCity();
        } else if (distance >= this.cityRadius && this.inCity) {
            this.leaveCity();
        }
    }
    
    // Вход в город
    enterCity() {
        this.inCity = true;
        this.exitCooldown = false;
        this.showCityUI();
        questSystem.updateProgress('visit', { location: 'main_city' });
        console.log('🏛️ Добро пожаловать в Небесный Город!');
        console.log('⚠️ inCity = true');
    }
    
    // Выход из города
    leaveCity() {
        this.inCity = false;
        this.hideCityUI();
        this.closeAllShops();
        console.log('👋 Покидаем город');
        console.log('✅ inCity = false');
    }
    
    // Показать UI города
    showCityUI() {
        // Проверяем, существует ли уже UI
        if (document.getElementById('city-ui')) return;
        
        const cityUI = document.createElement('div');
        cityUI.id = 'city-ui';
        cityUI.className = 'city-overlay';
        cityUI.innerHTML = `
            <div class="city-welcome">
                <h1>🏛️ НЕБЕСНЫЙ ГОРОД 🏛️</h1>
                <p>Добро пожаловать, капитан ${progression.level} уровня!</p>
            </div>
            <div class="city-locations">
                ${Object.values(this.locations).map(loc => `
                    <div class="city-location" onclick="citySystem.openLocation('${loc.id}')">
                        <div class="location-icon">${loc.icon}</div>
                        <div class="location-info">
                            <h3>${loc.name}</h3>
                            <p>${loc.description}</p>
                            <small>NPC: ${loc.npc}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn-steam city-exit" onclick="citySystem.quickExit()">
                <span>← ПОКИНУТЬ ГОРОД</span>
            </button>
        `;
        document.body.appendChild(cityUI);
    }
    
    // Скрыть UI города
    hideCityUI() {
        const cityUI = document.getElementById('city-ui');
        if (cityUI) cityUI.remove();
    }
    
    // Быстрый выход из города
    quickExit() {
        if (ship) {
            // Телепортируем корабль ДАЛЕКО от города
            ship.mesh.position.set(
                this.cityPosition.x + 200, // Увеличено с 150 до 200
                this.cityPosition.y,
                this.cityPosition.z
            );
            console.log('📍 Телепортация корабля на позицию:', ship.mesh.position);
        }
        
        // Устанавливаем задержку перед возможностью войти обратно
        this.exitCooldown = true;
        setTimeout(() => {
            this.exitCooldown = false;
            console.log('✅ Задержка выхода снята');
        }, 2000); // 2 секунды задержки
        
        this.leaveCity();
    }
    
    // Открыть локацию
    openLocation(locationId) {
        this.currentLocation = locationId;
        
        switch(locationId) {
            case 'shipyard':
                this.openShipyard();
                break;
            case 'weaponShop':
                this.openWeaponShop();
                break;
            case 'upgradeShop':
                this.openUpgradeShop();
                break;
            case 'generalStore':
                this.openGeneralStore();
                break;
            case 'questBoard':
                this.openQuestBoard();
                break;
            case 'tavern':
                this.openTavern();
                break;
        }
    }
    
    // ВЕРФЬ - покупка кораблей
    openShipyard() {
        const ships = Object.values(economy.shipCatalog);
        
        const modal = this.createShopModal(
            '🚢 ВЕРФЬ',
            'Мастер Гирс: "Лучшие корабли в небесах!"',
            ships.map(ship => ({
                id: ship.id,
                name: ship.name,
                description: ship.description,
                price: ship.price,
                level: ship.level,
                icon: ship.icon,
                owned: ship.owned,
                stats: ship.stats,
                type: 'ship'
            }))
        );
        
        document.body.appendChild(modal);
    }
    
    // ОРУЖЕЙНАЯ
    openWeaponShop() {
        const weapons = Object.values(economy.weaponCatalog);
        
        const modal = this.createShopModal(
            '⚔️ ОРУЖЕЙНАЯ',
            'Кузнец Болтон: "Оружие, выкованное в небесных горнах!"',
            weapons.map(weapon => ({
                id: weapon.id,
                name: weapon.name,
                description: weapon.description,
                price: weapon.price,
                level: weapon.level,
                icon: weapon.icon,
                owned: economy.ownedWeapons.includes(weapon.id),
                stats: { 
                    damage: weapon.damage, 
                    fireRate: weapon.fireRate 
                },
                type: 'weapon'
            }))
        );
        
        document.body.appendChild(modal);
    }
    
    // МАСТЕРСКАЯ
    openUpgradeShop() {
        const upgrades = economy.getAvailableUpgrades(selectedShipType);
        
        const modal = this.createShopModal(
            '⚙️ МАСТЕРСКАЯ',
            'Инженер Коггинс: "Улучшим ваш корабль до совершенства!"',
            upgrades.map(upgrade => ({
                id: upgrade.id,
                name: upgrade.name,
                description: upgrade.description,
                price: upgrade.price,
                level: upgrade.level,
                icon: upgrade.icon,
                owned: false,
                type: 'upgrade'
            }))
        );
        
        document.body.appendChild(modal);
    }
    
    // ЛАВКА
    openGeneralStore() {
        const items = Object.values(economy.consumablesCatalog);
        
        let content = `
            <div class="shop-modal">
                <div class="shop-header">
                    <h2>🏪 ЛАВКА</h2>
                    <p>Торговец Флинн: "Всё для путешествий!"</p>
                    <button class="shop-close" onclick="citySystem.closeShop(this)">✕</button>
                </div>
                <div class="shop-content">
                    <div class="shop-section">
                        <h3>📦 Расходники</h3>
                        <div class="shop-items">
                            ${items.map(item => `
                                <div class="shop-item">
                                    <div class="item-icon">${item.icon}</div>
                                    <div class="item-info">
                                        <h4>${item.name}</h4>
                                        <p>${item.description}</p>
                                        <div class="item-price">💰 ${item.price}</div>
                                        ${this.getInventoryCount(item.id) > 0 ? 
                                            `<small>В инвентаре: ${this.getInventoryCount(item.id)}</small>` : 
                                            ''}
                                    </div>
                                    <button class="btn-buy" onclick="citySystem.buyItem('consumable', '${item.id}')">
                                        Купить
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="shop-section">
                        <h3>🔧 Ремонт</h3>
                        <div class="repair-section">
                            <p>Здоровье корабля: ${ship ? Math.round(ship.health) : 100}%</p>
                            <button class="btn-steam" onclick="citySystem.repairShip()">
                                <span>РЕМОНТ (${ship ? Math.ceil((100 - ship.health) * 10) : 0} золота)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = content;
        document.body.appendChild(modal);
    }
    
    // ДОСКА ЗАДАНИЙ
    openQuestBoard() {
        const available = questSystem.availableQuests;
        const active = questSystem.activeQuests;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="quest-modal">
                <div class="shop-header">
                    <h2>📜 ДОСКА ЗАДАНИЙ</h2>
                    <p>Гильдмастер: "Нужны смелые пилоты!"</p>
                    <button class="shop-close" onclick="citySystem.closeShop(this)">✕</button>
                </div>
                <div class="quest-tabs">
                    <button class="quest-tab active" onclick="citySystem.switchQuestTab(this, 'available')">
                        Доступные (${available.length})
                    </button>
                    <button class="quest-tab" onclick="citySystem.switchQuestTab(this, 'active')">
                        Активные (${active.length})
                    </button>
                </div>
                <div class="quest-content">
                    <div class="quest-list" id="quest-list-available">
                        ${available.length === 0 ? 
                            '<p class="no-quests">Нет доступных квестов</p>' :
                            available.map(quest => this.renderQuest(quest, 'available')).join('')
                        }
                    </div>
                    <div class="quest-list hidden" id="quest-list-active">
                        ${active.length === 0 ? 
                            '<p class="no-quests">Нет активных квестов</p>' :
                            active.map(quest => this.renderQuest(quest, 'active')).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // ТАВЕРНА
    openTavern() {
        const tips = [
            "Слышал, на востоке появились новые летающие острова...",
            "Говорят, кто-то видел легендарный Золотой Дирижабль!",
            "Пираты становятся всё наглее. Будь осторожен в небе.",
            "Мастер Гирс работает над новым типом корабля...",
            "Если летать на большой высоте, можно найти редкие ресурсы.",
            "В следующем обновлении добавят PvP арены!",
            "Некоторые острова появляются только ночью..."
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="shop-modal">
                <div class="shop-header">
                    <h2>🍺 ТАВЕРНА "НЕБЕСНЫЙ ЯКОРЬ"</h2>
                    <p>Бармен Сид: "Заходи, путник!"</p>
                    <button class="shop-close" onclick="citySystem.closeShop(this)">✕</button>
                </div>
                <div class="tavern-content">
                    <div class="tavern-section">
                        <h3>💬 Слухи</h3>
                        <p class="rumor">"${randomTip}"</p>
                    </div>
                    <div class="tavern-section">
                        <h3>📊 Статистика</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-label">Уровень:</span>
                                <span class="stat-value">${progression.level}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Пройдено:</span>
                                <span class="stat-value">${Math.round(progression.stats.distanceTraveled)} м</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Квестов:</span>
                                <span class="stat-value">${progression.stats.questsCompleted}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Кораблей:</span>
                                <span class="stat-value">${economy.ownedShips.length}</span>
                            </div>
                        </div>
                    </div>
                    <div class="tavern-section">
                        <h3>🎮 Настройки</h3>
                        <button class="btn-steam" onclick="gameStorage.export()">
                            <span>📥 Экспорт сохранения</span>
                        </button>
                        <button class="btn-steam" onclick="gameStorage.reset()">
                            <span>🔄 Сбросить прогресс</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Создание модального окна магазина
    createShopModal(title, npcText, items) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="shop-modal">
                <div class="shop-header">
                    <h2>${title}</h2>
                    <p>${npcText}</p>
                    <div class="player-gold">💰 ${progression.gold}</div>
                    <button class="shop-close" onclick="citySystem.closeShop(this)">✕</button>
                </div>
                <div class="shop-items">
                    ${items.map(item => this.renderShopItem(item)).join('')}
                </div>
            </div>
        `;
        return modal;
    }
    
    // Отрисовка товара в магазине
    renderShopItem(item) {
        const canBuy = progression.gold >= item.price && 
                      progression.level >= item.level && 
                      !item.owned;
        
        return `
            <div class="shop-item ${item.owned ? 'owned' : ''} ${!canBuy && !item.owned ? 'locked' : ''}">
                <div class="item-icon">${item.icon}</div>
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    ${item.stats ? `
                        <div class="item-stats">
                            ${Object.entries(item.stats).map(([key, value]) => 
                                `<span>${key}: ${value}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                    <div class="item-footer">
                        <span class="item-price">💰 ${item.price}</span>
                        <span class="item-level">⭐ Ур. ${item.level}</span>
                    </div>
                </div>
                ${item.owned ? 
                    '<div class="item-owned">✓ Куплено</div>' :
                    canBuy ?
                        `<button class="btn-buy" onclick="citySystem.buyItem('${item.type}', '${item.id}')">Купить</button>` :
                        '<div class="item-locked">🔒</div>'
                }
            </div>
        `;
    }
    
    // Отрисовка квеста
    renderQuest(quest, type) {
        const progress = questSystem.getQuestProgress(quest.id);
        
        return `
            <div class="quest-item">
                <div class="quest-icon">${quest.icon}</div>
                <div class="quest-info">
                    <h3>${quest.title}</h3>
                    <p>${quest.description}</p>
                    ${type === 'active' && progress !== null ? `
                        <div class="quest-progress-bar">
                            <div class="quest-progress-fill" style="width: ${progress * 100}%"></div>
                        </div>
                        <small>${Math.round(progress * 100)}% завершено</small>
                    ` : ''}
                    <div class="quest-rewards">
                        ${quest.rewards.exp ? `⭐ ${quest.rewards.exp} опыта` : ''}
                        ${quest.rewards.gold ? ` | 💰 ${quest.rewards.gold}` : ''}
                        ${quest.rewards.gems ? ` | 💎 ${quest.rewards.gems}` : ''}
                    </div>
                </div>
                ${type === 'available' ? 
                    `<button class="btn-accept" onclick="citySystem.acceptQuest('${quest.id}')">Принять</button>` :
                    `<div class="quest-active">В процессе</div>`
                }
            </div>
        `;
    }
    
    // Покупка предмета
    buyItem(type, id) {
        let result;
        
        switch(type) {
            case 'ship':
                result = economy.buyShip(id);
                break;
            case 'weapon':
                result = economy.buyWeapon(id);
                break;
            case 'upgrade':
                result = economy.buyUpgrade(id, selectedShipType);
                break;
            case 'consumable':
                result = economy.buyConsumable(id);
                break;
        }
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            // Обновляем UI
            this.closeAllShops();
            this.openLocation(this.currentLocation);
        } else {
            this.showNotification(result.message, 'error');
        }
        
        // Обновляем UI золота
        this.updateGoldDisplay();
    }
    
    // Ремонт корабля
    repairShip() {
        const result = economy.repairShip();
        this.showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            this.closeAllShops();
            this.openGeneralStore();
        }
    }
    
    // Принять квест
    acceptQuest(questId) {
        if (questSystem.acceptQuest(questId)) {
            this.closeAllShops();
            this.openQuestBoard();
        }
    }
    
    // Переключение вкладок квестов
    switchQuestTab(button, tab) {
        // Убираем активный класс со всех вкладок
        document.querySelectorAll('.quest-tab').forEach(t => t.classList.remove('active'));
        button.classList.add('active');
        
        // Скрываем все списки
        document.querySelectorAll('.quest-list').forEach(l => l.classList.add('hidden'));
        
        // Показываем нужный
        document.getElementById(`quest-list-${tab}`).classList.remove('hidden');
    }
    
    // Получить количество в инвентаре
    getInventoryCount(itemId) {
        return economy.inventory[itemId] || 0;
    }
    
    // Обновить отображение золота
    updateGoldDisplay() {
        const goldDisplays = document.querySelectorAll('.player-gold');
        goldDisplays.forEach(display => {
            display.textContent = `💰 ${progression.gold}`;
        });
    }
    
    // Закрыть магазин (кнопка X)
    closeShop(button) {
        const modal = button.closest('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
    
    // Закрыть все магазины
    closeAllShops() {
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
    }
    
    // Уведомление
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `city-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Cinzel', serif;
            z-index: 10100;
            animation: slideInRight 0.5s, fadeOut 0.5s 2.5s forwards;
            ${type === 'success' ? 'background: linear-gradient(135deg, #2ecc71, #27ae60); color: white;' : ''}
            ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #3498db, #2980b9); color: white;' : ''}
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Глобальный экземпляр
const citySystem = new CitySystem();