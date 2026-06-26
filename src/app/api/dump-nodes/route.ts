import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const nodes = await req.json()
  const out = path.join(process.cwd(), 'skeleton-nodes.json')
  fs.writeFileSync(out, JSON.stringify(nodes, null, 2))
  return NextResponse.json({ ok: true, count: nodes.length })
}
