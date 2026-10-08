<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Kreditin verilməsi</h1>
        <p class="muted">{{ total }} əməliyyat</p>
      </div>
      <div class="row">
        <input class="search" v-model="search" placeholder="Axtar" @keyup.enter="load" />
        <button class="btn" @click="load">Axtar</button>
        <button class="btn" @click="report = true">Hesabat</button>
        <RouterLink v-if="session.can('loan.create')" class="btn primary" to="/loans/new">Yeni kredit</RouterLink>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Əməliyyat kodu</th>
            <th>İstifadəçi</th>
            <th>Filial</th>
            <th>Müştəri No</th>
            <th>Müştəri adı</th>
            <th>Müqavilə No</th>
            <th>Kredit No</th>
            <th>Təyinat</th>
            <th>Məbləğ</th>
            <th>Valyuta</th>
            <th>Verilmə tarixi</th>
            <th>Bitmə tarixi</th>
            <th>İllik faiz%</th>
            <th>Cərimə faiz%</th>
            <th>Komissiya</th>
            <th>Standart</th>
            <th>Müddət (ay)</th>
            <th>Məhsul</th>
            <th>Əməliyyat statusu</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="20" class="empty">Məlumat yoxdur</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.operation_code }}</td>
            <td>{{ row.representative_name }}</td>
            <td>{{ row.branch_name }}</td>
            <td>{{ row.customer_no }}</td>
            <td>{{ row.customer_name }}</td>
            <td>{{ row.contract_no }}</td>
            <td>{{ row.loan_no }}</td>
            <td>{{ row.purpose }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.currency }}</td>
            <td>{{ showDate(row.disbursement_date) }}</td>
            <td>{{ showDate(row.maturity_date) }}</td>
            <td>{{ row.annual_interest_rate }}</td>
            <td>{{ row.penalty_rate }}</td>
            <td>{{ row.commission }}</td>
            <td>{{ row.standard_code }}</td>
            <td>{{ row.term_months }}</td>
            <td>{{ row.product_name }}</td>
            <td><span class="tag" :class="{ off: row.status !== 'WAITING' }">{{ row.status }}</span></td>
            <td><RouterLink :to="`/loans/${row.id}`">Aç</RouterLink></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="message" class="banner" :class="{ ok: message.startsWith('Məktub') }">{{ message }}</p>
    <div v-if="report" class="modal-back" @click.self="report = false">
      <div class="modal">
        <h2>Hesabatın yükləmə formatını seç</h2>
        <div class="row">
          <button class="btn primary" @click="download('excel')">Excel</button>
          <button class="btn" @click="download('pdf')">PDF</button>
          <button class="btn" @click="download('html')">HTML</button>
          <button class="btn" @click="emailOpen = true">E-poçt</button>
          <button class="btn" @click="report = false">Bağla</button>
        </div>
        <div v-if="emailOpen" class="field" style="margin-top: 14px">
          <label>E-poçt ünvanı</label>
          <input v-model="emailTo" type="email" placeholder="mail@example.com" />
          <button class="btn primary" type="button" @click="sendMail">Məktubu hazırla</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api";
import { useSession } from "../session";

type Loan = {
  id: number;
  operation_code: number;
  representative_name: string;
  branch_name: string;
  customer_no: string;
  customer_name: string;
  contract_no: string;
  loan_no: string;
  purpose: string;
  amount: string;
  currency: string;
  disbursement_date: string | null;
  maturity_date: string | null;
  annual_interest_rate: string;
  penalty_rate: string;
  commission: string;
  standard_code: string;
  term_months: number;
  product_name: string;
  status: string;
};

const session = useSession();
const rows = ref<Loan[]>([]);
const total = ref(0);
const search = ref("");
const report = ref(false);
const emailOpen = ref(false);
const emailTo = ref("");
const message = ref("");

function showDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

async function load() {
  const result = await api<{ data: Loan[]; meta: { total: number } }>(
    `/api/v1/loans?search=${encodeURIComponent(search.value)}&pageSize=100`,
  );
  rows.value = result.data;
  total.value = result.meta.total;
}

function reportRows() {
  const header = ["Əməliyyat kodu", "İstifadəçi", "Filial", "Müştəri No", "Müştəri adı", "Müqavilə No", "Kredit No", "Təyinat", "Məbləğ", "Valyuta", "Verilmə tarixi", "Bitmə tarixi", "İllik faiz%", "Cərimə faiz%", "Komissiya", "Standart", "Müddət (ay)", "Məhsul", "Status"];
  const body = rows.value.map((row) => [
    row.operation_code, row.representative_name, row.branch_name, row.customer_no, row.customer_name,
    row.contract_no, row.loan_no, row.purpose, row.amount, row.currency, showDate(row.disbursement_date),
    showDate(row.maturity_date), row.annual_interest_rate, row.penalty_rate, row.commission, row.standard_code,
    row.term_months, row.product_name, row.status,
  ]);
  return { header, body };
}

function tableHtml() {
  const { header, body } = reportRows();
  const cell = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<table><thead><tr>${header.map((item) => `<th>${cell(item)}</th>`).join("")}</tr></thead><tbody>${body
    .map((line) => `<tr>${line.map((item) => `<td>${cell(item)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function download(kind: "excel" | "html" | "pdf") {
  const { header, body } = reportRows();
  if (kind === "excel") {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [header, ...body].map((line) => line.map(escape).join(";")).join("\n");
    save(`\uFEFF${csv}`, "kreditler.csv", "text/csv");
  } else if (kind === "html") {
    save(`<meta charset="utf-8">${tableHtml()}`, "kreditler.html", "text/html");
  } else {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Kredit hesabatı</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;font-size:12px}h1{font-size:18px}</style></head><body><h1>Kredit hesabatı</h1>${tableHtml()}</body></html>`;
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      save(html, "kreditler-pdf.html", "text/html");
      message.value = "PDF pəncərəsi bloklandı. Çap olunan hesabat faylı yükləndi.";
      report.value = false;
      emailOpen.value = false;
      return;
    }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }
  report.value = false;
  emailOpen.value = false;
}

function sendMail() {
  const address = emailTo.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    message.value = "E-poçt ünvanı düzgün deyil";
    return;
  }
  const eml = [
    `To: ${address}`,
    "Subject: Kredit hesabatı",
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    `<meta charset="utf-8"><h1>Kredit hesabatı</h1>${tableHtml()}`,
  ].join("\r\n");
  save(eml, "kreditler.eml", "message/rfc822");
  report.value = false;
  emailOpen.value = false;
  message.value = "Məktub faylı yükləndi. Onu poçt proqramında açıb göndərin.";
}

function save(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(load);
</script>
