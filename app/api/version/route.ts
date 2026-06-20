export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify({ id: __BUILD_ID__ }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
