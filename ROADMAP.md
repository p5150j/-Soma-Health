# Health Dashboard — Roadmap

## Vision

A tool for both doctors and patients showing ALL health data spatially on the body — bones, organs, ligaments, blood markers, chemistry interactions — with a timeline that lets you scrub through history and watch the body change.

Think of it as a living medical record that replaces static PDFs with a navigable 3D environment.

---

## Phase 1 — Bones Layer ✅

- Wireframe skeleton with per-bone color highlighting (yellow=watch, red=critical)
- Data-driven via `conditions.json` — swap in real data with zero UI changes
- Compact glass annotation cards that track bones in 3D as skeleton rotates
- Biomarker cards with data-driven reference range charts (gradient zone track, patient dot with glow positioned by actual value, national mean tick, scatter dots constrained to normal zone)
- Left panel: real patient profile (DOB, gender, ethnicity, height/weight/BMI/temp/O₂), biological age placeholder, 3 mini visit cards
- Glass system working: z-index stack fixed, blur working on all panels
- TopNav and FooterNav both use centered floating glass pill treatment with dividers

---

## Phase 2 — Timeline Scrubber + Real Data ✅

- Footer is now an interactive session scrubber
- Clicking a session re-highlights skeleton with that session's conditions + severity
- Biomarker cards animate to the historical values for that session
- Annotation labels update to show progression ("Mild → Severe Inflammation")
- Model position locked — no jitter on session switch
- Data: `conditions_real.json` (history per bone) + `biomarkers.json` (history per session + reference ranges)
- Context: `TimelineContext.tsx` drives everything via `selectedSession`

**Real data live (Patrick Ortell, 2 visits):**
- `src/data/conditions_real.json` — lumbar spine findings (May 2017 XR + Feb 2026 CT), L1/L5 critical
- `src/data/biomarkers.json` — 8 Hormone markers with real values + reference ranges (rangeMin/rangeMax/normalMin/normalMax/mean per marker, NHANES population data)
- `src/data/visits.json` — session-keyed imaging thumbnails (partial visit-centric implementation)
- `public/scans/` — real PACS screenshots: lumbar XR, CT abdomen/pelvis, skull, CT brain

**Right panel dual-mode architecture:**
- Visit mode: Labs / Imaging / Conditions tabs — Labs has pill primary tabs + underline sub-tabs (glass card backing); Imaging shows session-keyed scan thumbnails; Conditions shows severity-coded bone list
- Analyze mode: scaffolded for Phase 5 LLM wiring (`mode: 'visit' | 'analyze'` state in RightPanel)

**Still available for future use:**
- `mydata/labs_bloodwork_2023-2026/` — full structured lab panels for Phase 4 body mapping

---

## Phase 3 — Organ Layer ✅ COMPLETE (all 12 organs, zero placeholders)

Real wireframe GLB organ meshes for all 12 organs, live in `<OrganLayer />`. Organ findings from real CT reports drive color highlights and annotation flags using the same glass card + drei `<Html>` system as bones.

### What shipped

- 9 organs extracted from downloaded GLBs (`abdomen_anatomy.glb`, `healthy_heart_and_lungs.glb`) via `scripts/extract-organs.mjs`
- **Stomach** and **aorta** created from scratch in Blender using direct TCP socket to the Blender MCP addon (port 9876) — Frenet-Serret tube generation in Python
  - Stomach: J-curve tube (SEGS=28), `modelScale: 0.015`, `flipX: true` to orient fundus anatomically
  - Aorta: 3-segment tube — hook/arch at top + straight trunk + Y-fork at bottom (iliac bifurcation), `modelScale: 0.022`, `rotateY: Math.PI`
- **Anatomy X-axis convention fix**: viewer uses face-to-face convention (patient's left = viewer's right = positive X). All organ X offsets were negated when this was discovered (liver was on wrong side, etc.). Lungs exempted — their `rotateY` + `flipX` already handled orientation.
- `ModelOrgan` renders ALL `THREE.Mesh` objects in GLTF scene (multi-geometry) — required for Blender-created meshes

### Key technical notes

- **No Draco compression** on any organ GLB — Draco without decoder crashes WebGL context
- **`useGLTF.preload(url)` at module level** — prevents Suspense mid-render WebGL thrash
- **Blender MCP command type**: `execute_code` (not `execute_blender_code` — that key doesn't exist)
- See `project_organ_meshes.md` in memory for full calibrated ORGANS array and Blender TCP usage pattern

### Original approach notes (kept for history)

**What we tried and why it failed:**
- Z-Anatomy open anatomy model (`splanchnology` from Sketchfab) — 47MB `.bin` file, causes WebGL context loss when loaded alongside the skeleton. Too heavy.
- Custom extraction from source OBJ — caused WebGL context loss, likely degenerate geometry from the OBJ→GLB pipeline.

**Fallback that worked: individual mesh extraction from curated GLBs**
`scripts/extract-organs.mjs` clones the source doc, strips all but the target mesh, removes textures, writes clean GLB.

### Coordinate anchors (relative to skeleton center at y=0)
```
heart        y ≈ +0.18,  x ≈  0.00   (sternum level)
lung_l       y ≈ +0.15,  x ≈ -0.07   (left chest)
lung_r       y ≈ +0.15,  x ≈ +0.07   (right chest)
liver        y ≈ +0.02,  x ≈ +0.06   (right upper abdomen)
spleen       y ≈ +0.02,  x ≈ -0.07   (left upper abdomen)
stomach      y ≈  0.00,  x ≈ -0.03   (left mid-abdomen)
pancreas     y ≈ -0.02,  x ≈  0.00   (mid-abdomen, deep)
kidney_r     y ≈ +0.02,  x ≈ +0.07   (flank R, L1-L2 level)
kidney_l     y ≈ +0.02,  x ≈ -0.07   (flank L, L1-L2 level)
bladder      y ≈ -0.18,  x ≈  0.00   (pelvis)
aorta        y ≈  0.00,  x ≈  0.00   (spine-adjacent, thin cylinder)
```

### Real findings ready to wire in (from Feb 2026 CT)
- `liver` → watch — "Hepatic Steatosis (diffuse fatty infiltration)"
- `kidney_r` → watch — "2mm stone, lower pole — no obstruction"
- `aorta` → watch — "Mild calcification — premature for age"
- `bladder` → normal (no focal mass)

### Data file
New `src/data/conditions_organs.json` — same session/history/severity shape as `conditions_real.json`. Drop-in for the same annotation system.

### Layer toggle
Top nav layer switcher: **Bones** / **Organs** / **All**. Context flag `showOrgans` in TimelineContext (or new LayerContext). BodyViewer renders `<OrganLayer />` conditionally.

---

---

## Backlog — 3D Organ Meshes (Phase 3 extension)

Replace sphere/cylinder organ placeholders with real anatomical GLB meshes. Infrastructure is already in place (`ModelOrgan` component + `modelUrl` / `modelScale` fields on `OrganDef`) — it's a one-line change per organ once a clean asset is found.

### Key design decision: only show 3D models for organs WITH active conditions

Rendering 3D meshes for all 11 organs simultaneously creates a cluttered blob — stomach, intestines, pancreas, spleen, kidneys and liver all overlapping in the abdominal cavity. The right rule:

- **Organs with a condition** → real 3D mesh (wireframe, severity-colored) + flag annotation
- **Healthy organs** → subtle sphere glow only, no mesh, no annotation

This keeps the view clean and focuses attention exactly where findings exist.

### What a suitable asset looks like

- **Single outer-surface mesh only** — no embedded vasculature, bile ducts, or internal structure
- **Low poly already** — 5K–15K triangles (no decimation needed, clean silhouette)
- **GLB/GLTF format** (or FBX/OBJ convertible via `obj2gltf`)
- **File size** — under 500 KB after Draco compression (`npx gltf-pipeline --draco.compressMeshes`)
- **Consistent scale** ideally — a pack where all organs share the same unit system

### Organs still needed (11 total in `conditions_organs.json`)

| Organ | Key | Current |
|---|---|---|
| Heart | `heart` | sphere |
| Left lung | `lung_l` | sphere |
| Right lung | `lung_r` | sphere |
| Liver | `liver` | sphere (tried a model — asset quality issues) |
| Stomach | `stomach` | sphere |
| Spleen | `spleen` | sphere |
| Pancreas | `pancreas` | sphere |
| Left kidney | `kidney_l` | sphere |
| Right kidney | `kidney_r` | sphere |
| Aorta | `aorta` | cylinder |
| Bladder | `bladder` | sphere |

### Good sources to check

- **Sketchfab** → filter by "anatomy", "low poly", free download as GLB. Check triangle count before downloading.
- **TurboSquid / CGTrader** — some packs include full organ sets in consistent scale
- **Unity Asset Store exports** — medical anatomy packs often include clean single-surface organs
- **Avoid**: models that include internal vasculature, multi-mesh assemblies, or models originally built for photorealistic rendering (huge texture maps, extreme poly counts)

### How to wire in a new organ once you have the file

```bash
# 1. Draco compress (strips textures automatically if you strip materials from the JSON first)
npx gltf-pipeline -i organ.glb -o organ_draco.glb --draco.compressMeshes --draco.compressionLevel 10

# 2. Copy to public/
cp organ_draco.glb public/organs/<key>.glb
```

```ts
// 3. In ORGANS array in OrganLayer.tsx — add modelUrl + modelScale:
{ key: 'heart', ..., modelUrl: '/organs/heart.glb', modelScale: 0.12 }
```

The `ModelOrgan` component handles everything else: centering via bounding box, EdgesGeometry for clean wireframe lines, severity coloring, flag line to annotation card.

---

## Phase 4 — Chemistry & Blood Markers Linked to Body ✅

Blood panel results spatially anchored to the 3D body. Flagged labs glow cyan on the relevant anatomy — distinct from condition highlights (yellow/red).

**What shipped:**
- `src/data/lab-highlights.json` — flagged markers per session with `boneTargets[]` and `organTargets[]`
- `labTargets` computed in `TimelineContext` from current session, consumed by both `BodyViewer` and `OrganLayer`
- Labs toggle (bottom-left widget) enables/disables the cyan layer independently from bones/organs
- Cyan fill (`#4fc3f7`, opacity 0.14 bones / 0.18 organs) — no wireframe, reads as "systemic" vs structural
- Condition color wins if a structure has both a radiology finding and a lab flag
- **5 flagged highlights wired:** Hemoglobin HIGH → sternum + femurs + lumbar marrow; Basophils HIGH → same marrow sites; HDL LOW → aorta + heart; Triglycerides HIGH → liver; Creatinine/GFR trending → kidney L+R
- `biomarkers.json` fully populated: all 5 sub-tabs (Hormone, Circulatory, Immune, Digestive, Urinary) now have real data — 40+ markers across 2 sessions with trends, deltas, and reference range charts
- Hemoglobin and Basophils moved from Hormone to their correct categories (Circulatory / Immune)
- RightPanel `labCards` now driven by `activeLabCat` dynamically — no longer hardcoded to Hormone

---

## Phase 5 — AI Narrative Layer

Claude reads the full patient record across all visits and generates a plain-English synthesis — the cross-specialty correlations that fall through the cracks of siloed care.

### What's already in place

- **Analyze mode** scaffolded in RightPanel — `mode: 'visit' | 'analyze'` state, "Analyze →" trigger, "Generate Report" button (currently disabled), back navigation
- **`ANTHROPIC_API_KEY`** in `.env.local` — ready to call
- **Rich data for context** — 40+ biomarkers with trends, 2 sessions, bone + organ conditions from real radiology reports, cross-session lab observations already written in `mydata/`
- **Body target mapping** already exists in `lab-highlights.json` — each flagged marker knows which body parts it affects

### What needs to be built

**1. `/api/analyze` route** — Next.js App Router API handler that:
- Accepts patient context (conditions + labs + flags + cross-session observations)
- Calls `claude-sonnet-4-6` with streaming
- Returns insight objects: `{ text: string, bodyTargets: string[], severity: 'watch' | 'critical' }[]`

**2. Prompt** — packages all structured data into a context block. Claude should produce 4–6 insights that cross systems: e.g. HDL + aortic calcification → cardiovascular risk; Creatinine trend + kidney stone → renal monitoring. Plain English, no jargon.

**3. Streaming UI** — wire "Generate Report" to the API, stream insight cards into the Analyze panel as they arrive. Each card shows the text + a subtle body target indicator.

**4. Insight → body highlight** — clicking an insight card highlights the relevant bones/organs on the 3D body. Uses existing `activeLayer` / `labTargets` infrastructure — just needs a new `analyzeTargets` state in context.

**5. (Stretch) Real-time streaming body animation** — body lights up as each insight streams in, not just on click. Requires parsing structured tags mid-stream and an animation queue in Three.js (`useFrame` lerping opacity per structure). This is the cinematic version — build after steps 1–4.

### Build order
1. API route + prompt + plain streaming → Analyze panel renders text  *(~2 hrs)*
2. Structure response as insight cards with `bodyTargets` *(~1 hr)*
3. Click insight → body highlights those structures *(~1 hr)*
4. Real-time streaming animation *(~2 hrs — the hard part)*

---

## Phase 6 — Real Data Integration

Replace `conditions.json` and static biomarker values with live Cigna/FHIR API calls. The data contract is already designed for this — the JSON shape is the same, just fetched instead of static. Patient auth + FHIR/HL7 integration.

---

## Phase 7 — Patient-Specific 3D Skeleton from Real X-Rays 🔥

Replace the generic `skeleton_lo.glb` with a mesh reconstructed from the patient's actual X-rays/CT, deformed to match their real anatomy. The existing bone naming and Three.js code stays 100% intact.

### Real scan data already available

Patrick has access to his full imaging history via **Philips IntelliSpace PACS Anywhere** (uchealth, web-based DICOM viewer). Studies go back to at least 2009:

- CT Brain axial/coronal/sagittal + bone window (Jun 2019)
- CT Abdomen/Pelvis WO Contrast (Feb 12, 2026)
- CT Abdomen/Pelvis W Contrast (Feb 16–17, 2026)
- XR Lumbar Spine 3 Views AP/LAT/SPOT (May 2017)
- Likely additional studies 2009–2026 (timeline visible in PACS viewer)

Raw DICOM PNGs exported to `mydata/imaging/` but render blank without DICOM windowing. Screenshots from within IntelliSpace (bone window = AX BNE series) are the most usable format. The spine CT series are the most valuable input for TotalSegmentator.

### Why the existing GLB is the key

`skeleton_lo.glb` acts as the **template/mean shape mesh**. ML reconstruction produces noisy geometry with no bone names. Non-rigid registration deforms our clean named template to match the patient's actual shape. Output: `patient_<ID>.glb` with identical topology and bone names (`r_clavicle_beige_0` etc.) — zero code changes needed.

### What changes visually

- Generic "average" skeleton → patient's actual bone proportions
- Symmetric spine → their real curvature, scoliosis, stenosis geometry
- Generic rib cage → their actual spacing and shape
- Pathology isn't just a color overlay — it's the actual deformed geometry

### Pipeline (runs on GPU box)

```
Patient X-rays / CT DICOM
  ↓
[If CT DICOM series]
  TotalSegmentator (GPU) → auto-segments 104 structures in ~20s → NIfTI
  3D Slicer → export OBJ/STL per bone

[If flat 2D X-rays only]
  DIFR3CT — latent diffusion, 2-3 X-ray views → full 3D CT volume
  OR X2BR — single planar X-ray → high-fidelity bone mesh (neural implicit)
  OR 3DDX — single standard radiograph → bone surface via dual-face depth estimation
  → Marching Cubes → rough mesh

  ↓
ANTs / SimpleITK non-rigid registration
  → deform skeleton_lo.glb to match patient geometry
  ↓
Blender cleanup + decimate (keep poly count manageable for WebGL)
  ↓
Export patient_<ID>.glb → /public/skeleton/
  ↓
BodyViewer.tsx loads by patientId — zero other code changes
```

### Key tools (all open source, GPU-capable)

| Tool | Role |
|---|---|
| **TotalSegmentator** | CT → 104-structure segmentation, state of the art |
| **DIFR3CT** | 2-3 X-rays → CT volume (latent diffusion) |
| **X2BR** | Single X-ray → bone mesh (neural implicit, 2026) |
| **3DDX** | Single radiograph → bone surface (dual-face depth) |
| **ANTs** | Non-rigid mesh registration (gold standard) |
| **SimpleITK** | Python wrapper for ANTs |
| **3D Slicer** | Free GUI for DICOM → OBJ/STL |
| **Blender** | Cleanup, decimate, export GLB |

### GPU box environment setup

Minimum specs: NVIDIA GPU with ≥ 12GB VRAM (TotalSegmentator runs comfortably on RTX 3080/4080, A-series cards for X2BR/DIFR3CT inference). CPU-only falls back but TotalSegmentator takes ~10min instead of ~20s.

**Python environment (conda recommended)**

```bash
conda create -n medml python=3.11
conda activate medml

# CUDA-enabled PyTorch — match to your CUDA version (check: nvidia-smi)
# CUDA 12.1 (RTX 40-series / A100):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# CUDA 11.8 (RTX 30-series):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Core ML packages**

```bash
# CT segmentation — installs its own SimpleITK/torch deps
pip install TotalSegmentator

# DICOM reading
pip install pydicom

# NIfTI (the volumetric format TotalSegmentator outputs)
pip install nibabel

# ANTs non-rigid registration (Python bindings — no separate ANTs install needed)
pip install antspyx

# Mesh processing (Marching Cubes, OBJ/STL export)
pip install trimesh pymeshlab scikit-image

# General scientific stack
pip install numpy scipy matplotlib
```

**DIFR3CT / X2BR / 3DDX** — each has its own GitHub repo with a `requirements.txt`. Clone, then `pip install -r requirements.txt` inside the conda env. All three expect CUDA PyTorch already installed.

**3D Slicer** — standalone desktop app, no pip. Download from `slicer.org`. Has a built-in TotalSegmentator extension (installs via Extensions Manager). Use for visual verification and OBJ/STL export steps.

**Blender** — standalone app. Install `bpy` inside the env only if scripting headless GLB export: `pip install bpy`. Otherwise run Blender GUI for cleanup/decimation/GLB export.

**Quick test after setup**

```bash
# Should print segmentation progress and finish in ~20s on GPU
TotalSegmentator -i path/to/ct_dicom_folder -o output_dir

# Should print GPU name and True
python -c "import torch; print(torch.cuda.get_device_name(0)); print(torch.cuda.is_available())"
```

### Data format note

Best input is CT DICOM (series of slices). Flat X-ray PNGs/JPGs/TIFFs work but require the ML reconstruction step first. The richer the input data, the more accurate the patient mesh. The Feb 2026 CT abdomen/pelvis series in IntelliSpace is the best available input for lumbar reconstruction.

### References

- [X2BR — single X-ray to bone (2026)](https://arxiv.org/pdf/2504.08675)
- [DIFR3CT — few X-rays to CT volume](https://arxiv.org/pdf/2408.15118)
- [3DDX — single radiograph to bone surface](https://arxiv.org/pdf/2409.16702)
- [MICCAI 2025 — SRVF + deformation graphs](https://papers.miccai.org/miccai-2025/paper/1272_paper.pdf)
- [Statistical shape model from single AP X-ray](https://pubmed.ncbi.nlm.nih.gov/20443464/)

---

## Backlog — Visit-Centric Data Model (Architecture Refactor)

**Current shape:** data is siloed by type — `conditions.json` owns bones, `biomarkers.json` owns labs. Sessions are shared but the two files are independent.

**Problem:** Real healthcare doesn't work that way. A visit can have imaging, labs, procedures, or all three. Tying data to visit (not type) is the only model that reflects reality and enables cross-system correlation.

**Target schema — `visits.json`:**

```json
{
  "visits": [
    {
      "id": "2026-02-12",
      "date": "2026-02-12",
      "reason": "Left flank pain",
      "facility": "UC Health ER",
      "providers": ["Derek Stadie MD", "Jeffrey Weissmann MD"],
      "data": {
        "imaging": [
          {
            "type": "CT Abdomen/Pelvis WO Contrast",
            "findings": { "bone_map": { "l1": { "severity": "critical", "label": "..." }, ... } }
          }
        ],
        "labs": {
          "BMP": { "Creatinine": { "value": 1.04, "unit": "mg/dL", "status": "normal" }, ... },
          "CBC": { "Hemoglobin": { "value": 17.0, "status": "high", "flag": true }, ... }
        },
        "procedures": []
      }
    }
  ]
}
```

**Why this unlocks everything:**
- Timeline scrubber shows visit dots with type indicators (scan icon / flask icon / both)
- Clicking a visit → bones light up from that visit's imaging, labs update from that visit's bloodwork, empty if not collected
- LLM (Phase 5) reads across ALL visits and ALL systems — sees what no single specialist sees:
  > *"Creatinine trending 1.06 → 1.12 over 3yr while GFR dropped 86 → 81. Feb 2026 CT also noted premature aortic calcification. Combined with persistent basophilia across all bloodwork visits — cross-specialty follow-up warranted that no single visit triggered."*
- "Jumped off a bridge" visit: head trauma + hip fractures + liver laceration + labs all on one visit ID. Every subsequent recovery visit tracks all systems simultaneously.
- The unseen becomes visible — cross-system, cross-time correlation falls through the cracks of siloed care today.

**Partial implementation exists:** `src/data/visits.json` already maps session IDs to imaging arrays — it's the first slice of this model. Extend it to include labs and conditions before Phase 6.

**When to do this:** Before Phase 6 (real Cigna/FHIR data). FHIR already uses encounter-centric records — this schema maps naturally to it. Refactoring to `visits.json` before FHIR integration means one migration instead of two.

**Migration effort:** Medium. `conditions.json` → nested under visit imaging. `biomarkers.json` → nested under visit labs. `TimelineContext` sessions become visit IDs. UI components read from `visit.data.imaging` / `visit.data.labs` instead of separate files.

---

## Backlog — LLM Analyze Mode: Animated Body Narration

When the LLM generates a holistic timeline analysis (Analyze mode, Phase 5), it should animate the 3D body in real time as it narrates — lighting up the systems and structures it's actively drawing correlations from.

**The experience:**
The user hits "Generate Report." The LLM begins narrating (audio + text transcript). As it speaks, the body responds: mentions the lumbar spine → L1/L5 glow red. Shifts to cardiovascular risk → aorta and relevant bone marrow regions illuminate. Connects the HDL finding to the aortic calcification → both highlight simultaneously with a visual connector or synchronized pulse. The body becomes a live map of the LLM's reasoning.

**Why this is the most compelling feature in the whole product:**
Every other health dashboard shows you data. This one shows you *thinking* — a clinician-grade synthesis playing out spatially on your own body in real time. No specialist currently does this across systems. The LLM sees the full timeline. The body makes it legible.

**Technical approach when ready:**
- LLM response is structured (not just prose) — each insight has `systems: ['l1', 'aorta', 'hdl']` tags
- Streaming response → parse tags as they arrive → trigger Three.js highlight transitions via a shared animation queue
- Audio via Web Speech API or ElevenLabs TTS, timed to streaming tokens
- `useFrame` lerps material opacity/emissive color per highlighted structure
- Analyzer mode overrides layer state — shows all layers at once for the duration of the narration, then returns to previous state

**Implementation order:** Build Phase 5 LLM API call first (plain text response). Then structure the response format. Then wire the animation layer. Audio is last and optional.

---

## Backlog — Condition Click → Camera Isolation

Tapping a condition in the Conditions tab focuses the 3D camera on that specific bone or organ and briefly isolates it (other structures dim further). Fast path to understanding exactly where in the body a finding is located.

**Implementation:** `setTarget()` on OrbitControls ref + lerp camera position toward the structure's world coordinates. Single `useFrame` animation, ~60 frames. Reset on next condition click or tab switch.

---

## Useful Patterns Already Established

- **Adding a new data layer**: create a new `*-conditions.json`, add a new lookup map in `BodyViewer.tsx`, traverse the relevant mesh names
- **New annotation style**: extend `BoneAnnotation` with a variant prop, or create a parallel component for organs
- **Per-bone animation**: `useFrame` hook can lerp `child.material.opacity` or `child.material.color` each frame based on timeline position
- **Ligaments**: the GLTF may not have ligament meshes; would need a separate model or procedural lines between bone anchor points using `THREE.Line`
- **Patient-specific mesh**: swap GLB path by patientId, use non-rigid registration to preserve bone naming convention
- **Demo vs real data**: `conditions.json` = demo, `conditions_real.json` = real radiology findings — one import swap to toggle
