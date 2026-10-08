<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>İcazələr</h1>
        <p class="muted">Rolun üzərinə mətn kodu yazılır: customer.read, loan.post</p>
      </div>
    </div>
    <div v-if="message" class="banner" :class="{ ok: message === 'Yadda saxlandı' }">{{ message }}</div>
    <div class="grid-2">
      <section class="card">
        <div class="row">
          <input v-model="roleName" placeholder="Yeni rol" />
          <button class="btn primary" v-if="session.can('role.create')" @click="createRole">Yarat</button>
        </div>
        <div class="nav" style="margin-top: 12px">
          <button v-for="role in roles" :key="role.id" class="btn" :class="{ primary: selected?.id === role.id }" @click="select(role)">{{ role.name }}</button>
        </div>
      </section>
      <section class="card" v-if="selected">
        <h2 style="margin-top: 0">{{ selected.name }}</h2>
        <div class="row">
          <input v-model="code" placeholder="customer.update" @keyup.enter="addCode" />
          <button class="btn" @click="addCode">Əlavə et</button>
        </div>
        <div class="row" style="margin-top: 8px">
          <input v-model="resource" placeholder="məs. collateral" />
          <button class="btn" @click="addCrud">CRUD əlavə et</button>
        </div>
        <div class="row" style="margin-top: 14px">
          <span v-for="item in selected.permissions" :key="item" class="tag">
            {{ item }}
            <button class="btn small" type="button" @click="selected.permissions = selected.permissions.filter((code) => code !== item)">×</button>
          </span>
        </div>
        <div class="row" style="margin-top: 16px">
          <button class="btn primary" v-if="session.can('role.update')" @click="save">Yadda saxla</button>
          <button class="btn danger" v-if="session.can('role.delete')" @click="remove">Sil</button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, errorText } from "../api";
import { useSession } from "../session";

type Role = { id: number; name: string; description: string; permissions: string[] };
const session = useSession();
const roles = ref<Role[]>([]);
const selected = ref<Role | null>(null);
const roleName = ref("");
const code = ref("");
const resource = ref("");
const message = ref("");

async function load() {
  try {
    const result = await api<{ data: Role[] }>("/api/v1/roles");
    roles.value = result.data;
  } catch (error) {
    message.value = errorText(error);
  }
}
function select(role: Role) {
  selected.value = { ...role, permissions: [...role.permissions] };
}
function addCode() {
  const value = code.value.trim();
  if (!selected.value || !value) return;
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value)) {
    message.value = "İcazə kodu modul.əməliyyat formatında olmalıdır";
    return;
  }
  message.value = "";
  if (!selected.value.permissions.includes(value)) selected.value.permissions.push(value);
  code.value = "";
}
async function addCrud() {
  if (!selected.value || !resource.value.trim()) return;
  const result = await api<{ data: string[] }>(`/api/v1/permissions/crud?resource=${encodeURIComponent(resource.value.trim())}`);
  for (const item of result.data) {
    if (!selected.value.permissions.includes(item)) selected.value.permissions.push(item);
  }
  resource.value = "";
}
async function createRole() {
  message.value = "";
  try {
    await api("/api/v1/roles", { method: "POST", body: JSON.stringify({ name: roleName.value }) });
    roleName.value = "";
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}
async function save() {
  if (!selected.value) return;
  message.value = "";
  try {
    await api(`/api/v1/roles/${selected.value.id}`, {
      method: "PUT",
      body: JSON.stringify(selected.value),
    });
    message.value = "Yadda saxlandı";
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}
async function remove() {
  if (!selected.value || !confirm("Rol silinsin?")) return;
  try {
    await api(`/api/v1/roles/${selected.value.id}`, { method: "DELETE" });
    selected.value = null;
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}
onMounted(load);
</script>
