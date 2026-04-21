export enum CredentialType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  VNPT = 'vnpt',
  QDRANT = 'qdrant',
  TAVILY = 'tavily',
  HTTP_BEARER = 'http_bearer',
  HTTP_BASIC = 'http_basic',
}

export const CREDENTIAL_TYPE_VALUES = Object.values(CredentialType);

// Required fields per credential type (used for validation at create time)
export const CREDENTIAL_SCHEMA: Record<CredentialType, string[]> = {
  [CredentialType.OPENAI]: ['apiKey'],
  [CredentialType.ANTHROPIC]: ['apiKey'],
  [CredentialType.VNPT]: ['apiKey', 'baseUrl'],
  [CredentialType.QDRANT]: ['url'],
  [CredentialType.TAVILY]: ['apiKey'],
  [CredentialType.HTTP_BEARER]: ['token'],
  [CredentialType.HTTP_BASIC]: ['username', 'password'],
};

export const CREDENTIAL_CAP_PER_TENANT = 50;
