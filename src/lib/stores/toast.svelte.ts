/* Minimal toast notification store (Svelte 5 runes). */

export interface Toast {
  id: number;
  message: string;
  kind: 'error' | 'info';
}

let nextId = 0;
let toasts: Toast[] = $state([]);

export function addToast(message: string, kind: Toast['kind'] = 'error') {
  const id = nextId++;
  toasts.push({ id, message, kind });
  setTimeout(() => removeToast(id), 4000);
}

function removeToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
}

export function getToasts(): Toast[] {
  return toasts;
}
