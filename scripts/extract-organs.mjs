// Extracts individual organ meshes from the UMCG abdomen_anatomy.glb
// Outputs one clean GLB per organ to public/organs/
import { NodeIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, cloneDocument } from '@gltf-transform/functions'
import { execSync } from 'child_process'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')
const INPUT_ABDOMEN = '/Users/dev/Downloads/abdomen_anatomy.glb'
const INPUT_THORAX  = '/Users/dev/Downloads/healthy_heart_and_lungs.glb'
const OUT_DIR   = resolve(ROOT, 'public/organs')
const TMP_DIR   = '/tmp/organ-extract'

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(TMP_DIR, { recursive: true })

// Map our organ key → mesh name in the GLB (take the first occurrence)
const EXTRACT = {
  liver:       'Lever_liver_mat_0',
  spleen:      'Spleen_Milt_spleen_mat_0',
  pancreas:    'Pancreas_pancreas_mat_0',
  kidney_r:    'Kidney_R_kidneys_mat_0',
  kidney_l:    'Kidney_L_kidneys_mat_0',
  bladder:     'Bladder_Blaas_bladder_mat_0',
  heart:       'Heart_arteries_mat_0',
  gallbladder: 'Gallbladder_Galblaas_gallbladder_mat_0',
  stomach:     'Intestine_Small_Dunne_darms_stomach_mat_0',
}

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS)

console.log('Loading abdomen GLB…')
const srcDoc = await io.read(INPUT_ABDOMEN)

for (const [key, meshName] of Object.entries(EXTRACT)) {
  console.log(`\nExtracting ${key} (${meshName})…`)

  // Clone so we start fresh each time
  const doc = cloneDocument(srcDoc)
  const root = doc.getRoot()

  // Remove all nodes whose mesh doesn't match — keep the FIRST matching node only
  let kept = false
  for (const scene of root.listScenes()) {
    for (const node of scene.listChildren()) {
      removeUnwanted(node, meshName, { kept: false })
    }
  }

  // Simpler approach: iterate all nodes in the doc and detach unwanted ones
  kept = false
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    if (mesh.getName() === meshName && !kept) {
      kept = true   // keep first match
    } else if (mesh) {
      node.setMesh(null)  // detach mesh but keep node hierarchy
    }
  }

  // Strip all textures — we apply our own materials
  for (const tex of root.listTextures()) {
    tex.dispose()
  }
  for (const mat of root.listMaterials()) {
    mat.setBaseColorTexture(null)
    mat.setNormalTexture(null)
    mat.setMetallicRoughnessTexture(null)
    mat.setOcclusionTexture(null)
    mat.setEmissiveTexture(null)
  }

  await doc.transform(dedup(), prune())

  const tmp = `${TMP_DIR}/${key}.glb`
  await io.write(tmp, doc)

  // No Draco — files are tiny, plain GLB avoids decoder dependency
  const out = `${OUT_DIR}/${key}.glb`
  copyFileSync(tmp, out)
  execSync(`ls -lh "${out}"`, { stdio: 'inherit' })
}

function removeUnwanted(node, meshName, state) {
  // no-op helper — we handle this inline above
}

// ── Lungs from thorax model ──────────────────────────────────────────────────
console.log('\nLoading thorax GLB…')
const thoraxDoc = await io.read(INPUT_THORAX)

const LUNG_EXTRACT = {
  lung_l: 'linkerlong3_linkerlong3_0',
  lung_r: 'normaal6_normaal6_0',
}

for (const [key, meshName] of Object.entries(LUNG_EXTRACT)) {
  console.log(`\nExtracting ${key} (${meshName})…`)
  const doc  = cloneDocument(thoraxDoc)
  const root = doc.getRoot()
  let kept = false
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    if (mesh.getName() === meshName && !kept) {
      kept = true
    } else {
      node.setMesh(null)
    }
  }
  for (const tex of root.listTextures()) tex.dispose()
  for (const mat of root.listMaterials()) {
    mat.setBaseColorTexture(null)
    mat.setNormalTexture(null)
    mat.setMetallicRoughnessTexture(null)
    mat.setOcclusionTexture(null)
    mat.setEmissiveTexture(null)
  }
  await doc.transform(dedup(), prune())
  const out = `${OUT_DIR}/${key}.glb`
  await io.write(out, doc)
  execSync(`ls -lh "${out}"`, { stdio: 'inherit' })
}

console.log('\nDone. Check public/organs/')
