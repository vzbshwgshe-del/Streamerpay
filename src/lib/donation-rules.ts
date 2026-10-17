export interface SuperChatTier {
  tier: number;
  minAmount: number;
  maxAmount: number;
  name: string;
  headerBg: string;
  contentBg: string;
  textColor: string;
  pinDurationMinutes: number;
  maxCharacters: number;
  label: string;
}

export const DONATION_PRESETS_INR: number[] = [20, 50, 100, 500, 1000];
export const MIN_DONATION_AMOUNT_INR: number = 20;

/**
 * Authentic YouTube Super Chat Tier Structure for Indian Rupees (INR)
 */
export const SUPER_CHAT_TIERS: SuperChatTier[] = [
  {
    tier: 1,
    minAmount: 20,
    maxAmount: 39.99,
    name: 'Blue',
    headerBg: '#1565C0',
    contentBg: '#0D47A1',
    textColor: '#FFFFFF',
    pinDurationMinutes: 0,
    maxCharacters: 0,
    label: 'Chat message only',
  },
  {
    tier: 2,
    minAmount: 40,
    maxAmount: 99.99,
    name: 'Light Blue',
    headerBg: '#00B8D4',
    contentBg: '#00838F',
    textColor: '#FFFFFF',
    pinDurationMinutes: 2,
    maxCharacters: 50,
    label: 'Pinned 2 mins · up to 50 chars',
  },
  {
    tier: 3,
    minAmount: 100,
    maxAmount: 199.99,
    name: 'Green',
    headerBg: '#00BFA5',
    contentBg: '#00796B',
    textColor: '#FFFFFF',
    pinDurationMinutes: 5,
    maxCharacters: 150,
    label: 'Pinned 5 mins · up to 150 chars',
  },
  {
    tier: 4,
    minAmount: 200,
    maxAmount: 399.99,
    name: 'Yellow',
    headerBg: '#FFB300',
    contentBg: '#FF8F00',
    textColor: '#1A1202',
    pinDurationMinutes: 10,
    maxCharacters: 200,
    label: 'Pinned 10 mins · up to 200 chars',
  },
  {
    tier: 5,
    minAmount: 400,
    maxAmount: 999.99,
    name: 'Orange',
    headerBg: '#E65100',
    contentBg: '#BF360C',
    textColor: '#FFFFFF',
    pinDurationMinutes: 30,
    maxCharacters: 225,
    label: 'Pinned 30 mins · up to 225 chars',
  },
  {
    tier: 6,
    minAmount: 1000,
    maxAmount: 1999.99,
    name: 'Magenta',
    headerBg: '#C2185B',
    contentBg: '#880E4F',
    textColor: '#FFFFFF',
    pinDurationMinutes: 60,
    maxCharacters: 250,
    label: 'Pinned 1 hour · up to 250 chars',
  },
  {
    tier: 7,
    minAmount: 2000,
    maxAmount: 100000,
    name: 'Red',
    headerBg: '#D00000',
    contentBg: '#B71C1C',
    textColor: '#FFFFFF',
    pinDurationMinutes: 120,
    maxCharacters: 270,
    label: 'Pinned 2 hours · up to 270 chars',
  },
];

export function getSuperChatTier(amount: number): SuperChatTier {
  if (amount < 20) {
    return SUPER_CHAT_TIERS[0];
  }
  for (let i = SUPER_CHAT_TIERS.length - 1; i >= 0; i--) {
    if (amount >= SUPER_CHAT_TIERS[i].minAmount) {
      return SUPER_CHAT_TIERS[i];
    }
  }
  return SUPER_CHAT_TIERS[0];
}

export function formatPinDuration(minutes: number): string {
  if (minutes === 0) return 'No pin duration';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/**
 * Dynamic message character limits based on donation amount:
 * ₹1–₹19        -> 0 characters
 * ₹20–₹39       -> 20 characters
 * ₹40–₹99       -> 50 characters
 * ₹100–₹199     -> 100 characters
 * ₹200–₹499     -> 150 characters
 * ₹500–₹999     -> 200 characters
 * ₹1,000–₹10,000 -> 300 characters
 */
export function getMaxMessageLength(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 20) {
    return 0;
  }
  if (amount < 40) return 20;
  if (amount < 100) return 50;
  if (amount < 200) return 100;
  if (amount < 500) return 150;
  if (amount < 1000) return 200;
  return 300;
}
