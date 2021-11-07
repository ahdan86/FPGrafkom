import * as THREE from "three/src/Three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

let createPlane = function () {
    const planeSize = 40;
    const loader = new THREE.TextureLoader();
    const texture = loader.load("checker.png");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = Math.PI * -0.5;
    scene.add(plane);
};

let canvas = document.getElementById("myCanvas");
let renderer = new THREE.WebGLRenderer({
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

let scene = new THREE.Scene();
scene.background = new THREE.Color(0x00c5e3);

const fov = 45;
const aspect = window.innerWidth / window.innerHeight; // the canvas default
const near = 0.1;
const far = 1000;
let camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(5, 5, 0);

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 15;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();

const color = 0xffffff;
const intensity = 1;

const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

createPlane();

//Load Model
new GLTFLoader().load("./Soldier.glb", function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object: any) {
        if (object.isMesh) object.castShadow = true;
    });
    scene.add(model);
});

//Key Control
const keysPressed = {};
document.addEventListener(
    "keydown",
    (event) => {
        if (event.shiftKey) {
        } else {
            (keysPressed as any)[event.key.toLowerCase()] = true;
        }
    },
    false
);
document.addEventListener(
    "keyup",
    (event) => {
        (keysPressed as any)[event.key.toLowerCase()] = false;
    },
    false
);

document.body.appendChild(renderer.domElement);

let mainLoop = function () {
    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};
mainLoop();
