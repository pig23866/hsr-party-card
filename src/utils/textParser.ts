export const parseColoredText = (rawText: string) => {
  const match = rawText.match(/^<#([0-9A-Fa-f]{6})>(.*)$/s);
  if (match) {
    return { color: `#${match[1]}`, text: match[2] };
  }
  return { color: null, text: rawText };
};
