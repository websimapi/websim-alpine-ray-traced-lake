import * as THREE from 'three';
import { World } from './World.js';

// Entry point
window.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('canvas');
    const world = new World(canvas);
    
    try {
        await world.init();
        document.getElementById('loading').style.opacity = '0';
        
        // Start loop
        world.start();

        // Audio handling
        const audioBtn = document.getElementById('audio-btn');
        audioBtn.addEventListener('click', () => {
            world.enableAudio();
            audioBtn.style.display = 'none';
        });

    } catch (error) {
        console.error("Failed to initialize world:", error);
        document.getElementById('loading').innerText = "Error loading scene.";
    }
});