// Olvia - NFC tag registry
//
// A physical tag stores only a URL such as https://<domain>/nfc/MED_MORNING.
// The last part of that URL is a tag id from this file. The id says *which
// object* was tapped; everything private (medicine names, doses, contacts)
// stays in Firestore behind sign-in and security rules, never on the tag.

export type MedicationSlot = 'MED_MORNING' | 'MED_AFTERNOON' | 'MED_EVENING';

export type NfcTagId = 'BOTTLE' | MedicationSlot | 'HYDRATION' | 'EMERGENCY';

export type NfcTagKind = 'presence' | 'medication' | 'hydration' | 'emergency';

export interface NfcTagInfo {
  id: NfcTagId;
  kind: NfcTagKind;
  label: string;
  /** Where the sticker goes, shown when setting tags up. */
  placement: string;
  /** False for tags whose screens are planned but not built yet. */
  available: boolean;
}

export const NFC_TAGS: Record<NfcTagId, NfcTagInfo> = {
  BOTTLE: {
    id: 'BOTTLE',
    kind: 'presence',
    label: 'Bottle',
    placement: 'On the outside of the Olvia bottle. Tapping it stops the alarm.',
    available: true,
  },
  MED_MORNING: {
    id: 'MED_MORNING',
    kind: 'medication',
    label: 'Morning medicine',
    placement: 'On the morning compartment.',
    available: true,
  },
  MED_AFTERNOON: {
    id: 'MED_AFTERNOON',
    kind: 'medication',
    label: 'Afternoon medicine',
    placement: 'On the afternoon compartment.',
    available: true,
  },
  MED_EVENING: {
    id: 'MED_EVENING',
    kind: 'medication',
    label: 'Evening medicine',
    placement: 'On the evening compartment.',
    available: true,
  },
  HYDRATION: {
    id: 'HYDRATION',
    kind: 'hydration',
    label: 'Water',
    placement: 'On the water bottle.',
    available: false,
  },
  EMERGENCY: {
    id: 'EMERGENCY',
    kind: 'emergency',
    label: 'Emergency profile',
    placement: 'Somewhere a helper would look, such as a wallet card.',
    available: false,
  },
};

export const MEDICATION_SLOTS: MedicationSlot[] = [
  'MED_MORNING',
  'MED_AFTERNOON',
  'MED_EVENING',
];

/** Suggested time for each slot when a caregiver sets up a routine. */
export const DEFAULT_SLOT_TIMES: Record<MedicationSlot, string> = {
  MED_MORNING: '08:00',
  MED_AFTERNOON: '13:00',
  MED_EVENING: '20:00',
};

/**
 * Sticker colours a caregiver can pick for a compartment tag. The name is
 * always shown and spoken next to the swatch, so colour is never the only cue.
 */
export const TAG_COLORS = [
  { id: 'blue', name: 'Blue', hex: '#2563eb' },
  { id: 'green', name: 'Green', hex: '#16a34a' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308' },
  { id: 'red', name: 'Red', hex: '#dc2626' },
  { id: 'purple', name: 'Purple', hex: '#9333ea' },
  { id: 'orange', name: 'Orange', hex: '#ea580c' },
  { id: 'white', name: 'White', hex: '#f8fafc' },
  { id: 'black', name: 'Black', hex: '#111827' },
] as const;

export type TagColorId = (typeof TAG_COLORS)[number]['id'];

export function tagColor(id: string) {
  return TAG_COLORS.find((c) => c.id === id) ?? TAG_COLORS[0];
}

export function isMedicationSlot(id: string): id is MedicationSlot {
  return (MEDICATION_SLOTS as string[]).includes(id);
}

/**
 * Turns whatever came off a tag or out of a URL into a known tag id.
 * Accepts a bare id ("med_morning") or a full URL ending in /nfc/<id>.
 * Returns null for anything unknown, so a stray or tampered tag is ignored.
 */
export function parseNfcTagId(raw: string): NfcTagId | null {
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(/\/nfc\/([A-Za-z_]+)\/?(?:[?#].*)?$/);
  const candidate = (fromUrl ? fromUrl[1] : trimmed).toUpperCase();
  return candidate in NFC_TAGS ? (candidate as NfcTagId) : null;
}

/** The URL to write onto a physical tag. */
export function nfcTagUrl(origin: string, id: NfcTagId): string {
  return `${origin.replace(/\/$/, '')}/nfc/${id}`;
}
