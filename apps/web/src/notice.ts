import { ref } from "vue";

const pending = ref("");

export const denied = ref("");

export function flash(message: string) {
  pending.value = message;
}

export function consumeFlash() {
  const message = pending.value;
  pending.value = "";
  return message;
}
