import * as THREE from 'three';

export const loadTexture = (path) => {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            path,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                resolve(texture);
            },
            undefined,
            (err) => reject(err)
        );
    });
};

// Simple pseudo-random for procedural generation consistency if needed
export const random = (seed) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

