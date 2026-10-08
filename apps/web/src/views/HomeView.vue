<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Əməliyyat paneli</h1>
        <p class="muted">Filial, müştəri, kredit və təminat.</p>
      </div>
    </div>
    <section class="stats">
      <article class="stat"><span class="muted">Filial</span><b>{{ stats.branches }}</b></article>
      <article class="stat"><span class="muted">İstifadəçi</span><b>{{ stats.users }}</b></article>
      <article class="stat"><span class="muted">Müştəri</span><b>{{ stats.customers }}</b></article>
      <article class="stat"><span class="muted">Kredit məhsulu</span><b>{{ stats.products }}</b></article>
      <article class="stat"><span class="muted">Kredit</span><b>{{ stats.loans }}</b></article>
      <article class="stat"><span class="muted">Təminat</span><b>{{ stats.collaterals }}</b></article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive } from "vue";
import { api } from "../api";

const stats = reactive({ branches: 0, users: 0, customers: 0, products: 0, loans: 0, collaterals: 0 });

onMounted(async () => {
  const result = await api<{ data: typeof stats }>("/api/v1/stats");
  Object.assign(stats, result.data);
});
</script>
