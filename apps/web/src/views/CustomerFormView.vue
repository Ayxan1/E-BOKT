<template>
  <main class="page">
    <div class="page-head">
      <div>
        <h1>{{ form.customer_no || "Yeni müştəri" }}</h1>
        <p class="muted">{{ form.full_name || "Müştəri kartı" }}</p>
      </div>
      <div class="row">
        <RouterLink class="btn" to="/customers">Geri</RouterLink>
        <button v-if="id && session.can('customer.delete')" class="btn danger" @click="remove">Sil</button>
        <button class="btn primary" @click="save">Yadda saxla</button>
      </div>
    </div>
    <div v-if="message" class="banner" :class="{ ok: message === 'Yadda saxlandı' || message === 'Fayl yükləndi' }">{{ message }}</div>
    <section class="card">
      <div class="grid-2">
        <div class="segmented">
          <button type="button" v-for="item in types" :key="item.id" :class="{ on: form.customer_type === item.id }" @click="form.customer_type = item.id">{{ item.label }}</button>
        </div>
        <div class="segmented">
          <button type="button" :class="{ on: form.residency_status === 'RESIDENT' }" @click="form.residency_status = 'RESIDENT'">Rezident</button>
          <button type="button" :class="{ on: form.residency_status === 'NON_RESIDENT' }" @click="form.residency_status = 'NON_RESIDENT'">Qeyri-rezident</button>
        </div>
      </div>
      <div class="tabs" style="margin-top: 16px">
        <button type="button" v-for="tab in tabs" :key="tab.id" :class="{ on: active === tab.id }" @click="active = tab.id">{{ tab.label }}</button>
      </div>

      <div v-show="active === 'main'" class="grid-2">
        <template v-if="person">
          <div class="field"><label>Ad <em>*</em></label><input v-model="form.first_name" /><span class="hint">{{ fieldMessage(errors, "first_name") }}</span></div>
          <div class="field"><label>Soyad <em>*</em></label><input v-model="form.last_name" /><span class="hint">{{ fieldMessage(errors, "last_name") }}</span></div>
          <div class="field"><label>Ata adı <em>*</em></label><input v-model="form.father_name" /><span class="hint">{{ fieldMessage(errors, "father_name") }}</span></div>
        </template>
        <div class="field"><label>Tam ad <em>*</em></label><input v-model="form.full_name" /><span class="hint">{{ fieldMessage(errors, "full_name") }}</span></div>
        <div class="field">
          <label>{{ form.customer_type === 1 ? "FİN" : form.customer_type === 3 ? "VÖEN / FİN" : "VÖEN" }} <em>*</em></label>
          <input v-model="form.unique_no" />
          <span class="hint">{{ fieldMessage(errors, "unique_no") }}</span>
        </div>
        <div class="field" v-if="form.customer_type === 2">
          <label>İcraçı FİN</label>
          <input v-model="form.executor_fin" />
          <span class="hint">{{ fieldMessage(errors, "executor_fin") }}</span>
        </div>
        <div class="field"><label>Qeyd</label><textarea v-model="form.note"></textarea></div>
      </div>

      <div v-show="active === 'document'" v-if="person">
        <div class="grid-2">
          <div>
            <div class="segmented">
              <button type="button" :class="{ on: form.document.gender === 'MALE' }" @click="form.document.gender = 'MALE'">Kişi</button>
              <button type="button" :class="{ on: form.document.gender === 'FEMALE' }" @click="form.document.gender = 'FEMALE'">Qadın</button>
            </div>
          </div>
          <div>
            <div class="segmented">
              <button type="button" :class="{ on: form.document.marital_status === 'SINGLE' }" @click="form.document.marital_status = 'SINGLE'">Subay</button>
              <button type="button" :class="{ on: form.document.marital_status === 'MARRIED' }" @click="form.document.marital_status = 'MARRIED'">Evli</button>
              <button type="button" :class="{ on: form.document.marital_status === 'DIVORCED' }" @click="form.document.marital_status = 'DIVORCED'">Boşanmış</button>
            </div>
          </div>
        </div>
        <div class="grid-2" style="margin-top: 14px">
          <div class="field"><label>Sənədin seriyası <em>*</em></label><input v-model="form.document.series" /><span class="hint">{{ fieldMessage(errors, "document.series") }}</span></div>
          <div class="field"><label>Sənədin nömrəsi <em>*</em></label><input v-model="form.document.number" /><span class="hint">{{ fieldMessage(errors, "document.number") }}</span></div>
          <div class="field"><label>Doğum tarixi</label><input type="date" v-model="form.document.birth_date" /></div>
          <div class="field"><label>Verilmə tarixi</label><input type="date" v-model="form.document.issue_date" /></div>
          <div class="field"><label>Etibarlılıq tarixi</label><input type="date" v-model="form.document.expiry_date" /></div>
          <div class="field"><label>Verilmə yeri</label><input v-model="form.document.issue_place" /></div>
          <div class="field">
            <label>Vətəndaşlıq</label>
            <select v-model="form.document.citizenship">
              <option value="">Seçin</option>
              <option v-for="item in citizenship" :key="item.code" :value="item.code">{{ item.label }}</option>
            </select>
          </div>
        </div>
        <div class="page-head"><h2 style="font-size: 16px">İş yerləri</h2><button class="btn small" type="button" @click="addWork">İş yeri əlavə et</button></div>
        <div v-for="(work, index) in form.workplaces" :key="index" class="card">
          <div class="grid-2">
            <div class="field">
              <label>Tip</label>
              <select v-model="work.workplace_type">
                <option value="MAIN">Əsas</option>
                <option value="ADDITIONAL">Əlavə</option>
              </select>
            </div>
            <div class="field"><label>İş yeri <em>*</em></label><input v-model="work.workplace_name" /><span class="hint">{{ fieldMessage(errors, `workplaces.${index}.workplace_name`) }}</span></div>
            <div class="field"><label>Vəzifə</label><input v-model="work.position" /></div>
            <div class="field"><label>Aylıq gəlir</label><input v-model="work.monthly_income" /></div>
            <div class="field"><label>Staj</label><input v-model="work.work_experience" /></div>
          </div>
          <button class="btn small" type="button" @click="form.workplaces.splice(index, 1)">Sil</button>
        </div>
        <p v-if="fieldMessage(errors, 'workplaces')" class="banner">{{ fieldMessage(errors, "workplaces") }}</p>
      </div>

      <div v-show="active === 'activity'" v-if="activity" class="grid-2">
        <div class="field">
          <label>Fəaliyyət kodu <em>*</em></label>
          <select v-model="form.activity_code">
            <option value="">Seçin</option>
            <option v-for="item in activities" :key="item.code" :value="item.code">{{ item.code }} — {{ item.label }}</option>
          </select>
          <span class="hint">{{ fieldMessage(errors, "activity_code") }}</span>
        </div>
        <div class="field">
          <label>Sektor <em>*</em></label>
          <select v-model="form.sector">
            <option value="">Seçin</option>
            <option v-for="item in sectors" :key="item.code" :value="item.code">{{ item.label }}</option>
          </select>
          <span class="hint">{{ fieldMessage(errors, "sector") }}</span>
        </div>
        <div class="field"><label>Fəaliyyət növü</label><input v-model="form.activity_type" /></div>
      </div>

      <div v-show="active === 'parties'" v-if="form.customer_type === 2">
        <div class="page-head"><span></span><button class="btn small" type="button" @click="addParty">Şəxs əlavə et</button></div>
        <p v-if="fieldMessage(errors, 'executors_founders')" class="banner">{{ fieldMessage(errors, "executors_founders") }}</p>
        <div v-for="(party, index) in form.executors_founders" :key="index" class="card">
          <div class="grid-2">
            <div class="field">
              <label>Tip</label>
              <select v-model="party.type">
                <option value="EXECUTOR">İcraçı</option>
                <option value="FOUNDER">Təsisçi</option>
                <option value="SIGNATORY">İmzalayan</option>
              </select>
            </div>
            <div class="field"><label>Tam ad <em>*</em></label><input v-model="party.full_name" /></div>
            <div class="field"><label>FİN / VÖEN <em>*</em></label><input v-model="party.fin_voen" /></div>
            <div class="field" v-if="party.type === 'FOUNDER'"><label>Pay %</label><input v-model="party.share" /></div>
          </div>
          <button class="btn small" type="button" @click="form.executors_founders.splice(index, 1)">Sil</button>
        </div>
      </div>

      <div v-show="active === 'address'">
        <div class="field"><label>Qeydiyyat ünvanı <em>*</em></label><textarea v-model="form.registration_address" @input="copyAddress"></textarea><span class="hint">{{ fieldMessage(errors, "registration_address") }}</span></div>
        <label class="check"><input type="checkbox" v-model="sameAddress" @change="copyAddress" /> Faktiki ünvan qeydiyyat ünvanı ilə eynidir</label>
        <div class="field"><label>Faktiki ünvan <em>*</em></label><textarea v-model="form.actual_address" :disabled="sameAddress"></textarea><span class="hint">{{ fieldMessage(errors, "actual_address") }}</span></div>
      </div>

      <div v-show="active === 'phones'">
        <div class="page-head"><span></span><button class="btn small" type="button" @click="addPhone">Telefon əlavə et</button></div>
        <p v-if="fieldMessage(errors, 'phones')" class="banner">{{ fieldMessage(errors, "phones") }}</p>
        <div v-for="(phone, index) in form.phones" :key="index" class="grid-3">
          <div class="field"><label>Nömrə</label><input v-model="phone.phone_number" /></div>
          <div class="field">
            <label>Tip</label>
            <select v-model="phone.phone_type">
              <option value="MOBILE">Mobil</option>
              <option value="HOME">Ev</option>
              <option value="WORK">İş</option>
            </select>
          </div>
          <div class="field">
            <label>Əsas</label>
            <input type="checkbox" :checked="phone.is_primary" @change="setPrimary(index)" />
          </div>
        </div>
      </div>

      <div v-show="active === 'files'">
        <p v-if="!id" class="muted">Fayl əlavə etmək üçün əvvəlcə müştərini yadda saxlayın.</p>
        <div v-else class="grid-3">
          <div class="field"><label>Fayl tipi</label><input v-model="fileType" placeholder="Şəxsiyyət vəsiqəsi" /></div>
          <div class="field"><label>Fayl</label><input type="file" @change="onFile" /></div>
          <div class="field"><label>&nbsp;</label><button class="btn" type="button" @click="upload">Yüklə</button></div>
        </div>
        <div class="table-wrap" v-if="form.files.length">
          <table>
            <thead><tr><th>Ad</th><th>Tip</th><th>Fayl</th></tr></thead>
            <tbody>
              <tr v-for="file in form.files" :key="file.id">
                <td>{{ file.file_name }}</td>
                <td>{{ file.file_type }}</td>
                <td><button class="btn small" type="button" @click="download(file.id, file.file_name)">Yüklə</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-show="active === 'extra'" v-if="fields.length">
        <div class="grid-2">
          <div class="field" v-for="field in fields" :key="field.code">
            <label>{{ field.label }} <em v-if="field.required">*</em></label>
            <input v-if="field.data_type !== 'boolean'" v-model="form.attributes[field.code]" :type="field.data_type === 'date' ? 'date' : field.data_type === 'number' || field.data_type === 'money' ? 'text' : 'text'" />
            <label v-else class="check"><input type="checkbox" :checked="form.attributes[field.code] === 'true'" @change="form.attributes[field.code] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'" /> Bəli</label>
            <span class="hint">{{ fieldMessage(errors, `attributes.${field.code}`) }}</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ApiError, api, downloadBlob, errorText, fieldMessage, type FieldError } from "../api";
import { consumeFlash, flash } from "../notice";
import { useSession } from "../session";

type Dict = { code: string; label: string };
type FieldDef = { code: string; label: string; data_type: string; required: boolean };

const route = useRoute();
const router = useRouter();
const session = useSession();
const id = route.params.id ? Number(route.params.id) : 0;
const message = ref("");
const errors = ref<FieldError[]>([]);
const active = ref("main");
const sameAddress = ref(false);
const activities = ref<Dict[]>([]);
const sectors = ref<Dict[]>([]);
const citizenship = ref<Dict[]>([]);
const fields = ref<FieldDef[]>([]);
const fileType = ref("");
const selectedFile = ref<File | null>(null);

const types = [
  { id: 1, label: "Fiziki" },
  { id: 2, label: "Hüquqi şəxs" },
  { id: 3, label: "Sahibkar" },
  { id: 4, label: "Maliyyə qurumu" },
];

const form = reactive({
  customer_no: "",
  customer_type: 1,
  first_name: "",
  last_name: "",
  father_name: "",
  full_name: "",
  unique_no: "",
  executor_fin: "",
  activity_type: "",
  activity_code: "",
  sector: "",
  residency_status: "RESIDENT",
  registration_address: "",
  actual_address: "",
  note: "",
  document: {
    series: "",
    number: "",
    issue_date: "",
    issue_place: "",
    expiry_date: "",
    citizenship: "",
    birth_date: "",
    marital_status: "",
    gender: "",
  },
  workplaces: [] as { workplace_type: string; workplace_name: string; position: string; monthly_income: string; work_experience: string; note: string }[],
  phones: [] as { phone_number: string; phone_type: string; is_primary: boolean; note: string }[],
  executors_founders: [] as { type: string; full_name: string; share: string; fin_voen: string; note: string }[],
  files: [] as { id: number; file_name: string; file_type: string; file: string }[],
  attributes: {} as Record<string, string>,
});

const person = computed(() => form.customer_type === 1 || form.customer_type === 3);
watch(() => form.customer_type, () => { active.value = "main"; });
const activity = computed(() => form.customer_type === 2 || form.customer_type === 3);
const tabs = computed(() => [
  { id: "main", label: "Əsas" },
  ...(person.value ? [{ id: "document", label: "Sənəd və iş" }] : []),
  ...(activity.value ? [{ id: "activity", label: "Fəaliyyət" }] : []),
  ...(form.customer_type === 2 ? [{ id: "parties", label: "Əlaqəli şəxslər" }] : []),
  { id: "address", label: "Ünvan" },
  { id: "phones", label: "Telefonlar" },
  { id: "files", label: "Fayllar" },
  ...(fields.value.length ? [{ id: "extra", label: "Əlavə sahələr" }] : []),
]);

watch(
  () => [form.first_name, form.last_name, form.father_name, form.customer_type],
  () => {
    if (person.value) form.full_name = [form.last_name, form.first_name, form.father_name].filter(Boolean).join(" ");
  },
);
function copyAddress() {
  if (sameAddress.value) form.actual_address = form.registration_address;
}
function addWork() {
  form.workplaces.push({ workplace_type: form.workplaces.some((item) => item.workplace_type === "MAIN") ? "ADDITIONAL" : "MAIN", workplace_name: "", position: "", monthly_income: "0.00", work_experience: "", note: "" });
}
function addPhone() {
  form.phones.push({ phone_number: "", phone_type: "MOBILE", is_primary: form.phones.length === 0, note: "" });
}
function setPrimary(index: number) {
  form.phones.forEach((phone, phoneIndex) => { phone.is_primary = phoneIndex === index; });
}
function addParty() {
  form.executors_founders.push({ type: "FOUNDER", full_name: "", share: "0", fin_voen: "", note: "" });
}
function onFile(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}

async function dictionary(group: string) {
  const result = await api<{ data: Dict[] }>(`/api/v1/dictionaries?group=${group}`);
  return result.data;
}

onMounted(async () => {
  if (session.can("dictionary.read")) {
    [activities.value, sectors.value, citizenship.value] = await Promise.all([
      dictionary("ACTIVITY_CODE"),
      dictionary("SECTOR"),
      dictionary("CITIZENSHIP"),
    ]);
  }
  if (session.can("field.read")) {
    const result = await api<{ data: FieldDef[] }>("/api/v1/fields?entity=customer");
    fields.value = result.data.filter((item) => item.required || true);
  }
  if (!id) return;
  const result = await api<{ data: typeof form }>(`/api/v1/customers/${id}`);
  Object.assign(form, result.data);
  const document = result.data.document;
    form.document = document
      ? {
          ...document,
          issue_date: document.issue_date ?? "",
          expiry_date: document.expiry_date ?? "",
          birth_date: document.birth_date ?? "",
        }
      : form.document;
  form.attributes = result.data.attributes ?? {};
  sameAddress.value = form.registration_address !== "" && form.registration_address === form.actual_address;
  const noted = consumeFlash();
  if (noted) message.value = noted;
});

async function save() {
  message.value = "";
  errors.value = [];
  try {
    const result = await api<{ data: { id: number } }>(id ? `/api/v1/customers/${id}` : "/api/v1/customers", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    if (!id) {
      flash("Yadda saxlandı");
      router.push(`/customers/${result.data.id}`);
    } else message.value = "Yadda saxlandı";
  } catch (error) {
    message.value = errorText(error);
    if (error instanceof ApiError) errors.value = error.errors;
  }
}

async function upload() {
  if (!selectedFile.value) return;
  const body = new FormData();
  body.append("file", selectedFile.value);
  body.append("file_type", fileType.value);
  try {
    await api(`/api/v1/customers/${id}/files`, { method: "POST", body });
    const result = await api<{ data: typeof form }>(`/api/v1/customers/${id}`);
    form.files = result.data.files;
    message.value = "Fayl yükləndi";
  } catch (error) {
    message.value = errorText(error);
  }
}

async function download(fileId: number, name: string) {
  try {
    await downloadBlob(`/api/v1/customers/${id}/files/${fileId}`, name);
  } catch (error) {
    message.value = errorText(error);
  }
}

async function remove() {
  if (!confirm("Müştəri silinsin?")) return;
  try {
    await api(`/api/v1/customers/${id}`, { method: "DELETE" });
    router.push("/customers");
  } catch (error) {
    message.value = errorText(error);
  }
}
</script>
