// Validation utilities for authentication

// List of valid majors
const VALID_MAJORS = [
  'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี',
  'คณะการสื่อสารมวลชน',
  'คณะเกษตรศาสตร์',
  'คณะทันตแพทยศาสตร์',
  'คณะเทคนิคการแพทย์',
  'คณะนิติศาสตร์',
  'คณะบริหารธุรกิจ',
  'คณะพยาบาลศาสตร์',
  'คณะแพทยศาสตร์',
  'คณะเภสัชศาสตร์',
  'คณะมนุษยศาสตร์',
  'คณะรัฐศาสตร์และรัฐประศาสนศาสตร์',
  'คณะวิจิตรศิลป์',
  'คณะวิทยาศาสตร์',
  'คณะวิศวกรรมศาสตร์',
  'คณะศึกษาศาสตร์',
  'คณะเศรษฐศาสตร์',
  'คณะสถาปัตยกรรมศาสตร์',
  'คณะสังคมศาสตร์',
  'คณะสัตวแพทยศาสตร์',
  'คณะสาธารณสุขศาสตร์',
  'คณะอุตสาหกรรมเกษตร',
  'วิทยาลัยนานาชาตินวัตกรรมดิจิทัล',
  'วิทยาลัยพหุวิทยาการและสหวิทยาการ',
  'สถาบันนโยบายสาธารณะ',
  'สถาบันวิศวกรรมชีวการแพทย์',
];

/**
 * Validate that text contains only Thai characters and spaces
 * @param text - Text to validate
 * @returns true if text contains only Thai characters and spaces
 */
export const validateThaiOnly = (text: string): boolean => {
  // Thai character range: ก-๏ (U+0E01 to U+0E5B) plus spaces
  const thaiOnlyRegex = /^[ก-๏\s]+$/;
  return thaiOnlyRegex.test(text.trim());
};

/**
 * Validate that text contains only Thai characters (no spaces)
 * @param text - Text to validate
 * @returns true if text contains only Thai characters without spaces
 */
export const validateThaiOnlyNoSpaces = (text: string): boolean => {
  // Thai character range: ก-๏ (U+0E01 to U+0E5B) without spaces
  const thaiOnlyNoSpacesRegex = /^[ก-๏]+$/;
  return thaiOnlyNoSpacesRegex.test(text.trim());
};

/**
 * Validate phone number format: 0XX-XXX-XXXX
 * @param phone - Phone number to validate
 * @returns true if phone matches format 0XX-XXX-XXXX
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Format: 0XX-XXX-XXXX where X is a digit
  const phoneRegex = /^0\d{2}-\d{3}-\d{4}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate that major is from the allowed list
 * @param major - Major to validate
 * @returns true if major is in the valid list
 */
export const validateMajor = (major: string): boolean => {
  return VALID_MAJORS.includes(major);
};

/**
 * Get list of valid majors
 * @returns Array of valid major names
 */
export const getValidMajors = (): string[] => {
  return [...VALID_MAJORS];
};

