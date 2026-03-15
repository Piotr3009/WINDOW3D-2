import React, { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';

const mm = (value) => value / 1000;

const EXT_BEAD_W = mm(9);
const EXT_BEAD_D = mm(15);
const INT_BEAD_W = mm(18);
const INT_BEAD_D = mm(14);
const INT_BEAD_R = mm(11);

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function shapeFromPoints(points) {
  const ordered = signedArea(points) < 0 ? [...points].reverse() : points;
  const shape = new THREE.Shape();
  shape.moveTo(ordered[0][0], ordered[0][1]);
  for (let i = 1; i < ordered.length; i += 1) {
    shape.lineTo(ordered[i][0], ordered[i][1]);
  }
  shape.closePath();
  return shape;
}

function buildCoreLocalProfile(memberSize, memberDepth) {
  return [
    [0, 0],
    [memberSize - EXT_BEAD_W, 0],
    [memberSize, EXT_BEAD_D],
    [memberSize, memberDepth - INT_BEAD_D],
    [memberSize - INT_BEAD_W, memberDepth - INT_BEAD_D],
    [memberSize - INT_BEAD_W, memberDepth],
    [0, memberDepth],
  ];
}

function buildOvoloSolidLocalPoints(samples = 20) {
  const points = [];
  const topFlat = INT_BEAD_W - INT_BEAD_R;
  const centerX = topFlat;
  const centerY = INT_BEAD_D - INT_BEAD_R;

  points.push([0, 0]);
  points.push([0, INT_BEAD_D]);
  points.push([topFlat, INT_BEAD_D]);

  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const angle = Math.PI / 2 - t * (Math.PI / 2);
    points.push([
      centerX + Math.cos(angle) * INT_BEAD_R,
      centerY + Math.sin(angle) * INT_BEAD_R,
    ]);
  }

  points.push([INT_BEAD_W, 0]);
  return points;
}

function mapStileUVToShape(u, v, memberWidth, memberDepth, openingSide, flip) {
  const x = openingSide === 'right'
    ? -memberWidth / 2 + u
    : memberWidth / 2 - u;

  const z = flip
    ? -memberDepth / 2 + v
    : memberDepth / 2 - v;

  return [x, -z];
}

function mapRailUVToShape(u, v, memberHeight, memberDepth, openingSide, flip) {
  const y = openingSide === 'bottom'
    ? memberHeight / 2 - u
    : -memberHeight / 2 + u;

  const z = flip
    ? -memberDepth / 2 + v
    : memberDepth / 2 - v;

  return [-z, y];
}

function FramePiece({ size, position, material, castShadow = true }) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function GlassReflections({ width, height, z = 0.008 }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[-width * 0.22, height * 0.1, 0]} rotation={[0, 0, -0.08]}>
        <planeGeometry args={[width * 0.12, height * 0.9]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <mesh position={[width * 0.18, 0, 0]} rotation={[0, 0, 0.04]}>
        <planeGeometry args={[width * 0.06, height * 0.82]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      <mesh position={[0, height * 0.28, 0]}>
        <planeGeometry args={[width * 0.7, height * 0.05]} />
        <meshBasicMaterial color="#dfefff" transparent opacity={0.035} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GlassPane({ size, position }) {
  const [w, h, d] = size;

  return (
    <group position={position}>
      <mesh castShadow={false} receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial
          color="#cfe3f5"
          roughness={0.015}
          metalness={0}
          transmission={0.985}
          transparent
          opacity={0.52}
          thickness={0.028}
          ior={1.52}
          clearcoat={1}
          clearcoatRoughness={0.01}
          reflectivity={0.9}
        />
      </mesh>

      <GlassReflections width={w} height={h} z={d / 2 + 0.001} />
    </group>
  );
}

function DimensionGuide({ from, to, label, offset = [0, 0, 0] }) {
  const mid = [
    (from[0] + to[0]) / 2 + offset[0],
    (from[1] + to[1]) / 2 + offset[1],
    (from[2] + to[2]) / 2 + offset[2],
  ];

  const points = [from, to].map((point) => new THREE.Vector3(point[0], point[1], point[2]));

  return (
    <group>
      <Line points={points} color="#22324a" lineWidth={1.25} transparent opacity={0.9} />
      <Text
        position={mid}
        fontSize={0.06}
        color="#22324a"
        anchorX="center"
        anchorY="middle"
        outlineColor="#f5f2ec"
        outlineWidth={0.008}
      >
        {label}
      </Text>
    </group>
  );
}

function SashStileCore({
  width,
  height,
  depth,
  openingSide = 'right',
  flip = false,
  position = [0, 0, 0],
  material,
}) {
  const geometry = useMemo(() => {
    const mw = mm(width);
    const mh = mm(height);
    const md = mm(depth);

    const points = buildCoreLocalProfile(mw, md).map(([u, v]) =>
      mapStileUVToShape(u, v, mw, md, openingSide, flip)
    );

    const shape = shapeFromPoints(points);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mh,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24,
    });

    g.rotateX(-Math.PI / 2);
    g.translate(0, -mh / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, openingSide, flip]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function SashRailCore({
  width,
  height,
  depth,
  openingSide = 'bottom',
  flip = false,
  position = [0, 0, 0],
  material,
}) {
  const geometry = useMemo(() => {
    const ml = mm(width);
    const mh = mm(height);
    const md = mm(depth);

    const points = buildCoreLocalProfile(mh, md).map(([u, v]) =>
      mapRailUVToShape(u, v, mh, md, openingSide, flip)
    );

    const shape = shapeFromPoints(points);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: ml,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24,
    });

    g.rotateY(Math.PI / 2);
    g.translate(-ml / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, openingSide, flip]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function ExternalStileBead({
  width,
  height,
  depth,
  openingSide = 'right',
  flip = false,
  position = [0, 0, 0],
  material,
}) {
  const geometry = useMemo(() => {
    const mw = mm(width);
    const mh = mm(height);
    const md = mm(depth);

    const extV = flip ? md : 0;
    const stepV = flip ? -EXT_BEAD_D : EXT_BEAD_D;

    const local = [
      [mw - EXT_BEAD_W, extV],
      [mw, extV],
      [mw, extV + stepV],
    ];

    const points = local.map(([u, v]) =>
      mapStileUVToShape(u, v, mw, md, openingSide, flip)
    );

    const shape = shapeFromPoints(points);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mh,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 12,
    });

    g.rotateX(-Math.PI / 2);
    g.translate(0, -mh / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, openingSide, flip]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function ExternalRailBead({
  width,
  height,
  depth,
  openingSide = 'bottom',
  flip = false,
  position = [0, 0, 0],
  material,
}) {
  const geometry = useMemo(() => {
    const ml = mm(width);
    const mh = mm(height);
    const md = mm(depth);

    const extV = flip ? md : 0;
    const stepV = flip ? -EXT_BEAD_D : EXT_BEAD_D;

    const local = [
      [mh - EXT_BEAD_W, extV],
      [mh, extV],
      [mh, extV + stepV],
    ];

    const points = local.map(([u, v]) =>
      mapRailUVToShape(u, v, mh, md, openingSide, flip)
    );

    const shape = shapeFromPoints(points);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: ml,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 12,
    });

    g.rotateY(Math.PI / 2);
    g.translate(-ml / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, openingSide, flip]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function InternalOvoloStileBead({
  width,
  height,
  depth,
  openingSide = 'right',
  flip = false,
  position = [0, 0, 0],
  material,
}) {
  const geometry = useMemo(() => {
    const mw = mm(width);
    const mh = mm(height);
    const md = mm(depth);

    const local = buildOvoloSolidLocalPoints().map(([u, v]) => [
      mw - INT_BEAD_W + u,
      md - INT_BEAD_D + v,
    ]);

    const points = local.map(([u, v]) =>
      mapStileUVToShape(u, v, mw, md, openingSide, flip)
    );

    const shape = shapeFromPoints(points);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mh,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 28,
    });

    g.rotateX(-Math.PI / 2);
    g.translate(0, -mh / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, openingSide, flip]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function InternalOvoloRailBead({
  width,
  height,
  depth,
  openingSide = 'bottom',
  flip = false,
  position = [0, 0, 0],
  material,
}) {
  const geometry = useMemo(() => {
    const ml = mm(width);
    const mh = mm(height);
    const md = mm(depth);

    const local = buildOvoloSolidLocalPoints().map(([u, v]) => [
      mh - INT_BEAD_W + u,
      md - INT_BEAD_D + v,
    ]);

    const points = local.map(([u, v]) =>
      mapRailUVToShape(u, v, mh, md, openingSide, flip)
    );

    const shape = shapeFromPoints(points);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: ml,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 28,
    });

    g.rotateY(Math.PI / 2);
    g.translate(-ml / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, depth, openingSide, flip]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function BottomRailLowerProfile({ width, height, depth, material }) {
  const geometry = useMemo(() => {
    const w = mm(width);
    const h = mm(height);
    const d = mm(depth);
    const rebateDepth = Math.min(mm(18), d * 0.32);
    const rebateRise = Math.min(mm(14), h * 0.22);

    const g = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -w / 2, -h / 2, d / 2,
       w / 2, -h / 2, d / 2,
       w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,

      -w / 2, -h / 2, d / 2,
       w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,
      -w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,

      -w / 2, -h / 2, -d / 2,
       w / 2, -h / 2 + rebateRise, -d / 2,
       w / 2, -h / 2, -d / 2,

      -w / 2, -h / 2, -d / 2,
      -w / 2, -h / 2 + rebateRise, -d / 2,
       w / 2, -h / 2 + rebateRise, -d / 2,

      -w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,
       w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,
       w / 2, -h / 2 + rebateRise, -d / 2,

      -w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,
       w / 2, -h / 2 + rebateRise, -d / 2,
      -w / 2, -h / 2 + rebateRise, -d / 2,

      -w / 2, -h / 2, d / 2,
      -w / 2, -h / 2, -d / 2,
      -w / 2, -h / 2 + rebateRise, -d / 2,

      -w / 2, -h / 2, d / 2,
      -w / 2, -h / 2 + rebateRise, -d / 2,
      -w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,

       w / 2, -h / 2, d / 2,
       w / 2, -h / 2 + rebateRise, -d / 2,
       w / 2, -h / 2, -d / 2,

       w / 2, -h / 2, d / 2,
       w / 2, -h / 2 + rebateRise, d / 2 - rebateDepth,
       w / 2, -h / 2 + rebateRise, -d / 2,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [width, height, depth]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function LowerBottomRail({ width, height, depth, yCenter, stileWidth, coreMaterial, extBeadMaterial, intBeadMaterial, flip = false }) {
  const extBeadWidth = width - stileWidth * 2 + 15 * 2;
  const intBeadWidth = width - stileWidth * 2 + 18 * 2;
  return (
    <group position={[0, yCenter, 0]}>
      <SashRailCore
        width={width}
        height={height}
        depth={depth}
        openingSide="top"
        flip={flip}
        position={[0, 0, 0]}
        material={coreMaterial}
      />
      <BottomRailLowerProfile
        width={width}
        height={height}
        depth={depth}
        material={coreMaterial}
      />
      <InternalOvoloRailBead
        width={intBeadWidth}
        height={height}
        depth={depth}
        openingSide="top"
        flip={flip}
        position={[0, 0, 0]}
        material={intBeadMaterial}
      />
    </group>
  );
}

const BAR_PATTERNS = {
  'none':        { h: 0, v: 0 },
  '2x2':        { h: 0, v: 1 },
  '3x3':        { h: 0, v: 2 },
  '4x4':        { h: 1, v: 1 },
  '6x6':        { h: 1, v: 2 },
  '9x9':        { h: 2, v: 2 },
};

function GlazingBars({ clearWidth, clearHeight, glassDepth, barPattern = 'none', material }) {
  const pattern = BAR_PATTERNS[barPattern] || BAR_PATTERNS['none'];
  const barW = mm(22);
  const barH = mm(16.5);
  const barTop = mm(2);
  const glassHalf = glassDepth / 2;

  const trapezoidGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-barW / 2, 0);
    shape.lineTo(-barTop / 2, barH);
    shape.lineTo(barTop / 2, barH);
    shape.lineTo(barW / 2, 0);
    shape.closePath();
    return shape;
  }, []);

  const trapezoidHGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -barW / 2);
    shape.lineTo(barH, -barTop / 2);
    shape.lineTo(barH, barTop / 2);
    shape.lineTo(0, barW / 2);
    shape.closePath();
    return shape;
  }, []);

  const vGeom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(trapezoidGeom, {
      depth: clearHeight + mm(18),
      bevelEnabled: false,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -(clearHeight + mm(18)) / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [clearHeight, trapezoidGeom]);

  const hGeom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(trapezoidHGeom, {
      depth: clearWidth + mm(18),
      bevelEnabled: false,
      steps: 1,
    });
    g.rotateY(Math.PI / 2);
    g.translate(-(clearWidth + mm(18)) / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [clearWidth, trapezoidHGeom]);

  const drop = mm(2);
  const sqH = mm(2);

  const ovoloIntShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-barW / 2, 0);
    shape.quadraticCurveTo(-barW / 2, barH - drop - sqH, -barTop / 2, barH - sqH);
    shape.lineTo(-barTop / 2, barH);
    shape.lineTo(barTop / 2, barH);
    shape.lineTo(barTop / 2, barH - sqH);
    shape.quadraticCurveTo(barW / 2, barH - drop - sqH, barW / 2, 0);
    shape.closePath();
    return shape;
  }, []);

  const ovoloIntHShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -barW / 2);
    shape.quadraticCurveTo(barH - drop - sqH, -barW / 2, barH - sqH, -barTop / 2);
    shape.lineTo(barH, -barTop / 2);
    shape.lineTo(barH, barTop / 2);
    shape.lineTo(barH - sqH, barTop / 2);
    shape.quadraticCurveTo(barH - drop - sqH, barW / 2, 0, barW / 2);
    shape.closePath();
    return shape;
  }, []);

  const vGeomInt = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(ovoloIntShape, {
      depth: clearHeight + mm(18),
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -(clearHeight + mm(18)) / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [clearHeight, ovoloIntShape]);

  const hGeomInt = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(ovoloIntHShape, {
      depth: clearWidth + mm(18),
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32,
    });
    g.rotateY(Math.PI / 2);
    g.translate(-(clearWidth + mm(18)) / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [clearWidth, ovoloIntHShape]);

  const bars = useMemo(() => {
    const items = [];
    const { h, v } = pattern;
    for (let i = 1; i <= v; i++) {
      const x = -clearWidth / 2 + (clearWidth / (v + 1)) * i;
      items.push({ type: 'v', x, y: 0 });
    }
    for (let i = 1; i <= h; i++) {
      const y = -clearHeight / 2 + (clearHeight / (h + 1)) * i;
      items.push({ type: 'h', x: 0, y });
    }
    return items;
  }, [clearWidth, clearHeight, pattern.h, pattern.v]);

  if (bars.length === 0) return null;

  return (
    <group>
      {bars.map((bar, i) => {
        const geom = bar.type === 'v' ? vGeom : hGeom;
        const geomInt = bar.type === 'v' ? vGeomInt : hGeomInt;
        return (
          <group key={i} position={[bar.x, bar.y, 0]}>
            {/* exterior side - trapez */}
            <mesh geometry={geomInt} position={[0, 0, -glassHalf]} rotation={[0, 0, 0]} castShadow receiveShadow>
              <primitive object={material} attach="material" />
            </mesh>
            {/* interior side - ovolo */}
            <mesh geometry={geom} position={[0, 0, glassHalf]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
              <primitive object={material} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Sash({
  width,
  height,
  depth,
  stileWidth,
  topRail,
  bottomRail,
  zOffset,
  yOffset,
  color = '#f6f4ef',
  profiledBottom = false,
  glassThickness = 24,
  flipChamfer = false,
  barPattern = 'none',
}) {
  const coreMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.46,
        metalness: 0.02,
        clearcoat: 0.24,
        clearcoatRoughness: 0.12,
      }),
    [color]
  );

  const externalBeadMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#00bcd4',
        roughness: 0.38,
        metalness: 0.04,
        clearcoat: 0.25,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  const internalBeadMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d81b60',
        roughness: 0.38,
        metalness: 0.04,
        clearcoat: 0.25,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  const w = mm(width);
  const h = mm(height);
  const d = mm(depth);
  const stile = mm(stileWidth);
  const top = mm(topRail);
  const bottom = mm(bottomRail);

  const clearWidth = Math.max(w - stile * 2, mm(80));
  const clearHeight = Math.max(h - top - bottom, mm(140));
  const glazingLineInsetFromGlass = mm(9);
  const glazingEdgeLineWidth = clearWidth + glazingLineInsetFromGlass * 2;
  const glazingEdgeLineHeight = clearHeight + glazingLineInsetFromGlass * 2;
  const glassD = mm(glassThickness);
  const glassCenterZ = 0;

  const topRailY = h / 2 - top / 2;
  const bottomRailY = -h / 2 + bottom / 2;
  const glassY = -h / 2 + bottom + clearHeight / 2;
  const glazingLineZ = flipChamfer ? -d / 2 - mm(0.3) : d / 2 + mm(0.3);

  return (
    <group position={[0, yOffset, zOffset]}>
      <SashStileCore
        width={stileWidth}
        height={height}
        depth={depth}
        openingSide="right"
        flip={flipChamfer}
        position={[-w / 2 + stile / 2, 0, 0]}
        material={coreMaterial}
      />
      <InternalOvoloStileBead
        width={stileWidth}
        height={height - topRail - bottomRail + 18 * 2}
        depth={depth}
        openingSide="right"
        flip={flipChamfer}
        position={[-w / 2 + stile / 2, glassY, 0]}
        material={internalBeadMaterial}
      />

      <SashStileCore
        width={stileWidth}
        height={height}
        depth={depth}
        openingSide="left"
        flip={flipChamfer}
        position={[w / 2 - stile / 2, 0, 0]}
        material={coreMaterial}
      />
      <InternalOvoloStileBead
        width={stileWidth}
        height={height - topRail - bottomRail + 18 * 2}
        depth={depth}
        openingSide="left"
        flip={flipChamfer}
        position={[w / 2 - stile / 2, glassY, 0]}
        material={internalBeadMaterial}
      />

      <SashRailCore
        width={width}
        height={topRail}
        depth={depth}
        openingSide="bottom"
        flip={flipChamfer}
        position={[0, topRailY, 0]}
        material={coreMaterial}
      />
      <InternalOvoloRailBead
        width={width - stileWidth * 2 + 18 * 2}
        height={topRail}
        depth={depth}
        openingSide="bottom"
        flip={flipChamfer}
        position={[0, topRailY, 0]}
        material={internalBeadMaterial}
      />

      {profiledBottom ? (
        <LowerBottomRail
          width={width}
          height={bottomRail}
          depth={depth}
          yCenter={bottomRailY}
          stileWidth={stileWidth}
          coreMaterial={coreMaterial}
          extBeadMaterial={externalBeadMaterial}
          intBeadMaterial={internalBeadMaterial}
          flip={flipChamfer}
        />
      ) : (
        <>
          <SashRailCore
            width={width}
            height={bottomRail}
            depth={depth}
            openingSide="top"
            flip={flipChamfer}
            position={[0, bottomRailY, 0]}
            material={coreMaterial}
          />
          <InternalOvoloRailBead
            width={width - stileWidth * 2 + 18 * 2}
            height={bottomRail}
            depth={depth}
            openingSide="top"
            flip={flipChamfer}
            position={[0, bottomRailY, 0]}
            material={internalBeadMaterial}
          />
        </>
      )}

      <GlassPane size={[clearWidth, clearHeight, glassD]} position={[0, glassY, glassCenterZ]} />
      <group position={[0, glassY, glassCenterZ]}>
        <GlazingBars
          clearWidth={clearWidth}
          clearHeight={clearHeight}
          glassDepth={glassD}
          barPattern={barPattern}
          material={coreMaterial}
        />
      </group>
    </group>
  );
}

function RoundedPartingBead({ length, orientation = 'vertical', material }) {
  const beadWidth = mm(8);
  const beadProjection = mm(17);
  const beadRadius = beadWidth / 2;
  const straightProjection = beadProjection - beadRadius;

  if (orientation === 'horizontal') {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, -straightProjection / 2, 0]}>
          <boxGeometry args={[length, straightProjection, beadWidth]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh castShadow receiveShadow position={[straightProjection / 2, 0, 0]}>
        <boxGeometry args={[straightProjection, length, beadWidth]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh castShadow receiveShadow position={[straightProjection, 0, 0]}>
        <cylinderGeometry args={[beadRadius, beadRadius, length, 24]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

function addRoundedRectPath(path, cx, cy, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  path.moveTo(cx - width / 2 + r, cy - height / 2);
  path.lineTo(cx + width / 2 - r, cy - height / 2);
  path.absarc(cx + width / 2 - r, cy - height / 2 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(cx + width / 2, cy + height / 2 - r);
  path.absarc(cx + width / 2 - r, cy + height / 2 - r, r, 0, Math.PI / 2, false);
  path.lineTo(cx - width / 2 + r, cy + height / 2);
  path.absarc(cx - width / 2 + r, cy + height / 2 - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(cx - width / 2, cy - height / 2 + r);
  path.absarc(cx - width / 2 + r, cy - height / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  path.closePath();
}

function addRectPath(path, cx, cy, width, height) {
  path.moveTo(cx - width / 2, cy - height / 2);
  path.lineTo(cx + width / 2, cy - height / 2);
  path.lineTo(cx + width / 2, cy + height / 2);
  path.lineTo(cx - width / 2, cy + height / 2);
  path.closePath();
}

function JambPulleyTestCutout({
  length,
  material,
  side = 'left',
  jambThickness = 28,
  jambDepth = 130,
  plateWidth = 25,
  plateHeight = 128,
  platePocketDepth = 3,
  wheelOpeningWidth = 9,
  wheelOpeningHeight = 44,
  yFromTop = 100,
  zCenter = 8.5,
}) {
  const frontGeometry = useMemo(() => {
    const faceWidth = mm(jambDepth);
    const faceHeight = mm(length);
    const frontDepth = mm(platePocketDepth);
    const holeCenterX = side === 'left' ? -mm(zCenter) : mm(zCenter);
    const holeCenterY = mm(length) / 2 - mm(yFromTop) - mm(plateHeight / 2);

    const shape = new THREE.Shape();
    addRectPath(shape, 0, 0, faceWidth, faceHeight);

    const hole = new THREE.Path();
    addRoundedRectPath(hole, holeCenterX, holeCenterY, mm(plateWidth), mm(plateHeight), mm(plateWidth / 2));
    shape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: frontDepth,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32,
    });

    g.translate(0, 0, -frontDepth / 2);
    g.rotateY(side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, [length, material, side, jambDepth, platePocketDepth, zCenter, yFromTop, plateWidth, plateHeight]);

  const backGeometry = useMemo(() => {
    const faceWidth = mm(jambDepth);
    const faceHeight = mm(length);
    const backDepth = mm(jambThickness - platePocketDepth);
    const holeCenterX = side === 'left' ? -mm(zCenter) : mm(zCenter);
    const holeCenterY = mm(length) / 2 - mm(yFromTop) - mm(plateHeight / 2);

    const shape = new THREE.Shape();
    addRectPath(shape, 0, 0, faceWidth, faceHeight);

    const hole = new THREE.Path();
    addRectPath(hole, holeCenterX, holeCenterY, mm(wheelOpeningWidth), mm(wheelOpeningHeight));
    shape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: backDepth,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 16,
    });

    g.translate(0, 0, -backDepth / 2);
    g.rotateY(side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, [length, side, jambDepth, jambThickness, platePocketDepth, zCenter, yFromTop, plateHeight, wheelOpeningWidth, wheelOpeningHeight]);

  const frontCenterX = side === 'left'
    ? mm(jambThickness / 2 - platePocketDepth / 2)
    : mm(-jambThickness / 2 + platePocketDepth / 2);

  const backCenterX = side === 'left'
    ? mm(-platePocketDepth / 2)
    : mm(platePocketDepth / 2);

  return (
    <group>
      <mesh geometry={frontGeometry} position={[frontCenterX, 0, 0]} castShadow receiveShadow>
        <primitive object={material} attach="material" />
      </mesh>
      <mesh geometry={backGeometry} position={[backCenterX, 0, 0]} castShadow receiveShadow>
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

function PulleyPlatePreview({ position = [0, 0, 0], width = 25, height = 128, thickness = 3, material, cornerRadius = 12.5, rotation = [0, 0, 0] }) {
  const geometry = useMemo(() => {
    const w = mm(width);
    const h = mm(height);
    const d = mm(thickness);
    const holeW = mm(10);
    const holeH = mm(46);
    const r = Math.min(mm(cornerRadius), w / 2, h / 2);

    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w / 2, h / 2 - r);
    shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(-holeW / 2, -holeH / 2);
    hole.lineTo(holeW / 2, -holeH / 2);
    hole.lineTo(holeW / 2, holeH / 2);
    hole.lineTo(-holeW / 2, holeH / 2);
    hole.closePath();
    shape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32,
    });

    g.translate(0, 0, -d / 2);
    g.computeVertexNormals();
    return g;
  }, [width, height, thickness, cornerRadius]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function FrontFaceMarker() {
  return null;
}

function AxesGizmo({ origin = [0, 0, 0], size = 80 }) {
  const s = mm(size);
  return (
    <group>
      <Line points={[origin, [origin[0] + s, origin[1], origin[2]]]} color="#d32f2f" lineWidth={2} />
      <Text position={[origin[0] + s + mm(8), origin[1], origin[2]]} fontSize={0.03} color="#d32f2f" anchorX="center" anchorY="middle">X</Text>

      <Line points={[origin, [origin[0], origin[1] + s, origin[2]]]} color="#00c853" lineWidth={2} />
      <Text position={[origin[0], origin[1] + s + mm(8), origin[2]]} fontSize={0.03} color="#00c853" anchorX="center" anchorY="middle">Y</Text>

      <Line points={[origin, [origin[0], origin[1], origin[2] + s]]} color="#2962ff" lineWidth={2} />
      <Text position={[origin[0], origin[1], origin[2] + s + mm(8)]} fontSize={0.03} color="#2962ff" anchorX="center" anchorY="middle">Z</Text>
    </group>
  );
}

function PulleyWheelPreview({
  position = [0, 0, 0],
  diameter = 42,
  thickness = 7,
  material,
  orientation = [0, 0, 0],
  spin = 0,
  grooveWidth = 6,
  axleDiameter = 8,
}) {
  const capMaterial = useMemo(() => {
    const m = material.clone();
    m.side = THREE.DoubleSide;
    return m;
  }, [material]);

  const tyreGeometry = useMemo(() => {
    const radius = mm(diameter / 2);
    const halfT = mm(thickness / 2);
    const grooveHalf = mm(grooveWidth / 2);
    const grooveDepth = Math.min(mm(2.2), radius * 0.18);
    const hubRadius = mm(axleDiameter / 2 + 2);

    const points = [
      new THREE.Vector2(radius, -halfT),
      new THREE.Vector2(radius, -grooveHalf),
      new THREE.Vector2(radius - grooveDepth, 0),
      new THREE.Vector2(radius, grooveHalf),
      new THREE.Vector2(radius, halfT),
      new THREE.Vector2(hubRadius, halfT),
      new THREE.Vector2(hubRadius, -halfT),
    ];

    const g = new THREE.LatheGeometry(points, 64);
    g.computeVertexNormals();
    return g;
  }, [diameter, thickness, grooveWidth, axleDiameter]);

  const capGeometry = useMemo(() => {
    const radius = mm(diameter / 2);
    const grooveDepth = Math.min(mm(2.2), radius * 0.18);
    const capRadius = radius - grooveDepth;
    const g = new THREE.CircleGeometry(capRadius, 48);
    g.computeVertexNormals();
    return g;
  }, [diameter]);

  const halfT = mm(thickness / 2);

  return (
    <group position={position} rotation={orientation}>
      <group rotation={[0, spin, 0]}>
        <mesh geometry={tyreGeometry} castShadow receiveShadow>
          <primitive object={material} attach="material" />
        </mesh>

        <mesh geometry={capGeometry} position={[0, -halfT, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <primitive object={capMaterial} attach="material" />
        </mesh>

        <mesh geometry={capGeometry} position={[0, halfT, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <primitive object={capMaterial} attach="material" />
        </mesh>

        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[mm(axleDiameter / 2), mm(axleDiameter / 2), mm(thickness + 1), 32]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function CordPreview({ points, ropeRadius = 2.2, stripeOffset = 0 }) {
  const curve = useMemo(() => {
    const vectors = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.01);
  }, [points]);

  const ropeGeometry = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, 140, mm(ropeRadius), 16, false);
    g.computeVertexNormals();
    return g;
  }, [curve, ropeRadius]);

  const stripePositions = useMemo(() => {
    const count = 14;
    return Array.from({ length: count }, (_, i) => {
      const raw = ((i + 1) / (count + 1) + stripeOffset) % 1;
      return raw < 0 ? raw + 1 : raw;
    });
  }, [stripeOffset]);

  return (
    <group>
      <mesh geometry={ropeGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f3f1eb" roughness={0.88} metalness={0} clearcoat={0.02} />
      </mesh>

      {stripePositions.map((t, index) => {
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

        return (
          <mesh key={index} position={[pos.x, pos.y, pos.z]} quaternion={quat} castShadow={false} receiveShadow>
            <torusGeometry args={[mm(ropeRadius * 1.05), mm(0.45), 8, 20]} />
            <meshPhysicalMaterial color="#8a8f96" roughness={0.9} metalness={0} />
          </mesh>
        );
      })}
    </group>
  );
}

function buildPulleyCordPoints({ center, radius, leftDropY, rightDropY, z, arcSteps = 16 }) {
  const [cx, cy] = center;
  const points = [];

  points.push([cx + radius, rightDropY, z]);
  points.push([cx + radius, cy, z]);

  for (let i = 0; i <= arcSteps; i += 1) {
    const t = i / arcSteps;
    const angle = t * Math.PI;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push([x, y, z]);
  }

  points.push([cx - radius, cy, z]);
  points.push([cx - radius, leftDropY, z]);

  return points;
}

function WeightPreview({ position = [0, 0, 0], size = 45, height = 180 }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[mm(size), mm(height), mm(size)]} />
      <meshPhysicalMaterial color="#77746d" roughness={0.82} metalness={0.18} clearcoat={0.04} />
    </mesh>
  );
}

function PulleySet({
  x = 0,
  y = 0,
  z = mm(-13.5),
  travel = 0,
  material,
  showMarker = true,
  showAxes = true,
  plateOffsetX = mm(-10),
  mirrorX = false,
  weightStartY = -mm(646),
}) {
  const pulleyCordRadius = mm(18.8);
  const pulleyTravel = mm(travel);

  const cordPoints = buildPulleyCordPoints({
    center: [0, 0],
    radius: pulleyCordRadius,
    leftDropY: -mm(120) - pulleyTravel,
    rightDropY: -mm(556) + pulleyTravel,
    z: 0,
  });

  const pulleyRotation = -pulleyTravel / pulleyCordRadius;
  const stripeOffset = travel / 180;

  return (
    <group position={[x, y, z]} scale={[mirrorX ? -1 : 1, 1, 1]}>
      <PulleyPlatePreview
        position={[plateOffsetX - mm(0.25), 0, 0]}
        width={25}
        height={128}
        thickness={3}
        material={material}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {showMarker && (
        <FrontFaceMarker
          position={[plateOffsetX, 0, 0]}
          width={25}
          height={128}
          thickness={3}
          rotation={[0, -Math.PI / 2, 0]}
        />
      )}

      {showAxes && <AxesGizmo origin={[mm(40), -mm(40), 0]} size={70} />}

      <PulleyWheelPreview
        position={[0, 0, 0]}
        diameter={42}
        thickness={7}
        material={material}
        orientation={[Math.PI / 2, 0, 0]}
        spin={pulleyRotation}
      />

      <CordPreview points={cordPoints} stripeOffset={stripeOffset} />

      <WeightPreview position={[pulleyCordRadius, weightStartY + pulleyTravel, 0]} size={45} height={180} />
    </group>
  );
}

function JambWithPartingBead({
  length,
  position,
  material,
  beadMaterial,
  orientation = 'vertical',
  side = 'left',
  showBead = true,
  beadLength = null,
  beadYOffset = 0,
  showPulleyTestCutout = false,
  pulleyCutoutYFromTop = 100,
  pulleyCutoutZCenter = 8.5,
  pulleyMaterial = null,
  pulleyUpperTravel = 0,
  pulleyLowerTravel = 0,
  weightStartY = -mm(646),
}) {
  const jambDepth = mm(130);
  const jambThickness = mm(28);

  if (orientation === 'horizontal') {
    return (
      <group position={position}>
        <FramePiece
          size={[length, jambThickness, jambDepth]}
          position={[0, 0, 0]}
          material={material}
        />

        {showBead && (
          <group position={[0, -jambThickness / 2, 0]}>
            <RoundedPartingBead length={length} orientation="horizontal" material={beadMaterial} />
          </group>
        )}
      </group>
    );
  }

  const beadX = side === 'left' ? jambThickness / 2 : -jambThickness / 2;
  const actualBeadLength = beadLength ?? length;
  const pulleyLocalY = length / 2 - mm(pulleyCutoutYFromTop) - mm(128 / 2);
  const pulleyLocalX = side === 'left' ? mm(2.5) : mm(-2.5);
  const pulleyMirrorX = side === 'left';

  return (
    <group position={position}>
      {showPulleyTestCutout ? (
        <>
          <JambPulleyTestCutout
            length={length * 1000}
            material={material}
            side={side}
            jambThickness={28}
            jambDepth={130}
            plateWidth={25}
            plateHeight={128}
            platePocketDepth={3}
            wheelOpeningWidth={9}
            wheelOpeningHeight={44}
            yFromTop={pulleyCutoutYFromTop}
            zCenter={pulleyCutoutZCenter}
          />
          <JambPulleyTestCutout
            length={length * 1000}
            material={material}
            side={side}
            jambThickness={28}
            jambDepth={130}
            plateWidth={25}
            plateHeight={128}
            platePocketDepth={3}
            wheelOpeningWidth={9}
            wheelOpeningHeight={44}
            yFromTop={pulleyCutoutYFromTop}
            zCenter={-pulleyCutoutZCenter}
          />
        </>
      ) : (
        <FramePiece
          size={[jambThickness, length, jambDepth]}
          position={[0, 0, 0]}
          material={material}
        />
      )}

      {showPulleyTestCutout && pulleyMaterial && (
        <>
          <PulleySet
            x={pulleyLocalX}
            y={pulleyLocalY}
            z={mm(pulleyCutoutZCenter)}
            travel={pulleyUpperTravel}
            material={pulleyMaterial}
            showMarker={false}
            showAxes={false}
            plateOffsetX={mm(-10)}
            mirrorX={pulleyMirrorX}
            weightStartY={weightStartY}
          />
          <PulleySet
            x={pulleyLocalX}
            y={pulleyLocalY}
            z={-mm(pulleyCutoutZCenter)}
            travel={pulleyLowerTravel}
            material={pulleyMaterial}
            showMarker={false}
            showAxes={false}
            plateOffsetX={mm(-10)}
            mirrorX={pulleyMirrorX}
            weightStartY={weightStartY}
          />
        </>
      )}

      {showBead && (
        <group
          position={[beadX, beadYOffset, 0]}
          rotation={[0, 0, side === 'left' ? 0 : Math.PI]}
        >
          <RoundedPartingBead length={actualBeadLength} orientation="vertical" material={beadMaterial} />
        </group>
      )}
    </group>
  );
}

function ExternalBoxElement({ height, side = 'right', position }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(mm(20), 0);
    shape.lineTo(mm(20), mm(60));
    shape.absarc(mm(0), mm(60), mm(20), 0, Math.PI / 2, false);
    shape.lineTo(0, height);
    shape.lineTo(mm(100), height);
    shape.lineTo(mm(100), 0);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mm(17),
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24,
    });

    g.computeVertexNormals();
    return g;
  }, [height]);

  const extMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#c8a96e',
    roughness: 0.5,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.12,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }), []);

  return (
    <group
      position={position}
      scale={[side === 'left' ? -1 : 1, 1, 1]}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <primitive object={extMaterial} attach="material" />
      </mesh>
      <AxesGizmo origin={[0, 0, 0]} size={120} />
    </group>
  );
}

function InternalBoxElement({ height, side = 'right', position }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, height);
    shape.lineTo(mm(80), height);
    shape.lineTo(mm(80), 0);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mm(17),
      bevelEnabled: false,
      steps: 1,
    });

    g.computeVertexNormals();
    return g;
  }, [height]);

  const intMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#e8c49a',
    roughness: 0.5,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.12,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }), []);

  return (
    <group position={position} scale={[side === 'left' ? -1 : 1, 1, 1]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <primitive object={intMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function StaffBeadHorizontal({ width, position, flipZ = false }) {
  const geometry = useMemo(() => {
    const r = mm(8.5);
    const bw = mm(17);
    const bh = mm(17);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, bh);
    shape.lineTo(bw - r, bh);
    shape.absarc(bw - r, bh / 2, r, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(0, 0);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24,
    });

    g.rotateY(Math.PI / 2);
    g.translate(-width / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [width]);

  const staffMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1565c0',
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
  }), []);

  return (
    <group position={position} scale={[1, 1, flipZ ? -1 : 1]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <primitive object={staffMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function StaffBead({ height, position, side = 'right' }) {
  const geometry = useMemo(() => {
    const r = mm(8.5);
    const w = mm(17);
    const h = mm(17);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, h);
    shape.lineTo(w - r, h);
    shape.absarc(w - r, h / 2, r, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(0, 0);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24,
    });

    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, [height]);

  const staffMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1565c0',
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
  }), []);

  return (
    <group position={position} rotation={[0, Math.PI, 0]} scale={[side === 'left' ? -1 : 1, 1, 1]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <primitive object={staffMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function TraditionalSill({ width, position, material }) {
  const sillExtension = 52;
  const totalWidth = width + sillExtension * 2;

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();

    shape.moveTo(mm(0), mm(29.143));
    shape.lineTo(mm(0), mm(58.414));
    shape.lineTo(mm(111.007), mm(58.414));
    shape.lineTo(mm(164.003), mm(58.414));
    shape.lineTo(mm(164.003), mm(0));
    shape.lineTo(mm(120.997), mm(0));
    shape.lineTo(mm(118.013), mm(3.005));
    shape.lineTo(mm(118.013), mm(12.0));
    shape.lineTo(mm(2.646), mm(26.18));

    shape.absarc(
      mm(3.016),
      mm(29.133),
      mm(2.995),
      THREE.MathUtils.degToRad(263.002),
      THREE.MathUtils.degToRad(180.0),
      true
    );

    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: mm(totalWidth),
      bevelEnabled: false,
      steps: 1,
    });

    g.rotateY(Math.PI / 2);
    g.scale(1, -1, 1);
    g.translate(mm(-totalWidth / 2), mm(29.207), mm(164 / 2));
    g.computeVertexNormals();

    return g;
  }, [totalWidth]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default function ParametricSashWindow({
  width = 1200,
  height = 1800,
  boxDepth = 164,
  sashDepth = 57,
  opening = 0,
  upperOpening = 0,
  showGuides = true,
  upperBars = 'none',
  lowerBars = 'none',
  pulleyDemoTravel = 0,
}) {
  const jambMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#2e7d32',
        roughness: 0.4,
        metalness: 0.03,
        clearcoat: 0.32,
        clearcoatRoughness: 0.11,
      }),
    []
  );

  const beadMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#e65100',
        roughness: 0.5,
        metalness: 0.02,
        clearcoat: 0.18,
        clearcoatRoughness: 0.14,
      }),
    []
  );

  const sillMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#c62828',
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.22,
        clearcoatRoughness: 0.12,
        side: THREE.DoubleSide,
      }),
    []
  );

  const pulleyPlateMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#c9a227',
        roughness: 0.34,
        metalness: 0.82,
        clearcoat: 0.18,
        clearcoatRoughness: 0.14,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    []
  );

  const config = {
    jambDepth: 130,
    jambThickness: 28,
    partingBeadWidth: 8,
    partingBeadProjection: 17,
    sideGap: 3,
    topGap: 3,
    bottomGap: 3,
    stileWidth: 57,
    upperTopRail: 57,
    upperMeetingRail: 43,
    lowerMeetingRail: 43,
    lowerBottomRail: 90,
    interSashGap: 11.5,
    glassUnitThickness: 24,
    sillVisibleHeight: 58.414,
  };

  const w = mm(width);
  const h = mm(height);
  const bd = mm(boxDepth);

  const jambThickness = mm(config.jambThickness);
  const sillVisibleHeight = mm(config.sillVisibleHeight);
  const jambEmbedIntoSill = mm(23);

  const innerTopY = h / 2 + sillVisibleHeight - jambEmbedIntoSill - jambThickness;
  const sillTopY = -h / 2 + sillVisibleHeight;
  const innerW = Math.max(w - jambThickness * 2, mm(200));

  const sashWidth = innerW * 1000 - config.sideGap * 2;

  const upperVisibleTopY = innerTopY - mm(config.topGap);
  const lowerVisibleBottomY = sillTopY + mm(config.bottomGap);

  const availableHeight = upperVisibleTopY - lowerVisibleBottomY;
  const meetingY = lowerVisibleBottomY + availableHeight / 2;

  const upperSashHeight = (upperVisibleTopY - meetingY) * 1000 + config.upperMeetingRail / 2;
  const lowerSashHeight = (meetingY - lowerVisibleBottomY) * 1000 + config.lowerMeetingRail / 2;

  const upperH = mm(upperSashHeight);
  const lowerH = mm(lowerSashHeight);

  const yTopClosed = upperVisibleTopY - upperH / 2;
  const yBottomClosed = lowerVisibleBottomY + lowerH / 2;

  const maxLift = Math.max(0, (meetingY - lowerVisibleBottomY) * 1000 - 120);
  const lowerOpeningLift = Math.min(opening, maxLift);
  const upperOpeningDrop = Math.min(upperOpening, maxLift);

  const sashCenterOffset = mm((sashDepth + config.interSashGap) / 2);
  const trackFrontZ = -sashCenterOffset;
  const trackRearZ = sashCenterOffset;

  const pulleyCutoutZCenter = config.jambDepth / 2 - (config.jambDepth - config.partingBeadProjection) / 4;
  const upperPulleyTravel = upperOpeningDrop;
  const lowerPulleyTravel = -lowerOpeningLift;

  const jambOriginY = sillVisibleHeight - jambEmbedIntoSill;
  const meetingY_inJamb = meetingY - jambOriginY;
  const pulleyLocalY_calc = h / 2 - mm(100) - mm(64);
  const weightStartY = meetingY_inJamb - pulleyLocalY_calc;

  return (
    <group>
      <JambWithPartingBead
        length={h}
        position={[-w / 2 + jambThickness / 2, sillVisibleHeight - jambEmbedIntoSill, 0]}
        material={jambMaterial}
        beadMaterial={beadMaterial}
        side="left"
        beadLength={h - jambThickness}
        beadYOffset={jambThickness / 2}
        showPulleyTestCutout={true}
        pulleyCutoutYFromTop={100}
        pulleyCutoutZCenter={pulleyCutoutZCenter}
        pulleyMaterial={pulleyPlateMaterial}
        pulleyUpperTravel={upperPulleyTravel}
        pulleyLowerTravel={lowerPulleyTravel}
        weightStartY={weightStartY}
      />

      <JambWithPartingBead
        length={h}
        position={[w / 2 - jambThickness / 2, sillVisibleHeight - jambEmbedIntoSill, 0]}
        material={jambMaterial}
        beadMaterial={beadMaterial}
        side="right"
        beadLength={h - jambThickness}
        beadYOffset={jambThickness / 2}
        showPulleyTestCutout={true}
        pulleyCutoutYFromTop={100}
        pulleyCutoutZCenter={pulleyCutoutZCenter}
        pulleyMaterial={pulleyPlateMaterial}
        pulleyUpperTravel={upperPulleyTravel}
        pulleyLowerTravel={lowerPulleyTravel}
        weightStartY={weightStartY}
      />

      <JambWithPartingBead
        length={w + mm(104)}
        position={[0, h / 2 - jambThickness / 2 + sillVisibleHeight - jambEmbedIntoSill, 0]}
        material={jambMaterial}
        beadMaterial={beadMaterial}
        orientation="horizontal"
        showBead={true}
      />

      <TraditionalSill
        width={width}
        position={[0, -h / 2 + sillVisibleHeight / 2, 0]}
        material={sillMaterial}
      />

      <ExternalBoxElement
        height={h + mm(52)}
        side="right"
        position={[w / 2 - mm(100) + mm(52), jambOriginY - h / 2, bd / 2 - mm(17)]}
      />
      <ExternalBoxElement
        height={h + mm(52)}
        side="left"
        position={[-w / 2 + mm(100) - mm(52), jambOriginY - h / 2, bd / 2 - mm(17)]}
      />

      <StaffBeadHorizontal
        width={w + mm(104) - mm(160)}
        position={[0, jambOriginY - h / 2 + jambEmbedIntoSill, -bd / 2 + mm(80) - mm(65) - mm(17) - mm(17) + mm(34)]}
        flipZ={false}
      />
      <StaffBeadHorizontal
        width={w + mm(104) - mm(160)}
        position={[0, jambOriginY + h / 2 + mm(52) - mm(80) - mm(17), -bd / 2 + mm(80) - mm(65) - mm(17)]}
        flipZ={true}
      />

      <StaffBead
        height={h + mm(52) - jambEmbedIntoSill - mm(80)}
        side="right"
        position={[w / 2 + mm(52) - mm(80), jambOriginY - h / 2 + jambEmbedIntoSill, -bd / 2 + mm(80) - mm(65) - mm(17)]}
      />
      <StaffBead
        height={h + mm(52) - jambEmbedIntoSill - mm(80)}
        side="left"
        position={[-w / 2 - mm(52) + mm(80), jambOriginY - h / 2 + jambEmbedIntoSill, -bd / 2 + mm(80) - mm(65) - mm(17)]}
      />
      <InternalBoxElement
        height={h + mm(52) - jambEmbedIntoSill}
        side="right"
        position={[w / 2 + mm(52) - mm(80), jambOriginY - h / 2 + jambEmbedIntoSill, -bd / 2]}
      />
      <InternalBoxElement
        height={h + mm(52) - jambEmbedIntoSill}
        side="left"
        position={[-w / 2 - mm(52) + mm(80), jambOriginY - h / 2 + jambEmbedIntoSill, -bd / 2]}
      />
      <mesh
        position={[0, jambOriginY + h / 2 + mm(52) - mm(40), -bd / 2 + mm(8.5)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w + mm(104) - mm(160), mm(80), mm(17)]} />
        <meshPhysicalMaterial
          color="#e8c49a"
          roughness={0.5}
          metalness={0.0}
          clearcoat={0.2}
          clearcoatRoughness={0.12}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      <mesh
        position={[0, jambOriginY + h / 2 + mm(50) - mm(48), bd / 2 - mm(8.5)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w - mm(96), mm(100), mm(17)]} />
        <meshPhysicalMaterial
          color="#c8a96e"
          roughness={0.5}
          metalness={0.0}
          clearcoat={0.2}
          clearcoatRoughness={0.12}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      <Sash
        width={sashWidth}
        height={upperSashHeight}
        depth={sashDepth}
        stileWidth={config.stileWidth}
        topRail={config.upperTopRail}
        bottomRail={config.upperMeetingRail}
        zOffset={trackRearZ}
        yOffset={yTopClosed - mm(upperOpeningDrop)}
        color="#f9a825"
        glassThickness={config.glassUnitThickness}
        flipChamfer={false}
        barPattern={upperBars}
      />

      <Sash
        width={sashWidth}
        height={lowerSashHeight}
        depth={sashDepth}
        stileWidth={config.stileWidth}
        topRail={config.lowerMeetingRail}
        bottomRail={config.lowerBottomRail}
        zOffset={trackFrontZ}
        yOffset={yBottomClosed + mm(lowerOpeningLift)}
        color="#7b1fa2"
        profiledBottom={true}
        glassThickness={config.glassUnitThickness}
        flipChamfer={false}
        barPattern={lowerBars}
      />

      {showGuides && (
        <group>
          <DimensionGuide
            from={[-w / 2, h / 2 + 0.18, 0]}
            to={[w / 2, h / 2 + 0.18, 0]}
            label={`${Math.round(width)} mm`}
            offset={[0, 0.07, 0]}
          />
          <DimensionGuide
            from={[w / 2 + 0.18, -h / 2 - sillVisibleHeight, 0]}
            to={[w / 2 + 0.18, h / 2, 0]}
            label={`${Math.round(height)} mm`}
            offset={[0.09, 0, 0]}
          />
          <DimensionGuide
            from={[-w / 2 - 0.22, 0, -bd / 2]}
            to={[-w / 2 - 0.22, 0, bd / 2]}
            label={`${Math.round(boxDepth)} mm`}
            offset={[-0.1, 0, 0]}
          />
        </group>
      )}
    </group>
  );
}