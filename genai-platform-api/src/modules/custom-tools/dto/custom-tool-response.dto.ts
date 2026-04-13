export class CustomToolResponseDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  schema: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // implementation intentionally omitted — only exposed on explicit get-detail
}

export class CustomToolDetailDto extends CustomToolResponseDto {
  implementation: string;
}
