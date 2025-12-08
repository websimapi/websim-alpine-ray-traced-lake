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
        group.rotation.order = 'YXZ'; 
        group.castShadow = true;

        const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
        const jointMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 }); 

        // 1. Container for body parts that can be tilted independently of the root Y-axis rotation
        this.bodyGroup = new THREE.Group();
        group.add(this.bodyGroup);

        // --- Torso ---
        // Slight taper for better shape
        const torsoGeo = new THREE.CapsuleGeometry(0.22, 0.7, 4, 8);
        this.torso = new THREE.Mesh(torsoGeo, mat);
        this.torso.position.y = 1.35;
        this.torso.castShadow = true;
        this.bodyGroup.add(this.torso);

        // --- Head ---
        this.head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), mat);
        this.head.position.y = 1.95;
        this.head.castShadow = true;
        this.bodyGroup.add(this.head);

        // --- Joint/Limb Factory ---
        const createSegment = (length, width = 0.11) => {
            const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(width, length, 4, 8), mat);
            // Center of capsule is (0,0,0), so we move it down by half length to rotate from top
            mesh.position.y = -length / 2; 
            mesh.castShadow = true;
            return mesh;
        };

        const createJoint = (x, y, z) => {
            const joint = new THREE.Group();
            joint.position.set(x, y, z);
            
            // Visual joint sphere
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), jointMat);
            sphere.castShadow = true;
            joint.add(sphere);
            
            return joint;
        };

        // --- Arms ---
        const armWidth = 0.09;
        const upperArmLen = 0.55;
        const lowerArmLen = 0.55;
        const shoulderY = 1.6;
        const shoulderX = 0.45;

        // Left Arm
        this.shoulderL = createJoint(-shoulderX, shoulderY, 0);
        this.upperArmL = createSegment(upperArmLen, armWidth);
        this.shoulderL.add(this.upperArmL);
        
        this.elbowL = createJoint(0, -upperArmLen, 0);
        this.upperArmL.add(this.elbowL); // Attach elbow to end of upper arm mesh? No, grouping is better.
        // Actually, upperArmL mesh is offset y. So (0, -len, 0) relative to shoulder is the elbow spot.
        // We need to structure it: Shoulder -> UpperArmGroup -> Elbow -> LowerArmGroup
        
        // Re-doing factory for hierarchy
        const buildLimb = (origin, upperLen, lowerLen, width) => {
            const root = new THREE.Group();
            root.position.copy(origin);

            const upperMesh = createSegment(upperLen, width);
            root.add(upperMesh);

            const joint = new THREE.Group();
            joint.position.y = -upperLen; // At end of upper
            root.add(joint);

            // Visual elbow/knee
            const jointSphere = new THREE.Mesh(new THREE.SphereGeometry(width * 1.2, 8, 8), jointMat);
            joint.add(jointSphere);

            const lowerMesh = createSegment(lowerLen, width * 0.9);
            joint.add(lowerMesh);
            
            return { root, joint, upperMesh, lowerMesh };
        };

        this.armL = buildLimb(new THREE.Vector3(-shoulderX, shoulderY, 0), upperArmLen, lowerArmLen, armWidth);
        this.armR = buildLimb(new THREE.Vector3(shoulderX, shoulderY, 0), upperArmLen, lowerArmLen, armWidth);
        
        // Slight inward tilt at the shoulder so the bicep connects into the torso more naturally
        this.armL.upperMesh.rotation.z = 0.18;
        this.armR.upperMesh.rotation.z = -0.18;
        
        this.bodyGroup.add(this.armL.root);
        this.bodyGroup.add(this.armR.root);

        // --- Legs ---
        const legWidth = 0.12;
        const upperLegLen = 0.65;
        const lowerLegLen = 0.65;
        const hipY = 1.0;
        const hipX = 0.2;

        this.legL = buildLimb(new THREE.Vector3(-hipX, hipY, 0), upperLegLen, lowerLegLen, legWidth);
        this.legR = buildLimb(new THREE.Vector3(hipX, hipY, 0), upperLegLen, lowerLegLen, legWidth);

        this.bodyGroup.add(this.legL.root);
        this.bodyGroup.add(this.legR.root);

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

        const currentIsSwimming = this.position.y < (this.waterLevel - 0.5);
        const speed = currentIsSwimming ? this.swimSpeed : this.walkSpeed;

        this.position.x += moveDir.x * speed * dt;
        this.position.z += moveDir.z * speed * dt;

        const terrainHeight = getTerrainHeight(this.position.x, this.position.z);
        const isDeepWater = terrainHeight < (this.waterLevel - 1.5);
        const isSwimming = isDeepWater;

        const isMoving = moveDir.length() > 0.1;

        if (isSwimming) {
            // Target is water surface
            let targetY = this.waterLevel - 0.7; // Lower center of mass for swimming
            this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, 5 * dt);

            // Rotate entire body group for swimming
            // 90 degrees forward so body is horizontal
            const targetTilt = isMoving ? Math.PI / 2 : Math.PI / 2.5; 
            this.bodyGroup.rotation.x = THREE.MathUtils.lerp(this.bodyGroup.rotation.x, targetTilt, 5 * dt);

            // Floating bob
            this.bodyGroup.position.y = Math.sin(Date.now() * 0.002) * 0.1;

        } else {
            // Walking
            this.position.y = terrainHeight + this.heightOffset;
            
            // Reset rotation
            this.bodyGroup.rotation.x = THREE.MathUtils.lerp(this.bodyGroup.rotation.x, 0, 10 * dt);
            this.bodyGroup.position.y = 0;
        }

        // Face direction
        if (moveDir.length() > 0.1) {
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            let rotDiff = targetRotation - this.rotation;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.rotation += rotDiff * 10 * dt;
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        this.animateLimbs(dt, isMoving, isSwimming);
    }

    animateLimbs(dt, isMoving, isSwimming) {
        // Reset all joints
        // Helper to reset
        const reset = (limb) => {
            limb.root.rotation.set(0,0,0);
            limb.joint.rotation.set(0,0,0);
        }

        if (isSwimming) {
            if (isMoving) {
                // Freestyle / Flutter kick
                this.animTime += dt * 10;
                
                // Arms: Windmill / Crawl
                // Left Arm
                const armLPhase = this.animTime;
                this.armL.root.rotation.x = Math.sin(armLPhase) * 2.5; // Big swing
                // Tilt slightly away from body
                this.armL.root.rotation.z = -(Math.abs(Math.sin(armLPhase)) * 0.5 + 0.2);
                this.armL.joint.rotation.x = -Math.max(0, Math.cos(armLPhase)) * 1.5; // Bend elbow on return

                // Right Arm (Opposite phase)
                const armRPhase = this.animTime + Math.PI;
                this.armR.root.rotation.x = Math.sin(armRPhase) * 2.5;
                // Tilt slightly away from body (mirrored)
                this.armR.root.rotation.z = (Math.abs(Math.sin(armRPhase)) * 0.5 + 0.2);
                this.armR.joint.rotation.x = -Math.max(0, Math.cos(armRPhase)) * 1.5;

                // Legs: Flutter Kick (Quick, small amplitude)
                const legSpeed = this.animTime * 1.5;
                this.legL.root.rotation.x = Math.sin(legSpeed) * 0.5;
                this.legL.joint.rotation.x = Math.sin(legSpeed - 0.5) * 0.3 + 0.3; // Slight knee bend

                this.legR.root.rotation.x = Math.sin(legSpeed + Math.PI) * 0.5;
                this.legR.joint.rotation.x = Math.sin(legSpeed + Math.PI - 0.5) * 0.3 + 0.3;

            } else {
                // Treading Water (Vertical-ish)
                this.animTime += dt * 3;

                // Arms sculling
                this.armL.root.rotation.x = 0.5; // Forward
                this.armL.root.rotation.z = 0.5 + Math.sin(this.animTime) * 0.3;
                this.armL.joint.rotation.x = -0.5; // Forearms angled

                this.armR.root.rotation.x = 0.5;
                this.armR.root.rotation.z = -0.5 - Math.sin(this.animTime) * 0.3;
                this.armR.joint.rotation.x = -0.5;

                // Legs eggbeater (cycling)
                this.legL.root.rotation.x = Math.sin(this.animTime) * 0.5;
                this.legL.root.rotation.z = Math.cos(this.animTime) * 0.3;
                this.legL.joint.rotation.x = 1.0;

                this.legR.root.rotation.x = Math.sin(this.animTime + Math.PI) * 0.5;
                this.legR.root.rotation.z = Math.cos(this.animTime + Math.PI) * 0.3;
                this.legR.joint.rotation.x = 1.0;
            }
        } else if (isMoving) {
            // Walking
            this.animTime += dt * 10;

            // Arms (Opposite to legs)
            this.armL.root.rotation.x = Math.cos(this.animTime) * 0.6;
            this.armL.root.rotation.z = 0.1;
            this.armL.joint.rotation.x = -0.4 - Math.sin(this.animTime) * 0.2; // Slight elbow bend

            this.armR.root.rotation.x = Math.cos(this.animTime + Math.PI) * 0.6;
            this.armR.root.rotation.z = -0.1;
            this.armR.joint.rotation.x = -0.4 - Math.sin(this.animTime + Math.PI) * 0.2;

            // Legs
            // Hip
            this.legL.root.rotation.x = Math.sin(this.animTime) * 0.8;
            this.legR.root.rotation.x = Math.sin(this.animTime + Math.PI) * 0.8;
            
            // Knee (Only bends back when lifting)
            // If sin > 0 (leg moving forward), knee straight. If sin < 0 (leg moving back/up), knee bend.
            // Actually, in walk cycle:
            // Forward swing: Knee straight
            // Backward push: Knee straight
            // Recovery (passing under): Knee bent
            const kneeL = Math.sin(this.animTime - 1.5); 
            const kneeR = Math.sin(this.animTime + Math.PI - 1.5);
            
            this.legL.joint.rotation.x = kneeL > 0 ? kneeL * 1.5 : 0;
            this.legR.joint.rotation.x = kneeR > 0 ? kneeR * 1.5 : 0;

        } else {
            // Idle
            const s = Math.sin(Date.now() * 0.003);
            this.armL.root.rotation.z = 0.1 + s * 0.02;
            this.armR.root.rotation.z = -0.1 - s * 0.02;
            this.armL.root.rotation.x = 0;
            this.armR.root.rotation.x = 0;
            
            this.legL.root.rotation.set(0,0,0);
            this.legR.root.rotation.set(0,0,0);
            this.legL.joint.rotation.set(0,0,0);
            this.legR.joint.rotation.set(0,0,0);
            
            // Breathing
            this.torso.rotation.x = s * 0.05;
        }
    }

    getForward() {
        return this.rotation;
    }
}