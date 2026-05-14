import { Injectable } from '@nestjs/common';

export interface ModerationResult {
  allowed: boolean;
  sanitizedText: string;
  reason?: string;
  flags?: string[];
}

const MAX_INPUT_LENGTH = 1000;

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions?/i,
  /ignore\s+all\s+previous\s+commands?/i,
  /disregard\s+your\s+(system|previous|original)\s+(prompt|instructions|context)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+you\s+(are|were)\s+(a|an)\s+/i,
  /roleplay\s+(as|being)/i,
  /system\s+(prompt|message)/i,
  /developer\s+(message|mode|override)/i,
  /reveal\s+(your|the)\s+(system|secret|hidden)\s+(prompt|instructions|context)/i,
  /new\s+(system|ai|assistant)\s+prompt/i,
  /override\s+(your|the)\s+(safety|content|behavior)/i,
  /bypass\s+(your|the)\s+(filters?|restrictions?|safety)/i,
  /\[\s*SYSTEM\s*\]/i,
  /<\|system\|>/i,
  /<\|user\|>.*<\|system\|>/i,
  /\b{jailbreak}\b/i,
  /\b{DAN}\b/i,
  /\b{AI\s*角色}\b/i,
];

const BLOCKED_WORDS = [
  'hack',
  'exploit',
  'malware',
  'phishing',
  'spam',
  'warez',
  'crack',
  'keygen',
];

@Injectable()
export class ModerationService {
  moderateUserAction(input: string): ModerationResult {
    const flags: string[] = [];
    let sanitizedText = input.trim();

    sanitizedText = sanitizedText.replace(/\s+/g, ' ');
    sanitizedText = sanitizedText.replace(/[\x00-\x1F\x7F]/g, '');

    if (sanitizedText.length > MAX_INPUT_LENGTH) {
      return {
        allowed: false,
        sanitizedText: sanitizedText.substring(0, MAX_INPUT_LENGTH),
        reason: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
        flags: ['LENGTH_EXCEEDED'],
      };
    }

    if (sanitizedText.length === 0) {
      return {
        allowed: false,
        sanitizedText: '',
        reason: 'Input is empty',
        flags: ['EMPTY'],
      };
    }

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitizedText)) {
        flags.push('PROMPT_INJECTION');
        break;
      }
    }

    const lowerText = sanitizedText.toLowerCase();
    for (const word of BLOCKED_WORDS) {
      if (lowerText.includes(word)) {
        flags.push('BLOCKED_CONTENT');
        break;
      }
    }

    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = sanitizedText.match(urlPattern);
    if (urls && urls.length > 0) {
      flags.push('CONTAINS_URLS');
      sanitizedText = sanitizedText.replace(urlPattern, '[LINK_REMOVED]');
    }

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const emails = sanitizedText.match(emailPattern);
    if (emails && emails.length > 0) {
      flags.push('CONTAINS_EMAIL');
      sanitizedText = sanitizedText.replace(emailPattern, '[EMAIL_REMOVED]');
    }

    const phonePattern = /\b\d{10,14}\b/g;
    if (phonePattern.test(sanitizedText)) {
      flags.push('CONTAINS_PHONE');
      sanitizedText = sanitizedText.replace(phonePattern, '[PHONE_REMOVED]');
    }

    if (flags.length > 0) {
      return {
        allowed: false,
        sanitizedText,
        reason: 'Input contains potentially unsafe content',
        flags,
      };
    }

    return {
      allowed: true,
      sanitizedText,
    };
  }
}