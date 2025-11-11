/**
 * Generate a 6-digit numeric passcode
 */
export const generatePasscode = (): string => {
  // Generate random 6-digit number (100000 to 999999)
  const min = 100000;
  const max = 999999;
  const passcode = Math.floor(Math.random() * (max - min + 1)) + min;
  return passcode.toString();
};

/**
 * Validate passcode format (6 digits)
 */
export const isValidPasscodeFormat = (passcode: string): boolean => {
  return /^\d{6}$/.test(passcode);
};

