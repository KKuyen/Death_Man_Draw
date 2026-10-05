#!/usr/bin/env python3
"""Rebuild the original saloon assets with portable Blender (stdlib only)."""
import argparse
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def locate_blender():
    override = os.environ.get("BLENDER_BIN")
    if override:
        path = Path(override).expanduser()
        if path.is_file():
            return str(path)
        raise SystemExit(f"BLENDER_BIN does not point to a binary: {path}")
    candidates = [ROOT / '.tools/Blender.app/Contents/MacOS/Blender',
                  ROOT / '.tools/blender/Blender.app/Contents/MacOS/Blender',
                  ROOT / '.tools/blender/blender', ROOT / '.tools/blender.exe']
    candidates += list(Path('/Volumes').glob('Blender*/Blender.app/Contents/MacOS/Blender'))
    for path in candidates:
        if path.is_file():
            return str(path)
    installed = shutil.which('blender')
    if installed:
        return installed
    dmg = ROOT / '.tools/blender.dmg'
    if sys.platform == 'darwin' and dmg.is_file():
        # Mount read-only; never write to the system application installation.
        subprocess.run(['hdiutil', 'attach', '-readonly', '-nobrowse', str(dmg)], check=True)
        for path in Path('/Volumes').glob('Blender*/Blender.app/Contents/MacOS/Blender'):
            if path.is_file():
                return str(path)
    raise SystemExit('Set BLENDER_BIN or provide .tools/blender.dmg / a portable Blender binary.')


def glb_json(path):
    data = path.read_bytes()
    magic, version, size = struct.unpack_from('<III', data)
    if magic != 0x46546c67 or version != 2 or size != len(data):
        raise ValueError(f'Invalid GLB header: {path}')
    size, kind = struct.unpack_from('<II', data, 12)
    if kind != 0x4e4f534a:
        raise ValueError(f'No JSON chunk: {path}')
    return json.loads(data[20:20 + size])


def verify():
    required = ['environment.glb'] + [f'characters/{name}.glb' for name in
                                      ['coyote', 'lynx', 'badger', 'rabbit', 'dealer']]
    core = {'idle_seated', 'look_cards', 'place_bet', 'fold_cards', 'sleeve_prepare',
            'sleeve_hold', 'sleeve_finish', 'sleeve_fumble', 'mark_contact', 'accuse'}
    reports = []
    for name in required:
        path = ROOT / 'public/models' / name
        doc = glb_json(path)
        nodes = {n.get('name', '') for n in doc.get('nodes', [])}
        animations = {a['name'] for a in doc.get('animations', [])}
        assert doc.get('meshes'), f'No meshes: {name}'
        if name.startswith('characters/'):
            assert doc.get('skins'), f'No skins: {name}'
            assert core <= animations, f'Missing clips in {name}: {core - animations}'
            for side in ['l', 'r']:
                for finger in ['thumb', 'index', 'middle', 'ring', 'pinky']:
                    for variant in ['real', 'prosthetic', 'cap']:
                        assert f'finger_{finger}_{side}_{variant}' in nodes
                    for joint in ['01', '02', '03']:
                        assert f'finger_{finger}_{joint}_{side}' in nodes
            assert 'socket_eye' in nodes and 'socket_card_l' in nodes
        triangles = sum(doc['accessors'][p['indices']]['count'] // 3
                        for m in doc['meshes'] for p in m['primitives'] if 'indices' in p)
        reports.append({'file': name, 'bytes': path.stat().st_size,
                        'triangles': triangles, 'nodes': len(nodes),
                        'skins': len(doc.get('skins', [])), 'animations': sorted(animations)})
    out = ROOT / 'assets/manifests/structural-verification.json'
    out.write_text(json.dumps({'passed': True, 'assets': reports}, indent=2) + '\n')
    print(json.dumps(reports, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, default=1701)
    parser.add_argument('--skip-render', action='store_true')
    parser.add_argument('--only', choices=['all', 'environment', 'characters', 'props', 'cards'], default='all')
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--verify-cards', action='store_true', help='Verify packed pixel card sources and GLB roundtrip')
    args = parser.parse_args()
    if args.verify_cards:
        subprocess.run([locate_blender(), '--background', '--factory-startup', '--python', str(ROOT / 'scripts/blender/verify-pixel-source.py')], cwd=ROOT, check=True)
        return
    if not args.verify_only:
        cmd = [locate_blender(), '--background', '--factory-startup', '--python',
               str(ROOT / ('scripts/blender/pixel_cards.py' if args.only == 'cards' else 'scripts/blender/generate.py')), '--', '--seed', str(args.seed),
               '--only', args.only]
        if args.skip_render:
            cmd.append('--skip-render')
        subprocess.run(cmd, cwd=ROOT, check=True)
    if args.only == 'all' or args.verify_only:
        verify()


if __name__ == '__main__':
    main()
