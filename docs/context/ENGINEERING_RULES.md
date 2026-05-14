# Engineering Rules — Enredo.ai

**Purpose:** Code patterns, engineering principles, and development standards.

---

## Code Organization

### Module Structure
Each module should follow this structure:
```
module-name/
├── module-name.module.ts
├── module-name.service.ts
├── module-name.controller.ts
├── dto/
│   ├── create-xxx.dto.ts
│   ├── update-xxx.dto.ts
│   └── response-xxx.dto.ts
├── entities/ (if not using Prisma)
├── __tests__/
│   ├── module-name.service.spec.ts
│   └── module-name.controller.spec.ts
└── index.ts (barrel export)
```

### Naming Conventions
- **Files:** kebab-case (e.g., `reading-orchestrator.service.ts`)
- **Classes:** PascalCase (e.g., `ReadingOrchestratorService`)
- **Methods:** camelCase (e.g., `generateNextScene()`)
- **Constants:** UPPER_SNAKE_CASE for true constants
- **Enums:** PascalCase for name, UPPER_SNAKE_CASE for values
- **Interfaces:** PascalCase with descriptive names
- **DTOs:** Suffix with `Dto` (e.g., `CreateStoryDto`)

---

## SOLID Principles

### Single Responsibility
- ViewModels manage UI state only
- Use Cases manage single business operations
- Services have one clear purpose
- Example: `ReadingService` is a thin facade; `ReadingOrchestratorService` handles business logic

### Open/Closed
- Extensibility through interfaces, not modification
- New features added via new modules, not changing existing code
- Example: New model providers added via catalog, not changing AI service

### Interface Segregation
- Repository interfaces are client-specific, not general-purpose
- DTOs are specific to their use case
- Example: `AdminStoryGenerationUsageDto` only exposes safe audit fields

### Dependency Inversion
- High-level modules depend on abstractions (interfaces), not concretions
- Use dependency injection consistently
- Example: `NarrativeEngine` receives `AiService` via constructor, doesn't instantiate providers directly

### Liskov Substitution
- Derived classes must be substitutable for base classes
- Mock implementations should be drop-in replacements for real ones

---

## Testing Standards

### Test Organization
```
__tests__/
├── unit/
│   └── service-name.spec.ts
├── integration/
│   └── flow-name.spec.ts
└── security/
    └── access-control.spec.ts
```

### Test Naming
```typescript
// Good
describe('ReadingOrchestratorService', () => {
  describe('startReading', () => {
    it('should create session for free user with free model', async () => {
      // test
    });
    
    it('should throw PREMIUM_REQUIRED for premium story on free plan', async () => {
      // test
    });
  });
});

// Bad
it('works', () => {});
it('test1', () => {});
```

### Test Coverage Requirements
- Business logic: Required
- API contracts: Required
- Access control: Required
- Error handling: Required
- Pure utilities: Required
- Simple getters/setters: Optional

### Mocking Guidelines
- Mock external dependencies (DB, API calls)
- Use Jest spies for method verification
- Create mock factories for complex objects
- Document mock behavior in test

---

## TypeScript Standards

### Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Definitions
```typescript
// Good - explicit return type
async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// Good - interface for objects
interface CreateStoryInput {
  title: string;
  synopsis: string;
  genres: string[];
}

// Bad - implicit any
function process(data) {
  return data.map(x => x.id);
}
```

### Null Safety
```typescript
// Good - null check
const story = await getStory(id);
if (!story) {
  throw new NotFoundException('Story not found');
}

// Good - optional chaining
const creatorName = story.creator?.name ?? 'Anonymous';

// Bad - non-null assertion without check
const title = story!.title; // Dangerous
```

---

## API Design

### RESTful Endpoints
```typescript
// Good
@Controller('reading')
export class ReadingController {
  @Post('start')
  startReading(@Body() dto: StartReadingDto) {}
  
  @Post('sessions/:id/action')
  sendAction(
    @Param('id') sessionId: string,
    @Body() dto: SendActionDto
  ) {}
}

// Bad - inconsistent naming
@Post('beginSession') // should be start
@Post('doAction') // should be action
```

### Response Consistency
```typescript
// Good - standardized response
interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Good - error response
interface ApiError {
  message: string;
  error: string; // error code
  statusCode: number;
}
```

### DTO Validation
```typescript
export class CreateStoryDto {
  @ApiProperty({ example: 'The Lost City' })
  @IsString()
  @MinLength(5)
  title: string;
  
  @ApiProperty({ example: 'A mystery adventure...' })
  @IsString()
  @MinLength(20)
  synopsis: string;
  
  @ApiProperty({ example: ['mystery', 'adventure'] })
  @IsArray()
  @ArrayMinSize(1)
  genres: string[];
}
```

---

## Error Handling

### Structured Errors
```typescript
// Good - typed error codes
export enum ReadingErrorCode {
  READING_SESSION_NOT_FOUND = 'READING_SESSION_NOT_FOUND',
  PREMIUM_REQUIRED = 'PREMIUM_REQUIRED',
  DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
}

// Good - helper function
export function throwReadingError(
  message: string,
  code: ReadingErrorCode,
  status: HttpStatus
): never {
  throw new HttpException({ message, error: code }, status);
}
```

### Error Classification
| Error Type | HTTP Status | Retryable |
|------------|-------------|-----------|
| Invalid input | 400 | No |
| Authentication | 401 | No |
| Authorization | 403 | No |
| Not found | 404 | No |
| Payment/credits | 402 | No |
| Provider transient | 503 | Yes |
| Internal | 500 | No |

---

## Security Standards

### Input Validation
- Validate all user input at API boundary
- Sanitize before logging
- Check for prompt injection patterns
- Use class-validator for DTOs

### Output Sanitization
- Never expose internal IDs or secrets
- Never expose raw LLM responses or prompts
- Never expose stack traces in production
- Use explicit DTO mapping (never return Prisma entities directly)

### Access Control
- Validate ownership before resource access
- Use RBAC for admin endpoints
- Check plan entitlements before feature access
- Fail closed (deny if uncertain)

---

## Performance Guidelines

### Database
- Use transactions for multi-write operations
- Use `select` to limit returned fields
- Use pagination for list endpoints
- Add indexes for frequently queried fields

### LLM Calls
- Limit context window (trim previous scenes)
- Use retry logic for transient failures
- Don't retry auth errors or validation failures
- Track usage for monitoring

### Caching
- Cache generated premises/characters
- Cache user sessions in memory (short-lived)
- Consider Redis for future distributed caching

---

## Documentation

### Inline Comments
```typescript
// Good - explains WHY, not WHAT
// Retry transient failures (429, 500, 502, 503, 504)
// Don't retry auth errors (401, 403)
const result = await fetchWithRetry(url, options);

// Bad - states the obvious
// Increment counter
counter++;
```

### Swagger Documentation
```typescript
@ApiTags('reading')
@Controller('reading')
export class ReadingController {
  @ApiOperation({ summary: 'Start a new reading session' })
  @ApiBody({ type: StartReadingDto })
  @ApiResponse({ status: 201, type: ReadingResponseDto })
  @ApiResponse({ status: 402, description: 'Premium required' })
  @Post('start')
  async startReading(@Body() dto: StartReadingDto) {}
}
```

---

**Last Updated:** After Step 42 completion
