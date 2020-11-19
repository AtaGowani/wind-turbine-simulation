//Help functions
function $(id) {
  return document.getElementById(id);
}

function $c(classid) {
  return document.getElementsByClassName(classid);
}

function switchVisibility(arr, num, visibility) {
  if (num > 0) {
    for (var i = 0; i < num; i++) {
      arr[i][0].style.visibility = visibility;
    }
  } else if (num < 0) {
    for (var i = arr.length - 1; num < 0; num++, i--) {
      arr[i][0].style.visibility = visibility;
    }
  }
}

////////////////////////////////////////////////
//                  THREE JS RELATED VARIABLES
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
//                      SCREEN & MOUSE VARIABLES
////////////////////////////////////////////////

var HEIGHT,
  WIDTH,
  windowHalfX,
  windowHalfY,
  mousePos = {
    x: 0,
    y: 0
  },
  oldMousePos = {
    x: 0,
    y: 0
  };

////////////////////////////////////////////////
//                          DOM VARIABLES
////////////////////////////////////////////////

var energyEl, electroEl, errEl, windspeedEl, winddirEl;

////////////////////////////////////////////////
//                           3D MODELS VARIABLES
////////////////////////////////////////////////

var floor,
  rotor_mixer,
  wind_mixer,
  particles = [],
  // RESISTANCE_FORCE =
  collidableMeshList = [],
  rotateact,
  mesh,
  skeleton,
  meshes = [],
  SPEED = 5,
  settings,
  classes,
  totalObjects = 100,
  airDensity = 1.225, // kg/m^3
  particleCoverage = 15.2, // Area of single air particle (m^2)
  particleVelocity = 5; // m/s

////////////////////////////////////////////////
//                           ENERGY MANAGER
////////////////////////////////////////////////

energy = {
  power: 0,
  updateElectricity: function () {
    console.log("UPDATING ELECTRICITY");
    energy.power += 0.5 * airDensity * particleVelocity;
    energyEl.innerHTML =
      "Energy: " + (energy.power).toFixed(2);
  },
};

////////////////////////////////////////////////
//                                   STATS & GUI
////////////////////////////////////////////////

var stats;
var parameters = {
  truncHeight: 100,
  truncThickness: 4,
  truncColor: Colors.grey_d,
  truncNoise: 0.5,
  foliageColor: "pinks",
  foliageDensity: 5,
  foliageNoise: 0.05,
  foliageSize: 10,
  animationSpeed: 2.5,
};

function initGUI() {
  var panel = new dat.GUI({
    width: 310
  });

  var folder = panel.addFolder("Controls");
  settings = {
    "Air Density": airDensity,
    "Air Particle Coverage": particleCoverage,
    "Particle Velocity": particleVelocity,
  };
  folder
    .add(settings, "Particle Velocity", 0.0, 100.0)
    .onChange(modifyParticleVelocity);
  folder.__controllers[0].listen();
  folder.add(settings, "Air Density", 0.0, 5.0).onChange(modifyAirDensity);
  folder
    .add(settings, "Air Particle Coverage", 0.0, 200.0)
    .onChange(modifyAirParticleConverage);
  folder.open();
}

////////////////////////////////////////////////
//                  INIT THREE JS, MOUSE, SCREEN
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
//                  MOUSE EVENTS / SCREEN EVENTS
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

// Control of wind speed
function modifyParticleVelocity(speed) {
  particleVelocity = speed;
  rotor_mixer.timeScale = speed;
}

function modifyAirDensity(density) {
  airDensity = density;
}

function modifyAirParticleConverage(converage) {
  createWind();
  particleCoverage = converage;
}

// function updateDirection() {
//   winddirEl.innerHTML = "Direction: " + settings["Wind direction"];
//   modifyTimeScale(settings["Wind speed"]);
// }

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
//                                        RENDER
////////////////////////////////////////////////

function render() {
  if (controls && controls.enabled) controls.update();
  renderer.render(scene, camera);
}

////////////////////////////////////////////////
//                                        LIGHTS
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
//                                        FLOOR
////////////////////////////////////////////////
var Floor = function () {
  var floorCol = Colors.green_d;
  this.mesh = new CustomMesh.PlaneMesh(1600, 1600, 12, floorCol);
  var vertices = this.mesh.geometry.vertices;
  for (var i = 0; i < vertices.length; i++) {
    var v = vertices[i];
    v.x += Math2.rangeRandom(-10, 10);
    v.y += Math2.rangeRandom(-10, 10);
    v.z += Math2.rangeRandom(-10, 10);
  }
  this.mesh.geometry.computeFaceNormals();
  this.mesh.geometry.verticesNeedUpdate = true;
  this.mesh.geometry.colorsNeedUpdate = true;
  this.mesh.rotation.x = -Math.PI / 2;
};

////////////////////////////////////////////////
//                                 CREATE MODELS
////////////////////////////////////////////////

// Air Particles
function createWind() {
  var particle;

  particles.forEach((p) => {
    scene.remove(p);
  });

  var material = new THREE.PointsMaterial({
    size: particleCoverage / 25.0
  });

  // Create multiple particles and add them to the scene seperatly
  for (i = 0; i < totalObjects; i++) {
    var vertex = new THREE.Vector3();
    var geometry = new THREE.Geometry();

    vertex.x = Math.random() * 40 - 15;
    vertex.y = Math.random() * 20 + 85;
    vertex.z = Math.random() * 2000;

    geometry.vertices.push(vertex);
    particle = new THREE.Points(geometry, material);

    scene.add(particle);
    particles.push(particle);
    collidableMeshList.push(particle);
  }

  wind_mixer = new THREE.AnimationMixer(particles);
  wind_mixer.timeScale = 15;
}

// Windmill & Animation
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
  rotor_mixer.timeScale = 15;

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
  electroEl = $("electro");
  errEl = $("err");
  windspeedEl = $("windspeed");
  winddirEl = $("winddir");
  classes = [
    $c("perc red0"),
    $c("perc red1"),
    $c("perc red2"),
    $c("perc green0"),
    $c("perc green1"),
    $c("perc green2"),
  ];

  initCore();
  initGUI();
  createLights();
  createFloor();
  createWind();
  var loader = new THREE.JSONLoader();
  loader.load("./src/obj/WindGenerator.json", createWG);
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
    rotor_mixer.update(delta);
    skeleton.update();

    particles.forEach((particle) => {
      particle.position.z -= particleVelocity * 5 * delta;

      var difference = particle.position.z + particle.geometry.vertices[0].z;

      if (difference < -1000) {
        particle.position.z += 1500;
        particle.userData["hit"] = false; // Reset for collition detection
      }
    });

    var originPoint = mesh.position.clone();

    for (
      var vertexIndex = 0; vertexIndex < mesh.geometry.vertices.length; vertexIndex++
    ) {
      var localVertex = mesh.geometry.vertices[vertexIndex].clone();
      var globalVertex = localVertex.applyMatrix4(mesh.matrix);
      var directionVector = globalVertex.sub(mesh.position);

      var ray = new THREE.Raycaster(
        originPoint,
        directionVector.clone().normalize()
      );
      var collisionResults = ray.intersectObjects(collidableMeshList);
      if (
        collisionResults.length > 0 &&
        collisionResults[0].distance < directionVector.length()
      ) {
        if (!collisionResults[0].object.userData["hit"]) {
          collisionResults[0].object.userData["hit"] = true;
          console.log(collisionResults[0].object.userData["hit"]);
          console.log("HIT!");
          energy.updateElectricity();
        }
      }
    }
  }

  render();
  requestAnimationFrame(loop);
}