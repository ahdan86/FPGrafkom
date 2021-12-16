import * as THREE from "./node_modules/three/src/Three.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { CharacterControls } from "./characterControls.js";
// import * as THREE from "../../../three/src/Three.js"
// /**
//  * Adds Three.js primitives into the scene where all the Cannon bodies and shapes are.
//  * @class CannonDebugRenderer
//  * @param {THREE.Scene} scene
//  * @param {CANNON.World} world
//  * @param {object} [options]
//  */
let CannonDebugRenderer = function(scene, world, options){
    options = options || {};

    this.scene = scene;
    this.world = world;

    this._meshes = [];

    this._material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    this._sphereGeometry = new THREE.SphereGeometry(1);
    this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this._planeGeometry = new THREE.PlaneGeometry( 10, 10, 10, 10 );
    this._cylinderGeometry = new THREE.CylinderGeometry( 1, 1, 10, 10 );
};

CannonDebugRenderer.prototype = {

    tmpVec0: new CANNON.Vec3(),
    tmpVec1: new CANNON.Vec3(),
    tmpVec2: new CANNON.Vec3(),
    tmpQuat0: new CANNON.Vec3(),

    update: function(){

        var bodies = this.world.bodies;
        var meshes = this._meshes;
        var shapeWorldPosition = this.tmpVec0;
        var shapeWorldQuaternion = this.tmpQuat0;

        var meshIndex = 0;

        for (var i = 0; i !== bodies.length; i++) {
            var body = bodies[i];

            for (var j = 0; j !== body.shapes.length; j++) {
                var shape = body.shapes[j];

                this._updateMesh(meshIndex, body, shape);

                var mesh = meshes[meshIndex];

                if(mesh){

                    // Get world position
                    body.quaternion.vmult(body.shapeOffsets[j], shapeWorldPosition);
                    body.position.vadd(shapeWorldPosition, shapeWorldPosition);

                    // Get world quaternion
                    body.quaternion.mult(body.shapeOrientations[j], shapeWorldQuaternion);

                    // Copy to meshes
                    mesh.position.copy(shapeWorldPosition);
                    mesh.quaternion.copy(shapeWorldQuaternion);
                }

                meshIndex++;
            }
        }

        for(var i = meshIndex; i < meshes.length; i++){
            var mesh = meshes[i];
            if(mesh){
                this.scene.remove(mesh);
            }
        }

        meshes.length = meshIndex;
    },

    _updateMesh: function(index, body, shape){
        var mesh = this._meshes[index];
        if(!this._typeMatch(mesh, shape)){
            if(mesh){
                this.scene.remove(mesh);
            }
            mesh = this._meshes[index] = this._createMesh(shape);
        }
        this._scaleMesh(mesh, shape);
    },

    _typeMatch: function(mesh, shape){
        if(!mesh){
            return false;
        }
        var geo = mesh.geometry;
        return (
            (geo instanceof THREE.SphereGeometry && shape instanceof CANNON.Sphere) ||
            (geo instanceof THREE.BoxGeometry && shape instanceof CANNON.Box) ||
            (geo instanceof THREE.PlaneGeometry && shape instanceof CANNON.Plane) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.ConvexPolyhedron) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Trimesh) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Heightfield)
        );
    },

    _createMesh: function(shape){
        var mesh;
        var material = this._material;

        switch(shape.type){

        case CANNON.Shape.types.SPHERE:
            mesh = new THREE.Mesh(this._sphereGeometry, material);
            break;

        case CANNON.Shape.types.BOX:
            mesh = new THREE.Mesh(this._boxGeometry, material);
            break;

        case CANNON.Shape.types.PLANE:
            mesh = new THREE.Mesh(this._planeGeometry, material);
            break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            // Create mesh
            var geo = new THREE.Geometry();

            // Add vertices
            for (var i = 0; i < shape.vertices.length; i++) {
                var v = shape.vertices[i];
                geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
            }

            for(var i=0; i < shape.faces.length; i++){
                var face = shape.faces[i];

                // add triangles
                var a = face[0];
                for (var j = 1; j < face.length - 1; j++) {
                    var b = face[j];
                    var c = face[j + 1];
                    geo.faces.push(new THREE.Face3(a, b, c));
                }
            }
            geo.computeBoundingSphere();
            geo.computeFaceNormals();

            mesh = new THREE.Mesh(geo, material);
            shape.geometryId = geo.id;
            break;

        case CANNON.Shape.types.TRIMESH:
            var geometry = new THREE.Geometry();
            var v0 = this.tmpVec0;
            var v1 = this.tmpVec1;
            var v2 = this.tmpVec2;
            for (var i = 0; i < shape.indices.length / 3; i++) {
                shape.getTriangleVertices(i, v0, v1, v2);
                geometry.vertices.push(
                    new THREE.Vector3(v0.x, v0.y, v0.z),
                    new THREE.Vector3(v1.x, v1.y, v1.z),
                    new THREE.Vector3(v2.x, v2.y, v2.z)
                );
                var j = geometry.vertices.length - 3;
                geometry.faces.push(new THREE.Face3(j, j+1, j+2));
            }
            geometry.computeBoundingSphere();
            geometry.computeFaceNormals();
            mesh = new THREE.Mesh(geometry, material);
            shape.geometryId = geometry.id;
            break;

        case CANNON.Shape.types.HEIGHTFIELD:
            var geometry = new THREE.Geometry();

            var v0 = this.tmpVec0;
            var v1 = this.tmpVec1;
            var v2 = this.tmpVec2;
            for (var xi = 0; xi < shape.data.length - 1; xi++) {
                for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
                    for (var k = 0; k < 2; k++) {
                        shape.getConvexTrianglePillar(xi, yi, k===0);
                        v0.copy(shape.pillarConvex.vertices[0]);
                        v1.copy(shape.pillarConvex.vertices[1]);
                        v2.copy(shape.pillarConvex.vertices[2]);
                        v0.vadd(shape.pillarOffset, v0);
                        v1.vadd(shape.pillarOffset, v1);
                        v2.vadd(shape.pillarOffset, v2);
                        geometry.vertices.push(
                            new THREE.Vector3(v0.x, v0.y, v0.z),
                            new THREE.Vector3(v1.x, v1.y, v1.z),
                            new THREE.Vector3(v2.x, v2.y, v2.z)
                        );
                        var i = geometry.vertices.length - 3;
                        geometry.faces.push(new THREE.Face3(i, i+1, i+2));
                    }
                }
            }
            geometry.computeBoundingSphere();
            geometry.computeFaceNormals();
            mesh = new THREE.Mesh(geometry, material);
            shape.geometryId = geometry.id;
            break;
        }

        if(mesh){
            this.scene.add(mesh);
        }

        return mesh;
    },

    _scaleMesh: function(mesh, shape){
        switch(shape.type){

        case CANNON.Shape.types.SPHERE:
            var radius = shape.radius;
            mesh.scale.set(radius, radius, radius);
            break;

        case CANNON.Shape.types.BOX:
            mesh.scale.copy(shape.halfExtents);
            mesh.scale.multiplyScalar(2);
            break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            mesh.scale.set(1,1,1);
            break;

        case CANNON.Shape.types.TRIMESH:
            mesh.scale.copy(shape.scale);
            break;

        case CANNON.Shape.types.HEIGHTFIELD:
            mesh.scale.set(1,1,1);
            break;

        }
    }
};

let createPlane = function () {
    const planeSize = 40;
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./resources/stone.jpeg");
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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;

let scene = new THREE.Scene();
let urls = ["./skybox/px.png", 
            "./skybox/nx.png", 
            "./skybox/py.png", 
            "./skybox/ny.png", 
            "./skybox/pz.png", 
            "./skybox/nz.png"];
let loader = new THREE.CubeTextureLoader();
scene.background = loader.load(urls);


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
let bGeo = new THREE.BoxGeometry(1,1,1);
let bMat = new THREE.MeshLambertMaterial({color:0xffffff});
let bMesh = new THREE.Mesh(bGeo, bMat);
scene.add(bMesh);

let box = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
let boxBody = new CANNON.Body({shape:box, mass:0});
boxBody.position.set(0,0.2,0);
world.addBody(boxBody);
/*---------------------------------------------*/

/*--------------Controls-----------------*/
let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 4;
controls.enablePan = false;
// controls.enableZoom = false;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();
/*---------------------------------------------*/

/*--------------Main Light & Shadow-------------*/
const color = 0xffffff;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(0,10,0);
light.target.position.set(-5,0,2);
light.castShadow = true;
scene.add(light);
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5; 
light.shadow.camera.far = 500;

const helper = new THREE.CameraHelper( light.shadow.camera );
scene.add( helper );
/*-------------------------------------*/

/*--------------Create Object-------------*/
//Wall
function createBoundaryWall(x, y, z, posX, posY, posZ, quatX, quatY, quatZ, quatW){
    let bGeo = new THREE.BoxGeometry(x,y,z);
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./resources/image.png");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    let bMat = new THREE.MeshBasicMaterial({color:0xffffff, map:texture});
    let bMesh = new THREE.Mesh(bGeo, bMat);
    // const repeats = planeSize / 2;
    // texture.repeat.set(repeats, repeats);
    scene.add(bMesh);

    let box = new CANNON.Box(new CANNON.Vec3(x/2,y/2,z/2));
    let boxBody = new CANNON.Body({shape:box, mass:0});
    boxBody.position.set(posX,posY,posZ);
    boxBody.quaternion.set(quatX, quatY, quatZ, quatW);
    world.addBody(boxBody);

    bMesh.position.copy(boxBody.position);
    bMesh.quaternion.copy(boxBody.quaternion);

    return boxBody;
}

//Plane
let wall1 = createBoundaryWall(2,10,40, 21, 0, 0, 0, 0, 0, 1);
let wall2 = createBoundaryWall(2,10,40, -20, 0, 0, 0, 0, 0, 1);
let wall3 = createBoundaryWall(2,10,40, 0, 0, 20, 0, 0.7071, 0, 0.7071);
let wall4 = createBoundaryWall(2,10,40, 0, 0, -20, 0, 0.7071, 0, 0.7071);
createPlane();

//Challenge
let challengeList =[]
function createPlatform(width,height,depth){
    let platformGeo = new THREE.BoxGeometry(width,height,depth);
    let platformMat = new THREE.MeshBasicMaterial({color:0xfc0f03});
    let platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;

    return platformMesh;
}

function bodyPlatform(bMesh,x,y,z,posX,posY,posZ){
    let box = new CANNON.Box(new CANNON.Vec3(x/2,y/2,z/2));
    let boxBody = new CANNON.Body({shape:box, mass:0});
    boxBody.position.set(posX,posY,posZ);

    boxBody.collisionResponse = 0; // no impact on other bodys
    boxBody.addEventListener("collide", function(e){ console.log("collided"); } );
    
    bMesh.position.copy(boxBody.position);
    bMesh.quaternion.copy(boxBody.quaternion);

    return boxBody;
}

let platform1_x = 3;
let platform1_y = 1;
let platform1_z = 0.1;
let pos1_x = 17.45;
let pos1_y = 0;
let pos1_z =9;

let platform1 = createPlatform(platform1_x,platform1_y,platform1_z,pos1_x,pos1_y,pos1_z);
let platform1Body = bodyPlatform(platform1,platform1_x,platform1_y,platform1_z,pos1_x,pos1_y,pos1_z);
// console.log("Position Platform : ", platform1.position);
scene.add(platform1);
world.addBody(platform1Body);
challengeList.push(platform1);

/*-------------------------------------*/

/*--------------Load Model with Instantiate Character Controls-------------*/
var characterControls;
let model = new THREE.Object3D();
var canJump = false;
new GLTFLoader().load("./resources/Soldier.glb", function (gltf) {
    model = gltf.scene;
    model.traverse(function (object) {
        if (object.isMesh){
            object.castShadow = true;
            if (object.material.map) object.material.map.anisotropy = 16;
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

let rigidPlayer = new CANNON.Box(new CANNON.Vec3(0.4,0.8,0.4));
let rigidBodyPlayer = new CANNON.Body({shape:rigidPlayer, mass:5});
rigidBodyPlayer.position.set(15,2,15);
world.addBody(rigidBodyPlayer);

// Jump
var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
var upAxis = new CANNON.Vec3(0, 1, 0);
rigidBodyPlayer.addEventListener("collide", function (e) {
var contact = e.contact;

// contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
// We do not yet know which one is which! Let's check.

if (contact.bi.id == rigidBodyPlayer.id) {
    contact.ni.negate(contactNormal);
} // bi is the player body, flip the contact normal
else {
    contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is
}

// If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
if (contactNormal.dot(upAxis) > 0.5) {
    // Use a "good" threshold value between 0 and 1 here!
    canJump = true;
}
});

/*-------------------------------------*/

/*--------------Event Control-------------*/
var jumpVelocity = 6;
const keysPressed = {};
document.addEventListener("keydown", (event) => {
    // console.log(event);
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
    }
    else if (event.keyCode != 32){
        keysPressed[event.key.toLowerCase()] = true;
    }
    else{
        if (canJump === true) {
            rigidBodyPlayer.velocity.y = jumpVelocity;
        }
        canJump = false;
    }
}, false);

document.addEventListener("keyup", (event) => {
    keysPressed[event.key.toLowerCase()] = false;
}, false);
/*----------------------------------------*/

let debugRenderer = new CannonDebugRenderer(scene,world);

//Main Loop
const clock = new THREE.Clock();
let speed1 = 0.05;
let mainLoop = function () {
    let mixerUpdateDelta = clock.getDelta();
    let data = clock.getElapsedTime()%2;
    world.step(timestamp);
    bMesh.position.copy(boxBody.position);
    bMesh.quaternion.copy(boxBody.quaternion);

    // boxBody.position.copy(model.position);
    model.position.copy(rigidBodyPlayer.position);
    model.position.y = rigidBodyPlayer.position.y - 0.8;


    rigidBodyPlayer.quaternion.copy(model.quaternion);
    // if(data%2<0.1){
    //     console.log('player',model.position);
    //     console.log('rigid',rigidBodyPlayer.position);
    // }
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }

    //Animasi Platform1
    if (platform1Body.position.y >= 5 || platform1Body.position.y < -1) speed1 = -speed1;
    platform1Body.position.y +=speed1;
    platform1.position.copy(platform1Body.position);

    if(rigidBodyPlayer.position.y < -2){
        console.log("Game Over");
        rigidBodyPlayer.position.set(15,2,15);
    }

    debugRenderer.update();
    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};
document.body.appendChild(renderer.domElement);
mainLoop();
