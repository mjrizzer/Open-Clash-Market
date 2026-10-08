import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const db = () => { if (!env.DB) throw new Error('Database unavailable'); return env.DB; };
const json = (data: unknown, status = 200, headers = {}) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});
const fail = (message: string, status = 400) => Object.assign(new Error(message), {status});
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), v => v.toString(16).padStart(2, '0')).join('');
async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
async function hash(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256'}, key, 256));
}
function equal(a: string, b: string) { let diff = a.length ^ b.length; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return diff === 0; }
function cookie(request: Request) { return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('clash_session='))?.slice(14) || ''; }
async function session(request: Request) {
  const token = cookie(request); if (!token) return null;
  return db().prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').bind(await digest(token), Date.now()).first<{id:string, username:string}>();
}
async function authorized(request: Request) { const u = await session(request); if(!u) throw fail('Please log in to continue.', 401); return u; }
export async function roomState(request: Request, roomId: string) {
  const u = await authorized(request);
  const room = await db().prepare('SELECT * FROM rooms WHERE id=? AND (buyer_id=? OR seller_id=?)').bind(roomId,u.id,u.id).first<any>();
  if(!room) throw fail('Conversation not found.',404);
  const other = room.buyer_id === u.id ? room.seller_id : room.buyer_id;
  const blocked = await db().prepare('SELECT user_id FROM blocks WHERE (user_id=? AND target_user_id=?) OR (user_id=? AND target_user_id=?)').bind(u.id,other,other,u.id).all();
  const messages = await db().prepare('SELECT * FROM (SELECT * FROM messages WHERE chat_room_id=? ORDER BY timestamp DESC,id DESC LIMIT 300) ORDER BY timestamp,id').bind(roomId).all();
  return {messages: messages.results, blocked: blocked.results.length > 0, blockedByMe: blocked.results.some(b => b.user_id === u.id)};
}
export async function GET(request: Request) {
  try {
    const u = await session(request); const url = new URL(request.url);
    if(url.searchParams.has('room')) return json(await roomState(request, url.searchParams.get('room')!));
    if(url.searchParams.has('listing')) {
      await authorized(request);
      const l = await db().prepare('SELECT l.*,u.username FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=?').bind(url.searchParams.get('listing')).first();
      if(!l) throw fail('Listing not found.',404); return json(l);
    }
    const listings = await db().prepare(`SELECT l.id,l.seller_id,l.coc_id,l.town_hall_level,l.price,l.status,l.created_at,u.username FROM listings l JOIN users u ON u.id=l.seller_id WHERE NOT EXISTS(SELECT 1 FROM blocks b WHERE b.user_id=? AND b.target_user_id=l.seller_id) ORDER BY l.created_at DESC LIMIT 500`).bind(u?.id || '').all();
    if(!u) return json({user:null,listings:listings.results,aliases:[],rooms:[],blocks:[]});
    const [aliases, rooms, blocks] = await Promise.all([
      db().prepare('SELECT target_user_id,nickname FROM user_aliases WHERE user_id=?').bind(u.id).all(),
      db().prepare(`SELECT r.*, l.town_hall_level,l.price,l.status,u.id AS other_id,u.username,
        (SELECT content FROM messages m WHERE m.chat_room_id=r.id ORDER BY timestamp DESC LIMIT 1) AS last_message
        FROM rooms r JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=CASE WHEN r.buyer_id=? THEN r.seller_id ELSE r.buyer_id END WHERE r.buyer_id=? OR r.seller_id=? ORDER BY (SELECT MAX(timestamp) FROM messages WHERE chat_room_id=r.id) DESC`).bind(u.id,u.id,u.id).all(),
      db().prepare('SELECT b.target_user_id,u.username FROM blocks b JOIN users u ON u.id=b.target_user_id WHERE b.user_id=?').bind(u.id).all(),
    ]);
    return json({user:u,listings:listings.results,aliases:aliases.results,rooms:rooms.results,blocks:blocks.results});
  } catch(e:any) { return json({error:e.status ? e.message : 'Could not load the marketplace.'},e.status||500); }
}
export async function POST(request: Request) {
  try {
    if(request.headers.get('origin') !== new URL(request.url).origin) throw fail('Invalid request origin.',403);
    const raw = await request.text(); if(raw.length > 12000) throw fail('Request too large.',413);
    let b:any; try { b=JSON.parse(raw); } catch { throw fail('Invalid JSON.'); }
    if(!b || typeof b!=='object' || Array.isArray(b)) throw fail('Invalid request.');
    const action = b.action;
    if(action === 'signup' || action === 'login') {
      const username = String(b.username || '').trim(); const password=String(b.password || '');
      if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw fail('Username must be 3–24 letters, numbers, or underscores.');
      if(password.length<8 || password.length>128) throw fail('Use a password with 8–128 characters.');
      const key = await digest((request.headers.get('cf-connecting-ip') || 'local')+':'+username.toLowerCase()); const now=Date.now();
      const attempt = await db().prepare('INSERT INTO auth_attempts(key,count,reset) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN ? ELSE reset END RETURNING count').bind(key,now+900000,now,now,now+900000).first<any>();
      if(attempt.count>12) throw fail('Too many attempts. Try again in 15 minutes.',429);
      let user = await db().prepare('SELECT * FROM users WHERE username_key=?').bind(username.toLowerCase()).first<any>();
      if(action==='signup') {
        if(user) throw fail('That username is already taken.',409);
        const salt=crypto.randomUUID(); user={id:crypto.randomUUID(), username};
        try { await db().prepare('INSERT INTO users(id,username,username_key,password_hash,salt,created_at) VALUES(?,?,?,?,?,?)').bind(user.id,username,username.toLowerCase(),await hash(password,salt),salt,now).run(); }
        catch { throw fail('That username is already taken.',409); }
      } else {
        const candidate=await hash(password,user?.salt || 'invalid-user-salt');
        if(!user || !equal(candidate,user.password_hash)) throw fail('Incorrect username or password.',401);
      }
      const token=crypto.randomUUID()+crypto.randomUUID();
      await db().prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(await digest(token),user.id,now+604800000).run();
      return json({ok:true},200,{'Set-Cookie':`clash_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(request.url).protocol==='https:'?'; Secure':''}`});
    }
    const u=await authorized(request);
    if(action==='logout') { await db().prepare('DELETE FROM sessions WHERE token=?').bind(await digest(cookie(request))).run(); return json({ok:true},200,{'Set-Cookie':'clash_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'}); }
    if(action==='listing') {
      const tag=String(b.coc_id||'').trim().toUpperCase(); const th=Number(b.town_hall_level); const price=Number(b.price); const contact=String(b.contact_info||'').trim();
      if(!/^#[0289PYLQGRJCUV]{3,14}$/.test(tag)) throw fail('Enter a valid player tag, starting with #.');
      if(!Number.isInteger(th)||th<1||th>16) throw fail('Choose Town Hall 1–16.');
      if(!Number.isFinite(price)||price<=0||price>1000000||Math.abs(price*100-Math.round(price*100))>0.00001) throw fail('Enter a positive price with up to two decimal places.');
      const phoneValid=/^\+?[\d ()-]{7,22}$/.test(contact)&&/^\d{7,15}$/.test(contact.replace(/\D/g,''));
      if(contact.length>254||(!/^[^\s@]+@gmail\.com$/i.test(contact)&&!phoneValid)) throw fail('Enter a Gmail address or phone number.');
      const id=crypto.randomUUID(); await db().prepare('INSERT INTO listings(id,seller_id,coc_id,town_hall_level,price,contact_info,status,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,u.id,tag,th,price,contact,'available',Date.now()).run(); return json({id});
    }
    if(action==='sold') { const r=await db().prepare("UPDATE listings SET status='sold' WHERE id=? AND seller_id=?").bind(b.id,u.id).run(); if(!r.meta.changes) throw fail('Listing not found.',404); return json({ok:true}); }
    if(action==='alias'||action==='block'||action==='unblock') {
      const target=String(b.target_user_id||''); if(target===u.id || !await db().prepare('SELECT id FROM users WHERE id=?').bind(target).first()) throw fail('User not found.',404);
      if(action==='alias') { const nickname=String(b.nickname||'').trim(); if(nickname.length>40) throw fail('Nickname must be 40 characters or fewer.');
        if(nickname) await db().prepare('INSERT INTO user_aliases(user_id,target_user_id,nickname) VALUES(?,?,?) ON CONFLICT(user_id,target_user_id) DO UPDATE SET nickname=excluded.nickname').bind(u.id,target,nickname).run();
        else await db().prepare('DELETE FROM user_aliases WHERE user_id=? AND target_user_id=?').bind(u.id,target).run();
      } else if(action==='block') await db().prepare('INSERT OR IGNORE INTO blocks(user_id,target_user_id) VALUES(?,?)').bind(u.id,target).run();
      else await db().prepare('DELETE FROM blocks WHERE user_id=? AND target_user_id=?').bind(u.id,target).run();
      return json({ok:true});
    }
    if(action==='room') {
      const l=await db().prepare("SELECT * FROM listings WHERE id=? AND status='available'").bind(b.listing_id).first<any>();
      if(!l) throw fail('This listing is no longer available.',404); if(l.seller_id===u.id) throw fail('This is your own listing.');
      if(await db().prepare('SELECT 1 FROM blocks WHERE (user_id=? AND target_user_id=?) OR (user_id=? AND target_user_id=?)').bind(u.id,l.seller_id,l.seller_id,u.id).first()) throw fail('Messaging is unavailable for this user.',403);
      const id=`${l.id}:${u.id}`; await db().prepare('INSERT OR IGNORE INTO rooms(id,listing_id,buyer_id,seller_id) VALUES(?,?,?,?)').bind(id,l.id,u.id,l.seller_id).run(); return json({id});
    }
    if(action==='message') {
      const content=String(b.content||'').trim(); if(!content||content.length>2000) throw fail('Messages must contain 1–2000 characters.');
      const r=await db().prepare('SELECT * FROM rooms WHERE id=? AND (buyer_id=? OR seller_id=?)').bind(b.room_id,u.id,u.id).first<any>(); if(!r) throw fail('Conversation not found.',404);
      const target=r.buyer_id===u.id?r.seller_id:r.buyer_id;
      const result=await db().prepare('INSERT INTO messages(id,chat_room_id,sender_id,receiver_id,content,timestamp) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM blocks WHERE (user_id=? AND target_user_id=?) OR (user_id=? AND target_user_id=?))').bind(crypto.randomUUID(),r.id,u.id,target,content,Date.now(),u.id,target,target,u.id).run();
      if(!result.meta.changes) throw fail('Messaging is blocked for this conversation.',403); return json({ok:true});
    }
    throw fail('Unknown action.');
  } catch(e:any) { return json({error:e.status?e.message:'Something went wrong. Please try again.'},e.status||500); }
}
