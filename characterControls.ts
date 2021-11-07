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
    }
}
