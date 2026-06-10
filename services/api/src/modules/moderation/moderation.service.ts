import { Injectable } from '@nestjs/common';

export interface ModerationResult {
  allowed: boolean;
  sanitizedText: string;
  reason?: string;
  flags?: string[];
}

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions?/i,
  /ignore\s+all\s+(previous\s+)?(instructions|commands)/i,
  /disregard\s+your\s+(system|previous|original)\s+(prompt|instructions|context)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /you\s+are\s+now\s*(a|an)?\s*(AI|assistant|language model)?/i,
  /pretend\s+you\s+(are|were)\s+(a|an)\s+/i,
  /pretend\s+you\s+(are|were)\s*(a|an)?\s*(AI|assistant)?/i,
  /roleplay\s+(as|being)/i,
  /system\s+(prompt|message)/i,
  /developer\s+(message|mode|override)/i,
  /reveal\s+(your|the)\s+(system|secret|hidden)\s+(prompt|instructions|context)/i,
  /new\s+(system|ai|assistant)\s+prompt/i,
  /override\s+(your|the)\s+(safety|content|behavior)/i,
  /bypass\s+(your|the\s+)?(filters?|restrictions?|safety)/i,
  /disable\s+(your|the\s+)?(safety|security|protection)/i,
  /\[\s*SYSTEM\s*\]/i,
  /<\|system\|>/i,
  /<\|user\|>.*<\|system\|>/i,
  /\b{jailbreak}\b/i,
  /\b{DAN}\b/i,
  /jailbreak/i,
  /DAN\b/i,
];

export { INJECTION_PATTERNS };

const BLOCKED_WORDS = ['hack', 'exploit', 'malware', 'phishing', 'spam', 'warez', 'crack', 'keygen'];

export const LIMITS = {
  READING_ACTION: 1000,
  COMMENT_MIN: 1,
  COMMENT_MAX: 500,
  REPORT_MIN: 3,
  REPORT_MAX: 500,
} as const;

@Injectable()
export class ModerationService {
  sanitize(input: string): { sanitizedText: string; flags: string[] } {
    const flags: string[] = [];
    let sanitized = input.trim().replace(/\s+/g, ' ');
    if (/[\x00-\x1F\x7F]/.test(sanitized)) {
      flags.push('CONTROL_CHARS_REMOVED');
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }
    return { sanitizedText: sanitized, flags };
  }

  private moderateText(text: string): { sanitizedText: string; flags: string[] } {
    const { sanitizedText, flags } = this.sanitize(text);
    let result = sanitizedText;
    const allFlags = [...flags];

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(result)) { allFlags.push('PROMPT_INJECTION'); break; }
    }

    const lower = result.toLowerCase();
    for (const word of BLOCKED_WORDS) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) { allFlags.push('BLOCKED_CONTENT'); break; }
    }

    if (/https?:\/\/[^\s]+/gi.test(result)) { allFlags.push('CONTAINS_URLS'); result = result.replace(/https?:\/\/[^\s]+/gi, '[LINK_REMOVED]'); }
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi.test(result)) { allFlags.push('CONTAINS_EMAIL'); result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[EMAIL_REMOVED]'); }
    if (/\b\d{10,14}\b/g.test(result)) { allFlags.push('CONTAINS_PHONE'); result = result.replace(/\b\d{10,14}\b/g, '[PHONE_REMOVED]'); }

    return { sanitizedText: result, flags: allFlags };
  }

  moderateUserAction(input: string): ModerationResult {
    const { sanitizedText: s, flags: f } = this.sanitize(input);
    const allFlags = [...f];
    if (!s) return { allowed: false, sanitizedText: '', reason: 'Input is empty', flags: [...allFlags, 'EMPTY'] };
    if (s.length > LIMITS.READING_ACTION) return { allowed: false, sanitizedText: s.substring(0, LIMITS.READING_ACTION), reason: `Input exceeds ${LIMITS.READING_ACTION} chars`, flags: [...allFlags, 'LENGTH_EXCEEDED'] };
    const { sanitizedText, flags } = this.moderateText(s);
    allFlags.push(...flags);
    if (allFlags.includes('PROMPT_INJECTION') || allFlags.includes('BLOCKED_CONTENT')) return { allowed: false, sanitizedText, reason: 'Input contains potentially unsafe content', flags: allFlags };
    return { allowed: true, sanitizedText, flags: allFlags.length > 0 ? allFlags : undefined };
  }

  moderateComment(input: string): ModerationResult {
    const { sanitizedText: s, flags: f } = this.sanitize(input);
    const allFlags = [...f];
    if (s.length < LIMITS.COMMENT_MIN) return { allowed: false, sanitizedText: '', reason: 'Comment is too short', flags: [...allFlags, 'EMPTY'] };
    if (s.length > LIMITS.COMMENT_MAX) return { allowed: false, sanitizedText: s.substring(0, LIMITS.COMMENT_MAX), reason: `Comment exceeds ${LIMITS.COMMENT_MAX} chars`, flags: [...allFlags, 'LENGTH_EXCEEDED'] };
    const { sanitizedText, flags } = this.moderateText(s);
    allFlags.push(...flags);
    if (allFlags.includes('PROMPT_INJECTION') || allFlags.includes('BLOCKED_CONTENT')) return { allowed: false, sanitizedText, reason: 'Comment contains unsafe content', flags: allFlags };
    if (!sanitizedText) return { allowed: false, sanitizedText: '', reason: 'Comment is empty after sanitization', flags: [...allFlags, 'EMPTY'] };
    return { allowed: true, sanitizedText, flags: allFlags.length > 0 ? allFlags : undefined };
  }

  moderateReportReason(input: string): ModerationResult {
    const { sanitizedText: s, flags: f } = this.sanitize(input);
    const allFlags = [...f];
    if (s.length < LIMITS.REPORT_MIN) return { allowed: false, sanitizedText: '', reason: 'Report reason is too short', flags: [...allFlags, 'EMPTY'] };
    if (s.length > LIMITS.REPORT_MAX) return { allowed: false, sanitizedText: s.substring(0, LIMITS.REPORT_MAX), reason: `Report reason exceeds ${LIMITS.REPORT_MAX} chars`, flags: [...allFlags, 'LENGTH_EXCEEDED'] };
    const { sanitizedText, flags } = this.moderateText(s);
    allFlags.push(...flags);
    if (allFlags.includes('PROMPT_INJECTION') || allFlags.includes('BLOCKED_CONTENT')) return { allowed: false, sanitizedText, reason: 'Report reason contains unsafe content', flags: allFlags };
    if (sanitizedText.length < LIMITS.REPORT_MIN) return { allowed: false, sanitizedText: '', reason: 'Report reason is too short after sanitization', flags: [...allFlags, 'EMPTY'] };
    return { allowed: true, sanitizedText, flags: allFlags.length > 0 ? allFlags : undefined };
  }
}
