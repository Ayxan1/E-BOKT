<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>{{ id ? "İstifadəçi" : "Yeni istifadəçi" }}</h1>
        <p class="muted">Giriş və filial bağlılığı</p>
      </div>
      <div class="row">
        <RouterLink class="btn" to="/users">Geri</RouterLink>
        <button v-if="id && session.can('user.delete')" class="btn danger" @click="remove">Sil</button>
        <button class="btn primary" @click="save">Yadda saxla</button>
      </div>
    </div>
    <div v-if="message" class="banner" :class="{ ok: message === 'Yadda saxlandı' }">{{ message }}</div>
    <section class="card">
      <div class="grid-2">
        <div>
          <div class="segmented">
            <button type="button" :class="{ on: form.status === 'ACTIVE' }" @click="form.status = 'ACTIVE'">Aktiv</button>
            <button type="button" :class="{ on: form.status === 'INACTIVE' }" @click="form.status = 'INACTIVE'">Aktiv deyil</button>
          </div>
        </div>
        <div>
          <div class="segmented">
            <button type="button" :class="{ on: form.admin }" @click="form.admin = true" :disabled="!session.user?.admin">Admin</button>
            <button type="button" :class="{ on: !form.admin }" @click="form.admin = false" :disabled="!session.user?.admin">Admin deyil</button>
          </div>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 16px">
        <div class="field">
          <label>İstifadəçi adı <em>*</em></label>
          <input v-model="form.username" />
          <span class="hint">{{ fieldMessage(errors, "username") }}</span>
        </div>
        <div class="field">
          <label>Filial <em>*</em></label>
          <select v-model.number="form.branch_id">
            <option :value="0">Seçin</option>
            <option v-for="branch in branches" :key="branch.branch_id" :value="branch.branch_id">{{ branch.branch_name }}</option>
          </select>
          <span class="hint">{{ fieldMessage(errors, "branch_id") }}</span>
        </div>
        <div class="field">
          <label>Tam adı <em>*</em></label>
          <input v-model="form.user_full_name" />
          <span class="hint">{{ fieldMessage(errors, "user_full_name") }}</span>
        </div>
        <div class="field">
          <label>Telefon</label>
          <input v-model="form.phone_number" />
        </div>
        <div class="field">
          <label>Girişdə max. səhv sayı</label>
          <input v-model.number="form.max_failed_attempts" type="number" min="1" max="20" />
        </div>
        <div class="field">
          <label>{{ id ? "Yeni şifrə" : "Şifrə" }}</label>
          <input v-model="form.password" type="password" />
          <span class="hint">{{ fieldMessage(errors, "password") }}</span>
        </div>
      </div>
      <label v-if="id" class="check"><input type="checkbox" v-model="form.reset_password" /> Şifrəni sıfırla və səhv sayını təmizlə</label>
      <div class="field" v-if="session.user?.admin">
        <label>Rollar</label>
        <div class="row">
          <label v-for="role in roles" :key="role.id" class="check">
            <input type="checkbox" :value="role.id" v-model="form.role_ids" /> {{ role.name }}
          </label>
        </div>
      </div>
      <div class="field">
        <label>Qeyd</label>
        <textarea v-model="form.note"></textarea>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ApiError, api, errorText, fieldMessage, type FieldError } from "../api";
import { consumeFlash, flash } from "../notice";
import { useSession } from "../session";

const route = useRoute();
const router = useRouter();
const session = useSession();
const id = route.params.id ? Number(route.params.id) : 0;
const message = ref("");
const errors = ref<FieldError[]>([]);
const branches = ref<{ branch_id: number; branch_name: string }[]>([]);
const roles = ref<{ id: number; name: string }[]>([]);
const form = reactive({
  username: "",
  user_full_name: "",
  phone_number: "",
  status: "ACTIVE",
  admin: false,
  branch_id: 0,
  note: "",
  max_failed_attempts: 5,
  password: "",
  reset_password: false,
  role_ids: [] as number[],
});

onMounted(async () => {
  const branchResult = await api<{ data: { branch_id: number; branch_name: string }[] }>("/api/v1/branches?pageSize=100");
  branches.value = branchResult.data;
  if (session.user?.admin) {
    const roleResult = await api<{ data: { id: number; name: string }[] }>("/api/v1/roles");
    roles.value = roleResult.data;
  }
  if (id) {
    const result = await api<{ data: typeof form }>(`/api/v1/users/${id}`);
    Object.assign(form, result.data, { password: "", reset_password: false });
  }
  const noted = consumeFlash();
  if (noted) message.value = noted;
});

async function save() {
  message.value = "";
  errors.value = [];
  try {
    const result = await api<{ data: { id: number } }>(id ? `/api/v1/users/${id}` : "/api/v1/users", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    if (!id) {
      flash("Yadda saxlandı");
      router.push(`/users/${result.data.id}`);
    } else message.value = "Yadda saxlandı";
  } catch (error) {
    message.value = errorText(error);
    if (error instanceof ApiError) errors.value = error.errors;
  }
}

async function remove() {
  if (!confirm("İstifadəçi silinsin?")) return;
  try {
    await api(`/api/v1/users/${id}`, { method: "DELETE" });
    router.push("/users");
  } catch (error) {
    message.value = errorText(error);
  }
}
</script>
