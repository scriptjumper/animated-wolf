console.log = () => null;
const loader = new THREE.GLTFLoader();
let sceneWidth,
  sceneHeight,
  camera,
  scene,
  renderer,
  stats,
  mesh,
  orbitControl,
  clock = new THREE.Clock(),
  wolf,
  mixer,
  label;
let heightMap,
  groundAttributes = {
    width: 160,
    height: 80,
    widthSegments: 64,
    heightSegments: 32
  },
  heightScale = 10,
  snowHeight = 80,
  snowSpeed = 0.5;
let forward = true,
  walkingPace = 8,
  max = 28,
  min = -28,
  len = 56;
window.onload = function() {
  function init() {
    sceneWidth = window.innerWidth;
    sceneHeight = window.innerHeight;
    scene = new THREE.Scene(); //the 3d scene
    scene.fog = new THREE.FogExp2(0xf0fff0, 0.014);
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    ); //perspective camera
    camera.position.set(0, 25, 50);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(sceneWidth, sceneHeight);
    renderer.setClearColor(0xfffafa, 1);
    document.body.appendChild(renderer.domElement);
    setUpLights();
    addGround();
    addSnow();
    addWolf({ x: 0, y: 0, z: 0 }, 10);
    //scene.add(new THREE.AxesHelper(100)); //show axes
    orbitControl = new THREE.OrbitControls(camera, renderer.domElement); //helper to rotate around in scene
    orbitControl.addEventListener("change", render);
    orbitControl.enableZoom = true;
    window.addEventListener("resize", onWindowResize, false); //resize callback
    label = document.createElement("div");
    label.style.position = "absolute";
    label.style.top = "0px";
    label.style.left = "0px";
    label.style.width = "100%";
    label.style.height = "100%";
    label.style.fontSize = "33px";
    label.style.fontWeight = "bold";
    label.style.color = "#000000";
    label.style.textShadow = "0px 0px 10px #ffffff";
    label.style.textAlign = "center";
    label.style.verticalAlign = "middle";
    label.style.lineHeight = window.innerHeight + "px";
    label.innerHTML = "   Finding Wolf...";
    document.body.appendChild(label);
  }

  //add ground
  function addGround() {
    let planeGeometry = new THREE.PlaneGeometry(
      groundAttributes.width,
      groundAttributes.height,
      groundAttributes.widthSegments - 1,
      groundAttributes.heightSegments - 1
    );
    addHeight(
      planeGeometry,
      [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0.5, -0.5, 0.3, 0, 0],
        [0, 0, 0.3, -0.2, 0.1, 0, 0],
        [0, 0, -0.5, 0, 0.4, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0]
      ],
      heightScale
    );
    let texture = new THREE.TextureLoader().load(
      "https://badasstechie.github.io/textures/snow.jpg"
    );
    let planeMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      flatShading: true
    });
    let ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.receiveShadow = true;
    ground.castShadow = true;
    ground.rotation.x = -THREE.Math.degToRad(90);
    scene.add(ground);
    let ground2 = ground.clone();
    ground2.position.z = -groundAttributes.height;
    scene.add(ground2);
  }

  function addHeight(planeGeometry, points, scale) {
    let rows = planeGeometry.parameters.heightSegments + 1,
      cols = planeGeometry.parameters.widthSegments + 1;
    console.log(rows, cols);
    heightMap = new Array(rows);
    for (let i = 0; i < rows; ++i) heightMap[i] = new Array(cols);
    for (let y = 1; y <= points.length - 3; ++y) {
      for (let x = 1; x <= points[y].length - 3; ++x) {
        let y0 = rows / (points.length - 3),
          x0 = cols / (points[y].length - 3);
        for (let dy = 0; dy < y0; ++dy) {
          for (let dx = 0; dx < x0; ++dx) {
            heightMap[(y - 1) * y0 + dy][
              (x - 1) * x0 + dx
            ] = bicubicInterpolation(
              [
                [
                  points[y - 1][x - 1],
                  points[y - 1][x],
                  points[y - 1][x + 1],
                  points[y - 1][x + 2]
                ],
                [
                  points[y][x - 1],
                  points[y][x],
                  points[y][x + 1],
                  points[y][x + 2]
                ],
                [
                  points[y + 1][x - 1],
                  points[y + 1][x],
                  points[y + 1][x + 1],
                  points[y + 1][x + 2]
                ],
                [
                  points[y + 2][x - 1],
                  points[y + 2][x],
                  points[y + 2][x + 1],
                  points[y + 2][x + 2]
                ]
              ],
              dx * (1 / x0),
              dy * (1 / y0)
            );
          }
        }
      }
    }
    let vertices = [].concat.apply([], heightMap);
    for (let i = 0; i < planeGeometry.vertices.length; ++i) {
      planeGeometry.vertices[i].z = scale * vertices[i];
    }
    planeGeometry.verticesNeedUpdate = true;
  }

  function addSnow() {
    let numParticles = 150,
      width = 160,
      height = 160,
      depth = 160,
      size = 2.5;
    let systemGeometry = new THREE.Geometry();
    let texture = new THREE.TextureLoader().load(
      "https://badasstechie.github.io/textures/snowflake.png"
    );
    let systemMaterial = new THREE.PointsMaterial({
      map: texture,
      transparent: true,
      size: size
    });
    for (let i = 0; i < numParticles; i++) {
      let vertex = new THREE.Vector3(
        rand(width),
        rand(height, true),
        rand(depth) - depth / 4
      );
      systemGeometry.vertices.push(vertex);
    }
    particleSystem = new THREE.Points(systemGeometry, systemMaterial);
    scene.add(particleSystem);
  }

  function rand(val, minIsZero = false) {
    let min = minIsZero ? 0 : -val / 2,
      max = val / 2;
    return Math.random() * (max - min) + min;
  }

  //lights up the scene
  function setUpLights() {
    let ambientLight = new THREE.AmbientLight(0xfffafa, 1);
    scene.add(ambientLight);
  }

  function updateParticleSystem(particleSystemHeight, speedY) {
    let geometry = particleSystem.geometry,
      vertices = geometry.vertices,
      numVertices = vertices.length;
    for (var i = 0; i < numVertices; i++) {
      var v = vertices[i];
      if (v.y > 0) {
        v.y -= speedY;
      } else {
        v.y = particleSystemHeight;
      }
    }
    geometry.verticesNeedUpdate = true;
  }

  //loads glb
  function addWolf(pos, scale) {
    let loader = new THREE.GLTFLoader();
    loader.load("https://badasstechie.github.io/models/wolf.glb", function(
      gltf
    ) {
      wolf = gltf.scene;
      wolf.position.set(pos.x, pos.y, pos.z);
      wolf.children.forEach(function(item, index) {
        if (item.name === "Wolf_obj_body004") {
          item.children.forEach(function(item, index) {
            item.material.metalness = 0;
          });
        }
      });
      scene.add(wolf);
      let animations = gltf.animations;
      mixer = new THREE.AnimationMixer(wolf);
      let idleAnimation = mixer.clipAction(animations[0]);
      //idleAnimation.play();
      let walkingAnimation = mixer.clipAction(animations[1]);
      walkingAnimation.play();
      wolf.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
      positionWolf(wolf, 0, 0);
      //alert("What should I name the wolf?");
      document.body.removeChild(label);
    });
  }

  function positionWolf(wolf, xPos, zPos) {
    wolf.position.x = xPos;
    wolf.position.z = zPos;
    let x = groundAttributes.width / 2 + xPos,
      y = groundAttributes.height / 2 + zPos;
    let scaleX = (groundAttributes.widthSegments + 1) / groundAttributes.width,
      scaleY = (groundAttributes.heightSegments + 1) / groundAttributes.height;
    let vertexX = Math.floor(x * scaleX),
      vertexY = Math.floor(y * scaleY);
    let height = heightMap[vertexY][vertexX];
    //wolf.position.y = height * heightScale;
  }

  function move(scale = 1) {
    let thetaZ = THREE.Math.degToRad(360) * ((wolf.position.z + max) / len);
    if (forward) {
      this.x = Math.sin(thetaZ) * scale;
      this.rotY = Math.cos(thetaZ) * THREE.Math.degToRad(90);
    } else {
      this.x = -Math.sin(thetaZ) * scale;
      let f = Math.cos(thetaZ) * THREE.Math.degToRad(90);
      this.rotY = f + Math.abs(THREE.Math.degToRad(90) - f) * 2;
    }
    return this;
  }

  //animate
  function update() {
    let delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (wolf) {
      if (forward) {
        positionWolf(wolf, move(10).x, wolf.position.z + walkingPace / 60);
        if (wolf.position.z >= max) forward = false;
      } else {
        positionWolf(wolf, move(10).x, wolf.position.z - walkingPace / 60);
        if (wolf.position.z <= min) forward = true;
      }
      wolf.rotation.y = move().rotY;
    }
    updateParticleSystem(snowHeight, snowSpeed);
    render();
    requestAnimationFrame(update);
  }

  //redraws the scene
  function render() {
    renderer.render(scene, camera);
  }

  //resize and align
  function onWindowResize() {
    sceneHeight = window.innerHeight;
    sceneWidth = window.innerWidth;
    renderer.setSize(sceneWidth, sceneHeight);
    camera.aspect = sceneWidth / sceneHeight;
    camera.updateProjectionMatrix();
  }

  function cubicInterpolation(p, x) {
    let a = 1.5 * (p[1] - p[2]) + 0.5 * (p[3] - p[0]);
    let b = p[0] - 2.5 * p[1] + 2 * p[2] - 0.5 * p[3];
    let c = 0.5 * (p[2] - p[0]);
    let d = p[1];
    return a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d;
  }

  //bicubic interpolation
  function bicubicInterpolation(p, x, y) {
    let arr = [];
    arr.push(cubicInterpolation(p[0], x));
    arr.push(cubicInterpolation(p[1], x));
    arr.push(cubicInterpolation(p[2], x));
    arr.push(cubicInterpolation(p[3], x));
    return cubicInterpolation(arr, y);
  }

  init();
  update();
};
