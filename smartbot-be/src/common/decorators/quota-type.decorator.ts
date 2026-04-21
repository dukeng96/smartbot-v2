import { SetMetadata } from '@nestjs/common';

export const QUOTA_TYPE_KEY = 'quotaType';
export const QuotaType = (type: string) => SetMetadata(QUOTA_TYPE_KEY, type);
