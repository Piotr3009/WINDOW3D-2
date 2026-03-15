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

const RAL_COLORS = {
  '1000': '#BEBD7F', '1001': '#C2B078', '1002': '#C6A664', '1003': '#E5BE01',
  '1004': '#CDA434', '1005': '#A98307', '1006': '#E4A010', '1007': '#DC9D00',
  '1011': '#8A6642', '1012': '#C7B446', '1013': '#EAE6CA', '1014': '#E1CC4F',
  '1015': '#E6D690', '1016': '#EDFF21', '1017': '#F5D033', '1018': '#F8F32B',
  '1019': '#9E9764', '1020': '#999950', '1021': '#F3DA0B', '1023': '#FAD201',
  '1024': '#AEA04B', '1026': '#FFFF00', '1027': '#9D9101', '1028': '#F4A900',
  '1032': '#D6AE01', '1033': '#F3A505', '1034': '#EFA94A', '1035': '#6A5D4D',
  '1036': '#705335', '1037': '#F39F18', '2000': '#ED760E', '2001': '#C93C20',
  '2002': '#CB2821', '2003': '#FF7514', '2004': '#F44611', '2005': '#FF2301',
  '2007': '#FFA420', '2008': '#F75E25', '2009': '#F54021', '2010': '#D84B20',
  '2011': '#EC7C26', '2012': '#E55137', '2013': '#C35831', '3000': '#AF2B1E',
  '3001': '#A52019', '3002': '#A2231D', '3003': '#9B111E', '3004': '#75151E',
  '3005': '#5E2129', '3007': '#412227', '3009': '#642424', '3011': '#781F19',
  '3012': '#C1876B', '3013': '#A12312', '3014': '#D36E70', '3015': '#EA899A',
  '3016': '#B32821', '3017': '#E63244', '3018': '#D53032', '3020': '#CC0605',
  '3022': '#D95030', '3024': '#F80000', '3026': '#FE0000', '3027': '#C51D34',
  '3028': '#CB3234', '3031': '#B32428', '3032': '#721422', '3033': '#B44C43',
  '4001': '#6D3F5B', '4002': '#922B3E', '4003': '#DE4C8A', '4004': '#641C34',
  '4005': '#6C4675', '4006': '#A03472', '4007': '#4A192C', '4008': '#924E7D',
  '4009': '#A18594', '4010': '#CF3476', '4011': '#8673A1', '4012': '#6C6874',
  '5000': '#354D73', '5001': '#1F3438', '5002': '#20214F', '5003': '#1D1E33',
  '5004': '#18171C', '5005': '#1E2460', '5007': '#3E5F8A', '5008': '#26252D',
  '5009': '#025669', '5010': '#0E4243', '5011': '#1B2A4A', '5012': '#3B83BD',
  '5013': '#1E213D', '5014': '#606E8C', '5015': '#2271B3', '5017': '#063971',
  '5018': '#3F888F', '5019': '#1B5583', '5020': '#1D334A', '5021': '#256D7B',
  '5022': '#252850', '5023': '#49678D', '5024': '#5D9B9B', '5025': '#2A6478',
  '5026': '#102C54', '6000': '#316650', '6001': '#287233', '6002': '#2D572C',
  '6003': '#424632', '6004': '#1F3A3D', '6005': '#2F4538', '6006': '#3E3B32',
  '6007': '#343B29', '6008': '#39352A', '6009': '#31372B', '6010': '#35682D',
  '6011': '#587246', '6012': '#343E40', '6013': '#6C7156', '6014': '#47402E',
  '6015': '#3B3C36', '6016': '#1E5945', '6017': '#4C9141', '6018': '#57A639',
  '6019': '#BDECB6', '6020': '#2E3A23', '6021': '#89AC76', '6022': '#25221B',
  '6024': '#308446', '6025': '#3D6B35', '6026': '#1C542D', '6027': '#83C491',
  '6028': '#2B5B34', '6029': '#20603D', '6032': '#317F43', '6033': '#497E76',
  '6034': '#7FB5B5', '6035': '#1C542D', '6036': '#193737', '6037': '#008F39',
  '6038': '#00BB2D', '7000': '#78858B', '7001': '#8A9597', '7002': '#817F68',
  '7003': '#7D7F7D', '7004': '#9EA0A1', '7005': '#6C7059', '7006': '#756F61',
  '7008': '#6A5F31', '7009': '#4D5645', '7010': '#4C514A', '7011': '#434B4D',
  '7012': '#4E5754', '7013': '#464531', '7015': '#434750', '7016': '#293133',
  '7021': '#23282B', '7022': '#332F2C', '7023': '#8B8C7A', '7024': '#474A51',
  '7026': '#2F353B', '7030': '#8B8B7A', '7031': '#474B4E', '7032': '#B8B799',
  '7033': '#7D8471', '7034': '#8F8B66', '7035': '#D7D7D7', '7036': '#7F7679',
  '7037': '#7D7F7D', '7038': '#B5B8B1', '7039': '#6C6960', '7040': '#9DA1AA',
  '7042': '#8D948D', '7043': '#4E5452', '7044': '#CAC4B0', '7045': '#909090',
  '7046': '#82898F', '7047': '#D0D0D0', '7048': '#898176', '8000': '#826C34',
  '8001': '#955F20', '8002': '#6C3B2A', '8003': '#734222', '8004': '#8E402A',
  '8007': '#59351F', '8008': '#6F4F28', '8009': '#5B3A29', '8010': '#592321',
  '8011': '#6F3B2A', '8012': '#6D3525', '8014': '#382C1E', '8015': '#633A34',
  '8016': '#4C2F27', '8017': '#45322E', '8019': '#403A3A', '8022': '#212121',
  '8023': '#A65E2E', '8024': '#79553D', '8025': '#755C48', '8028': '#4E3B31',
  '8029': '#763C28', '9001': '#FDF4E3', '9002': '#E7EBDA', '9003': '#F4F4F4',
  '9004': '#282828', '9005': '#0A0A0A', '9006': '#A5A5A5', '9007': '#8F8F8F',
  '9010': '#FFFFFF', '9011': '#1C2023', '9016': '#F6F6F6', '9017': '#1E1E1E',
  '9018': '#D7D7D7', '9022': '#9E9E9E', '9023': '#828282',
};

function RalInput({ onColor }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  const apply = () => {
    const key = val.trim().replace(/^ral\s*/i, '');
    const hex = RAL_COLORS[key];
    if (hex) {
      onColor(hex);
      setErr('');
    } else {
      setErr('Unknown RAL');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="e.g. 7016"
        value={val}
        onChange={(e) => { setVal(e.target.value); setErr(''); }}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)' }}
      />
      <button onClick={apply} style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Apply</button>
      {err && <span style={{ color: 'red', fontSize: '11px' }}>{err}</span>}
    </div>
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
  const [woodColor, setWoodColor] = useState('#f0e6d3');
  const [upperBars, setUpperBars] = useState('none');
  const [lowerBars, setLowerBars] = useState('none');
  const [sameBars, setSameBars] = useState(true);
  const [upperCustomBars, setUpperCustomBars] = useState([]);
  const [lowerCustomBars, setLowerCustomBars] = useState([]);

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
      upperBars,
      lowerBars,
      upperCustomBars,
      lowerCustomBars,
      woodColor,
    }),
    [width, height, opening, upperOpening, autoRotate, showGuides, boxType, upperBars, lowerBars, upperCustomBars, lowerCustomBars, woodColor],
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
          <h2>Glazing bars</h2>
          <Toggle
            label="Same bars for both sashes"
            checked={sameBars}
            onChange={(v) => {
              setSameBars(v);
              if (v) setLowerBars(upperBars);
            }}
          />
          <label className="select-wrap">
            <span>Upper sash</span>
            <select
              value={upperBars}
              onChange={(e) => {
                setUpperBars(e.target.value);
                if (sameBars) setLowerBars(e.target.value);
              }}
            >
              <option value="none">No bars</option>
              <option value="2x2">2×2</option>
              <option value="3x3">3×3</option>
              <option value="4x4">4×4</option>
              <option value="6x6">6×6</option>
              <option value="9x9">9×9</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {upperBars === 'custom' && (
            <div className="custom-bars">
              <div className="custom-bars__actions">
                <button onClick={() => setUpperCustomBars(b => [...b, { type: 'v', mm: Math.round(width / 2) }])}>+ Vertical</button>
                <button onClick={() => setUpperCustomBars(b => [...b, { type: 'h', mm: Math.round(height / 4) }])}>+ Horizontal</button>
              </div>
              {upperCustomBars.map((bar, i) => (
                <label key={i} className="control">
                  <div className="control__row">
                    <span>{bar.type === 'v' ? 'Vertical' : 'Horizontal'} {i + 1}</span>
                    <button onClick={() => setUpperCustomBars(b => b.filter((_, j) => j !== i))}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="10"
                      max={bar.type === 'v' ? width - 10 : height / 2 - 10}
                      step="1"
                      value={bar.mm}
                      onChange={(e) => setUpperCustomBars(b => b.map((x, j) => j === i ? { ...x, mm: Number(e.target.value) } : x))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="10"
                      max={bar.type === 'v' ? width - 10 : height / 2 - 10}
                      value={bar.mm}
                      onChange={(e) => setUpperCustomBars(b => b.map((x, j) => j === i ? { ...x, mm: Number(e.target.value) } : x))}
                      style={{ width: '60px' }}
                    />
                    <span>mm</span>
                  </div>
                </label>
              ))}
            </div>
          )}
          {!sameBars && (
            <label className="select-wrap">
              <span>Lower sash</span>
              <select value={lowerBars} onChange={(e) => setLowerBars(e.target.value)}>
                <option value="none">No bars</option>
                <option value="2x2">2×2</option>
                <option value="3x3">3×3</option>
                <option value="4x4">4×4</option>
                <option value="6x6">6×6</option>
                <option value="9x9">9×9</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          )}
          {!sameBars && lowerBars === 'custom' && (
            <div className="custom-bars">
              <div className="custom-bars__actions">
                <button onClick={() => setLowerCustomBars(b => [...b, { type: 'v', mm: Math.round(width / 2) }])}>+ Vertical</button>
                <button onClick={() => setLowerCustomBars(b => [...b, { type: 'h', mm: Math.round(height / 4) }])}>+ Horizontal</button>
              </div>
              {lowerCustomBars.map((bar, i) => (
                <label key={i} className="control">
                  <div className="control__row">
                    <span>{bar.type === 'v' ? 'Vertical' : 'Horizontal'} {i + 1}</span>
                    <button onClick={() => setLowerCustomBars(b => b.filter((_, j) => j !== i))}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="10"
                      max={bar.type === 'v' ? width - 10 : height / 2 - 10}
                      step="1"
                      value={bar.mm}
                      onChange={(e) => setLowerCustomBars(b => b.map((x, j) => j === i ? { ...x, mm: Number(e.target.value) } : x))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="10"
                      max={bar.type === 'v' ? width - 10 : height / 2 - 10}
                      value={bar.mm}
                      onChange={(e) => setLowerCustomBars(b => b.map((x, j) => j === i ? { ...x, mm: Number(e.target.value) } : x))}
                      style={{ width: '60px' }}
                    />
                    <span>mm</span>
                  </div>
                </label>
              ))}
            </div>
          )}
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

        <div className="card">
          <h2>Colour</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[
              { name: 'Pure White', hex: '#F4F4F2' },
              { name: 'Jet Black', hex: '#1C1C1C' },
              { name: 'Anthracite', hex: '#2E3A3F' },
              { name: 'Olive Green', hex: '#4A4F3B' },
              { name: 'Off-White', hex: '#F0EEE8' },
              { name: 'Cream', hex: '#EDE8D8' },
              { name: 'Burgundy', hex: '#6B1A2A' },
              { name: 'Royal Blue', hex: '#1A3060' },
              { name: 'Oak', hex: '#C8853A' },
            ].map(({ name, hex }) => (
              <div key={hex} onClick={() => setWoodColor(hex)}
                title={name}
                style={{
                  backgroundColor: hex,
                  borderRadius: '8px',
                  aspectRatio: '1',
                  cursor: 'pointer',
                  border: woodColor === hex ? '3px solid #1A3060' : '2px solid rgba(0,0,0,0.12)',
                  boxSizing: 'border-box',
                }}
              />
            ))}
            <div onClick={() => document.getElementById('custom-color-input').click()}
              title="Custom color"
              style={{
                borderRadius: '8px',
                aspectRatio: '1',
                cursor: 'pointer',
                border: '2px dashed rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: 'rgba(0,0,0,0.4)',
                boxSizing: 'border-box',
              }}
            >+</div>
            <input id="custom-color-input" type="color" value={woodColor}
              onChange={(e) => setWoodColor(e.target.value)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
          </div>

          <label className="select-wrap">
            <span>RAL colour</span>
            <select value="" onChange={(e) => e.target.value && setWoodColor(e.target.value)}>
              <option value="">— select RAL —</option>
              <optgroup label="Whites &amp; Creams">
                <option value="#FFFFFF">RAL 9010 Pure White</option>
                <option value="#F6F6F6">RAL 9016 Traffic White</option>
                <option value="#F4F4F4">RAL 9003 Signal White</option>
                <option value="#FDF4E3">RAL 9001 Cream White</option>
                <option value="#E7EBDA">RAL 9002 Grey White</option>
                <option value="#E6D690">RAL 1015 Light Ivory</option>
                <option value="#EAE6CA">RAL 1013 Pearl White</option>
                <option value="#C2B078">RAL 1001 Beige</option>
                <option value="#C6A664">RAL 1002 Sand Yellow</option>
              </optgroup>
              <optgroup label="Greys">
                <option value="#D7D7D7">RAL 7035 Light Grey</option>
                <option value="#B5B8B1">RAL 7038 Agate Grey</option>
                <option value="#8D948D">RAL 7042 Traffic Grey A</option>
                <option value="#7D7F7D">RAL 7037 Dusty Grey</option>
                <option value="#78858B">RAL 7000 Squirrel Grey</option>
                <option value="#8A9597">RAL 7001 Silver Grey</option>
                <option value="#9EA0A1">RAL 7004 Signal Grey</option>
                <option value="#6C7059">RAL 7005 Mouse Grey</option>
                <option value="#474A51">RAL 7024 Graphite Grey</option>
                <option value="#293133">RAL 7016 Anthracite Grey</option>
                <option value="#23282B">RAL 7021 Black Grey</option>
                <option value="#434750">RAL 7015 Slate Grey</option>
                <option value="#4E5754">RAL 7012 Basalt Grey</option>
                <option value="#4C514A">RAL 7010 Tarpaulin Grey</option>
              </optgroup>
              <optgroup label="Blacks">
                <option value="#0A0A0A">RAL 9005 Jet Black</option>
                <option value="#1C2023">RAL 9011 Graphite Black</option>
                <option value="#1E1E1E">RAL 9017 Traffic Black</option>
                <option value="#282828">RAL 9004 Signal Black</option>
              </optgroup>
              <optgroup label="Greens">
                <option value="#31372B">RAL 6009 Fir Green</option>
                <option value="#2F4538">RAL 6005 Moss Green</option>
                <option value="#343B29">RAL 6007 Bottle Green</option>
                <option value="#1F3A3D">RAL 6004 Blue Green</option>
                <option value="#4A4F3B">RAL 6003 Olive Green</option>
                <option value="#424632">RAL 6013 Reed Green</option>
                <option value="#587246">RAL 6011 Reseda Green</option>
                <option value="#35682D">RAL 6010 Grass Green</option>
                <option value="#4C9141">RAL 6017 May Green</option>
                <option value="#308446">RAL 6024 Traffic Green</option>
                <option value="#1E5945">RAL 6016 Turquoise Green</option>
                <option value="#3F888F">RAL 5018 Turquoise Blue</option>
              </optgroup>
              <optgroup label="Blues">
                <option value="#1E2460">RAL 5002 Ultramarine Blue</option>
                <option value="#1D1E33">RAL 5004 Black Blue</option>
                <option value="#1B2A4A">RAL 5011 Steel Blue</option>
                <option value="#2271B3">RAL 5015 Sky Blue</option>
                <option value="#063971">RAL 5017 Traffic Blue</option>
                <option value="#3B83BD">RAL 5012 Light Blue</option>
                <option value="#1B5583">RAL 5019 Capri Blue</option>
                <option value="#354D73">RAL 5000 Violet Blue</option>
                <option value="#49678D">RAL 5023 Distant Blue</option>
                <option value="#5D9B9B">RAL 5024 Pastel Blue</option>
              </optgroup>
              <optgroup label="Reds &amp; Pinks">
                <option value="#AF2B1E">RAL 3000 Flame Red</option>
                <option value="#9B111E">RAL 3003 Ruby Red</option>
                <option value="#75151E">RAL 3004 Purple Red</option>
                <option value="#5E2129">RAL 3005 Wine Red</option>
                <option value="#B32821">RAL 3016 Coral Red</option>
                <option value="#D53032">RAL 3018 Strawberry Red</option>
                <option value="#CC0605">RAL 3020 Traffic Red</option>
              </optgroup>
              <optgroup label="Browns">
                <option value="#955F20">RAL 8001 Ochre Brown</option>
                <option value="#6F4F28">RAL 8008 Olive Brown</option>
                <option value="#6F3B2A">RAL 8011 Nut Brown</option>
                <option value="#59351F">RAL 8007 Fawn Brown</option>
                <option value="#4E3B31">RAL 8028 Terra Brown</option>
                <option value="#45322E">RAL 8017 Chocolate Brown</option>
                <option value="#382C1E">RAL 8014 Sepia Brown</option>
              </optgroup>
              <optgroup label="Yellows &amp; Oranges">
                <option value="#E5BE01">RAL 1003 Signal Yellow</option>
                <option value="#F8F32B">RAL 1018 Zinc Yellow</option>
                <option value="#F4A900">RAL 1028 Melon Yellow</option>
                <option value="#ED760E">RAL 2000 Yellow Orange</option>
                <option value="#FF7514">RAL 2003 Pastel Orange</option>
                <option value="#F44611">RAL 2004 Pure Orange</option>
              </optgroup>
            </select>
          </label>

          <label className="select-wrap">
            <span>Farrow &amp; Ball</span>
            <select value="" onChange={(e) => e.target.value && setWoodColor(e.target.value)}>
              <option value="">— select F&amp;B —</option>
              <optgroup label="Whites">
                <option value="#F6F4EE">All White 2005</option>
                <option value="#F4F0E4">James White 2010</option>
                <option value="#EEEADE">Pointing 2003</option>
                <option value="#EDE8D8">Cream 2012</option>
                <option value="#EAE4D4">White Tie 2002</option>
                <option value="#E8E2CC">String 8</option>
                <option value="#F2EEE4">Wimborne White 239</option>
                <option value="#EDE6D4">Slipper Satin 2004</option>
                <option value="#EAE0C8">Skimming Stone 241</option>
                <option value="#F0EAD8">New White 59</option>
              </optgroup>
              <optgroup label="Neutrals &amp; Stones">
                <option value="#D5C9B0">Elephant's Breath 229</option>
                <option value="#C8BC9E">Mole's Breath 276</option>
                <option value="#C2B49A">Bone 15</option>
                <option value="#BEB49A">Hardwick White 5</option>
                <option value="#B4A890">Purbeck Stone 275</option>
                <option value="#AFA08A">Joa's White 226</option>
                <option value="#A89880">Savage Ground 213</option>
                <option value="#9E8E70">Dead Salmon 28</option>
                <option value="#9A8870">Shaded White 201</option>
                <option value="#8E7E68">Buff 20</option>
                <option value="#7A6A54">Oxford Stone 264</option>
                <option value="#6C5C46">Sand II 40</option>
                <option value="#645448">Sand III 21</option>
                <option value="#5C4C3A">Mouse's Back 40</option>
              </optgroup>
              <optgroup label="Greys">
                <option value="#B8B8B0">Mizzle 266</option>
                <option value="#A8A8A0">Pigeon 25</option>
                <option value="#989890">Lamp Room Gray 88</option>
                <option value="#888880">Pavilion Gray 242</option>
                <option value="#787870">Worsted 284</option>
                <option value="#686860">Plummett 272</option>
                <option value="#585850">Brassica 271</option>
                <option value="#484840">Mole's Breath 276</option>
                <option value="#383830">Down Pipe 26</option>
                <option value="#2C3531">Railings 31</option>
                <option value="#3B3D38">Off-Black 57</option>
                <option value="#2E3028">Pitch Black 256</option>
              </optgroup>
              <optgroup label="Blues">
                <option value="#1B3A5C">Hague Blue 30</option>
                <option value="#233B5A">Stiffkey Blue 281</option>
                <option value="#2A4870">Inchyra Blue 289</option>
                <option value="#2C4870">Pitch Blue 220</option>
                <option value="#3A5878">Prussian Blue 232</option>
                <option value="#4A6888">Lulworth Blue 89</option>
                <option value="#5A7898">Parma Gray 27</option>
                <option value="#6A88A8">Mizzle Light</option>
                <option value="#7898B8">Pale Powder 204</option>
                <option value="#8898A8">Borrowed Light 235</option>
              </optgroup>
              <optgroup label="Greens">
                <option value="#4A5240">Calke Green 34</option>
                <option value="#3A4A30">Viridian 214</option>
                <option value="#4A5A3A">Chappell Green 83</option>
                <option value="#5A6A4A">Mizzle Green</option>
                <option value="#6A7A5A">Saxon Green 80</option>
                <option value="#7A8A6A">Lichen 19</option>
                <option value="#8A9A7A">Green Ground 206</option>
                <option value="#9AAA8A">Mist Green</option>
                <option value="#526B58">Card Room Green 79</option>
                <option value="#3D5A42">Pea Green 33</option>
              </optgroup>
              <optgroup label="Reds &amp; Pinks">
                <option value="#7A1F2E">Rectory Red 217</option>
                <option value="#5C1A25">Incarnadine 248</option>
                <option value="#8A2A3A">Blazer 212</option>
                <option value="#C86070">Cinder Rose 246</option>
                <option value="#D8707E">Pelt 254</option>
                <option value="#E88A96">Pink Ground 202</option>
              </optgroup>
              <optgroup label="Yellows &amp; Oranges">
                <option value="#D4A84B">India Yellow 66</option>
                <option value="#C49840">Sudbury Yellow 51</option>
                <option value="#D4884A">Setting Plaster 231</option>
                <option value="#C87840">Dutch Orange 235</option>
                <option value="#A86030">Charlotte's Locks 268</option>
              </optgroup>
            </select>
          </label>

          <label className="control">
            <div className="control__row">
              <span>RAL number</span>
            </div>
            <RalInput onColor={setWoodColor} />
          </label>
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