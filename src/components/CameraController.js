import * as THREE from 'three';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = null;

        this.distance = 15;
        this.minDistance = 0.1;
        this.maxDistance = 60;

        this.theta = Math.PI; // Yaw
        this.phi = 1.4; // Pitch (High angle default)

        this.isLocked = false;

        this.initInput();
    }

    setTarget(targetMesh) {
        this.target = targetMesh;
    }

    initInput() {
        // Pointer Lock request
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;

            // Mouse Look
            const sensitivity = 0.002;
            this.theta -= e.movementX * sensitivity;
            this.phi -= e.movementY * sensitivity;

            // Clamp Vertical Look
            // Prevent flipping over
            this.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.phi));
        });

        document.addEventListener('wheel', (e) => {
            if (!this.isLocked) return;

            const zoomSpeed = 0.02;
            this.distance += e.deltaY * zoomSpeed;
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        });
    }

    update() {
        if (!this.target) return;

        const isFirstPerson = this.distance < 1.0;

        // Focus on player head/upper body
        const targetPos = this.target.position.clone().add(new THREE.Vector3(0, 1.8, 0));

        if (isFirstPerson) {
            // First Person: Camera is at eye level
            this.camera.position.copy(targetPos);

            // Look direction determined by theta/phi
            const lookX = Math.sin(this.phi) * Math.sin(this.theta);
            const lookY = Math.cos(this.phi);
            const lookZ = Math.sin(this.phi) * Math.cos(this.theta);

            const lookTarget = targetPos.clone().add(new THREE.Vector3(lookX, lookY, lookZ));
            this.camera.lookAt(lookTarget);

            // Hide player model so we don't clip through face
            this.target.visible = false;
        } else {
            // Third Person: Camera orbits player
            this.target.visible = true;

            // Calculate spherical position
            const x = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
            const y = this.distance * Math.cos(this.phi);
            const z = this.distance * Math.sin(this.phi) * Math.cos(this.theta);

            const camPos = targetPos.clone().add(new THREE.Vector3(x, y, z));

            // Collision detection with ground (simple floor check)
            // If camera goes underground, lift it up
            // Ideally we raycast from target to camera, but simple floor check works for now
            // We'll rely on the terrain raycast from World.js if we wanted perfect collision,
            // but for now, just don't let it go too low relative to target base if target is on ground.

            // Just apply position
            this.camera.position.copy(camPos);
            this.camera.lookAt(targetPos);
        }
    }

    getYaw() {
        return this.theta;
    }
}