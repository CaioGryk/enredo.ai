import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public code?: string,
  ) {
    super(
      {
        statusCode: status,
        message,
        error: code || HttpStatus[status],
      },
      status,
    );
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string, identifier?: string) {
    super(
      `${resource}${identifier ? ` with ID "${identifier}"` : ''} not found`,
      HttpStatus.NOT_FOUND,
      'NOT_FOUND',
    );
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class PaymentRequiredException extends AppException {
  constructor(message = 'Upgrade required for this feature') {
    super(message, HttpStatus.PAYMENT_REQUIRED, 'UPGRADE_REQUIRED');
  }
}