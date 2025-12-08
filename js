<<<<<<< SEARCH
                // Arms sculling
                this.armL.root.rotation.x = 0.5; // Forward
                this.armL.root.rotation.z = 0.5 + Math.sin(this.animTime) * 0.3;
                this.armL.joint.rotation.x = -0.5; // Forearms angled

                this.armR.root.rotation.x = 0.5;
                this.armR.root.rotation.z = -0.5 - Math.sin(this.animTime) * 0.3;
                this.armR.joint.rotation.x = -0.5;
=======
                // Arms sculling
                this.armL.root.rotation.x = 0.5; // Forward
                // Tilt left arm slightly away from body
                this.armL.root.rotation.z = -0.5 + Math.sin(this.animTime) * 0.3;
                this.armL.joint.rotation.x = -0.5; // Forearms angled

                this.armR.root.rotation.x = 0.5;
                // Tilt right arm slightly away from body (mirrored)
                this.armR.root.rotation.z = 0.5 - Math.sin(this.animTime) * 0.3;
                this.armR.joint.rotation.x = -0.5;
>>>>>>> REPLACE

<<<<<<< SEARCH
            // Arms (Opposite to legs)
            this.armL.root.rotation.x = Math.cos(this.animTime) * 0.6;
            this.armL.root.rotation.z = 0.1;
            this.armL.joint.rotation.x = -0.4 - Math.sin(this.animTime) * 0.2; // Slight elbow bend

            this.armR.root.rotation.x = Math.cos(this.animTime + Math.PI) * 0.6;
            this.armR.root.rotation.z = -0.1;
            this.armR.joint.rotation.x = -0.4 - Math.sin(this.animTime + Math.PI) * 0.2;
=======
            // Arms (Opposite to legs)
            this.armL.root.rotation.x = Math.cos(this.animTime) * 0.6;
            // Slight outward tilt away from body
            this.armL.root.rotation.z = -0.15;
            this.armL.joint.rotation.x = -0.4 - Math.sin(this.animTime) * 0.2; // Slight elbow bend

            this.armR.root.rotation.x = Math.cos(this.animTime + Math.PI) * 0.6;
            // Slight outward tilt away from body (mirrored)
            this.armR.root.rotation.z = 0.15;
            this.armR.joint.rotation.x = -0.4 - Math.sin(this.animTime + Math.PI) * 0.2;
>>>>>>> REPLACE

<<<<<<< SEARCH
            const s = Math.sin(Date.now() * 0.003);
            this.armL.root.rotation.z = 0.1 + s * 0.02;
            this.armR.root.rotation.z = -0.1 - s * 0.02;
=======
            const s = Math.sin(Date.now() * 0.003);
            // Idle pose: arms angled slightly away from legs
            this.armL.root.rotation.z = -0.15 + s * 0.02;
            this.armR.root.rotation.z = 0.15 - s * 0.02;
>>>>>>> REPLACE

