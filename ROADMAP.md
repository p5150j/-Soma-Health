# Health Dashboard — Roadmap

## Vision

A tool for both doctors and patients showing ALL health data spatially on the body — bones, organs, ligaments, blood markers, chemistry interactions — with a timeline that lets you scrub through history and watch the body change.

Think of it as a living medical record that replaces static PDFs with a navigable 3D environment.

---

## Phase 1 — Bones Layer ✅

- Wireframe skeleton with per-bone color highlighting (yellow=watch, red=critical)
- Data-driven via `conditions.json` — swap in real data with zero UI changes
- Compact glass annotation cards that track bones in 3D as skeleton rotates
- Biomarker cards (right panel) with scatter plots and trend indicators
- Patient profile, biological age, tomography thumbnails (left panel)
- Glass system working: z-index stack fixed, blur working on all panels

---

## Phase 2 — Timeline Scrubber ✅

- Footer is now an interactive session scrubber
- Clicking a session re-highlights skeleton with that session's conditions + severity
- Biomarker cards animate to the historical values for that session
- Annotation labels update to show progression ("Mild → Severe Inflammation")
- Model position locked — no jitter on session switch
- Data: `conditions.json` (history array per bone) + `biomarkers.json` (history per session)
- Context: `TimelineContext.tsx` drives everything via `selectedSession`

**Real data ready to swap in:**
- `src/data/conditions_real.json` — real lumbar spine findings from radiology reports (May 2017 XR + Feb 2026 CT)
- `mydata/imaging/radiology_findings_spine.json` — full report text + bone_map per vertebra
- `mydata/labs_bloodwork_2023-2026/` — real lab values (Feb 2023 + Feb 2026) for Phase 4

---

## Phase 3 — Organ Layer 🔨 In Progress

Add a semi-transparent organ layer rendered alongside the skeleton. Organ findings (hepatic steatosis, kidney stone, aortic calcification from real CT reports) get their own annotation cards using the same glass card + drei `<Html>` system as bones.

### Approach decided: Three.js primitives (not a GLTF)

**What we tried and why it failed:**
- Z-Anatomy open anatomy model (`splanchnology` from Sketchfab) — 47MB `.bin` file, causes WebGL context loss when loaded alongside the skeleton. Too heavy.
- Custom extraction: parsed named organ meshes from the source OBJ (`Z-Anatomy-Layers1-7.obj`) — organs are fully named (`kidney_l`, `kidney_r`, `liver_0`–`liver_7`, `spleen`, `stomach`, `pancreas`, `gallbladder`, `bladder`, lungs, trachea). Converted to GLB via `obj2gltf` + `@gltf-transform/cli simplify` → still causes WebGL context loss, likely degenerate geometry from the OBJ→GLB pipeline.

**The right POC move: named Three.js mesh primitives**
Each organ is a `<mesh>` with a scaled `SphereGeometry` or `BoxGeometry` positioned at anatomically correct coordinates in the skeleton's space. Named explicitly (`heart`, `liver`, `kidney_l`, etc.) so they can be targeted identically to bones. When a real labeled GLB is available later, it's a straight component swap.

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

## Phase 4 — Chemistry & Blood Markers Linked to Body

Blood panel results get spatially anchored. High creatinine → kidneys glow. Low hemoglobin → marrow regions highlight. The body becomes an explainer for why those numbers matter.

Implementation: a mapping file `src/data/marker-to-bone.json` maps lab test names to bone/organ mesh names + a severity derivation rule (threshold + direction).

**Real data ready:** `mydata/labs_bloodwork_2023-2026/` has Feb 2023 and Feb 2026 panels (TSH, PSA, HbA1c, Lipid, CMP, CBC, Hepatic Function, Lipase) structured with `value`, `unit`, `range`, `status`, and `flag` fields — already shaped for this mapping.

---

## Phase 5 — AI Narrative Layer

An LLM reads the full conditions + history and writes a plain-English summary: "Your spine has shown progressive degeneration over 3 years, likely correlated with the elevated inflammatory markers seen in Feb 2022." Collapsible panel or chat interface alongside the 3D view.

Anthropic API, straightforward to wire in.

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

**When to do this:** Before Phase 6 (real Cigna/FHIR data). FHIR already uses encounter-centric records — this schema maps naturally to it. Refactoring to `visits.json` before FHIR integration means one migration instead of two.

**Migration effort:** Medium. `conditions.json` → nested under visit imaging. `biomarkers.json` → nested under visit labs. `TimelineContext` sessions become visit IDs. UI components read from `visit.data.imaging` / `visit.data.labs` instead of separate files.

---

## Useful Patterns Already Established

- **Adding a new data layer**: create a new `*-conditions.json`, add a new lookup map in `BodyViewer.tsx`, traverse the relevant mesh names
- **New annotation style**: extend `BoneAnnotation` with a variant prop, or create a parallel component for organs
- **Per-bone animation**: `useFrame` hook can lerp `child.material.opacity` or `child.material.color` each frame based on timeline position
- **Ligaments**: the GLTF may not have ligament meshes; would need a separate model or procedural lines between bone anchor points using `THREE.Line`
- **Patient-specific mesh**: swap GLB path by patientId, use non-rigid registration to preserve bone naming convention
- **Demo vs real data**: `conditions.json` = demo, `conditions_real.json` = real radiology findings — one import swap to toggle
