# Imaging Enhancement Pipeline

End-to-end documentation for the ML-powered scan enhancement system in the Cigna health dashboard.
Covers what each enhancement does, the science behind it, how to reproduce it, and how it's wired into the UI.

---

## What This Is (And What It Isn't)

The Imaging tab in the right panel shows thumbnail cards for every scan in a visit. Clicking a card opens a modal with three views of that scan:

| Tab | What it shows |
|---|---|
| **Original** | The raw scan PNG as exported from the imaging system |
| **Bone Window** | False-color density map — tissue type by brightness |
| **AI Attention** | GradCAM heatmap from a pathology-trained neural network |

**Critical distinction:** All three enhancements are derived from the scan pixel data alone. None of them read from the patient's medical record, conditions list, or lab results. The AI attention map reflects what a neural network sees in the image — independent of any documented diagnosis. This is called out explicitly in the UI.

---

## Enhancement 1 — Super-Resolution (Original tab)

### What it does
Upscales the source scan 2× using a generative adversarial network trained on real-world degradation patterns. The output shown in the Original tab is the SR-enhanced version when available; the raw source is preserved separately.

### Model
**Real-ESRGAN** (Wang et al., 2021) — `RealESRGAN_x4plus` variant run at `--outscale 2`.

- GitHub: https://github.com/xinntao/Real-ESRGAN
- Paper: https://arxiv.org/abs/2107.10833

Real-ESRGAN uses a high-order degradation model during training (blur → resize → noise → JPEG) so it generalizes well to medical image compression artifacts and scanner noise, without needing to be fine-tuned on radiology data.

### Why it matters
PACS-exported PNGs are often downsampled from DICOM resolution for storage or transmission. SR recovers sub-pixel detail in trabecular structure and cortical margins — subtle features that are diagnostically relevant but invisible at compressed resolution.

---

## Enhancement 2 — Bone Window (false-color density map)

### What it does
Maps pixel intensity (a proxy for tissue density) to a perceptually uniform false-color scale using matplotlib's `hot` colormap:

```
black → dark red → orange → yellow → white
 air     muscle    fat      bone     dense cortex
```

The contrast is stretched between the 15th and 98th percentile of the image's pixel values to clip scanner background and film artifacts while preserving the full bone density range.

### Implementation
Pure NumPy/matplotlib — no ML model involved.

```python
def make_bone_window(arr):
    lo, hi = np.percentile(arr, 15), np.percentile(arr, 98)
    a = np.clip((arr.astype(float) - lo) / (hi - lo + 1e-6), 0, 1)
    rgba = cm.hot(a)
    return (rgba[:,:,:3] * 255).astype(np.uint8)
```

### Why it matters
Standard grayscale X-rays compress a wide density range into 256 shades the human eye struggles to distinguish. False-color maps small density differences to highly contrasting hues, making cortical thinning, sclerosis, and irregular density gradients visible at a glance — for both clinicians and patients.

**Reference:** Hounsfield Units (HU) — the underlying physics concept this simulates from pixel brightness.
https://radiopaedia.org/articles/hounsfield-unit

---

## Enhancement 3 — AI Attention (GradCAM)

### What it does
Runs the scan through a pretrained pathology classification network and produces a Gradient-weighted Class Activation Map (GradCAM) — a spatial heatmap showing which regions of the image most strongly activated the model's output neurons. Warm colors (red/yellow) = high model activation.

### Model
**TorchXRayVision DenseNet-121** (`densenet121-res224-all`):
- Trained on 112,120 frontal chest radiographs
- Covers 14 pathology classes (Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema, Fibrosis, Hernia, Infiltration, Mass, Nodule, Pleural Thickening, Pneumonia, Pneumothorax)
- Weights from: Cohen et al. 2022, "TorchXRayVision: A library of chest X-ray datasets and models"

GradCAM target layer: `features.denseblock4.denselayer16.conv2` (last convolutional layer of the DenseNet trunk — highest semantic resolution).

### Implementation

```python
model = xrv.models.DenseNet(weights='densenet121-res224-all')
model.eval().cuda()

target_layer = [model.features.denseblock4.denselayer16.conv2]
cam = GradCAM(model=model, target_layers=target_layer)

def make_heatmap(arr_gray):
    # Normalize to xrv's expected [-1024, 1024] range
    img_norm = (arr_gray.astype(float) / 255.0) * 2048 - 1024
    img_t = torch.FloatTensor(img_norm).unsqueeze(0).unsqueeze(0)
    img_t = F.interpolate(img_t, size=(224, 224), mode='bilinear').cuda()

    grayscale_cam = cam(input_tensor=img_t)
    # Resize CAM back to original image resolution
    cam_resized = np.array(Image.fromarray(
        (grayscale_cam[0] * 255).astype(np.uint8)
    ).resize((arr_gray.shape[1], arr_gray.shape[0]))) / 255.0

    rgb = np.stack([arr_gray]*3, axis=-1).astype(float) / 255.0
    return show_cam_on_image(rgb, cam_resized, use_rgb=True, colormap=9, image_weight=0.55)
```

### Important caveat
This model was trained on **chest X-rays only**. When applied to lumbar spine, skull, or cervical X-rays, the classification labels are meaningless — but the spatial attention map still highlights regions of unusual density relative to what the model considers "normal" anatomy. The heatmap should be read as "density anomaly signal," not as a named pathology detection.

For chest-specific scans (CT head, thoracic), classification labels are more meaningful.

### Research references
- GradCAM: Selvaraju et al. (2017) — https://arxiv.org/abs/1610.02391
- CheXNet: Rajpurkar et al. (2017) — https://arxiv.org/abs/1711.05225
- TorchXRayVision: Cohen et al. (2022) — https://github.com/mlmed/torchxrayvision

---

## GPU Box Setup

All enhancement processing runs on a dedicated GPU workstation accessed over Tailscale.

```
Host:     dev@100.69.124.73   (Tailscale — must be on VPN)
GPU:      NVIDIA RTX 4090 (24 GB VRAM)
CUDA:     12.2
Python:   3.10.12  (no conda — use python3)
PyTorch:  2.6.0+cu124
```

### Software installed
| Package | Location / install |
|---|---|
| Real-ESRGAN | `~/Real-ESRGAN` (cloned) |
| TorchXRayVision | `pip install torchxrayvision` |
| pytorch-grad-cam | `pip install grad-cam` |
| trimesh | `pip install trimesh` (pre-installed) |
| pyfqmr | `pip install pyfqmr` |
| scikit-image | pre-installed |

### SSH access
Keys are already configured. Connect with:
```bash
ssh dev@100.69.124.73
```
Sudo password: stored in team 1Password (vault: Dev Machines).

---

## Running the Pipeline

### Prerequisites
1. SSH into the GPU box
2. Source scan PNGs must be in `~/scan_inputs/` (named `scan_<name>.png`)
3. Real-ESRGAN weights download automatically on first run

### Step 1 — Bone Window + GradCAM

```bash
ssh dev@100.69.124.73
python3 ~/enhance_scans.py
```

Output: `~/scan_enhanced/<name>_bone.png` and `~/scan_enhanced/<name>_heatmap.png`

Runtime: ~3–5 seconds per scan on RTX 4090 (model load ~8s one-time).

To add new scans, edit the `SCANS` list in `~/enhance_scans.py`:
```python
SCANS = [
    'scan_lumbar_ap',
    'scan_lumbar_lat',
    # add new scan names here (without .png extension)
]
```

### Step 2 — Super-Resolution

```bash
ssh dev@100.69.124.73
cd ~/Real-ESRGAN
python3 inference_realesrgan.py \
  -n RealESRGAN_x4plus \
  -i ~/scan_inputs \
  -o ~/scan_enhanced \
  --outscale 2 \
  --fp32 \
  --suffix _sr
```

Output: `~/scan_enhanced/<name>__sr.png` (note double underscore — Real-ESRGAN appends `_sr` to the stem)

`--outscale 2` produces 2× upscaled output. Use `4` for maximum detail (larger file, longer load time in browser).
`--fp32` avoids half-precision artifacts on medical grayscale images.

Runtime: ~2–4 seconds per image on RTX 4090.

### Step 3 — Transfer to app

From your local machine (Mac):
```bash
# Enhanced images → app public folder
scp "dev@100.69.124.73:/home/dev/scan_enhanced/*.png" \
    /Users/dev/Desktop/cigna/public/scans-enhanced/
```

### Step 4 — Update visits.json

For each new scan, add the enhanced paths to `src/data/visits.json`:

```json
{
  "modality": "XR",
  "region": "Lumbar Spine AP",
  "src":      "/scans/scan_lumbar_ap.png",
  "enhanced": "/scans-enhanced/scan_lumbar_ap__sr.png",
  "bone":     "/scans-enhanced/scan_lumbar_ap_bone.png",
  "heatmap":  "/scans-enhanced/scan_lumbar_ap_heatmap.png"
}
```

The modal gracefully falls back to `src` for any missing enhanced path — so you can add scans incrementally without breaking existing cards.

---

## visits.json Schema

```jsonc
{
  "visits": {
    "<session-id>": {           // matches TimelineContext selectedSession
      "type": "Imaging | Imaging + Labs | Labs",
      "imaging": [
        {
          "modality": "XR | CT | MRI",
          "region":   "human-readable scan region",
          "src":      "/scans/<filename>.png",          // required — original
          "enhanced": "/scans-enhanced/<name>__sr.png", // optional — Real-ESRGAN SR
          "bone":     "/scans-enhanced/<name>_bone.png",// optional — density colormap
          "heatmap":  "/scans-enhanced/<name>_heatmap.png" // optional — GradCAM
        }
      ]
    }
  }
}
```

All paths are relative to `public/` and served statically by Next.js.

---

## UI Components

### `ScanModal` (`src/components/ScanModal.tsx`)

Single-image deep-dive modal. Opened by clicking any imaging card.

**Props:**
```typescript
interface Props {
  image: ImagingEntry   // single scan with src + optional enhanced/bone/heatmap paths
  onClose: () => void
}
```

**Behavior:**
- `ESC` key closes the modal
- Tabs are disabled (grayed out) if the corresponding enhanced image isn't present in the data
- Reference chips are external links (`target="_blank"`) to papers/docs
- Falls back to `src` silently for any missing enhanced path

**Mode config lives entirely in `MODES` constant** — add a new enhancement type by adding a key there and a corresponding field to `ImagingEntry`.

### Imaging card hover state (`RightPanel.tsx`)

```tsx
<div
  className="relative group glass-panel ... cursor-pointer"
  onClick={() => setModalImage(img as ImagingEntry)}
>
  <div className="relative h-36 rounded-xl overflow-hidden bg-black/40">
    <img src={img.src} ... />
    {/* hover overlay */}
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-[10px] font-[300] text-white/80">View Enhanced →</span>
    </div>
  </div>
</div>
```

Modal state: `useState<ImagingEntry | null>(null)` in `RightPanel`.

---

## File Layout

```
public/
  scans/                          original scan PNGs (gitignored)
    scan_lumbar_ap.png
    scan_lumbar_lat.png
    scan_cervical_lat.png
    scan_abdomen_ap.png
    scan_ct_brain.png
    scan_ct_head.png
    scan_skull_ap.png
    scan_skull_lat.png

  scans-enhanced/                 ML-processed outputs (gitignored)
    scan_lumbar_ap__sr.png        Real-ESRGAN 2× SR
    scan_lumbar_ap_bone.png       false-color density map
    scan_lumbar_ap_heatmap.png    GradCAM attention overlay
    ... (×8 scans = 24 files)

src/
  data/
    visits.json                   session → imaging entry mapping
  components/
    ScanModal.tsx                 deep-dive modal (single image, 3 tabs)
    RightPanel.tsx                imaging card grid + modal trigger

GPU box (dev@100.69.124.73):
  ~/scan_inputs/                  source PNGs (copied from public/scans/)
  ~/scan_enhanced/                processed outputs (scp back to public/scans-enhanced/)
  ~/enhance_scans.py              bone window + GradCAM pipeline
  ~/Real-ESRGAN/                  SR inference repo
```

---

## Adding a New Scan to an Existing Visit

1. **Place the source PNG** in `public/scans/scan_<name>.png`
2. **Copy to GPU box:**
   ```bash
   scp public/scans/scan_<name>.png dev@100.69.124.73:~/scan_inputs/
   ```
3. **Add to the SCANS list** in `~/enhance_scans.py` on the GPU box
4. **Run enhancement pipeline** (Steps 1–2 above)
5. **Transfer output** back (Step 3 above)
6. **Add entry to `visits.json`** (Step 4 above) under the correct session key

---

## Adding a New Enhancement Type

1. **Generate the processed images** on the GPU box, copy to `public/scans-enhanced/`
2. **Add a field to `ImagingEntry`** in `RightPanel.tsx` and `ScanModal.tsx`
3. **Add a new `Mode` type** and entry to the `MODES` constant in `ScanModal.tsx`
4. **Add the new field to `visits.json`** entries

No other files need changing — the modal renders tabs dynamically from `MODES`.

---

## Research Backlog

See ROADMAP.md for queued improvements. Key items relevant to this pipeline:

- **X2BR** (arXiv 2504.08675) — single X-ray → lumbar/cervical bone mesh. April 2025 preprint, no weights yet. When code releases, this enables true anatomy-shaped 3D in the imaging cards.
- **SpineFM** — vertebrae segmentation overlay (L1–L5 labeled) on X-rays. Needs data loader adaptation for our PNG format.
- **BioViL-T + MedSAM2** — condition-text → scan region grounding. "L4-L5 herniation" → highlighted region on the actual scan.
- **TotalSegmentator** — full organ/bone segmentation from DICOM CT stacks. Requires pulling raw DICOM from Philips IntelliSpace PACS rather than exported PNGs.
- **Two-visit comparison** — diff two sessions of the same scan type side-by-side in the modal.
