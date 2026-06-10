import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const requestId = (req as any).requestId || 'no-id';
    const method = req.method;
    const path = req.route?.path || req.url?.split('?')[0] || 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(`${requestId} ${method} ${path} ${res.statusCode} ${duration}ms`);
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = err?.status || err?.statusCode || 500;
          const code = err?.response?.error || err?.name || 'Error';
          this.logger.warn(`${requestId} ${method} ${path} ${status} ${code} ${duration}ms`);
        },
      }),
    );
  }
}
