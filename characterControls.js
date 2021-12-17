import * as THREE from "./node_modules/three/src/Three.js";
export class CharacterControls {
    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction, rigidBody) {
        this.W = "w";
        this.A = "a";
        this.S = "s";
        this.D = "d";
        this.space = " ";
        this.SHIFT = "shift";
        this.DIRECTIONS = [this.W, this.A, this.S, this.D];
        this.animationsMap = new Map();
        //state
        this.toggleRun = true;
        //movement data
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuaternion = new THREE.Quaternion();
        this.cameraTarget = new THREE.Vector3();
        this.fadeDuration = 0.1;
        this.runVelocity = 8;
        this.walkVelocity = 4;
        this.model = model;
        this.rigidBody = rigidBody;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
        this.orbitControl = orbitControl;
        this.camera = camera;
    }
    switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }
    update(delta, keysPressed) {
        const directionPressed = this.DIRECTIONS.some((key) => keysPressed[key] == true);
        var play = "";
        if (directionPressed && this.toggleRun) {
            play = "Run";
        }
        else if (directionPressed) {
            play = "Walk";
        }
        else {
            play = "Idle";
        }
        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);
            current === null || current === void 0 ? void 0 : current.fadeOut(this.fadeDuration);
            toPlay === null || toPlay === void 0 ? void 0 : toPlay.reset().fadeIn(this.fadeDuration).play();
            this.currentAction = play;
        }
        this.mixer.update(delta);
        if (this.currentAction == 'Run' || this.currentAction == 'Walk') {
            var angelYCameraDirection = Math.atan2((this.camera.position.x - this.model.position.x), (this.camera.position.z - this.model.position.z));
            var directionOffset = this.directionOffset(keysPressed);
            this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, angelYCameraDirection + directionOffset);
            this.model.quaternion.rotateTowards(this.rotateQuaternion, 0.2);
            this.camera.getWorldDirection(this.walkDirection);
            // this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);
            const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity;
            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;
            this.rigidBody.position.x += moveX;
            this.rigidBody.position.z += moveZ;
            // this.model.position.copy(this.rigidBody.position);
            this.updateCameraTarget(moveX, moveZ);
            console.log("pos : ", this.rigidBody.position);
        }
        // const moveY = 15 * delta;
        // if(keysPressed[this.space]){
        //     console.log("masuk");
        //     console.log(moveY);
        //     this.model.position.y += moveY;
        //     this.rigidBody.position.y += moveY;
        // }
    }
    updateCameraTarget(moveX, moveZ) {
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }
    directionOffset(keysPressed) {
        var directionOffset = 0;
        if (keysPressed[this.W]) {
            if (keysPressed[this.A]) {
                directionOffset = Math.PI / 4;
            }
            else if (keysPressed[this.D]) {
                directionOffset = -Math.PI / 4;
            }
        }
        else if (keysPressed[this.S]) {
            if (keysPressed[this.A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2;
            }
            else if (keysPressed[this.D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2;
            }
            else {
                directionOffset = Math.PI;
            }
        }
        else if (keysPressed[this.A]) {
            directionOffset = Math.PI / 2;
        }
        else if (keysPressed[this.D]) {
            directionOffset = -Math.PI / 2;
        }
        return directionOffset;
    }
}
