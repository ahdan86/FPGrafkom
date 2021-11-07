import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
export declare class CharacterControls {
    W: string;
    A: string;
    S: string;
    D: string;
    SHIFT: string;
    DIRECTIONS: string[];
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    animationsMap: Map<string, THREE.AnimationAction>;
    orbitControl: OrbitControls;
    camera: THREE.Camera;
    toggleRun: boolean;
    currentAction: string;
    walkDirection: THREE.Vector3;
    rotateAngle: THREE.Vector3;
    rotateQuaternion: THREE.Quaternion;
    cameraTarget: THREE.Vector3;
    fadeDuration: number;
    runVelocity: number;
    walkVelocity: number;
    constructor(model: THREE.Group, mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>, orbitControl: OrbitControls, camera: THREE.Camera, currentAction: string);
    switchRunToggle(): void;
    update(delta: number, keysPressed: any): void;
}
