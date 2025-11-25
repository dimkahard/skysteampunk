class Ship {
    constructor(scene, type = 'airship') {
        this.scene = scene;
        this.type = type;
        this.mesh = new THREE.Group();
        
        // Физические параметры
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        
        // Характеристики корабля
        this.stats = this.getShipStats(type);
        this.speed = 0;
        this.maxSpeed = this.stats.maxSpeed;
        this.altitude = 200;
        this.health = 100;
        this.steamPressure = 100;
        this.temperature = 85;
        
        // Состояние
        this.isTurboActive = false;
        this.enginePower = 0;
        
        // Эффекты
        this.particles = [];
        this.propellers = [];
        
        // Создание модели
        this.createShip();
        this.createEngineEffects();
        
        // Позиция
        this.mesh.position.set(0, this.altitude, 0);
        this.scene.add(this.mesh);
        
        console.log(`✅ Создан корабль: ${this.stats.name}`);
    }
    
    getShipStats(type) {
        const stats = {
            airship: {
                maxSpeed: 120,
                acceleration: 0.8,
                turnSpeed: 0.025,
                verticalSpeed: 0.5,
                mass: 2000,
                name: 'Дирижабль'
            },
            battleship: {
                maxSpeed: 80,
                acceleration: 0.4,
                turnSpeed: 0.015,
                verticalSpeed: 0.3,
                mass: 5000,
                name: 'Боевой Крейсер'
            },
            scout: {
                maxSpeed: 180,
                acceleration: 1.2,
                turnSpeed: 0.04,
                verticalSpeed: 0.8,
                mass: 800,
                name: 'Разведчик'
            }
        };
        return stats[type] || stats.airship;
    }
    
    createShip() {
        // Очищаем группу перед созданием
        while(this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }
        
        switch(this.type) {
            case 'airship':
                this.createAirship();
                break;
            case 'battleship':
                this.createBattleship();
                break;
            case 'scout':
                this.createScout();
                break;
            default:
                this.createAirship();
        }
    }
    
    // ========================================
    // ДИРИЖАБЛЬ
    // ========================================
    createAirship() {
        const group = new THREE.Group();
        
        // Основной баллон
        const balloonGeometry = new THREE.SphereGeometry(3, 16, 16);
        balloonGeometry.scale(1, 1.2, 3);
        const balloonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,
            shininess: 30
        });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
        balloon.castShadow = true;
        group.add(balloon);
        
        // Медные полосы
        for(let i = 0; i < 5; i++) {
            const ringGeometry = new THREE.TorusGeometry(3, 0.15, 6, 16);
            const ringMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xB87333
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -6 + i * 3;
            ring.scale.y = 1.2;
            group.add(ring);
        }
        
        // Нос
        const noseGeometry = new THREE.ConeGeometry(2.5, 3, 8);
        const noseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = 9;
        nose.castShadow = true;
        group.add(nose);
        
        // Гондола
        const gondolaGeometry = new THREE.BoxGeometry(2, 1.5, 4);
        const gondolaMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x654321
        });
        const gondola = new THREE.Mesh(gondolaGeometry, gondolaMaterial);
        gondola.position.set(0, -3, 0);
        gondola.castShadow = true;
        group.add(gondola);
        
        // Рубка
        const cabinGeometry = new THREE.BoxGeometry(1.8, 1.2, 2);
        const cabinMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, -2.2, 1.5);
        cabin.castShadow = true;
        group.add(cabin);
        
        // Окна
        const windowGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.1);
        const windowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.7,
            emissive: 0x4A90E2,
            emissiveIntensity: 0.3
        });
        
        for(let i = -1; i <= 1; i++) {
            const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
            window1.position.set(i * 0.6, -2.2, 2.45);
            group.add(window1);
        }
        
        // Винты
        this.createPropellers(group, [
            { pos: new THREE.Vector3(-2.5, -3, -2), scale: 1, axis: 'x' },
            { pos: new THREE.Vector3(2.5, -3, -2), scale: 1, axis: 'x' },
            { pos: new THREE.Vector3(0, -3, -4), scale: 1.2, axis: 'z' }
        ]);
        
        // Фонари
        this.createLanterns(group, [
            { pos: new THREE.Vector3(-0.8, -2.2, 2.5), color: 0xFFD700 },
            { pos: new THREE.Vector3(0.8, -2.2, 2.5), color: 0xFFD700 }
        ]);
        
        // Хвост
        const tailGeometry = new THREE.BoxGeometry(4, 2, 0.3);
        const tailMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.5, -8);
        tail.castShadow = true;
        group.add(tail);
        
        const vTailGeometry = new THREE.BoxGeometry(0.3, 3, 2);
        const vTail = new THREE.Mesh(vTailGeometry, tailMaterial);
        vTail.position.set(0, 1.5, -8);
        vTail.castShadow = true;
        group.add(vTail);
        
        this.mesh.add(group);
    }
    
    // ========================================
    // БОЕВОЙ КРЕЙСЕР
    // ========================================
    createBattleship() {
        const group = new THREE.Group();
        
        // Основной корпус
        const hullGeometry = new THREE.BoxGeometry(4, 2.5, 10);
        const hullMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2C2416,
            flatShading: true
        });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.castShadow = true;
        group.add(hull);
        
        // Нос
        const bowGeometry = new THREE.ConeGeometry(2.2, 4, 6);
        const bow = new THREE.Mesh(bowGeometry, hullMaterial);
        bow.rotation.x = -Math.PI / 2;
        bow.position.z = 7;
        bow.castShadow = true;
        group.add(bow);
        
        // Броня
        const armorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4A4A4A,
            flatShading: true
        });
        
        for(let i = 0; i < 3; i++) {
            const armorGeometry = new THREE.BoxGeometry(4.2, 2.7, 3.5);
            const armor = new THREE.Mesh(armorGeometry, armorMaterial);
            armor.position.z = -4 + i * 4;
            armor.castShadow = true;
            group.add(armor);
        }
        
        // Надстройка
        const superGeometry = new THREE.BoxGeometry(3, 3, 5);
        const superMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3E2723
        });
        const superstructure = new THREE.Mesh(superGeometry, superMaterial);
        superstructure.position.set(0, 2.2, 0);
        superstructure.castShadow = true;
        group.add(superstructure);
        
        // Рубка
        const bridgeGeometry = new THREE.BoxGeometry(2.2, 1.8, 2.5);
        const bridgeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        bridge.position.set(0, 4.2, 0.5);
        bridge.castShadow = true;
        group.add(bridge);
        
        // Башни
        const turret1 = this.createTurret();
        turret1.position.set(0, 1.8, 4);
        group.add(turret1);
        
        const turret2 = this.createTurret();
        turret2.position.set(0, 1.8, -4);
        turret2.rotation.y = Math.PI;
        group.add(turret2);
        
        // Двигатели
        const engineGeometry = new THREE.CylinderGeometry(1, 1.2, 3, 8);
        const engineMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        
        for(let i = -1; i <= 1; i += 2) {
            const engine = new THREE.Mesh(engineGeometry, engineMaterial);
            engine.position.set(i * 1.5, 0, -4);
            engine.rotation.x = Math.PI / 2;
            engine.castShadow = true;
            group.add(engine);
        }
        
        // Винты
        this.createPropellers(group, [
            { pos: new THREE.Vector3(-1.5, 0, -6.5), scale: 1.5, axis: 'z' },
            { pos: new THREE.Vector3(1.5, 0, -6.5), scale: 1.5, axis: 'z' },
            { pos: new THREE.Vector3(0, 1.5, 5), scale: 1.2, axis: 'z' }
        ]);
        
        // Трубы
        const chimneyGeometry = new THREE.CylinderGeometry(0.5, 0.6, 4, 8);
        const chimneyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1A1A1A
        });
        
        for(let i = 0; i < 2; i++) {
            const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
            chimney.position.set(i === 0 ? -0.9 : 0.9, 4.5, -1);
            chimney.castShadow = true;
            group.add(chimney);
        }
        
        // Фонари
        this.createLanterns(group, [
            { pos: new THREE.Vector3(-1.5, 1, 6), color: 0xFF4500 },
            { pos: new THREE.Vector3(1.5, 1, 6), color: 0xFF4500 }
        ]);
        
        this.mesh.add(group);
    }
    
    // ========================================
    // РАЗВЕДЧИК
    // ========================================
    createScout() {
        const group = new THREE.Group();
        
        // Фюзеляж
        const fuselageGeometry = new THREE.CylinderGeometry(0.6, 0.8, 7, 8);
        const fuselageMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFF4500,
            shininess: 60
        });
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.castShadow = true;
        group.add(fuselage);
        
        // Нос
        const noseGeometry = new THREE.ConeGeometry(0.6, 2.5, 8);
        const noseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = 4.7;
        nose.castShadow = true;
        group.add(nose);
        
        // Кабина пилота
        const cockpitGeometry = new THREE.SphereGeometry(0.7, 12, 12);
        const cockpitMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.8,
            emissive: 0x4A90E2,
            emissiveIntensity: 0.4
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.7, 2);
        cockpit.scale.set(1, 0.7, 1.2);
        group.add(cockpit);
        
        // Крылья
        const wingGeometry = new THREE.BoxGeometry(10, 0.4, 2);
        const wingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFF4500,
            flatShading: true
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.set(0, 0, 0);
        wings.castShadow = true;
        group.add(wings);
        
        // Окантовка крыльев
        const edgeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        
        for(let i = -1; i <= 1; i += 2) {
            const edgeGeometry = new THREE.BoxGeometry(10.2, 0.5, 0.25);
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edge.position.set(0, 0, i * 1.1);
            group.add(edge);
        }
        
        // Хвост
        const tailGeometry = new THREE.BoxGeometry(2.5, 0.3, 1.2);
        const tail = new THREE.Mesh(tailGeometry, wingMaterial);
        tail.position.set(0, 0, -3.8);
        tail.castShadow = true;
        group.add(tail);
        
        // Вертикальный стабилизатор
        const vTailGeometry = new THREE.BoxGeometry(0.3, 2, 1.5);
        const vTail = new THREE.Mesh(vTailGeometry, wingMaterial);
        vTail.position.set(0, 1, -3.8);
        vTail.castShadow = true;
        group.add(vTail);
        
        // Двигатели на крыльях
        const engineGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1.5, 8);
        const engineMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x654321
        });
        
        for(let i = -1; i <= 1; i += 2) {
            const engine = new THREE.Mesh(engineGeometry, engineMaterial);
            engine.position.set(i * 3, -0.4, 0.5);
            engine.rotation.x = Math.PI / 2;
            engine.castShadow = true;
            group.add(engine);
        }
        
        // Винты на двигателях
        this.createPropellers(group, [
            { pos: new THREE.Vector3(-3, -0.4, 1.3), scale: 1, axis: 'z' },
            { pos: new THREE.Vector3(3, -0.4, 1.3), scale: 1, axis: 'z' },
            { pos: new THREE.Vector3(0, 0, 5.5), scale: 0.7, axis: 'z' }
        ]);
        
        // Фонари на крыльях
        this.createLanterns(group, [
            { pos: new THREE.Vector3(-4.5, 0, 0), color: 0xFF0000 },
            { pos: new THREE.Vector3(4.5, 0, 0), color: 0x00FF00 }
        ]);
        
        this.mesh.add(group);
    }
    
    // ========================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ========================================
    
    createTurret() {
        const turret = new THREE.Group();
        
        const baseGeometry = new THREE.CylinderGeometry(0.9, 1, 0.9, 8);
        const baseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x654321
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        turret.add(base);
        
        const domeGeometry = new THREE.SphereGeometry(0.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeometry, new THREE.MeshPhongMaterial({ 
            color: 0x4A4A4A 
        }));
        dome.position.y = 0.5;
        dome.castShadow = true;
        turret.add(dome);
        
        const barrelGeometry = new THREE.CylinderGeometry(0.18, 0.15, 2.5, 8);
        const barrelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2C2416
        });
        
        for(let i = -1; i <= 1; i += 2) {
            const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            barrel.position.set(i * 0.35, 0.4, 1.2);
            barrel.rotation.x = Math.PI / 2;
            barrel.castShadow = true;
            turret.add(barrel);
        }
        
        return turret;
    }
    
    createPropellers(group, configs) {
        configs.forEach(config => {
            const propellerGroup = new THREE.Group();
            
            // Ступица
            const hubGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8);
            const hubMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x3E2723
            });
            const hub = new THREE.Mesh(hubGeometry, hubMaterial);
            
            if(config.axis === 'z') {
                hub.rotation.x = Math.PI / 2;
            } else if(config.axis === 'x') {
                hub.rotation.z = Math.PI / 2;
            }
            
            propellerGroup.add(hub);
            
            // Лопасти
            const bladeGeometry = new THREE.BoxGeometry(0.15, config.scale * 2.5, 0.4);
            const bladeMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x654321,
                flatShading: true
            });
            
            for(let i = 0; i < 3; i++) {
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                
                if(config.axis === 'z') {
                    blade.position.set(0, 0, 0.15);
                    blade.rotation.z = (i / 3) * Math.PI * 2;
                } else if(config.axis === 'x') {
                    blade.position.set(0.15, 0, 0);
                    blade.rotation.x = (i / 3) * Math.PI * 2;
                }
                
                propellerGroup.add(blade);
            }
            
            propellerGroup.position.copy(config.pos);
            propellerGroup.userData.axis = config.axis || 'z';
            
            group.add(propellerGroup);
            this.propellers.push(propellerGroup);
        });
    }
    
    createLanterns(group, configs) {
        configs.forEach(config => {
            const lanternGeometry = new THREE.SphereGeometry(0.25, 8, 8);
            const lanternMaterial = new THREE.MeshPhongMaterial({ 
                color: config.color,
                emissive: config.color,
                emissiveIntensity: 0.8
            });
            const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
            lantern.position.copy(config.pos);
            
            const light = new THREE.PointLight(config.color, 0.8, 15);
            light.position.copy(config.pos);
            
            group.add(lantern);
            group.add(light);
        });
    }
    
    createEngineEffects() {
        this.steamEmitters = [];
    }
    
    update() {
        // Вращение пропеллеров
        const propellerSpeed = (this.speed / 15) * 0.1;
        this.propellers.forEach(prop => {
            if(prop.userData.axis === 'z') {
                prop.rotation.z += propellerSpeed;
            } else if(prop.userData.axis === 'x') {
                prop.rotation.x += propellerSpeed;
            } else {
                prop.rotation.x += propellerSpeed;
            }
        });
        
        // Снижение пара при турбо
        if(this.isTurboActive) {
            this.steamPressure = Math.max(0, this.steamPressure - 0.5);
        } else {
            this.steamPressure = Math.min(100, this.steamPressure + 0.2);
        }
        
        // Регенерация здоровья
        this.health = Math.min(100, this.health + 0.01);
        
        // Температура
        this.temperature = 85 + (this.speed / this.maxSpeed) * 40;
        
        // Ограничение высоты
        if(this.mesh.position.y < 100) {
            this.mesh.position.y = 100;
        }
        if(this.mesh.position.y > 400) {
            this.mesh.position.y = 400;
        }
        
        this.altitude = this.mesh.position.y;
    }
}