import { NextResponse } from "next/server";

import { getJob, updateJob } from "@/app/lib/novels/memory-store";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const job = getJob(params.jobId);

  if (!job) {
    return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const body = (await request.json()) as Parameters<typeof updateJob>[0];
  const job = updateJob({ ...body, jobId: params.jobId });

  if (!job) {
    return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}
