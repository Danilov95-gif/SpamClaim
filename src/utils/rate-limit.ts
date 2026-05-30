interface RateWindow {
  count: number;
  windowStart: number;
}

const photoWindows = new Map<string, RateWindow>();
const docWindows = new Map<string, RateWindow>();

const PHOTO_LIMIT = 10;
const PHOTO_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const DOC_LIMIT = 5;
const DOC_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkLimit(
  map: Map<string, RateWindow>,
  userId: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const existing = map.get(userId);

  if (!existing || now - existing.windowStart > windowMs) {
    map.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count++;
  return true;
}

/** Returns false if the user has exceeded 10 photos/hour. */
export function checkPhotoRateLimit(userId: string): boolean {
  return checkLimit(photoWindows, userId, PHOTO_LIMIT, PHOTO_WINDOW_MS);
}

/** Returns false if the user has exceeded 5 documents/day. */
export function checkDocRateLimit(userId: string): boolean {
  return checkLimit(docWindows, userId, DOC_LIMIT, DOC_WINDOW_MS);
}
