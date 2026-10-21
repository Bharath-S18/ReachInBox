/**
 * Utility to parse, validate, and sanitize email lead lists from CSV text or raw inputs
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface ParseLeadsResult {
  validEmails: string[];
  totalParsed: number;
  invalidCount: number;
}

export function parseAndValidateLeadEmails(input: string | string[]): ParseLeadsResult {
  const candidateEmails: string[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        // May contain comma-separated emails
        const split = item.split(/[,\n\r\t]+/);
        for (const s of split) {
          const trimmed = s.trim();
          if (trimmed) candidateEmails.push(trimmed);
        }
      }
    }
  } else if (typeof input === 'string') {
    // Handle CSV or newline-delimited text
    const lines = input.split(/[\r\n]+/);
    let emailColumnIndex = -1;
    let headerProcessed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(/[,;\t]+/).map((c) => c.replace(/^["']|["']$/g, '').trim());

      // Check header line for email column on first non-empty line
      if (!headerProcessed) {
        headerProcessed = true;
        if (cells.some((c) => /email|mail|recipient/i.test(c))) {
          emailColumnIndex = cells.findIndex((c) => /email|mail|recipient/i.test(c));
          continue;
        }
      }

      if (emailColumnIndex >= 0 && cells[emailColumnIndex]) {
        candidateEmails.push(cells[emailColumnIndex]);
      } else {
        // Fallback: search all cells for email regex matches
        let found = false;
        for (const cell of cells) {
          if (EMAIL_REGEX.test(cell)) {
            candidateEmails.push(cell);
            found = true;
            break;
          }
        }
        if (!found && cells.length > 0 && cells[0]) {
          candidateEmails.push(cells[0]);
        }
      }
    }
  }

  const seen = new Set<string>();
  const validEmails: string[] = [];
  let invalidCount = 0;

  for (const raw of candidateEmails) {
    const cleaned = raw.toLowerCase().trim();
    if (EMAIL_REGEX.test(cleaned)) {
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        validEmails.push(cleaned);
      }
    } else {
      invalidCount++;
    }
  }

  return {
    validEmails,
    totalParsed: validEmails.length + invalidCount,
    invalidCount,
  };
}
