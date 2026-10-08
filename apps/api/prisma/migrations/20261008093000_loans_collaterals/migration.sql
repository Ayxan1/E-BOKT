CREATE TABLE "loans" (
    "id" SERIAL NOT NULL,
    "operation_code" INTEGER NOT NULL,
    "contract_no" TEXT NOT NULL,
    "loan_no" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "representative_id" INTEGER,
    "annual_interest_rate" DECIMAL(9,4) NOT NULL,
    "penalty_rate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "grace_months" INTEGER NOT NULL DEFAULT 0,
    "product_id" INTEGER NOT NULL,
    "commission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disbursement_date" DATE NOT NULL,
    "term_months" INTEGER NOT NULL,
    "term_days" INTEGER NOT NULL DEFAULT 0,
    "schedule_type" TEXT NOT NULL DEFAULT 'ANNUITY',
    "standard_code" TEXT NOT NULL DEFAULT 'STANDARD',
    "monthly_payment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "maturity_date" DATE NOT NULL,
    "first_payment_date" DATE,
    "purpose" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loans_operation_code_key" ON "loans"("operation_code");
CREATE UNIQUE INDEX "loans_contract_no_key" ON "loans"("contract_no");
CREATE UNIQUE INDEX "loans_loan_no_key" ON "loans"("loan_no");

CREATE TABLE "loan_installments" (
    "id" SERIAL NOT NULL,
    "loan_id" INTEGER NOT NULL,
    "month_no" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "principal" DECIMAL(18,2) NOT NULL,
    "interest" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "loan_installments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loan_installments_loan_id_month_no_key" ON "loan_installments"("loan_id", "month_no");

CREATE TABLE "collaterals" (
    "id" SERIAL NOT NULL,
    "unique_no" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "appraiser" TEXT NOT NULL DEFAULT '',
    "appraisal_date" DATE,
    "market_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "liquidation_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaterals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collaterals_unique_no_key" ON "collaterals"("unique_no");

CREATE TABLE "collateral_items" (
    "id" SERIAL NOT NULL,
    "collateral_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit_code" TEXT NOT NULL DEFAULT 'GRAM',
    "fineness" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stone_weight" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "net_weight" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "gross_weight" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "liquidation_value" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "collateral_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loan_collaterals" (
    "id" SERIAL NOT NULL,
    "loan_id" INTEGER NOT NULL,
    "collateral_id" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "loan_collaterals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loan_collaterals_loan_id_collateral_id_key" ON "loan_collaterals"("loan_id", "collateral_id");

CREATE TABLE "business_calendar" (
    "id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,

    CONSTRAINT "business_calendar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eod_journal" (
    "id" SERIAL NOT NULL,
    "business_date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "closed_by" INTEGER NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eod_journal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "loans" ADD CONSTRAINT "loans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_representative_id_fkey" FOREIGN KEY ("representative_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "credit_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collateral_items" ADD CONSTRAINT "collateral_items_collateral_id_fkey" FOREIGN KEY ("collateral_id") REFERENCES "collaterals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_collaterals" ADD CONSTRAINT "loan_collaterals_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_collaterals" ADD CONSTRAINT "loan_collaterals_collateral_id_fkey" FOREIGN KEY ("collateral_id") REFERENCES "collaterals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
