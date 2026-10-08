<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Müştərilər</h1>
        <p class="muted">{{ total }} qeyd</p>
      </div>
      <div class="row">
        <input class="search" v-model="search" placeholder="Ad, nömrə, FİN" @keyup.enter="load" />
        <button class="btn" @click="load">Axtar</button>
        <RouterLink v-if="session.can('customer.create')" class="btn primary" to="/customers/new">Yeni müştəri</RouterLink>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Nömrə</th><th>Tam ad</th><th>Tip</th><th>Unikal nömrə</th><th>Rezidentlik</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="6" class="empty">Məlumat yoxdur</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.customer_no }}</td>
            <td>{{ row.full_name }}</td>
            <td>{{ typeLabel(row.customer_type) }}</td>
            <td>{{ row.unique_no }}</td>
            <td>{{ row.residency_status === "RESIDENT" ? "Rezident" : "Qeyri-rezident" }}</td>
            <td><RouterLink :to="`/customers/${row.id}`">Aç</RouterLink></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api";
import { useSession } from "../session";

const types: Record<number, string> = { 1: "Fiziki şəxs", 2: "Hüquqi şəxs", 3: "Sahibkar", 4: "Maliyyə qurumu" };
function typeLabel(type: number) { return types[type] ?? String(type); }

type Row = { id: number; customer_no: string; full_name: string; customer_type: number; unique_no: string; residency_status: string };
const session = useSession();
const rows = ref<Row[]>([]);
const total = ref(0);
const search = ref("");

async function load() {
  const result = await api<{ data: Row[]; meta: { total: number } }>(`/api/v1/customers?search=${encodeURIComponent(search.value)}`);
  rows.value = result.data;
  total.value = result.meta.total;
}
onMounted(load);
</script>
