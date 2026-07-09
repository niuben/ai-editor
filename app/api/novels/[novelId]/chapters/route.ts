import { NextResponse } from "next/server";

import { getNovel, listChapters } from "@/app/lib/novels/memory-store";

export async function GET(
  _request: Request,
  { params }: { params: { novelId: string } },
) {
  const novel = getNovel(params.novelId);

  if (!novel) {
    return NextResponse.json({ error: "Novel not found." }, { status: 404 });
  }

  return NextResponse.json({ chapters: listChapters(params.novelId) });
}
