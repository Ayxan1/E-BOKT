<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Təminatlar</h1>
        <p class="muted">{{ currentLabel }}</p>
      </div>
      <div class="row">
        <button class="btn" @click="reset">Bağla</button>
        <button v-if="form.id && session.can('collateral.delete')" class="btn danger" @click="remove">Sil</button>
        <button v-if="session.can(form.id ? 'collateral.update' : 'collateral.create')" class="btn primary" @click="save">
          {{ form.id ? "Yadda saxla" : "Yarat" }}
        </button>
      </div>
    </div>
    <div class="tabs">
      <button v-for="item in types" :key="item.code" type="button" :class="{ on: type === item.code }" @click="choose(item.code)">{{ item.label }}</button>
    </div>
    <p v-if="message" class="banner" :class="{ ok: saved }">{{ message }}</p>
    <section class="card">
      <div class="grid-3">
        <label class="field"><span>Təminat unikal №</span><input v-model="form.unique_no" /><small>{{ fieldMessage(errors, "unique_no") }}</small></label>
        <label class="field"><span>Təminat sahibi</span><input v-model="form.owner_name" /><small>{{ fieldMessage(errors, "owner_name") }}</small></label>
        <label class="field"><span>Qiymətləndirən</span><input v-model="form.appraiser" /><small>{{ fieldMessage(errors, "appraiser") }}</small></label>
        <label class="field"><span>Qiymətləndirmə vaxtı</span><input type="date" v-model="form.appraisal_date" /><small>{{ fieldMessage(errors, "appraisal_date") }}</small></label>
        <label class="field"><span>Bazar qiyməti</span><input v-model="form.market_value" /></label>
        <label class="field"><span>Likvid dəyəri</span><input v-model="form.liquidation_value" /></label>
        <label class="field"><span>Təminatın valyutası</span>
          <select v-model="form.currency"><option v-for="row in currencies" :key="row.code" :value="row.code">{{ row.label }}</option></select>
        </label>
      </div>
    </section>
    <div class="tabs">
      <button type="button" :class="{ on: tab === 'items' }" @click="tab = 'items'">Təminatlar</button>
      <button type="button" :class="{ on: tab === 'loans' }" @click="tab = 'loans'">Əlaqəli kreditlər</button>
    </div>
    <section v-if="tab === 'items'" class="card">
      <div class="page-head">
        <h2>{{ currentLabel }}</h2>
        <button v-if="type === 'PRECIOUS' && form.id" class="btn primary" @click="itemOpen = true">+ Yeni qiymətli əşya</button>
      </div>
      <div v-if="type === 'PRECIOUS'" class="table-wrap">
        <table>
          <thead><tr><th>Adı</th><th>Ölçü vahidi</th><th>Əyar</th><th>1 qramın qiyməti</th><th>Sayı</th><th>Daşın çəkisi</th><th>Xalis çəki</th><th>Ümumi çəki</th><th>Likvid dəyəri</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!form.items.length"><td colspan="10" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in form.items" :key="row.id">
              <td>{{ row.name }}</td><td>{{ unitLabel(row.unit_code) }}</td><td>{{ row.fineness }}</td><td>{{ row.unit_price }}</td>
              <td>{{ row.quantity }}</td><td>{{ row.stone_weight }}</td><td>{{ row.net_weight }}</td><td>{{ row.gross_weight }}</td><td>{{ row.liquidation_value }}</td>
              <td><button class="btn" @click="removeItem(row.id)">Sil</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Unikal №</th><th>Sahibi</th><th>Qiymətləndirən</th><th>Bazar qiyməti</th><th>Likvid dəyəri</th><th>Valyuta</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!rows.length"><td colspan="7" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.unique_no }}</td><td>{{ row.owner_name }}</td><td>{{ row.appraiser }}</td>
              <td>{{ row.market_value }}</td><td>{{ row.liquidation_value }}</td><td>{{ row.currency }}</td>
              <td><button class="btn" @click="open(row.id)">Aç</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section v-else class="card">
      <div class="page-head">
        <h2>Əlaqəli kreditlər</h2>
        <button v-if="form.id" class="btn primary" @click="loanOpen = true">+ Kredit əlaqəsi</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Kredit №</th><th>Müqavilə №</th><th>Müştəri</th><th>Məbləğ</th><th>Valyuta</th><th>Verilmə tarixi</th></tr></thead>
          <tbody>
            <tr v-if="!form.loans.length"><td colspan="6" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in form.loans" :key="row.id">
              <td>{{ row.loan_no }}</td><td>{{ row.contract_no }}</td><td>{{ row.customer_name }}</td>
              <td>{{ row.amount }}</td><td>{{ row.currency }}</td><td>{{ showDate(row.disbursement_date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="card" v-if="type === 'PRECIOUS'">
      <div class="page-head"><h2>Saxlanmış təminatlar</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Unikal №</th><th>Sahibi</th><th>Likvid dəyəri</th><th>Valyuta</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!rows.length"><td colspan="5" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.unique_no }}</td><td>{{ row.owner_name }}</td><td>{{ row.liquidation_value }}</td><td>{{ row.currency }}</td>
              <td><button class="btn" @click="open(row.id)">Aç</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="itemOpen" class="modal-back" @click.self="itemOpen = false">
      <div class="modal">
        <h2>Qiymətli əşya</h2>
        <div class="grid-2">
          <label class="field"><span>Adı (açıqlaması)</span><input v-model="item.name" /></label>
          <label class="field"><span>Ölçü vahidi</span>
            <select v-model="item.unit_code"><option v-for="row in units" :key="row.code" :value="row.code">{{ row.label }}</option></select>
          </label>
          <label class="field"><span>Əyar</span>
            <select v-model="item.fineness"><option value="">Seçin</option><option v-for="row in fineness" :key="row.code" :value="row.code">{{ row.label }}</option></select>
          </label>
          <label class="field"><span>1 qramın likvid qiyməti</span><input v-model="item.unit_price" /></label>
          <label class="field"><span>Sayı</span><input v-model="item.quantity" /></label>
          <label class="field"><span>Daşın çəkisi</span><input v-model="item.stone_weight" /></label>
          <label class="field"><span>Xalis çəki</span><input v-model="item.net_weight" /></label>
          <label class="field"><span>Ümumi çəki</span><input v-model="item.gross_weight" /></label>
          <label class="field"><span>Likvid dəyəri</span><input v-model="item.liquidation_value" /></label>
        </div>
        <div class="row">
          <button class="btn" @click="itemOpen = false">Bağla</button>
          <button class="btn primary" @click="addItem">Yarat</button>
        </div>
      </div>
    </div>
    <div v-if="loanOpen" class="modal-back" @click.self="loanOpen = false">
      <div class="modal">
        <h2>Əlaqəli kredit</h2>
        <label class="field"><span>Kredit №</span>
          <select v-model="loanLink.loan_id"><option value="">Seçin</option><option v-for="row in loans" :key="row.id" :value="String(row.id)">{{ row.loan_no }} · {{ row.customer_name }} · {{ row.amount }} {{ row.currency }}</option></select>
        </label>
        <label class="field"><span>Əlaqələndirilən təminat məbləği</span><input v-model="loanLink.amount" /></label>
        <div class="row">
          <button class="btn" @click="loanOpen = false">Bağla</button>
          <button class="btn primary" @click="attachLoan">Yarat</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ApiError, api, errorText, fieldMessage, type FieldError } from "../api";
import { useSession } from "../session";

type Option = { code: string; label: string };
type Item = { id: number; name: string; unit_code: string; fineness: string; quantity: number; unit_price: string; stone_weight: string; net_weight: string; gross_weight: string; liquidation_value: string };
type LoanLink = { id: number; loan_no: string; contract_no: string; customer_name: string; amount: string; currency: string; disbursement_date: string | null };
type Collateral = {
  id: number;
  unique_no: string;
  type: string;
  owner_name: string;
  appraiser: string;
  appraisal_date: string | null;
  market_value: string;
  liquidation_value: string;
  currency: string;
  items: Item[];
  loans: LoanLink[];
};

const types = [
  { code: "PRECIOUS", label: "Qiymətli əşyalar" },
  { code: "REAL_ESTATE", label: "Daşınmaz əmlak" },
  { code: "VEHICLE", label: "Nəqliyyat" },
  { code: "OTHER", label: "Digər əşyalar" },
  { code: "GUARANTOR", label: "Zamin" },
];

const session = useSession();
const type = ref("PRECIOUS");
const tab = ref<"items" | "loans">("items");
const rows = ref<Collateral[]>([]);
const message = ref("");
const errors = ref<FieldError[]>([]);
const saved = computed(() => message.value === "Yadda saxlandı");
const currencies = ref<Option[]>([{ code: "AZN", label: "AZN" }]);
const units = ref<Option[]>([{ code: "GRAM", label: "Qram" }]);
const fineness = ref<Option[]>([]);
const loans = ref<{ id: number; loan_no: string; customer_name: string; amount: string; currency: string }[]>([]);
const itemOpen = ref(false);
const loanOpen = ref(false);
const currentLabel = computed(() => types.find((item) => item.code === type.value)?.label ?? "");

const empty = () => ({
  id: 0,
  unique_no: "",
  owner_name: "",
  appraiser: "",
  appraisal_date: "",
  market_value: "0.00",
  liquidation_value: "0.00",
  currency: "AZN",
  items: [] as Item[],
  loans: [] as LoanLink[],
});
const form = reactive(empty());
const item = reactive({ name: "", unit_code: "GRAM", fineness: "", quantity: "0", unit_price: "0.00", stone_weight: "0.00", net_weight: "0.00", gross_weight: "0.00", liquidation_value: "0.00" });
const loanLink = reactive({ loan_id: "", amount: "" });

function showDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function unitLabel(code: string) {
  return units.value.find((row) => row.code === code)?.label ?? code;
}

function apply(data: Collateral) {
  Object.assign(form, {
    ...empty(),
    ...data,
    appraisal_date: data.appraisal_date ?? "",
    items: data.items ?? [],
    loans: data.loans ?? [],
  });
}

async function load() {
  const result = await api<{ data: Collateral[] }>(`/api/v1/collaterals?type=${type.value}&pageSize=100`);
  rows.value = result.data;
}

function choose(code: string) {
  type.value = code;
  reset();
  load();
}

function reset() {
  Object.assign(form, empty());
  message.value = "";
  errors.value = [];
}

async function open(id: number) {
  const result = await api<{ data: Collateral }>(`/api/v1/collaterals/${id}`);
  apply(result.data);
  message.value = "";
}

async function save() {
  message.value = "";
  errors.value = [];
  const body = {
    unique_no: form.unique_no,
    type: type.value,
    owner_name: form.owner_name,
    appraiser: form.appraiser,
    appraisal_date: form.appraisal_date,
    market_value: form.market_value,
    liquidation_value: form.liquidation_value,
    currency: form.currency,
  };
  try {
    const path = form.id ? `/api/v1/collaterals/${form.id}` : "/api/v1/collaterals";
    const result = await api<{ data: Collateral }>(path, { method: form.id ? "PUT" : "POST", body: JSON.stringify(body) });
    apply(result.data);
    message.value = "Yadda saxlandı";
    await load();
  } catch (error) {
    message.value = errorText(error);
    if (error instanceof ApiError) errors.value = error.errors;
  }
}

async function remove() {
  message.value = "";
  try {
    await api(`/api/v1/collaterals/${form.id}`, { method: "DELETE" });
    reset();
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}

async function addItem() {
  message.value = "";
  try {
    const result = await api<{ data: Collateral }>(`/api/v1/collaterals/${form.id}/items`, {
      method: "POST",
      body: JSON.stringify({ ...item, quantity: Number(item.quantity) }),
    });
    apply(result.data);
    itemOpen.value = false;
    Object.assign(item, { name: "", unit_code: "GRAM", fineness: "", quantity: "0", unit_price: "0.00", stone_weight: "0.00", net_weight: "0.00", gross_weight: "0.00", liquidation_value: "0.00" });
    message.value = "Yadda saxlandı";
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}

async function removeItem(id: number) {
  const result = await api<{ data: Collateral }>(`/api/v1/collaterals/${form.id}/items/${id}`, { method: "DELETE" });
  apply(result.data);
  await load();
}

async function attachLoan() {
  message.value = "";
  try {
    await api(`/api/v1/loans/${loanLink.loan_id}/collaterals`, {
      method: "POST",
      body: JSON.stringify({ collateral_id: form.id, amount: loanLink.amount }),
    });
    loanOpen.value = false;
    loanLink.amount = "";
    await open(form.id);
    message.value = "Yadda saxlandı";
  } catch (error) {
    message.value = errorText(error);
  }
}

onMounted(async () => {
  const [currencyPage, unitPage, finenessPage, loanPage] = await Promise.all([
    api<{ data: Option[] }>("/api/v1/dictionaries?group=CURRENCY"),
    api<{ data: Option[] }>("/api/v1/dictionaries?group=UNIT"),
    api<{ data: Option[] }>("/api/v1/dictionaries?group=FINENESS"),
    api<{ data: typeof loans.value }>("/api/v1/loans?pageSize=100"),
  ]);
  if (currencyPage.data.length) currencies.value = currencyPage.data;
  if (unitPage.data.length) units.value = unitPage.data;
  fineness.value = finenessPage.data;
  loans.value = loanPage.data;
  await load();
});
</script>
