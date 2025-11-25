class ResourceSystem {
    constructor(scene) {
        this.scene = scene;
        this.resources = [];
        this.dandelions = []; // Список активных одуванчиков
        this.collectedResources = {
            dandelionFluff: 0
        };
        this.dandelionRespawnQueue = []; // Очередь на восстановление
        
        this.init();
    }
    
    init() {
        console.log('🌱 Система ресурсов инициализирована');
    }
    
    // Создание одуванчика
    createDandelion(position) {
        const dandelion = new THREE.Group();
        
        // Стебель (увеличен)
        const stemGeometry = new THREE.CylinderGeometry(0.2, 0.3, 5, 8);
        const stemMaterial = new THREE.MeshPhongMaterial({
            color: 0x228B22
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 2.5;
        stem.castShadow = true;
        dandelion.add(stem);
        
        // Листья (увеличенные)
        for(let i = 0; i < 4; i++) {
            const leafGeometry = new THREE.SphereGeometry(0.6, 8, 8);
            leafGeometry.scale(1, 0.4, 0.7);
            const leafMaterial = new THREE.MeshPhongMaterial({
                color: 0x32CD32
            });
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.set(
                Math.sin(i * 1.5) * 0.8,
                2 + i * 0.7,
                Math.cos(i * 1.5) * 0.8
            );
            leaf.rotation.z = Math.sin(i * 1.5) * 0.7;
            leaf.castShadow = true;
            dandelion.add(leaf);
        }
        
        // Головка одуванчика (увеличенная)
        const headGeometry = new THREE.SphereGeometry(1.5, 12, 12);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 5.5;
        head.castShadow = true;
        dandelion.add(head);
        
        // Пушинки (увеличенные)
        const fluffGroup = new THREE.Group();
        fluffGroup.name = 'fluff';
        
        for(let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const radius = 1.2 + Math.random() * 0.3;
            const height = 5.5 + (Math.random() - 0.5) * 0.8;
            
            const fluffGeometry = new THREE.SphereGeometry(0.25, 8, 8);
            const fluffMaterial = new THREE.MeshPhongMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.95,
                emissive: 0xFFFFFF,
                emissiveIntensity: 0.1
            });
            const fluff = new THREE.Mesh(fluffGeometry, fluffMaterial);
            fluff.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            fluff.castShadow = true;
            fluffGroup.add(fluff);
        }
        
        dandelion.add(fluffGroup);
        dandelion.position.copy(position);
        
        // Добавляем данные для взаимодействия
        dandelion.userData = {
            type: 'dandelion',
            health: 100,
            fluffCount: 40,
            bobSpeed: 0.5 + Math.random() * 0.5,
            bobAmount: 0.3 + Math.random() * 0.4
        };
        
        this.resources.push({
            type: 'dandelion',
            object: dandelion,
            position: position.clone(),
            initialY: position.y
        });
        
        // Добавляем в список активных одуванчиков
        this.dandelions.push({
            object: dandelion,
            position: position.clone(),
            createdAt: Date.now()
        });
        
        this.scene.add(dandelion);
        return dandelion;
    }
    
    // Создание пушинки как ресурса
    createFluffResource(position) {
        const fluffGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const fluffMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3
        });
        const fluff = new THREE.Mesh(fluffGeometry, fluffMaterial);
        
        fluff.position.copy(position);
        fluff.castShadow = true;
        
        // Анимация пушинки
        fluff.userData = {
            type: 'fluff_resource',
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                Math.random() * 0.5,
                (Math.random() - 0.5) * 0.8
            ),
            rotationSpeed: new THREE.Vector3(
                Math.random() * 0.2,
                Math.random() * 0.2,
                Math.random() * 0.2
            ),
            lifeTime: 8 + Math.random() * 7, // Увеличим время жизни
            createdAt: Date.now()
        };
        
        this.resources.push({
            type: 'fluff_resource',
            object: fluff,
            position: position.clone(),
            isCollectible: true
        });
        
        this.scene.add(fluff);
        return fluff;
    }
    
    // Обновление ресурсов
    update(deltaTime, playerPosition) {
        const time = Date.now() * 0.001;
        
        // Обновление одуванчиков
        for(let i = this.resources.length - 1; i >= 0; i--) {
            const resource = this.resources[i];
            
            switch(resource.type) {
                case 'dandelion':
                    this.updateDandelion(resource, time);
                    break;
                    
                case 'fluff_resource':
                    this.updateFluffResource(resource, deltaTime, playerPosition);
                    break;
            }
        }
        
        // Обновление очереди восстановления
        this.updateRespawnQueue();
    }
    
    // Обновление одуванчика
    updateDandelion(resource, time) {
        const dandelion = resource.object;
        const data = dandelion.userData;
        
        // Покачивание
        dandelion.position.y = resource.position.y +
            Math.sin(time * data.bobSpeed) * data.bobAmount;
        
        // Вращение головы
        if(dandelion.children[5]) { // Голова одуванчика (индекс изменился из-за добавления листа)
            dandelion.children[5].rotation.y = time * 0.5;
        }
        
        // Плавное свечение головы
        if(dandelion.children[5]) {
            const head = dandelion.children[5];
            head.material.emissiveIntensity = 0.1 + Math.sin(time * 2) * 0.1;
        }
        
        // Анимация пушинок
        if(dandelion.children[6]) { // Группа пушинок
            const fluffGroup = dandelion.children[6];
            fluffGroup.rotation.y = time * 0.3;
            
            // Плавающие пушинки
            fluffGroup.children.forEach((fluff, index) => {
                fluff.position.y = 5.5 + Math.sin(time * 2 + index * 0.3) * 0.2;
            });
        }
    }
    
    // Обновление пушинки-ресурса
    updateFluffResource(resource, deltaTime, playerPosition) {
        const fluff = resource.object;
        const data = fluff.userData;
        
        // Если игрок рядом, пушинки притягиваются к нему
        let attracted = false;
        if(playerPosition) {
            const distance = fluff.position.distanceTo(playerPosition);
            if(distance < 15) { // Радиус притяжения увеличен
                // Притяжение к игроку
                const direction = new THREE.Vector3();
                direction.subVectors(playerPosition, fluff.position).normalize();
                fluff.position.add(direction.multiplyScalar(deltaTime * 5)); // Скорость притяжения
                
                // Вращение вокруг игрока
                fluff.position.y += Math.sin(Date.now() * 0.005 + fluff.id) * 0.5 * deltaTime;
                
                attracted = true;
                
                // Если очень близко - собираем
                if(distance < 3) {
                    this.collectFluff(fluff, resource);
                    return;
                }
            }
        }
        
        // Обычное движение, если не притягивается
        if(!attracted) {
            // Движение пушинки
            fluff.position.add(
                data.velocity.clone().multiplyScalar(deltaTime * 10)
            );
            
            // Гравитация
            data.velocity.y -= 0.3 * deltaTime;
        }
        
        // Вращение
        fluff.rotation.x += data.rotationSpeed.x;
        fluff.rotation.y += data.rotationSpeed.y;
        fluff.rotation.z += data.rotationSpeed.z;
        
        // Проверка времени жизни
        if(Date.now() - data.createdAt > data.lifeTime * 1000) {
            this.removeResource(resource);
        }
    }
    
    // Сбор пушинки
    collectFluff(fluff, resource) {
        // Увеличиваем счетчик ресурсов
        this.collectedResources.dandelionFluff++;
        
        // Создаем эффект сбора
        this.createCollectionEffect(fluff.position);
        
        // Удаляем пушинку
        this.removeResource(resource);
        
        // Обновляем UI
        this.updateResourceUI();
        
        console.log(`Пушинка собрана! Всего: ${this.collectedResources.dandelionFluff}`);
    }
    
    // Создание эффекта сбора
    createCollectionEffect(position) {
        // Создаем визуальный эффект
        const effectGeometry = new THREE.SphereGeometry(0.8, 12, 12);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.9
        });
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(position);
        this.scene.add(effect);
        
        // Анимация исчезновения с пульсацией
        let scale = 1;
        let opacity = 0.9;
        const startTime = Date.now();
        const duration = 500; // 0.5 секунды
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Пульсация
            scale = 1 + Math.sin(progress * Math.PI * 4) * 0.5;
            effect.scale.set(scale, scale, scale);
            
            // Исчезновение
            opacity = 0.9 * (1 - progress);
            effect.material.opacity = opacity;
            
            if(progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(effect);
            }
        };
        animate();
        
        // Добавим несколько частиц
        for(let i = 0; i < 5; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            this.scene.add(particle);
            
            // Анимация частицы
            const angle = (i / 5) * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.05;
            let particleTime = 0;
            
            const animateParticle = () => {
                particleTime += 0.016; // ~60 FPS
                particle.position.x += Math.cos(angle) * speed;
                particle.position.z += Math.sin(angle) * speed;
                particle.position.y += 0.02;
                particle.material.opacity -= 0.02;
                
                if(particle.material.opacity > 0 && particleTime < 1) {
                    requestAnimationFrame(animateParticle);
                } else {
                    this.scene.remove(particle);
                }
            };
            animateParticle();
        }
    }
    
    // Удаление ресурса
    removeResource(resource) {
        const index = this.resources.indexOf(resource);
        if(index !== -1) {
            this.scene.remove(resource.object);
            this.resources.splice(index, 1);
        }
    }
    
    // Удаление одуванчика с возможностью восстановления
    removeDandelion(dandelionResource, shouldRespawn = true) {
        // Удаляем из основного списка ресурсов
        const resourceIndex = this.resources.indexOf(dandelionResource);
        if(resourceIndex !== -1) {
            this.scene.remove(dandelionResource.object);
            this.resources.splice(resourceIndex, 1);
        }
        
        // Удаляем из списка активных одуванчиков
        const dandelionIndex = this.dandelions.findIndex(d => d.object === dandelionResource.object);
        if(dandelionIndex !== -1) {
            const dandelionData = this.dandelions.splice(dandelionIndex, 1)[0];
            
            // Добавляем в очередь на восстановление
            if(shouldRespawn) {
                this.dandelionRespawnQueue.push({
                    position: dandelionData.position.clone(),
                    respawnTime: Date.now() + 5000 // Восстановление через 5 секунд
                });
            }
        }
    }
    
    // Обновление очереди восстановления
    updateRespawnQueue() {
        const currentTime = Date.now();
        
        // Проверяем, какие одуванчики нужно восстановить
        for(let i = this.dandelionRespawnQueue.length - 1; i >= 0; i--) {
            const respawnData = this.dandelionRespawnQueue[i];
            
            if(currentTime >= respawnData.respawnTime) {
                // Создаем новый одуванчик
                this.createDandelion(respawnData.position);
                
                // Удаляем из очереди
                this.dandelionRespawnQueue.splice(i, 1);
                
                console.log('🌱 Одуванчик восстановлен');
            }
        }
    }
    
    // Обновление UI ресурсов
    updateResourceUI() {
        // Обновляем отображение в интерфейсе
        const fluffCount = document.getElementById('fluff-count');
        if(fluffCount) {
            const currentCount = parseInt(fluffCount.textContent) || 0;
            const newCount = this.collectedResources.dandelionFluff;
            
            fluffCount.textContent = newCount;
            
            // Анимация увеличения
            if(newCount > currentCount) {
                fluffCount.classList.add('collect-animation');
                
                setTimeout(() => {
                    fluffCount.classList.remove('collect-animation');
                }, 300);
            }
        }
    }
    
    // Получение количества собранного ресурса
    getFluffCount() {
        return this.collectedResources.dandelionFluff;
    }
    
    // Сброс ресурсов
    reset() {
        this.resources.forEach(resource => {
            this.scene.remove(resource.object);
        });
        this.resources = [];
        this.collectedResources.dandelionFluff = 0;
        this.updateResourceUI();
    }
}

// Глобальный экземпляр
let resourceSystem = null;

// Функция инициализации системы ресурсов
function initResourceSystem(scene) {
    if (!resourceSystem) {
        resourceSystem = new ResourceSystem(scene);
    }
    return resourceSystem;
}