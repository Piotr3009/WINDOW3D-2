import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useMemo, useState } from 'react';
import ParametricSashWindow from './components/ParametricSashWindow';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function Slider({ label, value, min, max, step, suffix = ' mm', onChange }) {
  return (
    <label className="control">
      <div className="control__row">
        <span>{label}</span>
        <strong>{Math.round(value)}{suffix}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <button type="button" className={checked ? 'switch switch--on' : 'switch'} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}

function Scene({ config }) {
  const [hovered, setHovered] = useState(false);

  const pedestalScale = useMemo(() => {
    const maxDimension = Math.max(config.width, config.height) / 1000;
    return clamp(maxDimension * 0.9, 1.2, 3.2);
  }, [config.width, config.height]);

  return (
    <>
      <color attach="background" args={['#ebe6de']} />
      <fog attach="fog" args={['#ebe6de', 7, 14]} />

      <PerspectiveCamera makeDefault position={[2.75, 1.65, 3.8]} fov={32} />

      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#fff7f0', '#d8d0c5', 1.1]} />
      <directionalLight
        position={[5, 7, 6]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.45} />

      <group position={[0, 0.18, 0]}>
        <Bounds fit margin={1.2}>
          <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <ParametricSashWindow {...config} />
          </group>
        </Bounds>
      </group>

      <mesh receiveShadow position={[0, -1.22, 0]}>
        <cylinderGeometry args={[pedestalScale, pedestalScale * 1.02, 0.16, 64]} />
        <meshStandardMaterial color="#d9d1c6" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#dfd7cb" roughness={1} />
      </mesh>

      <ContactShadows position={[0, -1.215, 0]} opacity={0.35} blur={2} far={3.2} scale={5} />

      <OrbitControls
        makeDefault
        enablePan={true}
        screenSpacePanning={true}
        minDistance={0.15}
        maxDistance={8}
        zoomSpeed={1.2}
        panSpeed={1.0}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        autoRotate={config.autoRotate}
        autoRotateSpeed={0.9}
      />

      {hovered && (
        <Html position={[0, 1.55, 0]} center distanceFactor={8}>
          <div className="badge">Drag to rotate</div>
        </Html>
      )}
    </>
  );
}

export default function App() {
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(1500);
  const [opening, setOpening] = useState(0);
  const [upperOpening, setUpperOpening] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [boxType, setBoxType] = useState('standard');

  const maxSashOpening = Math.max(0, height / 2 - 120);

  const config = useMemo(
    () => ({
      width,
      height,
      opening,
      upperOpening,
      autoRotate,
      showGuides,
      boxDepth: boxType === 'standard' ? 164 : 146,
      sashDepth: 57,
      boxType,
    }),
    [width, height, opening, upperOpening, autoRotate, showGuides, boxType],
  );

  return (
    <div className="app-shell">
      <aside className="panel">
        <div className="eyebrow">Prime Sash Windows</div>
        <h1>Traditional timber sash — R3F prototype</h1>
        <p className="lede">
          Initial parametric model built around the information we already have: standard box depth 164 mm,
          sash depth 57 mm, simple sill, adjustable width and height, and a live 3D preview.
        </p>

        <div className="card">
          <h2>Size</h2>
          <Slider label="Width" value={width} min={600} max={1800} step={10} onChange={setWidth} />
          <Slider label="Height" value={height} min={800} max={3000} step={10} onChange={setHeight} />
          <Slider
            label="Lower sash opening"
            value={opening}
            min={0}
            max={maxSashOpening}
            step={5}
            onChange={setOpening}
          />
          <Slider
            label="Upper sash opening"
            value={upperOpening}
            min={0}
            max={maxSashOpening}
            step={5}
            onChange={setUpperOpening}
          />
        </div>

        <div className="card">
          <h2>Build</h2>
          <label className="select-wrap">
            <span>Box type</span>
            <select value={boxType} onChange={(event) => setBoxType(event.target.value)}>
              <option value="standard">Standard 164 mm</option>
              <option value="slim">Slim 146 mm</option>
            </select>
          </label>
          <div className="stats">
            <div><span>Box depth</span><strong>{config.boxDepth} mm</strong></div>
            <div><span>Sash depth</span><strong>{config.sashDepth} mm</strong></div>
          </div>
          <Toggle label="Auto rotate" checked={autoRotate} onChange={setAutoRotate} />
          <Toggle label="Show guide dimensions" checked={showGuides} onChange={setShowGuides} />
        </div>

        <div className="card note">
          <h2>Temporary assumptions</h2>
          <ul>
            <li>Face widths are placeholders until we read exact DXF section values into the model.</li>
            <li>Sill is intentionally simple for V1.</li>
            <li>No glazing bars or ironmongery yet.</li>
          </ul>
        </div>
      </aside>

      <main className="viewport">
        <Canvas shadows dpr={[1, 2]}>
          <Scene config={config} />
        </Canvas>
      </main>
    </div>
  );
}