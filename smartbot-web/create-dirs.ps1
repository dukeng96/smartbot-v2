Set-Location 'c:\Workspace\smartbot-v2\smartbot-web'
$dirs = @(
  'src/app/(public)/login',
  'src/app/(public)/register',
  'src/app/(public)/forgot-password',
  'src/app/(public)/reset-password',
  'src/app/(public)/verify-email',
  'src/app/(dashboard)',
  'src/app/(dashboard)/bots',
  'src/app/(dashboard)/bots/[botId]/config',
  'src/app/(dashboard)/bots/[botId]/personality',
  'src/app/(dashboard)/bots/[botId]/widget',
  'src/app/(dashboard)/bots/[botId]/api-embed',
  'src/app/(dashboard)/bots/[botId]/knowledge-bases',
  'src/app/(dashboard)/bots/[botId]/channels',
  'src/app/(dashboard)/knowledge-bases',
  'src/app/(dashboard)/knowledge-bases/[kbId]',
  'src/app/(dashboard)/knowledge-bases/[kbId]/documents',
  'src/app/(dashboard)/knowledge-bases/[kbId]/documents/[docId]',
  'src/app/(dashboard)/conversations',
  'src/app/(dashboard)/conversations/[convId]',
  'src/app/(dashboard)/analytics',
  'src/app/(dashboard)/analytics/bots/[botId]',
  'src/app/(dashboard)/billing',
  'src/app/(dashboard)/billing/subscription',
  'src/app/(dashboard)/billing/top-up',
  'src/app/(dashboard)/billing/payments',
  'src/app/(dashboard)/settings',
  'src/app/(dashboard)/settings/workspace',
  'src/app/(dashboard)/settings/team'
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
Write-Host 'All directories created'
