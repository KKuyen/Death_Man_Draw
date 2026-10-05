"""Wordless, engraved pixel finish for the existing procedural card illustrations.
No image manipulation: this is the authored final pass of the native Grid artwork.
"""
import math

# Muted pigments and antique metallic highlights instead of flat candy colours.
PIGMENTS={
 'ink':'111118','cream':'d0bb8d','white':'f0ddb2','gold':'c49445',
 'shade':'73522f','red':'a84744','darkred':'48232e','teal':'4e9b92',
 'blue':'50697e','purple':'8b729c','dark':'30283d','green':'748956'
}
BACKGROUNDS={'dark':'211c2c','darkred':'301c25','blue':'192936','teal':'172c2c','purple':'2d2237'}

def details(g,id):
    """Tiny material/structural cues inside the existing recognisable silhouettes."""
    if id=='back':
        g.rect(9,9,46,70,'dark')
        for y in range(16,79,8):
            for x in range(12,55,8):
                g.poly([(x,y-3),(x+3,y),(x,y+3),(x-3,y)],'ink')
                g.rect(x,y,1,1,'shade')
        g.poly([(32,22),(48,44),(32,66),(16,44)],'gold')
        g.poly([(32,25),(45,44),(32,63),(19,44)],'ink')
        g.poly([(32,29),(41,44),(32,59),(23,44)],'shade')
        g.poly([(32,32),(38,44),(32,56),(26,44)],'darkred')
        g.eye(32,44,'red',.6)
        g.star(32,17,'cream',2);g.star(32,71,'cream',2)
    elif id=='N01':
        g.line((24,39),(22,58),'shade',1);g.line((41,39),(43,58),'shade',1)
        for x,y in [(22,68),(39,70),(46,65)]:
            g.orb(x,y,5,2,'shade');g.line((x-3,y-1),(x+2,y-1),'gold',1)
        g.rect(25,34,15,1,'white')
    elif id=='N02':
        for side in [-1,1]:
            for j in range(3):g.line((32+side*(11+j*3),44),(32+side*(18+j),36+j*2),'shade',1)
        g.line((23,44),(26,42),'white',1);g.line((26,42),(29,45),'white',1)
        g.star(32,20,'white',2)
    elif id=='N03':
        g.line((40,56),(44,60),'shade',1);g.line((43,62),(46,65),'white',1)
        g.ellipse(28,40,13,14,'gold');g.ellipse(28,40,11,12,'dark');g.clover(28,38)
        g.line((18,29),(22,27),'white',1)
    elif id=='N04':
        g.line((32,29),(32,61),'shade',1)
        for x,y in [(19,33),(45,33),(23,52),(41,52),(32,62)]:g.rect(x,y,1,1,'white')
        g.line((21,32),(30,29),'white',1);g.line((33,29),(43,32),'gold',1)
    elif id=='N05':
        g.ellipse(32,59,7,9,'shade');g.ellipse(32,59,5,7,'gold');g.star(32,59,'cream',3)
        g.line((32,48),(25,44),'green',1);g.line((33,42),(42,32),'white',1)
        for x in [27,32,37]:g.line((32,69),(x,73),'shade',1)
    elif id=='N06':
        for x,y in [(20,30),(45,31),(18,64),(44,64)]:g.rect(x,y,2,2,'gold')
        g.line((17,70),(27,73),'teal',1);g.line((36,73),(47,70),'teal',1)
        g.line((13,37),(17,32),'white',1);g.line((46,61),(50,57),'shade',1)
        g.line((28,26),(35,26),'darkred',1);g.line((11,45),(19,45),'darkred',1)
    elif id=='N07':
        g.orb(32,27,3,3,'gold');g.rect(26,38,2,9,'cream')
        g.line((24,48),(39,48),'shade',1);g.line((19,54),(43,54),'white',1)
        g.line((20,28),(47,64),'purple',2)
    elif id=='N08':
        g.line((21,39),(28,40),'shade',1);g.line((35,40),(42,39),'gold',1)
        g.poly([(31,45),(28,52),(33,53)],'shade')
        g.star(25,35,'gold',2);g.line((25,49),(23,54),'blue',1)
        g.line((37,48),(39,52),'darkred',1);g.line((30,60),(35,60),'ink',1)
    elif id=='N09':
        for x,y,w in [(15,53,14),(29,58,20),(19,62,12),(36,52,12)]:g.line((x,y),(x+w,y),'blue',1)
        for x in [22,32,42]:g.line((x,27),(x+1,29),'cream',1)
    elif id=='K01':
        for x in [23,28,36,41]:g.line((x,23),(x-1,20),'teal',1)
        g.line((24,47),(24,65),'shade',1);g.line((26,68),(41,68),'gold',1)
        g.star(16,43,'gold',2);g.star(48,40,'gold',2)
    elif id=='K10':
        g.line((22,65),(26,60),'shade',2);g.line((42,65),(38,60),'shade',2)
        g.rect(21,66,22,1,'white');g.line((22,32),(30,29),'gold',1)
        g.star(44,35,'cream',2)
    elif id=='K02':
        g.line((28,24),(18,63),'shade',1);g.line((36,24),(46,63),'shade',1)
        g.rect(26,17,12,1,'white');g.line((26,42),(26,63),'shade',1)
        g.star(19,47,'white',2)
    elif id=='K03':
        for x,y in [(15,35),(37,41)]:g.line((x,y),(x,y+20),'shade',1);g.rect(x+3,y+20,7,1,'gold')
        g.rect(23,25,11,1,'white');g.rect(29,70,11,1,'shade')
    elif id=='K04':
        g.line((23,54),(23,68),'shade',1);g.line((26,69),(39,69),'cream',1)
        g.star(32,33,'cream',2);g.line((17,29),(20,34),'gold',1);g.line((46,28),(43,34),'gold',1)
    elif id=='K05':
        for x,y in [(16,47),(24,48),(42,49),(42,57)]:g.rect(x,y,1,3,'white')
        g.star(32,45,'gold',3);g.line((24,37),(20,33),'white',1)
        g.line((39,58),(45,63),'gold',1)
    elif id=='K06':
        for i in range(12):
            a=i*math.pi/6;g.line((round(32+11*math.sin(a)),round(44+12*math.cos(a))),(round(32+13*math.sin(a)),round(44+14*math.cos(a))),'shade',1)
        g.orb(32,44,1,1,'gold');g.rect(28,21,8,3,'gold');g.rect(30,18,4,3,'shade')
        g.line((18,34),(23,29),'white',1)
    elif id=='K07':
        g.line((20,67),(23,60),'shade',2);g.line((44,67),(41,60),'shade',2)
        g.rect(20,67,24,1,'cream');g.star(43,44,'cream',2);g.star(23,53,'teal',2)
        g.line((28,35),(28,51),'shade',1);g.line((19,28),(23,25),'white',1)
    elif id=='K08':
        g.line((15,58),(48,58),'gold',1);g.orb(15,57,1,1,'white');g.orb(48,57,1,1,'white')
        g.line((26,30),(26,42),'shade',1);g.rect(29,47,8,1,'red')
    elif id=='K09':
        # A long haunted mask and stitched cloak, rather than a smiling toy ghost.
        g.poly([(24,36),(29,32),(36,36),(38,47),(32,56),(26,48)],'shade')
        g.poly([(26,36),(30,34),(34,36),(35,47),(31,52),(28,46)],'cream')
        g.line((27,39),(30,42),'ink',2);g.line((34,39),(32,42),'ink',2)
        g.rect(30,47,2,3,'ink');g.line((23,49),(22,58),'shade',1);g.line((38,48),(40,56),'shade',1)
        g.line((31,57),(31,61),'shade',1)
    elif id=='K11':
        # Glove knuckle highlights, stolen card edge-light, fingertip shadow on the card corner.
        g.line((16,50),(20,46),'white',1);g.line((22,43),(26,40),'shade',1)
        g.line((30,47),(33,45),'white',1);g.line((14,67),(20,70),'shade',1)
        g.line((36,30),(45,28),'gold',1);g.line((40,50),(44,54),'shade',1)
        g.star(44,42,'cream',2);g.line((12,60),(12,68),'gold',1)
    elif id=='K12':
        # Crack interiors darkened, fragment edges lit, torn card corners frayed.
        g.line((15,31),(15,55),'shade',1);g.line((38,41),(38,64),'shade',1)
        g.line((18,30),(24,30),'white',1);g.line((41,40),(47,40),'white',1)
        for x,y in [(18,63),(28,66),(32,27),(47,31),(24,20)]:g.line((x,y),(x+1,y-1),'white',1)
        g.line((31,73),(31,77),'shade',1);g.line((20,46),(24,50),'purple',1)
    elif id=='K13':
        # Radial spokes on the fortune wheel rim, rim bevel, card-stack highlight.
        for i in range(12):
            a=i*math.pi/6
            g.line((round(32+17*math.sin(a)),round(44+19*math.cos(a))),(round(32+19*math.sin(a)),round(44+21*math.cos(a))),'shade',1)
        g.line((21,38),(21,54),'shade',1);g.line((34,34),(34,50),'white',1)
        g.star(39,43,'white',2)
    elif id=='X01':
        for x in [24,32,40]:g.star(x,37,'red',2)
        g.line((22,41),(42,41),'white',1)
        for x,y in [(16,51),(27,47),(38,51)]:g.line((x,y),(x,y+15),'shade',1)
    elif id=='X02':
        g.line((24,49),(24,67),'shade',1);g.line((26,68),(40,68),'gold',1)
        for x,y in [(15,45),(46,44)]:g.star(x,y,'cream',3)
    elif id=='X03':
        g.line((18,37),(30,44),'white',1);g.line((33,44),(44,38),'white',1)
        g.line((31,46),(31,65),'shade',1);g.line((18,57),(29,63),'shade',1)

# 4x4 ordered (Bayer) dither thresholds: breaks flat background bands into a finer,
# still-pixel-native gradient instead of hard rings.
BAYER4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]

def finish(g,id,accent,rgba):
    details(g,id)
    source=list(g.p)
    oldbg=rgba(accent)
    def hexrgb(h):return tuple(int(h[i:i+2],16) for i in (0,2,4))
    def colour(rgb):return ''.join(f'{max(0,min(255,round(v))):02x}' for v in rgb)
    old_palette={rgba(key):key for key in PIGMENTS}
    seed=sum(ord(c) for c in id)
    base=hexrgb(BACKGROUNDS.get(accent,'211c2c'))
    # Soft contact-shadow footprint: for each column, the lowest illustration pixel
    # (anything not background), smoothed sideways so the shadow reads as one blob
    # instead of a jagged per-column strip.
    raw_bottom={}
    for x in range(9,55):
        bottom=None
        for y in range(78,8,-1):
            if source[y*64+x]!=oldbg:
                bottom=y;break
        raw_bottom[x]=bottom
    def shadow_floor(x):
        vals=[raw_bottom.get(xx) for xx in range(x-2,x+3)]
        vals=[v for v in vals if v is not None]
        return max(vals) if vals else None
    # Restrained halo, woven engraving and suspended motes, only behind the object.
    for y in range(9,79):
        for x in range(9,55):
            pixel=source[y*64+x]
            if pixel==oldbg:
                distance=((x-31.5)/25)**2+((y-44)/37)**2
                level=max(0.0,4-distance*4)
                floor_level=int(level);frac=level-floor_level
                threshold=(BAYER4[y%4][x%4]+0.5)/16
                band=floor_level+1 if frac>threshold else floor_level
                rgb=tuple(c+band*3 for c in base)
                if abs(math.sqrt(((x-32)/22)**2+((y-44)/30)**2)-1)<.035:rgb=tuple(c+12 for c in base)
                elif (x+y)%11==0 and (x-y)%7==0:rgb=tuple(c+5 for c in base)
                if (x*31+y*19+seed)%227==0:rgb=tuple(c+23 for c in base)
                # Contact shadow: a short, falling-off darkening directly under the
                # object's own silhouette footprint (not a fixed shape per card).
                floor=shadow_floor(x)
                if floor is not None and floor<y<=floor+4:
                    falloff=1-(y-floor)/5
                    rgb=tuple(max(0,c-14*falloff) for c in rgb)
                g.rect(x,y,1,1,colour(rgb))
            else:
                key=old_palette.get(pixel)
                if key is None:continue
                rgb=hexrgb(PIGMENTS[key])
                if key!='ink':
                    # Five discrete pigment tiers: convex specular corner, single-side
                    # bevel highlight, concave shadow corner, diagonal dither and a
                    # directional side-shade, instead of one flat fill.
                    up=source[(y-1)*64+x]
                    left=source[y*64+x-1]
                    down=source[(y+1)*64+x] if y+1<88 else pixel
                    right=source[y*64+x+1] if x+1<64 else pixel
                    top_edge=up!=pixel;left_edge=left!=pixel
                    bottom_edge=down!=pixel;right_edge=right!=pixel
                    if top_edge and left_edge and x+y<95:shade=22
                    elif (top_edge or left_edge) and x+y<95:shade=12
                    elif bottom_edge and right_edge:shade=-18
                    elif (x+y)%9==0:shade=-14
                    elif x>34:shade=-5
                    else:shade=0
                    rgb=tuple(c+shade for c in rgb)
                g.rect(x,y,1,1,colour(rgb))
    # Dark cut-paper edge and layered brass frame; stepped corners stay pixel sharp.
    for x,y,w,h,c in [(4,2,56,2,'111118'),(2,4,2,80,'111118'),(60,4,2,80,'111118'),(4,84,56,2,'111118'),(4,4,56,3,'715237'),(4,81,56,3,'715237'),(4,7,3,74,'715237'),(57,7,3,74,'715237'),(5,5,54,1,'b99961'),(5,82,54,1,'4e3829'),(5,6,1,76,'b99961'),(58,6,1,76,'4e3829'),(7,7,50,2,'17151d'),(7,79,50,2,'17151d'),(7,9,2,70,'17151d'),(55,9,2,70,'17151d')]:g.rect(x,y,w,h,c)
    # Mirrored corner filigree; framing conveys atmosphere, never kind/visibility.
    for sx,sy in [(1,1),(-1,1),(1,-1),(-1,-1)]:
        def dot(x,y,c):g.rect(x if sx==1 else 63-x,y if sy==1 else 87-y,1,1,c)
        for x,y in [(10,10),(11,10),(12,10),(13,10),(10,11),(10,12),(10,13),(11,14),(12,15),(13,15),(14,14),(14,13),(15,12),(16,12),(17,12),(12,16),(12,17)]:dot(x,y,'9f7a48')
        for x,y in [(11,11),(12,11),(11,12),(15,15)]:dot(x,y,'d5b777')
    for x in range(19,45,3):
        g.rect(x,10,1,1,'715237');g.rect(63-x,77,1,1,'715237')
    for y in [25,44,63]:
        g.rect(5,y,1,2,'dfc18a');g.rect(58,y,1,2,'9f7a48')
    # A quiet diamond seal centred on the frame, not an action icon.
    for y in [6,81]:g.poly([(29,y),(32,y-2),(35,y),(32,y+2)],'a17b46');g.rect(32,y,1,1,'f0ddb2')
    return g
