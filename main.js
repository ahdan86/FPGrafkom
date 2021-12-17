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

let canvas = document.getElementById("myCanvas");
let mainMenuElement = document.getElementById("mainMenu");
let gameOverMenu = document.getElementById("gameOverMenu");
let winMenu = document.getElementById("winMenu");

document.getElementById("start").addEventListener("click", function(e){
    e.preventDefault();
    document.body.appendChild(renderer.domElement);
    mainLoop();
    hideMainMenu();
    canvas.style.display = "block";
    return;
})

document.getElementById("retry").addEventListener("click", function(e){
    e.preventDefault();
    rigidBodyPlayer.position.set(0,2,0);
    model.position.copy(rigidBodyPlayer.position);
    model.position.y = rigidBodyPlayer.position.y - 0.8;
    camera.position.set(5, 5, 0);
    gameOverMenu.classList.remove("d-flex");
    gameOverMenu.classList.add("d-none");
    canvas.style.display = "block";
})

document.getElementById("again").addEventListener("click", function(e){
    e.preventDefault();
    rigidBodyPlayer.position.set(0,2,0);
    model.position.copy(rigidBodyPlayer.position);
    model.position.y = rigidBodyPlayer.position.y - 0.8;
    camera.position.set(5, 5, 0);
    winMenu.classList.remove("d-flex");
    winMenu.classList.add("d-none");
    canvas.style.display = "block";
})

function hideMainMenu(){
    if(mainMenuElement) mainMenuElement.style.display = "none"; 
}

function gameOver(){
    canvas.style.display = "none";
    gameOverMenu.classList.remove("d-none");
    gameOverMenu.classList.add("d-flex");
    gameOverMenu.classList.add("flex-column");
    gameOverMenu.classList.add("justify-content-center");
    localStorage.clear();
}

function win(){
    canvas.style.display = "none";
    winMenu.classList.remove("d-none");
    winMenu.classList.add("d-flex");
    winMenu.classList.add("flex-column");
    winMenu.classList.add("justify-content-center");
    localStorage.clear();
}

let createPlane = function () {
    const planeSize = 400;
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

/*--------------Physics Engine + Plane-----------------*/
let world = new CANNON.World();
world.gravity.set(0,-10,0);
world.broadphase = new CANNON.NaiveBroadphase();
let timestamp = 1.0/60.0;

createPlane();
let rigidPlane = new CANNON.Box(new CANNON.Vec3(200,200,0.1));
let planeBody = new CANNON.Body({shape:rigidPlane, mass:0});
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
planeBody.position.set(0,-0.1,0);
world.addBody(planeBody);

//Physics Test
// let bGeo = new THREE.BoxGeometry(1,1,1);
// let bMat = new THREE.MeshLambertMaterial({color:0xffffff});
// let bMesh = new THREE.Mesh(bGeo, bMat);
// scene.add(bMesh);

// let box = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
// let boxBody = new CANNON.Body({shape:box, mass:0});
// boxBody.position.set(0,0.2,0);
// world.addBody(boxBody);
/*---------------------------------------------*/

/*--------------Controls-----------------*/
let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 200;
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
function createBoundaryWall(x, y, z, posX, posY, posZ){
    let bGeo = new THREE.BoxGeometry(x,y,z);
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./resources/stone.jpeg");
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
    boxBody.collisionResponse = 0;
    world.addBody(boxBody);

    bMesh.position.copy(boxBody.position);
    bMesh.quaternion.copy(boxBody.quaternion);

    return boxBody;
}

//WALL
let wall1 = createBoundaryWall(1,5,40, 7.5, 2.5, 10);
let wall2 = createBoundaryWall(1,5,160, -8, 2.5, 70);
let wall3 = createBoundaryWall(140,5,1, 60.5, 2.5, -10);
let wall4 = createBoundaryWall(20,5,1, 17, 2.5, 30);
let wall5 = createBoundaryWall(41.5,5,1, 27.75, 2.5, 45);
let wall6 = createBoundaryWall(1,5,20, 7.5, 2.5, 55.5);
let wall7 = createBoundaryWall(10,5,1, 12, 2.5, 66);
let wall8 = createBoundaryWall(1,5,28, 48, 2.5, 31.5);
let wall9 = createBoundaryWall(60,5,1, 50, 2.5, 17.5);
let wall10 = createBoundaryWall(1,5,28.5, 80, 2.5, 3.8);
let wall11 = createBoundaryWall(30,5,1, 45, 2.5, 66);
let wall12 = createBoundaryWall(1,5,70, 60, 2.5, 86);
let wall13 = createBoundaryWall(1,5,10, 60, 2.5, 35);
let wall14 = createBoundaryWall(20,5,1, 69.5, 2.5, 40.40);
let wall15 = createBoundaryWall(32,5,1, 75.5, 2.5, 30.60);
let wall16 = createBoundaryWall(32,5,1, 75.5, 2.5, 50.80);
let wall17 = createBoundaryWall(1,5,47, 92.1, 2.5, 27.75);
let wall18 = createBoundaryWall(37.9, 5, 1, 111.1, 2.5, 4.5);
let wall19 = createBoundaryWall(1, 5, 183, 130.8, 2.5, 80);
let wall20 = createBoundaryWall(45,5,1, 29.5, 2.5, 78);
let wall21 = createBoundaryWall(60,5,1, 37.5, 2.5, 4.5);
let wall22 = createBoundaryWall(1,5,70, 7.5, 2.5, 113);
let wall23 = createBoundaryWall(45,5,1, 37, 2.5, 90);
let wall24 = createBoundaryWall(45,5,1, 29.5, 2.5, 105);
let wall25 = createBoundaryWall(45,5,1, 37, 2.5, 120);
let wall26 = createBoundaryWall(37,5,1, 33, 2.5, 135);
let wall27 = createBoundaryWall(90,5,1, 35, 2.5, 148);
let wall28 = createBoundaryWall(1,5,12, 51, 2.5, 141.5);
let wall29 = createBoundaryWall(1,5,100, 80, 2.5, 120);
let wall30 = createBoundaryWall(20,5,1, 70, 2.5, 135);
let wall31 = createBoundaryWall(1,5,70, 95, 2.5, 103);
let wall32 = createBoundaryWall(1,5,50, 107.1, 2.5, 42.75);
let wall33 = createBoundaryWall(24,5,1, 106, 2.5, 67.80);
let wall34 = createBoundaryWall(1,5,35, 117.1, 2.5, 50.75);
let wall35 = createBoundaryWall(15, 5, 1, 123.1, 2.5, 17);
let wall36 = createBoundaryWall(15, 5, 1, 114.5, 2.5, 25);
let wall37 = createBoundaryWall(50,5,1, 105, 2.5, 170);
let wall38 = createBoundaryWall(15, 5, 1, 123.1, 2.5, 148);
let wall39 = createBoundaryWall(1,5,87, 107.1, 2.5, 127);
let wall40 = createBoundaryWall(1,5,65, 115.1, 2.5, 115);
// let wall

//Challenge
function tubePlatform(radius, height, radial){
    let platformGeo = new THREE.CylinderGeometry(radius, radius, height, radial);
    let platformMat = new THREE.MeshBasicMaterial({color:0xfc0f03});
    let platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.castShadow = true;

    scene.add(platformMesh);

    return platformMesh;
}


function createPlatform(width,height,depth){
    let platformGeo = new THREE.BoxGeometry(width,height,depth);
    let platformMat = new THREE.MeshBasicMaterial({color:0xfc0f03});
    let platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.castShadow = true;

    scene.add(platformMesh);

    return platformMesh;
}

function bodyTube(tMesh, radius, height, radial ,posX, posY, posZ){
    let tube = new CANNON.Cylinder(radius, radius, height, radial);
    let tubeBody = new CANNON.Body({shape:tube, mass:0});
    tubeBody.position.set(posX,posY,posZ);

    tubeBody.collisionResponse = 0;
    tubeBody.addEventListener("collide", function(e){ 
        console.log("collided");
        gameOver(); 
    } );

    tMesh.position.copy(tubeBody.position);
    tMesh.quaternion.copy(tubeBody.quaternion);

    world.addBody(tubeBody);

    return tubeBody;
}   

function bodyPlatform(bMesh,x,y,z,posX,posY,posZ){
    let box = new CANNON.Box(new CANNON.Vec3(x/2,y/2,z/2));
    let boxBody = new CANNON.Body({shape:box, mass:0});
    boxBody.position.set(posX,posY,posZ);

    boxBody.collisionResponse = 0; // no impact on other bodys
    boxBody.addEventListener("collide", function(e){ 
        console.log("collided");
        gameOver(); 
    } );
    
    bMesh.position.copy(boxBody.position);
    bMesh.quaternion.copy(boxBody.quaternion);

    world.addBody(boxBody);

    return boxBody;
}

let platform1 = createPlatform(15,1,1);
let platform1Body = bodyPlatform(platform1,15,1,1,0,0,48);

let platform2 = createPlatform(15,1,1);
let platform2Body = bodyPlatform(platform2,15,1,1,0,0,53);

let platform3 = createPlatform(15,1,1);
let platform3Body = bodyPlatform(platform3,15,1,1,0,0,58);

let platform4 = createPlatform(15,1,1);
let platform4Body = bodyPlatform(platform4,15,1,1,0,0,63);

let platform5 = createPlatform(20,4,1);
let platform5Body = bodyPlatform(platform5,20,4,1, 37.5, 2, 30);

let platform6 = createPlatform(1,4,22.3);
let platform6Body = bodyPlatform(platform6,1,4,22.3, 37.5, 2, 30);

let platform7 = createPlatform(1, 1,10.3);
let platform7Body = bodyPlatform(platform7,1,1,10.3, 25.2, 0.5, 10.9);

let platform8 = createPlatform(1, 1,10.3);
let platform8Body = bodyPlatform(platform8,1,1,10.3, 65.2, 0.5, 10.9);

let platform9 = createPlatform(1, 1,10.3);
let platform9Body = bodyPlatform(platform9,1,1,10.3, 25.2, 0.5, -2.7);

let platform10 = createPlatform(1, 1,10.3);
let platform10Body = bodyPlatform(platform10,1,1,10.3, 65.2, 0.5, -2.7);

let platform11 = createPlatform(1, 1,10.3);
let platform11Body = bodyPlatform(platform11, 1, 1,10.3, 25.2, 2.3, 10.9);

let platform12 = createPlatform(1, 1,10.3);
let platform12Body = bodyPlatform(platform12, 1, 1,10.3, 25.2, 2.3, -2.7);

let platform13 = createPlatform(1,4,18.5);
let platform13Body = bodyPlatform(platform13, 1,4,18.5, 48.3, 2, 55.14);

let platform14 = createPlatform(18.5,4,1);
let platform14Body = bodyPlatform(platform14, 18.5,4,1, 48.3, 2, 55.14);

let platform15 = createPlatform(10,1,1);
let platform15Body = bodyPlatform(platform15,10,1,1, 54.2, 0, 39.42);

let platform16 = createPlatform(10,1,1);
let platform16Body = bodyPlatform(platform16,10,1,1, 54.2, 0, 35.42);

let platform17 = createPlatform(10,1,1);
let platform17Body = bodyPlatform(platform17,10,1,1, 54.2, 0, 31.42);

let platform18 = createPlatform(1,1,11);
let platform18Body = bodyPlatform(platform18,1,1,11, 60, 0, 24);

let platform19 = createPlatform(1,1,11);
let platform19Body = bodyPlatform(platform19,1,1,11, 64, 0, 24);

let platform20 = createPlatform(1,1,11);
let platform20Body = bodyPlatform(platform20,1,1,11, 68, 0, 24);

let platform21 = createPlatform(1,1,11);
let platform21Body = bodyPlatform(platform21,1,1,11, 72, 0, 24);

let platform22 = createPlatform(1,1,11);
let platform22Body = bodyPlatform(platform22,1,1,11, 76, 0, 24);

let platform23 = tubePlatform(1, 4, 30);
let platform23Body = bodyTube(platform23, 10, 2, 30, 5.7, 2.2, 79.8);

let platform24 = tubePlatform(1, 4, 30);
let platform24Body = bodyTube(platform24, 10, 2, 30, -6.2, 2.2, 89.8);

let platform25 = tubePlatform(1, 4, 30);
let platform25Body = bodyTube(platform25, 10, 2, 30, 5.7, 2.2, 99.8);

let platform26 = tubePlatform(1, 4, 30);
let platform26Body = bodyTube(platform26, 10, 2, 30, -6.2, 2.2, 109.8);

let platform27 = tubePlatform(1, 4, 30);
let platform27Body = bodyTube(platform27, 10, 2, 30, 5.7, 2.2, 119.8);

let platform28 = tubePlatform(1, 4, 30);
let platform28Body = bodyTube(platform28, 10, 2, 30, -6.2, 2.2, 129.8);

let platform29 = tubePlatform(1, 4, 30);
let platform29Body = bodyTube(platform29, 10, 2, 30, 78.1, 2.2, 79.8);

let platform30 = tubePlatform(1, 4, 30);
let platform30Body = bodyTube(platform30, 10, 2, 30, 61.5, 2.2, 89.8);

let platform31 = tubePlatform(1, 4, 30);
let platform31Body = bodyTube(platform31, 10, 2, 30, 78.1, 2.2, 99.8);

let platform32 = tubePlatform(1, 4, 30);
let platform32Body = bodyTube(platform32, 10, 2, 30, 61.5, 2.2, 109.8);

let platform33 = tubePlatform(1, 4, 30);
let platform33Body = bodyTube(platform33, 10, 2, 30, 78.1, 2.2, 119.8);

let platform34 = createPlatform(1, 4, 10);
let platform34Body = bodyPlatform(platform34, 1, 4, 10, 49, 2, 84);

let platform35 = createPlatform(10, 4, 1);
let platform35Body = bodyPlatform(platform35, 9, 4, 1, 49, 2, 84);

let platform36 = createPlatform(1, 4, 10);
let platform36Body = bodyPlatform(platform36, 1, 4, 10, 19.3, 2, 84);

let platform37 = createPlatform(10, 4, 1);
let platform37Body = bodyPlatform(platform37, 10, 4, 1, 19.3, 2, 84);

let platform38 = createPlatform(12, 4, 1);
let platform38Body = bodyPlatform(platform38, 12, 4, 1, 19.3, 2, 98);

let platform39 = createPlatform(1, 4, 12);
let platform39Body = bodyPlatform(platform39, 1, 4, 12, 19.3, 2, 98);

let platform40 = createPlatform(12, 4, 1);
let platform40Body = bodyPlatform(platform40, 12, 4, 1, 49, 2, 98);

let platform41 = createPlatform(1, 4, 12);
let platform41Body = bodyPlatform(platform41, 1, 4, 12, 49.3, 2, 98);


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
rigidBodyPlayer.position.set(0,2,0);
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

// let debugRenderer = new CannonDebugRenderer(scene,world);

//Main Loop
const clock = new THREE.Clock();

// Challenge1 (depan spawn)
let speed1 = 0.05;
let speed2 = -0.07;
let speed3 = 0.09;
let speed4 = -0.21;

// Challenge 2 Tingkat
let speed7 = 0.15;
let speed8 = -0.15;
let speed9 = 0.15;
let speed10 = -0.15;
let speed11 = 0.2;
let speed12 = 0.2;

// Mirip Challenge1 (tengah)
let speed15 = 0.05;
let speed16 = -0.07;
let speed17 = 0.09;
let speed18 = 0.1;

let speed19 = -0.12;
let speed20 = 0.14;
let speed21 = -0.16;
let speed22 = 0.2; 

//Challenge cylinder bawah sendiri
let speed23 = 0.1;
let speed24 = -0.1;
let speed25 = 0.1;
let speed26 = -0.2;
let speed27 = 0.2;
let speed28 = -0.2;
let mainLoop = function () {
    let mixerUpdateDelta = clock.getDelta();
    let data = clock.getElapsedTime()%2;
    world.step(timestamp);
    // bMesh.position.copy(boxBody.position);
    // bMesh.quaternion.copy(boxBody.quaternion);

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

    if (platform2Body.position.y >= 5 || platform2Body.position.y < -1) speed2 = -speed2;
    platform2Body.position.y +=speed2;
    platform2.position.copy(platform2Body.position);

    if (platform3Body.position.y >= 5 || platform3Body.position.y < -1) speed3 = -speed3;
    platform3Body.position.y +=speed3;
    platform3.position.copy(platform3Body.position);

    if (platform4Body.position.y >= 5 || platform4Body.position.y < -1) speed4 = -speed4;
    platform4Body.position.y +=speed4;
    platform4.position.copy(platform4Body.position);

    platform5.rotation.y += 0.013;
    platform5Body.quaternion.copy(platform5.quaternion);

    platform6.rotation.y += 0.013;
    platform6Body.quaternion.copy(platform6.quaternion);

    if (platform7Body.position.x >= 45.2 || platform7Body.position.x < 25.2) speed7 = -speed7;
    platform7Body.position.x += speed7;
    platform7.position.copy(platform7Body.position);

    if (platform8Body.position.x <= 45.2|| platform8Body.position.x > 65.2) speed8 = -speed8;
    platform8Body.position.x += speed8;
    platform8.position.copy(platform8Body.position);

    if (platform9Body.position.x >= 45.2 || platform9Body.position.x < 25.2) speed9 = -speed9;
    platform9Body.position.x += speed9;
    platform9.position.copy(platform9Body.position);

    if (platform10Body.position.x <= 45.2|| platform10Body.position.x > 65.2) speed10 = -speed10;
    platform10Body.position.x += speed10;
    platform10.position.copy(platform10Body.position);

    if (platform11Body.position.x >= 65.2 || platform11Body.position.x < 25.2) speed11 = -speed11;
    platform11Body.position.x += speed11;
    platform11.position.copy(platform11Body.position);

    if (platform12Body.position.x >= 65.2 || platform12Body.position.x < 25.2) speed12 = -speed12;
    platform12Body.position.x += speed12;
    platform12.position.copy(platform12Body.position);

    if(rigidBodyPlayer.position.y < -2){
        console.log("Game Over");
        rigidBodyPlayer.position.set(0,2,0);
    }

    platform13.rotation.y += 0.02;
    platform13Body.quaternion.copy(platform13.quaternion);

    platform14.rotation.y += 0.02;
    platform14Body.quaternion.copy(platform14.quaternion);

    if (platform15Body.position.y >= 5 || platform15Body.position.y < -1) speed15 = -speed15;
    platform15Body.position.y +=speed15;
    platform15.position.copy(platform15Body.position);

    if (platform16Body.position.y >= 5 || platform16Body.position.y < -1) speed16 = -speed16;
    platform16Body.position.y +=speed16;
    platform16.position.copy(platform16Body.position);

    if (platform17Body.position.y >= 5 || platform17Body.position.y < -1) speed17 = -speed17;
    platform17Body.position.y +=speed17;
    platform17.position.copy(platform17Body.position);

    if(platform18Body.position.y >= 5 || platform18Body.position.y < -1) speed18 = -speed18;
    platform18Body.position.y +=speed18;
    platform18.position.copy(platform18Body.position);

    if(platform19Body.position.y >= 5 || platform19Body.position.y < -1) speed19 = -speed19;
    platform19Body.position.y +=speed19;
    platform19.position.copy(platform19Body.position);

    if(platform20Body.position.y >= 5 || platform20Body.position.y < -1) speed20 = -speed20;
    platform20Body.position.y +=speed20;
    platform20.position.copy(platform20Body.position);

    if(platform21Body.position.y >= 5 || platform21Body.position.y < -1) speed21 = -speed21;
    platform21Body.position.y +=speed21;
    platform21.position.copy(platform21Body.position);

    if(platform22Body.position.y >= 5 || platform22Body.position.y < -1) speed22 = -speed22;
    platform22Body.position.y +=speed22;
    platform22.position.copy(platform22Body.position);


    function moveCylinder(bodyPosition, meshPosition, speed){
        bodyPosition.x +=speed;
        meshPosition.copy(bodyPosition);
    }

    if(platform23Body.position.x <= -6.3 || platform23Body.position.x > 5.8) speed23 = -speed23;
    moveCylinder(platform23Body.position, platform23.position, speed23);

    if(platform24Body.position.x <= -6.3 || platform24Body.position.x > 5.8) speed24 = -speed24;
    moveCylinder(platform24Body.position, platform24.position, speed24);

    if(platform25Body.position.x <= -6.3 || platform25Body.position.x > 5.8) speed25 = -speed25;
    moveCylinder(platform25Body.position, platform25.position, speed25);

    if(platform26Body.position.x <= -6.3 || platform26Body.position.x > 5.8) speed26 = -speed26;
    moveCylinder(platform26Body.position, platform26.position, speed26);

    if(platform27Body.position.x <= -6.3 || platform27Body.position.x > 5.8) speed27 = -speed27;
    moveCylinder(platform27Body.position, platform27.position, speed27);

    if(platform28Body.position.x <= -6.3 || platform28Body.position.x > 5.8) speed28 = -speed28;
    moveCylinder(platform28Body.position, platform28.position, speed28);

    platform34.rotation.y += 0.016;
    platform34Body.quaternion.copy(platform34.quaternion);

    platform35.rotation.y += 0.016;
    platform35Body.quaternion.copy(platform35.quaternion);

    platform36.rotation.y += -0.016;
    platform36Body.quaternion.copy(platform36.quaternion);

    platform37.rotation.y += -0.016;
    platform37Body.quaternion.copy(platform37.quaternion);

    platform38.rotation.y += 0.016;
    platform38Body.quaternion.copy(platform38.quaternion);

    platform39.rotation.y += 0.016;
    platform39Body.quaternion.copy(platform39.quaternion);

    platform40.rotation.y += -0.016;
    platform40Body.quaternion.copy(platform40.quaternion);

    platform41.rotation.y += -0.016;
    platform41Body.quaternion.copy(platform41.quaternion);

    // debugRenderer.update();
    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};
document.body.appendChild(renderer.domElement);
mainLoop();
