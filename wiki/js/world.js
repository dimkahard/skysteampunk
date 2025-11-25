class World {
    constructor(scene) {
        this.scene = scene;
        this.islands = [];
        this.birds = [];
        this.dandelions = [];
        this.city = null;
        
        this.init();
    }
    
    init() {
        this.createSimpleSky();
        this.createSun();
        this.createCloudFloor();
        this.createMainCity(); // ГОРОД
        this.createFloatingIslands();
        this.createBirds();
        this.createDandelions();
        this.createLighting();
    }
    
    createSimpleSky() {
        const skyGeometry = new THREE.SphereGeometry(3000, 16, 16);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077FF) },
                bottomColor: { value: new THREE.Color(0xFFFFFF) },
                offset: { value: 20 },
                exponent: { value: 0.5 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    createSun() {
        const sunGeometry = new THREE.SphereGeometry(100, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFACD,
            fog: false
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(1500, 800, -1000);
        this.scene.add(sun);
        
        const glowGeometry = new THREE.SphereGeometry(150, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFAA,
            transparent: true,
            opacity: 0.3,
            fog: false
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sun.add(glow);
    }
    
    createCloudFloor() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);
        
        for(let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = 20 + Math.random() * 60;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(230, 230, 250, 0.8)');
            gradient.addColorStop(0.5, 'rgba(200, 200, 230, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        
        const cloudGeometry = new THREE.PlaneGeometry(8000, 8000);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            fog: true
        });
        
        const cloudFloor = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudFloor.rotation.x = -Math.PI / 2;
        cloudFloor.position.y = 0;
        this.scene.add(cloudFloor);
        
        this.cloudFloor = cloudFloor;
    }
    
    // ГЛАВНЫЙ ГОРОД
    createMainCity() {
        const cityGroup = new THREE.Group();
        
        const islandGeometry = new THREE.CylinderGeometry(80, 90, 30, 16);
        const islandMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B7355,
            flatShading: true
        });
        const island = new THREE.Mesh(islandGeometry, islandMaterial);
        island.position.y = -15;
        island.castShadow = true;
        cityGroup.add(island);
        
        const topGeometry = new THREE.CylinderGeometry(85, 80, 5, 16);
        const topMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x6B8E23
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 2.5;
        top.castShadow = true;
        cityGroup.add(top);
        
        const towerGeometry = new THREE.CylinderGeometry(5, 8, 60, 12);
        const towerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xB87333
        });
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.y = 35;
        tower.castShadow = true;
        cityGroup.add(tower);
        
        const beaconGeometry = new THREE.SphereGeometry(3, 12, 12);
        const beaconMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 1
        });
        const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
        beacon.position.y = 68;
        cityGroup.add(beacon);
        
        const beaconLight = new THREE.PointLight(0xFFD700, 3, 200);
        beaconLight.position.y = 68;
        cityGroup.add(beaconLight);
        
        const buildingPositions = [
            { x: -40, z: 0 }, { x: 40, z: 0 },
            { x: -30, z: 30 }, { x: 30, z: 30 },
            { x: -30, z: -30 }, { x: 30, z: -30 },
            { x: 0, z: 45 }, { x: 0, z: -45 }
        ];
        
        buildingPositions.forEach((pos, i) => {
            const buildingHeight = 20 + Math.random() * 25;
            const buildingGeometry = new THREE.BoxGeometry(12, buildingHeight, 12);
            const buildingMaterial = new THREE.MeshPhongMaterial({ 
                color: i % 2 === 0 ? 0x8B4513 : 0x654321
            });
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            building.position.set(pos.x, buildingHeight / 2 + 5, pos.z);
            building.castShadow = true;
            cityGroup.add(building);
            
            const gearGeometry = new THREE.CylinderGeometry(4, 4, 1, 8);
            const gearMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xD4AF37
            });
            const gear = new THREE.Mesh(gearGeometry, gearMaterial);
            gear.position.set(pos.x, buildingHeight + 6, pos.z);
            gear.rotation.x = Math.PI / 2;
            cityGroup.add(gear);
        });
        
        for (let i = 0; i < 4; i++) {
            const dockGeometry = new THREE.BoxGeometry(15, 2, 8);
            const dockMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x8B7355
            });
            const dock = new THREE.Mesh(dockGeometry, dockMaterial);
            const angle = (i / 4) * Math.PI * 2;
            dock.position.set(
                Math.cos(angle) * 70,
                10,
                Math.sin(angle) * 70
            );
            dock.rotation.y = angle;
            dock.castShadow = true;
            cityGroup.add(dock);
        }
        
        cityGroup.position.copy(citySystem.cityPosition);
        
        this.city = cityGroup;
        this.scene.add(cityGroup);
        
        console.log('🏛️ Город создан на позиции:', citySystem.cityPosition);
    }
    
    createFloatingIslands() {
        for(let i = 0; i < 8; i++) {
            const island = this.createFloatingIsland();
            island.position.set(
                Math.random() * 2000 - 1000,
                150 + Math.random() * 150,
                Math.random() * 2000 - 1000
            );
            this.islands.push(island);
            this.scene.add(island);
        }
    }
    
    createFloatingIsland() {
        const island = new THREE.Group();
        
        const rockGeometry = new THREE.SphereGeometry(30, 8, 8);
        const rockMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B7355,
            flatShading: true
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.scale.set(1, 0.6, 1);
        rock.castShadow = true;
        island.add(rock);
        
        const topGeometry = new THREE.CylinderGeometry(25, 30, 10, 8);
        const topMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x6B8E23,
            flatShading: true
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 15;
        top.castShadow = true;
        island.add(top);
        
        for(let i = 0; i < 3; i++) {
            const propGeometry = new THREE.CylinderGeometry(3, 3.5, 8, 6);
            const propMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xB87333,
                emissive: 0x4A90E2,
                emissiveIntensity: 0.3
            });
            const prop = new THREE.Mesh(propGeometry, propMaterial);
            const angle = (i / 3) * Math.PI * 2;
            prop.position.set(
                Math.cos(angle) * 25,
                -10,
                Math.sin(angle) * 25
            );
            island.add(prop);
        }
        
        if(Math.random() > 0.5) {
            const buildingGeometry = new THREE.BoxGeometry(8, 15, 8);
            const buildingMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x8B4513
            });
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            building.position.y = 25;
            building.castShadow = true;
            island.add(building);
            
            const gearGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 8);
            const gearMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xD4AF37
            });
            const gear = new THREE.Mesh(gearGeometry, gearMaterial);
            gear.position.y = 33;
            gear.rotation.x = Math.PI / 2;
            island.add(gear);
        }
        
        island.userData.rotationSpeed = (Math.random() - 0.5) * 0.0003;
        island.userData.bobSpeed = 0.3 + Math.random() * 0.3;
        island.userData.bobAmount = 2 + Math.random() * 2;
        island.userData.initialY = island.position.y;
        
        return island;
    }
    
    createBirds() {
        for(let i = 0; i < 15; i++) {
            const bird = this.createBird();
            bird.position.set(
                Math.random() * 1500 - 750,
                150 + Math.random() * 150,
                Math.random() * 1500 - 750
            );
            this.birds.push(bird);
            this.scene.add(bird);
        }
    }
    
    // Создание одуванчиков
    createDandelions() {
        // Убедимся, что система ресурсов инициализирована
        if (typeof resources !== 'undefined' && resources && resources.createDandelion) {
            for(let i = 0; i < 20; i++) { // Увеличим количество до 20
                const position = new THREE.Vector3(
                    Math.random() * 2000 - 1000, // Расширим область
                    50 + Math.random() * 200,    // Увеличим высоту
                    Math.random() * 2000 - 1000   // Расширим область
                );
                
                const dandelion = resources.createDandelion(position);
                this.dandelions.push(dandelion);
                // Не нужно добавлять в сцену, так как resources.createDandelion уже добавляет
            }
        } else {
            console.warn('⚠️ Система ресурсов не инициализирована');
        }
    }
    
    createBird() {
        const bird = new THREE.Group();
        
        const bodyGeometry = new THREE.SphereGeometry(0.5, 6, 6);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bird.add(body);
        
        const wingGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
        const wingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x654321
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        bird.add(wings);
        
        bird.userData.speed = 0.2 + Math.random() * 0.3;
        bird.userData.direction = Math.random() * Math.PI * 2;
        bird.userData.flapPhase = Math.random() * Math.PI * 2;
        
        return bird;
    }
    
    createLighting() {
        const sunLight = new THREE.DirectionalLight(0xFFFFCC, 1);
        sunLight.position.set(1500, 800, -1000);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -300;
        sunLight.shadow.camera.right = 300;
        sunLight.shadow.camera.top = 300;
        sunLight.shadow.camera.bottom = -300;
        sunLight.shadow.camera.far = 3000;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        this.scene.add(sunLight);
        
        const ambientLight = new THREE.AmbientLight(0xADD8E6, 0.7);
        this.scene.add(ambientLight);
        
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xFFFFFF, 0.3);
        this.scene.add(hemiLight);
    }
    
    update(ship) {
        const time = Date.now() * 0.001;
        
        if(this.cloudFloor && this.cloudFloor.material.map) {
            this.cloudFloor.material.map.offset.x += 0.0001;
            this.cloudFloor.material.map.offset.y += 0.0001;
        }
        
        this.islands.forEach(island => {
            island.rotation.y += island.userData.rotationSpeed;
            island.position.y = island.userData.initialY +
                Math.sin(time * island.userData.bobSpeed) * island.userData.bobAmount;
        });
        
        this.birds.forEach(bird => {
            bird.position.x += Math.cos(bird.userData.direction) * bird.userData.speed;
            bird.position.z += Math.sin(bird.userData.direction) * bird.userData.speed;
            bird.position.y += Math.sin(time * 2 + bird.userData.flapPhase) * 0.2;
            
            if(bird.children[1]) {
                bird.children[1].rotation.z = Math.sin(time * 8 + bird.userData.flapPhase) * 0.4;
            }
            
            bird.rotation.y = bird.userData.direction;
            
            if(Math.random() < 0.005) {
                bird.userData.direction += (Math.random() - 0.5) * 1;
            }
            
            if(ship) {
                const dx = bird.position.x - ship.mesh.position.x;
                const dz = bird.position.z - ship.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if(distance > 1000) {
                    const angle = Math.random() * Math.PI * 2;
                    const newDistance = 300 + Math.random() * 400;
                    bird.position.x = ship.mesh.position.x + Math.cos(angle) * newDistance;
                    bird.position.z = ship.mesh.position.z + Math.sin(angle) * newDistance;
                }
            }
        });
        
        // Обновление одуванчиков
        if(ship) {
            this.islands.forEach(island => {
                const dx = island.position.x - ship.mesh.position.x;
                const dz = island.position.z - ship.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if(distance > 1500) {
                    const angle = Math.random() * Math.PI * 2;
                    const newDistance = 400 + Math.random() * 600;
                    island.position.x = ship.mesh.position.x + Math.cos(angle) * newDistance;
                    island.position.z = ship.mesh.position.z + Math.sin(angle) * newDistance;
                }
            });
            
            // Проверка столкновений с одуванчиками
            this.checkDandelionCollisions(ship);
        }
    }
    
    // Проверка столкновений с одуванчиками
    checkDandelionCollisions(ship) {
        // Проверяем, инициализирована ли система ресурсов
        if (typeof resources === 'undefined' || !resources) return;
        
        const shipPosition = ship.mesh.position;
        
        // Проверяем столкновения с одуванчиками
        for(let i = this.dandelions.length - 1; i >= 0; i--) {
            const dandelion = this.dandelions[i];
            const distance = shipPosition.distanceTo(dandelion.position);
            
            // Если корабль столкнулся с одуванчиком
            if(distance < 8) { // Увеличим радиус столкновения
                // Создаем пушинки
                this.createFluffFromDandelion(dandelion);
                
                // Удаляем одуванчик через систему ресурсов
                if (typeof resources !== 'undefined' && resources && resources.removeDandelion) {
                    // Находим ресурс одуванчика
                    const dandelionResource = resources.resources.find(r => r.object === dandelion);
                    if(dandelionResource) {
                        resources.removeDandelion(dandelionResource, true); // true = восстановить
                    }
                } else {
                    // Резервный способ удаления
                    this.scene.remove(dandelion);
                }
                
                // Удаляем из локального списка
                this.dandelions.splice(i, 1);
            }
        }
    }
    
    // Создание пушинок из одуванчика
    createFluffFromDandelion(dandelion) {
        // Проверяем, инициализирована ли система ресурсов
        if (typeof resources === 'undefined' || !resources) return;
        
        const position = dandelion.position.clone();
        
        // Создаем несколько пушинок
        for(let i = 0; i < 15; i++) {
            const fluffPosition = position.clone();
            fluffPosition.x += (Math.random() - 0.5) * 4;
            fluffPosition.y += Math.random() * 3;
            fluffPosition.z += (Math.random() - 0.5) * 4;
            
            if (typeof resources !== 'undefined' && resources && resources.createFluffResource) {
                resources.createFluffResource(fluffPosition);
            }
        }
    }
}