import { NextResponse } from "next/server";
import { getSourcesState, saveStoredState } from "@/lib/sourceStore";

export async function GET() {
  const state = await getSourcesState();
  return NextResponse.json(state, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      urls?: unknown;
      entries?: unknown;
      order?: unknown;
    };
    const entries = Array.isArray(body.entries)
      ? body.entries
      : Array.isArray(body.urls)
        ? body.urls.map((value) => ({ type: "url", value }))
        : [];
    const storedState = await saveStoredState(
      entries,
      Array.isArray(body.order) ? (body.order as string[]) : undefined
    );
    const state = await getSourcesState();
    return NextResponse.json(
      { ...state, storedEntries: storedState.entries, order: storedState.order },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
