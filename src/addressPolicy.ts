// Issue #5: arrival never triggered at home because the destination pin may not have been the house.
// Android's geocoder can drop the house number and return the middle of the street (or a nearby match),
// and the label shown is that pin's own address, so the difference is easy to miss.
//
// A pin is "approximate" when the driver typed a house number and the pin's address has no number or a
// different one. Typing a place name (no number) is never flagged.

// "34 Smith St", "34a Smith St", "12/34 Smith St" (unit 12, house 34), "Unit 3, 34 Smith St", "32-36 Smith St"
const HOUSE = /^\s*(?:(?:unit|u|apt|apartment|flat|suite)\s*\d+[a-z]?\s*,?\s*)?(?:\d+[a-z]?\s*\/\s*)?(\d+[a-z]?)(?:\s*-\s*\d+[a-z]?)?\s+[a-z]/i;

export function typedHouseNumber(text: string | null | undefined): string | null {
  const m = HOUSE.exec(String(text || ''));
  return m ? m[1].toLowerCase() : null;
}

export function isApproximatePin(typed: string | null | undefined, foundStreetNumber: string | null | undefined): boolean {
  const want = typedHouseNumber(typed);
  if (!want) return false;
  const found = String(foundStreetNumber || '').trim().toLowerCase();
  if (!found) return true;
  if (found === want) return false;
  // "12/34", "32-36", "34 A" style numbers from the geocoder: any part matching counts.
  const parts = found.split(/[\/\-\s]+/).filter(Boolean);
  if (parts.includes(want)) return false;
  const range = /^(\d+)-(\d+)$/.exec(found.replace(/\s+/g, ''));
  const n = parseInt(want, 10);
  if (range && n >= +range[1] && n <= +range[2]) return false;
  return true;
}
