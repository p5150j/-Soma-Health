# Data Model & Data Sources

This document covers how all patient data was obtained, the JSON schemas that drive the app today, what additional data is available from UC Health, and the planned Firebase migration path for production.

---

## Data Sources — How We Got Here

All data is Patrick Ortell's personal health record obtained through:

**UC Health Patient Portal (MyChart / Epic)**
- URL: `mychart.uchealth.org`
- Access: standard patient login → Test Results, Imaging, Visit History
- Data available: lab results (all panels), radiology reports, visit history, imaging studies

**UC Health IntelliSpace PACS Anywhere**
- URL: Philips IntelliSpace web DICOM viewer (linked from MyChart imaging records)
- Access: patient login → launches web-based DICOM viewer
- Data available: full DICOM series for every imaging study. Studies go back to at least 2009.
- Export method: screenshot (bone window / soft tissue window) or DICOM download

### What was pulled and where it lives

| Source | Raw data location | Processed into |
|---|---|---|
| XR Lumbar Spine 3-View AP/LAT/SPOT (May 2017) | `mydata/imaging/*.png` (gitignored) | `src/data/conditions_real.json` |
| CT Abdomen/Pelvis WO Contrast (Feb 12, 2026) | `mydata/imaging/*.png` (gitignored) | `src/data/conditions_real.json`, `conditions_organs.json` |
| Radiology report text (both studies) | `mydata/imaging/radiology_findings_spine.json` (gitignored) | Manually transcribed into conditions JSON |
| Lab panels Feb 2026 (BMP, CBC, LFT, Lipids, Hormones, UA) | `mydata/labs_bloodwork_2023-2026/lab_results_feb_2026.json` (gitignored) | `src/data/biomarkers.json` |
| Lab panels Feb 2023 | `mydata/labs_bloodwork_2023-2026/lab_results_feb_2023.json` (gitignored) | `src/data/biomarkers.json` (history[0] entries) |
| PACS scan screenshots | `mydata/imaging/scanimages/` (gitignored) | `public/scans/*.png` (selected, cropped) |

> `mydata/` is gitignored — raw source material only, never committed. `public/scans/` contains the cleaned exports used by the app.

---

## More Data Available from UC Health (not yet pulled)

Everything below is accessible in MyChart or IntelliSpace right now:

| Data | Where | Value |
|---|---|---|
| CT Brain axial/coronal/sagittal + bone window (Jun 2019) | IntelliSpace | Phase 7 patient skeleton, skull shape |
| CT Abdomen/Pelvis W Contrast (Feb 16–17, 2026) | IntelliSpace | More organ detail than the WO series |
| Additional lab panels 2019–2023 | MyChart → Test Results | More history points per biomarker |
| Imaging studies 2009–2017 | IntelliSpace | Long-form trajectory data |
| Visit notes / provider summaries | MyChart → Visit History | Clinical context for each encounter |
| Medication history | MyChart → Medications | Potential Phase 6 data layer |
| Immunizations, allergies | MyChart | Profile enrichment |

Pulling additional lab history = more history entries in `biomarkers.json` = richer trajectory charts and better LLM context. The data contract doesn't change — just add entries to the `history` array.

---

## Current JSON Schemas (`src/data/`)

### `conditions_real.json` — Skeletal findings per bone

```json
{
  "patientId": "Patrick Ortell",
  "sessions": [
    { "id": "2017-05", "label": "May 2017", "year": "2017", "status": null },
    { "id": "2026-02", "label": "Feb 2026", "year": "2026", "status": "active" }
  ],
  "conditions": [
    {
      "bone": "l1",               // mesh name prefix in skeleton_lo.glb (→ l1_beige_0)
      "displayName": "Lumbar L1",
      "icd10": "M51.16",
      "description": "...",
      "history": [
        { "session": "2017-05", "severity": "watch",    "label": "Disc Narrowing" },
        { "session": "2026-02", "severity": "critical", "label": "Advanced Disc Narrowing" }
      ]
    }
  ]
}
```

`severity` values: `"watch"` | `"critical"` | `"normal"`
`bone` maps directly to `<bone>_beige_0` mesh names in the GLTF. Full list in `skeleton-nodes.json`.

---

### `conditions_organs.json` — Organ findings

```json
{
  "conditions": [
    {
      "organ": "liver",           // key in OrganLayer ORGANS array
      "displayName": "Liver",
      "icd10": "K76.0",
      "description": "...",
      "history": [
        { "session": "2026-02", "severity": "watch", "label": "Hepatic Steatosis" }
      ]
    }
  ]
}
```

Same `severity` / `session` shape as conditions_real. `organ` key matches `OrganLayer.tsx` ORGANS array.

---

### `biomarkers.json` — Lab markers with reference ranges

```json
{
  "categories": ["Hormone", "Circulatory", "Immune", "Digestive", "Urinary"],
  "biomarkers": {
    "Hormone": [
      {
        "label": "HbA1c",
        "unit": "%",
        "noChart": false,
        "rangeMin": 4.0,       // outer edge of chart axis
        "rangeMax": 10.0,
        "normalMin": 4.0,      // green zone start
        "normalMax": 5.6,      // green zone end
        "mean": 5.7,           // NHANES population mean tick
        "history": [
          {
            "session": "2017-05",
            "value": "5.1",
            "trend": "→",      // ↗ | ↘ | →
            "indicator": "green"  // green | yellow | red
          },
          {
            "session": "2026-02",
            "value": "5.1",
            "trend": "→",
            "indicator": "green",
            "delta": "+0.0",   // optional — shown below value
            "note": "Stable"   // optional — shown below delta
          }
        ]
      }
    ]
  }
}
```

`value` is a **string** (not number) to preserve decimal formatting exactly — `AnimatedValue` in MetricCard reads decimal count from the string.
Reference ranges come from NHANES population data and standard clinical reference intervals.

---

### `lab-highlights.json` — Flagged labs with body targets

```json
{
  "highlights": [
    {
      "session": "2026-02",
      "marker": "Hemoglobin",
      "label": "Hemoglobin HIGH",
      "value": "17.0",
      "unit": "g/dL",
      "note": "Polycythemia pattern — elevated marrow output",
      "severity": "watch",            // watch | critical
      "boneTargets": ["sternum", "l1", "l5", "r_femur", "l_femur"],
      "organTargets": []
    }
  ]
}
```

Drives the cyan lab-highlight layer on the 3D body. `boneTargets` → bone mesh names, `organTargets` → organ keys. `TimelineContext` filters by `session` → `labTargets` computed value.

---

### `visits.json` — Imaging per visit (partial visit-centric model)

```json
{
  "visits": {
    "2017-05": {
      "type": "XR",
      "imaging": [
        { "modality": "XR Lumbar AP", "region": "Lumbar Spine", "src": "/scans/scan_lumbar_ap.png" }
      ]
    },
    "2026-02": {
      "type": "CT",
      "imaging": [...]
    }
  }
}
```

This is a partial implementation of the visit-centric model. Only imaging is here — labs and conditions are still in separate files. See ROADMAP.md backlog for the full visit-centric migration plan.

---

## Firebase Migration Plan (Phase 6)

Today the app reads static JSON files bundled with the Next.js build. For a real product — multi-patient, authenticated, live data — everything moves to Firebase.

### Target architecture

```
Firebase Auth
  └── Patient logs in (Google / email)
      └── UID gates all Firestore reads

Firestore
  └── patients/{uid}/
      ├── profile              → replaces left panel hardcoded data
      ├── sessions/{sessionId} → replaces sessions[] in conditions_real.json
      ├── conditions/{bone}    → replaces conditions_real.json
      ├── organConditions/{organ} → replaces conditions_organs.json
      ├── biomarkers/{category}/{marker} → replaces biomarkers.json
      ├── labHighlights/{id}   → replaces lab-highlights.json
      └── visits/{sessionId}   → replaces visits.json

Firebase Storage
  └── patients/{uid}/scans/{sessionId}/{filename}
      → replaces public/scans/ (authenticated URLs, not public)
```

### Firestore collection shapes

The JSON shapes above map nearly 1:1 to Firestore documents. Key differences:

| Today (JSON) | Firebase (Firestore) |
|---|---|
| `sessions[]` array in conditions_real.json | `patients/{uid}/sessions` subcollection |
| `history[]` array per condition | `patients/{uid}/conditions/{bone}/history` subcollection |
| `biomarkers.Hormone[]` array | `patients/{uid}/biomarkers/Hormone/markers` subcollection |
| `visits` keyed object | `patients/{uid}/visits` subcollection, `sessionId` as doc ID |
| `lab-highlights` flat array | `patients/{uid}/labHighlights` subcollection |

### What changes in the app

- `TimelineContext` replaces JSON imports with `onSnapshot()` listeners — real-time updates
- `src/data/*.json` files become the **seed data** for the first patient document
- `buildPatientJson()` in AnalyzePanel queries Firestore instead of importing files
- `public/scans/` images move to Firebase Storage — `getDownloadURL()` per scan, gated by auth
- ANTHROPIC_API_KEY stays server-side (Next.js API route, not Firestore)

### Migration steps when ready

1. Add Firebase SDK + config to Next.js (`firebase.ts` client, env vars for project config)
2. Write a one-time seed script: read current JSON files → write to Firestore under a `patients/patrick` doc
3. Replace JSON imports in `TimelineContext` with Firestore reads
4. Add Firebase Auth gate to the root layout
5. Move `public/scans/` to Firebase Storage, update `visits.json` `src` fields to Storage URLs
6. Wire BAML `buildPatientJson()` to query Firestore instead of static imports

The data contracts (JSON shapes) were designed to be FHIR-adjacent — `sessionId` = encounter ID, `boneTargets` = body site codes, `icd10` fields already present. A future FHIR adapter layer could map UC Health / Cigna FHIR resources directly to the Firestore schema.

---

## PII Posture

| Data | In repo | Public on Netlify | Notes |
|---|---|---|---|
| Name "Patrick Ortell" | ✅ src/data/ | ✅ (in UI) | Personal app, consented |
| Patient ID "SV-7294" | ✅ src/data/ | ✅ (in UI) | Fictional/anonymized ID |
| DOB | ❌ | ❌ | Age (49) shown, not full DOB |
| SSN | ❌ | ❌ | Never in any file |
| Address / phone | ❌ | ❌ | Never in any file |
| Insurance / policy # | ❌ | ❌ | Never in any file |
| Lab values | ✅ src/data/ | ✅ (in UI) | Real values, personal app |
| Scan images | ✅ public/scans/ | ✅ (in UI) | No burned-in PHI visible |
| Raw UC Health exports | ❌ | ❌ | gitignored in mydata/ |
| MyChart screenshots | ❌ | ❌ | gitignored in mydata/ |
| API keys | ❌ | ❌ | .env.local, gitignored |

When this becomes a multi-patient product: all `src/data/*.json` content moves to Firestore behind auth, `public/scans/` moves to Firebase Storage, and nothing patient-specific ships in the build.
