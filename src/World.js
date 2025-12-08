import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Terrain } from './components/Terrain.js';
import { WaterSystem } from './components/Water.js';
import { SkySystem } from './components/Sky.js';
import { Trees } from './components/Trees.js';

export class World {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
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

        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.target.set(0, 10, 0);
        this.controls.enableDamping = true;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 1000;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going under water visually

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

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            this.update();
            this.render();
        });
    }

    update() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        this.controls.update();
        if (this.water) this.water.update(time);
        
        // Simple subtle camera float
        // this.camera.position.y += Math.sin(time * 0.5) * 0.05;
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