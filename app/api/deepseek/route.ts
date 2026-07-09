import { NextResponse } from "next/server";

import { runLegacyAIRequest } from "@/app/lib/ai/capabilities/legacy";
import type { LegacyAIRequestBody } from "@/app/lib/ai/legacy-types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LegacyAIRequestBody;
    const result = await runLegacyAIRequest(body);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
