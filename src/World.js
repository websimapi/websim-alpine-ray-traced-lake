import * as THREE from 'three';
import { Terrain } from './components/Terrain.js';
import { WaterSystem } from './components/Water.js';
import { SkySystem } from './components/Sky.js';
import { Trees } from './components/Trees.js';
import { Player } from './components/Player.js';
import { CameraController } from './components/CameraController.js';

export class World {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cameraController = null;
        this.player = null;
        this.raycaster = new THREE.Raycaster();
        this.rayDown = new THREE.Vector3(0, -1, 0);
        
        this.terrain = null;
        this.water = null;
        this.sky = null;
        this.trees = null;
        this.clock = new THREE.Clock();
        this.audioContext = null;
        this.sound = null;
    }

    async init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
        this.camera.position.set(0, 30, 100);

        // Fog
        this.scene.fog = new THREE.FogExp2(0x5ca5c9, 0.0015); // Blue-ish atmospheric fog

        // Components
        this.sky = new SkySystem(this.scene, this.renderer);
        const sunPos = this.sky.updateSky();

        // Lighting
        const sunLight = new THREE.DirectionalLight(0xfffaed, 2.5);
        sunLight.position.copy(sunPos);
        sunLight.castShadow = true;
        
        // Shadow optimization
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        const d = 300;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0001;
        
        this.scene.add(sunLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft ambient
        this.scene.add(ambientLight);

        // Load Async Components
        this.terrain = new Terrain(this.scene);
        await this.terrain.load();
        const terrainMesh = this.terrain.generate();

        this.water = new WaterSystem(this.scene);
        await this.water.load();
        this.water.setSunDirection(sunLight.position);

        this.trees = new Trees(this.scene, terrainMesh);
        this.trees.generate();

        // Player & Camera Setup
        this.player = new Player(this.scene);
        
        // Find safe starting spot (center of map)
        const startY = this.getTerrainHeight(0, 0);
        this.player.position.set(0, startY, 0);

        this.cameraController = new CameraController(this.camera, this.canvas);
        this.cameraController.setTarget(this.player.mesh);

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            this.update();
            this.render();
        });
    }

    getTerrainHeight(x, z) {
        if (!this.terrain || !this.terrain.getMesh()) return 0;
        
        // Raycast down from high up
        this.raycaster.set(new THREE.Vector3(x, 5000, z), this.rayDown);
        const intersects = this.raycaster.intersectObject(this.terrain.getMesh());
        
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        return 0;
    }

    update() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        if (this.water) this.water.update(time);

        if (this.player && this.cameraController) {
            // Get terrain height at player position
            const terrainHeight = this.getTerrainHeight(this.player.position.x, this.player.position.z);
            
            // Get camera yaw to direct player
            const camYaw = this.cameraController.getYaw();
            
            this.player.update(delta, terrainHeight, camYaw);
            this.cameraController.update();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    enableAudio() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            const listener = new THREE.AudioListener();
            this.camera.add(listener);

            const audioLoader = new THREE.AudioLoader();
            this.sound = new THREE.Audio(listener);

            audioLoader.load('ambience.mp3', (buffer) => {
                this.sound.setBuffer(buffer);
                this.sound.setLoop(true);
                this.sound.setVolume(0.5);
                this.sound.play();
            });
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}