import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from 'docx';
import { type WarningLetterData, WARNING_PARAGRAPHS } from '../templates/warning-letter.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function para(text: string, { bold = false, size = 22 }: { bold?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, bold, size, font: 'Arial', rightToLeft: true })],
  });
}

function blank(): Paragraph {
  return new Paragraph({ bidirectional: true, children: [] });
}

function rule(): Paragraph {
  return new Paragraph({
    bidirectional: true,
    border: { bottom: { color: '999999', style: BorderStyle.SINGLE, size: 4, space: 1 } },
    children: [],
  });
}

// ── Generator ─────────────────────────────────────────────────────────────────

export async function generateWarningLetterDocx(data: WarningLetterData): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          // Sender block
          para(data.senderName, { bold: true, size: 24 }),
          ...(data.senderPhone ? [para(`טל: ${data.senderPhone}`, { size: 20 })] : []),
          ...(data.senderAddress ? [para(`כתובת: ${data.senderAddress}`, { size: 20 })] : []),
          blank(),

          // Date + reference
          para(data.documentDate, { size: 20 }),
          para(`מס' פניה: ${data.referenceNumber}`, { size: 18 }),
          blank(),
          rule(),

          // Recipient
          para('לכבוד:', { size: 22 }),
          para(data.businessName, { bold: true, size: 26 }),
          ...(data.companyNumber ? [para(`ח.פ./ע.מ.: ${data.companyNumber}`, { size: 20 })] : []),
          ...(data.businessAddress ? [para(`כתובת: ${data.businessAddress}`, { size: 20 })] : []),
          blank(),

          // Subject
          para(
            'הנדון: דרישה לפיצוי בגין משלוח דבר פרסומת ללא הסכמה – התראה לפני נקיטת הליכים משפטיים',
            { bold: true, size: 22 },
          ),
          blank(),
          rule(),

          // Greeting
          para('לכבוד מי שהדבר נוגע לו/לה,', { size: 22 }),
          blank(),

          // Body paragraphs
          para(`1. ${WARNING_PARAGRAPHS.opening(data)}`),
          blank(),
          para(`2. ${WARNING_PARAGRAPHS.lawReference()}`),
          blank(),
          para(`3. ${WARNING_PARAGRAPHS.demand(data)}`),
          blank(),
          para(`4. ${WARNING_PARAGRAPHS.warning()}`),
          blank(),
          blank(),
          rule(),

          // Signature
          para('בכבוד רב,', { size: 22 }),
          blank(),
          blank(),
          para(data.senderName, { bold: true, size: 22 }),
          ...(data.senderPhone ? [para(`טל: ${data.senderPhone}`, { size: 20 })] : []),
          ...(data.senderAddress ? [para(`כתובת: ${data.senderAddress}`, { size: 20 })] : []),
          blank(),

          // Attachment note
          para('נספח: צילום מסך של ההודעה הפרסומית', { size: 20 }),
          blank(),
          rule(),

          // Footer disclaimer
          para(WARNING_PARAGRAPHS.disclaimer(), { size: 16 }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
