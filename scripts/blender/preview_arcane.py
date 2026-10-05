from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/blender'))
source=(ROOT/'scripts/blender/pixel_cards.py').read_text().split("bpy.ops.object.select_all(action='SELECT')")[0]
exec(compile(source,'pixel-card-definitions','exec'))
from arcane_finish import finish
for id in IDS:
    image_grid(id,finish(art(id),id,ACC[IDS.index(id)],rgba),path=ROOT/'assets/previews/cards-pixel'/('arcane-'+id+'.png'))
image_grid('back',finish(back(),'back','dark',rgba),path=ROOT/'assets/previews/cards-pixel/arcane-back.png')
# An integer-scale sheet authored directly from native Grid pixels.
from array import array
keys=IDS+['back'];cols=6;rows=math.ceil(len(keys)/cols);cw,ch=72,96;width,height=cols*cw,rows*ch;scale=4
pixels=array('f',[.025,.024,.03,1])*(width*height*scale*scale)
for index,id in enumerate(keys):
    g=finish(art(id),id,ACC[IDS.index(id)],rgba) if id!='back' else finish(back(),id,'dark',rgba)
    for y in range(H*scale):
        for x in range(W*scale):
            k=(((height*scale-1-(index//cols*ch*scale+4*scale+y))*width*scale)+(index%cols*cw*scale+4*scale+x))*4
            pixel=g.p[(y//scale)*W+x//scale]
            if pixel[3]:pixels[k:k+4]=array('f',pixel)
im=bpy.data.images.new('arcane-sheet',width=width*scale,height=height*scale,alpha=True)
im.pixels.foreach_set(pixels);im.filepath_raw=str(ROOT/'reports/screenshots/cards-arcane-preview.png');im.file_format='PNG';im.save()
