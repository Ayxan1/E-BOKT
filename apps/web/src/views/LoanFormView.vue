<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Kredit verilməsi</h1>
        <p class="muted">{{ form.loan_no || "Yeni kredit" }} · {{ form.status || "WAITING" }}</p>
      </div>
      <div class="row">
        <RouterLink class="btn" to="/loans">Bağla</RouterLink>
        <button v-if="form.id && form.status === 'WAITING' && session.can('loan.post')" class="btn" @click="disburse">Kassaya yaz</button>
        <button v-if="form.id && form.status === 'WAITING' && session.can('loan.delete')" class="btn danger" @click="remove">Sil</button>
        <button v-if="form.status !== 'POSTED' && session.can(form.id ? 'loan.update' : 'loan.create')" class="btn primary" @click="save">
          {{ form.id ? "Yadda saxla" : "Yarat" }}
        </button>
      </div>
    </div>
    <p v-if="message" class="banner" :class="{ ok: saved }">{{ message }}</p>
    <section class="card">
      <div class="grid-3">
        <label class="field"><span>Müştəri No</span>
          <select v-model="form.customer_id" :disabled="locked"><option value="">Seçin</option><option v-for="row in customers" :key="row.id" :value="String(row.id)">{{ row.customer_no }} · {{ row.full_name }}</option></select>
          <small>{{ fieldMessage(errors, "customer_id") }}</small>
        </label>
        <label class="field"><span>Filial</span>
          <select v-model="form.branch_id" :disabled="locked"><option value="">Seçin</option><option v-for="row in branches" :key="row.branch_id" :value="String(row.branch_id)">{{ row.branch_name }}</option></select>
          <small>{{ fieldMessage(errors, "branch_id") }}</small>
        </label>
        <label class="field"><span>Müqavilə No</span><input :value="form.contract_no" readonly /></label>
        <label class="field"><span>Kredit No</span><input :value="form.loan_no" readonly /></label>
        <label class="field"><span>Məbləğ</span><input v-model="form.amount" :disabled="locked" /><small>{{ fieldMessage(errors, "amount") }}</small></label>
        <label class="field"><span>Valyuta</span>
          <select v-model="form.currency" :disabled="locked"><option v-for="row in currencies" :key="row.code" :value="row.code">{{ row.label }}</option></select>
        </label>
        <label class="field"><span>Təmsilçi</span>
          <select v-model="form.representative_id" :disabled="locked"><option value="">Seçin</option><option v-for="row in users" :key="row.id" :value="String(row.id)">{{ row.user_full_name }}</option></select>
        </label>
        <label class="field"><span>İllik faiz%</span><input v-model="form.annual_interest_rate" :disabled="locked" /><small>{{ fieldMessage(errors, "annual_interest_rate") }}</small></label>
        <label class="field"><span>Cərimə faiz%</span><input v-model="form.penalty_rate" :disabled="locked" /></label>
        <label class="field"><span>Güzəşt müddəti (ay)</span><input v-model="form.grace_months" :disabled="locked" /><small>{{ fieldMessage(errors, "grace_months") }}</small></label>
        <label class="field"><span>Məhsul</span>
          <select v-model="form.product_id" :disabled="locked"><option value="">Seçin</option><option v-for="row in products" :key="row.id" :value="String(row.id)">{{ row.product_name }}</option></select>
          <small>{{ fieldMessage(errors, "product_id") }}</small>
        </label>
        <label class="field"><span>Komissiya məbləği</span><input v-model="form.commission" :disabled="locked" /></label>
        <label class="field"><span>Verilmə tarixi</span><input type="date" v-model="form.disbursement_date" :disabled="locked" /><small>{{ fieldMessage(errors, "disbursement_date") }}</small></label>
        <label class="field"><span>Müddət (ay)</span><input v-model="form.term_months" :disabled="locked" /><small>{{ fieldMessage(errors, "term_months") }}</small></label>
        <label class="field"><span>Müddət (gün)</span><input v-model="form.term_days" :disabled="locked" /></label>
        <label class="field"><span>Qrafik tipi</span><select v-model="form.schedule_type" :disabled="locked"><option value="ANNUITY">Annuitet</option></select></label>
        <label class="field"><span>Standart</span>
          <select v-model="form.standard_code" :disabled="locked"><option v-for="row in standards" :key="row.code" :value="row.code">{{ row.label }}</option></select>
        </label>
        <label class="field"><span>Aylıq ödəniş</span><input :value="form.monthly_payment" readonly /></label>
        <label class="field"><span>Bitmə tarixi</span><input type="date" :value="form.maturity_date" readonly /></label>
        <label class="field"><span>İlk ödəmə tarixi</span><input type="date" v-model="form.first_payment_date" :disabled="locked" /></label>
        <label class="field"><span>Təyinat</span><input v-model="form.purpose" :disabled="locked" /></label>
      </div>
    </section>
    <div class="tabs">
      <button type="button" :class="{ on: tab === 'schedule' }" @click="tab = 'schedule'">Ödəmə cədvəli</button>
      <button type="button" :class="{ on: tab === 'collateral' }" @click="tab = 'collateral'">Təminatlar</button>
    </div>
    <section v-if="tab === 'schedule'" class="card">
      <div class="page-head">
        <h2>Ödəmə cədvəli</h2>
        <button v-if="form.id && form.status === 'WAITING'" class="btn primary" @click="buildSchedule">Cədvəl yarat</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ay</th><th>Tarix</th><th>Əsas borc</th><th>Faiz borcu</th><th>Cəm</th><th>Qalıq</th></tr></thead>
          <tbody>
            <tr v-if="!form.installments.length"><td colspan="6" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in form.installments" :key="row.month_no">
              <td>{{ row.month_no }}</td>
              <td>{{ showDate(row.due_date) }}</td>
              <td>{{ row.principal }}</td>
              <td>{{ row.interest }}</td>
              <td>{{ row.total }}</td>
              <td>{{ row.balance }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section v-else class="card">
      <div class="grid-3" v-if="form.status !== 'POSTED'">
        <label class="field"><span>Təminat</span>
          <select v-model="link.collateral_id"><option value="">Seçin</option><option v-for="row in collaterals" :key="row.id" :value="String(row.id)">{{ row.unique_no }} · {{ row.owner_name }} · {{ row.liquidation_value }} {{ row.currency }}</option></select>
        </label>
        <label class="field"><span>Əlaqələndirilən təminat məbləği</span><input v-model="link.amount" /></label>
        <div class="field"><span>&nbsp;</span><button class="btn" :disabled="!form.id" @click="attach">Əlaqələndir</button></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Unikal №</th><th>Növ</th><th>Sahibi</th><th>Məbləğ</th><th>Valyuta</th><th>Likvid dəyəri</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!form.collaterals.length"><td colspan="7" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in form.collaterals" :key="row.id">
              <td>{{ row.unique_no }}</td>
              <td>{{ typeLabel(row.type) }}</td>
              <td>{{ row.owner_name }}</td>
              <td>{{ row.amount }}</td>
              <td>{{ row.currency }}</td>
              <td>{{ row.liquidation_value }}</td>
              <td><button v-if="form.status !== 'POSTED'" class="btn" @click="detach(row.id)">Ayır</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ApiError, api, errorText, fieldMessage, type FieldError } from "../api";
import { consumeFlash, flash } from "../notice";
import { useSession } from "../session";

type Option = { code: string; label: string };
type Installment = { month_no: number; due_date: string | null; principal: string; interest: string; total: string; balance: string };
type Link = { id: number; unique_no: string; type: string; owner_name: string; amount: string; currency: string; liquidation_value: string };

const session = useSession();
const route = useRoute();
const router = useRouter();
const tab = ref<"schedule" | "collateral">("schedule");
const message = ref("");
const errors = ref<FieldError[]>([]);
const saved = computed(() => message.value === "Yadda saxlandı" || message.value === "Cədvəl yaradıldı" || message.value === "Kredit kassaya yazıldı");
const locked = computed(() => form.status === "POSTED");
const customers = ref<{ id: number; customer_no: string; full_name: string }[]>([]);
const branches = ref<{ branch_id: number; branch_name: string }[]>([]);
const users = ref<{ id: number; user_full_name: string }[]>([]);
const products = ref<{ id: number; product_name: string }[]>([]);
const currencies = ref<Option[]>([{ code: "AZN", label: "AZN" }]);
const standards = ref<Option[]>([{ code: "STANDARD", label: "Standart" }]);
const collaterals = ref<{ id: number; unique_no: string; owner_name: string; liquidation_value: string; currency: string }[]>([]);
const link = reactive({ collateral_id: "", amount: "" });

const form = reactive({
  id: 0,
  status: "WAITING",
  customer_id: "",
  branch_id: "",
  contract_no: "",
  loan_no: "",
  amount: "1000.00",
  currency: "AZN",
  representative_id: "",
  annual_interest_rate: "25.00",
  penalty_rate: "50.00",
  grace_months: "0",
  product_id: "",
  commission: "0.00",
  disbursement_date: "",
  term_months: "12",
  term_days: "0",
  schedule_type: "ANNUITY",
  standard_code: "STANDARD",
  monthly_payment: "0.00",
  maturity_date: "",
  first_payment_date: "",
  purpose: "",
  installments: [] as Installment[],
  collaterals: [] as Link[],
});

function showDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function typeLabel(code: string) {
  return ({ PRECIOUS: "Qiymətli əşya", REAL_ESTATE: "Daşınmaz əmlak", VEHICLE: "Nəqliyyat", OTHER: "Digər əşya", GUARANTOR: "Zamin" } as Record<string, string>)[code] ?? code;
}

function payload() {
  return {
    customer_id: Number(form.customer_id),
    branch_id: Number(form.branch_id),
    amount: form.amount,
    currency: form.currency,
    representative_id: form.representative_id ? Number(form.representative_id) : null,
    annual_interest_rate: form.annual_interest_rate,
    penalty_rate: form.penalty_rate,
    grace_months: Number(form.grace_months),
    product_id: Number(form.product_id),
    commission: form.commission,
    disbursement_date: form.disbursement_date,
    term_months: Number(form.term_months),
    term_days: Number(form.term_days),
    schedule_type: form.schedule_type,
    standard_code: form.standard_code,
    first_payment_date: form.first_payment_date || null,
    purpose: form.purpose,
  };
}

function apply(data: typeof form) {
  Object.assign(form, {
    ...data,
    customer_id: String(data.customer_id ?? ""),
    branch_id: String(data.branch_id ?? ""),
    representative_id: data.representative_id ? String(data.representative_id) : "",
    product_id: String(data.product_id ?? ""),
    first_payment_date: data.first_payment_date ?? "",
    maturity_date: data.maturity_date ?? "",
    installments: data.installments ?? [],
    collaterals: data.collaterals ?? [],
  });
}

async function save() {
  message.value = "";
  errors.value = [];
  try {
    const path = form.id ? `/api/v1/loans/${form.id}` : "/api/v1/loans";
    const result = await api<{ data: typeof form }>(path, { method: form.id ? "PUT" : "POST", body: JSON.stringify(payload()) });
    if (!form.id) {
      flash("Yadda saxlandı");
      router.replace(`/loans/${result.data.id}`);
    } else {
      apply(result.data);
      message.value = "Yadda saxlandı";
    }
  } catch (error) {
    message.value = errorText(error);
    if (error instanceof ApiError) errors.value = error.errors;
  }
}

async function buildSchedule() {
  message.value = "";
  try {
    const result = await api<{ data: typeof form }>(`/api/v1/loans/${form.id}/schedule`, { method: "POST" });
    apply(result.data);
    message.value = "Cədvəl yaradıldı";
  } catch (error) {
    message.value = errorText(error);
  }
}

async function disburse() {
  message.value = "";
  try {
    const result = await api<{ data: typeof form }>(`/api/v1/loans/${form.id}/disburse`, { method: "POST" });
    apply(result.data);
    message.value = "Kredit kassaya yazıldı";
  } catch (error) {
    message.value = errorText(error);
  }
}

async function attach() {
  message.value = "";
  try {
    await api(`/api/v1/loans/${form.id}/collaterals`, {
      method: "POST",
      body: JSON.stringify({ collateral_id: Number(link.collateral_id), amount: link.amount }),
    });
    const result = await api<{ data: typeof form }>(`/api/v1/loans/${form.id}`);
    apply(result.data);
    link.amount = "";
    message.value = "Yadda saxlandı";
  } catch (error) {
    message.value = errorText(error);
  }
}

async function detach(id: number) {
  await api(`/api/v1/loans/${form.id}/collaterals/${id}`, { method: "DELETE" });
  const result = await api<{ data: typeof form }>(`/api/v1/loans/${form.id}`);
  apply(result.data);
}

async function remove() {
  try {
    await api(`/api/v1/loans/${form.id}`, { method: "DELETE" });
    router.push("/loans");
  } catch (error) {
    message.value = errorText(error);
  }
}

onMounted(async () => {
  const [customerPage, branchPage, userPage, productPage, currencyPage, standardPage, collateralPage, calendar] = await Promise.all([
    api<{ data: typeof customers.value }>("/api/v1/customers?pageSize=100"),
    api<{ data: typeof branches.value }>("/api/v1/branches?pageSize=100"),
    api<{ data: typeof users.value }>("/api/v1/users?pageSize=100"),
    api<{ data: typeof products.value }>("/api/v1/products?pageSize=100"),
    api<{ data: Option[] }>("/api/v1/dictionaries?group=CURRENCY"),
    api<{ data: Option[] }>("/api/v1/dictionaries?group=STANDARD"),
    api<{ data: typeof collaterals.value }>("/api/v1/collaterals?pageSize=100"),
    api<{ data: { business_date: string } }>("/api/v1/business-date"),
  ]);
  customers.value = customerPage.data;
  branches.value = branchPage.data;
  users.value = userPage.data;
  products.value = productPage.data;
  if (currencyPage.data.length) currencies.value = currencyPage.data;
  if (standardPage.data.length) standards.value = standardPage.data;
  collaterals.value = collateralPage.data;
  if (route.params.id && route.params.id !== "new") {
    const result = await api<{ data: typeof form }>(`/api/v1/loans/${route.params.id}`);
    apply(result.data);
  } else {
    const preview = await api<{ data: { contract_no: string; loan_no: string } }>("/api/v1/loans/preview");
    form.contract_no = preview.data.contract_no;
    form.loan_no = preview.data.loan_no;
    form.branch_id = session.user?.branch_id ? String(session.user.branch_id) : "";
    form.representative_id = session.user?.id ? String(session.user.id) : "";
    form.disbursement_date = calendar.data.business_date;
    if (products.value.length) form.product_id = String(products.value[0].id);
  }
  const noted = consumeFlash();
  if (noted) message.value = noted;
});
</script>
