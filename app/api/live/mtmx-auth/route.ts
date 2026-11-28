import { NextRequest, NextResponse } from "next/server";

import { ensureLiveIndexes } from "@/lib/live/database";
import { authorizePublishByKey } from "@/lib/live/publish-gate";
import { isValidMediaSecret } from "@/lib/live/media-auth";

// POST — Auth HTTP do MediaMTX (authMethod: http, authHTTPAddress).
// O MediaMTX chama isto com método POST e payload FIXO dele:
//   { user, password, ip, action, path, protocol, id, query, userAgent }
// 2xx = PERMITE, resto = NEGA. Sem JWT (o MediaMTX não manda um):
// as regras abaixo + segredos por conhecimento (streamKey, bridge) são a segurança.
//
// Regras:
// - publish live/<streamKey>  -> exige chave válida (qualquer IP: o streamer é remoto)
// - publish public/<liveId>   -> só a ponte ffmpeg (credencial bridge)
// - read/playback public/*    -> aberto (HLS público)
// - read/playback live/*      -> só a ponte ffmpeg (credencial bridge)
// - api/metrics/pprof         -> só localhost
function hasBridgeCredentials(user: unknown, password: unknown): boolean {
  const expectedUser = process.env.MTMX_BRIDGE_USER;
  const expectedPass = process.env.MTMX_BRIDGE_PASS;

  // Fail closed: sem credencial configurada, a ponte nunca autentica.
  if (!expectedUser || !expectedPass) return false;

  return user === expectedUser && isValidMediaSecret(password, expectedPass);
}

// Nunca logar chaves: o path live/* contém a streamKey secreta.
function safePath(path: string): string {
  if (path.startsWith("live/")) return "live/<redacted>";
  return path;
}

export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { user, password, ip, action, path } = body ?? {};

  const deny = (reason: string) => {
    console.log(
      `[mtmx-auth] NEGADO reason=${reason} action=${action} path=${typeof path === "string" ? safePath(path) : "?"} ip=${ip}`
    );
    return NextResponse.json({ success: false }, { status: 401 });
  };

  if (typeof action !== "string" || typeof path !== "string") {
    return deny("bad-payload");
  }

  await ensureLiveIndexes();

  switch (action) {
    case "publish": {
      // OBS (anónimo, qualquer IP): a streamKey É a credencial.
      const liveMatch = /^live\/(.{1,128})$/.exec(path);

      if (liveMatch) {
        try {
          const gate = await authorizePublishByKey(liveMatch[1]);
          return gate.allowed
            ? NextResponse.json({ success: true })
            : deny(`publish:${gate.reason}`);
        } catch (error) {
          console.error("[mtmx-auth] erro no portão de publicação:", error);
          return NextResponse.json({ success: false }, { status: 401 });
        }
      }

      // Ponte ffmpeg -> path público: só com credencial bridge.
      if (/^public\/[a-f0-9]{24}$/.test(path)) {
        return hasBridgeCredentials(user, password)
          ? NextResponse.json({ success: true })
          : deny("publish-public");
      }

      return deny("publish-path");
    }

    case "read":
    case "playback": {
      // HLS público: aberto.
      if (path.startsWith("public/")) {
        return NextResponse.json({ success: true });
      }

      // Path privado: só a ponte (com credencial — o IP não distingue,
      // porque o nginx faz todos os HLS parecerem localhost).
      if (path.startsWith("live/")) {
        return hasBridgeCredentials(user, password)
          ? NextResponse.json({ success: true })
          : deny("read-live");
      }

      return deny("read-path");
    }

    case "api":
    case "metrics":
    case "pprof": {
      // Conexões diretas (sem proxy): o IP é confiável aqui.
      if (ip === "127.0.0.1" || ip === "::1") {
        return NextResponse.json({ success: true });
      }

      return deny("admin-remote");
    }

    default:
      return deny("action");
  }
}
