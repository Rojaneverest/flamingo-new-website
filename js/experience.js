/* ═══════════════════════════════════════════
   FLAMINGO — WebGL backdrop (Three.js)
   A flowing silk ribbon + drifting petal field.
   Exposes window.FlamingoGL = { ready, setScroll }
   ═══════════════════════════════════════════ */

(() => {
  "use strict";

  window.FlamingoGL = { ready: false, setScroll() {} };

  if (!window.THREE) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.getElementById("webgl");
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    return; // no WebGL — the site simply runs without the backdrop
  }

  // The backdrop is soft/blurry by design, so a lower cap is nearly invisible
  // but meaningfully lighter on the GPU every frame (~25% fewer fragments).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    60
  );
  camera.position.set(0, 0, 9);

  const isMobile = window.innerWidth < 760;

  /* GLSL simplex noise (Ashima / IQ) */
  const NOISE = /* glsl */ `
    vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
    vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
  `;

  /* ── Silk ribbon ── */
  const ribbonUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uOpacity: { value: 0.85 },
    uColorA: { value: new THREE.Color("#ed1968") },
    uColorB: { value: new THREE.Color("#ff9dbf") },
    uColorC: { value: new THREE.Color("#ffe9f2") },
  };

  const ribbon = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 5.6, isMobile ? 140 : 260, 36),
    new THREE.ShaderMaterial({
      uniforms: ribbonUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      vertexShader: NOISE + /* glsl */ `
        uniform float uTime;
        uniform vec2 uMouse;
        varying float vElev;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float t = uTime * 0.16;
          float wave = snoise(vec3(p.x * 0.32 + t, p.y * 0.45, t * 0.7)) * 0.7;
          wave += sin(p.x * 0.75 - uTime * 0.42) * 0.38;
          wave *= 1.0 + uMouse.y * 0.25;
          p.z += wave;
          p.y += sin(p.x * 0.45 + uTime * 0.28) * 0.34 + uMouse.y * 0.12;
          vElev = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        varying float vElev;
        varying vec2 vUv;
        void main() {
          float g = smoothstep(-0.85, 0.95, vElev);
          vec3 col = mix(uColorA, uColorB, vUv.x);
          col = mix(col, uColorC, g * 0.6);
          col += vElev * 0.05;
          float edgeY = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
          float edgeX = smoothstep(0.0, 0.07, vUv.x) * (1.0 - smoothstep(0.93, 1.0, vUv.x));
          gl_FragColor = vec4(col, edgeY * edgeX * uOpacity);
        }
      `,
    })
  );
  ribbon.rotation.z = -0.30;
  ribbon.position.set(1.6, 0.4, -1.5);
  scene.add(ribbon);

  /* ── Petal / particle field ── */
  const COUNT = isMobile ? 130 : 320;
  const FIELD_H = 12;
  const positions = new Float32Array(COUNT * 3);
  const aScale = new Float32Array(COUNT);
  const aSpeed = new Float32Array(COUNT);
  const aOffset = new Float32Array(COUNT);
  const aTint = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 19;
    positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_H;
    positions[i * 3 + 2] = -4 + Math.random() * 6;
    aScale[i] = 0.4 + Math.random() * 1.1;
    aSpeed[i] = 0.35 + Math.random() * 0.9;
    aOffset[i] = Math.random() * Math.PI * 2;
    aTint[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
  pGeo.setAttribute("aSpeed", new THREE.BufferAttribute(aSpeed, 1));
  pGeo.setAttribute("aOffset", new THREE.BufferAttribute(aOffset, 1));
  pGeo.setAttribute("aTint", new THREE.BufferAttribute(aTint, 1));

  const particleUniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uSize: { value: (isMobile ? 30 : 38) * renderer.getPixelRatio() },
  };

  const particles = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      uniforms: particleUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aScale;
        attribute float aSpeed;
        attribute float aOffset;
        attribute float aTint;
        uniform float uTime;
        uniform float uScroll;
        uniform float uSize;
        varying float vTint;
        varying float vFade;
        void main() {
          vec3 p = position;
          float travel = uTime * aSpeed * 0.28 + uScroll * 0.0016 * aSpeed;
          p.y = mod(p.y + travel + ${(FIELD_H / 2).toFixed(1)}, ${FIELD_H.toFixed(1)}) - ${(FIELD_H / 2).toFixed(1)};
          p.x += sin(uTime * 0.22 + aOffset) * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * aScale * (1.0 / -mv.z);
          vTint = aTint;
          vFade = smoothstep(${(FIELD_H / 2).toFixed(1)}, ${(FIELD_H / 2 - 1.4).toFixed(1)}, abs(p.y));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vTint;
        varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.08, d) * 0.5 * vFade;
          vec3 pink  = vec3(0.929, 0.098, 0.408);
          vec3 blush = vec3(1.0, 0.70, 0.83);
          vec3 gray  = vec3(0.42, 0.42, 0.45);
          vec3 col = mix(pink, blush, clamp(vTint * 1.6, 0.0, 1.0));
          col = mix(col, gray, step(0.82, vTint));
          gl_FragColor = vec4(col, a);
        }
      `,
    })
  );
  scene.add(particles);

  /* ── Interaction state ── */
  let mouseX = 0, mouseY = 0;      // target (-1..1)
  let smX = 0, smY = 0;            // smoothed
  let scrollPx = 0;                // target scroll (px)
  let smScroll = 0;                // smoothed

  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  window.FlamingoGL.setScroll = (px) => { scrollPx = px; };
  window.FlamingoGL.ready = true;

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── Render loop ── */
  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    smX += (mouseX - smX) * 0.04;
    smY += (mouseY - smY) * 0.04;
    smScroll += (scrollPx - smScroll) * 0.08;

    const vh = Math.max(window.innerHeight, 1);
    const sv = smScroll / vh; // scroll progress in viewport-heights

    ribbonUniforms.uTime.value = t;
    ribbonUniforms.uMouse.value.set(smX, smY);
    // the ribbon drifts up & fades as you leave the hero, settling as a faint aura
    ribbon.position.y = 0.4 + sv * 1.15;
    ribbon.rotation.z = -0.30 + sv * 0.05 + smX * 0.02;
    ribbonUniforms.uOpacity.value = Math.max(0.28, 0.85 - sv * 0.34);

    particleUniforms.uTime.value = t;
    particleUniforms.uScroll.value = smScroll;

    camera.position.x = smX * 0.45;
    camera.position.y = smY * 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  // Warm up the pipeline now (during the preloader) so shader compilation and
  // the first draw don't stall the frame when the canvas fades into view.
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  requestAnimationFrame(render);
})();
