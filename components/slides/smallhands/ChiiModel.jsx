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

  // Static, world-space hit box per letter, computed once at rest pose.
  // Hover is tested against THESE, not the morphing meshes, so the animation
  // can never toggle the hit and the count can't flicker.
  const letterBoxes = useRef([]);

  // Hover-count latch — cheap insurance against a jittery trackpad. With the
  // static boxes the same letter shouldn't re-fire on its own; this only
  // matters for a deliberate re-hover, which is allowed after HOVER_COOLDOWN_MS.
  const lastCountedModel = useRef(-1);
  const lastCountedAt = useRef(-1e9);
  const HOVER_COOLDOWN_MS = 500;

  // Debug mode (?debug=1): draw the hit boxes and log every hover/click once.
  const debug = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("debug"),
  );

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

    // Static per-letter hit boxes (world-space, rest pose). setFromObject uses
    // base-geometry bounds → the letter's stable silhouette, independent of the
    // morph animation. Letters never move, so these stay valid all session.
    scene.updateMatrixWorld(true);
    letterBoxes.current = models.map((m) => new THREE.Box3().setFromObject(m));

    if (debug.current) {
      letterBoxes.current.forEach((box, mi) => {
        const helper = new THREE.Box3Helper(box, new THREE.Color(0x00ff88));
        helper.name = `__hitbox_${mi}`;
        scene.add(helper);
      });
      console.debug("[hero] hit boxes built", letterBoxes.current.length);
    }

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

  // Hover is a pure function of POINTER POSITION tested against STATIC hit
  // boxes (see letterBoxes). The morph animation never touches these boxes, so
  // a still cursor — or a letter mid-animation — can't toggle or retrigger the
  // hover. Evaluated on mousemove only; no per-frame raycast.
  useEffect(() => {
    const leaveCurrent = () => {
      const prev = hoveredModel.current;
      if (prev < 0) return;
      hoveredModel.current = -1;
      springs.current[prev].target = TARGET_REST;
      springs.current[prev].vel += DIP_VEL;
      document.body.style.cursor = "default";
      if (debug.current) console.debug("[hero] hover-leave", { letter: prev });
    };

    const evaluateHover = () => {
      if (!modelCamera.current || letterBoxes.current.length === 0) return;
      raycaster.current.setFromCamera(pointer.current, modelCamera.current);

      let hitModel = -1;
      for (let mi = 0; mi < letterBoxes.current.length; mi++) {
        if (raycaster.current.ray.intersectsBox(letterBoxes.current[mi])) {
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

        // Count once per genuine hover. Static boxes make this stable; the
        // latch is just belt-and-suspenders for a deliberate quick re-hover.
        const now =
          typeof performance !== "undefined" ? performance.now() : 0;
        const sameLetter = hitModel === lastCountedModel.current;
        const cooledDown = now - lastCountedAt.current > HOVER_COOLDOWN_MS;
        if (!sameLetter || cooledDown) {
          lastCountedModel.current = hitModel;
          lastCountedAt.current = now;
          onInteractionRef.current?.("hover");
          if (debug.current)
            console.debug("[hero] hover", { letter: hitModel, t: Math.round(now) });
        }
      }
    };

    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      evaluateHover();
    };
    // If the cursor leaves the window over a glyph, release it so the letter
    // doesn't stay stuck retracted. mouseout fires on every element boundary,
    // so only act when the pointer actually left the document (no relatedTarget).
    const onOut = (e) => {
      if (!e.relatedTarget && !e.toElement) leaveCurrent();
    };
    const onBlur = () => leaveCurrent();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
    };
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
      if (debug.current) console.debug("[hero] click", { letter: mi });
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
