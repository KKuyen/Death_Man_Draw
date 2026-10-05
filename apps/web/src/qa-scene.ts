// QA harness only (not part of the app bundle): scene without React/UI. Open /qa-scene.html on the Vite dev server.
import {SaloonScene} from './scene';
const s=new SaloonScene(document.getElementById('c') as HTMLCanvasElement,()=>{(window as unknown as {__ready:boolean}).__ready=true;});
(window as unknown as {__saloon:SaloonScene}).__saloon=s;
