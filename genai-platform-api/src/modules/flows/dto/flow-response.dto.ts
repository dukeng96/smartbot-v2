import { FlowData } from '../types/flow-data.types';

export class FlowResponseDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: string;
  flowData: FlowData;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FlowSummaryDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}
