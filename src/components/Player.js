import * as THREE from 'three';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 100, 0); 
        this.rotation = 0;

        this.keys = { w: false, a: false, s: false, d: false, space: false };

        this.mesh = this.createStickFigure();
        this.scene.add(this.mesh);

        this.walkSpeed = 15.0;
        this.swimSpeed = 8.0;
        this.animTime = 0;

        this.waterLevel = -2;
        this.heightOffset = 0.2; // Offset to keep feet on ground

        this.initInput();
    }

    initInput() {
        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));
    }

    onKey(e, pressed) {
        const key = e.code.toLowerCase(); 
        // Support both WASD and Arrow keys
        if (key === 'keyw' || key === 'arrowup') this.keys.w = pressed;
        if (key === 'keya' || key === 'arrowleft') this.keys.a = pressed;
        if (key === 'keys' || key === 'arrowdown') this.keys.s = pressed;
        if (key === 'keyd' || key === 'arrowright') this.keys.d = pressed;
        if (key === 'space') this.keys.space = pressed;
    }

    createStickFigure() {
        const group = new THREE.Group();
        group.rotation.order = 'YXZ'; // Important for proper swimming rotation (Yaw then Pitch)
        group.castShadow = true;

        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.5 }); // Stick figure "skin" if needed, keeping it dark/neutral for "stick" look

        // Torso
        this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.0, 4, 8), mat);
        this.torso.position.y = 1.2;
        this.torso.castShadow = true;
        group.add(this.torso);

        // Head
        this.head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat);
        this.head.position.y = 2.0;
        this.head.castShadow = true;
        group.add(this.head);

        // Limbs factory
        const createLimb = (x, y, isLeg) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, 0);
            const geo = new THREE.CapsuleGeometry(0.1, isLeg ? 0.9 : 0.8, 4, 8);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = isLeg ? -0.45 : -0.4;
            mesh.castShadow = true;
            pivot.add(mesh);
            group.add(pivot);
            return pivot;
        };

        this.leftArm = createLimb(-0.4, 1.8, false);
        this.rightArm = createLimb(0.4, 1.8, false);
        this.leftLeg = createLimb(-0.2, 0.8, true);
        this.rightLeg = createLimb(0.2, 0.8, true);

        return group;
    }

    update(dt, getTerrainHeight, cameraAngleY) {
        // Calculate Movement Direction based on Camera Yaw
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

        const moveDir = new THREE.Vector3();
        if (this.keys.w) moveDir.add(forward);
        if (this.keys.s) moveDir.sub(forward);
        if (this.keys.d) moveDir.add(right);
        if (this.keys.a) moveDir.sub(right);

        if (moveDir.length() > 0) moveDir.normalize();

        // Determine potential speed
        // We don't know if we are swimming yet until we check height at new position, 
        // but for velocity calculation let's assume current state or average.
        // Actually, we can just use walk speed for movement calc and damp it if needed.
        // Or check current y.
        const currentIsSwimming = this.position.y < this.waterLevel;
        const speed = currentIsSwimming ? this.swimSpeed : this.walkSpeed;

        // Update Position X/Z
        this.position.x += moveDir.x * speed * dt;
        this.position.z += moveDir.z * speed * dt;

        // Get Terrain Height at NEW position
        const terrainHeight = getTerrainHeight(this.position.x, this.position.z);
        
        // Determine Swimming State based on terrain depth
        // If terrain is significantly below water level, we are in deep water
        const isDeepWater = terrainHeight < (this.waterLevel - 1.5);
        const isSwimming = isDeepWater;

        // Vertical Movement logic
        const isMoving = moveDir.length() > 0.1;

        if (isSwimming) {
            // Swim logic
            // Target is water surface
            let targetY = this.waterLevel - 0.5; 
            
            // Smoothly move Y to water level
            this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, 5 * dt);

            // Swim Rotation (horizontal)
            // If moving, lay flat. If idle, tread water (angle up slightly)
            const swimAngle = isMoving ? Math.PI / 2.2 : Math.PI / 4;
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, swimAngle, 5 * dt);

        } else {
            // Walk logic
            // Snap to terrain immediately to prevent clipping
            this.position.y = terrainHeight + this.heightOffset;

            // Upright
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 10 * dt);
        }

        // Rotation (face movement direction smoothly)
        if (moveDir.length() > 0.1) {
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            let rotDiff = targetRotation - this.rotation;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.rotation += rotDiff * 10 * dt;
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        // Procedural Animation
        this.animateLimbs(dt, isMoving, isSwimming);
    }

    animateLimbs(dt, isMoving, isSwimming) {
        if (isSwimming) {
            // Water Animations
            if (isMoving) {
                // Active Swimming (Breaststroke)
                this.animTime += dt * 8;
                const armPhase = Math.sin(this.animTime);
                
                // Arms sweeping
                this.leftArm.rotation.z = Math.abs(armPhase) * 1.5 - 0.2;
                this.rightArm.rotation.z = -(Math.abs(armPhase) * 1.5 - 0.2);
                this.leftArm.rotation.x = Math.cos(this.animTime) * 1.2;
                this.rightArm.rotation.x = Math.cos(this.animTime) * 1.2;

                // Legs kicking flutter
                this.leftLeg.rotation.x = Math.sin(this.animTime * 1.5) * 0.4;
                this.rightLeg.rotation.x = Math.sin(this.animTime * 1.5 + Math.PI) * 0.4;
            } else {
                // Idle / Treading Water (Floating)
                this.animTime += dt * 3;
                
                // Arms sculling gently
                this.leftArm.rotation.z = 0.5 + Math.sin(this.animTime) * 0.2;
                this.rightArm.rotation.z = -0.5 - Math.sin(this.animTime) * 0.2;
                this.leftArm.rotation.x = 0.2 + Math.cos(this.animTime * 0.8) * 0.2;
                this.rightArm.rotation.x = 0.2 + Math.cos(this.animTime * 0.8 + Math.PI) * 0.2;

                // Legs treading (eggbeater/frog kick slow)
                this.leftLeg.rotation.x = 0.2 + Math.sin(this.animTime) * 0.3;
                this.rightLeg.rotation.x = 0.2 + Math.sin(this.animTime + Math.PI) * 0.3;
                this.leftLeg.rotation.z = 0.2;
                this.rightLeg.rotation.z = -0.2;
            }
        } else if (isMoving) {
            // Walking Animation
            this.animTime += dt * 12;
            
            this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.8;
            this.rightLeg.rotation.x = Math.sin(this.animTime + Math.PI) * 0.8;
            this.leftLeg.rotation.z = 0;
            this.rightLeg.rotation.z = 0;

            this.leftArm.rotation.x = Math.sin(this.animTime + Math.PI) * 0.6;
            this.rightArm.rotation.x = Math.sin(this.animTime) * 0.6;
            this.leftArm.rotation.z = 0.1;
            this.rightArm.rotation.z = -0.1;
        } else {
            // Standing Idle
            const idleSpeed = 2 * dt;
            this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, idleSpeed);
            this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, idleSpeed);
            this.leftLeg.rotation.z = THREE.MathUtils.lerp(this.leftLeg.rotation.z, 0, idleSpeed);
            this.rightLeg.rotation.z = THREE.MathUtils.lerp(this.rightLeg.rotation.z, 0, idleSpeed);
            
            this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, idleSpeed);
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, idleSpeed);
            this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, 0.1, idleSpeed);
            this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, -0.1, idleSpeed);

            // Subtle breathing
            this.torso.scale.x = 1.0 + Math.sin(Date.now() * 0.003) * 0.02;
            this.torso.scale.z = 1.0 + Math.sin(Date.now() * 0.003) * 0.02;
        }
    }

    getForward() {
        return this.rotation;
    }
}