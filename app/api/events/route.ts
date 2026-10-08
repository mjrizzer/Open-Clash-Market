import { roomState } from '../market/route';
export const dynamic='force-dynamic';
export async function GET(request: Request) {
  const id=new URL(request.url).searchParams.get('room')||'';
  try { await roomState(request,id); } catch { return new Response('Unauthorized conversation',{status:403}); }
  let cancelled=false;
  const encoder=new TextEncoder();
  const stream=new ReadableStream({
    async start(controller) {
      let previous=''; const until=Date.now()+55000;
      try {
        while(!cancelled && !request.signal.aborted && Date.now()<until) {
          const data=JSON.stringify(await roomState(request,id));
          if(data!==previous) { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); previous=data; }
          else controller.enqueue(encoder.encode(': keepalive\n\n'));
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
      } catch { if(!cancelled) controller.enqueue(encoder.encode('event: unavailable\ndata: {}\n\n')); }
      finally { if(!cancelled) controller.close(); }
    },
    cancel() {cancelled=true;},
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
