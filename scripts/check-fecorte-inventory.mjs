// FE-CORTE: inventario estático de código, dependencias, configuración y build. No requiere servidores.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),results=[],pass=s=>{results.push(s);console.log('PASS '+s);};
const walk=dir=>readdirSync(dir).flatMap(name=>{const path=join(dir,name);return statSync(path).isDirectory()?walk(path):[path];});
const src=walk(join(root,'src')),rel=p=>relative(root,p),read=p=>readFileSync(p,'utf8');

assert.equal(execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),'backend');
pass('Rama de trabajo: backend');

const supabase=src.filter(p=>/supabase/i.test(read(p))).map(rel);assert.deepEqual(supabase,[]);
assert(!existsSync(join(root,'supabase')),'carpeta supabase/ retirada');
const pkg=JSON.parse(read(join(root,'package.json'))),deps=Object.keys({...pkg.dependencies,...pkg.devDependencies});
assert.deepEqual(deps.filter(d=>/supabase|jspdf|^xlsx|^docx$/.test(d)),[]);assert(!/@supabase\//.test(read(join(root,'pnpm-lock.yaml'))));
pass('Sin imports, consultas ni dependencias Supabase en src/, package.json ni pnpm-lock.yaml; sin librerías de exportación en navegador');

const handlers=src.filter(p=>/\/route\.(t|j)sx?$/.test(p)).map(rel),actions=src.filter(p=>/^\s*["']use server["']/m.test(read(p))).map(rel);
assert.deepEqual(handlers,[]);assert.deepEqual(actions,[]);assert(!existsSync(join(root,'src/app/api')));
pass('Sin Route Handlers ni Server Actions: ninguna API de negocio serverless; /api/** sólo por rewrites');

const config=read(join(root,'next.config.ts')),rewrites=[...config.matchAll(/source:\s*"([^"]+)",\s*destination:\s*`\$\{backendOrigin\}([^`]+)`/g)];
assert(rewrites.length>40);for(const [,source,destination] of rewrites){assert.equal(source,destination,'reenvío exacto '+source);assert(source.startsWith('/api/'));}
assert(!/source:\s*"\/api\/:path\*"|\/api\/:path\*/.test(config),'sin comodín global hacia el backend');
pass(`${rewrites.length} rewrites exactos /api/** → SALUD_U_BACKEND_ORIGIN (sin transformación ni comodín global)`);

const demo=src.filter(p=>/demo-[a-z]+-store|mock-(clinic|users)|Daniela Rojas|Dra\. Valeria Mendoza|SaludDemo2026/.test(read(p))).map(rel);assert.deepEqual(demo,[]);
const publicEnv=[...new Set(src.flatMap(p=>[...read(p).matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(m=>m[1])))].sort();
assert.deepEqual(publicEnv.filter(v=>v.startsWith('NEXT_PUBLIC_')),[]);assert(publicEnv.every(v=>v.startsWith('SALUD_U_')||v==='NODE_ENV'),publicEnv.join());
const example=read(join(root,'.env.example')).split('\n').filter(l=>/^[A-Z]/.test(l)).map(l=>l.split('=')[0]);assert.deepEqual(example,['SALUD_U_BACKEND_ORIGIN']);
pass(`Sin stores/datos demo ni nombres ficticios; variables de entorno sólo de servidor (${publicEnv.join(', ')}); .env.example sin claves Supabase`);

const staticDir=join(root,'.next/static');assert(existsSync(staticDir),'ejecutar pnpm build antes');
const bundle=walk(staticDir).filter(p=>p.endsWith('.js')).map(read).join('\n');
for(const needle of ['supabase.co','SUPABASE','SaludDemo2026','SALUD_U_BACKEND_ORIGIN','localhost:8080'])assert(!bundle.includes(needle),'bundle contiene '+needle);
pass('Bundle de navegador sin Supabase, origen interno del backend ni contraseña de pruebas');
console.log(JSON.stringify({status:'PASS',results,rewrites:rewrites.length,env:publicEnv},null,2));
