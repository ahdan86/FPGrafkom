import * as THREE from "./node_modules/three/src/Three.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { CharacterControls } from "./characterControls.js";

let createPlane = function () {
    const planeSize = 40;
    const loader = new THREE.TextureLoader();
    const texture = loader.load("stone.jpeg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(128, 128);
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
    plane.castShadow = true;
    plane.receiveShadow = true;
    scene.add(plane);
};
let canvas = document.getElementById("myCanvas");

let renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas,
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

/*--------------Physics Engine-----------------*/
let world = new CANNON.World();
world.gravity.set(0,-10,0);
world.broadphase = new CANNON.NaiveBroadphase();
let timestamp = 1.0/60.0;

let rigidPlane = new CANNON.Box(new CANNON.Vec3(20,20,0.1));
let planeBody = new CANNON.Body({shape:rigidPlane, mass:0});
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
planeBody.position.set(0,-0.1,0);
world.addBody(planeBody);

//Physics Test
let rigidPlayer = new CANNON.Box(new CANNON.Vec3(0.01,0.01,0.01));
let rigidBodyPlayer = new CANNON.Body({shape:rigidPlayer, mass:5});
rigidBodyPlayer.position.set(0,5,0);
world.addBody(rigidBodyPlayer);

let bGeo = new THREE.BoxGeometry(1,1,1);
let bMat = new THREE.MeshLambertMaterial({color:0xffffff});
let bMesh = new THREE.Mesh(bGeo, bMat);
scene.add(bMesh);
/*---------------------------------------------*/

/*--------------Controls-----------------*/
let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 15;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();
/*---------------------------------------------*/

/*--------------Main Light & Shadow-------------*/
const color = 0xffffff;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(0,10,0);
light.target.position.set(-5,0,0);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
scene.add(light);
/*-------------------------------------*/

/*--------------Create Plane-------------*/
createPlane();
/*-------------------------------------*/

/*--------------Load Model with Instantiate Character Controls-------------*/
var characterControls;
let model = new THREE.Object3D();
let raycaster;
new GLTFLoader().load("./Soldier.glb", function (gltf) {
    model = gltf.scene;
    model.traverse(function (object) {
        if (object.isMesh){
            object.castShadow = true;
        }
    });
    scene.add(model);
    const gltfAnimations = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map();
    gltfAnimations
        .filter((a) => a.name != "TPose")
        .forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a));
    });
    characterControls = new CharacterControls(model, mixer, animationsMap, controls, camera, "Idle", rigidBodyPlayer);
});
/*-------------------------------------*/

/*--------------Event Control-------------*/
const keysPressed = {};
document.addEventListener("keydown", (event) => {
    // console.log(event);
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
    }
    else {
        keysPressed[event.key.toLowerCase()] = true;
    }
}, false);

document.addEventListener("keyup", (event) => {
    keysPressed[event.key.toLowerCase()] = false;
}, false);
/*----------------------------------------*/

//Main Loop
const clock = new THREE.Clock();
let mainLoop = function () {
    let mixerUpdateDelta = clock.getDelta();
    let data = clock.getElapsedTime()%2;
    world.step(timestamp);
    // bMesh.position.copy(boxBody.position);
    // boxBody.position.copy(model.position);
    model.position.copy(rigidBodyPlayer.position);
    if(data%2<0.1){
        console.log('player',model.position);
        console.log('rigid',rigidBodyPlayer.position);
    }
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};
document.body.appendChild(renderer.domElement);
mainLoop();
