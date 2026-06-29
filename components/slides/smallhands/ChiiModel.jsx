/**
 * ChiiModel.jsx — 小 GLB scene built imperatively for FBO rendering.
 *
 * useChiiScene() returns { modelScene, modelCamera, lightRef }
 * — caller renders modelScene → FBO each frame, no separate <Canvas>.
 *
 * Spring: damped harmonic oscillator in useFrame, one per model.
 * Morph keys: "extrude_chii" / "extrude_sa" / "extrude_te" (fallback: "extrude" → idx 0).
 * Each model activates independently on hover/click.
 */

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import CSM from "three-custom-shader-material/vanilla";

const chiiUrl = "/smallhands/chii.glb";
const saUrl = "/smallhands/sa.glb";
const teUrl = "/smallhands/te.glb";
const naUrl = "/smallhands/na.glb";

// ── Spring ────────────────────────────────────────────────────────────────────
const SPRING = { stiffness: 280, damping: 14 };
const TARGET_REST = 1.0; // extruded = resting state
const TARGET_HOVER = 0.0; // retracted = hover state
const TARGET_CLICK = -0.3; // punch inward past rest, spring back
const DIP_VEL = 4.0; // impulse on pointer-out → slight overshoot

// ── Model layout ──────────────────────────────────────────────────────────────
// 4 models evenly spaced: chii, sa, te, na
// Set MODEL_SPACING to control gap between each character
const MODEL_SPACING = 0;
const MODEL_X = [-1.5, -0.5, 0.5, 1.5].map((m) => m * MODEL_SPACING);
const MORPH_KEYS = ["extrude_chii", "extrude_sa", "extrude_te", "extrude_na"];

// ── Inner material — Z-gradient via CSM ──────────────────────────────────────
function makeInnerMaterial(srcMat, geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const minZ = bb.min.z;
  const maxZ = bb.max.z;
  console.log("[ChiiModel] Inner mesh Z range:", minZ, "→", maxZ);

  return new CSM({
    baseMaterial: THREE.MeshStandardMaterial,
    roughness: srcMat.roughness ?? 0.5,
    metalness: srcMat.metalness ?? 0.0,

    uniforms: {
      uMinZ: { value: minZ },
      uMaxZ: { value: maxZ },
      uColorStart: { value: new THREE.Color("#ECA33E") },
      uColorEnd: { value: new THREE.Color("#EE3124") },
      uFlip: { value: 0 },
    },

    vertexShader: /* glsl */ `
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
      }
    `,

    fragmentShader: /* glsl */ `
      uniform float uMinZ;
      uniform float uMaxZ;
      uniform vec3  uColorStart;
      uniform vec3  uColorEnd;
      uniform float uFlip;
      varying vec3  vLocalPos;

      void main() {
        float t = clamp((vLocalPos.z - uMinZ) / (uMaxZ - uMinZ), 0.0, 1.0);
        if (uFlip > 0.5) t = 1.0 - t;
        csm_DiffuseColor = vec4(mix(uColorStart, uColorEnd, t), 1.0);
      }
    `,
  });
}

// ── Blender camera ────────────────────────────────────────────────────────────
function applyBlenderCamera(cam, aspect) {
  cam.position.set(0, 0.71356, 0.20104);
  cam.filmGauge = 36;
  cam.setFocalLength(32);
  cam.near = 0.1;
  cam.far = 100;
  cam.aspect = aspect;
  cam.lookAt(0, -0.23641, -0.11129);
  cam.updateProjectionMatrix();
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useChiiScene(onInteraction) {
  const { size } = useThree();

  // Stable ref so frame-loop / event handlers always see the latest callback.
  const onInteractionRef = useRef(onInteraction);
  useEffect(() => {
    onInteractionRef.current = onInteraction;
  }, [onInteraction]);
  const { scene: gltfChii } = useGLTF(chiiUrl);
  const { scene: gltfSa } = useGLTF(saUrl);
  const { scene: gltfTe } = useGLTF(teUrl);
  const { scene: gltfNa } = useGLTF(naUrl);

  const modelScene = useRef(null);
  const modelCamera = useRef(null);
  const lightRef = useRef(null);

  // Per-model morph mesh groups: [chii[], sa[], te[], na[]]
  const morphGroups = useRef([[], [], [], []]);

  // Per-model springs
  const springs = useRef([
    { pos: 1, vel: 0, target: TARGET_REST },
    { pos: 1, vel: 0, target: TARGET_REST },
    { pos: 1, vel: 0, target: TARGET_REST },
    { pos: 1, vel: 0, target: TARGET_REST },
  ]);

  // Currently hovered model index (-1 = none)
  const hoveredModel = useRef(-1);

  // Hover-count latch. The letters retract on hover, which can pull their
  // geometry out from under the ray and cause a same-letter hover flicker.
  // We keep the animation untouched but only COUNT a hover once per genuine
  // entry: a different letter counts immediately; the same letter only
  // re-counts after it's been left for longer than HOVER_COOLDOWN_MS.
  const lastCountedModel = useRef(-1);
  const lastCountedAt = useRef(-1e9);
  const HOVER_COOLDOWN_MS = 500;

  // Build scene once
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      size.width / size.height,
      0.1,
      100,
    );
    applyBlenderCamera(camera, size.width / size.height);

    // IBL
    new RGBELoader().load(
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
      (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
      },
    );

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 4.0);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    lightRef.current = dirLight;

    const fillLight = new THREE.DirectionalLight(0xffffff, 2.0);
    fillLight.position.set(-2, 2, -1);
    scene.add(fillLight);

    const ptLight = new THREE.PointLight(0xffffff, 8.0, 10, 2);
    ptLight.position.set(0, 2, 3);
    scene.add(ptLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    // Clone all four GLBs
    const models = [
      gltfChii.clone(true),
      gltfSa.clone(true),
      gltfTe.clone(true),
      gltfNa.clone(true),
    ];
    models.forEach((m, mi) => {
      m.position.x = MODEL_X[mi];
      scene.add(m);
    });

    // Collect per-model morph meshes + apply Inner gradient
    const groups = [[], [], [], []];
    models.forEach((model, mi) => {
      const morphKey = MORPH_KEYS[mi];

      model.traverse((obj) => {
        if (!obj.isMesh) return;

        if (obj.material?.name === "Inner") {
          console.log(`[ChiiModel] Inner mesh on model${mi}:`, obj.name);
          const gradMat = makeInnerMaterial(obj.material, obj.geometry);
          obj.material.dispose();
          obj.material = gradMat;
        }

        if (obj.morphTargetDictionary) {
          console.log(
            `[ChiiModel] model${mi} morph keys:`,
            Object.keys(obj.morphTargetDictionary),
          );
          let idx = obj.morphTargetDictionary[morphKey];
          if (idx === undefined) idx = obj.morphTargetDictionary["extrude"];
          if (idx === undefined) idx = 0;
          if (!obj.morphTargetInfluences) obj.morphTargetInfluences = [1];
          obj.morphTargetInfluences[idx] = 1;
          groups[mi].push({ mesh: obj, idx });
        }
      });
    });

    morphGroups.current = groups;
    modelScene.current = scene;
    modelCamera.current = camera;

    return () => {
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          obj.material?.dispose();
        }
      });
      dirLight.dispose();
      fillLight.dispose();
      ptLight.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltfChii, gltfSa, gltfTe, gltfNa]);

  // Sync camera aspect on resize
  useEffect(() => {
    if (!modelCamera.current) return;
    applyBlenderCamera(modelCamera.current, size.width / size.height);
  }, [size]);

  // Spring + morph each frame — per model
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = SPRING.stiffness,
      c = SPRING.damping;
    springs.current.forEach((s, mi) => {
      s.vel += (-k * (s.pos - s.target) - c * s.vel) * dt;
      s.pos += s.vel * dt;
      for (const { mesh, idx } of morphGroups.current[mi]) {
        mesh.morphTargetInfluences[idx] = s.pos;
      }
    });
  });

  // Pointer tracking
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2(-9, -9));

  // Hover is driven by POINTER MOVEMENT only — never by the per-frame morph
  // animation. Raycasting the animating geometry every frame made the hit
  // toggle on its own (letters retract out from under the ray), which fired
  // hovers in an infinite loop once the socket echo started re-rendering.
  // Sampling on mousemove means a stationary cursor keeps a stable hover.
  useEffect(() => {
    const evaluateHover = () => {
      if (!modelCamera.current) return;
      raycaster.current.setFromCamera(pointer.current, modelCamera.current);

      let hitModel = -1;
      for (let mi = 0; mi < 4; mi++) {
        const meshList = morphGroups.current[mi].map((m) => m.mesh);
        if (meshList.length === 0) continue;
        const hits = raycaster.current.intersectObjects(meshList, false);
        if (hits.length > 0) {
          hitModel = mi;
          break;
        }
      }

      const prev = hoveredModel.current;
      if (hitModel === prev) return;

      hoveredModel.current = hitModel;
      document.body.style.cursor = hitModel >= 0 ? "pointer" : "default";

      if (prev >= 0) {
        springs.current[prev].target = TARGET_REST;
        springs.current[prev].vel += DIP_VEL;
      }
      if (hitModel >= 0) {
        springs.current[hitModel].target = TARGET_HOVER;

        // Count once per genuine hover (see latch above), not per flicker.
        const now =
          typeof performance !== "undefined" ? performance.now() : 0;
        const sameLetter = hitModel === lastCountedModel.current;
        const cooledDown = now - lastCountedAt.current > HOVER_COOLDOWN_MS;
        if (!sameLetter || cooledDown) {
          lastCountedModel.current = hitModel;
          lastCountedAt.current = now;
          onInteractionRef.current?.("hover");
        }
      }
    };

    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      evaluateHover();
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Click — punch whichever model is hovered
  useEffect(() => {
    const onClick = () => {
      const mi = hoveredModel.current;
      if (mi < 0) return;
      springs.current[mi].target = TARGET_HOVER;
      springs.current[mi].vel -= 8.0;
      springs.current[mi].pos = TARGET_CLICK;
      // A letter was clicked → punch animation fired → 1 interaction.
      onInteractionRef.current?.("tap");
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return { modelScene, modelCamera, lightRef };
}

useGLTF.preload(chiiUrl);
useGLTF.preload(saUrl);
useGLTF.preload(teUrl);
useGLTF.preload(naUrl);
