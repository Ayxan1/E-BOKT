import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePreciousItem } from "./collateral";
import { validateCustomer } from "./customer";
import { assertBalanced } from "./ledger";
import { crudCodes, isPermissionCode } from "./permissions";
import { validateProduct } from "./product";
import { annuitySchedule } from "./schedule";

const person = {
  customer_type: 1,
  first_name: "Nicat",
  last_name: "Manafov",
  father_name: "Elçin",
  full_name: "Manafov Nicat Elçin",
  unique_no: "9tl53kf",
  residency_status: "RESIDENT",
  registration_address: "Bakı",
  actual_address: "Bakı",
  document: { series: "AA", number: "1234567" },
  phones: [{ phone_number: "+994501112233", phone_type: "MOBILE", is_primary: true }],
};

describe("customer", () => {
  it("accepts a physical person and normalizes FIN", () => {
    const result = validateCustomer(person);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.unique_no, "9TL53KF");
  });

  it("requires name parts only for physical person and entrepreneur", () => {
    const result = validateCustomer({
      ...person,
      customer_type: 2,
      full_name: "MMC",
      unique_no: "1234567890",
      activity_code: "41.20",
      sector: "CONSTRUCTION",
      document: { series: "AA", number: "1" },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.first_name, "");
      assert.equal(result.value.document, null);
    }
  });

  it("requires founder shares to sum to 100", () => {
    const result = validateCustomer({
      customer_type: 2,
      full_name: "MMC",
      unique_no: "1234567890",
      activity_code: "41.20",
      sector: "TRADE",
      residency_status: "RESIDENT",
      registration_address: "Bakı",
      actual_address: "Bakı",
      executors_founders: [
        { type: "FOUNDER", full_name: "A", share: 40, fin_voen: "1234567891" },
        { type: "FOUNDER", full_name: "B", share: 40, fin_voen: "1234567892" },
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.at(-1)?.message ?? "", /100/);
  });

  it("allows only one main workplace", () => {
    const result = validateCustomer({
      ...person,
      workplaces: [
        { workplace_type: "MAIN", workplace_name: "A", monthly_income: 100 },
        { workplace_type: "MAIN", workplace_name: "B", monthly_income: 50 },
      ],
    });
    assert.equal(result.ok, false);
  });
});

describe("product", () => {
  it("accepts the specification object and a row list", () => {
    const result = validateProduct({
      product_name: "Əşya girovu",
      credit_type: "LOAN",
      control_enabled: true,
      max_term: 365,
      credit_conditions: {
        amount_min: 100,
        amount_max: 5000,
        term_min_days: 30,
        term_max_days: 365,
        annual_interest_rate_min: 12,
        annual_interest_rate_max: 36,
      },
      dti_conditions: { dti_rate: 50, salary_min: 300, salary_max: 5000 },
      ltv_conditions: [
        {
          collateral_type: "PRECIOUS",
          ltv_rate: 70,
          credit_currency: "AZN",
          collateral_currency: "AZN",
        },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.credit_conditions.length, 1);
      assert.equal(result.value.credit_conditions[0].amount_min, "100.00");
      assert.equal(result.value.dti_conditions[0].dti_rate, "50.0000");
    }
  });

  it("rejects a term above the product maximum", () => {
    const result = validateProduct({
      product_name: "Test",
      credit_type: "LINE",
      control_enabled: true,
      max_term: 180,
      credit_conditions: {
        amount_min: 0,
        amount_max: 10,
        term_min_days: 1,
        term_max_days: 365,
        annual_interest_rate_min: 1,
        annual_interest_rate_max: 2,
      },
    });
    assert.equal(result.ok, false);
  });
});

describe("ledger and permissions", () => {
  it("requires debit to equal credit per currency", () => {
    const errors = assertBalanced([
      { account_code: "1000", direction: "DEBIT", amount: "100.00", currency: "AZN" },
      { account_code: "1100", direction: "CREDIT", amount: "90.00", currency: "AZN" },
    ]);
    assert.equal(errors.length, 1);
  });

  it("builds crud permission codes", () => {
    assert.deepEqual(crudCodes("customer"), [
      "customer.create",
      "customer.read",
      "customer.update",
      "customer.delete",
    ]);
    assert.equal(isPermissionCode("customer.field.income.read"), true);
    assert.equal(isPermissionCode("customer"), false);
  });
});

describe("annuity schedule", () => {
  it("keeps principal exact and rounds interest to qəpik", () => {
    const schedule = annuitySchedule({
      amount: "1000.00",
      annual_rate: "25",
      term_months: 12,
      disbursement_date: "2021-06-25",
    });
    assert.equal(schedule.monthly_payment, "95.04");
    assert.equal(schedule.installments[0].due_date, "2021-07-25");
    assert.equal(schedule.installments[0].interest, "20.83");
    assert.equal(schedule.installments[0].principal, "74.21");
    assert.equal(schedule.installments[0].total, "95.04");
    assert.equal(schedule.installments[0].balance, "925.79");
    assert.equal(schedule.installments[11].balance, "0.00");
    const principal = schedule.installments.reduce((sum, row) => sum + Number(row.principal), 0);
    assert.equal(principal.toFixed(2), "1000.00");
    assert.equal(schedule.maturity_date, "2022-06-25");
  });
});

describe("precious item", () => {
  it("derives net weight and liquidation value from gross weight", () => {
    const result = normalizePreciousItem({
      name: "Üzük",
      gross_weight: "10",
      stone_weight: "2",
      unit_price: "50",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.net_weight, "8.000");
      assert.equal(result.value.liquidation_value, "400.00");
      assert.equal(result.value.unit_code, "GRAM");
    }
  });
});
