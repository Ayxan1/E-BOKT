<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>{{ id ? "Filial" : "Yeni filial" }}</h1>
        <p class="muted">Filial kartı</p>
      </div>
      <div class="row">
        <RouterLink class="btn" to="/branches">Geri</RouterLink>
        <button v-if="id && session.can('branch.delete')" class="btn danger" @click="remove">Sil</button>
        <button class="btn primary" @click="save">Yadda saxla</button>
      </div>
    </div>
    <div v-if="message" class="banner" :class="{ ok: message === 'Yadda saxlandı' }">{{ message }}</div>
    <section class="card">
      <div class="grid-2">
        <div class="field">
          <label>Filial adı <em>*</em></label>
          <input v-model="form.branch_name" />
          <span class="hint">{{ fieldMessage(errors, "branch_name") }}</span>
        </div>
        <div class="field">
          <label>Əlaqə telefonu <em>*</em></label>
          <input v-model="form.phone_number" />
          <span class="hint">{{ fieldMessage(errors, "phone_number") }}</span>
        </div>
        <div class="field">
          <label>Filial direktoru</label>
          <input v-model="form.director" />
        </div>
        <div class="field">
          <label>Ünvan <em>*</em></label>
          <input v-model="form.address" />
          <span class="hint">{{ fieldMessage(errors, "address") }}</span>
        </div>
      </div>
      <label class="check"><input type="checkbox" v-model="form.head_office" /> Baş ofis</label>
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
const form = reactive({ branch_name: "", address: "", phone_number: "", director: "", head_office: false });

onMounted(async () => {
  if (id) {
    const result = await api<{ data: typeof form }>(`/api/v1/branches/${id}`);
    Object.assign(form, result.data);
  }
  const noted = consumeFlash();
  if (noted) message.value = noted;
});

async function save() {
  message.value = "";
  errors.value = [];
  try {
    const result = await api<{ data: { branch_id: number } }>(id ? `/api/v1/branches/${id}` : "/api/v1/branches", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    if (!id) {
      flash("Yadda saxlandı");
      router.push(`/branches/${result.data.branch_id}`);
      return;
    }
    message.value = "Yadda saxlandı";
  } catch (error) {
    message.value = errorText(error);
    if (error instanceof ApiError) errors.value = error.errors;
  }
}

async function remove() {
  if (!confirm("Filial silinsin?")) return;
  try {
    await api(`/api/v1/branches/${id}`, { method: "DELETE" });
    router.push("/branches");
  } catch (error) {
    message.value = errorText(error);
  }
}
</script>
