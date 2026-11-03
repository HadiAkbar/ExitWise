import { NextResponse } from 'next/server';
import { readSession,encrypt,sessionCookie,cookieOptions } from '../../../lib/session';
import { apiGet,discovery,tokenRequest } from '../../../lib/snaptrade';
import { normalizePositions } from '../../../lib/engine.mjs';
export const runtime='nodejs';
export async function GET(){
 try{
  const session=await readSession();if(!session||typeof session.access!=='string'||typeof session.refresh!=='string')return NextResponse.json({error:'Not connected'},{status:401});
  let access=session.access;let newSession:string|undefined;
  if(Number(session.expires)<Date.now()+60000){const m=await discovery();const tokens=await tokenRequest(m,new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refresh}));access=tokens.access_token;
   newSession=await encrypt({...session,access,refresh:tokens.refresh_token,expires:Date.now()+tokens.expires_in*1000},'30d');if(newSession.length>3800)throw new Error('Session storage is too large');}
  const accounts=await apiGet('/accounts',access);if(!Array.isArray(accounts))throw new Error('Unexpected account response');
  const portfolios=await Promise.all(accounts.slice(0,20).map(async(a:{id:string,name?:string})=>{
    const data=await apiGet(`/accounts/${encodeURIComponent(a.id)}/positions/all`,access);return {name:a.name||'Brokerage account',accountId:a.id,asOf:data?.data_freshness?.as_of||null,positions:normalizePositions(a.id,data)};
  }));
  const res=NextResponse.json({connected:true,accounts:portfolios,positions:portfolios.flatMap(p=>p.positions)});
  if(newSession)res.cookies.set(sessionCookie,newSession,cookieOptions(60*60*24*30));return res;
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to load portfolio'},{status:502});}
}
