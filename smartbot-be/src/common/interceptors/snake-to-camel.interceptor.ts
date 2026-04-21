import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Converts snake_case request body keys to camelCase before validation.
 * Interceptors run BEFORE pipes, so the global ValidationPipe sees
 * camelCase keys and won't reject them as non-whitelisted.
 *
 * Used for internal API endpoints receiving callbacks from Python
 * services (FastAPI) which use snake_case by convention.
 */
@Injectable()
export class SnakeToCamelInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (
      request.body &&
      typeof request.body === 'object' &&
      !Array.isArray(request.body)
    ) {
      const converted: Record<string, any> = {};
      for (const [key, val] of Object.entries(request.body)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c: string) =>
          c.toUpperCase(),
        );
        converted[camelKey] = val;
      }
      request.body = converted;
    }
    return next.handle();
  }
}
