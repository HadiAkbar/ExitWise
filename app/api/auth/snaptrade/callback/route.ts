import { NextRequest,NextResponse } from 'next/server';
import { createRemoteJWKSet,jwtVerify } from 'jose';
import { discovery,tokenRequest } from '../../../../../lib/snaptrade';
import { readPending,encrypt,sessionCookie,pendingCookie,cookieOptions } from '../../../../../lib/session';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const home=new URL('/connect',request.url);const fail=(error:string)=>{home.searchParams.set('error',error);const res=NextResponse.redirect(home);res.cookies.delete(pendingCookie);return res;};
 try{
  const pending=await readPending();const state=request.nextUrl.searchParams.get('state');
  if(!pending || typeof pending.state!=='string' || !state || state!==pending.state)return fail('state');
  if(request.nextUrl.searchParams.has('error'))return fail('denied');
  const code=request.nextUrl.searchParams.get('code');if(!code||typeof pending.verifier!=='string'||typeof pending.nonce!=='string')return fail('code');
  const m=await discovery();const tokens=await tokenRequest(m,new URLSearchParams({grant_type:'authorization_code',code,code_verifier:pending.verifier,redirect_uri:process.env.SNAPTRADE_REDIRECT_URI!}));
  if(!tokens.id_token||!tokens.refresh_token||!tokens.access_token)return fail('token');
  const {payload}=await jwtVerify(tokens.id_token,createRemoteJWKSet(new URL(m.jwks_uri)),{issuer:m.issuer,audience:process.env.SNAPTRADE_OAUTH_CLIENT_ID,algorithms:['RS256']});
  if(payload.nonce!==pending.nonce||!payload.sub)return fail('identity');
  const session=await encrypt({sub:payload.sub,email:payload.email||'',access:tokens.access_token,refresh:tokens.refresh_token,expires:Date.now()+tokens.expires_in*1000,scope:tokens.scope||'read'},'30d');
  if(session.length>3800)return fail('session_size');
  home.searchParams.set('connected','true');
  const response=NextResponse.redirect(home);response.cookies.set(sessionCookie,session,cookieOptions(60*60*24*30));response.cookies.delete(pendingCookie);return response;
 }catch{return fail('oauth');}
}
