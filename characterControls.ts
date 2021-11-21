import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class CharacterControls {
    W = "w";
    A = "a";
    S = "s";
    D = "d";
    SHIFT = "shift";
    DIRECTIONS = [this.W, this.A, this.S, this.D];

    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    animationsMap: Map<string, THREE.AnimationAction> = new Map();
    orbitControl: OrbitControls;
    camera: THREE.Camera;

    //state
    toggleRun: boolean = true;
    currentAction: string;

    //movement data
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuaternion: THREE.Quaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();

    fadeDuration: number = 2;
    runVelocity = 5;
    walkVelocity = 2;

    constructor(model: THREE.Group, mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>, orbitControl: OrbitControls, camera: THREE.Camera, currentAction: string) {
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

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    public update(delta: number, keysPressed: any) {
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

            current?.fadeOut(this.fadeDuration);
            toPlay?.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }
        this.mixer.update(delta);
        if(this.currentAction == 'Run' || this.currentAction == 'Walk'){
            var angelYCameraDirection = Math.atan2(
                (this.camera.position.x - this.model.position.x),
                (this.camera.position.z - this.model.position.z))

            var directionOffset = this.directionOffset(keysPressed)

            this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, angelYCameraDirection + directionOffset)
            this.model.quaternion.rotateTowards(this.rotateQuaternion, 0.2)

            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.y = 0
            this.walkDirection.normalize()
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            const moveX = this.walkDirection.x * velocity * delta
            const moveZ = this.walkDirection.z * velocity * delta
            this.model.position.x += moveX
            this.model.position.z += moveZ
        }

        private updateCameraTarget(moveX: number, moveZ: number) {
            this.camera.position.x += moveX
            this.camera.position.z += moveZ

            this.cameraTarget.x = this.model.position.x
            this.cameraTarget.y = this.model.position.y + 1
            this.cameraTarget.z = this.model.position.z
            this.orbitControl.target = this.cameraTarget
        }

        private directionOffset(keysPressed: any) {
            var directionOffset = 0
    
            if (keysPressed[W]) {
                if (keysPressed[A]) {
                    directionOffset = Math.PI / 4
                } else if (keysPressed[D]) {
                    directionOffset = - Math.PI / 4
                }
            } else if (keysPressed[S]) {
                if (keysPressed[A]) {
                    directionOffset = Math.PI / 4 + Math.PI / 2
                } else if (keysPressed[D]) {
                    directionOffset = -Math.PI / 4 - Math.PI / 2
                } else {
                    directionOffset = Math.PI
                }
            } else if (keysPressed[A]) {
                directionOffset = Math.PI / 2
            } else if (keysPressed[D]) {
                directionOffset = - Math.PI / 2
            }
    
            return directionOffset
    }
}
