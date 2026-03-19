import { prisma } from '../db/index.js';
import { KNOWN_SENDER_IDS } from '../data/known-senders.js';
import { lookupBusinessByName, saveBusinessFromRegistry } from './business.js';

export interface IdentificationCandidate {
  businessName: string;
  companyNumber: string | null;
  address: string | null;
  confidence: number;
  source: string;
  businessDbId?: string; // set after upsertBusinessInDb
}

export interface IdentificationResult {
  best: IdentificationCandidate | null;
  allCandidates: IdentificationCandidate[];
  requiresManualReview: boolean;
}

export function normalizeSenderId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/[^a-z0-9\u05D0-\u05EA]/g, ''); // keep Hebrew letters too
}

export async function identifySender(
  senderName: string,
): Promise<IdentificationResult> {
  const normalized = normalizeSenderId(senderName);
  const candidates: IdentificationCandidate[] = [];

  // Step 1: KNOWN_SENDER_IDS hardcoded table (highest confidence)
  const known = KNOWN_SENDER_IDS[normalized];
  if (known) {
    candidates.push({
      businessName: known.businessName,
      companyNumber: known.companyNumber ?? null,
      address: null,
      confidence: 0.9,
      source: 'known',
    });
  }

  // Step 2: DB cache (SenderIdMapping)
  if (candidates.length === 0) {
    try {
      const cached = await prisma.senderIdMapping.findUnique({
        where: { senderId: normalized },
      });
      if (cached) {
        let confidence = 0.6;
        if (cached.verified) confidence = 0.95;
        else if (cached.reportCount > 3) confidence = 0.8;
        candidates.push({
          businessName: cached.businessName,
          companyNumber: cached.companyNumber ?? null,
          address: cached.address ?? null,
          confidence,
          source: 'cache',
        });
      }
    } catch {
      // Non-fatal
    }
  }

  // Step 3: data.gov.il company registry via existing lookupBusinessByName
  if (candidates.length === 0) {
    try {
      const registryMatches = await lookupBusinessByName(senderName);
      for (const match of registryMatches) {
        const confidence = match.source === 'internal' ? 0.85 : 0.5;
        candidates.push({
          businessName: match.name,
          companyNumber: match.companyNumber ?? null,
          address: match.address ?? null,
          confidence,
          source: match.source === 'internal' ? 'data_gov' : 'registry',
        });
      }
    } catch {
      // Non-fatal
    }
  }

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  const best = candidates[0] ?? null;
  const requiresManualReview = !best || best.confidence < 0.6;

  return { best, allCandidates: candidates.slice(0, 4), requiresManualReview };
}

/**
 * Upsert the identified business into our Business table and return its DB id.
 * This lets us store a proper businessId on the Case.
 */
export async function upsertBusinessFromSenderId(
  candidate: IdentificationCandidate,
): Promise<string> {
  if (candidate.companyNumber) {
    const existing = await prisma.business.findUnique({
      where: { companyNumber: candidate.companyNumber },
    });
    if (existing) return existing.id;
  }

  // Use saveBusinessFromRegistry for registry-sourced matches so we don't duplicate logic
  if (candidate.companyNumber || candidate.address) {
    return saveBusinessFromRegistry({
      id: `sender-${Date.now()}`,
      name: candidate.businessName,
      companyNumber: candidate.companyNumber,
      address: candidate.address,
      confidence: candidate.confidence,
      source: 'registry',
    });
  }

  const business = await prisma.business.create({
    data: { name: candidate.businessName, phones: '[]' },
  });
  return business.id;
}

/**
 * Record or update a SenderIdMapping after user confirms the identification.
 * Raises confidence / reportCount over time.
 */
export async function confirmSenderIdMapping(
  senderIdRaw: string,
  businessName: string,
  companyNumber: string | null,
  source: string,
): Promise<void> {
  const senderId = normalizeSenderId(senderIdRaw);
  try {
    const existing = await prisma.senderIdMapping.findUnique({ where: { senderId } });
    if (existing) {
      const newCount = existing.reportCount + 1;
      await prisma.senderIdMapping.update({
        where: { senderId },
        data: {
          reportCount: newCount,
          verified: newCount >= 5,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.senderIdMapping.create({
        data: {
          senderId,
          senderIdRaw,
          businessName,
          companyNumber: companyNumber ?? undefined,
          source,
          confidence: 0.6,
          reportCount: 1,
        },
      });
    }
  } catch {
    // Non-fatal — don't block the user flow
  }
}
