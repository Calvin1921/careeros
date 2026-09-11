import { NextRequest } from "next/server";
import { voiceToken } from "../../../../server/voice-api.js";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
 let status = 200; let body = ""; const headers = new Headers();
 await voiceToken({method: request.method, headers: Object.fromEntries(request.headers)}, {
   setHeader: (name: string, value: string) => headers.set(name, value),
   set statusCode(value: number) { status = value; },
   end: (value: string) => { body = value; },
 });
 return new Response(body, {status, headers});
}
