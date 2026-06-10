import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

const MAX_LOG_MESSAGE_LENGTH = 180;
const SENSITIVE_MESSAGE_PATTERN = /(postgres:\/\/|Bearer\s+|sk-[A-Za-z0-9_-]+|password|refresh[_-]?token|authorization|cookie)/i;

function sanitizeLogMessage(message: string | undefined): string {
  if (!message || SENSITIVE_MESSAGE_PATTERN.test(message)) {
    return 'Internal error';
  }

  return message.replace(/\s+/g, ' ').slice(0, MAX_LOG_MESSAGE_LENGTH);
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();
    const requestId = (req as any).requestId || 'no-id';
    const path = req.url?.split('?')[0] || 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const code = typeof response === 'object' && response ? (response as any).error : exception.name;

      this.logger.warn(`${requestId} ${status} ${code} ${path}`);

      res.status(status).json(
        typeof response === 'object' && response
          ? response
          : { message: response, error: code, statusCode: status },
      );
      return;
    }

    const err = exception as Error;
    this.logger.error(`${requestId} 500 ${err.name || 'Error'} ${path}: ${sanitizeLogMessage(err.message)}`);

    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
    });
  }
}
