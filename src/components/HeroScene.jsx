import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

const LiquidTVMaterial = ({ texture, scrollProgress }) => {
  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_texture: { value: texture },
    u_scroll: { value: 0 },
    u_opacity: { value: 1.0 }
  }), [texture]);

  useFrame((state) => {
    uniforms.u_time.value = state.clock.getElapsedTime();
    uniforms.u_scroll.value = scrollProgress;
    
    // Smooth opacity fade
    const fadeStart = 0.75;
    const opacity = scrollProgress > fadeStart 
      ? Math.max(0, 1.0 - (scrollProgress - fadeStart) * 4.0) 
      : 1.0;
    uniforms.u_opacity.value = opacity;
  });

  return (
    <shaderMaterial
      transparent
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform float u_time;
        uniform sampler2D u_texture;
        uniform float u_scroll;
        uniform float u_opacity;
        varying vec2 vUv;

        float rect(vec2 uv, vec2 pos, vec2 size) {
          vec2 d = abs(uv - pos) - size;
          return step(max(d.x, d.y), 0.0);
        }

        void main() {
          vec2 uv = vUv;
          
          // 📡 CHROMATIC ABERRATION (Portal-style)
          float shift = 0.01 * u_scroll;
          float r = texture2D(u_texture, uv + vec2(shift, 0.0)).r;
          float g = texture2D(u_texture, uv).g;
          float b = texture2D(u_texture, uv - vec2(shift, 0.0)).b;
          vec4 texColor = vec4(r, g, b, 1.0);
          
          // 📺 CRT Lens Distortion (Fish-eye)
          vec2 centeredUv = uv - 0.5;
          float dist = dot(centeredUv, centeredUv);
          uv = uv + centeredUv * dist * (0.15 + u_scroll * 0.5);

          // 🌀 Portal Vortex Effect
          float angle = u_scroll * 2.0 * 3.14159;
          float s = sin(angle * dist * 2.0);
          float c = cos(angle * dist * 2.0);
          vec2 rotatedUv = vec2(
            centeredUv.x * c - centeredUv.y * s,
            centeredUv.x * s + centeredUv.y * c
          ) + 0.5;
          
          // Mix standard texture with rotated "portal" texture
          vec4 portalColor = texture2D(u_texture, rotatedUv);
          texColor = mix(texColor, portalColor, u_scroll * 0.4);

          // 📟 BOOT SEQUENCE OVERLAY
          vec2 textUv = (vUv - 0.5) * 1.6 + 0.5;
          float bootOverlay = 0.0;
          if (textUv.x > 0.3 && textUv.x < 0.7 && textUv.y > 0.4 && textUv.y < 0.6) {
             float blink = step(0.5, fract(u_time * 3.0));
             bootOverlay += rect(textUv, vec2(0.4, 0.5), vec2(0.02, 0.008));
             bootOverlay += rect(textUv, vec2(0.45, 0.5), vec2(0.015, 0.008));
             bootOverlay += rect(textUv, vec2(0.52, 0.5), vec2(0.025, 0.008));
             bootOverlay += rect(textUv, vec2(0.6, 0.5), vec2(0.01, 0.012)) * blink;
          }

          vec3 baseColor = texColor.rgb;
          
          // Cinematic Toning
          baseColor *= vec3(0.9, 1.2, 0.9); // Slight green tint
          baseColor += bootOverlay * vec3(0.6, 1.0, 0.6) * (1.0 - u_scroll);

          // 🎞️ DYNAMIC SCANLINES
          float scanline = sin(uv.y * 1200.0 + u_time * 12.0) * 0.15 * (1.0 - u_scroll * 0.5);
          baseColor += scanline;

          // 🌟 BLOOM / GLOW
          float vignette = 1.0 - smoothstep(0.3, 0.6, dist);
          baseColor += (0.1 + u_scroll * 0.3) * vec3(0.95, 0.92, 0.14) * vignette; // Social Box Yellow Glow

          // Flicker
          float flicker = 0.95 + 0.05 * sin(u_time * 60.0);
          baseColor *= flicker;

          gl_FragColor = vec4(baseColor, texColor.a * u_opacity);
        }
      `}
    />
  );
};

const TVModel = ({ scrollProgress }) => {
  const meshRef = useRef();
  const texture = useTexture('/retro-tv-gold.png');
  const { viewport } = useThree();

  useFrame((state) => {
    if (!meshRef.current) return;
    const baseScale = Math.min(viewport.width, viewport.height) * 0.95;
    const time = state.clock.getElapsedTime();
    
    // Smooth idle float
    const floatFactor = Math.pow(Math.max(0, 1.0 - scrollProgress * 1.4), 2);
    meshRef.current.rotation.y = Math.sin(time * 0.35) * 0.035 * floatFactor;
    meshRef.current.rotation.x = Math.cos(time * 0.15) * 0.02 * floatFactor;
    meshRef.current.position.y = Math.sin(time * 0.45) * 0.015 * floatFactor;

    // Standard scale
    meshRef.current.scale.setScalar(baseScale);
    
    // Zoom Depth
    meshRef.current.position.z = THREE.MathUtils.lerp(0.1, 7.5, Math.pow(scrollProgress, 1.7));
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <LiquidTVMaterial texture={texture} scrollProgress={scrollProgress} />
    </mesh>
  );
};

export default function HeroScene({ scrollProgress }) {
  return (
    <div className="w-full h-full relative">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={1.2} />
        <Suspense fallback={null}>
           <TVModel scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
