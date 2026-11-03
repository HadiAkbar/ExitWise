import { NextResponse } from 'next/server';
import { readSession,sessionCookie } from '../../../../../lib/session';
import { discovery,authBasic } from '../../../../../lib/snaptrade';
export const runtime='nodejs';
export async function POST(request:Request){
 const session=await readSession();
 if(typeof session?.refresh==='string')try{const m=await discovery();if(m.revocation_endpoint)await fetch(m.revocation_endpoint,{method:'POST',headers:{Authorization:authBasic(),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:session.refresh,token_type_hint:'refresh_token'})});}catch{}
 const res=NextResponse.redirect(new URL('/',request.url),303);res.cookies.delete(sessionCookie);return res;
}
