import { randomBytes } from "node:crypto";

// No 0/O/1/I to keep IDs easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export { COMPLAINT_ID_PATTERN, TICKET_ID_PATTERN } from "./id-patterns";

export function generateComplaintId(): string {
  return `CF-${randomCode(6)}`;
}
export function generateTicketId(): string {
  return `TK-${randomCode(6)}`;
}
