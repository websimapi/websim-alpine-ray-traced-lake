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

    update(dt, terrainHeight, cameraAngleY) {
        const isSwimming = this.position.y <= this.waterLevel + 0.5;

        // Calculate Movement Direction based on Camera Yaw
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

        const moveDir = new THREE.Vector3();
        if (this.keys.w) moveDir.add(forward);
        if (this.keys.s) moveDir.sub(forward);
        if (this.keys.d) moveDir.add(right);
        if (this.keys.a) moveDir.sub(right);

        if (moveDir.length() > 0) moveDir.normalize();

        const speed = isSwimming ? this.swimSpeed : this.walkSpeed;

        // Update Position
        this.position.x += moveDir.x * speed * dt;
        this.position.z += moveDir.z * speed * dt;

        // Rotation (face movement direction smoothly)
        if (moveDir.length() > 0.1) {
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            let rotDiff = targetRotation - this.rotation;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.rotation += rotDiff * 10 * dt;
        }

        // Vertical Movement logic
        if (isSwimming) {
            // Swim logic
            let targetY = this.waterLevel - 0.5; // Body mostly submerged
            this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, 2 * dt);

            // Swim Rotation (horizontal)
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, Math.PI / 2.5, 5 * dt);
            this.mesh.position.y = this.position.y;

        } else {
            // Walk logic
            // Snap to terrain
            this.position.y = terrainHeight;

            // Upright
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 10 * dt);
            this.mesh.position.y = this.position.y;
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        // Procedural Animation
        this.animateLimbs(dt, moveDir.length() > 0.1, isSwimming);
    }

    animateLimbs(dt, isMoving, isSwimming) {
        if (isMoving || isSwimming) {
            this.animTime += dt * (isSwimming ? 6 : 12);

            if (isSwimming) {
                 // Swimming Animation (Breaststroke-ish)
                 const armPhase = Math.sin(this.animTime);
                 this.leftArm.rotation.z = Math.abs(armPhase) * 1.5 - 0.5;
                 this.rightArm.rotation.z = -(Math.abs(armPhase) * 1.5 - 0.5);
                 this.leftArm.rotation.x = Math.cos(this.animTime) * 1.0;
                 this.rightArm.rotation.x = Math.cos(this.animTime) * 1.0;

                 // Legs kicking
                 this.leftLeg.rotation.x = Math.sin(this.animTime * 1.5) * 0.5;
                 this.rightLeg.rotation.x = Math.sin(this.animTime * 1.5 + Math.PI) * 0.5;

            } else {
                // Walking Animation
                this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.8;
                this.rightLeg.rotation.x = Math.sin(this.animTime + Math.PI) * 0.8;

                this.leftArm.rotation.x = Math.sin(this.animTime + Math.PI) * 0.6;
                this.rightArm.rotation.x = Math.sin(this.animTime) * 0.6;
                this.leftArm.rotation.z = 0.1;
                this.rightArm.rotation.z = -0.1;
            }
        } else {
            // Idle Pose
            const idleSpeed = 2 * dt;
            this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, idleSpeed);
            this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, idleSpeed);
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