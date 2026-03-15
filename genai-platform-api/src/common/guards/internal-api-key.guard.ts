import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-key'];
    const expectedKey = this.configService.get<string>('aiEngine.internalApiKey');

    if (!apiKey || !expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    const a = Buffer.from(String(apiKey));
    const b = Buffer.from(String(expectedKey));
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
