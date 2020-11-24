// Helper functions
function $(id) {
  return document.getElementById(id);
}

function $c(classid) {
  return document.getElementsByClassName(classid);
}

////////////////////////////////////////////////
// THREE JS RELATED VARIABLES
////////////////////////////////////////////////

var scene,
  camera,
  fieldOfView,
  aspectRatio,
  nearPlane,
  farPlane,
  renderer,
  container,
  controls,
  mouseDown = false,
  clock = new THREE.Clock();

////////////////////////////////////////////////
// SCREEN & MOUSE VARIABLES
////////////////////////////////////////////////

var HEIGHT,
  WIDTH,
  windowHalfX,
  windowHalfY,
  mousePos = {
    x: 0,
    y: 0
  };

////////////////////////////////////////////////
// DOM VARIABLES
////////////////////////////////////////////////

var energyEl, windspeedEl, airDensityEl;

////////////////////////////////////////////////
// 3D MODELS VARIABLES
////////////////////////////////////////////////

var floor,
  rotor_mixer,
  wind_mixer,
  particles = [],
  collidableMeshList = [],
  rotateact,
  mesh,
  skeleton,
  meshes = [],
  CO_OF_FRICTION = 1.80, // equivalent to coefficient of friction
  MAX_ROTOR_SPEED = 45,
  settings,
  totalObjects = 150,
  airDensity = 1.225, // kg/m^3
  particleCoverage = 6.25, // Area of single group of air particles (m^2) with side lenght = 2.5
  particleVelocity = 10; // m/s

////////////////////////////////////////////////
// ENERGY MANAGER
////////////////////////////////////////////////

energy = {
  power: 0,
  updateElectricity: function () {
    energy.power += 0.5 * airDensity * particleCoverage * particleVelocity;
    energyEl.innerHTML = "Energy: " + (energy.power).toFixed(2) + " Watts";
  },
};

////////////////////////////////////////////////
// INIT GUI
////////////////////////////////////////////////

function initGUI() {
  var panel = new dat.GUI({
    width: 500
  });

  var folder = panel.addFolder("Controls");
  settings = {
    "Air Density": airDensity,
    "Particle Velocity": particleVelocity,
  };
  folder
    .add(settings, "Particle Velocity", 0.0, 50.0, 0.5)
    .onChange(modifyParticleVelocity);
  folder.__controllers[0].listen();
  folder
    .add(settings, "Air Density", 0.0, 5.0, 0.5)
    .onChange(modifyAirDensity);
  folder.open();
}

////////////////////////////////////////////////
// INIT THREE JS, MOUSE, SCREEN
////////////////////////////////////////////////

function initCore() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;

  scene = new THREE.Scene();

  fieldOfView = 75;
  aspectRatio = WIDTH / HEIGHT;
  nearPlane = 0.1;
  farPlane = 1000;

  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;

  container = document.getElementById("world");
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", handleWindowResize, false);
  document.addEventListener("mousemove", handleMouseMove, false);
  document.addEventListener("touchmove", handleTouchMove, false);
  document.addEventListener("touchmove", handleTouchMove, false);
  document.addEventListener("mousedown", mouseDownHandler, false);
  document.addEventListener("mouseup", mouseUpHandler, false);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target = new THREE.Vector3(0, 60, 0);
  controls.minPolarAngle = -Math.PI * 0.45;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minDistance = 130;
  controls.maxDistance = 500;
}

////////////////////////////////////////////////
// HANDLE WINDOW EVENTS
////////////////////////////////////////////////

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

////////////////////////////////////////////////
// WIND TURBINE AND WIND CONTROLLER FUNCTIONS
////////////////////////////////////////////////

function moveWindParticles(delta) {
  particles.forEach((particle) => {
    particle.position.z -= (particleVelocity / 1.85) * delta; // Conversion to show real speed in graphics

    var difference = particle.position.z + particle.geometry.vertices[0].z;

    if (difference < -100) {
      particle.position.z += 200;
      particle.userData["hit"] = false; // Reset for collition detection
    }
  });
}

function applyFriction(delta) {
  newTimescale = rotor_mixer.timeScale - (CO_OF_FRICTION * delta);
  
  if (newTimescale < 0) // Stops timeScale for ever being negative because that leads to reverse animations
    rotor_mixer.timeScale = 0;
  else
    rotor_mixer.timeScale = newTimescale;
}

function increaseRotorSpeed(delta) {
  increment_by = Math.sqrt((airDensity * particleCoverage * Math.pow(particleVelocity,3)) / 2000) * 5 * delta;
  
  if (rotor_mixer.timeScale + increment_by < MAX_ROTOR_SPEED) 
    rotor_mixer.timeScale += increment_by;
  else
    rotor_mixer.timeScale = MAX_ROTOR_SPEED;
}

function modifyParticleVelocity(speed) {
  particleVelocity = speed;
  windspeedEl.innerHTML = "Wind Speed: " + (particleVelocity).toFixed(2) + " m/s";
}

function modifyAirDensity(density) {
  airDensity = density;
  airDensityEl.innerHTML = "Air Density: " + (airDensity).toFixed(4) + " kg/m^3";
}

function modifyAirParticleConverage(converage) {
  particleCoverage = converage;
  createWind();
}

////////////////////////////////////////////////
// MOUSE EVENTS HANDLER
////////////////////////////////////////////////

function mouseDownHandler(event) {
  mouseDown = true;
}

function mouseUpHandler(event) {
  mouseDown = false;
}

function handleMouseMove(event) {
  mousePos = {
    x: event.clientX,
    y: event.clientY
  };
}

function handleTouchMove(event) {
  if (event.touches.length == 1) {
    event.preventDefault();
    mousePos = {
      x: event.touches[0].pageX,
      y: event.touches[0].pageY
    };
  }
}

////////////////////////////////////////////////
// RENDER
////////////////////////////////////////////////

function render() {
  if (controls && controls.enabled) controls.update();
  renderer.render(scene, camera);
}

////////////////////////////////////////////////
// LIGHTS
////////////////////////////////////////////////
var shadowLight, backLight;

function createLights() {
  shadowLight = new THREE.DirectionalLight(0xffffff, 1);
  shadowLight.position.set(100, 150, 100);
  shadowLight.castShadow = true;
  shadowLight.shadowDarkness = 0.2;
  shadowLight.shadowMapWidth = shadowLight.shadowMapHeight = 1024;
  scene.add(shadowLight);
}
////////////////////////////////////////////////
// FLOOR
////////////////////////////////////////////////
var Floor = function () {
  var floorCol = Colors.green_d;
  this.mesh = new CustomMesh.PlaneMesh(1600, 1600, 12, floorCol);
  var vertices = this.mesh.geometry.vertices;
  for (var i = 0; i < vertices.length; i++) {
    var v = vertices[i];
    v.x += Math2.rangeRandom(0, 20);
    v.y += Math2.rangeRandom(0, 20);
    v.z += Math2.rangeRandom(0, 20);
  }
  this.mesh.geometry.computeFaceNormals();
  this.mesh.geometry.verticesNeedUpdate = true;
  // this.mesh.geometry.colorsNeedUpdate = true;
  this.mesh.rotation.x = -Math.PI / 2;
};

////////////////////////////////////////////////
// CREATE MODELS
////////////////////////////////////////////////

// Air Particles
function createWind() {
  var particle;

  particles.forEach((p) => {
    scene.remove(p);
  });

  var material = new THREE.PointsMaterial({
    size: particleCoverage / 10.0
  });

  // Create multiple particles and add them to the scene seperatly
  for (i = 0; i < totalObjects; i++) {
    var vertex = new THREE.Vector3();
    var geometry = new THREE.Geometry();

    vertex.x = Math.random() * 25 - 10;
    vertex.y = Math.random() * 10 + 95;
    vertex.z = Math.random() * 500;

    geometry.vertices.push(vertex);
    particle = new THREE.Points(geometry, material);

    scene.add(particle);
    particles.push(particle);
    collidableMeshList.push(particle);
  }

  wind_mixer = new THREE.AnimationMixer(particles);
  wind_mixer.timeScale = 15;
}

// Wind turbine & Animation
function createWG(geometry, materials) {
  var material = new THREE.MeshBasicMaterial(materials);
  material.map = THREE.ImageUtils.loadTexture(
    "./src/img/textures/BrushedMetal.jpg"
  );
  material.side = THREE.DoubleSide;
  material.skinning = true;

  mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.scale.set(15, 15, 15);
  mesh.position.z = 7;
  mesh.position.y = -5;
  mesh.rotation.y = Math.PI / 2;

  meshes.push(mesh);
  scene.add(mesh);
  // collidableMeshList.push(mesh);

  skeleton = new THREE.SkeletonHelper(mesh);
  skeleton.visible = true;
  scene.add(skeleton);

  rotor_mixer = new THREE.AnimationMixer(mesh);
  rotor_mixer.timeScale = 0;

  //approach for r73
  rotateact = new THREE.AnimationAction(geometry.animations[0]);
  rotateact.weight = 5;
  rotor_mixer.addAction(rotateact);
  updateShadows();
}

////////////////////////////////////////////////////////////////////////////////////
//       FLOOR AND TREES CREATED BY Karim Maaloul   https://codepen.io/Yakudoo/
////////////////////////////////////////////////////////////////////////////////////

// FLOOR

function createFloor() {
  floor = new Floor();
  scene.add(floor.mesh);
}

window.addEventListener("load", init, false);

function init(event) {
  energyEl = $("energy");
  windspeedEl = $("windspeed");
  airDensityEl = $("airdensity")

  initCore();
  initGUI();
  createLights();
  createFloor();
  createWind();
  var loader = new THREE.JSONLoader();
  loader.load("./src/obj/WindGenerator.json", createWG);

  windspeedEl.innerHTML = "Wind Speed: " + (particleVelocity).toFixed(2) + " m/s";
  airDensityEl.innerHTML = "Air Density: " + (airDensity).toFixed(4) + " kg/m^3";

  loop();
}

function updateShadows() {
  scene.traverse(function (object) {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

function loop() {
  //main loop
  updateShadows();

  var delta = clock.getDelta();
  if (rotor_mixer) {
    if (rotor_mixer.timeScale > 0) // If turbine is moving
      applyFriction(delta);
    
    rotor_mixer.update(delta);
    skeleton.update();

    moveWindParticles(delta);

    var originPoint = mesh.position.clone();
    
    for (var vertexIndex = 0; vertexIndex < mesh.geometry.vertices.length; vertexIndex++) { // Go through every single verticies
      var localVertex = mesh.geometry.vertices[vertexIndex].clone();
      var globalVertex = localVertex.applyMatrix4(mesh.matrix);
      var directionVector = globalVertex.sub(mesh.position);

      var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
      var collisionResults = ray.intersectObjects(collidableMeshList);
      

      if (collisionResults.length > 0 && collisionResults[0].distance <= directionVector.length()) {
        if (!collisionResults[0].object.userData["hit"]) {
          collisionResults[0].object.userData["hit"] = true;
          energy.updateElectricity();
          increaseRotorSpeed(delta);
        }
      }
    }
  }

  render();
  requestAnimationFrame(loop);
}