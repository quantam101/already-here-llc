import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export const runtime = 'nodejs';

const NAVY = rgb(0.035, 0.14, 0.23);
const AMBER = rgb(0.9, 0.64, 0.18);
const INK = rgb(0.12, 0.19, 0.27);
const DIM = rgb(0.32, 0.39, 0.47);
const WIDTH = 612;
const HEIGHT = 792;
const MARGIN = 48;
const TEXT_WIDTH = WIDTH - MARGIN * 2;

const issues = [
  {
    title: '1. Ignoring heat exposure, fire ratings, and pathway conditions',
    description: 'Specify cable jackets, raceways, and environmental ratings for the actual space. Above-ceiling areas are not automatically air-handling plenums. Unconditioned areas can exceed cable operating-temperature limits. Coordinate the design with the applicable adopted electrical and building codes.',
    ask: 'Require a documented space classification, material schedule, temperature ratings, and AHJ review.'
  },
  {
    title: '2. Choosing Cat6 or Cat6A without a capacity plan',
    description: 'Cat6 remains a valid option for many business networks. Cat6A may offer an advantage for longer 10 GbE links and some higher-power PoE and wireless deployments. Select cable category from port speeds, channel lengths, power budgets, interoperability, and planned growth. Wi-Fi 7 does not automatically mandate Cat6A at every access point.',
    ask: 'Require endpoint counts, switch/PoE budget, link lengths, and a written cable-category decision.'
  },
  {
    title: '3. Failing to plan pathways, labeling, and electrical separation',
    description: 'Coordinate racks, cable trays, conduit routes, penetration and firestopping details, labeling conventions, and expansion space before rough-in. Follow applicable separation requirements and approved drawings to limit electrical interference and costly moves.',
    ask: 'Require pathway and rack drawings, labeling maps, and space for future capacity.'
  },
  {
    title: '4. Skipping a documented acceptance-test package',
    description: 'Wire-map or continuity checks alone do not show that a cabling link meets its specified category performance. When the contract requires link certification, use an appropriate calibrated field certifier and retain per-link test exports. Testing is not, by itself, proof of code compliance.',
    ask: 'Require PASS/FAIL results by cable ID, test limits, instrument calibration status, and retesting.'
  },
  {
    title: '5. Failing to verify contractor scope, licensing, and permits',
    description: 'Arizona licensing and inspection obligations depend on the exact work and available exemptions. Confirm the performing contractor has the appropriate Arizona Registrar of Contractors classification when required. Determine which party is responsible for permits and inspections. Out-of-state status alone is not proof of noncompliance.',
    ask: 'Require licensing where applicable, insurance evidence, the permit plan, and closeout responsibility.'
  }
];

const checkpoints = [
  'Document the job site, municipality, responsible AHJ, and governing code edition.',
  'Verify environmental ratings and whether any cable route is an air-handling plenum.',
  'Approve device and port count, Wi-Fi, cameras, voice, PoE power, and growth allowances.',
  'Choose cable category using performance, channel length, budget, and lifecycle needs.',
  'Coordinate tray/conduit fill, separation, firestopping, and cable labels.',
  'Confirm rack location, patch panels, terminations, and port documentation.',
  'Set link-testing limits and required electronic test-report format.',
  'Verify contractor scope, applicable ROC license, permits, and insurance.',
  'Demand as-built plans, exceptions, test reports, and owner handoff.'
];

function wrapped(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET() {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Phoenix Business and Commercial IT Cabling Checklist');
  pdf.setAuthor('Already Here LLC');
  pdf.setSubject('Five critical commercial IT cabling planning mistakes');
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = pdf.addPage([WIDTH, HEIGHT]);
  let y = 730;

  const newPage = () => {
    page = pdf.addPage([WIDTH, HEIGHT]);
    y = 734;
  };
  const need = (height: number) => { if (y - height < 63) newPage(); };
  const line = (value: string, font: PDFFont, size: number, color = INK, step = size * 1.48) => {
    const rows = wrapped(value, font, size, TEXT_WIDTH);
    need(rows.length * step + 4);
    for (const row of rows) {
      page.drawText(row, { x: MARGIN, y, size, font, color });
      y -= step;
    }
  };
  const rule = () => {
    need(19);
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.7, color: rgb(0.79, 0.83, 0.88) });
    y -= 15;
  };
  const heading = (title: string) => {
    need(30);
    line(title, bold, 11.2, NAVY, 16);
    y -= 5;
  };
  const paragraph = (body: string) => {
    line(body, normal, 9.5, INK, 14);
    y -= 6;
  };

  page.drawRectangle({ x: 0, y: HEIGHT - 18, width: WIDTH, height: 18, color: NAVY });
  line('ALREADY HERE LLC  /  PHOENIX VALLEY BUSINESS RESOURCE', bold, 9.4, AMBER, 15);
  y -= 10;
  line('The Phoenix Business & Commercial', bold, 19, NAVY, 25);
  line('IT Cabling Checklist', bold, 19, NAVY, 25);
  y -= 8;
  paragraph('5 critical mistakes to avoid during office build-outs, warehouse expansions, and network upgrades across the Phoenix Valley.');
  rule();
  for (const issue of issues) {
    heading(issue.title);
    paragraph(issue.description);
    line('PROJECT CHECK: ' + issue.ask, normal, 8.9, DIM, 13);
    y -= 12;
  }
  rule();
  heading('Preconstruction decision rule');
  paragraph('Before ordering cable, approve the port schedule, jurisdiction-specific review, pathway drawings, material ratings, link-test criteria, and closeout package.');
  y -= 15;
  heading('Field-ready kickoff checklist');
  for (const item of checkpoints) {
    line('[  ]  ' + item, normal, 9.1, INK, 14);
    y -= 4;
  }
  rule();
  heading('Request an optional scope review');
  paragraph('Already Here LLC provides Phoenix-based managed IT, network and infrastructure support, and onsite technical field operations.');
  line('www.alreadyherellc.com/rfq  |  dispatch@alreadyherellc.com  |  (602) 882-2920', bold, 9.4, NAVY, 15);
  y -= 13;
  line('REFERENCES: City of Phoenix Building Construction Codes (2024 PBCC / 2023 NEC); Arizona Registrar of Contractors License Classifications.', normal, 8, DIM, 11);
  y -= 5;
  line('Educational planning guide only. Not a project-specific engineering design, code ruling, license determination, or permit approval.', normal, 7.8, DIM, 11);
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: MARGIN, y: 43 }, end: { x: WIDTH - MARGIN, y: 43 }, thickness: 0.6, color: rgb(0.79, 0.83, 0.88) });
    p.drawText('ALREADY HERE LLC  |  PHOENIX COMMERCIAL IT CABLING', { x: MARGIN, y: 29, size: 7.5, font: normal, color: DIM });
    p.drawText(String(index + 1) + ' / ' + String(pages.length), { x: WIDTH - 75, y: 29, size: 7.5, font: normal, color: DIM });
  });
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Phoenix-IT-Cabling-Checklist-Already-Here-LLC.pdf"',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
