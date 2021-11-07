import * as THREE from "./node_modules/three/src/Three.js";
export class CharacterControls {
    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction) {
        this.W = "w";
        this.A = "a";
        this.S = "s";
        this.D = "d";
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
        this.fadeDuration = 2;
        this.runVelocity = 5;
        this.walkVelocity = 2;
        this.model = model;
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
        } else if (directionPressed) {
            play = "Walk";
        } else {
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
    }
}
