import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.tenantId) {
      throw new ForbiddenException('No tenant context');
    }

    const membership = await this.prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: user.tenantId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('Not a member of this tenant');
    }

    request.tenantId = user.tenantId;
    request.tenantRole = membership.role;
    return true;
  }
}
