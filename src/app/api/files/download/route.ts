import { NextRequest } from "next/server";
import fs from "node:fs";
import { getSharedFile } from "../../../../lib/files/store";

export const runtime = "nodejs";

// Types considérés "ouvrables" dans le navigateur
const INLINE_TYPES = [
  /^application\/pdf$/,
  /^image\//,
  /^text\//,
  /^audio\//,
  /^video\//,
];

function shouldInline(mime: string) {
  return INLINE_TYPES.some((re) => re.test(mime));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const forceDownload = searchParams.get("download") === "1";
  const meta = getSharedFile(id);
  if (!meta) {
    return new Response("Not found", { status: 404 });
  }
  const stat = await fs.promises.stat(meta.filepath).catch(() => null);
  if (!stat) return new Response("Not found", { status: 404 });

  const stream = fs.createReadStream(meta.filepath);
  const headers = new Headers();
  headers.set("Content-Type", meta.mime);
  headers.set("Content-Length", String(stat.size));

  // Si doc ouvrable et pas de "download=1", on laisse inline pour prévisualisation
  const disp = !forceDownload && shouldInline(meta.mime) ? "inline" : "attachment";
  headers.set("Content-Disposition", `${disp}; filename="${encodeURIComponent(meta.name)}"`);

  return new Response(stream as any, { headers });
}