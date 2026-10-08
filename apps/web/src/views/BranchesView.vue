<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Filiallar</h1>
        <p class="muted">{{ total }} qeyd</p>
      </div>
      <div class="row">
        <input class="search" v-model="search" placeholder="Axtar" @keyup.enter="load" />
        <button class="btn" @click="load">Axtar</button>
        <RouterLink v-if="session.can('branch.create')" class="btn primary" to="/branches/new">Yeni filial</RouterLink>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Kod</th><th>Ad</th><th>Ünvan</th><th>Telefon</th><th>Direktor</th><th>Baş ofis</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="7" class="empty">Məlumat yoxdur</td></tr>
          <tr v-for="row in rows" :key="row.branch_id">
            <td>{{ row.branch_id }}</td>
            <td>{{ row.branch_name }}</td>
            <td>{{ row.address }}</td>
            <td>{{ row.phone_number }}</td>
            <td>{{ row.director }}</td>
            <td><span class="tag" :class="{ off: !row.head_office }">{{ row.head_office ? "Bəli" : "Xeyr" }}</span></td>
            <td><RouterLink :to="`/branches/${row.branch_id}`">Aç</RouterLink></td>
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

type Branch = {
  branch_id: number;
  branch_name: string;
  address: string;
  phone_number: string;
  director: string;
  head_office: boolean;
};

const session = useSession();
const rows = ref<Branch[]>([]);
const total = ref(0);
const search = ref("");

async function load() {
  const result = await api<{ data: Branch[]; meta: { total: number } }>(`/api/v1/branches?search=${encodeURIComponent(search.value)}`);
  rows.value = result.data;
  total.value = result.meta.total;
}

onMounted(load);
</script>
