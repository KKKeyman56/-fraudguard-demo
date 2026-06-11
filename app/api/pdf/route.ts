import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { StudyGuideSchema } from "@/lib/schema";
import { StudyGuidePdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = StudyGuideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data panduan belajar tidak valid." }, { status: 400 });
  }

  // Dipanggil sebagai fungsi (bukan lewat createElement) agar renderToBuffer
  // menerima elemen <Document> secara langsung sesuai tipe DocumentProps.
  const buffer = await renderToBuffer(StudyGuidePdf({ guide: parsed.data }));

  const safeName = parsed.data.judul.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60) || "panduan-belajar";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
