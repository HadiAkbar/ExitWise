import { EncryptJWT, jwtDecrypt } from 'jose';
import { cookies } from 'next/headers';
const COOKIE='ew_session', PENDING='ew_pending';
function key(){const raw=process.env.SESSION_ENCRYPTION_KEY;if(!raw) throw new Error('Missing SESSION_ENCRYPTION_KEY');const b=Buffer.from(raw,'base64');if(b.length!==32) throw new Error('SESSION_ENCRYPTION_KEY must be 32 base64-encoded bytes');return new Uint8Array(b);}
export async function encrypt(data:Record<string,unknown>,lifetime='12h'){return new EncryptJWT(data).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setExpirationTime(lifetime).encrypt(key());}
export async function decrypt(token?:string){if(!token)return null;try {return (await jwtDecrypt(token,key())).payload;}catch{return null;}}
export async function readSession(){return decrypt((await cookies()).get(COOKIE)?.value);}
export async function readPending(){return decrypt((await cookies()).get(PENDING)?.value);}
export function cookieOptions(maxAge:number){return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge};}
export const sessionCookie=COOKIE, pendingCookie=PENDING;
