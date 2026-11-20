import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This app holds student records and has no login, so it must only ever be used from this computer.
// The start scripts already listen on 127.0.0.1 only. This is a second lock, in case the app is started
// some other way, and it also stops other websites from talking to the app through your own browser.
//
//  1. Host check: the request must be addressed to this computer (localhost or 127.0.0.1). A visit from
//     another device uses this computer's network address, and a "DNS rebinding" attack uses a made-up
//     website name; both are refused.
//  2. Origin check: a request that changes data must come from this app's own pages, never from another site.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const hostnameOf = (hostHeader: string) => {
  // Drop the port: "localhost:3000" -> "localhost", "[::1]:3000" -> "[::1]"
  return hostHeader.startsWith("[") ? hostHeader.slice(0, hostHeader.indexOf("]") + 1) : hostHeader.split(":")[0];
};

const refuse = (why: string) =>
  new NextResponse(`Blocked: ${why}\nThis app only accepts requests from the computer it is running on.`, {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!LOCAL_HOSTS.has(hostnameOf(host.toLowerCase()))) return refuse("this address is not allowed.");

  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin !== null) {
      let ok = false;
      try { ok = LOCAL_HOSTS.has(hostnameOf(new URL(origin).host.toLowerCase())); } catch { ok = false; }
      if (!ok) return refuse("this request came from another website.");
    }
  }
  return NextResponse.next();
}
