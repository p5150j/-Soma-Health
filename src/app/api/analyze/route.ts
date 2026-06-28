import { b } from 'baml_client'

export async function POST(req: Request) {
  const { patient_json } = await req.json()
  const stream = b.stream.AnalyzeHealthRecord(patient_json).toStreamable()
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
