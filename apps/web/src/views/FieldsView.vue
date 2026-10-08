<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>Dinamik sahələr və lüğətlər</h1>
        <p class="muted">Yeni giriş sahəsi və siyahı kodu deploy olmadan əlavə olunur.</p>
      </div>
    </div>
    <div v-if="message" class="banner">{{ message }}</div>
    <section class="card">
      <h2>Sahə</h2>
      <div class="grid-3">
        <div class="field">
          <label>Varlıq</label>
          <select v-model="field.entity">
            <option value="customer">Müştəri</option>
            <option value="product">Məhsul</option>
            <option value="branch">Filial</option>
            <option value="user">İstifadəçi</option>
          </select>
        </div>
        <div class="field"><label>Kod</label><input v-model="field.code" placeholder="referral_source" /></div>
        <div class="field"><label>Ad</label><input v-model="field.label" placeholder="Mənbə" /></div>
        <div class="field">
          <label>Tip</label>
          <select v-model="field.data_type">
            <option value="text">Mətn</option>
            <option value="number">Ədəd</option>
            <option value="money">Məbləğ</option>
            <option value="date">Tarix</option>
            <option value="boolean">Bəli / xeyr</option>
          </select>
        </div>
        <label class="check"><input type="checkbox" v-model="field.required" /> Məcburi</label>
        <button class="btn primary" v-if="session.can('field.manage')" @click="saveField">Sahəni saxla</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Varlıq</th><th>Kod</th><th>Ad</th><th>Tip</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!fields.length"><td colspan="5" class="empty">Məlumat yoxdur</td></tr>
            <tr v-for="item in fields" :key="item.id">
              <td>{{ item.entity }}</td><td>{{ item.code }}</td><td>{{ item.label }}</td><td>{{ item.data_type }}</td>
              <td><button class="btn small" v-if="session.can('field.manage')" @click="removeField(item.id)">Sil</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="card">
      <h2>Lüğət</h2>
      <div class="grid-3">
        <div class="field"><label>Qrup</label><input v-model="dict.group" placeholder="SECTOR" /></div>
        <div class="field"><label>Kod</label><input v-model="dict.code" placeholder="AGRO" /></div>
        <div class="field"><label>Ad</label><input v-model="dict.label" placeholder="Kənd təsərrüfatı" /></div>
      </div>
      <button class="btn primary" v-if="session.can('dictionary.manage')" @click="saveDict">Lüğəti saxla</button>
      <div class="table-wrap" style="margin-top: 12px">
        <table>
          <thead><tr><th>Qrup</th><th>Kod</th><th>Ad</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in dictionaries" :key="item.id">
              <td>{{ item.group }}</td><td>{{ item.code }}</td><td>{{ item.label }}</td>
              <td><button class="btn small" v-if="session.can('dictionary.manage')" @click="removeDict(item.id)">Sil</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api, errorText } from "../api";
import { useSession } from "../session";

const session = useSession();
const message = ref("");
const fields = ref<{ id: number; entity: string; code: string; label: string; data_type: string }[]>([]);
const dictionaries = ref<{ id: number; group: string; code: string; label: string }[]>([]);
const field = reactive({ entity: "customer", code: "", label: "", data_type: "text", required: false });
const dict = reactive({ group: "", code: "", label: "" });

async function load() {
  const [fieldRows, dictRows] = await Promise.all([
    api<{ data: typeof fields.value }>("/api/v1/fields"),
    api<{ data: typeof dictionaries.value }>("/api/v1/dictionaries"),
  ]);
  fields.value = fieldRows.data;
  dictionaries.value = dictRows.data;
}
async function saveField() {
  try {
    await api("/api/v1/fields", { method: "POST", body: JSON.stringify(field) });
    field.code = "";
    field.label = "";
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}
async function removeField(id: number) {
  await api(`/api/v1/fields/${id}`, { method: "DELETE" });
  await load();
}
async function removeDict(id: number) {
  message.value = "";
  try {
    await api(`/api/v1/dictionaries/${id}`, { method: "DELETE" });
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}
async function saveDict() {
  try {
    await api("/api/v1/dictionaries", { method: "POST", body: JSON.stringify(dict) });
    dict.group = "";
    dict.code = "";
    dict.label = "";
    await load();
  } catch (error) {
    message.value = errorText(error);
  }
}
onMounted(load);
</script>
