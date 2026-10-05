"""Verify portable packed Blender sources and the exported card's UVs, winding, scale."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
report={'passed':True,'sources':[]}
for name in ['magic_cards_pixel.blend','magic_cards_preview.blend']:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/cards'/name))
    images=[im for im in bpy.data.images if im.name!='Render Result']
    assert all(im.packed_file for im in images),[im.name for im in images if not im.packed_file]
    assert all(n in bpy.data.collections for n in ['SOURCE','EXPORT','PREVIEW'])
    report['sources'].append({'file':'assets/blender/cards/'+name,'packedImages':len(images),'collections':['SOURCE','EXPORT','PREVIEW']})
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/props/magic_card.glb'))
obj=bpy.data.objects['prop_magic_card'];mesh=obj.data
assert len(mesh.materials)==3
assert mesh.uv_layers.active
bounds=[obj.matrix_world@Vector(v) for v in obj.bound_box]
lo=[min(v[i] for v in bounds) for i in range(3)];hi=[max(v[i] for v in bounds) for i in range(3)]
dims=[hi[i]-lo[i] for i in range(3)]
assert all(abs(a-b)<1e-6 for a,b in zip(dims,[.064,.0008,.088])),dims
mesh.calc_loop_triangles();assert len(mesh.loop_triangles)==64
normals={}
for p in mesh.polygons:
    normals.setdefault(mesh.materials[p.material_index].name,[]).append(list(p.normal))
front=next(v for k,v in normals.items() if 'K01' in k);back=next(v for k,v in normals.items() if 'back' in k)
assert all(v[1]<-.99 for v in front);assert all(v[1]>.99 for v in back)
assert all(0<=uv.uv.x<=1 and 0<=uv.uv.y<=1 for uv in mesh.uv_layers.active.data)
report['roundtrip']={'node':obj.name,'triangles':len(mesh.loop_triangles),'materials':[m.name for m in mesh.materials],'sourceBlenderDimensions':dims,'frontNormal':'-Y (GLB +Z)','backNormal':'+Y (GLB -Z)','uvWithinUnitSquare':True}
(ROOT/'assets/manifests/pixel-blender-roundtrip.json').write_text(json.dumps(report,indent=2)+'\n')
print('Nguồn Blender packed và GLB roundtrip: đạt')
