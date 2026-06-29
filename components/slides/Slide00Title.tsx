"use client";

/**
 * Slide00Title — Smallhands title screen.
 * Ported from portfolio-v26/src/Smallhands.jsx.
 *
 * Canvas is NOT owned here — it lives at the page level and mounts once.
 * This file exports:
 *   - TitleSceneContents  → r3f children (ChiiSceneManager + SmallhandsCRT)
 *   - TitleHTMLLayer      → plain DOM overlay (positioned over Canvas)
 *   - Slide00Title        → combined wrapper for slides that own their own Canvas
 *                           (unused in production; pages use the two exports above)
 */

import { useRef, useEffect, useState, type MutableRefObject, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HTMLTexture } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { useChiiScene } from "./smallhands/ChiiModel.jsx";
import smallhandsPreset from "./smallhands/smallhands-crt-preset.json";
import type { SlideProps, InteractionKind } from "./types";

// ── Config ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "smallhands-preset-v1";

// ── Shaders ───────────────────────────────────────────────────────────────────

const GhostBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(854, 480) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main(){
      vec2 t = 1.0/uResolution;
      vec3 c = vec3(0.0);
      c += texture2D(tDiffuse, vUv+t*vec2(-1,-1)).rgb*1.0;
      c += texture2D(tDiffuse, vUv+t*vec2( 0,-1)).rgb*2.0;
      c += texture2D(tDiffuse, vUv+t*vec2( 1,-1)).rgb*1.0;
      c += texture2D(tDiffuse, vUv+t*vec2(-1, 0)).rgb*2.0;
      c += texture2D(tDiffuse, vUv+t*vec2( 0, 0)).rgb*4.0;
      c += texture2D(tDiffuse, vUv+t*vec2( 1, 0)).rgb*2.0;
      c += texture2D(tDiffuse, vUv+t*vec2(-1, 1)).rgb*1.0;
      c += texture2D(tDiffuse, vUv+t*vec2( 0, 1)).rgb*2.0;
      c += texture2D(tDiffuse, vUv+t*vec2( 1, 1)).rgb*1.0;
      gl_FragColor = vec4(c/16.0, 1.0);
    }
  `,
};

const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    tBlur: { value: null },
    uResolution: { value: new THREE.Vector2(854, 480) },
    uGifAspect: { value: 16 / 9 },
    uScreenAspect: { value: 1.0 },
    uTime: { value: 0.0 },
    uWarpX: { value: 0.031 },
    uWarpY: { value: 0.041 },
    uScanStrength: { value: 0.7 },
    uScanCrawl: { value: 1.0 },
    uScanLines: { value: 480.0 },
    uBeamMinWidth: { value: 0.86 },
    uBeamMaxWidth: { value: 1.12 },
    uMaskType: { value: 2.0 },
    uMaskStrength: { value: 0.3 },
    uBloomAmt: { value: 0.25 },
    uGhostAmt: { value: 0.12 },
    uBrightBoost: { value: 1.1 },
    uSaturation: { value: 1.1 },
    uVignette: { value: 0.85 },
    uNoiseAmt: { value: 0.035 },
    uFlicker: { value: 0.004 },
    uWobbleAmt: { value: 0.0003 },
    uJitterAmt: { value: 0.0004 },
    uChrAmt: { value: 0.003 },
    uBlurAmt: { value: 1.2 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse; uniform sampler2D tBlur;
    uniform vec2  uResolution;  uniform float uGifAspect; uniform float uScreenAspect;
    uniform float uTime;
    uniform float uWarpX;       uniform float uWarpY;
    uniform float uScanStrength; uniform float uScanCrawl; uniform float uScanLines;
    uniform float uBeamMinWidth; uniform float uBeamMaxWidth;
    uniform float uMaskType;     uniform float uMaskStrength;
    uniform float uBloomAmt;     uniform float uGhostAmt;
    uniform float uBrightBoost;  uniform float uSaturation;
    uniform float uVignette;     uniform float uNoiseAmt;
    uniform float uFlicker;      uniform float uWobbleAmt;
    uniform float uJitterAmt;    uniform float uChrAmt;
    uniform float uBlurAmt;
    varying vec2 vUv;

    float toLinear1(float c){ return(c<=0.04045)?c/12.92:pow((c+0.055)/1.055,2.4); }
    vec3 toLinear(vec3 c){ return vec3(toLinear1(c.r),toLinear1(c.g),toLinear1(c.b)); }
    vec3 filmic(vec3 x){ x=max(vec3(0.0),x-0.004); return(x*(6.2*x+0.5))/(x*(6.2*x+1.7)+0.06); }
    float rand(vec2 co){ return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453); }

    vec2 warp(vec2 pos){
      pos=pos*2.0-1.0;
      pos*=vec2(1.0+pos.y*pos.y*uWarpX,1.0+pos.x*pos.x*uWarpY);
      return pos*0.5+0.5;
    }
    vec3 fetch(sampler2D tex,vec2 uv){
      uv=clamp(uv,0.0,1.0);
      if(uBlurAmt<0.001) return toLinear(uBrightBoost*texture2D(tex,uv).rgb);
      vec2 off=uBlurAmt/uResolution;
      vec3 c=texture2D(tex,uv).rgb*4.0;
      c+=texture2D(tex,clamp(uv+vec2( off.x,0.0),0.0,1.0)).rgb;
      c+=texture2D(tex,clamp(uv+vec2(-off.x,0.0),0.0,1.0)).rgb;
      c+=texture2D(tex,clamp(uv+vec2(0.0, off.y),0.0,1.0)).rgb;
      c+=texture2D(tex,clamp(uv+vec2(0.0,-off.y),0.0,1.0)).rgb;
      return toLinear(uBrightBoost*c/8.0);
    }
    float beamWeight(float dist,vec3 col){
      float luma=dot(col,vec3(0.2126,0.7152,0.0722));
      float sigma=mix(uBeamMinWidth,uBeamMaxWidth,pow(clamp(luma,0.0,1.0),0.5));
      return exp(-pow(abs(dist/sigma),2.5));
    }
    vec3 maskFn(vec2 fc){
      if(uMaskType<0.5) return vec3(1.0);
      float dark=1.0-uMaskStrength;
      if(uMaskType<1.5){
        vec2 pos=floor(fc); float odd=mod(pos.y,2.0); float col=mod(pos.x+odd*1.5,3.0);
        vec3 m=vec3(dark);
        if(col<1.0)m.r=1.0; else if(col<2.0)m.g=1.0; else m.b=1.0;
        return m;
      } else {
        float col=mod(floor(fc.x),3.0);
        vec3 m=vec3(dark);
        if(col<1.0)m.r=1.0; else if(col<2.0)m.g=1.0; else m.b=1.0;
        float cx=fract(fc.x/3.0)*2.0-1.0;
        return m*(1.0-cx*cx*0.4);
      }
    }

    void main(){
      float jSeed=floor(uTime*8.0);
      vec2 jitter=vec2(rand(vec2(jSeed,0.0))-0.5,rand(vec2(0.0,jSeed))-0.5)*2.0*uJitterAmt;
      vec2 uv=vUv+jitter;
      uv.x+=sin(uv.y*80.0+uTime*3.0)*uWobbleAmt;
      vec2 warped=warp(uv);
      if(warped.x<0.0||warped.x>1.0||warped.y<0.0||warped.y>1.0){
        gl_FragColor=vec4(0.0,0.0,0.0,1.0); return;
      }
      vec2 dir=warped-0.5;
      vec2 uvR=clamp(warped+dir*uChrAmt,0.0,1.0);
      vec2 uvG=warped;
      vec2 uvB=clamp(warped-dir*uChrAmt,0.0,1.0);
      float scanY=warped.y*uScanLines;
      float scanDist=fract(scanY+uTime*uScanCrawl*0.5)-0.5;
      vec3 colR=fetch(tDiffuse,uvR); vec3 colG=fetch(tDiffuse,uvG); vec3 colB=fetch(tDiffuse,uvB);
      colR*=mix(1.0,beamWeight(scanDist,colR),uScanStrength);
      colG*=mix(1.0,beamWeight(scanDist,colG),uScanStrength);
      colB*=mix(1.0,beamWeight(scanDist,colB),uScanStrength);
      vec3 col=vec3(colR.r,colG.g,colB.b);
      vec3 bloom=fetch(tBlur,uvG);
      vec3 ghost=vec3(
        fetch(tBlur,uvR+vec2(0.003,0.001)).r,
        fetch(tBlur,uvG+vec2(-0.001,0.002)).g,
        fetch(tBlur,uvB+vec2(0.002,-0.001)).b
      );
      col+=bloom*uBloomAmt; col+=ghost*uGhostAmt;
      float luma=dot(col,vec3(0.2126,0.7152,0.0722));
      col=mix(vec3(luma),col,uSaturation);
      col*=maskFn(gl_FragCoord.xy);
      float vig=warped.x*warped.y*(1.0-warped.x)*(1.0-warped.y);
      vig=clamp(pow(16.0*vig,0.3),0.0,1.0);
      col*=mix(1.0,vig,uVignette);
      col*=1.0-uFlicker*(sin(50.0*uTime)*0.5+0.5);
      col=filmic(col);
      vec2 seed=warped*uResolution;
      col+=(rand(seed+fract(uTime))-0.5)*uNoiseAmt;
      col=clamp(col,0.0,1.0);
      gl_FragColor=vec4(col,1.0);
    }
  `,
};

const BloomThresholdShader = {
  uniforms: {
    tDiffuse: { value: null },
    uThreshold: { value: 0.5 },
    uSoftKnee: { value: 0.2 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uThreshold; uniform float uSoftKnee;
    varying vec2 vUv;
    void main(){
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      float luma=dot(c,vec3(0.2126,0.7152,0.0722));
      float knee=uThreshold*uSoftKnee;
      float rq=clamp(luma-uThreshold+knee,0.0,2.0*knee);
      rq=(rq*rq)/(4.0*knee+0.00001);
      float weight=max(rq,luma-uThreshold)/max(luma,0.00001);
      gl_FragColor=vec4(c*weight,1.0);
    }
  `,
};

const BloomBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(854, 480) },
    uDirection: { value: new THREE.Vector2(1, 0) },
    uRadius: { value: 2.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution; uniform vec2 uDirection; uniform float uRadius;
    varying vec2 vUv;
    void main(){
      vec2 texel=uRadius/uResolution; vec2 step=uDirection*texel;
      vec3 c=vec3(0.0);
      float weights[7];
      weights[0]=0.0625;weights[1]=0.125;weights[2]=0.1875;weights[3]=0.25;
      weights[4]=0.1875;weights[5]=0.125;weights[6]=0.0625;
      for(int i=0;i<7;i++){
        vec2 off=step*float(i-3);
        c+=texture2D(tDiffuse,clamp(vUv+off,0.0,1.0)).rgb*weights[i];
      }
      gl_FragColor=vec4(c,1.0);
    }
  `,
};

const BloomCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    uBloomStr: { value: 0.8 },
    uGlowStr: { value: 0.4 },
    uBloomTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse; uniform sampler2D tBloom;
    uniform float uBloomStr; uniform float uGlowStr; uniform vec3 uBloomTint;
    varying vec2 vUv;
    void main(){
      vec3 base=texture2D(tDiffuse,vUv).rgb;
      vec3 bloom=texture2D(tBloom,vUv).rgb*uBloomTint;
      vec3 screen=1.0-(1.0-base)*(1.0-bloom*uGlowStr);
      vec3 col=base+bloom*uBloomStr;
      col=mix(col,screen,0.5);
      gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
    }
  `,
};

const AdditiveLayerShader = {
  uniforms: {
    tBase: { value: null },
    tAdd: { value: null },
    uStr: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tBase; uniform sampler2D tAdd; uniform float uStr;
    varying vec2 vUv;
    void main(){
      vec3 base=texture2D(tBase,vUv).rgb;
      vec3 add =texture2D(tAdd, vUv).rgb*uStr;
      vec3 col =1.0-(1.0-base)*(1.0-add);
      gl_FragColor=vec4(col,1.0);
    }
  `,
};

const AlphaOverShader = {
  uniforms: {
    tBottom: { value: null },
    tTop: { value: null },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tBottom;
    uniform sampler2D tTop;
    varying vec2 vUv;
    void main(){
      vec3 bottom = texture2D(tBottom, vUv).rgb;
      vec3 top    = texture2D(tTop,    vUv).rgb;
      float presence = step(0.01, dot(top, vec3(0.2126, 0.7152, 0.0722)));
      vec3 col = mix(bottom, top, presence);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULTS = {
  layerSpacingZ: 1.8,
  layerSpacingY: 0.0,
  layerScale: 0.88,
  layerOpacity: 0.12,
  camFov: 50,
  camZ: 6,
  lightX: 2.0,
  lightZ: 4.0,
  lightIntensity: 4.0,
  modelCamX: 0.0,
  modelCamY: 0.71356,
  modelCamZ: 0.20104,
  fontSize: 0.65,
  letterSpacing: 0,
  textY: 0.5,
  bloomThreshold: 0.45,
  bloomSoftKnee: 0.2,
  bloomStr: 0.9,
  glowStr: 0.5,
  bloomRadius: 2.0,
  bloomTintR: 1.0,
  bloomTintG: 1.0,
  bloomTintB: 1.0,
  uWarpX: 0.031,
  uWarpY: 0.041,
  uScanStrength: 0.7,
  uScanCrawl: 1.0,
  uScanLines: 480.0,
  uBeamMinWidth: 0.86,
  uBeamMaxWidth: 1.12,
  uMaskType: 2.0,
  uMaskStrength: 0.3,
  uBloomAmt: 0.25,
  uGhostAmt: 0.12,
  uBrightBoost: 1.1,
  uSaturation: 1.1,
  uVignette: 0.85,
  uNoiseAmt: 0.035,
  uFlicker: 0.004,
  uWobbleAmt: 0.0003,
  uJitterAmt: 0.0004,
  uChrAmt: 0.003,
  uBlurAmt: 1.2,
};

function loadPreset() {
  return { ...DEFAULTS, ...(smallhandsPreset as object) };
}

// ── ChiiSceneManager ──────────────────────────────────────────────────────────

function ChiiSceneManager({ trailConfig, modelSceneRef, modelCameraRef, lightRef }: {
  trailConfig: typeof DEFAULTS;
  modelSceneRef: MutableRefObject<THREE.Scene | null>;
  modelCameraRef: MutableRefObject<THREE.Camera | null>;
  lightRef: MutableRefObject<THREE.DirectionalLight | null>;
}) {
  const chii = useChiiScene();

  useFrame(() => {
    modelSceneRef.current = chii.modelScene.current;
    modelCameraRef.current = chii.modelCamera.current;
    if (chii.lightRef.current) lightRef.current = chii.lightRef.current;

    const light = lightRef.current;
    if (light) {
      light.position.x = trailConfig.lightX;
      light.position.z = trailConfig.lightZ;
      light.intensity = trailConfig.lightIntensity;
    }

    const cam = modelCameraRef.current as THREE.PerspectiveCamera | null;
    if (cam) {
      cam.position.x = trailConfig.modelCamX;
      cam.position.y = trailConfig.modelCamY;
      cam.position.z = trailConfig.modelCamZ;
      cam.lookAt(trailConfig.modelCamX, -0.23641, -0.11129);
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

// ── SmallhandsCRT ─────────────────────────────────────────────────────────────

function SmallhandsCRT({ trailConfig, modelSceneRef, modelCameraRef, htmlElRef }: {
  trailConfig: typeof DEFAULTS;
  modelSceneRef: MutableRefObject<THREE.Scene | null>;
  modelCameraRef: MutableRefObject<THREE.Camera | null>;
  htmlElRef: MutableRefObject<HTMLElement | null>;
}) {
  const { gl, size } = useThree();
  const threeRef = useRef<ReturnType<typeof buildPipeline> | null>(null);

  useEffect(() => {
    const W = size.width, H = size.height;
    const bW = Math.max(1, Math.floor(W / 2)), bH = Math.max(1, Math.floor(H / 2));
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const hdrOpts = { ...opts, type: THREE.HalfFloatType };

    const bloomOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bloomQuadGeo = new THREE.PlaneGeometry(2, 2);
    const bloomQuadMesh = new THREE.Mesh(bloomQuadGeo, null as unknown as THREE.Material);
    const bloomQuadScene = new THREE.Scene();
    bloomQuadScene.add(bloomQuadMesh);

    const threshMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.45 }, uSoftKnee: { value: 0.2 } },
      vertexShader: BloomThresholdShader.vertexShader,
      fragmentShader: BloomThresholdShader.fragmentShader,
      depthTest: false, depthWrite: false,
    });
    const blurHMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uResolution: { value: new THREE.Vector2(bW, bH) }, uDirection: { value: new THREE.Vector2(1, 0) }, uRadius: { value: 2.0 } },
      vertexShader: BloomBlurShader.vertexShader, fragmentShader: BloomBlurShader.fragmentShader,
      depthTest: false, depthWrite: false,
    });
    const blurVMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uResolution: { value: new THREE.Vector2(bW, bH) }, uDirection: { value: new THREE.Vector2(0, 1) }, uRadius: { value: 2.0 } },
      vertexShader: BloomBlurShader.vertexShader, fragmentShader: BloomBlurShader.fragmentShader,
      depthTest: false, depthWrite: false,
    });

    const htmlTarget = new THREE.WebGLRenderTarget(W, H, hdrOpts);
    const htmlScene = new THREE.Scene();
    const htmlCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const htmlMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: null as unknown as THREE.Texture }));
    htmlScene.add(htmlMesh);

    let htmlTex: InstanceType<typeof HTMLTexture> | null = null;
    setTimeout(() => {
      const el = htmlElRef.current;
      if (!el) return;
      htmlTex = new HTMLTexture(el);
      (htmlTex as THREE.Texture).minFilter = THREE.LinearFilter;
      (htmlTex as THREE.Texture).magFilter = THREE.LinearFilter;
      if (threeRef.current) {
        threeRef.current.htmlMesh.material.map = htmlTex as THREE.Texture;
        threeRef.current.htmlMesh.material.needsUpdate = true;
        threeRef.current.htmlTex = htmlTex;
      }
    }, 0);

    const alphaOverMat = new THREE.ShaderMaterial({
      uniforms: { tBottom: { value: null }, tTop: { value: null } },
      vertexShader: AlphaOverShader.vertexShader, fragmentShader: AlphaOverShader.fragmentShader,
      depthTest: false, depthWrite: false,
    });

    const modelTarget = new THREE.WebGLRenderTarget(W, H, hdrOpts);
    const modelBloomThresh = new THREE.WebGLRenderTarget(bW, bH, opts);
    const modelBloomH = new THREE.WebGLRenderTarget(bW, bH, opts);
    const modelBloomV = new THREE.WebGLRenderTarget(bW, bH, opts);
    const compositeTargetA = new THREE.WebGLRenderTarget(W, H, hdrOpts);
    const compositeTargetB = new THREE.WebGLRenderTarget(W, H, hdrOpts);
    const mergedBloomA = new THREE.WebGLRenderTarget(bW, bH, opts);
    const mergedBloomB = new THREE.WebGLRenderTarget(bW, bH, opts);

    const addOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const addQuadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null as unknown as THREE.Material);
    const addQuadScene = new THREE.Scene();
    addQuadScene.add(addQuadMesh);
    const addMat = new THREE.ShaderMaterial({
      uniforms: { tBase: { value: null }, tAdd: { value: null }, uStr: { value: 1.0 } },
      vertexShader: AdditiveLayerShader.vertexShader, fragmentShader: AdditiveLayerShader.fragmentShader,
      depthTest: false, depthWrite: false,
    });

    const fsScene = new THREE.Scene();
    const fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: compositeTargetA.texture }));
    fsScene.add(fsMesh);

    const blurTarget = new THREE.WebGLRenderTarget(W, H, hdrOpts);
    const blurComposer = new EffectComposer(gl, blurTarget);
    blurComposer.addPass(new RenderPass(fsScene, fsCamera));
    const ghostBlurPass = new ShaderPass(GhostBlurShader);
    ghostBlurPass.uniforms.uResolution.value.set(W, H);
    blurComposer.addPass(ghostBlurPass);

    const mainComposer = new EffectComposer(gl);
    mainComposer.addPass(new RenderPass(fsScene, fsCamera));
    const bloomCompositePass = new ShaderPass(BloomCompositeShader);
    mainComposer.addPass(bloomCompositePass);
    const crtGhostPass = new ShaderPass(GhostBlurShader);
    crtGhostPass.uniforms.uResolution.value.set(W, H);
    mainComposer.addPass(crtGhostPass);
    const crtPass = new ShaderPass(CRTShader);
    crtPass.uniforms.uResolution.value.set(W, H);
    crtPass.uniforms.uScreenAspect.value = W / H;
    crtPass.uniforms.uGifAspect.value = W / H;
    crtPass.uniforms.tBlur.value = blurTarget.texture;
    mainComposer.addPass(crtPass);

    const cfg = trailConfig;
    Object.keys(cfg).forEach((k) => {
      if (k.startsWith("u") && crtPass.uniforms[k] !== undefined)
        crtPass.uniforms[k].value = cfg[k as keyof typeof cfg];
    });
    threshMat.uniforms.uThreshold.value = cfg.bloomThreshold;
    threshMat.uniforms.uSoftKnee.value = cfg.bloomSoftKnee;
    blurHMat.uniforms.uRadius.value = cfg.bloomRadius;
    blurVMat.uniforms.uRadius.value = cfg.bloomRadius;
    bloomCompositePass.uniforms.uBloomStr.value = cfg.bloomStr;
    bloomCompositePass.uniforms.uGlowStr.value = cfg.glowStr;
    bloomCompositePass.uniforms.uBloomTint.value.set(cfg.bloomTintR, cfg.bloomTintG, cfg.bloomTintB);

    threeRef.current = {
      htmlTex: null,
      htmlTarget, htmlScene, htmlCam, htmlMesh,
      alphaOverMat, modelTarget, modelBloomThresh, modelBloomH, modelBloomV,
      compositeTargetA, compositeTargetB, mergedBloomA, mergedBloomB,
      blurTarget, blurComposer, mainComposer,
      bloomOrtho, bloomQuadMesh, bloomQuadScene,
      threshMat, blurHMat, blurVMat,
      addOrtho, addMat, addQuadMesh, addQuadScene,
      fsMesh, crtPass, bloomCompositePass, ghostBlurPass, crtGhostPass,
    };

    return () => {
      (threeRef.current?.htmlTex as { dispose?: () => void } | null)?.dispose?.();
      htmlTarget.dispose(); modelTarget.dispose();
      modelBloomThresh.dispose(); modelBloomH.dispose(); modelBloomV.dispose();
      compositeTargetA.dispose(); compositeTargetB.dispose();
      mergedBloomA.dispose(); mergedBloomB.dispose(); blurTarget.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    const { crtPass, bloomCompositePass, threshMat, blurHMat, blurVMat } = t;
    Object.keys(trailConfig).forEach((k) => {
      if (k.startsWith("u") && crtPass.uniforms[k] !== undefined)
        crtPass.uniforms[k].value = trailConfig[k as keyof typeof trailConfig];
    });
    threshMat.uniforms.uThreshold.value = trailConfig.bloomThreshold;
    threshMat.uniforms.uSoftKnee.value = trailConfig.bloomSoftKnee;
    blurHMat.uniforms.uRadius.value = trailConfig.bloomRadius;
    blurVMat.uniforms.uRadius.value = trailConfig.bloomRadius;
    bloomCompositePass.uniforms.uBloomStr.value = trailConfig.bloomStr;
    bloomCompositePass.uniforms.uGlowStr.value = trailConfig.glowStr;
    bloomCompositePass.uniforms.uBloomTint.value.set(trailConfig.bloomTintR, trailConfig.bloomTintG, trailConfig.bloomTintB);
  }, [trailConfig]);

  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    const W = size.width, H = size.height;
    const bW = Math.max(1, Math.floor(W / 2)), bH = Math.max(1, Math.floor(H / 2));
    t.htmlTarget.setSize(W, H); t.modelTarget.setSize(W, H);
    t.modelBloomThresh.setSize(bW, bH); t.modelBloomH.setSize(bW, bH); t.modelBloomV.setSize(bW, bH);
    t.compositeTargetA.setSize(W, H); t.compositeTargetB.setSize(W, H);
    t.mergedBloomA.setSize(bW, bH); t.mergedBloomB.setSize(bW, bH);
    t.blurTarget.setSize(W, H); t.blurComposer.setSize(W, H); t.mainComposer.setSize(W, H);
    t.crtPass.uniforms.uResolution.value.set(W, H);
    t.crtPass.uniforms.uScreenAspect.value = W / H;
    t.crtPass.uniforms.uGifAspect.value = W / H;
    t.ghostBlurPass.uniforms.uResolution.value.set(W, H);
    t.crtGhostPass.uniforms.uResolution.value.set(W, H);
    t.blurHMat.uniforms.uResolution.value.set(bW, bH);
    t.blurVMat.uniforms.uResolution.value.set(bW, bH);
  }, [size]);

  useFrame((_, delta) => {
    const t = threeRef.current;
    if (!t) return;
    const { htmlTarget, htmlScene, htmlCam, alphaOverMat, modelTarget,
      compositeTargetA, mergedBloomA, mergedBloomB, blurComposer, mainComposer,
      crtPass, bloomOrtho, bloomQuadMesh, bloomQuadScene, threshMat, blurHMat, blurVMat,
      addOrtho, addMat, addQuadMesh, addQuadScene, fsMesh, bloomCompositePass } = t;

    const r = gl as unknown as THREE.WebGLRenderer;

    r.setRenderTarget(htmlTarget);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(htmlScene, htmlCam);

    const mScene = modelSceneRef?.current;
    const mCam = modelCameraRef?.current;
    if (mScene && mCam) {
      r.setRenderTarget(modelTarget);
      r.setClearColor(0x000000, 1);
      r.clear(true, true, false);
      r.render(mScene, mCam);
    }

    addQuadMesh.material = alphaOverMat;
    alphaOverMat.uniforms.tBottom.value = htmlTarget.texture;
    alphaOverMat.uniforms.tTop.value = modelTarget.texture;
    r.setRenderTarget(compositeTargetA);
    r.setClearColor(0x000000, 1);
    r.clear(true, false, false);
    r.render(addQuadScene, addOrtho);

    bloomQuadMesh.material = threshMat;
    threshMat.uniforms.tDiffuse.value = compositeTargetA.texture;
    r.setRenderTarget(mergedBloomA);
    r.render(bloomQuadScene, bloomOrtho);

    bloomQuadMesh.material = blurHMat;
    blurHMat.uniforms.tDiffuse.value = mergedBloomA.texture;
    r.setRenderTarget(mergedBloomB);
    r.render(bloomQuadScene, bloomOrtho);

    bloomQuadMesh.material = blurVMat;
    blurVMat.uniforms.tDiffuse.value = mergedBloomB.texture;
    r.setRenderTarget(mergedBloomA);
    r.render(bloomQuadScene, bloomOrtho);

    fsMesh.material.map = compositeTargetA.texture;
    fsMesh.material.needsUpdate = true;
    bloomCompositePass.uniforms.tBloom.value = mergedBloomA.texture;

    blurComposer.render();
    crtPass.uniforms.tBlur.value = t.blurTarget.texture;

    r.setRenderTarget(null);
    crtPass.uniforms.uTime.value += delta;
    mainComposer.render();
  }, 1);

  return null;
}

// needed for TypeScript to know the shape of threeRef
type PipelineRefs = {
  htmlTex: unknown;
  htmlTarget: THREE.WebGLRenderTarget;
  htmlScene: THREE.Scene;
  htmlCam: THREE.OrthographicCamera;
  htmlMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  alphaOverMat: THREE.ShaderMaterial;
  modelTarget: THREE.WebGLRenderTarget;
  modelBloomThresh: THREE.WebGLRenderTarget;
  modelBloomH: THREE.WebGLRenderTarget;
  modelBloomV: THREE.WebGLRenderTarget;
  compositeTargetA: THREE.WebGLRenderTarget;
  compositeTargetB: THREE.WebGLRenderTarget;
  mergedBloomA: THREE.WebGLRenderTarget;
  mergedBloomB: THREE.WebGLRenderTarget;
  blurTarget: THREE.WebGLRenderTarget;
  blurComposer: EffectComposer;
  mainComposer: EffectComposer;
  bloomOrtho: THREE.OrthographicCamera;
  bloomQuadMesh: THREE.Mesh;
  bloomQuadScene: THREE.Scene;
  threshMat: THREE.ShaderMaterial;
  blurHMat: THREE.ShaderMaterial;
  blurVMat: THREE.ShaderMaterial;
  addOrtho: THREE.OrthographicCamera;
  addMat: THREE.ShaderMaterial;
  addQuadMesh: THREE.Mesh;
  addQuadScene: THREE.Scene;
  fsMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  crtPass: ShaderPass;
  bloomCompositePass: ShaderPass;
  ghostBlurPass: ShaderPass;
  crtGhostPass: ShaderPass;
};
declare function buildPipeline(): PipelineRefs;

// ── TitleHTMLLayer — plain DOM, lives OUTSIDE Canvas ─────────────────────────
// Positioned over the Canvas via absolute/fixed. Passed as elRef to CRT pipeline.

export function TitleHTMLLayer({ elRef, interactive, onTap }: {
  elRef: RefObject<HTMLDivElement | null>;
  interactive: boolean;
  onTap: (kind?: InteractionKind) => void;
}) {
  return (
    <div
      ref={elRef}
      style={{
        position: "absolute",
        left: 0, top: 0,
        width: "100vw", height: "100vh",
        pointerEvents: "none",
        overflow: "hidden",
        background: "#111",
        zIndex: 0,
      }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full gap-76 -translate-y-4">
        <span className="text-[#F1D345] font-medium text-[56px] tracking-tight">
          smallhands
        </span>
        <span className="text-white text-4xl flex flex-col gap-2">
          micro interactions{" "}
          <span className="bg-white rounded-2xl text-black font-bold uppercase text-2xl flex py-2 px-1 items-center justify-center">
            edition
          </span>
        </span>
      </div>

      {/* Invisible hit-area over the title text. The visible text is the
          CRT-rendered texture; this transparent layer captures real pointer
          events. Hover (mouse only) and click each count as one interaction. */}
      {interactive && (
        <div
          role="button"
          aria-label="interact with the title"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") onTap("hover");
          }}
          onClick={() => onTap("tap")}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(80vw, 640px)",
            height: "45vh",
            pointerEvents: "auto",
            cursor: "pointer",
            zIndex: 50,
          }}
        />
      )}

      <div className="absolute top-27 left-1/4 -translate-x-1/2 w-64 h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/smallhands/tryme.svg" alt="try me" className="absolute inset-0 w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/smallhands/star.svg"
          alt="star"
          className="absolute inset-0 w-full h-full opacity-25"
          style={{ animation: "spin 8s linear infinite" }}
        />
      </div>

    </div>
  );
}

// ── TitleSceneContents — r3f children, rendered inside the hoisted Canvas ────

export function TitleSceneContents({ htmlElRef }: {
  htmlElRef: MutableRefObject<HTMLElement | null>;
}) {
  const [config] = useState(loadPreset);
  const modelSceneRef = useRef<THREE.Scene | null>(null);
  const modelCameraRef = useRef<THREE.Camera | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);

  return (
    <>
      <ChiiSceneManager
        trailConfig={config}
        modelSceneRef={modelSceneRef}
        modelCameraRef={modelCameraRef}
        lightRef={lightRef}
      />
      <SmallhandsCRT
        trailConfig={config}
        modelSceneRef={modelSceneRef}
        modelCameraRef={modelCameraRef}
        htmlElRef={htmlElRef}
      />
    </>
  );
}

// ── Default export — SlideProps wrapper (used by SLIDES registry) ─────────────
// The page is responsible for rendering TitleHTMLLayer and TitleSceneContents
// inside a persistent Canvas. This default export is a no-op placeholder kept
// so the SLIDES array index stays correct; the actual rendering is done in the pages.

export default function Slide00Title(_props: SlideProps) {
  // Rendering delegated to page-level Canvas. See app/page.tsx and app/present/page.tsx.
  return null;
}
