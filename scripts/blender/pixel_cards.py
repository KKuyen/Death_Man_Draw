"""Original wordless grid art, Blender image authoring, card geometry and preview renders."""
import bpy, math, json, struct, shutil, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/cards'; SRC=ROOT/'assets/blender/cards'; PRE=ROOT/'assets/previews/cards-pixel'
for d in [OUT,OUT/'plain',OUT/'overlays',OUT/'badges',SRC,PRE,ROOT/'reports/screenshots']: d.mkdir(parents=True,exist_ok=True)
W,H=64,88
P={'ink':'201d32','cream':'f5e5bb','white':'fff5dc','gold':'efb849','shade':'a76535','red':'df6757','darkred':'84394b','teal':'69c3b0','blue':'6086be','purple':'b59bd9','dark':'453559','green':'88b96a'}
def rgba(c):
    c=P.get(c,c); return tuple(int(c[i:i+2],16)/255 for i in (0,2,4))+(1,)
class Grid:
    def __init__(self): self.p=[(0,0,0,0)]*(W*H); self.commands=[]
    def dot(self,x,y,c):
        if 0<=x<W and 0<=y<H:self.p[int(y)*W+int(x)]=rgba(c)
    def rect(self,x,y,w,h,c):
        self.commands.append(['rect',x,y,w,h,c])
        for j in range(int(y),int(y+h)):
            for i in range(int(x),int(x+w)):self.dot(i,j,c)
    def ellipse(self,x,y,rx,ry,c):
        self.commands.append(['ellipse',x,y,rx,ry,c])
        for j in range(int(y-ry),int(y+ry+1)):
            for i in range(int(x-rx),int(x+rx+1)):
                if ((i-x)/rx)**2+((j-y)/ry)**2<=1:self.dot(i,j,c)
    def poly(self,pts,c):
        self.commands.append(['poly',pts,c])
        for y in range(max(0,int(min(p[1] for p in pts))),min(H,int(max(p[1] for p in pts))+1)):
            for x in range(max(0,int(min(p[0] for p in pts))),min(W,int(max(p[0] for p in pts))+1)):
                inside=False
                for i,(a,b) in enumerate(pts):
                    u,v=pts[i-1]
                    if (b>y)!=(v>y) and x<(u-a)*(y-b)/(v-b)+a:inside=not inside
                if inside:self.dot(x,y,c)
    def line(self,a,b,c,width=2):
        n=max(abs(b[0]-a[0]),abs(b[1]-a[1]),1)
        for k in range(n+1):self.rect(round(a[0]+(b[0]-a[0])*k/n)-width//2,round(a[1]+(b[1]-a[1])*k/n)-width//2,width,width,c)
    def box(self,x,y,w,h,c):self.rect(x-2,y-2,w+4,h+4,'ink');self.rect(x,y,w,h,c)
    def orb(self,x,y,rx,ry,c):self.ellipse(x,y,rx+2,ry+2,'ink');self.ellipse(x,y,rx,ry,c)
    def star(self,x,y,c='gold',r=4):self.poly([(x,y-r),(x+2,y-2),(x+r,y),(x+2,y+2),(x,y+r),(x-2,y+2),(x-r,y),(x-2,y-2)],c)
    def eye(self,x,y,c='teal',s=1):
        self.poly([(x-18*s,y),(x-10*s,y-8*s),(x+10*s,y-8*s),(x+18*s,y),(x+10*s,y+8*s),(x-10*s,y+8*s)],'ink')
        self.poly([(x-14*s,y),(x-8*s,y-5*s),(x+8*s,y-5*s),(x+14*s,y),(x+8*s,y+5*s),(x-8*s,y+5*s)],'white')
        self.ellipse(x,y,6*s,6*s,c);self.rect(x-2*s,y-4*s,4*s,8*s,'ink');self.rect(x+1,y-3,2,2,'white')
    def clover(self,x,y):
        # Authored heart bitmap, rotated four ways around the common centre.
        # A cleft between the two lobes survives even in the 56 px tray preview.
        heart=['.##...##.','####.####','#########','#########',
               '.#######.','..#####..','...###...','....#....',
               '....#....','....#....','....#....']
        leaves=set();highlights=set()
        for turn in range(4):
            for row,bits in enumerate(heart):
                for col,bit in enumerate(bits):
                    if bit!='#':continue
                    dx,dy=col-4,row-10
                    for _ in range(turn):dx,dy=-dy,dx
                    leaves.add((x+dx,y+dy))
            for dx,dy in [(-2,-9),(-3,-8),(-2,-8),(2,-9),(3,-8)]:
                for _ in range(turn):dx,dy=-dy,dx
                highlights.add((x+dx,y+dy))
        # Short curved stem emerges between the lower and right leaves.
        self.line((x+3,y+6),(x+6,y+10),'315b39',2)
        self.line((x+6,y+10),(x+4,y+14),'315b39',2)
        self.line((x+3,y+6),(x+5,y+10),'green',1)
        for a,b in sorted(leaves):
            for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                if (a+dx,b+dy) not in leaves:self.rect(a+dx,b+dy,1,1,'ink')
        for a,b in sorted(leaves):self.rect(a,b,1,1,'315b39' if (a+b)%5==0 else 'green')
        for a,b in sorted(highlights):self.rect(a,b,1,1,'c6db9a')
    def card(self,x,y,w=20,h=28,c='cream'):
        self.box(x,y,w,h,c);self.star(x+w//2,y+h//2,'red',5)
    def chain(self,x,y,vertical=False):
        for i in range(4):
            a=x+(0 if vertical else i*7);b=y+(i*7 if vertical else 0)
            self.orb(a,b,3,4,'blue');self.ellipse(a,b,1,2,'ink')
    def arrow(self,pts,c):
        for a,b in zip(pts,pts[1:]):self.line(a,b,c,3)
        x,y=pts[-1];a,b=pts[-2];dx=(x-a);dy=(y-b)
        if abs(dx)>abs(dy):self.poly([(x,y),(x-(6 if dx>0 else -6),y-5),(x-(6 if dx>0 else -6),y+5)],c)
        else:self.poly([(x,y),(x-5,y-(6 if dy>0 else -6)),(x+5,y-(6 if dy>0 else -6))],c)
def frame(accent):
    g=Grid();g.rect(4,2,56,84,'ink');g.rect(2,4,60,80,'ink');g.rect(4,4,56,80,'cream');g.rect(7,7,50,74,'ink');g.rect(9,9,46,70,accent)
    for x,y in [(5,5),(56,78)]:g.rect(x,y,3,5,'gold')
    # Quiet stepped corner marks, with no kind/visibility information.
    return g
IDS=[f'N{i:02}' for i in range(1,10)]+[f'K{i:02}' for i in range(1,14) if i!=6]+[f'X{i:02}' for i in range(1,4)]
ACC=[{'N01':'dark','N02':'darkred','N03':'blue','N04':'teal','N05':'dark','N06':'blue','N07':'dark','N08':'darkred','N09':'blue','K01':'blue','K02':'darkred','K03':'teal','K04':'dark','K05':'blue','K07':'dark','K08':'purple','K09':'teal','K10':'dark','K11':'darkred','K12':'dark','K13':'teal','X01':'darkred','X02':'blue','X03':'dark'}[id] for id in IDS]
def art(id):
    g=frame(ACC[IDS.index(id)])
    if id=='N01':
        g.poly([(20,27),(44,27),(40,35),(48,49),(46,64),(39,69),(23,69),(16,63),(15,49),(24,35)],'ink');g.poly([(23,29),(41,29),(36,36),(45,49),(43,61),(38,65),(25,65),(20,61),(19,49),(28,36)],'gold');g.rect(22,34,21,4,'shade');g.orb(32,51,8,9,'shade');g.star(32,51,'gold',5);g.rect(23,44,3,9,'white')
    elif id=='N02':
        for s in [-1,1]:g.poly([(32+s*7,42),(32+s*24,30),(32+s*22,47),(32+s*9,54)],'ink');g.poly([(32+s*8,43),(32+s*21,35),(32+s*18,45),(32+s*10,49)],'cream')
        g.orb(32,23,12,4,'gold');g.ellipse(32,23,8,1,'darkred');g.poly([(16,42),(23,36),(32,40),(41,36),(48,42),(47,52),(32,67),(17,52)],'ink');g.poly([(20,43),(24,40),(32,44),(40,40),(44,43),(43,50),(32,62),(21,50)],'red');g.line((34,43),(29,51),'ink',3);g.line((29,51),(34,55),'ink',3)
    elif id=='N03':
        g.line((35,50),(47,67),'ink',9);g.line((35,50),(47,67),'gold',5);g.orb(28,40,16,17,'gold');g.ellipse(28,40,12,13,'dark');g.clover(28,39);g.rect(18,30,4,7,'white')
    elif id=='N04':
        g.poly([(14,29),(32,23),(50,29),(48,51),(42,62),(32,70),(22,62),(16,51)],'ink');g.poly([(18,32),(32,28),(46,32),(44,50),(38,60),(32,64),(26,60),(20,50)],'blue');g.poly([(22,34),(32,31),(32,59),(27,55),(23,47)],'teal');g.star(34,43,'cream',7)
    elif id=='N05':
        g.orb(32,59,10,12,'gold');g.line((32,52),(32,32),'green',4);g.poly([(31,43),(18,38),(16,30),(27,32),(32,39)],'ink');g.poly([(29,39),(20,35),(20,33),(27,35)],'green');g.poly([(33,36),(37,24),(49,23),(47,34),(33,40)],'ink');g.poly([(36,34),(40,28),(45,27),(44,31)],'green');g.rect(26,54,3,6,'white');g.star(47,54)
    elif id=='N06':
        g.orb(32,47,23,24,'cream');g.ellipse(32,47,11,12,'ink');g.rect(27,23,10,11,'red');g.rect(27,60,10,11,'red');g.rect(9,42,12,10,'red');g.rect(43,42,12,10,'red');g.ellipse(32,47,9,10,'blue')
    elif id=='N07':
        g.poly([(18,53),(21,35),(27,29),(37,29),(43,35),(46,53)],'ink');g.poly([(22,50),(25,36),(29,33),(35,33),(39,36),(42,50)],'gold');g.box(17,53,30,5,'gold');g.orb(32,62,4,4,'gold');g.line((17,27),(47,66),'ink',9);g.line((17,27),(47,66),'purple',5)
    elif id=='N08':
        g.poly([(14,29),(32,33),(50,29),(47,55),(41,64),(32,70),(23,64),(17,55)],'ink');g.poly([(18,33),(32,37),(32,65),(23,59),(20,50)],'cream');g.poly([(32,37),(46,33),(44,50),(40,59),(32,65)],'red');g.rect(21,42,8,5,'ink');g.rect(35,42,8,5,'ink');g.line((24,55),(29,58),'ink',3);g.line((35,58),(41,54),'ink',3)
    elif id=='N09':
        g.eye(32,38,'purple');
        for x,y,rx in [(22,51,12),(37,48,15),(44,57,11),(27,60,17)]:g.orb(x,y,rx,7,'purple')
        g.rect(16,55,34,4,'cream');g.rect(23,64,21,2,'blue')
    elif id=='K01':
        g.card(22,44,22,27);g.eye(32,31,'teal');g.line((24,39),(27,47),'gold',2);g.line((40,39),(37,47),'gold',2)
    elif id=='K10':
        g.box(19,64,26,5,'gold');g.orb(32,48,20,18,'purple');g.eye(32,48,'purple');g.poly([(17,29),(28,14),(37,20),(41,31)],'ink');g.poly([(21,27),(29,18),(34,22),(37,29)],'gold');g.star(32,25,'white',3);g.rect(17,40,3,5,'white')
    elif id=='K02':
        g.poly([(28,18),(36,18),(50,67),(14,67)],'gold');g.card(23,39,20,29);g.star(33,53,'red',6);g.box(25,16,14,5,'cream');g.line((17,37),(12,33),'cream',3);g.line((47,37),(52,33),'cream',3)
    elif id=='K03':
        g.card(13,33,16,25);g.card(35,39,16,25);g.arrow([(17,26),(45,26),(45,34)],'gold');g.arrow([(46,70),(19,70),(19,63)],'cream')
    elif id=='K04':
        g.poly([(29,23),(20,38),(27,38),(27,48),(37,48),(37,38),(44,38),(35,23)],'ink');g.poly([(32,25),(25,35),(30,35),(30,44),(34,44),(34,35),(39,35)],'gold');g.card(20,50,24,22,'gold');g.star(17,41,'cream',4);g.star(47,47,'cream',4)
    elif id=='K05':
        g.chain(15,49);g.chain(41,49,True);g.poly([(28,24),(37,24),(36,42),(31,49),(37,56),(28,61),(23,53),(28,43)],'ink');g.poly([(30,27),(34,27),(32,43),(28,49),(33,55),(29,57),(27,52),(31,43)],'cream');g.line((20,30),(15,24),'gold',3);g.line((42,37),(49,31),'gold',3)
    elif id=='K06':
        g.orb(32,44,19,20,'gold');g.ellipse(32,44,14,15,'cream');g.line((32,32),(32,44),'ink',3);g.line((32,44),(41,49),'ink',3);g.arrow([(16,64),(40,69),(49,59)],'red');g.rect(30,28,4,3,'red');g.rect(17,43,3,3,'shade')
    elif id=='K07':
        g.box(17,65,30,5,'gold');g.orb(32,43,21,22,'blue');g.ellipse(32,43,16,17,'purple');g.card(25,32,15,24);g.rect(17,32,3,9,'white');g.star(46,26,'cream',3)
    elif id=='K08':
        g.card(24,27,17,23);g.orb(32,57,21,11,'shade');g.ellipse(32,54,17,6,'ink');
        for x in range(16,50,7):g.poly([(x,52),(x+3,44),(x+6,52)],'cream');g.poly([(x,59),(x+3,53),(x+6,59)],'cream')
        g.chain(18,69)
    elif id=='K09':
        g.poly([(16,46),(19,31),(29,25),(40,31),(44,46),(49,66),(39,62),(32,68),(24,62),(14,66)],'ink');g.poly([(20,46),(23,34),(29,30),(36,34),(40,46),(43,60),(37,57),(32,63),(26,57),(20,60)],'cream');g.rect(25,38,4,6,'ink');g.rect(34,38,4,6,'ink');g.orb(46,27,6,6,'red')
    elif id=='K11':
        # Gloved hand reaching out of a sleeve and taking a glowing card.
        g.card(34,25,15,27,'cream');g.eye(42,38,'red',.35)
        g.poly([(10,63),(12,47),(20,46),(23,39),(26,41),(25,47),(29,37),(32,38),(30,49),(35,43),(38,46),(34,56),(27,64),(23,72),(12,72)],'ink')
        g.poly([(13,61),(15,50),(23,49),(26,44),(28,46),(27,52),(32,44),(34,46),(31,55),(25,61),(22,67),(14,67)],'purple')
        g.line((14,63),(23,65),'gold',2);g.line((19,53),(24,57),'shade',1);g.line((21,50),(27,54),'white',1)
        g.arrow([(47,65),(51,60),(51,53)],'gold');g.star(40,20,'red',3)
    elif id=='K12':
        # Two torn cards, crossed by a crack with scattered fragments.
        g.card(13,28,16,30,'cream');g.card(36,38,15,29,'cream')
        for x,y in [(13,42),(36,51)]:
            g.poly([(x-2,y),(x+5,y+3),(x+9,y-2),(x+17,y+2),(x+18,y+7),(x+9,y+3),(x+5,y+7),(x-2,y+4)],'ink')
            g.line((x,y),(x+5,y+2),'red',1);g.line((x+9,y-1),(x+16,y+2),'red',1)
        for x,y in [(18,63),(28,66),(32,27),(47,31),(24,20)]:g.poly([(x,y),(x+3,y-2),(x+2,y+3)],'gold')
        g.line((30,22),(26,34),'purple',2);g.line((26,34),(34,44),'purple',2);g.line((34,44),(30,57),'purple',2);g.star(31,73,'red',3)
    elif id=='K13':
        # Wheel of fate encircling two new cards, with opposing arrows.
        g.orb(32,44,22,25,'gold');g.ellipse(32,44,19,22,'ink')
        g.card(19,34,15,25,'cream');g.card(32,30,14,25,'shade');g.star(39,43,'cream',4)
        g.arrow([(15,38),(17,28),(26,22),(36,22)],'teal');g.arrow([(49,51),(47,62),(38,67),(28,67)],'teal')
        for x,y in [(32,15),(9,44),(55,44),(32,74)]:g.star(x,y,'cream',2)
    elif id=='K11':
        # A gloved hand steals a marked playing card.
        g.card(35,25,15,27,'cream');g.eye(42,38,'red',.35)
        g.poly([(10,63),(12,47),(20,46),(23,39),(26,41),(25,47),(29,37),(32,38),(30,49),(35,43),(38,46),(34,56),(27,64),(23,72),(12,72)],'ink')
        g.poly([(13,61),(15,50),(23,49),(26,44),(28,46),(27,52),(32,44),(34,46),(31,55),(25,61),(22,67),(14,67)],'purple')
        g.line((14,63),(23,65),'gold',2);g.star(40,20,'red',3)
    elif id=='K12':
        # Two torn cards break apart under a purple fracture.
        g.card(13,28,16,30,'cream');g.card(36,38,15,29,'cream')
        g.poly([(11,42),(17,45),(22,41),(30,45),(29,51),(21,47),(16,51),(11,47)],'ink')
        g.poly([(35,51),(42,54),(47,50),(53,54),(52,60),(43,56),(38,60),(34,56)],'ink')
        g.line((30,22),(26,34),'purple',2);g.line((26,34),(34,44),'purple',2);g.line((34,44),(30,57),'purple',2)
        for x,y in [(18,63),(28,66),(32,27),(47,31),(24,20)]:g.poly([(x,y),(x+3,y-2),(x+2,y+3)],'gold')
        g.star(31,73,'red',3)
    elif id=='K13':
        # A two-way fortune wheel circles the two new cards.
        g.orb(32,44,22,25,'gold');g.ellipse(32,44,19,22,'ink')
        g.card(19,34,15,25,'cream');g.card(32,30,14,25,'shade');g.star(39,43,'cream',4)
        g.arrow([(15,38),(17,28),(26,22),(36,22)],'teal');g.arrow([(49,51),(47,62),(38,67),(28,67)],'teal')
        for x,y in [(32,15),(9,44),(55,44),(32,74)]:g.star(x,y,'cream',2)
    elif id=='X01':
        g.card(14,48,15,22);g.card(25,44,15,26);g.card(36,48,15,22);g.poly([(15,25),(24,33),(32,20),(40,33),(49,25),(45,43),(19,43)],'ink');g.poly([(20,32),(25,37),(32,27),(39,37),(44,32),(42,39),(22,39)],'gold');g.rect(22,40,20,3,'shade')
    elif id=='X02':
        for r,c in [(23,'red'),(19,'gold'),(15,'green'),(11,'teal')]:
            g.ellipse(32,44,r,r,c);g.rect(9,44,47,32,'blue')
        g.card(22,46,21,25,'cream');g.star(32,58,'purple',6)
    elif id=='X03':
        g.poly([(14,34),(31,25),(49,35),(49,59),(32,70),(14,59)],'ink');g.poly([(18,36),(31,29),(44,36),(32,43)],'cream');g.poly([(18,39),(30,46),(30,64),(18,57)],'gold');g.poly([(34,46),(45,39),(45,57),(34,64)],'red');
        for x,y in [(30,35),(23,47),(25,56),(39,48),(39,57)]:g.ellipse(x,y,2,2,'ink')
    return g
def back():
    g=frame('dark');
    for y in range(14,76,8):
        for x in range(12,54,8):g.rect(x,y,4,4,'purple')
    g.poly([(32,19),(50,44),(32,70),(14,44)],'ink');g.poly([(32,24),(45,44),(32,65),(19,44)],'gold');g.eye(32,44,'red',.6);return g
MODS=['gold','wild','lucky','trapRank','trapSuit','cursed']
def overlay(id):
    g=Grid();color={'gold':'b98b3d','wild':'af6661','lucky':'64894e','trapRank':'c66536','trapSuit':'74558e','cursed':'8c354d'}[id]
    g.rect(1,1,62,3,color);g.rect(1,84,62,3,color);g.rect(1,1,3,86,color);g.rect(60,1,3,86,color)
    if id=='gold':
        # Stacked brass coins, distinct from wild's four different suit pips.
        for x,y in [(48,19),(54,14),(47,10)]:
            g.orb(x,y,5,4,'b98b3d');g.line((x-3,y-2),(x+2,y-2),'white',1)
            g.rect(x-3,y+2,6,1,'shade')
        g.star(10,76,'gold',4)
    elif id=='wild':
        for i,c in enumerate(['af6661','b98b3d','64894e','4c9186','516c91','9276a7']):g.rect(1,2+i*14,3,14,c);g.rect(60,2+i*14,3,14,c)
        g.poly([(50,4),(62,16),(50,28),(38,16)],'ink')
        # Heart, diamond, club, spade: four different suits rather than a star.
        pip_bitmap(g,47,6,['##.##','#####','.###.','..#..'],'af6661')
        pip_bitmap(g,54,13,['..#..','.###.','#####','.###.','..#..'],'b98b3d')
        pip_bitmap(g,40,13,['..#..','.###.','#.#.#','#####','..#..'],'64894e')
        pip_bitmap(g,47,20,['..#..','.###.','#####','#####','..#..','.###.'],'7793b8')
    elif id=='lucky':g.clover(50,16)
    elif id=='trapRank':
        # Three ascending bars clamped by toothed jaws: blocked straight.
        g.box(40,6,20,23,'291b19')
        for x,y,h in [(43,16,5),(49,12,9),(55,8,13)]:g.rect(x,y,4,h,'e5b36c')
        g.line((41,25),(60,25),'c66536',3)
        for x in [42,48,54]:g.poly([(x,24),(x+2,19),(x+4,24)],'white')
        g.line((42,28),(57,28),'shade',1)
        for y in [38,54,70]:g.poly([(3,y-3),(7,y),(3,y+3)],color)
    elif id=='trapSuit':
        # Four identical spades behind a diagonal chain: blocked flush.
        g.box(36,7,24,15,'231c30')
        for x in [37,43,49,55]:pip_bitmap(g,x,9,['..#..','.###.','#####','#####','..#..','.###.'],'bba5cf')
        g.line((37,21),(59,14),'ink',3)
        g.line((37,21),(59,14),'a9a4ba',1)
        for x,y in [(39,20),(45,18),(51,16),(57,14)]:g.rect(x,y,2,2,'white')
        # Diamond net along one edge adds a different frame silhouette.
        for y in [38,50,62]:
            g.line((3,y-6),(9,y),color,1);g.line((9,y),(3,y+6),color,1)
    else:
        g.orb(50,14,8,8,'cream');g.rect(44,12,4,4,'ink');g.rect(52,12,4,4,'ink')
        g.poly([(50,17),(48,20),(52,20)],'ink');g.rect(45,21,11,5,'cream')
        for x in [47,50,53]:g.rect(x,23,1,3,'ink')
        g.line((4,35),(10,43),color,3);g.line((10,43),(5,52),color,3)
    return g
def pip_bitmap(g,x,y,rows,c):
    for dy,row in enumerate(rows):
        for dx,bit in enumerate(row):
            if bit=='#':g.rect(x+dx,y+dy,1,1,c)
def image_grid(name,g,scale=4,path=None):
    im=bpy.data.images.new(name,width=W*scale,height=H*scale,alpha=True)
    # Grid is top-to-bottom; bpy image memory is bottom-to-top. Repeat native pixels, no filtering.
    pixels=[]
    for y in range(H*scale):
        row=(H-1-y//scale)*W
        for x in range(W*scale):pixels.extend(g.p[row+x//scale])
    im.pixels.foreach_set(pixels);im.file_format='PNG';im.filepath_raw=str(path or OUT/(name+'.png'));im.save();return im
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
collections={}
for name in ['SOURCE','EXPORT','PREVIEW']:
    col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col);collections[name]=col
def move_to(obj,name):
    for col in list(obj.users_collection):col.objects.unlink(obj)
    collections[name].objects.link(obj)
sys.path.insert(0,str(ROOT/'scripts/blender'))
from arcane_finish import finish
grids={id:finish(art(id),id,ACC[IDS.index(id)],rgba) for id in IDS}
grids['back']=finish(back(),'back','dark',rgba)
for id in MODS:grids['overlay_'+id]=overlay(id)
(ROOT/'scripts/cards/pixel-recipes.json').write_text(json.dumps({'palette':P,'width':W,'height':H,'grids':{k:g.commands for k,g in grids.items()}},separators=(',',':'))+'\n')
images={id:image_grid(id,grids[id]) for id in IDS}
images['back']=image_grid('back',grids['back'])
for id in IDS:shutil.copyfile(OUT/(id+'.png'),OUT/'plain'/(id+'.png'))
for id in MODS:
    im=image_grid('overlay_'+id,grids['overlay_'+id],path=OUT/'overlays'/(id+'.png'));images['overlay_'+id]=im
    # UI badge uses the same wordless pixel motif, with no text.
    image_grid('badge_'+id,grids['overlay_'+id],path=OUT/'badges'/(id+'.png'))
def material(name,im):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();o=n.new('ShaderNodeOutputMaterial');e=n.new('ShaderNodeEmission');t=n.new('ShaderNodeTexImage');t.image=im;t.interpolation='Closest';m.node_tree.links.new(t.outputs['Color'],e.inputs['Color']);m.node_tree.links.new(e.outputs[0],o.inputs['Surface']);return m
mats={k:material('mat_pixel_'+k,im) for k,im in images.items()}
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
# Rounded rectangular prism: 32 triangles in each cap + 64 side triangles, face/back correct UV orientation.
def card_mesh(name):
    pts=[];r=.003;hw=.032;hh=.044
    for cx,cy,start in [(hw-r,hh-r,0),(-hw+r,hh-r,90),(-hw+r,-hh+r,180),(hw-r,-hh+r,270)]:
        for j in range(4):
            a=math.radians(start+j*30);pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    n=len(pts);verts=[(x,y,z) for z in [-.0004,.0004] for x,y in pts];verts.extend([(0,0,-.0004),(0,0,.0004)]);faces=[];mi=[]
    for i in range(n):
        j=(i+1)%n;faces.extend([(2*n,i,j),(2*n+1,n+j,n+i),(i,n+i,n+j,j)]);mi.extend([1,0,2])
    # Reverse winding: cap front must face +Z, back -Z.
    faces=[tuple(reversed(f)) for f in faces]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    edge=bpy.data.materials.new('mat_card_edge');edge.diffuse_color=rgba('cream');mesh.materials.append(mats['K01']);mesh.materials.append(mats['back']);mesh.materials.append(edge)
    uv=mesh.uv_layers.new(name='UVMap')
    for p,idx in zip(mesh.polygons,mi):
        p.material_index=idx
        for li in p.loop_indices:
            x,y,z=verts[mesh.loops[li].vertex_index];uv.data[li].uv=((.5+x/.064) if idx!=1 else (.5-x/.064),.5+y/.088)
    # Source card lies XY, face +Z. Rotate to source -Y, exported +Z (runtime convention).
    obj.rotation_euler.x=math.pi/2;bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return obj
obj=card_mesh('prop_magic_card');move_to(obj,'EXPORT')
# Export only the prop; existing prop_cards remains untouched, root/attachment names preserved.
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/props/magic_card.glb'),export_format='GLB',use_selection=True,export_yup=True)
for im in images.values():im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'magic_cards_pixel.blend'))
# Orthographic emission contact sheets rendered in Blender at integer pixel scale.
obj.hide_render=True
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.color=(.025,.02,.04);scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
bpy.ops.object.camera_add(location=(0,0,10));cam=bpy.context.object;move_to(cam,'PREVIEW');cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';scene.camera=cam
planes=[]
def sheet(keys,name,cols=6,scale=4):
    for p in planes:bpy.data.objects.remove(p,do_unlink=True)
    planes.clear();rows=math.ceil(len(keys)/cols);cellw,cellh=72,96;width,height=cols*cellw,rows*cellh
    for i,k in enumerate(keys):
        x=(i%cols+.5)*cellw-width/2;y=height/2-(i//cols+.5)*cellh
        bpy.ops.mesh.primitive_plane_add(size=2,location=(x,y,0));p=bpy.context.object;move_to(p,'PREVIEW');p.name='preview_'+k;p.scale=(32,44,1);p.data.materials.append(mats[k]);planes.append(p)
    cam.data.ortho_scale=width;scene.render.resolution_x=round(width*scale);scene.render.resolution_y=round(height*scale);scene.render.filepath=str(PRE/(name+'.png'));bpy.ops.render.render(write_still=True)
    shutil.copyfile(PRE/(name+'.png'),ROOT/'reports/screenshots'/(name+'.png'))
sheet(IDS[:12],'cards-pixel-sheet-1');sheet(IDS[12:]+['back'],'cards-pixel-sheet-2');sheet(['K01','K10','K07'],'cards-pixel-sheet-twins',3)
# Overlays on a plain cream plane so alpha borders remain visible in the sheet.
for k in MODS:
    g=overlay(k)
    for i,p in enumerate(g.p):
        if p[3]==0:g.p[i]=rgba('cream')
    im=image_grid('preview_overlay_'+k,g,path=PRE/(k+'.png'));mats['preview_'+k]=material('mat_preview_'+k,im)
sheet(['preview_'+k for k in MODS],'cards-pixel-sheet-overlays')
for size in [120,56]:
    sheet(IDS+['back'],'cards-pixel-sheet-'+str(size),scale=size/W)
    sheet(['preview_'+k for k in MODS],'cards-pixel-sheet-overlays-'+str(size),scale=size/W)
# Preview the actual exported 3D model from front and back in an isolated source.
for p in planes:bpy.data.objects.remove(p,do_unlink=True)
obj.hide_render=False;obj.rotation_euler.x=-math.pi/2
cam.location=(.028,-.04,.16);from mathutils import Vector
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.155
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.filepath=str(PRE/'magic-card-front.png');bpy.ops.render.render(write_still=True)
obj.rotation_euler.y=math.pi;scene.render.filepath=str(PRE/'magic-card-back.png');bpy.ops.render.render(write_still=True)
# Save a separate editable preview source. All images packed, portable source.
for im in bpy.data.images:
    if im.source=='GENERATED' or im.filepath:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'magic_cards_preview.blend'))
manifest={'style':'wordless-antique-engraved-pixel-art','nativeSize':[64,88],'size':[256,352],'scale':4,'sampling':'NEAREST','authoring':'Blender bpy deterministic grid; scripts/blender/pixel_cards.py + arcane_finish.py','cards':[{'id':id,'file':id+'.png','plain':'plain/'+id+'.png'} for id in IDS],'back':'back.png','overlays':{k:{'file':'overlays/'+k+'.png','badge':'badges/'+k+'.png'} for k in MODS}}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
p=ROOT/'assets/manifests/prop_magic_card.asset.json';m=json.loads(p.read_text());m.update(assetVersion='2.0.0',source='assets/blender/cards/magic_cards_pixel.blend',blenderVersion=bpy.app.version_string,provenance='Original wordless deterministic pixel art and rounded prism authored in Blender by scripts/blender/pixel_cards.py',contentIds=IDS,textures='Embedded 256x352 RGBA PNG; Closest interpolation; correct mirrored back UV',notes=['Root prop_magic_card centered at origin; no new anchors. Same attachment convention as prop_cards.','64x88 native pixels, nearest x4; no text/price/kind/visibility glyphs.','Dimensions 0.064 x 0.088 x 0.0008 m; radius 0.003 m.'],preview='assets/previews/cards-pixel/magic-card-front.png')
data=(ROOT/m['file']).read_bytes();ln=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+ln]);m['nodeNames']=[n.get('name') for n in doc['nodes']];m['samplers']=doc.get('samplers',[]);m['statistics']={'bytes':len(data),'triangles':sum(doc['accessors'][p['indices']]['count']//3 for me in doc['meshes'] for p in me['primitives']),'nodes':len(doc['nodes']),'meshes':len(doc['meshes']),'materials':len(doc['materials']),'textures':len(doc.get('textures',[]))};p.write_text(json.dumps(m,indent=2)+'\n')
p=ROOT/'assets/manifests/saloon-assets.json';s=json.loads(p.read_text());
for a in s['assets']:
    if a['assetId']=='prop_magic_card':a.update(m)
p.write_text(json.dumps(s,indent=2)+'\n')
print('PIXEL_CARDS_OK: 24 faces, back, 6 overlays; GLB, packed blend sources and Blender previews')
