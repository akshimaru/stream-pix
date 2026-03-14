import sanitizeHtml from "sanitize-html";
import { defaultBlockedWords } from "@streampix/shared";

const strictBlockedWords = ["racista", "nazista", "ameaça"];

function cleanText(message: string) {
  return sanitizeHtml(message, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
}

export function containsLink(message: string) {
  return /(https?:\/\/|www\.|discord\.gg|t\.me)/i.test(message);
}

export function moderateMessage(input: {
  message: string;
  allowLinks: boolean;
  blockedWords: string[];
  maxLength: number;
}) {
  const sanitizedMessage = cleanText(input.message).slice(0, input.maxLength);
  const normalized = sanitizedMessage.toLowerCase();
  const wordList = [...defaultBlockedWords, ...strictBlockedWords, ...input.blockedWords].map((word) =>
    word.toLowerCase(),
  );
  const matchedBlockedWords = wordList.filter((word) => normalized.includes(word));
  const hasLink = !input.allowLinks && containsLink(normalized);

  return {
    sanitizedMessage,
    blocked: matchedBlockedWords.length > 0 || hasLink,
    reasons: [
      ...(hasLink ? ["LINK_NOT_ALLOWED"] : []),
      ...matchedBlockedWords.map((word) => `BLOCKED_WORD:${word}`),
    ],
  };
}
