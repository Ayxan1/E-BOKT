<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Kredit məhsulları</h1>
        <p class="muted">{{ total }} qeyd</p>
      </div>
      <div class="row">
        <input class="search" v-model="search" placeholder="Ad və ya kod" @keyup.enter="load" />
        <button class="btn" @click="load">Axtar</button>
        <RouterLink v-if="session.can('product.create')" class="btn primary" to="/products/new">Yeni məhsul</RouterLink>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Kod</th><th>Ad</th><th>Tip</th><th>Kontrol</th><th>Max müddət</th><th></th></tr></thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="6" class="empty">Məlumat yoxdur</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.product_code }}</td>
            <td>{{ row.product_name }}</td>
            <td>{{ row.credit_type === "LOAN" ? "Kredit" : "Kredit xətti" }}</td>
            <td><span class="tag" :class="{ off: !row.control_enabled }">{{ row.control_enabled ? "İşləyir" : "İşləmir" }}</span></td>
            <td>{{ row.max_term }} gün</td>
            <td><RouterLink :to="`/products/${row.id}`">Aç</RouterLink></td>
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

type Row = { id: number; product_code: number; product_name: string; credit_type: string; control_enabled: boolean; max_term: number };
const session = useSession();
const rows = ref<Row[]>([]);
const total = ref(0);
const search = ref("");
async function load() {
  const result = await api<{ data: Row[]; meta: { total: number } }>(`/api/v1/products?search=${encodeURIComponent(search.value)}`);
  rows.value = result.data;
  total.value = result.meta.total;
}
onMounted(load);
</script>
