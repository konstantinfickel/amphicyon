const addressRegex = /(?:0x)?([A-Fa-f0-9]{40})/;

export const isAddress = (address: string) => addressRegex.test(address);

export const normalizeAddress = (address: string, silent: boolean = false) => {
  const match = addressRegex.exec(address);
  if (!match) {
    if (silent) {
      return '';
    }
    throw new Error(`"${address}" is not a valid address!`);
  }

  return match[1].toLowerCase();
}; 