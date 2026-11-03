import { NextResponse } from 'next/server';
import { randomBytes,createHash } from 'node:crypto';
import { discovery } from '../../../../../lib/snaptrade';
import { encrypt,pendingCookie,cookieOptions } from '../../../../../lib/session';
export const runtime='nodejs';
function connectError(request:Request, code:string) {
  return NextResponse.redirect(new URL(`/connect?error=${code}`,request.url));
}

export async function GET(request:Request) {
  const clientId=process.env.SNAPTRADE_OAUTH_CLIENT_ID;
  const redirect=process.env.SNAPTRADE_REDIRECT_URI;
  const secret=process.env.SNAPTRADE_OAUTH_CLIENT_SECRET;
  const rawKey=process.env.SESSION_ENCRYPTION_KEY;
  const keyBytes=rawKey ? Buffer.from(rawKey,'base64') : null;
  const missing=[
    !clientId&&'SNAPTRADE_OAUTH_CLIENT_ID',
    !secret&&'SNAPTRADE_OAUTH_CLIENT_SECRET',
    !redirect&&'SNAPTRADE_REDIRECT_URI',
    (!keyBytes||keyBytes.length!==32)&&'SESSION_ENCRYPTION_KEY',
  ].filter((name):name is string=>Boolean(name));
  if(!clientId||!secret||!redirect||!keyBytes||keyBytes.length!==32) {
    console.error(`SnapTrade OAuth setup is incomplete. Missing or invalid server environment values: ${missing.join(', ')}`);
    return connectError(request,'setup');
  }

  try {
    const m=await discovery();
    const state=randomBytes(32).toString('base64url');
    const nonce=randomBytes(32).toString('base64url');
    const verifier=randomBytes(64).toString('base64url');
    const challenge=createHash('sha256').update(verifier).digest('base64url');
    const url=new URL(m.authorization_endpoint);
    Object.entries({
      response_type:'code',
      client_id:clientId,
      redirect_uri:redirect,
      scope:'openid email read',
      state,
      nonce,
      code_challenge:challenge,
      code_challenge_method:'S256',
    }).forEach(([key,value])=>url.searchParams.set(key,value));
    const response=NextResponse.redirect(url);
    response.cookies.set(pendingCookie,await encrypt({state,nonce,verifier},'10m'),cookieOptions(600));
    return response;
  } catch(error) {
    console.error('SnapTrade OAuth could not be started:',error instanceof Error ? error.message : 'Unknown error');
    return connectError(request,'oauth_start');
  }
}
