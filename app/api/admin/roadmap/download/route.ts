/**
 * GET ?profileId=... — streams a .docx file for the client's 90-day roadmap.
 * Admin-only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ShadingType, AlignmentType, WidthType, BorderStyle,
  PageBreak, TableLayoutType,
} from 'docx'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const F        = 'Calibri'
const INK      = '111827'   // near-black body text
const ACCENT   = '1D4ED8'   // deep blue
const MUTED    = '6B7280'   // medium grey
const RULE_C   = 'D1D5DB'   // light border grey
const LIGHT    = 'F9FAFB'   // very light grey bg
const GOLD     = 'B45309'   // amber (cornerstone scripts)
const WHITE    = 'FFFFFF'
const DARK     = '0F172A'   // closing section bg

// No-border shorthand
const NB = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const

// Thin grey cell border
const TB = { style: BorderStyle.SINGLE, size: 4, color: RULE_C } as const

// Thick accent left border (for callout boxes)
const AL = { style: BorderStyle.THICK, size: 36, color: ACCENT } as const

// Standard cell margins
const CM  = { top: 100, bottom: 100, left: 180, right: 180 }
const CMW = { top: 160, bottom: 160, left: 240, right: 240 }  // wide (headers, callouts)

// ── Paragraph helpers ─────────────────────────────────────────────────────────

function p(
  text: string,
  opts: {
    bold?: boolean; italic?: boolean; sz?: number; color?: string;
    before?: number; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {}
): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 160 },
    children: [new TextRun({
      text,
      bold: opts.bold,
      italics: opts.italic,
      size: opts.sz ?? 22,
      color: opts.color ?? INK,
      font: F,
    })],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 22, color: INK, font: F })],
  })
}

function spacer(before = 240): Paragraph {
  return new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun({ text: '' })] })
}

// ── Section header (full-width table with left accent border) ─────────────────

function sectionHeader(num: string, title: string, color = ACCENT): (Paragraph | Table)[] {
  return [
    spacer(560),
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: NB, bottom: NB, left: NB, right: NB },
      rows: [new TableRow({
        children: [new TableCell({
          margins: CMW,
          shading: { type: ShadingType.SOLID, color: LIGHT },
          borders: {
            top: NB,
            bottom: { style: BorderStyle.SINGLE, size: 6, color: color },
            left: { style: BorderStyle.THICK, size: 40, color: color },
            right: NB,
          },
          children: [new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({ text: num + '   ', bold: true, color: color, size: 20, font: F }),
              new TextRun({ text: title, bold: true, color: INK, size: 26, font: F }),
            ],
          })],
        })],
      })],
    }),
    spacer(200),
  ]
}

// ── Sub-heading ───────────────────────────────────────────────────────────────

function subhead(text: string, before = 280): Paragraph {
  return new Paragraph({
    spacing: { before, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE_C, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 24, color: INK, font: F })],
  })
}

// ── Callout box (left accent border, light bg) ────────────────────────────────

function calloutBox(text: string, label?: string, color = ACCENT): Table {
  const children: Paragraph[] = []
  if (label) {
    children.push(new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: label.toUpperCase(), size: 17, color, bold: true, font: F })],
    }))
  }
  children.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text, size: 22, color: INK, bold: true, italics: true, font: F })],
  }))

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: NB, bottom: NB, left: NB, right: NB },
    rows: [new TableRow({
      children: [new TableCell({
        margins: CMW,
        shading: { type: ShadingType.SOLID, color: color === ACCENT ? 'EFF6FF' : 'FFFBEB' },
        borders: { top: NB, bottom: NB, left: AL, right: NB },
        children,
      })],
    })],
  })
}

// ── Data table (n columns) ────────────────────────────────────────────────────

function dataTable(rows: string[][], headers: string[], colWidths?: number[]): Table {
  const n = headers.length

  function cell(text: string, isHeader: boolean, colIdx: number): TableCell {
    const width = colWidths ? { size: colWidths[colIdx], type: WidthType.PERCENTAGE } : undefined
    return new TableCell({
      width,
      margins: CM,
      shading: isHeader ? { type: ShadingType.SOLID, color: INK } : undefined,
      borders: {
        top: TB,
        bottom: TB,
        left: colIdx === 0 ? NB : TB,
        right: colIdx === n - 1 ? NB : TB,
      },
      children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({
          text,
          bold: isHeader || colIdx === 0,
          size: 20,
          color: isHeader ? WHITE : INK,
          font: F,
        })],
      })],
    })
  }

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: NB, bottom: NB, left: NB, right: NB },
    rows: [
      new TableRow({ children: headers.map((h, ci) => cell(h, true, ci)) }),
      ...rows.map(row => new TableRow({ children: row.map((v, ci) => cell(v, false, ci)) })),
    ],
  })
}

// ── Phase banner ──────────────────────────────────────────────────────────────

function phaseBanner(label: string, subtitle: string, description: string, color: string): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: NB, bottom: NB, left: NB, right: NB },
    rows: [new TableRow({
      children: [new TableCell({
        margins: { top: 200, bottom: 200, left: 280, right: 280 },
        shading: { type: ShadingType.SOLID, color },
        borders: { top: NB, bottom: NB, left: NB, right: NB },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({ text: label, bold: true, size: 26, color: WHITE, font: F }),
              new TextRun({ text: '  —  ' + subtitle, bold: false, size: 22, color: WHITE, font: F }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: description, size: 20, color: WHITE, italics: true, font: F })],
          }),
        ],
      })],
    })],
  })
}

// ── Script card ───────────────────────────────────────────────────────────────

function scriptCard(script: {
  title: string; why: string; order: number; cornerstone: boolean;
  hook: string; body: string; cta: string;
}, idx: number): (Paragraph | Table)[] {
  const isCorner = script.cornerstone
  const C = isCorner ? GOLD : ACCENT
  const tagText = isCorner ? '★ CORNERSTONE  ·  Film This First' : `Script ${idx + 1}`

  const leftBorder = { style: BorderStyle.THICK, size: 32, color: C } as const
  const rowBottom  = { style: BorderStyle.SINGLE, size: 4, color: RULE_C } as const

  return [
    spacer(320),
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: NB, bottom: NB, left: NB, right: NB },
      rows: [
        // Title bar
        new TableRow({ children: [new TableCell({
          margins: { top: 180, bottom: 180, left: 240, right: 240 },
          shading: { type: ShadingType.SOLID, color: C },
          borders: { top: NB, bottom: NB, left: NB, right: NB },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 40 },
              children: [
                new TextRun({ text: tagText + '  ', size: 17, color: WHITE, bold: true, font: F }),
              ],
            }),
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new TextRun({ text: script.title, size: 25, color: WHITE, bold: true, font: F })],
            }),
            new Paragraph({
              spacing: { before: 60, after: 0 },
              children: [new TextRun({ text: script.why, size: 18, color: isCorner ? 'FDE68A' : 'BFDBFE', italics: true, font: F })],
            }),
          ],
        })] }),

        // Hook
        new TableRow({ children: [new TableCell({
          margins: { top: 160, bottom: 160, left: 240, right: 240 },
          shading: { type: ShadingType.SOLID, color: LIGHT },
          borders: { top: NB, bottom: rowBottom, left: leftBorder, right: NB },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 60 },
              children: [new TextRun({ text: 'HOOK  ·  0–3 seconds', size: 16, color: C, bold: true, font: F })],
            }),
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new TextRun({ text: script.hook, size: 23, color: INK, bold: true, italics: true, font: F })],
            }),
          ],
        })] }),

        // Script body
        new TableRow({ children: [new TableCell({
          margins: { top: 160, bottom: 160, left: 240, right: 240 },
          borders: { top: NB, bottom: rowBottom, left: leftBorder, right: NB },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 80 },
              children: [new TextRun({ text: 'SCRIPT  ·  3–45 seconds', size: 16, color: C, bold: true, font: F })],
            }),
            ...script.body.split('\n').filter(Boolean).map(line =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: line, size: 21, color: INK, font: F })],
              })
            ),
          ],
        })] }),

        // CTA
        new TableRow({ children: [new TableCell({
          margins: { top: 140, bottom: 140, left: 240, right: 240 },
          shading: { type: ShadingType.SOLID, color: isCorner ? 'FFFBEB' : 'EFF6FF' },
          borders: { top: NB, bottom: NB, left: leftBorder, right: NB },
          children: [new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({ text: 'CTA   ', size: 17, color: C, bold: true, font: F }),
              new TextRun({ text: script.cta, size: 21, color: INK, bold: true, font: F }),
            ],
          })],
        })] }),
      ],
    }),
  ]
}

// ── Main builder ──────────────────────────────────────────────────────────────

async function buildDocx(profile: Record<string, unknown>, roadmap: Record<string, unknown>): Promise<Buffer> {
  const s              = (profile.intro_structured as Record<string, unknown>) ?? {}
  const cover          = roadmap.cover as { one_liner: string; stats: { label: string; value: string }[] }
  const strengths      = (roadmap.strengths as string[]) ?? []
  const gaps           = (roadmap.gaps as string[]) ?? []
  const offer          = roadmap.offer as {
    name: string; description: string; delivery_structure: string[];
    founding_rate: string; full_rate: string; cta_keyword: string;
    bio_rewrite: string; pricing_rationale: string;
  }
  const immediateActions = (roadmap.immediate_actions as { action: string; detail: string }[]) ?? []
  const content        = roadmap.content as {
    problem_diagnosis: string; brand_sentence: string;
    pillars: { name: string; format: string; angle: string }[];
    video_structure: { element: string; detail: string }[];
  }
  const scripts        = (roadmap.scripts as {
    title: string; why: string; order: number; cornerstone: boolean;
    hook: string; body: string; cta: string;
  }[]) ?? []
  const phases         = (roadmap.phases as {
    phase: number; subtitle: string; description: string; colour: string;
    tasks?: { task: string; what: string; when: string }[];
    prose?: string; targets: string[];
  }[]) ?? []
  const checkin        = (roadmap.checkin as { item: string; report: string }[]) ?? []
  const closing        = (roadmap.closing as string) ?? ''

  const clientName = (profile.name as string) || 'Client'
  const firstName  = clientName.split(' ')[0]
  const age        = (s.age as string) || ''
  const location   = (s.location as string) || ''
  const ig         = `@${profile.ig_username || '—'}`
  const genDate    = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ── Stats strip on cover ───────────────────────────────────────────────────
  const statsStrip = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: NB, bottom: NB, left: NB, right: NB },
    rows: [new TableRow({
      children: (cover.stats ?? []).map(stat => new TableCell({
        margins: { top: 160, bottom: 160, left: 80, right: 80 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 12, color: ACCENT },
          bottom: NB, left: NB, right: NB,
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [new TextRun({ text: stat.value, bold: true, size: 40, color: INK, font: F })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: stat.label, size: 18, color: MUTED, font: F })],
          }),
        ],
      })),
    })],
  })

  // ── Closing dark table ─────────────────────────────────────────────────────
  const closingTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: NB, bottom: NB, left: NB, right: NB },
    rows: [new TableRow({
      children: [new TableCell({
        margins: { top: 480, bottom: 480, left: 560, right: 560 },
        shading: { type: ShadingType.SOLID, color: DARK },
        borders: { top: NB, bottom: NB, left: NB, right: NB },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [new TextRun({ text: 'A NOTE FROM WILL', bold: true, size: 18, color: GOLD, font: F })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 6 } },
            children: [new TextRun({ text: '' })],
          }),
          ...closing.split('\n').filter(Boolean).map(line =>
            new Paragraph({
              spacing: { before: 100, after: 100 },
              children: [new TextRun({ text: line, size: 22, color: 'E2E8F0', font: F })],
            })
          ),
          new Paragraph({
            spacing: { before: 240, after: 0 },
            children: [new TextRun({ text: 'Will', bold: true, size: 22, color: GOLD, font: F })],
          }),
        ],
      })],
    })],
  })

  // ── Assemble document ─────────────────────────────────────────────────────
  const children: (Paragraph | Table)[] = [

    // ── COVER ───────────────────────────────────────────────────────────────
    spacer(160),
    p('CREATOR CULT', { bold: true, color: ACCENT, sz: 20, after: 40 }),
    p('90-Day Roadmap', { color: MUTED, sz: 18, after: 0 }),

    spacer(480),
    p(clientName, { bold: true, sz: 72, color: INK, after: 80 }),

    new Paragraph({
      spacing: { before: 0, after: 160 },
      children: [new TextRun({
        text: [age && `Age ${age}`, location, ig].filter(Boolean).join('   ·   '),
        size: 22, color: MUTED, font: F,
      })],
    }),

    p(cover.one_liner, { italic: true, sz: 24, color: '374151', after: 360 }),

    statsStrip,

    spacer(400),
    p(`Generated ${genDate}`, { sz: 17, color: MUTED, italic: true, after: 0 }),

    // Page break
    new Paragraph({ children: [new PageBreak()] }),

    // ── 01  WHERE YOU ARE ───────────────────────────────────────────────────
    ...sectionHeader('01', 'Where You Are'),

    subhead('What you have', 80),
    ...strengths.map(s => bullet(s)),

    subhead('What\'s missing'),
    ...gaps.map(g => bullet(g)),

    // ── 02  YOUR OFFER ──────────────────────────────────────────────────────
    ...sectionHeader('02', 'Your Offer'),

    p(offer.name, { bold: true, sz: 30, color: ACCENT, before: 0, after: 80 }),
    p(offer.description, { after: 200 }),

    subhead('How it works'),
    ...offer.delivery_structure.map(line => bullet(line)),

    spacer(240),
    dataTable(
      [
        ['Founding rate  (first 3 clients)', offer.founding_rate],
        ['Full rate  (once results are in)', offer.full_rate],
        ['ManyChat keyword', offer.cta_keyword],
      ],
      ['', ''],
      [45, 55],
    ),

    spacer(280),
    calloutBox(`"${offer.bio_rewrite}"`, 'New bio'),

    spacer(200),
    subhead('Pricing rationale', 0),
    p(offer.pricing_rationale),

    // ── 03  FIX THESE FIRST ─────────────────────────────────────────────────
    ...sectionHeader('03', 'Fix These First — This Week'),

    dataTable(
      immediateActions.map((a, i) => [`${i + 1}.  ${a.action}`, a.detail]),
      ['Action', 'What to do'],
      [35, 65],
    ),

    // ── 04  CONTENT PLAN ────────────────────────────────────────────────────
    ...sectionHeader('04', 'Content Plan'),

    p(content.problem_diagnosis, { after: 200 }),

    calloutBox(`"${content.brand_sentence}"`, 'Your brand sentence'),

    spacer(280),
    subhead('Content pillars', 0),
    spacer(120),
    dataTable(
      content.pillars.map(pl => [pl.name, pl.format, pl.angle]),
      ['Pillar', 'Format & purpose', 'Your angle'],
      [18, 27, 55],
    ),

    spacer(240),
    subhead('Video structure', 0),
    spacer(120),
    dataTable(
      content.video_structure.map(v => [v.element, v.detail]),
      ['Element', 'How to do it'],
      [28, 72],
    ),

    // ── 05  SCRIPTS ─────────────────────────────────────────────────────────
    ...sectionHeader('05', 'Scripts — Film These This Week'),

    ...scripts
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .flatMap((sc, i) => scriptCard(sc, i)),

    spacer(360),

    // ── 06  90-DAY PHASE PLAN ───────────────────────────────────────────────
    ...sectionHeader('06', '90-Day Phase Plan'),

    ...phases.flatMap(phase => {
      const phaseLabel = `Phase ${phase.phase}  ·  Days ${phase.phase === 1 ? '1–30' : phase.phase === 2 ? '31–60' : '61–90'}`
      const colour     = phase.colour || (phase.phase === 1 ? '1D4ED8' : phase.phase === 2 ? '6D28D9' : 'B45309')

      const blocks: (Paragraph | Table)[] = [
        spacer(320),
        phaseBanner(phaseLabel, phase.subtitle, phase.description, colour),
        spacer(160),
      ]

      if (phase.tasks && phase.tasks.length > 0) {
        blocks.push(
          subhead('Tasks', 0),
          spacer(80),
          dataTable(
            phase.tasks.map(t => [t.task, t.what, t.when]),
            ['Task', 'What it involves', 'When'],
            [25, 55, 20],
          ),
        )
      }

      if (phase.prose) {
        const paras = phase.prose.split('\n').filter(Boolean)
        blocks.push(...paras.map(pp => p(pp, { before: 120, after: 120 })))
      }

      blocks.push(
        spacer(160),
        subhead('Targets by end of phase', 0),
        ...phase.targets.map(t => bullet(t)),
      )

      return blocks
    }),

    // ── 07  WEEKLY CHECK-IN ─────────────────────────────────────────────────
    ...sectionHeader('07', 'Weekly Check-In Framework'),

    dataTable(
      checkin.map(c => [c.item, c.report]),
      ['Check-in item', 'What to report'],
      [35, 65],
    ),

    // ── CLOSING ─────────────────────────────────────────────────────────────
    new Paragraph({ children: [new PageBreak()] }),
    closingTable,
  ]

  const doc = new Document({
    creator: 'Creator Cult',
    title: `${clientName} — 90-Day Roadmap`,
    description: `Creator Cult 90-day roadmap for ${clientName}`,
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      children,
    }],
  })

  return Packer.toBuffer(doc)
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile?.roadmap_json) {
    return NextResponse.json({ error: 'No roadmap generated yet' }, { status: 404 })
  }

  try {
    const buffer = await buildDocx(
      profile as Record<string, unknown>,
      profile.roadmap_json as Record<string, unknown>,
    )

    const name     = (profile.name as string || 'Client').replace(/\s+/g, '_')
    const filename = `${name}_90_Day_Roadmap.docx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to build document'
    console.error('[roadmap/download]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
