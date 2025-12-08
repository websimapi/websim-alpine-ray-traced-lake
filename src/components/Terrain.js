import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class Terrain {
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.noise2D = createNoise2D();
        this.geometry = null;
        this.material = null;
        this.mesh = null;
        
        // Settings
        this.size = 2000;
        this.segments = 256; // High but manageable
        this.maxHeight = 350;
        this.textureRepeat = 10;
    }

    async load() {
        // Load textures
        const textureLoader = new THREE.TextureLoader();
        
        const [rockTex, grassTex] = await Promise.all([
            new Promise(resolve => textureLoader.load('terrain_rock.png', resolve)),
            new Promise(resolve => textureLoader.load('terrain_grass.png', resolve))
        ]);

        [rockTex, grassTex].forEach(t => {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(this.textureRepeat, this.textureRepeat);
            t.colorSpace = THREE.SRGBColorSpace;
        });

        this.rockTex = rockTex;
        this.grassTex = grassTex;
    }

    generate() {
        this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
        this.geometry.rotateX(-Math.PI / 2);

        const posAttribute = this.geometry.attributes.position;
        const vertex = new THREE.Vector3();

        // Noise configuration
        const scale = 0.002;
        const octaves = 6;
        const persistance = 0.5;
        const lacunarity = 2;

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            let amplitude = 1;
            let frequency = 1;
            let noiseHeight = 0;
            
            // FBM Noise
            for(let o = 0; o < octaves; o++) {
                const n = this.noise2D(vertex.x * scale * frequency, vertex.z * scale * frequency);
                noiseHeight += n * amplitude;
                amplitude *= persistance;
                frequency *= lacunarity;
            }

            // Shape terrain: flatten center for lake, raise edges for mountains
            const distFromCenter = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
            const mask = Math.max(0, (distFromCenter - 200) / (this.size * 0.4)); // 0 in center, 1 at edges
            
            // Apply height
            let y = noiseHeight * this.maxHeight;
            
            // Crater/Lake effect
            y = THREE.MathUtils.lerp(y * 0.2 - 20, y + Math.pow(mask, 2) * 200, mask);

            posAttribute.setY(i, y);
        }

        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();

        // Custom Shader Material setup for texture splatting based on slope/height
        // We hook into MeshStandardMaterial to keep lighting/shadows support
        this.material = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            metalness: 0.1,
            color: 0xffffff
        });

        this.material.onBeforeCompile = (shader) => {
            shader.uniforms.rockTexture = { value: this.rockTex };
            shader.uniforms.grassTexture = { value: this.grassTex };
            shader.uniforms.textureRepeat = { value: this.textureRepeat };

            shader.vertexShader = `
                varying vec3 vPos;
                varying vec3 vNormalWorld;
                ${shader.vertexShader}
            `.replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vNormalWorld = normalize(mat3(modelMatrix) * normal);
                `
            );

            shader.fragmentShader = `
                uniform sampler2D rockTexture;
                uniform sampler2D grassTexture;
                uniform float textureRepeat;
                varying vec3 vPos;
                varying vec3 vNormalWorld;
                ${shader.fragmentShader}
            `.replace(
                '#include <map_fragment>',
                `
                // Triplanar mapping or simple UV mapping
                vec2 uv = vPos.xz / 2000.0 * 20.0; // Scale UVs
                
                vec4 rockColor = texture2D(rockTexture, uv);
                vec4 grassColor = texture2D(grassTexture, uv);

                // Mix based on slope
                float slope = 1.0 - vNormalWorld.y; // 0 = flat, 1 = vertical
                float blend = smoothstep(0.1, 0.4, slope); 
                
                // Mix based on height
                float heightBlend = smoothstep(-10.0, 10.0, vPos.y); // Transition at water levelish
                
                // Logic: Grass on flatish ground above water. Rock on slopes or underwater.
                // Underwater should technically be sand/rock, let's just make it rock for simplicity
                
                // Slope dominant
                vec4 mixedColor = mix(grassColor, rockColor, blend);

                // Height check: if very low (underwater), make it rock/darker
                if(vPos.y < -5.0) {
                   mixedColor = rockColor * 0.6; // Darker underwater
                }

                diffuseColor *= mixedColor;
                `
            );
        };

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        return this.mesh;
    }

    getMesh() {
        return this.mesh;
    }
}