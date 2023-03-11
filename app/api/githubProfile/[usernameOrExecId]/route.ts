import { generateGitHubProfile } from "@/defer/generateGitHubProfile";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { usernameOrExecId: string } }
) {
  const response = await generateGitHubProfile(params.usernameOrExecId);
  return NextResponse.json(response);
}

export async function GET(
  _request: Request,
  { params }: { params: { usernameOrExecId: string } }
) {
  return NextResponse.json({});
}
