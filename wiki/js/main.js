// Глобальные переменные
let scene, camera, renderer;
let ship, world, controls, ui, resources;
let gameState = 'loading';
let selectedShipType = 'airship';
let animationId;
let lastFrameTime = 0;

// Инициализация
function init() {
    console.log('🎮 Инициализация игры...');
    
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 500, 2500);

    // Камера
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        3500
    );

    // Рендерер
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Инициализация модулей
    world = new World(scene);
    resources = initResourceSystem(scene);
    controls = new Controls();
    ui = new GameUI();
    
    // Загрузка сохранений
    progression.load();
    economy.load();
    questSystem.load();
    
    console.log(`📊 Загружен прогресс: Уровень ${progression.level}, ${progression.gold} золота`);

    // События
    window.addEventListener('resize', onWindowResize);
    
    // Симуляция загрузки
    simulateLoading();
}

// Симуляция загрузки
function simulateLoading() {
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            setTimeout(showMainMenu, 500);
        }
        document.getElementById('loading-progress').style.width = progress + '%';
        
        const texts = [
            'Нагрев паровых котлов...',
            'Калибровка механизмов...',
            'Загрузка чертежей кораблей...',
            'Настройка винтов...',
            'Заправка топливных баков...',
            'Проверка систем навигации...',
            'Загрузка города...',
            'Инициализация квестов...'
        ];
        document.getElementById('loading-text').textContent = 
            texts[Math.floor(Math.random() * texts.length)];
    }, 300);
}

// Показать главное меню
function showMainMenu() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    gameState = 'menu';
    
    updateShipSelectionUI();
}

// Обновление UI выбора кораблей
function updateShipSelectionUI() {
    const shipsGrid = document.querySelector('.ships-grid');
    if (!shipsGrid) return;
    
    const availableShips = [
        { id: 'airship', name: 'Дирижабль', speed: 3, maneuver: 4, armor: 2 },
        { id: 'scout', name: 'Разведчик', speed: 5, maneuver: 5, armor: 1, level: 5 },
        { id: 'battleship', name: 'Боевой Крейсер', speed: 2, maneuver: 2, armor: 5, level: 10 }
    ];
    
    shipsGrid.innerHTML = availableShips.map(s => {
        const owned = economy.ownedShips.includes(s.id);
        const locked = s.level && progression.level < s.level;
        
        return `
            <div class="ship-card ${locked ? 'locked' : ''}" 
                 onclick="${owned || !locked ? `selectShip('${s.id}')` : ''}">
                <div class="ship-preview">${s.id === 'airship' ? '🎈' : s.id === 'scout' ? '⚡' : '⚔️'}</div>
                <h3>${s.name}</h3>
                ${locked ? `<p style="color: #ff6b6b;">🔒 Требуется ${s.level} уровень</p>` : ''}
                ${!owned && !locked ? '<p style="color: #ffa500;">Не куплен</p>' : ''}
                <p>Скорость: ${'⭐'.repeat(s.speed)}</p>
                <p>Маневр: ${'⭐'.repeat(s.maneuver)}</p>
                <p>Прочность: ${'⭐'.repeat(s.armor)}</p>
            </div>
        `;
    }).join('');
}

// Выбор корабля
function showShipSelection() {
    updateShipSelectionUI();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('ship-selection').classList.remove('hidden');
}

function hideShipSelection() {
    document.getElementById('ship-selection').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function selectShip(type) {
    if (!economy.ownedShips.includes(type)) {
        alert('❌ Этот корабль нужно купить в городе!');
        return;
    }
    selectedShipType = type;
    console.log(`✅ Выбран корабль: ${type}`);
    hideShipSelection();
}

// Настройки
function showSettings() {
    alert('⚙️ Раздел настроек в разработке!');
}

function showControls() {
    const controlsText = `
🎮 УПРАВЛЕНИЕ КОРАБЛЕМ 🎮

W - Увеличить скорость
S - Уменьшить скорость
A - Поворот влево
D - Поворот вправо
SPACE - Турбо ускорение
ESC - Пауза

🏛️ ГОРОД:
Подлетите к центральному городу (0, 200, 0)
чтобы открыть магазины и квесты!

Удачного полета, капитан!
    `;
    alert(controlsText);
}

// Старт игры
function startGame() {
    console.log('🚀 Запуск игры...');
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    
    // Создание корабля
    ship = new Ship(scene, selectedShipType);
    
    // ПРОВЕРКА КОРАБЛЯ
    console.log('🚢 Корабль создан:', {
        type: ship.type,
        stats: ship.stats,
        position: ship.mesh.position,
        speed: ship.speed,
        maxSpeed: ship.maxSpeed
    });
    
    // Включаем автосохранение
    gameStorage.enableAutoSave(() => {
        return {
            player: {
                level: progression.level,
                exp: progression.exp,
                gold: progression.gold,
                gems: progression.gems
            },
            ships: {
                owned: economy.ownedShips,
                current: selectedShipType,
                upgrades: economy.shipUpgrades
            },
            weapons: {
                owned: economy.ownedWeapons,
                equipped: economy.equippedWeapon
            },
            quests: {
                completed: questSystem.completedQuests,
                active: questSystem.activeQuests.map(q => ({
                    id: q.id,
                    progress: q.progress,
                    startTime: q.startTime
                }))
            },
            stats: progression.stats
        };
    }, 30000);
    
    // Автоматически принимаем первый квест
    if (questSystem.availableQuests.length > 0 && questSystem.activeQuests.length === 0) {
        questSystem.acceptQuest('tutorial_1');
    }
    
    gameState = 'playing';
    lastFrameTime = performance.now();
    animate();
    
    console.log('✅ Игра началась!');
}

// Игровой цикл
function animate(currentTime = 0) {
    if (gameState !== 'playing') return;
    
    animationId = requestAnimationFrame(animate);
    
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    // Обновление
    if (ship) {
        controls.update(ship);
        ship.update();
        
        // Обновление прогрессии
        updateGameProgression(deltaTime);
        
        // Проверка близости к городу
        citySystem.checkCityProximity(ship.mesh.position);
    }
    
    world.update(ship);
    resources.update(deltaTime, ship ? ship.mesh.position : null);
    ui.update(ship);

    // Камера следует за кораблем
    if (ship) {
        const cameraOffset = new THREE.Vector3(0, 10, -30);
        cameraOffset.applyQuaternion(ship.mesh.quaternion);
        camera.position.copy(ship.mesh.position).add(cameraOffset);
        
        const lookAtOffset = new THREE.Vector3(0, 0, 20);
        lookAtOffset.applyQuaternion(ship.mesh.quaternion);
        camera.lookAt(ship.mesh.position.clone().add(lookAtOffset));
    }

    renderer.render(scene, camera);
}

// Обновление прогрессии игры
let distanceLastFrame = { x: 0, z: 0 };
function updateGameProgression(deltaTime) {
    if (!ship) return;
    
    // Пройденная дистанция
    const currentPos = new THREE.Vector2(ship.mesh.position.x, ship.mesh.position.z);
    const lastPos = new THREE.Vector2(distanceLastFrame.x, distanceLastFrame.z);
    const distance = currentPos.distanceTo(lastPos);
    
    if (distance > 0.1) {
        progression.stats.distanceTraveled += distance;
        questSystem.updateProgress('travel', { distance: distance });
        
        // Опыт за полет
        if (progression.stats.distanceTraveled % 10 < distance) {
            progression.addExp(1, 'Полет');
        }
    }
    
    distanceLastFrame = { x: ship.mesh.position.x, z: ship.mesh.position.z };
    
    // Обновление квестов
    questSystem.updateProgress('altitude', { height: ship.mesh.position.y });
    
    if (ship.speed >= ship.maxSpeed * 0.95) {
        questSystem.updateProgress('speed', { atMaxSpeed: true });
    }
    
    // Время игры
    progression.stats.timePlayedMinutes += deltaTime / 60;
}

// Пауза
function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-menu').classList.remove('hidden');
        cancelAnimationFrame(animationId);
        
        // Сохранение
        gameStorage.save({
            player: {
                level: progression.level,
                exp: progression.exp,
                gold: progression.gold,
                gems: progression.gems
            },
            ships: {
                owned: economy.ownedShips,
                current: selectedShipType,
                upgrades: economy.shipUpgrades
            },
            weapons: {
                owned: economy.ownedWeapons,
                equipped: economy.equippedWeapon
            },
            quests: {
                completed: questSystem.completedQuests,
                active: questSystem.activeQuests.map(q => ({
                    id: q.id,
                    progress: q.progress,
                    startTime: q.startTime
                }))
            },
            stats: progression.stats
        });
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pause-menu').classList.add('hidden');
        lastFrameTime = performance.now();
        animate();
    }
}

function restartGame() {
    location.reload();
}

function exitToMenu() {
    location.reload();
}

// Обработка ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameState === 'playing') {
            pauseGame();
        } else if (gameState === 'paused') {
            resumeGame();
        }
    }
    
    // Отладка клавиш - F3
    if (e.key === 'F3') {
        e.preventDefault();
        if (controls) {
            controls.debugKeys();
        }
        if (ship) {
            console.log('🚢 Статус корабля:', {
                speed: ship.speed,
                maxSpeed: ship.maxSpeed,
                inCity: citySystem.inCity,
                position: ship.mesh.position
            });
        }
    }
    
    // Читы для тестирования
    if (e.key === 'F1') {
        progression.addExp(1000);
        progression.addGold(5000);
        console.log('🎁 Чит: +1000 опыта, +5000 золота');
    }
    if (e.key === 'F2') {
        progression.level = 20;
        console.log('🎁 Чит: Уровень установлен на 20');
    }
});

// Изменение размера окна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Запуск
init();

console.log(`
╔═══════════════════════════════════════╗
║       🎮 SKYSHIPS v1.0.0 🎮          ║
║   Стимпанк Небесные Корабли MMO      ║
╠═══════════════════════════════════════╣
║ F1 - Читы (опыт/золото)              ║
║ F2 - Установить уровень 20           ║
║ F3 - Отладка (клавиши, корабль)      ║
║ ESC - Пауза                          ║
╚═══════════════════════════════════════╝
`);