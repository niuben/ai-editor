import { NextResponse } from "next/server";

import { generateNovelPlan } from "@/app/lib/ai/capabilities/novel-generation";
import { createNovelFromPlan } from "@/app/lib/novels/memory-store";
import type { GenerateNovelPlanInput } from "@/app/lib/novels/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateNovelPlanInput;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
    }

    const { plan, meta } = await generateNovelPlan({ ...body, prompt });
    const result = createNovelFromPlan({ ...body, prompt }, plan);

    return NextResponse.json({ ...result, meta });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to generate novel plan.";
}
