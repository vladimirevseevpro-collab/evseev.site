import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

(async function initDruckbrotCAD(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = reduce ? 0.45 : 1;
  const stageEl = document.getElementById('stage');
  const loaderEl = document.getElementById('cadLoader');
  const loaderBar = document.getElementById('cadLoaderBar');
  const loaderPct = document.getElementById('cadLoaderPct');

  // ---------- RENDERER & SCENE (1 Three.js unit = 1 cm = 10 mm; GLB scaled ×100) ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  stageEl.insertBefore(renderer.domElement, stageEl.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.5, 450);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.78;
  controls.minDistance = 12;
  controls.maxDistance = 175;
  controls.maxPolarAngle = Math.PI * 0.495;

  const VIEWS = {
    home:  { p: new THREE.Vector3(49, 40, 72),   t: new THREE.Vector3(2.0, 20.0, 0) },
    cut:   { p: new THREE.Vector3(4, 22, 62),    t: new THREE.Vector3(0, 17.5, 0) },
    gear:  { p: new THREE.Vector3(24, 30, 22),   t: new THREE.Vector3(1.5, 23.0, 0) },
    seal:  { p: new THREE.Vector3(18, 20, 26),   t: new THREE.Vector3(0, 15.0, 0) },
    pump:  { p: new THREE.Vector3(-36, 20, 28),  t: new THREE.Vector3(-12.4, 13.0, -2.6) },
    gauge: { p: new THREE.Vector3(0, 24, 34),    t: new THREE.Vector3(0, 23.0, 7.6) }
  };
  camera.position.copy(VIEWS.home.p);
  controls.target.copy(VIEWS.home.t);
  controls.update();

  // Cinema 3-Strip Studio Lights + Real Poly Haven HDRI (calibrated so HDR never blows out enamel)
  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x3a2d22, 0.16));
  const key = new THREE.DirectionalLight(0xfff2de, 1.12);
  key.position.set(-44, 48, 46);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 10; key.shadow.camera.far = 160;
  const d = 44;
  key.shadow.camera.left = -d; key.shadow.camera.right = d;
  key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xcbe2ff, 0.68);
  rim.position.set(42, 36, -34);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffe0bc, 0.22);
  fill.position.set(36, 20, 42);
  scene.add(fill);

  window.__hdrReady = false;
  new RGBELoader().load('assets/studio.hdr', hdr => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.44;
    if (scene.environmentRotation) scene.environmentRotation.y = -Math.PI * 0.30;
    hdr.dispose();
    pmrem.dispose();
    window.__hdrReady = true;
  }, undefined, () => { window.__hdrReady = true; });

  // ---------- PROCEDURAL TABLETOP & CRUMB MICRO-STRUCTURES ----------
  function canvasTex(w, h, draw, repeatX, repeatY){
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (repeatX || repeatY){
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX || 1, repeatY || 1);
    }
    return t;
  }

  const oakTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#9D744E'; g.fillRect(0, 0, w, h);
    const planks = 6, pw = h / planks;
    for (let p = 0; p < planks; p++){
      const y0 = p * pw;
      g.fillStyle = ['#9A704B','#A57A54','#8E6542','#A17650','#936B46','#A87E58'][p % 6];
      g.fillRect(0, y0, w, pw);
      for (let i = 0; i < 420; i++){
        const y = y0 + Math.random() * pw;
        g.strokeStyle = i % 2 ? 'rgba(62,38,18,0.12)' : 'rgba(235,200,160,0.08)';
        g.lineWidth = 0.6 + Math.random() * 1.8;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.012 + p) * 3.5);
        g.stroke();
      }
      g.fillStyle = 'rgba(38,22,10,0.38)'; g.fillRect(0, y0, w, 2);
    }
  });
  oakTex.colorSpace = THREE.SRGBColorSpace;

  const marbleTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#F2F4F7'; g.fillRect(0, 0, w, h);
    for (let v = 0; v < 28; v++){
      let x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI;
      g.strokeStyle = v % 3 === 0 ? 'rgba(110,122,135,0.16)' : 'rgba(150,160,172,0.09)';
      g.lineWidth = 1 + Math.random() * 3.5;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 40; s++){
        a += (Math.random() - 0.5) * 0.45;
        x += Math.cos(a) * 24; y += Math.sin(a) * 24;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
  marbleTex.colorSpace = THREE.SRGBColorSpace;

  const slateTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1B2326'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = 1;
    for (let i = 0; i < w; i += 32){
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }
  });
  slateTex.colorSpace = THREE.SRGBColorSpace;

  function makeFoamStageAssets(stage){
    let s = 42;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const bgs = ['#E8DAB8', '#EFE2C2', '#F3E6C4', '#D9AE6E'];
    const rims = ['#C6B38B', '#CEB98E', '#C9AE7A', '#9A6930'];
    const holes = ['#B5A078', '#AA9268', '#987B4E', '#5E3B16'];
    const count = [28, 190, 260, 320][stage];
    const rMin = [1.5, 1.5, 3.0, 2.5][stage];
    const rMax = [3.8, 4.5, 9.5, 11.5][stage];
    const cells = [];
    for (let i = 0; i < count; i++){
      cells.push({ x: rnd() * 512, y: rnd() * 512, r: rMin + Math.pow(rnd(), 1.55) * (rMax - rMin), e: 0.72 + rnd() * 0.5, a: rnd() * Math.PI });
    }
    const colorTex = canvasTex(512, 512, g => {
      g.fillStyle = bgs[stage]; g.fillRect(0, 0, 512, 512);
      for (const c of cells){
        for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]){
          const X = c.x + ox, Y = c.y + oy;
          if (X < -24 || X > 536 || Y < -24 || Y > 536) continue;
          g.fillStyle = rims[stage]; g.beginPath(); g.ellipse(X, Y, c.r * 1.16, c.r * 1.16 * c.e, c.a, 0, Math.PI * 2); g.fill();
          g.fillStyle = holes[stage]; g.beginPath(); g.ellipse(X, Y, c.r, c.r * c.e, c.a, 0, Math.PI * 2); g.fill();
        }
      }
    }, 1, 1);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    const prevCanvas = document.getElementById('cPrev' + stage);
    if (prevCanvas) prevCanvas.getContext('2d').drawImage(colorTex.image, 0, 0, 64, 64);
    return colorTex;
  }
  const foamTexs = [0, 1, 2, 3].map(makeFoamStageAssets);

  // Tabletop & Soft AO Shadow Plane
  function rrect(w, h, r){
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  const texLoader = new THREE.TextureLoader();
  function loadTiledOak(file, srgb){
    const t = texLoader.load('assets/' + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.032, 0.032);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const oakAlbedo = loadTiledOak('oak_albedo.png', true);
  const oakNormal = loadTiledOak('oak_normal.png', false);
  const oakRough = loadTiledOak('oak_rough.png', false);

  const tableGeo = new THREE.ExtrudeGeometry(rrect(108, 76, 4), { depth: 2.6, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 4 });
  tableGeo.rotateX(-Math.PI / 2);
  tableGeo.translate(7, -2.6, -3);
  const tableMat = new THREE.MeshStandardMaterial({
    map: oakAlbedo,
    normalMap: oakNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: oakRough,
    roughness: 0.92,
    metalness: 0.02
  });
  const studioTable = new THREE.Mesh(tableGeo, tableMat);
  studioTable.receiveShadow = true;
  scene.add(studioTable);

  const contactShadowTex = canvasTex(512, 512, (g, w, h) => {
    const grd = g.createRadialGradient(w * 0.44, h * 0.5, 18, w * 0.44, h * 0.5, w * 0.46);
    grd.addColorStop(0, 'rgba(20,12,6,0.44)'); grd.addColorStop(0.55, 'rgba(20,12,6,0.14)'); grd.addColorStop(1, 'rgba(20,12,6,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  const aoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(86, 56),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, opacity: 0.85, depthWrite: false })
  );
  aoPlane.rotation.x = -Math.PI / 2;
  aoPlane.position.set(5, 0.02, -1);
  scene.add(aoPlane);

  // Warm Amber Cloche Baking Station on Back-Right Table (clear of baked loaf at X=23.5, Z=+5.8)
  const ovenGroup = new THREE.Group();
  ovenGroup.position.set(24.5, 0, -10.5);
  ovenGroup.visible = false;
  scene.add(ovenGroup);
  const ovenBaseTray = new THREE.Mesh(
    new THREE.CylinderGeometry(8.8, 9.2, 0.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x242629, roughness: 0.45, metalness: 0.75 })
  );
  ovenBaseTray.position.y = 0.25;
  ovenGroup.add(ovenBaseTray);
  const heaterMat = new THREE.MeshStandardMaterial({ color: 0xb44210, emissive: 0xd9480f, emissiveIntensity: 0, roughness: 0.45 });
  const ovenCoil = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.22, 12, 48), heaterMat);
  ovenCoil.rotation.x = Math.PI / 2; ovenCoil.position.y = 14.2;
  ovenGroup.add(ovenCoil);
  const ovenDome = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 8.6, 15.5, 48, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xd99b52, transparent: true, opacity: 0.14, roughness: 0.12, side: THREE.DoubleSide, depthWrite: false })
  );
  ovenDome.position.y = 7.9;
  ovenGroup.add(ovenDome);
  const ovenLight = new THREE.PointLight(0xff6a1a, 0, 26, 2);
  ovenLight.position.set(24.5, 8.5, -10.5);
  scene.add(ovenLight);

  // Dynamic Flexible High-Pressure Hose Bridge when Head is Lifted
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x1e2124, roughness: 0.65, metalness: 0.1 });
  const flexHoseMesh = new THREE.Mesh(new THREE.BufferGeometry(), hoseMat);
  flexHoseMesh.visible = false;
  flexHoseMesh.castShadow = true;
  scene.add(flexHoseMesh);
  let lastHoseHeadY = -999;

  // Compressed Air Pulses & Bleed Exhaust Vapor
  const airPulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.42, 12, 12);
  for (let i = 0; i < 6; i++){
    const ap = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 }));
    scene.add(ap);
    airPulses.push(ap);
  }
  const puffs = [], puffGeo = new THREE.SphereGeometry(1, 14, 10);

  // ---------- LOAD MANIFEST & UNIFIED CAD GLB ----------
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.1);
  let manifest, gltf;
  const PARTS = [];
  const meshToPart = new Map();
  const partMap = {};
  const enamelMats = new Set();
  const bakeliteMats = new Set();
  const shellMats = new Set();
  const rigs = {};
  const rigRest = {};
  let glbRoot = null, doughObj = null, doughMat = null, spring204 = null, jet703 = null, glass702f = null;
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  try {
    manifest = await fetch('assets/assembly_manifest.json').then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' assembly_manifest.json');
      return r.json();
    });
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        'assets/druckbrot_pro.glb',
        resolve,
        xhr => {
          if (xhr.total > 0){
            const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
            if (loaderBar) loaderBar.style.width = pct + '%';
            if (loaderPct) loaderPct.textContent = pct + '%';
          }
        },
        reject
      );
    });
  } catch (err) {
    if (loaderEl) loaderEl.innerHTML = `<div style="color:#ff8a80;text-align:center;max-width:340px">Ошибка загрузки CAD-сборки (.GLB):<br>${err.message || err}</div>`;
    return;
  }
  const SUBASSEMBLIES = manifest.subassemblies;

  glbRoot = gltf.scene;
  glbRoot.scale.setScalar(100); // True meters -> Three.js cm (430 mm = 43.0 cm)
  scene.add(glbRoot);

  // Locate Kinematic Rigs and Store Exact GLB Rest Pose
  const rigNames = [
    'DRUCKBROT_Root', 'head_rig', 'collar_rig', 'lever_rig', 'piston_rig',
    'pot_rig', 'crank_rig', 'crank_gear_rig', 'whisk_rig', 'needle_rig', 'release_btn_rig'
  ];
  for (const rn of rigNames){
    const obj = glbRoot.getObjectByName(rn);
    if (obj){
      rigs[rn] = obj;
      rigRest[rn] = { pos: obj.position.clone(), rot: obj.rotation.clone(), quat: obj.quaternion.clone() };
    }
  }

  // Bind every CAD solid part from assembly_manifest.json
  for (const m of manifest.parts){
    const node = glbRoot.getObjectByName(m.id);
    if (!node) continue;
    const part = {
      id: m.id,
      code: m.code,
      group: m.group,
      name: m.name,
      matSpec: m.matSpec,
      matKey: m.matKey,
      desc: m.desc,
      node,
      basePos: node.position.clone(),
      // Blender (x, y, z) mm -> glTF/Three (x, z, -y) meters in glbRoot-local space!
      explodeVec: new THREE.Vector3(m.explode_mm[0] * 0.001, m.explode_mm[2] * 0.001, -m.explode_mm[1] * 0.001),
      disStage: m.stage,
      isShell: !!m.isShell,
      parentRig: m.parentRig,
      pulledOut: false,
      pullK: 0,
      bomBtn: null
    };
    PARTS.push(part);
    partMap[m.id] = part;

    node.traverse(o => {
      if (!o.isMesh) return;
      meshToPart.set(o, part);
      const isGlass = m.id === '702f_Manometer_CrystalGlass';
      o.castShadow = !isGlass;
      o.receiveShadow = !isGlass;
      if (o.material){
        // Clone shared material per-shell if needed so X-ray/Clip/Finish affect groups cleanly
        if (isGlass){
          o.material.transparent = true;
          o.material.opacity = 0.16;
          o.material.roughness = 0.04;
          o.material.depthWrite = false;
          glass702f = o;
        }
        const mname = o.material.name || '';
        if (mname.includes('Mat_Enamel_Mint')) {
          o.material.envMapIntensity = 0.92;
          enamelMats.add(o.material);
        } else if (mname.includes('Mat_Polished_Chrome') || mname.includes('Mat_Steel') || mname.includes('Mat_Machined_Brass') || mname.includes('Mat_Drawn_Copper')) {
          o.material.envMapIntensity = 1.15;
        }
        if (mname.includes('Mat_Walnut_Bakelite')) bakeliteMats.add(o.material);
        if (part.isShell){
          o.material = o.material.clone();
          o.material.side = THREE.DoubleSide;
          o.material.clipShadows = true;
          shellMats.add(o.material);
          if (mname.includes('Mat_Enamel_Mint')) enamelMats.add(o.material);
        }
      }
    });
  }

  doughObj = partMap['304_Aerated_Dough_350g']?.node || null;
  if (doughObj) doughObj.traverse(o => { if (o.isMesh) doughMat = o.material; });
  spring204 = partMap['204_Pump_ReturnSpring']?.node || null;
  jet703 = partMap['703a_BleedValve_CopperJet06']?.node || null;
  const hose209Node = partMap['209_Pump_HighPressureHose']?.node || null;
  if (partMap['209_Pump_HighPressureHose']) meshToPart.set(flexHoseMesh, partMap['209_Pump_HighPressureHose']);

  if (loaderEl) loaderEl.classList.add('done');

  // Helper to spawn steam puff over Red Bleed Valve
  function spawnPuff(){
    const m = new THREE.Mesh(
      puffGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })
    );
    const p = new THREE.Vector3(0, 26.8, 2.8);
    if (rigs.release_btn_rig) rigs.release_btn_rig.getWorldPosition(p);
    p.y += 1.0;
    m.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.3, (Math.random() - 0.5) * 0.7));
    m.userData = { life: 0, v: new THREE.Vector3((Math.random() - 0.5) * 2.2, 6 + Math.random() * 3.5, (Math.random() - 0.5) * 2.2) };
    m.scale.setScalar(0.36);
    scene.add(m);
    puffs.push(m);
  }

  // ---------- FINISH & TABLETOP SCENE SWITCHER ----------
  const FINISHES = {
    mint:  { enamel: 0x56947E, bakelite: 0xFFFFFF, table: oakAlbedo, useOakPbr: true,  theme: 'vintage' },
    cream: { enamel: 0xEAE0C8, bakelite: 0xE2C4A8, table: oakAlbedo, useOakPbr: true,  theme: 'vintage' },
    ruby:  { enamel: 0x9E2A22, bakelite: 0x6A5854, table: marbleTex, useOakPbr: false, theme: 'marble' },
    dark:  { enamel: 0x2B3835, bakelite: 0xC85A4A, table: slateTex,  useOakPbr: false, theme: 'dark' }
  };

  document.querySelectorAll('.finish-btn[data-finish]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.finish-btn[data-finish]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const f = FINISHES[b.dataset.finish] || FINISHES.mint;
      document.documentElement.setAttribute('data-theme', f.theme);
      enamelMats.forEach(mt => mt.color.setHex(f.enamel));
      bakeliteMats.forEach(mt => mt.color.setHex(f.bakelite));
      tableMat.map = f.table;
      tableMat.normalMap = f.useOakPbr ? oakNormal : null;
      tableMat.roughnessMap = f.useOakPbr ? oakRough : null;
      tableMat.roughness = f.useOakPbr ? 0.85 : 0.42;
      tableMat.needsUpdate = true;
    });
  });

  // =========================================================================
  // INTERACTIVE CAD DISASSEMBLY ENGINE UI, X-RAY SHELLS, ISOLATION & RAYCASTER
  // =========================================================================
  let explodeK = 0, targetExplodeK = 0, currentDisStage = 0;
  let selectedPart = null, isolatedPart = null, xrayMode = false;

  const explodeSlider = document.getElementById('explodeSlider');
  const explodeVal = document.getElementById('explodeVal');
  const partHud = document.getElementById('part-hud');
  const phCode = document.getElementById('phCode');
  const phGroup = document.getElementById('phGroup');
  const phTitle = document.getElementById('phTitle');
  const phMat = document.getElementById('phMat');
  const phDesc = document.getElementById('phDesc');
  const phIsolate = document.getElementById('phIsolate');
  const phPullOut = document.getElementById('phPullOut');
  const bomTreeEl = document.getElementById('bomTree');

  SUBASSEMBLIES.forEach(sub => {
    const grpEl = document.createElement('div');
    grpEl.className = 'bom-group';
    const subParts = PARTS.filter(p => p.group === sub.id);
    const headBtn = document.createElement('button');
    headBtn.className = 'bom-group-head';
    headBtn.innerHTML = `<span>${sub.title}</span><span class="g-badge">${subParts.length} дет.</span>`;
    headBtn.addEventListener('click', () => grpEl.classList.toggle('bom-GroupCollapsed'));
    const listEl = document.createElement('div');
    listEl.className = 'bom-parts';
    subParts.forEach(p => {
      const pBtn = document.createElement('button');
      pBtn.className = 'bom-part';
      pBtn.dataset.code = p.code;
      pBtn.innerHTML = `<span class="p-code">№${p.code}</span><span>${p.name}</span><span class="p-mat">${p.matSpec.split('·')[0].trim()}</span>`;
      pBtn.addEventListener('click', () => selectPart(p, true));
      p.bomBtn = pBtn;
      listEl.appendChild(pBtn);
    });
    grpEl.appendChild(headBtn);
    grpEl.appendChild(listEl);
    bomTreeEl.appendChild(grpEl);
  });

  function updateGhostMaterials(){
    PARTS.forEach(p => {
      const shouldGhost = (isolatedPart && isolatedPart !== p) || (xrayMode && p.isShell && selectedPart !== p);
      p.node.traverse(o => {
        if (!o.isMesh || o === glass702f) return;
        if (shouldGhost){
          if (!o.userData.origMat) o.userData.origMat = o.material;
          if (!o.userData.ghostMat){
            o.userData.ghostMat = o.userData.origMat.clone();
            o.userData.ghostMat.transparent = true;
            o.userData.ghostMat.depthWrite = false;
          }
          o.userData.ghostMat.opacity = isolatedPart ? 0.10 : 0.20;
          o.material = o.userData.ghostMat;
        } else if (o.userData.origMat){
          o.material = o.userData.origMat;
        }
      });
    });
  }

  function selectPart(p, focusCam = false){
    selectedPart = p;
    PARTS.forEach(item => { if (item.bomBtn) item.bomBtn.classList.toggle('selected', item === p); });
    if (!p){
      partHud.classList.remove('visible');
      isolatedPart = null;
      updateGhostMaterials();
      return;
    }
    const sub = SUBASSEMBLIES.find(s => s.id === p.group);
    phCode.textContent = 'ДЕТ. № ' + p.code;
    phGroup.textContent = sub ? sub.title : '';
    phTitle.textContent = p.name;
    phMat.textContent = p.matSpec;
    phDesc.textContent = p.desc;
    phIsolate.classList.toggle('active', isolatedPart === p);
    phPullOut.classList.toggle('active', p.pulledOut);
    partHud.classList.add('visible');
    if (p.bomBtn) p.bomBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    updateGhostMaterials();

    if (focusCam){
      const box = new THREE.Box3().setFromObject(p.node);
      const center = new THREE.Vector3(), size = new THREE.Vector3();
      box.getCenter(center); box.getSize(size);
      const dist = Math.max(18, size.length() * 2.2);
      const dir = camera.position.clone().sub(controls.target).normalize();
      flyTo({ p: center.clone().add(dir.multiplyScalar(dist)), t: center }, 0.75);
    }
  }

  document.getElementById('phClose').addEventListener('click', () => selectPart(null));
  phIsolate.addEventListener('click', () => {
    if (!selectedPart) return;
    isolatedPart = (isolatedPart === selectedPart) ? null : selectedPart;
    phIsolate.classList.toggle('active', isolatedPart === selectedPart);
    updateGhostMaterials();
  });
  phPullOut.addEventListener('click', () => {
    if (!selectedPart) return;
    selectedPart.pulledOut = !selectedPart.pulledOut;
    phPullOut.classList.toggle('active', selectedPart.pulledOut);
  });

  const btnXray = document.getElementById('btnXray');
  btnXray.addEventListener('click', () => {
    xrayMode = !xrayMode;
    btnXray.setAttribute('aria-pressed', xrayMode ? 'true' : 'false');
    updateGhostMaterials();
  });

  // 3D Raycasting on Stage Click
  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downXY = null;
  renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downXY) return;
    const dx = e.clientX - downXY[0], dy = e.clientY - downXY[1];
    downXY = null;
    if (Math.hypot(dx, dy) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const meshes = Array.from(meshToPart.keys()).filter(m => m.visible && (m !== glass702f || explodeK > 0.15));
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0){
      const hitPart = meshToPart.get(hits[0].object);
      if (hitPart) selectPart(hitPart, false);
    }
  });

  const STAGE_NAMES = [
    '0/7 · Полностью собран',
    '1/7 · Снята хлебная форма',
    '2/7 · Открыт байонет и поднята голова',
    '3/7 · Вскрыт конический редуктор 1:8',
    '4/7 · Извлечён 14-проволочный венчик, вытеснитель и сальник',
    '5/7 · Разобран поршневой насос (гильза, поршень, пружина)',
    '6/7 · Разобран манометр Бурдона и клапанная группа',
    '7/7 · Полный подетальный разбор всех 67 CAD-деталей'
  ];

  function setDisassemblyStage(st){
    currentDisStage = Math.max(0, Math.min(7, st));
    document.querySelectorAll('.dis-stage-btn').forEach(b => b.classList.toggle('active', +b.dataset.dstage === currentDisStage));
    document.getElementById('disStageLabel').textContent = STAGE_NAMES[currentDisStage];
    const pct = Math.round((currentDisStage / 7) * 100);
    explodeSlider.value = pct;
    explodeVal.textContent = pct + '%';
    targetExplodeK = currentDisStage / 7;
    if (currentDisStage > 0) S.headLift = 0; // Keep explosion aligned relative to closed head datum
  }

  document.querySelectorAll('.dis-stage-btn').forEach(b => b.addEventListener('click', () => setDisassemblyStage(+b.dataset.dstage)));
  document.getElementById('btnPrevDis').addEventListener('click', () => setDisassemblyStage(currentDisStage - 1));
  document.getElementById('btnNextDis').addEventListener('click', () => setDisassemblyStage(currentDisStage + 1));

  explodeSlider.addEventListener('input', e => {
    targetExplodeK = (+e.target.value) / 100;
    explodeVal.textContent = e.target.value + '%';
    currentDisStage = Math.round(targetExplodeK * 7);
    document.querySelectorAll('.dis-stage-btn').forEach(b => b.classList.toggle('active', +b.dataset.dstage === currentDisStage));
    document.getElementById('disStageLabel').textContent = STAGE_NAMES[currentDisStage];
    if (targetExplodeK > 0.02) S.headLift = 0;
  });

  document.getElementById('btnResetAll').addEventListener('click', () => {
    isolatedPart = null; xrayMode = false;
    btnXray.setAttribute('aria-pressed', 'false');
    PARTS.forEach(p => { p.pulledOut = false; });
    selectPart(null);
    setDisassemblyStage(0);
    setCut(false, true);
  });

  const tabCycle = document.getElementById('tabCycle');
  const tabDisassembly = document.getElementById('tabDisassembly');
  const cyclePane = document.getElementById('cycle-pane');
  const disPane = document.getElementById('disassembly-pane');

  tabCycle.addEventListener('click', () => {
    tabCycle.classList.add('active'); tabDisassembly.classList.remove('active');
    cyclePane.classList.remove('hidden'); disPane.classList.remove('active');
    setDisassemblyStage(0);
  });
  tabDisassembly.addEventListener('click', () => {
    tabDisassembly.classList.add('active'); tabCycle.classList.remove('active');
    cyclePane.classList.add('hidden'); disPane.classList.add('active');
    if (targetExplodeK < 0.05) setDisassemblyStage(3);
  });

  // Blender 5.2 Cycles GPU Studio Render Overlay Controls
  const cyclesOverlay = document.getElementById('cycles-overlay');
  const cycImg = document.getElementById('cycImg');
  const cycCaption = document.getElementById('cycCaption');
  function toggleCyclesOverlay(show){
    const next = show !== undefined ? show : !cyclesOverlay.classList.contains('visible');
    cyclesOverlay.classList.toggle('visible', next);
    const topBtn = document.getElementById('btnToggleCyclesTop');
    if (topBtn) topBtn.classList.toggle('active', next);
  }
  const btnTopCyc = document.getElementById('btnToggleCyclesTop');
  if (btnTopCyc) btnTopCyc.addEventListener('click', () => toggleCyclesOverlay());
  const btnSideCyc = document.getElementById('btnOpenCyclesSide');
  if (btnSideCyc) btnSideCyc.addEventListener('click', () => toggleCyclesOverlay(true));
  document.getElementById('cycClose').addEventListener('click', () => toggleCyclesOverlay(false));
  document.getElementById('cycBackBtn').addEventListener('click', () => toggleCyclesOverlay(false));
  document.querySelectorAll('.cyc-tab[data-shot]').forEach(tb => {
    tb.addEventListener('click', () => {
      document.querySelectorAll('.cyc-tab[data-shot]').forEach(x => x.classList.remove('active'));
      tb.classList.add('active');
      cycImg.src = tb.dataset.shot;
      cycCaption.textContent = tb.dataset.caption || '';
    });
  });

  // ---------- WORKING CYCLE STATE & 6-STEP SEQUENCER ----------
  const S = {};
  function initState(){
    Object.assign(S, {
      headLift: 1, lock: 0, p: 0, leverA: -0.26, crankA: 0, whiskA: 0,
      crankRate: 0, doughH: 3.44, bake: 0, potOut: 0, foam: 0, btnPress: 0,
      step: 0, busy: false, releasing: false, pumping: false, pumpPhase: 0, timeLeft: null
    });
  }
  initState();

  const anims = [];
  function tween(dur, fn){
    return new Promise(res => anims.push({ t: 0, dur: Math.max(0.001, dur * SPEED), fn, res }));
  }
  const wait = s => tween(s, () => {});

  const STATUS = [
    'Тесто в форме. Опустите голову.',
    'Закрыто на байонет. Накачайте 4 бар.',
    '4 бар в камере. Крутите ручку 1 минуту.',
    'Тесто насыщено газом. Нажмите сброс.',
    'Давление сброшено, пена выросла ×2. Откройте.',
    'Голова поднята. Отправьте форму в духовку.',
    'Готово! Румяный хлеб испечён (35 мин при 210 °C).'
  ];

  async function stepClose(){
    if (targetExplodeK > 0) setDisassemblyStage(0);
    const h0 = S.headLift;
    await tween(1.2, k => S.headLift = h0 * (1 - ease(k)));
    await tween(0.6, k => S.lock = ease(k));
  }
  async function stepPump(){
    S.pumping = true;
    for (const target of [1.2, 2.3, 3.2, 4.0]){
      const p0 = S.p;
      await tween(0.38, k => { S.leverA = lerp(-0.26, 0.36, ease(k)); S.p = lerp(p0, target, ease(k)); S.pumpPhase = k; });
      await tween(0.28, k => { S.leverA = lerp(0.36, -0.26, ease(k)); S.pumpPhase = 0; });
    }
    S.leverA = 0;
    S.pumping = false;
  }
  async function stepCrank(){
    await tween(0.45, k => S.crankRate = ease(k));
    await tween(3.6, k => {
      S.doughH = lerp(3.44, 4.1, k);
      S.timeLeft = Math.ceil(60 * (1 - k));
      if (k > 0.18) S.foam = 1;
    });
    await tween(0.45, k => S.crankRate = 1 - ease(k));
    S.timeLeft = null;
  }
  async function stepRelease(){
    S.releasing = true;
    await tween(0.25, k => S.btnPress = Math.sin(Math.PI * k));
    S.btnPress = 0;
    await tween(3.0, k => {
      S.p = Math.max(0, 4 * Math.exp(-4.2 * k) - 4 * Math.exp(-4.2) * k);
      S.doughH = 3.44 + (0.688 * 5) / (S.p + 1);
      if (S.p < 2.2) S.foam = 2;
    });
    S.p = 0; S.doughH = 6.88; S.releasing = false;
  }
  async function stepOpen(){
    await tween(0.6, k => S.lock = 1 - ease(k));
    await tween(1.2, k => S.headLift = ease(k));
  }
  async function stepOven(){
    ovenGroup.visible = true;
    await tween(1.4, k => S.potOut = ease(k));
    await tween(2.6, k => {
      S.bake = ease(k);
      S.doughH = lerp(6.88, 7.6, ease(k));
      if (S.bake > 0.4) S.foam = 3;
    });
  }
  const STEPS = [stepClose, stepPump, stepCrank, stepRelease, stepOpen, stepOven];

  async function runToStep(targetIdx){
    if (S.busy) return;
    S.busy = true; syncUI();
    if (targetIdx < S.step){ initState(); ovenGroup.visible = false; }
    while (S.step <= targetIdx){
      syncUI();
      await STEPS[S.step]();
      S.step++;
    }
    S.busy = false; syncUI();
  }

  async function runAll(){
    if (S.busy) return;
    if (S.step >= STEPS.length){ initState(); ovenGroup.visible = false; syncUI(); await wait(0.3); }
    while (S.step < STEPS.length){
      await runToStep(S.step);
      await wait(0.35);
    }
  }

  // ---------- SECTION VIEW & CAMERA PRESETS ----------
  let cutOn = false;
  function flyTo(view, dur = 0.9){
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    const p1 = view.p.clone();
    if (stageEl.clientWidth / Math.max(1, stageEl.clientHeight) < 0.9){
      p1.sub(view.t).multiplyScalar(1.25).add(view.t);
    }
    return tween(dur, k => {
      const e = ease(k);
      camera.position.lerpVectors(p0, p1, e);
      controls.target.lerpVectors(t0, view.t, e);
    });
  }

  const cutBtn = document.getElementById('cut');
  function setCut(on, moveCam = true){
    cutOn = on;
    cutBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    shellMats.forEach(m => { m.clippingPlanes = on ? [clipPlane] : []; m.needsUpdate = true; });
    if (moveCam) flyTo(on ? VIEWS.cut : VIEWS.home, 0.9);
  }
  cutBtn.addEventListener('click', () => setCut(!cutOn, true));

  document.querySelectorAll('.cam-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.cam-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const vKey = b.dataset.cam;
      if ((vKey === 'cut' || vKey === 'pump') && !cutOn) setCut(true, false);
      if (vKey === 'gauge' && cutOn) setCut(false, false);
      flyTo(VIEWS[vKey] || VIEWS.home, 0.9);
    });
  });

  // ---------- ENGINEERED CALLOUTS IN SECTION VIEW ----------
  const labelLayer = document.getElementById('labels'), leaders = document.getElementById('leaders');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const wp = (id, fb) => {
    const p = partMap[id];
    const v = new THREE.Vector3(...fb);
    if (p) p.node.getWorldPosition(v);
    return v;
  };
  const LBL = [
    { n: '501', t: 'Коническая пара', s: '1:8 (Z=48/6)', f: () => wp('501_BevelCrownGear_Z48', [-0.7, 23, 0]), side: -1, dy: -22 },
    { n: '701', t: 'Впускной клапан', s: 'в купол 4 бар', f: () => wp('701_InletCheckValve_Copper', [-6.4, 17.2, 0]), side: -1, dy: -6 },
    { n: '405', t: 'Байонетный затвор', s: '6 зубьев', f: () => wp('405_Bayonet_LockingCollar', [-7.2, 15, 0]), side: -1, dy: 4 },
    { n: '404', t: 'Купол-вытеснитель', s: 'AISI 304', f: () => wp('404_Head_DisplacementDome', [-4.0, 12.8, 0]), side: -1, dy: 16 },
    { n: '304', t: 'Аэрированное тесто', s: '350 г', f: () => wp('304_Aerated_Dough_350g', [-3.0, 7.5, 0]), side: -1, dy: 26 },
    { n: '704', t: 'Предохр. клапан', s: '5,5 бар', f: () => wp('704b_SafetyValve_BrassBody', [3.2, 26.5, -2.8]), side: 1, dy: -24 },
    { n: '703', t: 'Жиклёр сброса', s: 'Ø 0,6 мм', f: () => wp('703d_BleedBtn_RedCap', [0, 26.5, 2.8]), side: 1, dy: -2 },
    { n: '506', t: 'Сальник вала', s: 'FKM + втулка', f: () => wp('506a_RotarySeal_FKM', [0.5, 19.2, 0]), side: 1, dy: 6 },
    { n: '603', t: 'Упругий венчик', s: '14 проволок', f: () => wp('603_Patent_14Wire_Whisk', [2.2, 9.5, 0]), side: 1, dy: 22 }
  ];

  LBL.forEach(L => {
    L.el = document.createElement('div');
    L.el.className = 'lbl' + (L.side < 0 ? ' left' : '');
    L.el.innerHTML = `<span class="idx">${L.n}</span><span>${L.t}</span>` + (L.s ? `<small>${L.s}</small>` : '');
    L.el.addEventListener('click', () => {
      const found = PARTS.find(p => p.code.startsWith(L.n));
      if (found) selectPart(found, true);
    });
    labelLayer.appendChild(L.el);
    L.poly = document.createElementNS(SVGNS, 'polyline');
    leaders.appendChild(L.poly);
    L.dot = document.createElementNS(SVGNS, 'circle');
    L.dot.setAttribute('class', 'anchor'); L.dot.setAttribute('r', '3.5');
    leaders.appendChild(L.dot);
  });

  const pv3 = new THREE.Vector3();
  function updateLabels(){
    labelLayer.hidden = !cutOn;
    leaders.style.display = cutOn ? '' : 'none';
    if (!cutOn) return;
    const W = stageEl.clientWidth, H = stageEl.clientHeight, dx = W < 560 ? 34 : 72;
    LBL.forEach(L => {
      pv3.copy(L.f()).project(camera);
      if (pv3.z > 1){
        L.el.style.display = 'none'; L.poly.style.display = 'none'; L.dot.style.display = 'none';
        return;
      }
      const sx = (pv3.x + 1) / 2 * W, sy = (1 - pv3.y) / 2 * H;
      L.el.style.display = ''; L.poly.style.display = ''; L.dot.style.display = '';
      const ew = L.el.offsetWidth || 110;
      let lx = sx + L.side * dx;
      lx = L.side < 0 ? Math.max(ew + 6, lx) : Math.min(W - ew - 6, lx);
      const ex = (sx + lx) * 0.5, ey = sy + L.dy;
      L.el.style.left = lx + 'px'; L.el.style.top = ey + 'px';
      L.poly.setAttribute('points', `${sx},${sy} ${ex},${ey} ${lx},${ey}`);
      L.dot.setAttribute('cx', sx); L.dot.setAttribute('cy', sy);
    });
  }

  // ---------- UI BINDINGS & TELEMETRY ----------
  const btns = [...document.querySelectorAll('.step')];
  const elP = document.getElementById('rP'), elV = document.getElementById('rV'), elW = document.getElementById('rW');
  const barP = document.getElementById('barP'), barV = document.getElementById('barV'), barW = document.getElementById('barW');
  const elS = document.getElementById('status'), foamLabel = document.getElementById('foamLabel');
  const crumbChips = [...document.querySelectorAll('.crumb-chip')];
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');

  crumbChips.forEach(chip => chip.addEventListener('click', () => { S.foam = +chip.dataset.crumb; syncUI(); }));
  function syncUI(){
    btns.forEach((b, i) => {
      b.disabled = S.busy; b.classList.toggle('current', i === S.step); b.classList.toggle('done', i < S.step);
    });
    document.getElementById('auto').disabled = S.busy;
    document.getElementById('reset').disabled = S.busy;
    elS.textContent = STATUS[Math.min(S.step, STATUS.length - 1)];
    const foamNames = ['Сырое тесто', 'Микроэмульсия 4 бар', 'Вспенено ×2', 'Выпеченный мякиш'];
    foamLabel.textContent = foamNames[S.foam] || foamNames[0];
    crumbChips.forEach((c, idx) => c.classList.toggle('active', idx === S.foam));
  }
  btns.forEach((b, i) => b.addEventListener('click', () => runToStep(i)));
  document.getElementById('auto').addEventListener('click', runAll);
  document.getElementById('reset').addEventListener('click', () => {
    if (S.busy) return;
    initState(); ovenGroup.visible = false; syncUI();
  });
  syncUI();

  // ---------- MAIN ANIMATION & RENDER LOOP ----------
  const rawC = new THREE.Color(0xEFE0BE);
  const bakeC = new THREE.Color(0xAD5A22);
  let prev = performance.now();
  let lastHudKey = '';

  function frame(now){
    const rawDt = Math.max(0.001, (now - prev) / 1000);
    const dt = Math.min(0.45, rawDt);
    const spinDt = Math.min(0.10, rawDt);
    prev = now;

    for (let i = anims.length - 1; i >= 0; i--){
      const a = anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k);
      if (k >= 1){ anims.splice(i, 1); a.res(); }
    }

    if (S.crankRate > 0){
      const dA = spinDt * S.crankRate * 8.5;
      S.crankA += dA;
      S.whiskA -= dA * 8;
    }

    explodeK += (targetExplodeK - explodeK) * Math.min(1, dt * 10);

    // Stage-aware CAD Disassembly vectors (in exact GLB local meters)
    PARTS.forEach(p => {
      p.pullK += ((p.pulledOut ? 1 : 0) - p.pullK) * Math.min(1, dt * 10);
      const stageFactor = Math.max(0, Math.min(1, (explodeK * 7 - (p.disStage - 1) * 0.65) / Math.max(1, 7 - (p.disStage - 1) * 0.65)));
      const kTotal = stageFactor + p.pullK * 0.65;
      p.node.position.copy(p.basePos).addScaledVector(p.explodeVec, kTotal);
    });

    // Apply Real Kinematic Rigs onto GLB Nodes
    if (rigs.head_rig) rigs.head_rig.position.y = rigRest.head_rig.pos.y + S.headLift * 0.118 + explodeK * 0.055;
    if (rigs.collar_rig) rigs.collar_rig.rotation.y = (1 - S.lock) * (-Math.PI / 6);
    if (rigs.lever_rig) rigs.lever_rig.rotation.x = S.leverA;

    const pistonDz = -0.045 * Math.sin(S.leverA);
    if (rigs.piston_rig) rigs.piston_rig.position.y = rigRest.piston_rig.pos.y + pistonDz;
    if (spring204){
      const strokeFrac = THREE.MathUtils.clamp((pistonDz + 0.017) / 0.029, 0, 1);
      spring204.scale.y = 0.62 + strokeFrac * 0.38;
    }

    // Air pulses + seamless flexible hose tracking lifted head (-9.8, 5.3, -2.6 -> -6.5, head+2.8, 0)
    const headYcm = (rigs.head_rig ? rigs.head_rig.position.y : 0.144) * 100;
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-9.8, 5.3, -2.6),
      new THREE.Vector3(-8.4, 8.2 + Math.max(0, headYcm - 14.4) * 0.25, -1.3),
      new THREE.Vector3(-7.6, 12.6 + Math.max(0, headYcm - 14.4) * 0.65, -0.5),
      new THREE.Vector3(-6.5, headYcm + 2.8, 0.0)
    ]);
    const useFlex = hose209Node && S.headLift > 0.015 && explodeK <= 0.02 && (!isolatedPart || isolatedPart === partMap['209_Pump_HighPressureHose']);
    if (hose209Node) hose209Node.visible = !useFlex && (!isolatedPart || isolatedPart === partMap['209_Pump_HighPressureHose']);
    flexHoseMesh.visible = useFlex;
    if (useFlex && Math.abs(headYcm - lastHoseHeadY) > 0.05){
      lastHoseHeadY = headYcm;
      flexHoseMesh.geometry.dispose();
      flexHoseMesh.geometry = new THREE.TubeGeometry(hoseCurve, 24, 0.42, 12, false);
    }
    airPulses.forEach((ap, idx) => {
      if (S.pumping && S.pumpPhase > 0){
        const u = (S.pumpPhase * 1.4 + idx * 0.18) % 1.0;
        ap.position.copy(hoseCurve.getPoint(u));
        ap.material.opacity = Math.sin(u * Math.PI) * 0.9;
      } else {
        ap.material.opacity = 0;
      }
    });

    if (rigs.crank_rig) rigs.crank_rig.rotation.x = S.crankA;
    if (rigs.crank_gear_rig) rigs.crank_gear_rig.rotation.x = S.crankA;
    if (rigs.whisk_rig) rigs.whisk_rig.rotation.y = S.whiskA;

    // Clockwise Manometer Needle facing +Z: 0 bar (+135 deg) -> 4 bar (0 deg) -> 8 bar (-135 deg)
    if (rigs.needle_rig) rigs.needle_rig.rotation.z = THREE.MathUtils.degToRad(135 - (S.p / 8) * 270);
    if (rigs.release_btn_rig) rigs.release_btn_rig.position.y = rigRest.release_btn_rig.pos.y - S.btnPress * 0.006;

    // Dough expansion (2x height on bleed) & bake glow onto Back-Right Baking Cloche (24.5, 0, -10.5)
    if (doughObj) doughObj.scale.set(1, S.doughH / 3.44, 1);
    if (doughMat) doughMat.color.copy(rawC).lerp(bakeC, S.bake);
    if (rigs.pot_rig){
      rigs.pot_rig.position.set(
        rigRest.pot_rig.pos.x + S.potOut * 0.245,
        rigRest.pot_rig.pos.y - S.potOut * 0.047,
        rigRest.pot_rig.pos.z - S.potOut * 0.105
      );
    }
    ovenLight.intensity = S.bake * 0.75;
    heaterMat.emissiveIntensity = S.bake * 0.95;

    if (S.releasing && Math.random() < 0.65) spawnPuff();
    for (let i = puffs.length - 1; i >= 0; i--){
      const m = puffs[i];
      m.userData.life += dt;
      m.position.addScaledVector(m.userData.v, dt);
      m.scale.setScalar(0.36 + m.userData.life * 2.0);
      m.material.opacity = 0.55 * (1 - m.userData.life / 1.1);
      if (m.userData.life > 1.1){
        scene.remove(m); m.material.dispose(); puffs.splice(i, 1);
      }
    }

    const volL = (0.30 * (S.doughH / 3.44));
    const rpm = Math.round(S.crankRate * 800);
    const hudKey = `${fmt(S.p, 1)}|${fmt(volL, 2)}|${rpm}|${S.timeLeft ?? ''}`;
    if (hudKey !== lastHudKey){
      lastHudKey = hudKey;
      elP.innerHTML = fmt(S.p, 1) + '<small>бар</small>';
      elV.innerHTML = fmt(volL, 2) + '<small>л</small>';
      elW.innerHTML = (S.timeLeft != null ? S.timeLeft + '<small>с · ' + rpm + ' об/м</small>' : rpm + '<small>об/м</small>');
      barP.style.width = Math.min(100, (S.p / 4) * 100) + '%';
      barV.style.width = Math.min(100, (volL / 0.75) * 100) + '%';
      barW.style.width = Math.min(100, (rpm / 800) * 100) + '%';
    }

    controls.update();
    updateLabels();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function resize(){
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stageEl);
  resize();
  requestAnimationFrame(frame);
})();
