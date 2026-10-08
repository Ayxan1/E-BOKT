<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Hesablar</h1>
        <p class="muted">Hər yazılış debet və kredit bərabərliyi ilə keçir.</p>
      </div>
    </div>
    <div v-if="message" class="banner" :class="{ ok: message === 'Yazılış keçdi' }">{{ message }}</div>
    <section class="card" v-if="session.can('ledger.post')">
      <h2>Manual yazılış</h2>
      <div class="grid-3">
        <div class="field"><label>Referans</label><input v-model="form.reference" /></div>
        <div class="field"><label>İş tarixi</label><input type="date" v-model="form.business_date" /></div>
        <div class="field"><label>Məbləğ</label><input v-model="form.amount" /></div>
        <div class="field"><label>Debet hesab</label><input v-model="form.debit" /></div>
        <div class="field"><label>Kredit hesab</label><input v-model="form.credit" /></div>
        <div class="field"><label>&nbsp;</label><button class="btn primary" @click="post">Keçir</button></div>
      </div>
    </section>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Kod</th><th>Ad</th><th>Tip</th><th>Valyuta</th><th>Qalıq</th></tr></thead>
        <tbody>
          <tr v-for="row in accounts" :key="row.id">
            <td>{{ row.code }}</td><td>{{ row.name }}</td><td>{{ row.account_type }}</td><td>{{ row.currency }}</td><td>{{ row.balance }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <section class="card">
      <h2>Son yazılışlar</h2>
      <div v-if="!transactions.length" class="empty">Məlumat yoxdur</div>
      <div v-for="item in transactions" :key="item.id" style="margin-bottom: 10px">
        <strong>{{ item.reference }}</strong> · {{ item.business_date }} · {{ item.status }}
        <div class="muted" v-for="posting in item.postings" :key="posting.account_code + posting.direction">
          {{ posting.direction }} {{ posting.account_code }} {{ posting.amount }} {{ posting.currency }}
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api, errorText } from "../api";
import { useSession } from "../session";

type Account = { id: number; code: string; name: string; account_type: string; currency: string; balance: string };
type Transaction = { id: number; reference: string; business_date: string; status: string; postings: { account_code: string; direction: string; amount: string; currency: string }[] };
const session = useSession();
const accounts = ref<Account[]>([]);
const transactions = ref<Transaction[]>([]);
const message = ref("");
const form = reactive({
  reference: `MAN-${Date.now()}`,
  business_date: new Date().toISOString().slice(0, 10),
  amount: "100.00",
  debit: "1100",
  credit: "1000",
});

async function load() {
  const [accountRows, transactionRows, calendar] = await Promise.all([
    api<{ data: Account[] }>("/api/v1/ledger/accounts"),
    api<{ data: Transaction[] }>("/api/v1/ledger/transactions"),
    api<{ data: { business_date: string } }>("/api/v1/business-date"),
  ]);
  accounts.value = accountRows.data;
  transactions.value = transactionRows.data;
  form.business_date = calendar.data.business_date;
}

async function post() {
  message.value = "";
  try {
    await api("/api/v1/ledger/transactions", {
      method: "POST",
      body: JSON.stringify({
        reference: form.reference,
        idempotency_key: form.reference,
        business_date: form.business_date,
        module: "manual",
        postings: [
          { account_code: form.debit, direction: "DEBIT", amount: form.amount, currency: "AZN" },
          { account_code: form.credit, direction: "CREDIT", amount: form.amount, currency: "AZN" },
        ],
      }),
    });
    form.reference = `MAN-${Date.now()}`;
    await load();
    message.value = "Yazılış keçdi";
  } catch (error) {
    message.value = errorText(error);
  }
}

onMounted(load);
</script>
