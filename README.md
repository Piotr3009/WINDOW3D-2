# Prime Sash Window - React Three Fiber prototype

This is an initial parametric prototype for a traditional timber sash window.

## What is included

- React + Vite + React Three Fiber
- Adjustable width: 600–1800 mm
- Adjustable height: 800–3000 mm
- Standard box depth: 164 mm
- Slim box depth toggle: 146 mm
- Sash depth: 57 mm
- Simple sill for V1
- Lower sash opening slider
- Orbit controls for 3D rotation and zoom

## Important

Some face widths are placeholders because the exact section dimensions from the DXF have not yet been wired into the geometry.
The model is built to be corrected incrementally.

## Run

```bash
npm install
npm run dev
```

## Next steps

1. Read exact face widths from the sash DXF
2. Replace placeholder profile sizes
3. Add accurate meeting rail and stile sections
4. Add parting bead / staff bead
5. Add ironmongery and glazing bars
6. Add true box logic from the final box section
