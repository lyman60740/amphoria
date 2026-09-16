# Amphoria

Vue / Vite hero with the original Blender amphora, local fonts and a Three.js studio.

## Run

- `npm run dev -- --host 127.0.0.1`
- `npm run build`
- `npm run preview`

The lil-gui studio is visible directly on the home page. **Material → Vase color** changes the body and handles together, with an sRGB hex field and picker. **Reset color** restores the material color loaded from the GLB with the existing studio exposure adjustment. Debug edits are temporary and reset on reload.

OrbitControls are enabled on the home page: drag to orbit, wheel/pinch to zoom. Use **Orbit controls** to disable interaction and **Reset camera** to restore the reference composition. Lighting, exposure and shadow controls remain in the same panel.

## Scene

`src/scene/createVaseScene.js` owns the camera, loading, lighting, shadows, debug controls and cleanup. Orthographic camera, ACES tone mapping, warm directional key, restrained fill and hemisphere lighting; a blurred projection of the actual vase silhouette plus a small contact shadow. The silhouette is rendered to an offscreen texture and blurred in two passes; it updates when debug light controls change. This produces broad studio shadows without rerendering shadow maps every frame. The floor has a gentle lateral illumination gradient. Responsive sizing is observed on the canvas, rendering pauses in hidden tabs, pixel density is capped at 1.75.

`public/models/amphoria-vase.draco.glb` is exported from the fused Blender model. The web copy was decimated to ~159k triangles; the original sculpt is untouched. Geometry uses `KHR_draco_mesh_compression` (level 6). Textures (JPEG quality 85), softened normal maps and UV transforms are embedded. The complete GLB is about 2.7 MB. Draco decoders are served locally under `public/draco/`.

The GLB retains the Blender base color. The web material applies a 2.15× linear color lift to match the reference exposure under ACES, preserving the neutral hue, and uses a matte roughness/specular response. Blender's displacement shader is not a glTF feature: the exported normal map carries the crack relief; no live displacement is used in the browser.

The hero uses the supplied Casta, Work Sans, logo and shopping-bag icon. Header / shop actions open small accessible editorial dialogs; account and checkout services are not connected.


## Intro animation

`src/animations/introTimeline.js` centralizes every GSAP intro tween, with named timeline labels and `INTRO_TIMING` offsets. It starts once the GLB and fonts are ready; **Replay intro** in lil-gui restarts it. Reduced-motion preferences display the completed state immediately. Timeline and inline styles are cleaned up on unmount.

`src/scene/createOrbitRing.js` creates a thin, inclined 3D circle around the amphora. Depth testing hides its rear arc behind the vase. GSAP animates `orbit.draw.progress` from 0 to 1; `BufferGeometry.setDrawRange` reveals the line progressively, like an SVG path draw. No SVG overlay or paid GSAP plugin is used. The ring scales at narrow breakpoints and is excluded from the silhouette shadow pass.


## Central studio settings

**Edit `src/scene/sceneSettings.js` → `SCENE_SETTINGS`** for all 3D defaults: background/floor, renderer, GLB loading, material, camera/controls, lights, ring geometry, shadows, and GUI ranges. The scene clones this object; every GUI controller edits that live settings copy and applies it to Three.js. Reloading restores the declared defaults. CSS layout remains in `src/style.css`.

**Background color** updates both the visible studio floor and the clear background, preserving the lighting gradient and shadows. `material.color: null` uses the GLB color with `colorLift`; a hex value overrides it directly. `ring.reverseDepth: true` swaps the front/rear arcs by reflection in the reference camera plane, preserving the projected ellipse.

Animation settings remain exclusively in `src/animations/introTimeline.js`.


## Curved studio backdrop

`createCycloramaGeometry.js` builds a continuous floor, quarter-circle cove and vertical wall. `SCENE_SETTINGS.floor` centralizes the curve start, radius, tessellation and wall height; the **Cyclorama** folder in lil-gui adjusts the shape live. The soft-shadow receiver follows the same geometry, so the projected vase shadow climbs the curve and wall. Normal-offset separation avoids flickering. The old flat-floor depth stretch is reset to 1.


## Cursor-driven light

`SCENE_SETTINGS.pointerLight` controls cursor interaction. The **Cursor light** folder in lil-gui exposes its enabled state, **Sweep (degrees)** (180° by default), vertical amplitude and **Smoothing (s)**. Higher smoothing means more inertia; zero follows immediately. The cursor rotates the light in X/Z around `pointerLight.pivot`, keeping its horizontal distance constant. The center of the screen matches `lights.key.position`; the two edges span the full configured angle. Angular damping preserves the circular trajectory, including during smoothing. Moving out of the hero eases back to the base. The effect uses mouse input and respects reduced-motion preferences.

`createPointerLight.js` handles normalization and frame-rate-independent exponential damping. Lights and their projected shadows update together every moving frame, after damping and before the scene render. Each shadow stops recapturing when its own light settles. This avoids a visible 24 Hz cadence on high-refresh displays, at the cost of more GPU work during movement. Listeners are removed on unmount, and hidden tabs pause rendering.

## Overhead light

**Overhead light** in lil-gui controls the independent high light, its position, intensity, shadow density and softness. Defaults live in `lights.overhead` and `overheadShadow`. Its steeper angle projects a second, shorter shadow mainly onto the floor. Each light has its own blurred silhouette capture; both lights follow the cursor with the same angular sweep, vertical amplitude and smoothing, relative to their own configured positions. Both shadow captures refresh every moving frame, synchronized with their lights. Both receivers are excluded from both captures.


## Playground — free clay studio

Open **Playground** (`#/playground`). Every new piece starts from a solid clay ball, with a local, asymmetric sculpting surface. The former symmetric lathe presets have been replaced. The old `amphoria.pottery.v1` save stays untouched; this atelier uses a separately validated `amphoria.pottery.v2` save.

- The fixed player remains visible while scrolling or opening any panel: play/pause, 1–20 rpm and reverse. Space toggles play when not editing a control. Rotation starts paused and only runs on explicit input, including for reduced-motion users.
- The palette has **Paume**, **Doigt**, and **Tranche**. Size, pressure, push/pull/smooth and blade orientation are adjustable. Pen pressure multiplies the chosen strength. Mouse/touch use the chosen strength directly.
- Hold on the clay to work continuously, even while the wheel rotates. Each frame transforms the contact into the rotating sculpture’s local coordinates. A brief press affects only one region; holding longer while rotating leaves a longer mark. The tool ring shows the contact footprint.
- A indexed spherical surface stores an independent radial distance at each vertex. In-place position/normal updates retain asymmetry and avoid rebuilding the mesh each frame. This is an artistic sculpting simulation, not a volume-preserving clay solver. The blade makes thin grooves, not detached cut fragments; topology remains closed and the foot remains stable.
- A completed stroke is one undo/redo step (Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z). New ball is undoable and retains the current material. Shape/material auto-save locally; history, camera and wheel state remain session-only.
- Material, lighting, PNG and GLB exports remain available in secondary panels. The GLB contains only the sculpture and its color/normal textures, not the wheel or studio. The original home Draco model is independent.

Defaults: `src/playground/playgroundSettings.js`. UI: `src/views/Playground.vue`. Model, geometry, rendering, textures and styles live in `src/playground/`.

Run `node --test tests/pottery.test.mjs` for asymmetric strokes, rotating contacts, pressure, brush shapes, frame-rate stability, geometry seams, history and save validation.

### Lighting intro

`INTRO_TIMING.lighting` in `src/animations/introTimeline.js` controls the opening: a black studio, a −110° orbital sweep over 5.2 seconds, and staggered key / overhead / ambient illumination. Adjust `startAngleDegrees`, durations and delays here. The canvas itself stays visible; actual light intensities reveal the clay and cyclorama. Unlit background and shadow opacity follow the lighting. Final positions, colors and intensities always come from `SCENE_SETTINGS`; cursor control resumes at the exact base position after the reveal. Reduced motion skips to the completed scene.
