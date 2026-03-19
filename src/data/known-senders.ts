export interface KnownSenderEntry {
  businessName: string;
  companyNumber?: string;
  category: string;
}

// Hardcoded lookup table of common Israeli SMS Sender IDs → business details.
// Keys are normalized (lowercase, no spaces/dashes/dots).
export const KNOWN_SENDER_IDS: Record<string, KnownSenderEntry> = {
  bezeq: { businessName: 'בזק בינלאומי בע"מ', companyNumber: '520044078', category: 'telecom' },
  hot: { businessName: 'הוט מובייל בע"מ', companyNumber: '514142730', category: 'telecom' },
  hotmobile: { businessName: 'הוט מובייל בע"מ', companyNumber: '514142730', category: 'telecom' },
  partner: { businessName: 'פרטנר תקשורת בע"מ', companyNumber: '520044935', category: 'telecom' },
  cellcom: { businessName: 'סלקום ישראל בע"מ', companyNumber: '520028010', category: 'telecom' },
  pelephone: { businessName: 'פלאפון תקשורת בע"מ', companyNumber: '520034033', category: 'telecom' },
  rami: { businessName: 'רמי לוי שיווק השקמה בע"מ', companyNumber: '511580590', category: 'retail' },
  ramilevi: { businessName: 'רמי לוי שיווק השקמה בע"מ', companyNumber: '511580590', category: 'retail' },
  superpharm: { businessName: 'סופר פארם (ישראל) בע"מ', companyNumber: '511892477', category: 'retail' },
  fox: { businessName: 'פוקס ויזל בע"מ', companyNumber: '520032826', category: 'retail' },
  castro: { businessName: 'קסטרו מודל בע"מ', companyNumber: '511490388', category: 'retail' },
  leumi: { businessName: 'בנק לאומי לישראל בע"מ', companyNumber: '520018015', category: 'banking' },
  bankleumi: { businessName: 'בנק לאומי לישראל בע"מ', companyNumber: '520018015', category: 'banking' },
  hapoalim: { businessName: 'בנק הפועלים בע"מ', companyNumber: '520007230', category: 'banking' },
  discount: { businessName: 'בנק דיסקונט לישראל בע"מ', companyNumber: '520020490', category: 'banking' },
  mizrahi: { businessName: 'בנק מזרחי-טפחות בע"מ', companyNumber: '520022588', category: 'banking' },
  isracard: { businessName: 'ישראכרט בע"מ', companyNumber: '511809125', category: 'finance' },
  cal: { businessName: 'כאל - חברה אמריקאית ישראלית לאשראי בע"מ', companyNumber: '520040440', category: 'finance' },
  max: { businessName: 'מקס איט פיננסים בע"מ', companyNumber: '512978090', category: 'finance' },
  yes: { businessName: 'ישראל ברודקאסטינג קורפוריישן בע"מ', companyNumber: '512145172', category: 'media' },
  clalit: { businessName: 'קופת חולים כללית', companyNumber: '580170782', category: 'health' },
  maccabi: { businessName: 'מכבי שירותי בריאות', companyNumber: '580103595', category: 'health' },
  meuchedet: { businessName: 'קופת חולים מאוחדת', companyNumber: '580145492', category: 'health' },
  ikea: { businessName: 'אייקאה ישראל בע"מ', category: 'retail' },
  zara: { businessName: 'ינדיטקס ישראל בע"מ', category: 'retail' },
  hm: { businessName: 'H&M ישראל', category: 'retail' },
  shufersal: { businessName: 'שופרסל בע"מ', companyNumber: '520028010', category: 'retail' },
  mega: { businessName: 'מגה בעמ (רשת)', category: 'retail' },
};
