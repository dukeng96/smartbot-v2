-- Phase 01: Agentcanvas foundation migration
-- Wipe pre-agentcanvas bots (cascade deletes conversations, messages, channels, bot_knowledge_bases)
-- Locked decision #7: all existing bots deleted as part of agentcanvas rollout.
DELETE FROM bots;

-- CreateTable: flows
CREATE TABLE "flows" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(32) NOT NULL DEFAULT 'agentflow',
    "flow_data" JSONB NOT NULL,
    "deployed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: flow_executions
CREATE TABLE "flow_executions" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "bot_id" UUID,
    "conversation_id" UUID,
    "session_id" VARCHAR(128),
    "state" VARCHAR(20) NOT NULL,
    "execution_data" JSONB NOT NULL,
    "error_message" TEXT,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "flow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: credentials
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "credential_type" VARCHAR(64) NOT NULL,
    "encrypted_data" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "auth_tag" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable: custom_tools
CREATE TABLE "custom_tools" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "implementation" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_tools_pkey" PRIMARY KEY ("id")
);

-- Add flow_id column to bots (NOT NULL — safe because DELETE FROM bots ran above)
ALTER TABLE "bots" ADD COLUMN "flow_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "flows_tenant_id_idx" ON "flows"("tenant_id");
CREATE INDEX "flows_tenant_id_type_idx" ON "flows"("tenant_id", "type");
CREATE INDEX "flow_executions_flow_id_state_idx" ON "flow_executions"("flow_id", "state");
CREATE INDEX "flow_executions_conversation_id_idx" ON "flow_executions"("conversation_id");
CREATE INDEX "credentials_tenant_id_credential_type_idx" ON "credentials"("tenant_id", "credential_type");
CREATE INDEX "custom_tools_tenant_id_idx" ON "custom_tools"("tenant_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "bots_flow_id_key" ON "bots"("flow_id");
CREATE UNIQUE INDEX "credentials_tenant_id_name_key" ON "credentials"("tenant_id", "name");
CREATE UNIQUE INDEX "custom_tools_tenant_id_name_key" ON "custom_tools"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "flows" ADD CONSTRAINT "flows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credentials" ADD CONSTRAINT "credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "custom_tools" ADD CONSTRAINT "custom_tools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_tools" ADD CONSTRAINT "custom_tools_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bots" ADD CONSTRAINT "bots_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
