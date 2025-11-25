class Controls {
    constructor() {
        this.keys = {};
        this.debugDisplay = null;
        
        // УДАЛЯЕМ ВСЕ СТАРЫЕ ОБРАБОТЧИКИ
        this.removeAllKeyboardListeners();
        
        // Создаем отладку
        this.createDebugDisplay();
        
        // ВАЖНО: инициализируем события ПОСЛЕДНИМИ
        setTimeout(() => {
            this.initEventListeners();
            console.log('✅ Controls инициализированы с задержкой');
        }, 100);
    }
    
    removeAllKeyboardListeners() {
        // Клонируем body чтобы убрать все обработчики
        // НЕТ, это слишком радикально, просто перехватим с высоким приоритетом
    }
    
    initEventListeners() {
        // МАКСИМАЛЬНЫЙ ПРИОРИТЕТ - capture + stopImmediatePropagation
        
        const gameKeys = ['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
        
        // Keydown - ПЕРЕХВАТЫВАЕМ ВСЁ
        const keydownHandler = (e) => {
            const key = e.key.toLowerCase();
            
            // Если это игровая клавиша - перехватываем полностью
            if(gameKeys.includes(key)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                this.keys[key] = true;
                console.log('✅ ПЕРЕХВАЧЕНА:', key);
                this.updateDebugDisplay();
                
                return false;
            }
        };
        
        const keyupHandler = (e) => {
            const key = e.key.toLowerCase();
            
            if(gameKeys.includes(key)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                this.keys[key] = false;
                this.updateDebugDisplay();
                
                return false;
            }
        };
        
        // Добавляем на WINDOW с capture (самый высокий приоритет)
        window.addEventListener('keydown', keydownHandler, { capture: true, passive: false });
        window.addEventListener('keyup', keyupHandler, { capture: true, passive: false });
        
        // Дополнительно на document
        document.addEventListener('keydown', keydownHandler, { capture: true, passive: false });
        document.addEventListener('keyup', keyupHandler, { capture: true, passive: false });
        
        // И на body
        document.body.addEventListener('keydown', keydownHandler, { capture: true, passive: false });
        document.body.addEventListener('keyup', keyupHandler, { capture: true, passive: false });
        
        console.log('🎮 Обработчики клавиш установлены на window, document, body');
    }
    
    createDebugDisplay() {
        const debug = document.createElement('div');
        debug.id = 'controls-debug';
        debug.style.cssText = `
            position: fixed;
            top: 200px;
            left: 20px;
            background: rgba(0, 0, 0, 0.95);
            color: #00ff00;
            padding: 20px;
            font-family: monospace;
            font-size: 18px;
            z-index: 99999;
            border: 3px solid #00ff00;
            border-radius: 10px;
            min-width: 350px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
        `;
        document.body.appendChild(debug);
        this.debugDisplay = debug;
        this.updateDebugDisplay();
    }
    
    updateDebugDisplay() {
        if(!this.debugDisplay) return;
        
        const pressed = Object.keys(this.keys).filter(k => this.keys[k]);
        
        this.debugDisplay.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 15px; color: yellow; font-weight: bold;">
                🎮 ОТЛАДКА КЛАВИШ
            </div>
            <div style="font-size: 20px; margin: 8px 0;">
                W: <span style="color: ${this.keys['w'] ? '#00ff00' : '#ff0000'}; font-weight: bold;">
                    ${this.keys['w'] ? '✅ РАБОТАЕТ' : '❌ НЕ НАЖАТА'}
                </span>
            </div>
            <div style="font-size: 20px; margin: 8px 0;">
                S: <span style="color: ${this.keys['s'] ? '#00ff00' : '#ff0000'}; font-weight: bold;">
                    ${this.keys['s'] ? '✅ РАБОТАЕТ' : '❌ НЕ НАЖАТА'}
                </span>
            </div>
            <div style="font-size: 20px; margin: 8px 0;">
                A: <span style="color: ${this.keys['a'] ? '#00ff00' : '#ff0000'}; font-weight: bold;">
                    ${this.keys['a'] ? '✅ РАБОТАЕТ' : '❌ НЕ НАЖАТА'}
                </span>
            </div>
            <div style="font-size: 20px; margin: 8px 0;">
                D: <span style="color: ${this.keys['d'] ? '#00ff00' : '#ff0000'}; font-weight: bold;">
                    ${this.keys['d'] ? '✅ РАБОТАЕТ' : '❌ НЕ НАЖАТА'}
                </span>
            </div>
            <div style="font-size: 20px; margin: 8px 0;">
                SPACE: <span style="color: ${this.keys[' '] ? '#00ff00' : '#ff0000'}; font-weight: bold;">
                    ${this.keys[' '] ? '✅ РАБОТАЕТ' : '❌ НЕ НАЖАТА'}
                </span>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #00ff00;">
                <div style="color: cyan; font-size: 16px;">
                    Активных клавиш: <span style="color: yellow; font-weight: bold;">${pressed.length}</span>
                </div>
                ${pressed.length > 0 ? `
                    <div style="color: yellow; margin-top: 5px;">
                        Нажаты: ${pressed.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    update(ship) {
        if(!ship) return;
        
        // Город
        if(citySystem && citySystem.inCity) {
            ship.speed = 0;
            return;
        }
        
        // ПРЯМОЕ УПРАВЛЕНИЕ
        const acceleration = 1.0;
        const maxSpeed = 150;
        const turnSpeed = 0.03;
        
        let speedChanged = false;
        
        // W - ГАЗ
        if(this.keys['w'] === true) {
            ship.speed += acceleration;
            if(ship.speed > maxSpeed) ship.speed = maxSpeed;
            speedChanged = true;
            console.log('🚀 W нажата! Speed:', ship.speed.toFixed(1));
        }
        
        // S - ТОРМОЗ
        if(this.keys['s'] === true) {
            ship.speed -= acceleration * 1.5;
            if(ship.speed < 0) ship.speed = 0;
            speedChanged = true;
            console.log('🛑 S нажата! Speed:', ship.speed.toFixed(1));
        }
        
        // A - ВЛЕВО
        if(this.keys['a'] === true) {
            ship.mesh.rotation.y += turnSpeed;
            console.log('⬅️ A нажата!');
        }
        
        // D - ВПРАВО
        if(this.keys['d'] === true) {
            ship.mesh.rotation.y -= turnSpeed;
            console.log('➡️ D нажата!');
        }
        
        // SPACE - ТУРБО
        if(this.keys[' '] === true) {
            ship.speed += acceleration * 2;
            if(ship.speed > maxSpeed * 1.5) ship.speed = maxSpeed * 1.5;
            ship.isTurboActive = true;
            speedChanged = true;
            console.log('⚡ TURBO! Speed:', ship.speed.toFixed(1));
        } else {
            ship.isTurboActive = false;
        }
        
        // Естественное торможение
        if(!this.keys['w'] && !this.keys['s'] && !this.keys[' ']) {
            ship.speed *= 0.99;
        }
        
        // ДВИЖЕНИЕ
        const moveSpeed = ship.speed / 60;
        ship.mesh.position.x += Math.sin(ship.mesh.rotation.y) * moveSpeed;
        ship.mesh.position.z += Math.cos(ship.mesh.rotation.y) * moveSpeed;
        ship.mesh.position.y = ship.altitude;
        
        ship.enginePower = ship.speed / maxSpeed;
        
        // Обновляем отладку
        if(this.debugDisplay) {
            const speedInfo = document.createElement('div');
            speedInfo.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 2px solid #00ff00;';
            speedInfo.innerHTML = `
                <div style="color: #ffff00; font-size: 18px; margin: 5px 0;">
                    ⚡ Скорость: <span style="font-weight: bold;">${ship.speed.toFixed(1)}</span> / ${maxSpeed}
                </div>
                <div style="color: #ffff00; font-size: 16px; margin: 5px 0;">
                    📍 Позиция X: ${ship.mesh.position.x.toFixed(1)}
                </div>
                <div style="color: #ffff00; font-size: 16px; margin: 5px 0;">
                    📍 Позиция Z: ${ship.mesh.position.z.toFixed(1)}
                </div>
                <div style="color: ${citySystem?.inCity ? '#ff0000' : '#00ff00'}; font-size: 16px; margin: 5px 0; font-weight: bold;">
                    🏛️ В городе: ${citySystem?.inCity ? 'ДА ⛔' : 'НЕТ ✅'}
                </div>
            `;
            this.debugDisplay.appendChild(speedInfo);
        }
    }
}