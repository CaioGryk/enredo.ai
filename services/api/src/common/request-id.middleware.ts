import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

function resolveRequestId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate && SAFE_REQUEST_ID.test(candidate)) {
    return candidate;
  }

  return crypto.randomUUID();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = resolveRequestId(req.headers['x-request-id']);
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
