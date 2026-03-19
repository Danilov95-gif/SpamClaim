import { prisma } from '../db/index.js';

export interface BusinessMatch {
  id: string;
  name: string;
  companyNumber: string | null;
  address: string | null;
  confidence: number;
  source: 'internal' | 'registry';
}

interface RegistryRecord {
  _id?: number;
  'מספר חברה'?: unknown;
  'שם חברה'?: unknown;
  'כתובת'?: unknown;
  [key: string]: unknown;
}

interface RegistryResponse {
  result?: {
    records?: RegistryRecord[];
  };
}

const REGISTRY_URL = 'https://data.gov.il/api/3/action/datastore_search';
const REGISTRY_RESOURCE_ID = 'f004176c-b85f-4542-8901-7b3f66a88b91';

export async function lookupBusinessByPhone(phone: string): Promise<BusinessMatch | null> {
  const business = await prisma.business.findFirst({
    where: { phones: { contains: phone } },
  });
  if (!business) return null;

  return {
    id: business.id,
    name: business.name,
    companyNumber: business.companyNumber ?? null,
    address: business.address ?? null,
    confidence: 0.95,
    source: 'internal',
  };
}

export async function lookupBusinessByName(name: string): Promise<BusinessMatch[]> {
  const results: BusinessMatch[] = [];

  // 1. Internal DB lookup
  const internalMatches = await prisma.business.findMany({
    where: { name: { contains: name } },
    take: 3,
  });
  for (const b of internalMatches) {
    results.push({
      id: b.id,
      name: b.name,
      companyNumber: b.companyNumber ?? null,
      address: b.address ?? null,
      confidence: 0.9,
      source: 'internal',
    });
  }

  // 2. data.gov.il Companies Registry lookup
  try {
    const url = new URL(REGISTRY_URL);
    url.searchParams.set('resource_id', REGISTRY_RESOURCE_ID);
    url.searchParams.set('q', name);
    url.searchParams.set('limit', '5');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = (await response.json()) as RegistryResponse;
      const records = data.result?.records ?? [];

      for (const record of records) {
        const companyName = record['שם חברה'] ? String(record['שם חברה']) : '';
        const companyNumber = record['מספר חברה'] ? String(record['מספר חברה']) : null;
        const address = record['כתובת'] ? String(record['כתובת']) : null;

        if (!companyName) continue;

        // Skip duplicates already in internal results
        if (companyNumber && results.some(r => r.companyNumber === companyNumber)) continue;

        results.push({
          id: `registry-${companyNumber ?? record._id ?? String(Math.random())}`,
          name: companyName,
          companyNumber,
          address,
          confidence: 0.75,
          source: 'registry',
        });
      }
    }
  } catch (err) {
    console.error('[business] Registry lookup failed:', err);
    // Non-fatal: return internal results only
  }

  return results.slice(0, 3);
}

/**
 * Persist a registry match to our DB so future lookups are instant.
 * Returns the DB id to link to a Case.
 */
export async function saveBusinessFromRegistry(
  match: BusinessMatch,
  phone?: string,
): Promise<string> {
  if (match.source === 'internal') return match.id;

  // Check if already saved (e.g. by another user)
  if (match.companyNumber) {
    const existing = await prisma.business.findUnique({
      where: { companyNumber: match.companyNumber },
    });
    if (existing) return existing.id;
  }

  const phones = phone ? JSON.stringify([phone]) : '[]';
  const business = await prisma.business.create({
    data: {
      name: match.name,
      companyNumber: match.companyNumber ?? undefined,
      address: match.address ?? undefined,
      phones,
    },
  });

  return business.id;
}
