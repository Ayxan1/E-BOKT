<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Günsonu prosesi</h1>
        <p class="muted">Sistem tarixi {{ showDate(businessDate) }}</p>
      </div>
      <button v-if="session.can('eod.run')" class="btn primary" @click="closeDay">Günü bağla</button>
    </div>
    <p v-if="message" class="banner" :class="{ ok: message === 'Gün bağlandı' }">{{ message }}</p>
    <section class="card">
      <p class="muted">Bağlanan gün jurnalı. Faiz və cərimə hesablanması bu mərhələdə yoxdur.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Sistem tarixi</th><th>Status</th><th>Bağlayan</th><th>Vaxt</th></tr></thead>
          <tbody>
            <tr v-if="!rows.length"><td colspan="4" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ showDate(row.business_date) }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.closed_by }}</td>
              <td>{{ showStamp(row.closed_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { inject, onMounted, ref } from "vue";
import { api, errorText } from "../api";
import { useSession } from "../session";

type Row = { id: number; business_date: string; status: string; closed_by: string; closed_at: string };

const session = useSession();
const setBusinessDate = inject<(value: string) => void>("setBusinessDate", () => undefined);
const businessDate = ref("");
const rows = ref<Row[]>([]);
const message = ref("");

function showDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function showStamp(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function load() {
  const result = await api<{ data: { business_date: string; closed: Row[] } }>("/api/v1/eod");
  businessDate.value = result.data.business_date;
  rows.value = result.data.closed;
  setBusinessDate(result.data.business_date);
}

async function closeDay() {
  message.value = "";
  try {
    const result = await api<{ data: { business_date: string; closed: Row[] } }>("/api/v1/eod/close", { method: "POST" });
    businessDate.value = result.data.business_date;
    rows.value = result.data.closed;
    setBusinessDate(result.data.business_date);
    message.value = "Gün bağlandı";
  } catch (error) {
    message.value = errorText(error);
  }
}

onMounted(load);
</script>
