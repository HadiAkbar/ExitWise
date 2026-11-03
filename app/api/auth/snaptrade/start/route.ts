import { NextResponse } from 'next/server';
import { randomBytes,createHash } from 'node:crypto';
import { discovery } from '../../../../../lib/snaptrade';
import { encrypt,pendingCookie,cookieOptions } from '../../../../../lib/session';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const clientId=process.env.SNAPTRADE_OAUTH_CLIENT_ID, redirect=process.env.SNAPTRADE_REDIRECT_URI;
 if(!clientId||!process.env.SNAPTRADE_OAUTH_CLIENT_SECRET||!redirect)throw new Error('OAuth environment variables missing');
 const m=await discovery();const state=randomBytes(32).toString('base64url');const nonce=randomBytes(32).toString('base64url');const verifier=randomBytes(64).toString('base64url');
 const challenge=createHash('sha256').update(verifier).digest('base64url');const url=new URL(m.authorization_endpoint);
 Object.entries({response_type:'code',client_id:clientId,redirect_uri:redirect,scope:'openid email read',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).forEach(([k,v])=>url.searchParams.set(k,v));
 const response=NextResponse.redirect(url);response.cookies.set(pendingCookie,await encrypt({state,nonce,verifier},'10m'),cookieOptions(600));return response;
 }catch{return NextResponse.redirect(new URL('/connect?error=setup',request.url));}}
