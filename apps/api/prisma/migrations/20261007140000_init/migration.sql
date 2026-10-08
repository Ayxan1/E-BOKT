-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" SERIAL NOT NULL,
    "branch_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "director" TEXT NOT NULL DEFAULT '',
    "head_office" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "user_full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "branch_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "max_failed_attempts" INTEGER NOT NULL DEFAULT 5,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "customer_no" TEXT NOT NULL,
    "customer_type" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "father_name" TEXT NOT NULL DEFAULT '',
    "full_name" TEXT NOT NULL,
    "unique_no" TEXT NOT NULL,
    "executor_fin" TEXT NOT NULL DEFAULT '',
    "activity_type" TEXT NOT NULL DEFAULT '',
    "activity_code" TEXT NOT NULL DEFAULT '',
    "sector" TEXT NOT NULL DEFAULT '',
    "residency_status" TEXT NOT NULL,
    "registration_address" TEXT NOT NULL,
    "actual_address" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "series" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issue_date" DATE,
    "issue_place" TEXT NOT NULL DEFAULT '',
    "expiry_date" DATE,
    "citizenship" TEXT NOT NULL DEFAULT '',
    "birth_date" DATE,
    "marital_status" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workplaces" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "workplace_type" TEXT NOT NULL,
    "workplace_name" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "monthly_income" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "work_experience" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "workplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "phone_number" TEXT NOT NULL,
    "phone_type" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "related_parties" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "share" DECIMAL(6,2),
    "fin_voen" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "related_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_files" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_products" (
    "id" SERIAL NOT NULL,
    "product_code" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "credit_type" TEXT NOT NULL,
    "control_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_term" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_conditions" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "amount_min" DECIMAL(18,2) NOT NULL,
    "amount_max" DECIMAL(18,2) NOT NULL,
    "term_min_days" INTEGER NOT NULL,
    "term_max_days" INTEGER NOT NULL,
    "annual_interest_rate_min" DECIMAL(9,4) NOT NULL,
    "annual_interest_rate_max" DECIMAL(9,4) NOT NULL,

    CONSTRAINT "credit_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dti_conditions" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "dti_rate" DECIMAL(9,4) NOT NULL,
    "salary_min" DECIMAL(18,2) NOT NULL,
    "salary_max" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "dti_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ltv_conditions" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "collateral_type" TEXT NOT NULL,
    "ltv_rate" DECIMAL(9,4) NOT NULL,
    "credit_currency" TEXT NOT NULL,
    "collateral_currency" TEXT NOT NULL,

    CONSTRAINT "ltv_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_items" (
    "id" SERIAL NOT NULL,
    "group" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dictionary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "section" TEXT NOT NULL DEFAULT 'extra',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_values" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "field_code" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "branch_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "branch_id" INTEGER,
    "module" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "idempotency_key" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postings" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "account_id" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" INTEGER,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_no_key" ON "customers"("customer_no");

-- CreateIndex
CREATE UNIQUE INDEX "customers_unique_no_key" ON "customers"("unique_no");

-- CreateIndex
CREATE UNIQUE INDEX "customer_documents_customer_id_key" ON "customer_documents"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_products_product_code_key" ON "credit_products"("product_code");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_items_group_code_key" ON "dictionary_items"("group", "code");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_entity_code_key" ON "field_definitions"("entity", "code");

-- CreateIndex
CREATE UNIQUE INDEX "field_values_entity_entity_id_field_code_key" ON "field_values"("entity", "entity_id", "field_code");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_reference_key" ON "ledger_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phones" ADD CONSTRAINT "phones_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_parties" ADD CONSTRAINT "related_parties_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_files" ADD CONSTRAINT "customer_files_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_conditions" ADD CONSTRAINT "credit_conditions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "credit_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dti_conditions" ADD CONSTRAINT "dti_conditions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "credit_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ltv_conditions" ADD CONSTRAINT "ltv_conditions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "credit_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

