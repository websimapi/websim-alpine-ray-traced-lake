import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

export class WaterSystem {
    constructor(scene) {
        this.scene = scene;
        this.water = null;
    }

    async load() {
        const loader = new THREE.TextureLoader();
        const normalMap = await new Promise(resolve => loader.load('waternormals.png', resolve));

        normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;

        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: normalMap,
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f, // Deep alpine green/blue
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );

        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -2; // Slightly below 0 to avoid Z-fight at shoreline if flat
        this.scene.add(this.water);
    }

    update(time) {
        if (this.water) {
            this.water.material.uniforms['time'].value += 1.0 / 60.0;
        }
    }

    setSunDirection(vector) {
        if (this.water) {
            this.water.material.uniforms['sunDirection'].value.copy(vector).normalize();
        }
    }
}