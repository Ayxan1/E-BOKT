<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="mark">
        <i></i>
        <div>
          <span>BOKT</span>
          <strong>LOMBARD</strong>
        </div>
      </div>
      <nav class="nav">
        <RouterLink v-for="item in visible" :key="item.to" :to="item.to" :class="{ active: isActive(item.to) }">
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div>
          <strong>{{ today }}</strong>
          <div><small>Sistem tarixi</small></div>
        </div>
        <div class="who" v-if="session.user">
          <strong>{{ session.user.user_full_name }}</strong>
          <div><small>{{ session.user.branch_name }} · {{ session.user.username }}</small></div>
        </div>
        <button class="btn" @click="leave">Çıxış</button>
      </header>
      <RouterView :key="route.fullPath" />
    </section>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from "vue";
import { api } from "../api";
import { denied } from "../notice";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useSession } from "../session";

const session = useSession();
const route = useRoute();
const router = useRouter();
const toast = ref("");
const today = ref("—");

function showDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function setBusinessDate(value: string) {
  today.value = showDate(value);
}

const items = [
  { to: "/", label: "Panel", code: "" },
  { to: "/branches", label: "Filiallar", code: "branch.read" },
  { to: "/users", label: "İstifadəçilər", code: "user.read" },
  { to: "/customers", label: "Müştərilər", code: "customer.read" },
  { to: "/products", label: "Kredit məhsulları", code: "product.read" },
  { to: "/loans", label: "Kreditin verilməsi", code: "loan.read" },
  { to: "/collaterals", label: "Təminatlar", code: "collateral.read" },
  { to: "/eod", label: "Günsonu prosesi", code: "eod.read" },
  { to: "/ledger", label: "Hesablar", code: "ledger.read" },
  { to: "/access", label: "İcazələr", code: "role.read" },
  { to: "/fields", label: "Sahələr", code: "field.read" },
];

const visible = computed(() => items.filter((item) => !item.code || session.can(item.code)));

function isActive(path: string) {
  if (path === "/") return route.path === "/";
  return route.path === path || route.path.startsWith(`${path}/`);
}

function leave() {
  session.logout();
  router.push("/login");
}

function notify(message: string) {
  toast.value = message;
  window.setTimeout(() => {
    if (toast.value === message) toast.value = "";
  }, 2400);
}

watch(denied, (value) => {
  if (!value) return;
  notify(value);
  denied.value = "";
}, { immediate: true });

provide("notify", notify);
provide("setBusinessDate", setBusinessDate);

onMounted(async () => {
  try {
    const result = await api<{ data: { business_date: string } }>("/api/v1/business-date");
    setBusinessDate(result.data.business_date);
  } catch {
    const now = new Date();
    today.value = [now.getDate(), now.getMonth() + 1, now.getFullYear()].map((part) => String(part).padStart(2, "0")).join(".");
  }
});
</script>
