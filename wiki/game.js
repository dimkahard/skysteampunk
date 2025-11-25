// Базовая настройка
let scene, camera, renderer, plane;
let speed = 0;
let maxSpeed = 200;
let altitude = 100;
let keys = {};

// Инициализация
function init() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Небо
    scene.fog = new THREE.Fog(0x87CEEB, 1, 3000);

    // Камера
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(0, 5, -15);
    camera.lookAt(0, 0, 0);

    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Создание самолета
    createPlane();

    // Создание земли
    createGround();

    // Создание облаков
    createClouds();

    // События
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Запуск игры
    animate();
}

// Создание самолета
function createPlane() {
    const planeGroup = new THREE.Group();

    // Корпус
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 5);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    planeGroup.add(body);

    // Крылья
    const wingGeometry = new THREE.BoxGeometry(12, 0.3, 2);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = -0.3;
    wings.castShadow = true;
    planeGroup.add(wings);

    // Хвост
    const tailGeometry = new THREE.BoxGeometry(3, 2, 0.3);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(0, 1, -2.5);
    tail.castShadow = true;
    planeGroup.add(tail);

    // Пропеллер
    const propGeometry = new THREE.BoxGeometry(0.2, 3, 0.3);
    const propMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const propeller = new THREE.Mesh(propGeometry, propMaterial);
    propeller.position.z = 2.6;
    propeller.name = 'propeller';
    planeGroup.add(propeller);

    planeGroup.position.y = altitude;
    plane = planeGroup;
    scene.add(planeGroup);
}

// Создание земли
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(10000, 10000, 100, 100);
    
    // Создание текстуры земли с высотами
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.random() * 10; // Случайные высоты
    }
    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x228B22,
        flatShading: true
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Создание облаков
function createClouds() {
    for (let i = 0; i < 50; i++) {
        const cloudGeometry = new THREE.SphereGeometry(
            Math.random() * 30 + 20,
            8,
            8
        );
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        cloud.position.set(
            Math.random() * 2000 - 1000,
            Math.random() * 200 + 100,
            Math.random() * 2000 - 1000
        );
        
        scene.add(cloud);
    }
}

// Обработка управления
function handleControls() {
    const acceleration = 0.5;
    const turnSpeed = 0.02;
    const pitchSpeed = 0.01;

    // Ускорение/торможение
    if (keys['w']) speed = Math.min(speed + acceleration, maxSpeed);
    if (keys['s']) speed = Math.max(speed - acceleration, 0);

    // Повороты
    if (keys['arrowleft']) plane.rotation.y += turnSpeed;
    if (keys['arrowright']) plane.rotation.y -= turnSpeed;
    
    // Тангаж (вверх/вниз)
    if (keys['arrowup']) plane.rotation.x = Math.min(plane.rotation.x + pitchSpeed, Math.PI / 6);
    if (keys['arrowdown']) plane.rotation.x = Math.max(plane.rotation.x - pitchSpeed, -Math.PI / 6);

    // Крен
    if (keys['a']) plane.rotation.z = Math.min(plane.rotation.z + pitchSpeed, Math.PI / 6);
    if (keys['d']) plane.rotation.z = Math.max(plane.rotation.z - pitchSpeed, -Math.PI / 6);

    // Автовыравнивание крена
    if (!keys['a'] && !keys['d']) {
        plane.rotation.z *= 0.95;
    }

    // Движение вперед
    const moveSpeed = speed / 20;
    plane.position.x += Math.sin(plane.rotation.y) * moveSpeed;
    plane.position.z += Math.cos(plane.rotation.y) * moveSpeed;
    
    // Изменение высоты
    altitude += Math.sin(plane.rotation.x) * moveSpeed;
    altitude = Math.max(5, Math.min(altitude, 500)); // Ограничения высоты
    plane.position.y = altitude;

    // Вращение пропеллера
    const propeller = plane.getObjectByName('propeller');
    if (propeller) {
        propeller.rotation.z += speed / 10;
    }

    // Обновление UI
    document.getElementById('speed').textContent = Math.round(speed);
    document.getElementById('altitude').textContent = Math.round(altitude);
}

// Анимация
function animate() {
    requestAnimationFrame(animate);

    handleControls();

    // Камера следует за самолетом
    const cameraOffset = new THREE.Vector3(0, 5, -15);
    cameraOffset.applyQuaternion(plane.quaternion);
    camera.position.copy(plane.position).add(cameraOffset);
    camera.lookAt(plane.position);

    renderer.render(scene, camera);
}

// Изменение размера окна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Запуск
init();