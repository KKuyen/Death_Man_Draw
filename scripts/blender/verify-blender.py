"""Round-trip every GLB through Blender's importer and check the real finger skinning."""
import json
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
reports=[]
for file in sorted((ROOT/'public/models').rglob('*.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(file))
    rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert meshes, f'{file}: empty import'
    report=dict(file=str(file.relative_to(ROOT)),meshes=len(meshes),armatures=len(rigs))
    if file.parent.name=='characters':
        assert len(rigs)==1
        rig=rigs[0]
        assert len(rig.data.bones)==51
        report['bones']=len(rig.data.bones)
        report['modularSkinChecks']=[]
        for side in ['l','r']:
            for finger in ['thumb','index','middle','ring','pinky']:
                for variant in ['real','prosthetic','cap']:
                    node=f'finger_{finger}_{side}_{variant}'
                    ob=bpy.data.objects[node]
                    assert any(mod.type=='ARMATURE' and mod.object==rig for mod in ob.modifiers)
                    used={}
                    for vertex in ob.data.vertices:
                        assert vertex.groups
                        assert abs(sum(g.weight for g in vertex.groups)-1)<.0001
                        assert len(vertex.groups)<=2
                        for group in vertex.groups:
                            if group.weight>.0001:
                                used[ob.vertex_groups[group.group].name]=True
                    if variant!='cap':
                        assert all(f'finger_{finger}_{i:02}_{side}' in used for i in range(1,4))
                    report['modularSkinChecks'].append(dict(node=node,influencingBones=list(used)))
                    ob.hide_render=variant!='real'
        report['sockets']={name:list(bpy.data.objects[name].matrix_world.translation)
                           for name in ['socket_eye','socket_card_l','socket_card_r']}
        report['actions']=[a.name for a in bpy.data.actions]
        assert len(report['actions'])>=35
    reports.append(report)
(ROOT/'assets/manifests/blender-roundtrip.json').write_text(json.dumps(dict(passed=True,
    blenderVersion=bpy.app.version_string,results=reports),indent=2)+'\n')
print(f'Blender round-trip passed for {len(reports)} GLBs; all modular variants use actual exported skin weights.')
