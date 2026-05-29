import z from "zod";

export type ParsedRow = {
  time: string;
  mcc: string;
  mnc: string;
  tac: string;
  cid: string;
};

const InputRowZ = z.object({
  imei: z.string().optional(),
  time: z.string().regex(/^\d{14}$/, "time must be YYMMDDhhmmsscc"),
  // 9 bytes = PLMN (3-byte BCD) + TAC (2-byte BE) + ECI (4-byte BE).
  cell: z.string().regex(/^[0-9A-Fa-f]{18}$/, "cell must be 18 hex chars"),
});

export async function parseJsonlFile(file: File[]): Promise<ParsedRow[]> {
  if (!file || file.length === 0) return [];

  const text = await file[0].text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const out: ParsedRow[] = [];
  for (const line of lines) {
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      continue;
    }

    const ok = InputRowZ.safeParse(raw);
    if (!ok.success) continue;

    const { time, cell } = ok.data;
    try {
      const { mcc, mnc, tac, cid } = parseEutranHex(cell);
      out.push({ time, mcc, mnc, tac, cid });
    } catch {
      continue;
    }
  }

  return out;
}

/**
 * cell(18 hex = 9 bytes) -> { mcc, mnc, tac, cid }
 *
 * Layout: [PLMN (3-byte BCD)] [TAC (2-byte big-endian)] [ECI (4-byte big-endian)]
 *
 * BCD layout:
 *  oct1: MCC digit 2 (low nibble) | MCC digit 1 (high nibble)
 *  oct2: MCC digit 3 (low nibble) | MNC digit 3 (high nibble, or 0xF for 2-digit MNC)
 *  oct3: MNC digit 2 (high nibble) | MNC digit 1 (low nibble)
 *
 * PLMN(MCC=440, MNC=10) => 44 F0 01
 * TAC=0x1234 => 12 34
 * ECI=0x1234567 => 12 34 56 7F
 * payload = 44 F0 01 12 34 12 34 56 7F
 *
 * MCC = 440
 * MNC = 10
 * TAC = 0x1234 (4660)
 * ECI = 0x1234567 (19088743)
 */
function parseEutranHex(hex: string): {
  mcc: string;
  mnc: string;
  tac: string;
  cid: string;
} {
  const clean = hex.trim().toUpperCase();
  if (!/^[0-9A-F]+$/.test(clean)) throw new Error("invalid hex string");

  if (clean.length !== 18) throw new Error("expected 18 hex chars (9 bytes)");

  const bytes = [];

  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }

  // PLMN decode (MCC + MNC).
  const oct1 = bytes[0];
  const oct2 = bytes[1];
  const oct3 = bytes[2];

  const mccDigit1 = (oct1 & 0xf0) >> 4;
  const mccDigit2 = oct1 & 0x0f;
  const mccDigit3 = oct2 & 0x0f;

  const mncDigit1 = oct3 & 0x0f;
  const mncDigit2 = (oct3 & 0xf0) >> 4;
  const mncDigit3 = (oct2 & 0xf0) >> 4;

  const mcc = `${mccDigit1}${mccDigit2}${mccDigit3}`;
  const mnc =
    mncDigit3 === 0xf
      ? `${mncDigit1}${mncDigit2}` // 2-digit MNC
      : `${mncDigit1}${mncDigit2}${mncDigit3}`; // 3-digit MNC

  const tac = ((bytes[3] << 8) | bytes[4]).toString(16).toUpperCase();

  // ECI is encoded in the high 28 bits of the final 4 bytes.
  const eciRaw =
    (bytes[5] << 24) | (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];
  const cid = (eciRaw >>> 4).toString(16).toUpperCase();

  return { mcc, mnc, tac, cid };
}
