"""Original deterministic stylized saloon, modular characters and gameplay props.

Run through run.py or Blender --background --python generate.py -- --seed 1701.
Only Blender's bundled Python/stdlib are required. No downloaded art or textures.
"""
import argparse
import json
import math
from pathlib import Path
import random
import struct
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'public/models'
SOURCES = ROOT / 'assets/blender'
PREVIEWS = ROOT / 'assets/previews'
MANIFESTS = ROOT / 'assets/manifests'
TAU = math.tau
FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky']
SEATS = [(-1.35, .55), (-1, -1.15), (1, -1.15), (1.35, .55)]


def material(name, rgb, rough=.72, metal=0, emission=0):
    mat = bpy.data.materials.new('mat_' + name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    if emission:
        bs.inputs['Emission Color'].default_value = (*rgb, 1)
        bs.inputs['Emission Strength'].default_value = emission
    return mat


class Mesh:
    """Small mesh authoring helper; carries genuine skin weights per vertex."""
    def __init__(self, mats):
        self.mats, self.v, self.f, self.mi, self.w = mats, [], [], [], []

    def add(self, verts, faces, mat=0, bone=None, weights=None):
        offset = len(self.v)
        self.v.extend(verts)
        self.f.extend(tuple(offset + i for i in face) for face in faces)
        self.mi.extend([mat] * len(faces))
        self.w.extend(weights if weights is not None else [{bone: 1} if bone else {} for v in verts])

    def ellipsoid(self, center, radii, mat=0, bone=None, seg=16, rings=10, rot=None):
        verts = []
        for j in range(rings + 1):
            phi = math.pi * j / rings
            for i in range(seg):
                a = TAU * i / seg
                point = Vector((radii[0] * math.sin(phi) * math.cos(a),
                                radii[1] * math.sin(phi) * math.sin(a), radii[2] * math.cos(phi)))
                if rot:
                    point = rot @ point
                verts.append(tuple(point + Vector(center)))
        faces = []
        # Avoid duplicate pole triangles by quads on middle rings and one triangle at poles.
        for j in range(rings):
            for i in range(seg):
                a, b = j * seg + i, j * seg + (i + 1) % seg
                c, d = (j + 1) * seg + (i + 1) % seg, (j + 1) * seg + i
                if j == 0:
                    faces.append((a, d, c))
                elif j == rings - 1:
                    faces.append((a, d, b))
                else:
                    faces.append((a, d, c, b))
        self.add(verts, faces, mat, bone)

    def tube(self, a, b, radius, mat=0, bone=None, seg=12, r2=None):
        a, b = Vector(a), Vector(b)
        axis = (b - a).normalized()
        u = axis.cross(Vector((0, 0, 1)))
        if u.length < .001:
            u = axis.cross(Vector((0, 1, 0)))
        u.normalize()
        v = axis.cross(u)
        verts = []
        for center, r in [(a, radius), (b, radius if r2 is None else r2)]:
            verts.extend(tuple(center + r * (math.cos(i * TAU / seg) * u + math.sin(i * TAU / seg) * v))
                         for i in range(seg))
        faces = [(i, (i + 1) % seg, seg + (i + 1) % seg, seg + i) for i in range(seg)]
        faces += [tuple(reversed(range(seg))), tuple(range(seg, seg * 2))]
        self.add(verts, faces, mat, bone)

    def box(self, center, size, mat=0, bone=None, rot=0):
        verts = []
        for x, y, z in [(-1,-1,-1), (1,-1,-1), (1,1,-1), (-1,1,-1),
                        (-1,-1,1), (1,-1,1), (1,1,1), (-1,1,1)]:
            x, y, z = x * size[0] / 2, y * size[1] / 2, z * size[2] / 2
            verts.append((center[0] + x * math.cos(rot) - y * math.sin(rot),
                          center[1] + x * math.sin(rot) + y * math.cos(rot), center[2] + z))
        self.add(verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], mat, bone)

    def oval(self, center, radii, depth, mat=0, bone=None, seg=64):
        verts = [(center[0] + radii[0] * math.cos(i * TAU / seg),
                  center[1] + radii[1] * math.sin(i * TAU / seg), center[2] + z * depth / 2)
                 for z in [-1,1] for i in range(seg)]
        faces = [(i,(i+1)%seg,seg+(i+1)%seg,seg+i) for i in range(seg)]
        faces += [tuple(reversed(range(seg))),tuple(range(seg,seg*2))]
        self.add(verts, faces, mat, bone)

    def ring(self, center, radii, tube, mat=0, bone=None, seg=48, cross=6):
        verts = []
        for i in range(seg):
            a = TAU * i / seg
            for j in range(cross):
                b = TAU * j / cross
                verts.append((center[0] + (radii[0] + tube * math.cos(b)) * math.cos(a),
                              center[1] + (radii[1] + tube * math.cos(b)) * math.sin(a),
                              center[2] + tube * math.sin(b)))
        faces = [(i*cross+j, ((i+1)%seg)*cross+j, ((i+1)%seg)*cross+(j+1)%cross,
                  i*cross+(j+1)%cross) for i in range(seg) for j in range(cross)]
        self.add(verts, faces, mat, bone)

    def object(self, name, rig=None, bevel=0):
        mesh = bpy.data.meshes.new(name + '_mesh')
        mesh.from_pydata(self.v, [], self.f)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        for mat in self.mats:
            mesh.materials.append(mat)
        for poly, index in zip(mesh.polygons, self.mi):
            poly.material_index = index
            poly.use_smooth = len(poly.vertices) <= 4 and not bevel
        if rig:
            groups = {}
            for index, weights in enumerate(self.w):
                for bone, weight in weights.items():
                    if bone not in groups:
                        groups[bone] = obj.vertex_groups.new(name=bone)
                    groups[bone].add([index], weight, 'REPLACE')
            mod = obj.modifiers.new('Skin', 'ARMATURE')
            mod.object = rig
            obj.parent = rig
        if bevel:
            mod = obj.modifiers.new('Soft crafted edges', 'BEVEL')
            mod.width = bevel
            mod.segments = 1 if name == 'env_saloon' else 2
            mod.limit_method = 'ANGLE'
        return obj


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene.render.fps = 30
    for name in ['SOURCE', 'EXPORT', 'RIG_CONTROLS', 'PREVIEW']:
        collection = bpy.data.collections.new(name)
        scene.collection.children.link(collection)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children['EXPORT']


def empty(name, loc=(0,0,0), parent=None, bone=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    if parent:
        obj.parent = parent
        if bone:
            obj.parent_type = 'BONE'
            obj.parent_bone = bone
            # Bone parenting includes a tail translation; preserve the specified model-space socket.
            obj.matrix_parent_inverse = parent.data.bones[bone].matrix_local.inverted()
            obj.matrix_parent_inverse.translation -= Vector((0, parent.data.bones[bone].length, 0))
    return obj


def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.collections['EXPORT'].all_objects:
        obj.select_set(True)


def export(path, animated=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    select_export()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_extras=True,
                              export_animations=animated, export_animation_mode='ACTIONS',
                              export_skins=True, export_force_sampling=True,
                              export_optimize_animation_size=True,
                              export_optimize_animation_keep_anim_armature=False,
                              export_cameras=False, export_lights=False)


def save(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(path))


def read_glb(path):
    data = path.read_bytes()
    size = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20+size])


def statistics(path):
    doc = read_glb(path)
    acc = doc.get('accessors', [])
    triangles = sum(acc[p['indices']]['count']//3 for mesh in doc.get('meshes', [])
                    for p in mesh['primitives'] if 'indices' in p)
    vertices = sum(acc[p['attributes']['POSITION']]['count'] for mesh in doc.get('meshes', [])
                   for p in mesh['primitives'])
    return dict(bytes=path.stat().st_size, triangles=triangles, vertices=vertices,
                meshes=len(doc.get('meshes', [])), nodes=len(doc.get('nodes', [])),
                materials=len(doc.get('materials', [])), textures=len(doc.get('textures', [])),
                skins=len(doc.get('skins', [])),
                primitives=sum(len(m['primitives']) for m in doc.get('meshes', [])))


def manifest(asset_id, glb, source, extra=None):
    content = dict(assetId=asset_id, assetVersion='1.0.0', contractVersion='1.0.0',
                   source=str(source.relative_to(ROOT)), file=str(glb.relative_to(ROOT)),
                   blenderVersion=bpy.app.version_string, exporter='Blender bundled Khronos glTF 2.0',
                   units='meters', sourceUp='+Z', sourceForward='-Y', exportedUp='+Y',
                   exportedForward='+Z', engineHandedness='right', sourceRoot=[0,0,0],
                   provenance='Original geometry authored by scripts/blender/generate.py; no third-party art.',
                   statistics=statistics(glb), lods=['LOD0'], textures='None; portable Principled PBR colors')
    if extra:
        content.update(extra)
    (MANIFESTS / (asset_id + '.asset.json')).write_text(json.dumps(content, indent=2) + '\n')
    return content


def studio(camera_pos, target, filepath, width=1000, height=800, room=False):
    scene = bpy.context.scene
    preview = bpy.data.collections['PREVIEW']
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children['PREVIEW']
    camera_data = bpy.data.cameras.new('preview_camera')
    camera = bpy.data.objects.new('preview_camera', camera_data)
    preview.objects.link(camera)
    camera.location = camera_pos
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.lens = 48 if room else 58
    scene.camera = camera
    for name, pos, energy, size, color in [
        ('key', (1,-3,5), 650 if room else 400, 4, (1,.74,.47)),
        ('fill', (-4,-1,3), 420 if room else 250, 4, (.52,.70,1)),
        ('rim', (2,3,4), 700 if room else 500, 3, (1,.58,.30))]:
        ld = bpy.data.lights.new('preview_'+name,'AREA')
        ld.energy, ld.shape, ld.size, ld.color = energy, 'DISK', size, color
        light = bpy.data.objects.new('preview_'+name, ld)
        preview.objects.link(light)
        light.location = pos
        light.rotation_euler = (Vector(target)-light.location).to_track_quat('-Z','Y').to_euler()
    world = bpy.data.worlds.new('preview_world')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.055,.067,.09,1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .28
    scene.world = world
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = -.45 if room else -.15
    scene.render.filepath = str(filepath)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children['EXPORT']
    return camera


def render():
    bpy.ops.render.render(write_still=True)


def render_seat_views():
    """Extra environment previews from seat 1 (looking at the new front wall) and seat 3 (looking at the left wall)."""
    scene = bpy.context.scene
    cam = scene.camera
    cam.data.lens = 22
    for name, pos, target in [('seat1', (-1, 1.15, 1.25), (0, -3.9, 1.35)), ('seat3', (1.35, -.55, 1.25), (-4.9, .3, 1.35))]:
        cam.location = pos
        cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(PREVIEWS / f'environment_{name}_view.png')
        scene.render.resolution_x, scene.render.resolution_y = 1280, 800
        bpy.ops.render.render(write_still=True)


def floor_studio():
    prev = bpy.data.collections['PREVIEW']
    m = Mesh([material('portrait_backdrop',(.065,.086,.10))])
    m.box((0,0,-.065), (12,10,.1))
    ob = m.object('preview_floor', bevel=.015)
    for collection in list(ob.users_collection):
        collection.objects.unlink(ob)
    prev.objects.link(ob)


def backdrop(m, rng):
    """Front (y=-3.95, opposite the bar) and left (x=-4.95) walls so the seat-1/2/3 views have a
    saloon backdrop instead of a void. Adds only geometry to env_saloon; no node/anchor/coordinate changes.
    Wall interior faces: front wall faces +Y, left wall faces +X."""
    H = 4.5   # taller than the bar-side wall so high camera pitches never see the void
    # ---- front wall -------------------------------------------------------------------
    Y = -3.95
    m.box((0, Y, H/2), (10.1, .16, H), 6)
    m.box((0, Y+.09, .06), (10, .06, .12), 0)                      # baseboard
    for x in [-4.75, -2.5, 2.5, 4.75]:                              # posts (none at x=0: painting sits there)
        m.box((x, Y+.12, 1.6), (.17, .24, 3.2), 0)
    for z in [.12, .98, 3.3]:                                       # rails
        m.box((0, Y+.12, z), (9.7, .18, .13), 1)
    for i in range(-18, 19):                                        # wainscot boards
        m.box((i*.26, Y+.09, .52), (.245, .06, .78), rng.choice([0, 1]))
    m.box((0, Y+.14, H-.1), (10, .22, .2), 0)                      # crown beam
    m.box((0, Y+.12, 3.75), (9.7, .18, .1), 1)
    # windows with warm dusk light, shutters and curtains
    for wx in [-3.5, 3.5]:
        m.box((wx, Y+.1, 2.15), (1.5, .04, 1.35), 12)
        m.box((wx, Y+.14, 2.15), (.07, .1, 1.5), 0)
        m.box((wx, Y+.14, 2.15), (1.6, .1, .07), 0)
        for sx in [-.78, .78]:
            m.box((wx+sx, Y+.14, 2.15), (.1, .16, 1.62), 0)
        for sz in [1.4, 2.92]:
            m.box((wx, Y+.14, sz), (1.66, .16, .1), 1)
        m.box((wx, Y+.16, 2.97), (1.9, .08, .06), 4)               # curtain rod
        for sx in [-.88, .88]:
            m.box((wx+sx, Y+.2, 2.2), (.28, .08, 1.5), 11)
        m.box((wx, Y+.2, 1.3), (1.3, .26, .09), 1)                  # sill
    # large painting between the windows: sun, mesas and a cactus
    m.box((0, Y+.1, 2.2), (2.1, .08, 1.35), 4)
    m.box((0, Y+.15, 2.2), (1.9, .06, 1.15), 13)
    m.ellipsoid((.35, Y+.19, 2.45), (.24, .03, .24), 8, seg=16, rings=8)
    for mx, mw, mh in [(-.6, .85, .38), (.1, .6, .5), (.62, .7, .3)]:
        m.box((mx, Y+.19, 1.78+mh/2), (mw, .03, mh), 15)
    m.tube((-.1, Y+.2, 1.7), (-.1, Y+.2, 2.06), .04, 14, seg=8)
    m.tube((-.1, Y+.2, 1.85), (-.22, Y+.2, 1.93), .025, 14, seg=8)
    m.tube((-.1, Y+.2, 1.92), (.0, Y+.2, 2.0), .025, 14, seg=8)
    # wanted posters, shelf of bottles and sconces
    for px, pw, ph in [(-1.55, .44, .58), (1.45, .44, .58), (-4.55, .46, .6), (4.5, .46, .6)]:
        pz = 1.75 if abs(px) < 3 else 1.9
        m.box((px, Y+.1, pz), (pw+.05, .03, ph+.05), 0)
        m.box((px, Y+.12, pz), (pw, .03, ph), 10)
        m.ellipsoid((px, Y+.15, pz+.05), (.1, .02, .11), 3, seg=10, rings=6)
        m.box((px, Y+.15, pz-.2), (.3, .02, .05), 11)
    for sx in [-1.2, 1.2]:
        m.box((sx, Y+.2, 1.05), (1.2, .3, .06), 1)
        for i in range(5):
            bx = sx - .42 + i*.21
            h = rng.uniform(.22, .3)
            m.tube((bx, Y+.2, 1.08), (bx, Y+.2, 1.08+h*.66), .05, 7 if i % 2 else 11, seg=10)
            m.tube((bx, Y+.2, 1.08+h*.66), (bx, Y+.2, 1.08+h), .022, 7 if i % 2 else 11, seg=8)
    for sx in [-2.0, 2.0, -5.0+.0, 5.0-.0]:
        if abs(sx) > 4.5:
            continue
        m.tube((sx, Y+.1, 2.3), (sx, Y+.38, 2.38), .018, 4, seg=8)
        m.ellipsoid((sx, Y+.4, 2.5), (.09, .09, .13), 8, seg=12, rings=6)
        m.box((sx, Y+.4, 2.36), (.1, .1, .03), 4)
    # trophy: mounted antlers over the painting
    m.box((0, Y+.12, 3.05), (.5, .05, .22), 0)
    for sgn in [-1, 1]:
        m.tube((sgn*.12, Y+.2, 3.1), (sgn*.45, Y+.22, 3.38), .025, 2, seg=8)
        m.tube((sgn*.28, Y+.21, 3.24), (sgn*.4, Y+.22, 3.5), .018, 2, seg=8)
        m.tube((sgn*.36, Y+.22, 3.3), (sgn*.6, Y+.22, 3.34), .018, 2, seg=8)
    # ---- left wall ---------------------------------------------------------------------
    X = -4.95
    m.box((X, .2, H/2), (.16, 7.5, H), 6)
    m.box((X+.09, .2, .06), (.06, 7.4, .12), 0)
    for y in [-3.5, -1.3, 1.0, 3.6]:
        m.box((X+.12, y, 1.7), (.24, .16, 3.4), 0)
    for z in [.12, .98, 3.3]:
        m.box((X+.12, .2, z), (.18, 7.4, .13), 1)
    for i in range(-14, 15):
        m.box((X+.09, .2+i*.26, .52), (.06, .245, .78), rng.choice([0, 1]))
    m.box((X+.14, .2, H-.1), (.22, 7.5, .2), 0)
    m.box((X+.12, .2, 3.75), (.18, 7.4, .1), 1)
    for wy in [-2.2, .7]:
        m.box((X+.1, wy, 2.05), (.04, 1.5, 1.35), 12 if wy < 0 else 9)
        for oy in [-.8, 0, .8]:
            m.box((X+.14, wy+oy, 2.05), (.1, .09, 1.55), 0)
        for z in [1.35, 2.05, 2.75]:
            m.box((X+.14, wy, z), (.1, 1.7, .08), 1)
    # poker-night banner and barrel-stack by the door corner
    m.box((X+.12, 2.4, 2.35), (.04, 1.6, .55), 11)
    m.box((X+.15, 2.4, 2.35), (.03, 1.4, .08), 4)
    for y, z, r in [(-3.45, .3, .3), (-2.9, .3, .27), (-3.2, .85, .26)]:
        m.tube((-4.45, y, z-.22), (-4.45, y, z+.25), r, 1, seg=16, r2=r*.93)
        m.ring((-4.45, y, z), (r, r), .018, 4, seg=20, cross=4)
    # ---- wagon-wheel chandelier around the table lamp chain ------------------------------
    cz = 3.0
    m.ring((0, 0, cz), (.78, .78), .03, 4, seg=40, cross=6)
    for a in range(8):
        ang = a*math.tau/8
        m.tube((0, 0, cz), (.78*math.cos(ang), .78*math.sin(ang), cz), .014, 4, seg=6)
    for a in range(6):
        ang = a*math.tau/6 + .2
        x, y = .78*math.cos(ang), .78*math.sin(ang)
        m.tube((x, y, cz+.03), (x, y, cz+.2), .03, 10, seg=8)
        m.ellipsoid((x, y, cz+.24), (.03, .03, .055), 8, seg=8, rings=4)


def environment(seed):
    reset()
    rng = random.Random(seed)
    mats = [material('walnut',(.16,.078,.043)), material('honeywood',(.31,.15,.069)),
            material('plank_light',(.39,.205,.097)), material('leather',(.12,.055,.030)),
            material('brass',(.60,.36,.13),.34,.7), material('felt',(.055,.16,.12),.95),
            material('plaster',(.36,.28,.20)), material('glass_green',(.045,.12,.075),.26,.12),
            material('lamp',(.94,.61,.23),.4,0,1.8), material('window',(.23,.35,.42),.6,0,.22),
            material('paper',(.75,.62,.40)), material('wine',(.23,.055,.035)),
            material('sunset',(.95,.58,.27),.5,0,.9), material('canvas_sky',(.42,.34,.24),.9),
            material('cactus',(.10,.27,.14),.8), material('adobe',(.30,.19,.12),.9)]
    m = Mesh(mats)
    # Small width and tone variation makes geometry read as crafted planks without fragile shaders.
    for row in range(32):
        for col in range(5):
            m.box((-4+col*2, -3.875+row*.25, -.06), (1.985,.242,.12), rng.choice([0,1,1,2]))
    # Open front/side for table cameras; back wall and a right wall remain a readable saloon.
    m.box((0,3.95,1.8),(10,.16,3.6),6)
    m.box((4.95,.2,1.8),(.16,7.5,3.6),6)
    for x in [-4.75,-2.5,0,2.5,4.75]:
        m.box((x,3.82,1.6),(.17,.24,3.2),0)
    for z in [.12,.92,3.3]:
        m.box((0,3.8,z),(9.7,.18,.13),1)
    for x in [i*.25-4.75 for i in range(39)]:
        m.box((x,3.76,.48),(.237,.1,.82),rng.choice([0,1]))
    for y in [-3.5,-1.3,1,3.6]:
        m.box((4.82,y,1.7),(.24,.16,3.4),0)
    # Bar, raised paneling, brass foot rail, back shelves and bottles.
    m.box((0,2.75,.55),(5.8,.80,1.1),0)
    m.box((0,2.65,1.13),(6.1,1.05,.14),1)
    m.box((0,2.135,1.12),(6.13,.06,.10),4)
    for x in [-2.4,-1.2,0,1.2,2.4]:
        m.box((x,2.325,.59),(1.02,.035,.68),2)
        m.box((x,2.30,.59),(.82,.035,.48),0)
    m.tube((-2.9,2.06,.23),(2.9,2.06,.23),.028,4,seg=12)
    for x in [-2.55,-1.3,1.3,2.55]:
        m.tube((x,2.06,.23),(x,2.36,.12),.025,4)
    m.box((0,3.65,2.10),(4.9,.14,1.55),0)
    for x in [-2.45,-.85,.85,2.45]:
        m.box((x,3.45,2.10),(.08,.45,1.55),1)
    for z in [1.35,1.85,2.38,2.88]:
        m.box((0,3.45,z),(4.95,.45,.08),2)
    for z in [1.39,1.89,2.42]:
        for i in range(15):
            x = -2.24 + i*.32
            h = rng.uniform(.23,.33)
            m.tube((x,3.43,z),(x,3.43,z+h*.67),.055,7 if i%3 else 11,seg=10,r2=.052)
            m.tube((x,3.43,z+h*.67),(x,3.43,z+h),.024,7 if i%3 else 11,seg=10)
            m.tube((x,3.43,z+h),(x,3.43,z+h+.025),.027,4,seg=10)
            m.box((x,3.374,z+h*.35),(.06,.008,.08),10)
    # Western swing doors, window frames and glazing.
    for x in [-3.9,-2.7]:
        m.box((x,3.63,1.15),(.11,.3,2.3),0)
    for x in [-3.59,-3.01]:
        m.box((x,3.62,1.13),(.52,.11,.97),1)
        for z in [.75,.91,1.07,1.23,1.39]:
            m.box((x,3.55,z),(.46,.06,.055),2)
        m.ellipsoid((x,3.62,1.64),(.25,.065,.13),1,seg=12,rings=6)
    for y in [-2.2,.7]:
        m.box((4.80,y,2.05),(.03,1.7,1.5),9)
        for oy in [-.90,0,.90]:
            m.box((4.73,y+oy,2.05),(.16,.09,1.72),0)
        for z in [1.23,2.05,2.87]:
            m.box((4.73,y,z),(.16,1.90,.09),1)
    # Poker table; felt top is precisely z=.78, rail a little higher.
    m.oval((0,0,.724),(1.20,.825),.105,0)
    m.oval((0,0,.771),(1.115,.744),.018,5)
    m.ring((0,0,.793),(1.16,.785),.045,3,seg=72,cross=8)
    m.ring((0,0,.732),(1.19,.817),.008,4,seg=72,cross=6)
    for x in [-.7,.7]:
        m.box((x,0,.36),(.12,.65,.66),0)
        m.box((x,0,.10),(.48,.92,.12),1)
    m.box((0,0,.32),(1.45,.10,.12),1)
    # Felt betting-line ellipse, thin geometry using one portable material.
    m.ring((0,0,.782),(1.00,.627),.003,4,seg=72,cross=4)
    for i, (x,z) in enumerate(SEATS):
        y=-z
        angle=math.atan2(-x, -z)
        def p(local):
            lx,ly,lz=local
            return (x+lx*math.cos(angle)-ly*math.sin(angle),
                    y+lx*math.sin(angle)+ly*math.cos(angle),lz)
        m.box(p((0,.08,.437)),(.47,.48,.075),0,rot=angle)
        m.box(p((0,.06,.485)),(.42,.43,.045),3,rot=angle)
        for lx in [-.19,.19]:
            for ly in [-.10,.25]:
                m.tube(p((lx,ly,.055)),p((lx,ly,.43)),.034,0)
            m.tube(p((lx,.26,.45)),p((lx,.28,1.01)),.033,1)
        for lx in [-.12,0,.12]:
            m.tube(p((lx,.28,.53)),p((lx,.28,.96)),.02,1)
        m.box(p((0,.28,.98)),(.49,.09,.12),1,rot=angle)
        empty(f'anchor_seat_{i+1:02}',(x,y,0))
        empty(f'anchor_cards_{i+1:02}',p((-.12,-.57,.80)))
        empty(f'anchor_chips_{i+1:02}',p((.15,-.55,.80)))
    # Dealer has a low stool rather than occupying a player chair.
    m.oval((0,1.55,.462),(.22,.22),.065,0,seg=24)
    m.oval((0,1.55,.498),(.205,.205),.025,3,seg=24)
    for dx,dy in [(-.14,-.14),(.14,-.14),(-.14,.14),(.14,.14)]:
        m.tube((dx,1.55+dy,.04),(dx,1.55+dy,.44),.028,1)
    m.ring((0,1.55,.17),(.18,.18),.015,4,seg=24,cross=4)
    empty('anchor_dealer',(0,1.55,0))
    empty('anchor_board',(0,0,.785))
    empty('anchor_deck',(0,.42,.79))
    empty('anchor_pot',(.45,0,.79))
    # Hanging oil lamps with visible metalwork, not exported light nodes.
    for x,y in [(0,0),(-3.5,1.9),(3.4,1.9)]:
        m.tube((x,y,2.50),(x,y,3.50),.014,4)
        m.oval((x,y,2.49),(.27,.27),.07,0,seg=24)
        m.tube((x,y,2.30),(x,y,2.47),.13,8,seg=16,r2=.10)
        m.oval((x,y,2.28),(.18,.18),.045,4,seg=24)
        for a in range(4):
            dx,dy=.15*math.cos(a*math.pi/2),.15*math.sin(a*math.pi/2)
            m.tube((x+dx,y+dy,2.30),(x+dx,y+dy,2.46),.012,4,seg=8)
    # Wall medallion, sheriff star and barrels give distinct original saloon decoration.
    for x,y in [(-4.1,2.65),(3.9,2.9)]:
        m.tube((x,y,.08),(x,y,.80),.30,1,seg=16,r2=.28)
        for z in [.17,.42,.70]:
            m.ring((x,y,z),(.302,.302),.02,0,seg=24,cross=4)
        m.oval((x,y,.815),(.29,.29),.035,2,seg=16)
    backdrop(m, rng)
    obj=m.object('env_saloon',bevel=.009)
    obj['assetRole']='static_environment'
    # Authored 3D lettering is converted to mesh so it survives GLB export.
    font=bpy.data.curves.new('saloon_sign','FONT')
    font.body='DEAD MAN\'S DRAW'
    font.align_x='CENTER'
    font.size=.25
    font.extrude=.006
    font.bevel_depth=.001
    sign=bpy.data.objects.new('env_saloon_sign',font)
    bpy.context.collection.objects.link(sign)
    sign.location=(0,3.37,3.04)
    sign.rotation_euler=(math.pi/2,0,0)
    font.materials.append(mats[4])
    bpy.context.view_layer.objects.active=sign
    sign.select_set(True)
    bpy.ops.object.convert(target='MESH')
    glb=MODELS/'environment.glb'
    export(glb)
    source=SOURCES/'environments/env_saloon.blend'
    studio((4.2,-3.4,3.0),(-.6,1.2,1.2),PREVIEWS/'environment.png',1400,1000,True)
    save(source)
    return manifest('env_saloon',glb,source,dict(table=dict(center=[0,.78,0],width=2.4,depth=1.65,
          railHeight=.838),seatPositions=[[x,0,z] for x,z in SEATS],dealerPosition=[0,0,-1.55],
          anchors=[o.name for o in bpy.data.collections['EXPORT'].objects if o.type=='EMPTY'],
          bounds={'min':[-5.05,-.12,-4.05],'max':[5.05,4.6,4.05]},
          notes=['No characters, camera or preview lights are in the runtime GLB.',
                 'Lamp mesh emission is visual; frontend owns actual lighting and shadows.']))


def finger_geometry(side, index):
    sx=-1 if side=='l' else 1
    palm_x=sx*.26
    if index==0:
        start=Vector((palm_x-sx*.049,-.535,.878))
        delta=Vector((-sx*.030,-.067,-.016))
    else:
        start=Vector((palm_x+sx*(-.040+(index-1)*.028),-.576,.867))
        lengths=[0,.105,.118,.105,.087]
        delta=Vector((sx*(index-2.3)*.007,-lengths[index],-.008))
    return start,delta


def rig_create(name):
    arm=bpy.data.armatures.new('rig_'+name)
    rig=bpy.data.objects.new('rig_'+name,arm)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,a,b,parent=None):
        eb=arm.edit_bones.new(name)
        eb.head,eb.tail=a,b
        if parent:
            eb.parent=arm.edit_bones[parent]
        return eb
    bone('root',(0,0,0),(0,0,.12))
    bone('pelvis',(0,.06,.48),(0,.02,.61),'root')
    bone('spine_01',(0,.02,.61),(0,0,.76),'pelvis')
    bone('spine_02',(0,0,.76),(0,0,.91),'spine_01')
    bone('chest',(0,0,.91),(0,0,1.035),'spine_02')
    bone('neck',(0,0,1.035),(0,0,1.14),'chest')
    bone('head',(0,0,1.14),(0,0,1.46),'neck')
    for side,sx in [('l',-1),('r',1)]:
        bone('clavicle_'+side,(sx*.05,0,1.015),(sx*.24,0,1.025),'chest')
        bone('upperarm_'+side,(sx*.24,0,1.025),(sx*.34,-.18,.83),'clavicle_'+side)
        bone('forearm_'+side,(sx*.34,-.18,.83),(sx*.26,-.455,.867),'upperarm_'+side)
        bone('hand_'+side,(sx*.26,-.455,.867),(sx*.26,-.577,.867),'forearm_'+side)
        for i,finger in enumerate(FINGERS):
            start,delta=finger_geometry(side,i)
            parent='hand_'+side
            for j in range(3):
                bn=f'finger_{finger}_{j+1:02}_{side}'
                bone(bn,start+delta*j/3,start+delta*(j+1)/3,parent)
                parent=bn
        bone('thigh_'+side,(sx*.12,.06,.49),(sx*.16,-.30,.46),'pelvis')
        bone('shin_'+side,(sx*.16,-.30,.46),(sx*.16,-.30,.105),'thigh_'+side)
        bone('foot_'+side,(sx*.16,-.30,.105),(sx*.16,-.45,.065),'shin_'+side)
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


SPECS={
    'coyote':dict(title='Clay Rusk',fur=(.46,.27,.12),cloth=(.16,.07,.038),accent=(.83,.68,.44),
                  brass=(.64,.38,.13),head=(.166,.145,.175),hat=True),
    'lynx':dict(title='Mara Vell',fur=(.49,.32,.17),cloth=(.22,.044,.065),accent=(.88,.72,.46),
                brass=(.66,.42,.19),head=(.175,.13,.172),hat=False),
    'badger':dict(title='Boone Ledger',fur=(.115,.13,.14),cloth=(.19,.105,.060),accent=(.80,.76,.65),
                  brass=(.62,.38,.14),head=(.184,.145,.173),hat=True),
    'rabbit':dict(title='June Thistle',fur=(.58,.42,.31),cloth=(.12,.20,.21),accent=(.86,.76,.61),
                  brass=(.61,.36,.14),head=(.145,.135,.166),hat=False),
    'dealer':dict(title='Silas Quill',fur=(.32,.25,.18),cloth=(.055,.125,.12),accent=(.85,.77,.59),
                  brass=(.64,.42,.17),head=(.17,.145,.175),hat=False),
}


def body_mesh(name,rig):
    s=SPECS[name]
    mats=[material(name+'_fur',s['fur']),material(name+'_cloth',s['cloth']),
          material(name+'_ivory',s['accent']),material(name+'_brass',s['brass'],.35,.65)]
    m=Mesh(mats)
    # Seated silhouette: trousers/thighs are horizontal, boots rest on the floor.
    m.ellipsoid((0,.04,.54),(.22,.18,.12),1,'pelvis')
    m.ellipsoid((0,.025,.79),(.255,.165,.285),1,'spine_02',seg=20,rings=12)
    # Shirt bib and two sculpted lapels have sufficient contrast for camera-scale reading.
    m.ellipsoid((0,-.123,.87),(.111,.055,.185),2,'chest')
    for sx in [-1,1]:
        m.ellipsoid((sx*.11,-.142,.925),(.055,.037,.115),1,'chest')
    for z in [.74,.82,.90]:
        m.ellipsoid((0,-.181,z),(.014,.009,.014),3,'chest',seg=10,rings=6)
    m.ellipsoid((0,.0,1.10),(.077,.067,.09),0,'neck')
    for side,sx in [('l',-1),('r',1)]:
        shoulder,elbow=Vector((sx*.24,0,1.025)),Vector((sx*.34,-.18,.83))
        m.ellipsoid((shoulder+elbow)/2,(.094,.094,(elbow-shoulder).length*.64),1,
                    'upperarm_'+side,seg=20,rings=12,
                    rot=(elbow-shoulder).to_track_quat('Z','Y').to_matrix())
        m.ellipsoid((sx*.34,-.18,.83),(.075,.08,.077),1,'forearm_'+side,seg=12,rings=8)
        m.tube((sx*.34,-.18,.83),(sx*.26,-.424,.867),.071,2 if name=='dealer' else 1,
               'forearm_'+side,seg=16,r2=.048)
        m.tube((sx*.27,-.410,.867),(sx*.26,-.46,.867),.052,2,'forearm_'+side,seg=16)
        # Brass cufflink and thin garter stay bone attached.
        m.ellipsoid((sx*.306,-.432,.89),(.012,.013,.012),3,'forearm_'+side,seg=8,rings=6)
        if name=='dealer':
            m.tube((sx*.333,-.227,.833),(sx*.32,-.258,.834),.070,3,'forearm_'+side,seg=16)
        m.ellipsoid((sx*.26,-.520,.867),(.066,.073,.026),0,'hand_'+side,seg=16,rings=8)
        m.tube((sx*.12,.06,.49),(sx*.16,-.30,.46),.099,1,'thigh_'+side,seg=16,r2=.085)
        m.ellipsoid((sx*.16,-.30,.45),(.084,.087,.078),1,'shin_'+side,seg=12,rings=8)
        m.tube((sx*.16,-.30,.46),(sx*.16,-.30,.15),.067,1,'shin_'+side,seg=16,r2=.055)
        m.ellipsoid((sx*.16,-.354,.072),(.079,.135,.068),1,'foot_'+side,seg=16,rings=8)
        m.tube((sx*.16,-.30,.08),(sx*.16,-.30,.25),.066,1,'foot_'+side,seg=16)
        m.ellipsoid((sx*.16,-.474,.075),(.061,.026,.038),3,'foot_'+side,seg=12,rings=6)
    # Head, cheeks and original species silhouettes.
    m.ellipsoid((0,-.013,1.285),s['head'],0,'head',seg=24,rings=14)
    if name=='coyote':
        m.ellipsoid((0,-.148,1.227),(.101,.155,.066),2,'head',seg=20,rings=10)
        m.ellipsoid((0,-.283,1.246),(.043,.031,.03),1,'head',seg=12,rings=8)
        for sx in [-1,1]:
            ear_rot=Vector((sx*.045,.02,.27)).to_track_quat('Z','Y').to_matrix()
            m.ellipsoid((sx*.128,.022,1.545),(.042,.031,.151),0,'head',seg=16,rings=12,rot=ear_rot)
            m.ellipsoid((sx*.13,-.007,1.549),(.025,.013,.116),2,'head',seg=12,rings=10,rot=ear_rot)
            m.ellipsoid((sx*.125,-.075,1.19),(.06,.054,.047),0,'head',seg=12,rings=8)
    elif name=='lynx':
        m.ellipsoid((0,-.14,1.225),(.093,.061,.058),2,'head',seg=18,rings=10)
        m.ellipsoid((0,-.201,1.257),(.027,.019,.021),1,'head',seg=12,rings=6)
        for sx in [-1,1]:
            m.tube((sx*.123,.005,1.394),(sx*.171,.016,1.59),.063,0,'head',seg=12,r2=.003)
            m.tube((sx*.171,.016,1.58),(sx*.178,.020,1.67),.014,1,'head',seg=8,r2=.002)
            m.ellipsoid((sx*.14,-.052,1.19),(.079,.071,.057),2,'head',seg=12,rings=8)
            for j in range(3):
                m.tube((sx*.14,-.075,1.20+j*.019),(sx*(.211+j*.010),-.11,1.19+j*.020),
                       .025,0,'head',seg=8,r2=.003)
            for j in range(3):
                m.ellipsoid((sx*(.105+j*.015),-.131,1.28-j*.025),(.009,.007,.016),1,'head',seg=8,rings=6)
    elif name=='badger':
        m.ellipsoid((0,-.17,1.23),(.099,.083,.067),2,'head',seg=18,rings=10)
        m.ellipsoid((0,-.235,1.254),(.036,.025,.023),1,'head',seg=12,rings=8)
        for sx in [-1,1]:
            m.ellipsoid((sx*.155,.01,1.424),(.067,.035,.073),0,'head',seg=14,rings=8)
            m.ellipsoid((sx*.155,-.025,1.431),(.039,.014,.043),2,'head',seg=12,rings=8)
            m.ellipsoid((sx*.095,-.121,1.337),(.051,.027,.115),2,'head',seg=16,rings=10)
    elif name=='rabbit':
        m.ellipsoid((0,-.145,1.22),(.084,.073,.061),2,'head',seg=18,rings=10)
        m.ellipsoid((0,-.210,1.257),(.023,.018,.017),1,'head',seg=12,rings=6)
        m.box((0,-.210,1.198),(.036,.015,.035),2,'head')
        # One raised ear and one gently drooped ear make a readable asymmetric silhouette.
        m.ellipsoid((-.09,.019,1.59),(.049,.038,.245),0,'head',seg=16,rings=12)
        m.ellipsoid((-.09,-.015,1.60),(.026,.014,.19),2,'head',seg=12,rings=10)
        m.tube((.087,.021,1.396),(.17,.025,1.69),.049,0,'head',seg=16,r2=.04)
        droop=Vector((.065,-.061,-.18)).to_track_quat('Z','Y').to_matrix()
        m.ellipsoid((.202,-.005,1.599),(.04,.034,.11),0,'head',seg=16,rings=12,rot=droop)
        m.ellipsoid((.202,-.032,1.60),(.023,.013,.081),2,'head',seg=12,rings=10,rot=droop)
    else:
        # Owl dealer: facial discs, small beak, dark brows and discreet spectacles.
        for sx in [-1,1]:
            m.ellipsoid((sx*.075,-.108,1.301),(.086,.044,.098),2,'head',seg=18,rings=10)
            m.tube((sx*.108,.01,1.4),(sx*.15,.015,1.51),.038,0,'head',seg=10,r2=.001)
        m.tube((0,-.17,1.275),(0,-.223,1.219),.035,3,'head',seg=8,r2=.002)
    # Ivory sclera, dark pupils, eyelid/brow framing and eye glints are explicit PBR geometry.
    for sx in [-1,1]:
        eye_y=-.132 if name!='dealer' else -.153
        eye_z=1.326
        m.ellipsoid((sx*.070,eye_y,eye_z),(.047,.031,.043),2,'head',seg=16,rings=10)
        m.ellipsoid((sx*.067,eye_y-.028,eye_z+.001),(.022,.012,.026),1,'head',seg=14,rings=8)
        m.ellipsoid((sx*.062,eye_y-.039,eye_z+.011),(.006,.003,.007),2,'head',seg=8,rings=6)
        m.tube((sx*.025,eye_y-.008,1.367),(sx*.109,eye_y+.004,1.377),.015,1,'head',seg=10,r2=.021)
    # Closed mouth seam stays readable without gore or a tooth-filled snarl.
    if name!='dealer':
        mouth_y={'coyote':-.246,'lynx':-.19,'badger':-.215,'rabbit':-.195}[name]
        m.tube((-.048,mouth_y,1.207),(.048,mouth_y,1.207),.005,1,'head',seg=8)
    if s['hat']:
        m.oval((0,.014,1.455),(.246,.215),.027,1,'head',seg=40)
        m.ellipsoid((0,.02,1.524),(.147,.126,.109),1,'head',seg=20,rings=10)
        m.ring((0,.02,1.492),(.145,.125),.013,3,'head',seg=32,cross=6)
    if name=='lynx':
        m.ellipsoid((0,-.187,.997),(.062,.022,.025),3,'chest',seg=12,rings=8)
        # Fine bolo string, not a physically simulated accessory.
        for sx in [-1,1]:
            m.tube((sx*.017,-.18,1.00),(sx*.030,-.188,.91),.007,3,'chest',seg=8)
    elif name=='dealer':
        for sx in [-1,1]:
            m.ellipsoid((sx*.030,-.15,1.033),(.039,.029,.027),1,'chest',seg=12,rings=8)
    else:
        m.ellipsoid((0,-.102,1.055),(.075,.069,.027),3 if name=='rabbit' else 1,'chest',seg=16,rings=8)
        m.tube((.005,-.15,1.035),(.035,-.17,.95),.025,3 if name=='rabbit' else 1,'chest',seg=10,r2=.004)
    if name=='badger':
        # Merchant's watch chain and waistcoat pocket.
        for i in range(12):
            a=i*math.pi/11
            m.ellipsoid((.035+i*.010,-.166,.775-.065*math.sin(a)),(.008,.008,.010),3,'spine_02',seg=8,rings=6)
        m.box((.14,-.15,.77),(.075,.025,.042),1,'spine_02')
    obj=m.object('char_'+name+'_body',rig)
    obj['characterName']=s['title']
    return mats


def finger_modules(rig,mats):
    entries=[]
    for side in ['l','r']:
        for i,finger in enumerate(FINGERS):
            start,delta=finger_geometry(side,i)
            axis=delta.normalized()
            u=axis.cross(Vector((0,0,1))).normalized()
            v=axis.cross(u)
            radius=.014 if i==0 else .0125
            for variant in ['real','prosthetic','cap']:
                m=Mesh(mats)
                if variant=='cap':
                    m.tube(start-axis*.004,start+axis*.006,radius*1.09,2,
                           f'finger_{finger}_01_{side}',seg=10)
                else:
                    seg,steps=10,9
                    vertices,weights=[],[]
                    for j in range(steps+1):
                        t=j/steps
                        r=radius*(1-.3*t)
                        if j==steps:
                            r*=.30
                        if variant=='prosthetic' and j in [3,6]:
                            r*=1.12
                        for k in range(seg):
                            vertices.append(tuple(start+delta*t+r*(math.cos(k*TAU/seg)*u+math.sin(k*TAU/seg)*v)))
                            # Linear blend over the three joints, normalized and <=2 influences.
                            q=t*3
                            lo=min(2,int(q))
                            mix=q-lo if lo<2 else 0
                            wd={f'finger_{finger}_{lo+1:02}_{side}':1-mix}
                            if mix>0 and lo<2:
                                wd[f'finger_{finger}_{lo+2:02}_{side}']=mix
                            weights.append(wd)
                    faces=[(j*seg+k,j*seg+(k+1)%seg,(j+1)*seg+(k+1)%seg,(j+1)*seg+k)
                           for j in range(steps) for k in range(seg)]
                    faces += [tuple(reversed(range(seg))),tuple(range(steps*seg,(steps+1)*seg))]
                    m.add(vertices,faces,0 if variant=='real' else 3,weights=weights)
                    if variant=='prosthetic':
                        for j in [1,2]:
                            p=start+delta*j/3
                            m.tube(p-axis*.004,p+axis*.004,radius*1.14,1,
                                   f'finger_{finger}_{j:02}_{side}',seg=10)
                ob=m.object(f'finger_{finger}_{side}_{variant}',rig)
                ob['fingerSlot']=f'{finger}_{side}'
                ob['variant']=variant
                ob['defaultVisible']=variant=='real'
                ob.hide_render=variant!='real'
                entries.append(dict(node=ob.name,slot=f'{finger}_{side}',variant=variant,
                                     defaultVisible=variant=='real'))
    return entries


CLIPS={
    'idle_seated':(4.0,'idle'), 'look_cards':(1.4,'cards'), 'look_left':(1.2,'left'),
    'look_right':(1.2,'right'), 'place_bet':(1.25,'bet'), 'fold_cards':(1.2,'fold'),
    'sleeve_prepare':(.85,'prepare'), 'sleeve_hold':(1.0,'hold'),
    'sleeve_finish':(.65,'finish'), 'sleeve_fumble':(.8,'fumble'),
    'mark_prepare':(.7,'mark'), 'mark_contact':(1.1,'mark'), 'mark_recover':(.65,'recover'),
    'mark_interrupt':(.7,'fumble'), 'mirror_prepare':(.9,'mirror'), 'mirror_hold':(1.2,'mirror'),
    'mirror_recover':(.7,'recover'), 'accuse':(1.25,'accuse'), 'accused_react':(1.2,'react'),
    'accuse_wrong_react':(1.2,'react'), 'show_hand':(1.4,'show'), 'fit_prosthetic':(1.8,'mark'),
    'receive_item':(1.2,'bet'), 'sell_item':(1.2,'fold'), 'win_react':(1.7,'win'),
    'lose_react':(1.7,'lose'), 'eliminated':(2.0,'lose'), 'cover_cards':(1.0,'cards'),
    'wipe_mark':(1.1,'mark'), 'copy_mark':(1.3,'mark'), 'tap_joint':(.8,'signal'),
    'flip_coin':(1.3,'show'), 'sleeve_two_prepare':(.95,'prepare'),
    'sleeve_two_hold':(1.0,'hold'), 'sleeve_two_finish':(.75,'finish'),
    'dealer_idle':(4.0,'idle'), 'dealer_deal':(1.3,'deal'), 'dealer_reveal':(1.1,'reveal'),
    'dealer_cut':(1.5,'cut'), 'dealer_signal':(.9,'signal'), 'dealer_distract':(1.6,'distract')}


def animations(rig, dealer=False):
    scene=bpy.context.scene
    rig.animation_data_create()
    metadata=[]
    for name,(duration,mode) in CLIPS.items():
        if name.startswith('dealer_') and not dealer:
            continue
        action=bpy.data.actions.new(name)
        action.use_fake_user=True
        rig.animation_data.action=action
        frames=[1, max(2,round(duration*30*.28)), max(3,round(duration*30*.58)), round(duration*30)+1]
        scene.frame_start,scene.frame_end=1,frames[-1]
        for index,frame in enumerate(frames):
            t=index/3
            pulse=math.sin(math.pi*t)
            if mode in ['hold','mirror']:
                pulse=.8+.12*math.sin(t*TAU)
            if mode in ['prepare']:
                pulse=t
            if mode in ['finish','recover']:
                pulse=1-t
            for pb in rig.pose.bones:
                pb.rotation_mode='XYZ'
                pb.rotation_euler=(0,0,0)
                pb.location=(0,0,0)
            head=rig.pose.bones['head']
            head.rotation_euler.x=.035*math.sin(t*TAU)
            rig.pose.bones['chest'].rotation_euler.x=.01*math.sin(t*TAU)
            if mode=='cards':
                head.rotation_euler.x=.20*pulse
            elif mode in ['left','right','signal']:
                head.rotation_euler.z=(.34 if mode=='left' else -.34)*pulse
            elif mode in ['lose','react']:
                head.rotation_euler.x=(.25 if mode=='lose' else -.18)*pulse
            elif mode=='win':
                head.rotation_euler.z=.15*math.sin(t*TAU)
            if mode in ['prepare','hold','finish','fumble']:
                rig.pose.bones['forearm_r'].rotation_euler.z=-.70*pulse
                rig.pose.bones['upperarm_r'].rotation_euler.z=.35*pulse
                rig.pose.bones['hand_r'].rotation_euler.x=.32*pulse
                head.rotation_euler.z=-.11*pulse
                if mode=='fumble':
                    rig.pose.bones['hand_r'].rotation_euler.y=.42*math.sin(t*TAU)
            elif mode in ['bet','fold','deal','reveal']:
                rig.pose.bones['upperarm_r'].rotation_euler.x=-.20*pulse
                rig.pose.bones['forearm_r'].rotation_euler.x=.28*pulse
                rig.pose.bones['hand_r'].rotation_euler.z=.22*pulse
                if mode=='deal':
                    rig.pose.bones['upperarm_r'].rotation_euler.z=.28*pulse
                if mode=='fold':
                    rig.pose.bones['hand_r'].rotation_euler.z=-.35*pulse
            elif mode in ['mark','cut']:
                rig.pose.bones['forearm_r'].rotation_euler.z=-.40*pulse
                rig.pose.bones['forearm_l'].rotation_euler.z=.18*pulse
                rig.pose.bones['hand_r'].rotation_euler.x=.23*pulse
                head.rotation_euler.x=.15*pulse
            elif mode in ['mirror','show','accuse','distract','win']:
                rig.pose.bones['forearm_r'].rotation_euler.x=-.42*pulse
                rig.pose.bones['hand_r'].rotation_euler.x=-.30*pulse
                if mode in ['accuse','distract']:
                    rig.pose.bones['upperarm_r'].rotation_euler.z=-.36*pulse
                    head.rotation_euler.x=-.10*pulse
            # Hand motion is present even in idles, and all 30 finger joints have true animation tracks.
            for side in ['l','r']:
                rig.pose.bones['hand_'+side].rotation_euler.z += .02*math.sin(t*TAU+(.4 if side=='l' else 0))
                for i,finger in enumerate(FINGERS):
                    for j in range(3):
                        pb=rig.pose.bones[f'finger_{finger}_{j+1:02}_{side}']
                        pb.rotation_euler.x=(.045+.015*j)*math.sin(t*TAU+i*.35)
                        if mode in ['cards','mark','prepare','hold','finish','cut']:
                            pb.rotation_euler.x += .12*pulse
                        if mode=='accuse' and finger!='index' and side=='r':
                            pb.rotation_euler.x += .50*pulse
            for pb in rig.pose.bones:
                if pb.name not in ['root','pelvis']:
                    pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=pb.name)
        # Explicit action markers are authoring aids; gameplay metadata is in the manifest.
        for marker,timing in [('commit',.28),('effect',.58),('exposureStart',.10),('exposureEnd',.90)]:
            marker_obj=action.pose_markers.new(marker)
            marker_obj.frame=round(duration*30*timing)+1
        metadata.append(dict(name=name,duration=duration,loop=name in ['idle_seated','sleeve_hold','mirror_hold','dealer_idle'],
                             events=dict(commit=round(duration*.28,3),effect=round(duration*.58,3),
                                         exposureStart=round(duration*.1,3),exposureEnd=round(duration*.9,3)),
                             rootMotion=False))
    rig.animation_data.action=bpy.data.actions['idle_seated']
    scene.frame_start,scene.frame_end=1,121
    scene.frame_set(1)
    return metadata


def character(name,do_render):
    reset()
    rig=rig_create(name)
    mats=body_mesh(name,rig)
    modules=finger_modules(rig,mats)
    sockets=[]
    for sn,loc,bone in [
        ('socket_card_l',(-.26,-.60,.89),'hand_l'),('socket_card_r',(.26,-.60,.89),'hand_r'),
        ('socket_chips_r',(.26,-.59,.89),'hand_r'),('socket_tool_l',(-.26,-.58,.89),'hand_l'),
        ('socket_tool_r',(.26,-.58,.89),'hand_r'),('socket_sleeve_l',(-.28,-.40,.87),'forearm_l'),
        ('socket_sleeve_r',(.28,-.40,.87),'forearm_r'),('socket_eye',(0,-.155,1.33),'head'),
        ('socket_seat',(0,.06,.48),'pelvis')]:
        empty(sn,loc,rig,bone)
        sockets.append(dict(name=sn,bone=bone,sourcePosition=list(loc),exportedPosition=[loc[0],loc[2],-loc[1]]))
    clips=animations(rig,name=='dealer')
    glb=MODELS/'characters'/f'{name}.glb'
    export(glb,True)
    doc=read_glb(glb)
    for clip in clips:
        exported=next(a for a in doc['animations'] if a['name']==clip['name'])
        times=[doc['accessors'][sampler['input']] for sampler in exported['samplers']]
        clip['duration']=round(max(a['max'][0] for a in times)-min(a['min'][0] for a in times),6)
        clip['animatedTargets']=sorted({doc['nodes'][channel['target']['node']]['name']
                                       for channel in exported['channels']})
        clip['trackCount']=len(exported['channels'])
        if 'fumble' in clip['name'] or clip['name']=='tap_joint':
            clip['soundCue']={'time':clip['events']['effect'],'event':'prosthetic_joint',
                              'condition':'Runtime confirmed prosthetic use; do not play automatically.'}
    source=SOURCES/'characters'/f'char_{name}.blend'
    floor_studio()
    studio((1.70,-2.75,1.80),(0,-.10,.87),PREVIEWS/f'{name}.png',720,900)
    save(source)
    if do_render:
        render()
    bounds=[list(v) for o in bpy.data.collections['EXPORT'].all_objects if o.type=='MESH'
            for v in [o.matrix_world @ Vector(c) for c in o.bound_box]]
    min_v=[min(p[i] for p in bounds) for i in range(3)]
    max_v=[max(p[i] for p in bounds) for i in range(3)]
    return manifest('char_'+name,glb,source,dict(displayName=SPECS[name]['title'],
          rig=rig.name,bones=list(rig.data.bones.keys()),deformBoneCount=len(rig.data.bones),
          sockets=sockets,fingers=modules,clips=clips,
          bounds=dict(sourceMin=min_v,sourceMax=max_v),
          visibilityContract='GLB does not encode visibility: disable every *_prosthetic and *_cap node immediately after import; select exactly one variant per slot.',
          notes=['Seated rest rig; root is floor origin with no root motion.',
                 'Rigid-bone weight regions for stylized body; blended weights on three-joint modular fingers.',
                 'Clips are authored tell motions; runtime attaches props and decides authoritative effects.',
                 'Only LOD0 supplied. Facial mesh supports head/gaze; no facial morph targets.']))


def prop(name,m,extra=None):
    ob=m.object('prop_'+name)
    ob['assetRole']='gameplay_prop'
    glb=MODELS/'props'/f'{name}.glb'
    export(glb)
    return glb


def props():
    reset()
    mats=[material('prop_paper',(.83,.75,.58)),material('prop_wine',(.25,.043,.032)),
          material('prop_brass',(.66,.40,.14),.28,.78),material('prop_leather',(.12,.059,.032)),
          material('prop_mirror',(.64,.72,.74),.08,1),material('prop_wood',(.38,.18,.071)),
          material('prop_ink',(.028,.045,.054)),material('prop_chip',(.09,.22,.19))]
    files=[]
    def one(name,author):
        # Export each prop from its own collection, with centered origin and physical scale.
        for ob in list(bpy.data.collections['EXPORT'].objects):
            bpy.data.collections['EXPORT'].objects.unlink(ob)
            bpy.data.collections['SOURCE'].objects.link(ob)
        m=Mesh(mats)
        author(m)
        glb=prop(name,m)
        files.append((name,glb))
    def card(m):
        # Neutral front: rank/suit are assigned only by an authorized owner in the frontend.
        m.box((0,0,0),(.063,.088,.0012),0)
        m.box((0,0,-.0007),(.058,.083,.00015),1)
        for x in [-.027,.027]:
            m.box((x,0,-.00082),(.001,.078,.0001),2)
        for y in [-.039,.039]:
            m.box((0,y,-.00082),(.053,.001,.0001),2)
        # Original abstract badge on public card back, no identity encoded.
        m.oval((0,0,-.0009),(.012,.019),.00012,2,seg=6)
    one('cards',card)
    def chip(m):
        m.tube((0,0,-.0018),(0,0,.0018),.020,7,seg=16)
        m.oval((0,0,.0020),(.014,.014),.0003,0,seg=16)
        for i in range(6):
            a=i*TAU/6
            m.box((.018*math.cos(a),.018*math.sin(a),.0021),(.006,.003,.0004),0,rot=a)
    one('chips',chip)
    def sleeve(m):
        m.box((0,0,0),(.077,.11,.009),3)
        m.box((0,-.049,.006),(.080,.012,.008),2)
        for x in [-.031,.031]:
            m.box((x,0,.005),(.003,.090,.003),5)
    one('sleeve',sleeve)
    def mark(m):
        m.tube((0,0,0),(0,0,.042),.013,6,seg=12)
        m.tube((0,0,.042),(0,0,.054),.009,2,seg=12)
        m.tube((.029,0,0),(.029,0,.060),.003,5,seg=8,r2=.001)
    one('mark',mark)
    def mirror(m):
        m.oval((0,0,0),(.038,.048),.006,2,seg=32)
        m.oval((0,0,.0035),(.033,.043),.001,4,seg=32)
        m.tube((0,-.046,0),(0,-.099,0),.006,3,seg=12,r2=.009)
    one('mirror',mirror)
    def coin(m):
        m.oval((0,0,0),(.014,.014),.002,2,seg=24)
        m.oval((0,0,.0013),(.010,.010),.0008,5,seg=6)
    one('coin',coin)
    def lighter(m):
        m.box((0,0,.02),(.028,.013,.04),2)
        m.box((0,0,.045),(.028,.013,.012),3)
        m.tube((0,0,.043),(0,0,.053),.005,6,seg=12)
    one('lighter',lighter)
    def prosthetics(m):
        m.tube((0,0,0),(0,.086,0),.012,5,seg=12,r2=.009)
        for y in [0,.030,.058]:
            m.tube((0,y-.004,0),(0,y+.004,0),.013,2,seg=12)
    one('prosthetics',prosthetics)
    one('cloth',lambda m:m.box((0,0,0),(.084,.084,.002),0))
    one('copy_paper',lambda m:m.box((0,0,0),(.063,.088,.0008),0))
    def magic(m):
        m.box((0,0,0),(.070,.096,.002),1)
        m.oval((0,0,.0015),(.022,.030),.0006,2,seg=8)
    one('magic_card',magic)
    def deck(m):
        m.box((0,0,.008),(.063,.088,.016),0)
        m.box((0,0,.0165),(.058,.083,.0008),1)
        for z in [.004,.008,.012]:
            m.box((0,-.044,z),(.061,.0005,.0003),3)
    one('deck',deck)
    def cup(m):
        m.tube((0,0,0),(0,0,.075),.026,2,seg=16,r2=.030)
        m.oval((0,0,.076),(.026,.026),.001,3,seg=16)
    one('cup',cup)
    def calibration(m):
        m.tube((0,0,0),(.30,0,0),.01,1,seg=8)
        m.tube((0,0,0),(0,-.30,0),.01,7,seg=8)
        m.tube((0,0,0),(0,0,.30),.01,2,seg=8)
        for a,b,color in [((.25,0,0),(.36,0,0),1),((0,-.25,0),(0,-.36,0),7),
                          ((0,0,.25),(0,0,.36),2)]:
            m.tube(a,b,.027,color,seg=8,r2=.001)
    one('axis_calibration',calibration)
    # Restore all props to source with a source file containing editable geometry.
    for ob in list(bpy.data.collections['SOURCE'].objects):
        bpy.data.collections['SOURCE'].objects.unlink(ob)
        bpy.data.collections['EXPORT'].objects.link(ob)
    source=SOURCES/'props/prop_gameplay_set.blend'
    save(source)
    result=[]
    ids={'sleeve':['I01','T01','T07'],'cards':['I02'],'mark':['I03','T02'],'mirror':['I04','T03'],
         'cloth':['I05','T05'],'copy_paper':['I06','T06'],'lighter':['I07','F03'],'coin':['I08','H01'],
         'prosthetics':['I09','I10'],'magic_card':[f'B{i:02}' for i in range(1,11)]}
    for name,glb in files:
        result.append(manifest('prop_'+name,glb,source,dict(contentIds=ids.get(name,[]),
           notes=['No poker rank/suit identity baked into public card mesh.' if name=='cards' else
                  'Shared prop centered at origin; attach to a runtime socket.'])))
    return result


def assemble_preview(do_render):
    # Full-scene source is deliberately separate from environment.glb.
    bpy.ops.wm.open_mainfile(filepath=str(SOURCES/'environments/env_saloon.blend'))
    collection=bpy.data.collections['SOURCE']
    rigs=[]
    for name,(x,z) in zip(SPECS,SEATS+[(0,-1.55)]):
        source=SOURCES/'characters'/f'char_{name}.blend'
        with bpy.data.libraries.load(str(source),link=False) as (available,dest):
            dest.objects=[n for n in available.objects if n.startswith(('char_', 'rig_', 'finger_', 'socket_'))]
        for obj in dest.objects:
            if obj:
                collection.objects.link(obj)
        rig=next(o for o in dest.objects if o and o.type=='ARMATURE')
        rig.location=(x,-z,0)
        rig.rotation_euler.z=math.atan2(-x,-z)
        rigs.append(rig)
    bpy.context.scene.frame_set(1)
    camera=bpy.context.scene.camera
    camera.location=(4.7,-6.5,3.6)
    camera.rotation_euler=(Vector((0,.5,.85))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.render.filepath=str(PREVIEWS/'saloon_scene.png')
    save(SOURCES/'saloon_preview.blend')
    if do_render:
        render()
        camera.location=(1.7,-2.4,2.3)
        camera.rotation_euler=(Vector((0,0,.8))-camera.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath=str(PREVIEWS/'tabletop.png')
        render()
    # Actual single-render contact sheet with all five original characters and a saved source.
    reset()
    for index,name in enumerate(SPECS):
        with bpy.data.libraries.load(str(SOURCES/'characters'/f'char_{name}.blend'),link=False) as (available,dest):
            dest.objects=[n for n in available.objects if n.startswith(('char_','rig_','finger_','socket_'))]
        for obj in dest.objects:
            if obj:
                bpy.data.collections['SOURCE'].objects.link(obj)
        rig=next(o for o in dest.objects if o and o.type=='ARMATURE')
        rig.location=((index-2)*.92,0,0)
    floor_studio()
    studio((0,-7.7,2.4),(0,0,.89),PREVIEWS/'character_contact_sheet.png',1800,800)
    save(SOURCES/'character_contact_sheet.blend')
    if do_render:
        render()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--seed',type=int,default=1701)
    parser.add_argument('--only',choices=['all','environment','characters','props'],default='all')
    parser.add_argument('--skip-render',action='store_true')
    argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    args=parser.parse_args(argv)
    for directory in [MODELS, SOURCES, PREVIEWS, MANIFESTS]:
        directory.mkdir(parents=True,exist_ok=True)
    outputs=[]
    if args.only in ['all','environment']:
        outputs.append(environment(args.seed))
        if not args.skip_render:
            render()
            render_seat_views()
    if args.only in ['all','characters']:
        for name in SPECS:
            outputs.append(character(name,not args.skip_render))
    if args.only in ['all','props']:
        outputs.extend(props())
    if args.only=='all':
        assemble_preview(not args.skip_render)
        (MANIFESTS/'saloon-assets.json').write_text(json.dumps(dict(version='1.0.0',seed=args.seed,
             coordinateContract=dict(up='+Y',forward='+Z',handedness='right',metersPerUnit=1),
             table=dict(position=[0,.78,0],width=2.4,depth=1.65),
             seats=[[x,0,z] for x,z in SEATS],dealer=[0,0,-1.55],assets=outputs,
             limitations=['Procedural stylized production baseline, not AAA finished character art.',
                          'One LOD, no texture atlases or facial morphs; runtime performance still requires measurement.',
                          'Visibility of alternate fingers must be initialized by the loader.',
                          'Shared prop meshes have no authoritative card identities; frontend controls private faces.',
                          'Physics, sound and gameplay effects are runtime responsibilities.']),indent=2)+'\n')
    print('SALOOON GENERATION COMPLETE',flush=True)


if __name__=='__main__':
    main()
