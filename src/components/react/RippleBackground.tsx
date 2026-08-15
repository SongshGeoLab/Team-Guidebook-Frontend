import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber';
import { useTexture, useFBO } from '@react-three/drei';
import { Scene, OrthographicCamera, type Texture, type ShaderMaterial } from 'three';

const simulationVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const simulationFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uRadius;
  uniform float uViscosity;
  varying vec2 vUv;

  void main() {
    vec2 cellSize = 1.0 / uResolution;
    vec2 uv = vUv;

    vec4 state = texture2D(uTexture, uv);
    float height = state.r;
    float velocity = state.g;

    float up = texture2D(uTexture, uv + vec2(0.0, cellSize.y)).r;
    float down = texture2D(uTexture, uv - vec2(0.0, cellSize.y)).r;
    float left = texture2D(uTexture, uv - vec2(cellSize.x, 0.0)).r;
    float right = texture2D(uTexture, uv + vec2(cellSize.x, 0.0)).r;
    float avg = (up + down + left + right) / 4.0;

    float force = (avg - height) * 0.5;

    velocity += force;
    height += velocity;
    velocity *= uViscosity;

    float dist = distance(uv, uMouse);
    float brush = smoothstep(uRadius, uRadius * 0.5, dist);
    height += brush * 0.05;

    height = clamp(height, -1.0, 1.0);
    velocity = clamp(velocity, -0.5, 0.5);

    gl_FragColor = vec4(height, velocity, 0.0, 1.0);
  }
`;

const distortionVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const distortionFragmentShader = `
  uniform sampler2D uTexture;
  uniform sampler2D uDisplacement;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    float idleStrength = 0.01;
    float idleX = sin(uv.y * 3.0 + uTime * 0.2) * idleStrength;
    float idleY = cos(uv.x * 3.0 + uTime * 0.3) * idleStrength;

    vec4 rippleState = texture2D(uDisplacement, uv);
    float rippleHeight = rippleState.r;

    float distortionStrength = 0.03;
    vec2 rippleOffset = vec2(rippleHeight * distortionStrength);

    vec2 finalUv = uv + vec2(idleX, idleY) + rippleOffset;

    vec4 color = texture2D(uTexture, finalUv);

    float highlight = smoothstep(0.1, 0.3, abs(rippleHeight)) * 0.1;
    color.rgb += highlight;

    gl_FragColor = color;
  }
`;

function InnerScene({ bgUrl }: { bgUrl: string }) {
  const { viewport, gl } = useThree();
  const bgTexture = useTexture(bgUrl);
  const simRes = 128;
  const fboA = useFBO(simRes, simRes);
  const fboB = useFBO(simRes, simRes);

  const currentFBO = useRef(fboA);
  const prevFBO = useRef(fboB);
  const mouse = useRef({ x: -100, y: -100 });

  // @react-three/fiber v9 no longer mounts the `uniforms` prop by reference —
  // the material ends up with its own copy, so mutating the memoised object
  // below reaches nothing. (Verified: material.uniforms !== distUniforms, and
  // its uTime stayed 0 while ours advanced.) Write through these refs instead.
  const simMat = useRef<ShaderMaterial>(null);
  const distMat = useRef<ShaderMaterial>(null);

  // Respect prefers-reduced-motion. Both the pointer ripple AND the idle shader
  // drift are motion; skipping only the listener would still animate the page.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    setReduceMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1 - e.clientY / window.innerHeight;
      mouse.current = { x, y };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reduceMotion]);

  const [simScene] = useState(() => new Scene());
  const [simCam] = useState(() => new OrthographicCamera(-1, 1, 1, -1, 0, 1));

  const simUniforms = useMemo(
    () => ({
      uTexture: { value: null as Texture | null },
      uMouse: { value: [-100, -100] },
      uResolution: { value: [simRes, simRes] },
      uRadius: { value: 0.03 },
      uViscosity: { value: 0.98 },
    }),
    [simRes],
  );

  const distUniforms = useMemo(
    () => ({
      uTexture: { value: bgTexture },
      uDisplacement: { value: null as Texture | null },
      uTime: { value: 0 },
    }),
    [bgTexture],
  );

  useFrame((state) => {
    const sim = simMat.current?.uniforms;
    const dist = distMat.current?.uniforms;
    if (!sim || !dist) return;

    // One static frame is still drawn (the background image must appear); it is
    // the per-frame updates that are suppressed.
    if (reduceMotion) return;

    sim.uMouse.value = [mouse.current.x, mouse.current.y];
    sim.uTexture.value = prevFBO.current.texture;

    gl.setRenderTarget(currentFBO.current);
    gl.render(simScene, simCam);
    gl.setRenderTarget(null);

    const temp = currentFBO.current;
    currentFBO.current = prevFBO.current;
    prevFBO.current = temp;

    dist.uDisplacement.value = prevFBO.current.texture;
    dist.uTime.value = state.clock.elapsedTime;
  });

  return (
    <>
      {createPortal(
        <mesh>
          <planeGeometry args={[2, 2]} />
          <shaderMaterial
            ref={simMat}
            uniforms={simUniforms}
            vertexShader={simulationVertexShader}
            fragmentShader={simulationFragmentShader}
          />
        </mesh>,
        simScene,
      )}

      <mesh>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <shaderMaterial
          ref={distMat}
          uniforms={distUniforms}
          vertexShader={distortionVertexShader}
          fragmentShader={distortionFragmentShader}
        />
      </mesh>
    </>
  );
}

export default function RippleBackground({ imageUrl = '/background.jpg' }: { imageUrl?: string }) {
  return (
    // aria-hidden: purely decorative, and the canvas has no accessible content
    // to announce.
    //
    // No bg-black and no gradient here. This layer sits at -z-20, directly on
    // top of BaseLayout's static -z-30 backdrop: painting black would hide that
    // image during texture load (the flash this was meant to remove), and the
    // gradient belongs to BaseLayout so it is applied once over whichever
    // backdrop is showing. See the note beside it there.
    <div className="fixed inset-0 -z-20" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 1] }}
        gl={{
          antialias: false,
          // alpha: true, NOT false — this one flag is the difference between a
          // clean handover and a ~240ms black flash on every navigation.
          //
          // An opaque canvas is cleared to opaque BLACK before anything is
          // drawn, and `useTexture` below suspends while /background.jpg loads
          // and decodes. For that whole window the canvas sat at -z-20 painting
          // black over BaseLayout's static backdrop at -z-30 — measured at four
          // consecutive samples of luma 12.7 between two lit frames, and absent
          // whenever the island did not mount.
          //
          // Transparent, the canvas shows the static image through until the
          // first frame draws. Appearance afterwards is unchanged: the
          // distortion shader writes an opaque pixel (gl_FragColor = color,
          // alpha 1 from the texture), so nothing composites differently once
          // there is something to composite.
          //
          // NOT done here, deliberately: fading the canvas in on first frame.
          // The handover from static image to canvas is still a hard cut, and
          // visible, because the shader renders the same photograph about 13%
          // darker (measured: luma 46 static, 40 through the canvas). A fade
          // would only cross-dissolve between two brightnesses that should
          // match in the first place — tracked separately rather than papered
          // over here.
          alpha: true,
          depth: false,
          stencil: false,
        }}
      >
        <InnerScene bgUrl={imageUrl} />
      </Canvas>
    </div>
  );
}
