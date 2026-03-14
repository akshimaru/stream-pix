export function formatCurrency(value: number, locale = "pt-BR", currency = "BRL") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRelativeDate(input: string | Date, locale = "pt-BR") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof input === "string" ? new Date(input) : input);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function normalizeSpeechChunk(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatSpeechCurrency(value: number) {
  return formatCurrency(value).replace(/\s+/g, "");
}

export function buildAlertSpeechText(input: {
  supporterName: string;
  amount: number;
  message: string;
  isAnonymous?: boolean;
}) {
  const supporterName = normalizeSpeechChunk(input.isAnonymous ? "Apoiador anonimo" : input.supporterName) || "Apoiador";
  const message = normalizeSpeechChunk(input.message);
  const amount = formatSpeechCurrency(input.amount);

  return message
    ? `${supporterName} mandou ${amount} no StreamPix: ${message}`
    : `${supporterName} mandou ${amount} no StreamPix.`;
}
