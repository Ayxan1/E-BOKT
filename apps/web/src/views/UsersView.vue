<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>İstifadəçilər</h1>
        <p class="muted">{{ total }} qeyd</p>
      </div>
      <div class="row">
        <input class="search" v-model="search" placeholder="Axtar" @keyup.enter="load" />
        <button class="btn" @click="load">Axtar</button>
        <RouterLink v-if="session.can('user.create')" class="btn primary" to="/users/new">Yeni istifadəçi</RouterLink>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>İstifadəçi</th><th>Tam ad</th><th>Filial</th><th>Telefon</th><th>Status</th><th>Admin</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="7" class="empty">Məlumat yoxdur</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.username }}</td>
            <td>{{ row.user_full_name }}</td>
            <td>{{ row.branch_name }}</td>
            <td>{{ row.phone_number }}</td>
            <td><span class="tag" :class="{ off: row.status !== 'ACTIVE' }">{{ row.status === "ACTIVE" ? "Aktiv" : "Aktiv deyil" }}</span></td>
            <td>{{ row.admin ? "Bəli" : "Xeyr" }}</td>
            <td><RouterLink :to="`/users/${row.id}`">Aç</RouterLink></td>
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

type UserRow = {
  id: number;
  username: string;
  user_full_name: string;
  branch_name: string;
  phone_number: string;
  status: string;
  admin: boolean;
};
const session = useSession();
const rows = ref<UserRow[]>([]);
const total = ref(0);
const search = ref("");

async function load() {
  const result = await api<{ data: UserRow[]; meta: { total: number } }>(`/api/v1/users?search=${encodeURIComponent(search.value)}`);
  rows.value = result.data;
  total.value = result.meta.total;
}
onMounted(load);
</script>
