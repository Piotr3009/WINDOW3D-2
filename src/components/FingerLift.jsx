import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

const mm = (v) => v / 1000;

function FingerLift() {
  const brassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#D4A017',
    metalness: 0.95,
    roughness: 0.08,
    reflectivity: 1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.05,
  }), []);

  // Base plate: 50x35mm, 4mm thick
  const basePlateGeom = useMemo(() => {
    const shape = new THREE.Shape();
    const w = mm(50), h = mm(35), r = mm(3);
    shape.moveTo(-w/2 + r, -h/2);
    shape.lineTo(w/2 - r, -h/2);
    shape.absarc(w/2 - r, -h/2 + r, r, -Math.PI/2, 0, false);
    shape.lineTo(w/2, h/2 - r);
    shape.absarc(w/2 - r, h/2 - r, r, 0, Math.PI/2, false);
    shape.lineTo(-w/2 + r, h/2);
    shape.absarc(-w/2 + r, h/2 - r, r, Math.PI/2, Math.PI, false);
    shape.lineTo(-w/2, -h/2 + r);
    shape.absarc(-w/2 + r, -h/2 + r, r, Math.PI, Math.PI*1.5, false);
    shape.closePath();

    // Screw holes
    const hole1 = new THREE.Path();
    hole1.absarc(-mm(15), -mm(10), mm(3.5), 0, Math.PI*2, false);
    const hole2 = new THREE.Path();
    hole2.absarc(mm(15), -mm(10), mm(3.5), 0, Math.PI*2, false);
    shape.holes.push(hole1, hole2);

    const g = new THREE.ExtrudeGeometry(shape, { depth: mm(4), bevelEnabled: true, bevelSize: mm(0.5), bevelThickness: mm(0.5), bevelSegments: 4 });
    return g;
  }, []);

  // Neck profile — wide at bottom, narrows, curves up
  const neckGeom = useMemo(() => {
    const shape = new THREE.Shape();
    // Profile in XY, extrude in Z (width = 35mm)
    // bottom: 50mm wide → neck: 20mm wide at top → curves
    shape.moveTo(-mm(25), 0);
    shape.lineTo(-mm(25), mm(8));
    shape.absarc(-mm(25) + mm(10), mm(8), mm(10), Math.PI, Math.PI/2, true);
    shape.lineTo(-mm(10), mm(22));
    shape.lineTo(mm(10), mm(22));
    shape.absarc(mm(25) - mm(10), mm(8), mm(10), Math.PI/2, 0, true);
    shape.lineTo(mm(25), mm(8));
    shape.lineTo(mm(25), 0);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mm(35),
      bevelEnabled: true,
      bevelSize: mm(0.8),
      bevelThickness: mm(0.8),
      bevelSegments: 6,
      curveSegments: 24,
    });
    g.translate(0, 0, -mm(35)/2);
    return g;
  }, []);

  // Finger pad — oval on top, tilted
  const padGeom = useMemo(() => {
    const shape = new THREE.Shape();
    const pw = mm(42), ph = mm(28), r = mm(10);
    shape.moveTo(-pw/2 + r, -ph/2);
    shape.lineTo(pw/2 - r, -ph/2);
    shape.absarc(pw/2 - r, -ph/2 + r, r, -Math.PI/2, 0, false);
    shape.lineTo(pw/2, ph/2 - r);
    shape.absarc(pw/2 - r, ph/2 - r, r, 0, Math.PI/2, false);
    shape.lineTo(-pw/2 + r, ph/2);
    shape.absarc(-pw/2 + r, ph/2 - r, r, Math.PI/2, Math.PI, false);
    shape.lineTo(-pw/2, -ph/2 + r);
    shape.absarc(-pw/2 + r, -ph/2 + r, r, Math.PI, Math.PI*1.5, false);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mm(6),
      bevelEnabled: true,
      bevelSize: mm(1.5),
      bevelThickness: mm(1.5),
      bevelSegments: 8,
      curveSegments: 32,
    });
    g.rotateX(Math.PI/2);
    g.translate(0, 0, mm(3));
    return g;
  }, []);

  return (
    <group>
      {/* Base plate */}
      <mesh geometry={basePlateGeom} position={[0, 0, 0]} castShadow receiveShadow>
        <primitive object={brassMaterial} attach="material" />
      </mesh>
      {/* Neck */}
      <mesh geometry={neckGeom} position={[0, mm(4), 0]} castShadow receiveShadow>
        <primitive object={brassMaterial} attach="material" />
      </mesh>
      {/* Finger pad */}
      <mesh geometry={padGeom} position={[0, mm(24), mm(8)]} rotation={[-Math.PI/8, 0, 0]} castShadow receiveShadow>
        <primitive object={brassMaterial} attach="material" />
      </mesh>
    </group>
  );
}

export default function FingerLiftPreview() {
  return (
    <div style={{ width: '100%', height: '500px', background: '#f5f5f0' }}>
      <Canvas shadows camera={{ position: [0.1, 0.05, 0.15], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[1, 2, 1]} intensity={1.5} castShadow />
        <directionalLight position={[-1, 1, -1]} intensity={0.5} />
        <Environment preset="studio" />
        <FingerLift />
        <OrbitControls autoRotate autoRotateSpeed={1.5} />
      </Canvas>
    </div>
  );
}
