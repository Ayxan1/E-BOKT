<template>
  <main class="login-screen">
    <section class="login-brand">
      <div class="mark">
        <i></i>
        <div>
          <span>BOKT</span>
          <strong>LOMBARD</strong>
        </div>
      </div>
      <p>Filial, müştəri və kredit məhsulu qeydiyyatı. Məbləğlər qəpik dəqiqliyi ilə, icazələr isə mətn kodu ilə idarə olunur.</p>
      <small>Əməliyyat sistemi</small>
    </section>
    <section class="login-panel">
      <form class="login-card" @submit.prevent="submit">
        <h1>Giriş</h1>
        <p class="muted">İstifadəçi adı və şifrə ilə davam edin.</p>
        <div v-if="message" class="banner">{{ message }}</div>
        <div class="field">
          <label>İstifadəçi adı</label>
          <input v-model="username" autocomplete="username" />
        </div>
        <div class="field">
          <label>Şifrə</label>
          <input v-model="password" type="password" autocomplete="current-password" />
        </div>
        <button class="btn primary" :disabled="loading">{{ loading ? "Yoxlanılır" : "Daxil ol" }}</button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { errorText } from "../api";
import { useSession } from "../session";

const session = useSession();
const router = useRouter();
const username = ref("admin");
const password = ref("");
const message = ref("");
const loading = ref(false);

async function submit() {
  loading.value = true;
  message.value = "";
  try {
    await session.login(username.value, password.value);
    router.push("/");
  } catch (error) {
    message.value = errorText(error);
  } finally {
    loading.value = false;
  }
}
</script>
