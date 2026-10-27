// N-02 / PA-20: API real local, cookies Spring, CSRF y dos destinatarios distintos.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const {request}=await import(process.env.N02_PLAYWRIGHT||'playwright');
const origin=process.env.N02_ORIGIN||'http://localhost:8080',artifacts=process.env.N02_ARTIFACTS||'/tmp/salud-u-n02-evidence',seed=Date.now(),password='SaludDemo2026!';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));mkdirSync(artifacts,{recursive:true});
const sql=query=>execFileSync('docker',['compose','exec','-T','postgres','sh','-c','psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atq'],{cwd:fileURLToPath(new URL('../../salud-u-backend/',import.meta.url)),input:query,encoding:'utf8'}).trim();
const uuid=value=>{assert.match(value,/^[0-9a-f-]{36}$/);return "'"+value+"'";};
const clients=[];
async function client(){const c=await request.newContext({baseURL:origin});clients.push(c);return c;}
async function api(c,path,method='GET',data,status=200){const headers={};if(method!=='GET'){const t=(await(await c.get('/api/v1/security/csrf')).json()).data;headers[t.headerName]=t.token;}const r=await c.fetch(path,{method,data,headers});assert.equal(r.status(),status,method+' '+path+' '+await r.text());if(status===200&&path.startsWith('/api/not')||status===200&&path==='/api/me/notification-preferences')assert.equal(r.headers()['cache-control'],'no-store, private');return status===204?null:r.json();}
try{
 const admin=await client();await api(admin,'/api/v1/auth/login','POST',{email:'admin.demo@salud-universitaria.test',password});
 const adminId=(await api(admin,'/api/me')).user.id;
 async function student(label){const email='n02.'+label+'.'+seed+'@salud-universitaria.test';const id=(await api(admin,'/api/v1/admin/principals','POST',{email,displayName:'Prueba N02 '+label,password,roles:['STUDENT']},201)).data.id;const context=await client();await api(context,'/api/v1/auth/login','POST',{email,password});return {id,context};}
 const a=await student('propia'),b=await student('ajena');
 const appointment=sql(`BEGIN;
SELECT set_config('salud_u.id_actor',${uuid(adminId)},true) IS NOT NULL;
SELECT set_config('salud_u.roles_actor','ADMINISTRATIVO',true) IS NOT NULL;
CREATE TEMP TABLE n02_fixture AS SELECT gen_random_uuid() paciente,gen_random_uuid() cupo;
INSERT INTO salud_u.paciente(id,id_principal,carnet,carnet_normalizado,codigo_registro,codigo_registro_normalizado,nombres,apellidos,creado_por,actualizado_por)
 SELECT paciente,${uuid(a.id)},'N02-'||paciente,'N02'||paciente,'REG-'||paciente,'REG'||paciente,'Prueba','N02',${uuid(adminId)},${uuid(adminId)} FROM n02_fixture;
INSERT INTO salud_u.cupo_disponibilidad(id,id_personal,inicia_a,termina_a,capacidad,estado,publicado_en,creado_por)
 SELECT f.cupo,(SELECT pe.id FROM salud_u.personal pe JOIN salud_u.rol_principal r ON r.id_principal=pe.id_principal WHERE pe.activo AND r.revocado_en IS NULL AND r.codigo_rol='MEDICO_REVISION' ORDER BY pe.id LIMIT 1),t.inicio,t.inicio+interval '30 minutes',1,'PUBLICADO',now(),${uuid(adminId)} FROM n02_fixture f CROSS JOIN (SELECT greatest(coalesce(max(termina_a),now()),now())+interval '1 day' inicio FROM salud_u.cupo_disponibilidad) t;
CREATE TEMP TABLE n02_solicitud AS SELECT salud_u.crear_solicitud_inicial(paciente) id FROM n02_fixture;
CREATE TEMP TABLE n02_cita AS SELECT salud_u.asignar_solicitud_cita(s.id,f.cupo) id FROM n02_solicitud s CROSS JOIN n02_fixture f;
UPDATE salud_u.cita c SET programada_para=programada_para+interval '1 day' WHERE c.id=(SELECT id FROM n02_cita);
SELECT salud_u.cancelar_solicitud_cita(id,'Prueba operativa N02') FROM n02_solicitud;
SELECT id FROM n02_cita;
COMMIT;`).split('\n').find(value=>/^[0-9a-f-]{36}$/.test(value));assert(appointment);
 const first=await api(a.context,'/api/notifications?limit=1');assert.equal(first.data.length,1);assert.equal(first.unreadCount,3);assert.equal(first.pagination.hasMore,true);assert.equal(first.data[0].appointmentId,appointment);assert(!Object.hasOwn(first.data[0],'id_destinatario'));
 const second=await api(a.context,'/api/notifications?limit=100&before='+encodeURIComponent(first.pagination.nextCursor));assert.equal(second.data.length,2);assert.equal(new Set([...first.data,...second.data].map(n=>n.id)).size,3);
 const empty=await api(b.context,'/api/notifications?recipientId='+a.id);assert.equal(empty.data.length,0);assert.equal(empty.unreadCount,0);
 const foreign=await api(b.context,'/api/notifications/'+first.data[0].id+'/read','PATCH',undefined,404);
 const missing=await api(b.context,'/api/notifications/00000000-0000-4000-8000-000000000001/read','PATCH',undefined,404);assert.deepEqual(foreign,missing);
 const read=await api(a.context,'/api/notifications/'+first.data[0].id+'/read','PATCH');assert.equal(read.data.status,'READ');const repeated=await api(a.context,'/api/notifications/'+first.data[0].id+'/read','PATCH');assert.equal(read.data.readAt,repeated.data.readAt);assert.equal((await api(a.context,'/api/notifications')).unreadCount,2);
 assert.equal(sql('SELECT count(*) FROM salud_u.preferencia_notificacion WHERE id_principal='+uuid(a.id)+';'),'0');
 const defaults=await api(a.context,'/api/me/notification-preferences');assert.equal(defaults.data.receiveReminders,true);assert.equal(defaults.data.reinforcedReminder,true);assert.equal(defaults.data.updatedAt,null);
 assert.equal(sql('SELECT count(*) FROM salud_u.preferencia_notificacion WHERE id_principal='+uuid(a.id)+';'),'0');
 const saved=await api(a.context,'/api/me/notification-preferences','PUT',{receiveReminders:false,reinforcedReminder:true});assert.deepEqual((await api(a.context,'/api/me/notification-preferences')).data,saved.data);assert.equal((await api(b.context,'/api/me/notification-preferences')).data.receiveReminders,true);
 await api(a.context,'/api/me/notification-preferences','PUT',{receiveReminders:true,reinforcedReminder:false,principalId:b.id},400);
 await api(a.context,'/api/notifications?before=invalid','GET',undefined,400);
 assert.equal((await a.context.patch('/api/notifications/'+first.data[0].id+'/read')).status(),403);
 const anonymous=await client();await api(anonymous,'/api/notifications','GET',undefined,401);await api(anonymous,'/api/me/notification-preferences','GET',undefined,401);
 rmSync(artifacts+'/error.txt',{force:true});writeFileSync(artifacts+'/resultado.json',JSON.stringify({status:'PASS',origin,ownCount:3,pagination:true,foreignAndMissing404Identical:true,idempotentRead:true,unreadCount:2,preferencesDefaultWithoutWrite:true,preferencesIsolation:true,csrf403:true,anonymous401:true,appointmentId:appointment},null,2));
 console.log('PASS N02: sesiones reales, paginación, 404 sin fuga, lectura idempotente, contador, preferencias propias, CSRF y 401');
}catch(error){writeFileSync(artifacts+'/error.txt',String(error.stack||error));throw error;}finally{await Promise.all(clients.map(c=>c.dispose()));}
