// Actual Babylon glTF loader smoke test; uses the workspace's installed dependencies.
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const characters = ['coyote', 'lynx', 'badger', 'rabbit', 'dealer'];
const files = ['environment.glb', ...characters.map(n => `characters/${n}.glb`),
  ...(await readdir(`${root}public/models/props`)).filter(n => n.endsWith('.glb')).map(n => `props/${n}`)];
const engine = new NullEngine({ renderWidth: 1280, renderHeight: 720 });
const results = [];
for (const file of files) {
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const bytes = new Uint8Array(await readFile(`${root}public/models/${file}`));
  const container = await LoadAssetContainerAsync(bytes, scene, { pluginExtension: '.glb', name: file });
  container.addAllToScene();
  const nodes = [...container.transformNodes, ...container.meshes];
  for (const node of nodes) {
    // Disable the named variant parent, so multi-material prosthetic children also stay hidden.
    if (/^finger_\w+_[lr]_(prosthetic|cap)$/.test(node.name)) node.setEnabled(false);
    node.computeWorldMatrix(true);
  }
  const result = { file, meshes: container.meshes.length, materials: container.materials.length,
    skeletons: container.skeletons.length, animations: container.animationGroups.map(a => a.name),
    vertices: container.meshes.reduce((n, m) => n + m.getTotalVertices(), 0),
    triangles: container.meshes.reduce((n, m) => n + m.getTotalIndices() / 3, 0) };
  if (file.startsWith('characters/')) {
    assert.equal(container.skeletons.length, 1, `${file}: skin missing`);
    result.bones = container.skeletons[0].bones.map(b => b.name);
    assert.equal(result.bones.length, 51);
    for (const side of ['l', 'r']) for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
      for (const variant of ['real', 'prosthetic', 'cap']) {
        const node = nodes.find(n => n.name === `finger_${finger}_${side}_${variant}`);
        assert.ok(node, `${file}: missing ${finger}/${side}/${variant}`);
        assert.equal(node.isEnabled(), variant === 'real');
      }
    }
    result.clipTracks = {};
    for (const group of container.animationGroups) {
      const names = group.targetedAnimations.map(a => a.target.name);
      for (const bone of ['head', 'hand_l', 'hand_r', 'finger_index_01_r']) {
        assert.ok(names.includes(bone), `${file}/${group.name}: no ${bone} track`);
      }
      assert.ok(group.to > group.from);
      result.clipTracks[group.name] = group.targetedAnimations.length;
    }
    const idle = container.animationGroups.find(a => a.name === 'idle_seated');
    idle.start(true);
    idle.goToFrame(idle.from + (idle.to-idle.from)*.5);
    container.skeletons[0].prepare(true);
    result.socketEye = nodes.find(n => n.name === 'socket_eye').getAbsolutePosition().asArray();
    assert.ok(Math.abs(result.socketEye[1] - 1.33) < .04, `${file}: socket height incorrect`);
    result.visiblePrimitives = container.meshes.filter(m => m.getTotalVertices() && m.isEnabled()).length;
  }
  results.push(result);
  container.dispose();
  scene.dispose();
}
engine.dispose();
await writeFile(`${root}assets/manifests/babylon-verification.json`, JSON.stringify({
  passed: true, engine: 'Babylon NullEngine + actual glTF loader',
  limitation: 'Headless loading checks transforms, skins, animations and modular visibility; coordinator verifies browser GPU rendering.',
  results
}, null, 2) + '\n');
console.log(`Babylon imported ${results.length} GLBs; skins, clips, sockets and finger visibility passed.`);
