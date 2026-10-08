<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>{{ form.product_code || "Yeni məhsul" }}</h1>
        <p class="muted">{{ form.product_name || "Kredit məhsulu konstruktoru" }}</p>
      </div>
      <div class="row">
        <RouterLink class="btn" to="/products">Geri</RouterLink>
        <button v-if="id && session.can('product.delete')" class="btn danger" @click="remove">Sil</button>
        <button class="btn primary" @click="save">Yadda saxla</button>
      </div>
    </div>
    <div v-if="message" class="banner" :class="{ ok: message === 'Yadda saxlandı' }">{{ message }}</div>
    <section class="card">
      <div class="grid-2">
        <div class="segmented">
          <button type="button" :class="{ on: form.control_enabled }" @click="form.control_enabled = true">Kontrol işləsin</button>
          <button type="button" :class="{ on: !form.control_enabled }" @click="form.control_enabled = false">Kontrol işləməsin</button>
        </div>
        <div class="segmented">
          <button type="button" :class="{ on: form.credit_type === 'LOAN' }" @click="form.credit_type = 'LOAN'">Kredit</button>
          <button type="button" :class="{ on: form.credit_type === 'LINE' }" @click="form.credit_type = 'LINE'">Kredit xətti</button>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 16px">
        <div class="field"><label>Məhsul kodu</label><input v-model="form.product_code" placeholder="Boşdursa avtomatik" /></div>
        <div class="field"><label>Məhsul adı <em>*</em></label><input v-model="form.product_name" /><span class="hint">{{ fieldMessage(errors, "product_name") }}</span></div>
        <div class="field"><label>Max müddət (gün)</label><input v-model.number="form.max_term" type="number" /></div>
        <div class="field"><label>Qeyd</label><input v-model="form.note" /></div>
      </div>
      <div class="tabs">
        <button type="button" :class="{ on: tab === 'credit' }" @click="tab = 'credit'">Məhsul şərtləri</button>
        <button type="button" :class="{ on: tab === 'dti' }" @click="tab = 'dti'">DTI şərtləri</button>
        <button type="button" :class="{ on: tab === 'ltv' }" @click="tab = 'ltv'">LTV şərtləri</button>
      </div>
      <div v-if="tab === 'credit'">
        <div class="page-head"><span class="muted">Valyuta üzrə məbləğ, müddət və faiz</span><button class="btn small primary" type="button" @click="openCredit">+ Yeni şərt</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Valyuta</th><th>Məbləğ</th><th>Müddət (gün)</th><th>İllik faiz</th><th></th></tr></thead>
            <tbody>
              <tr v-if="!form.credit_conditions.length"><td colspan="5" class="empty">Məlumat yoxdur</td></tr>
              <tr v-for="(row, index) in form.credit_conditions" :key="index">
                <td>{{ row.currency }}</td>
                <td>{{ row.amount_min }} – {{ row.amount_max }}</td>
                <td>{{ row.term_min_days }} – {{ row.term_max_days }}</td>
                <td>{{ row.annual_interest_rate_min }} – {{ row.annual_interest_rate_max }}</td>
                <td><button class="btn small" type="button" @click="form.credit_conditions.splice(index, 1)">Sil</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="tab === 'dti'">
        <div class="page-head"><span class="muted">Maaş intervalına görə DTI</span><button class="btn small primary" type="button" @click="openDti">+ Yeni DTI şərt</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Maaş min</th><th>Maaş max</th><th>DTI faizi</th><th></th></tr></thead>
            <tbody>
              <tr v-if="!form.dti_conditions.length"><td colspan="4" class="empty">Məlumat yoxdur</td></tr>
              <tr v-for="(row, index) in form.dti_conditions" :key="index">
                <td>{{ row.salary_min }}</td><td>{{ row.salary_max }}</td><td>{{ row.dti_rate }}</td>
                <td><button class="btn small" type="button" @click="form.dti_conditions.splice(index, 1)">Sil</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="tab === 'ltv'">
        <div class="page-head"><span class="muted">Girov növü və valyuta cütü</span><button class="btn small primary" type="button" @click="openLtv">+ Yeni LTV şərt</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Girov</th><th>LTV</th><th>Kredit valyutası</th><th>Təminat valyutası</th><th></th></tr></thead>
            <tbody>
              <tr v-if="!form.ltv_conditions.length"><td colspan="5" class="empty">Məlumat yoxdur</td></tr>
              <tr v-for="(row, index) in form.ltv_conditions" :key="index">
                <td>{{ collateralLabel(row.collateral_type) }}</td><td>{{ row.ltv_rate }}</td><td>{{ row.credit_currency }}</td><td>{{ row.collateral_currency }}</td>
                <td><button class="btn small" type="button" @click="form.ltv_conditions.splice(index, 1)">Sil</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div v-if="modal" class="modal-back" @click.self="modal = ''">
      <form class="modal" @submit.prevent="commit">
        <h2>{{ modal === "credit" ? "Məhsul şərtləri" : modal === "dti" ? "DTI şərtləri" : "LTV şərtləri" }}</h2>
        <template v-if="modal === 'credit'">
          <div class="grid-2">
            <div class="field"><label>Valyuta</label><select v-model="draftCredit.currency"><option v-for="item in currencies" :key="item.code" :value="item.code">{{ item.label }}</option></select></div>
            <div class="field"><label>Məbləğ min</label><input v-model="draftCredit.amount_min" /></div>
            <div class="field"><label>Məbləğ max</label><input v-model="draftCredit.amount_max" /></div>
            <div class="field"><label>Müddət min</label><input v-model.number="draftCredit.term_min_days" type="number" /></div>
            <div class="field"><label>Müddət max</label><input v-model.number="draftCredit.term_max_days" type="number" /></div>
            <div class="field"><label>Faiz min</label><input v-model="draftCredit.annual_interest_rate_min" /></div>
            <div class="field"><label>Faiz max</label><input v-model="draftCredit.annual_interest_rate_max" /></div>
          </div>
        </template>
        <template v-if="modal === 'dti'">
          <div class="grid-2">
            <div class="field"><label>Maaş min</label><input v-model="draftDti.salary_min" /></div>
            <div class="field"><label>Maaş max</label><input v-model="draftDti.salary_max" /></div>
            <div class="field"><label>DTI faizi</label><input v-model="draftDti.dti_rate" /></div>
          </div>
        </template>
        <template v-if="modal === 'ltv'">
          <div class="grid-2">
            <div class="field"><label>Girov növü</label><select v-model="draftLtv.collateral_type"><option v-for="item in collaterals" :key="item.code" :value="item.code">{{ item.label }}</option></select></div>
            <div class="field"><label>LTV faizi</label><input v-model="draftLtv.ltv_rate" /></div>
            <div class="field"><label>Girovun valyutası</label><select v-model="draftLtv.collateral_currency"><option v-for="item in currencies" :key="item.code" :value="item.code">{{ item.label }}</option></select></div>
            <div class="field"><label>Kreditin valyutası</label><select v-model="draftLtv.credit_currency"><option v-for="item in currencies" :key="item.code" :value="item.code">{{ item.label }}</option></select></div>
          </div>
        </template>
        <div class="row" style="justify-content: flex-end">
          <button class="btn" type="button" @click="modal = ''">Bağla</button>
          <button class="btn primary" type="submit">Yarat</button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ApiError, api, errorText, fieldMessage, type FieldError } from "../api";
import { consumeFlash, flash } from "../notice";
import { useSession } from "../session";

type Dict = { code: string; label: string };
const route = useRoute();
const router = useRouter();
const session = useSession();
const id = route.params.id ? Number(route.params.id) : 0;
const message = ref("");
const errors = ref<FieldError[]>([]);
const tab = ref("credit");
const modal = ref("");
const currencies = ref<Dict[]>([{ code: "AZN", label: "AZN" }]);
const collaterals = ref<Dict[]>([]);
const form = reactive({
  product_code: "" as string | number,
  product_name: "",
  credit_type: "LOAN",
  control_enabled: true,
  max_term: 0,
  note: "",
  credit_conditions: [] as Record<string, string | number>[],
  dti_conditions: [] as Record<string, string>[],
  ltv_conditions: [] as Record<string, string>[],
});
const draftCredit = reactive({ currency: "AZN", amount_min: "0.00", amount_max: "0.00", term_min_days: 0, term_max_days: 0, annual_interest_rate_min: "0", annual_interest_rate_max: "0" });
const draftDti = reactive({ salary_min: "0.00", salary_max: "0.00", dti_rate: "0" });
const draftLtv = reactive({ collateral_type: "PRECIOUS", ltv_rate: "0", credit_currency: "AZN", collateral_currency: "AZN" });

function collateralLabel(code: string) {
  return collaterals.value.find((item) => item.code === code)?.label ?? code;
}
function openCredit() { modal.value = "credit"; }
function openDti() { modal.value = "dti"; }
function openLtv() { modal.value = "ltv"; }
function commit() {
  if (modal.value === "credit") form.credit_conditions.push({ ...draftCredit });
  if (modal.value === "dti") form.dti_conditions.push({ ...draftDti });
  if (modal.value === "ltv") form.ltv_conditions.push({ ...draftLtv });
  modal.value = "";
}

onMounted(async () => {
  if (session.can("dictionary.read")) {
    const [currencyRows, collateralRows] = await Promise.all([
      api<{ data: Dict[] }>("/api/v1/dictionaries?group=CURRENCY"),
      api<{ data: Dict[] }>("/api/v1/dictionaries?group=COLLATERAL_TYPE"),
    ]);
    currencies.value = currencyRows.data;
    collaterals.value = collateralRows.data;
  }
  if (id) {
    const result = await api<{ data: typeof form }>(`/api/v1/products/${id}`);
    Object.assign(form, result.data);
  }
  const noted = consumeFlash();
  if (noted) message.value = noted;
});

async function save() {
  message.value = "";
  errors.value = [];
  try {
    const result = await api<{ data: { id: number } }>(id ? `/api/v1/products/${id}` : "/api/v1/products", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ ...form, product_code: form.product_code || undefined }),
    });
    if (!id) {
      flash("Yadda saxlandı");
      router.push(`/products/${result.data.id}`);
    } else message.value = "Yadda saxlandı";
  } catch (error) {
    message.value = errorText(error);
    if (error instanceof ApiError) errors.value = error.errors;
  }
}

async function remove() {
  if (!confirm("Məhsul silinsin?")) return;
  try {
    await api(`/api/v1/products/${id}`, { method: "DELETE" });
    router.push("/products");
  } catch (error) {
    message.value = errorText(error);
  }
}
</script>
