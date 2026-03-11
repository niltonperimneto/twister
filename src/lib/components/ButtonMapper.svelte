<!-- Button Mapping editor -->
<script lang="ts">
  import type { ProfileDto, ButtonDto, ActionValueDto } from '$lib/types';
  import { ACTION_TYPES } from '$lib/types';
  import { setButtonMapping } from '$lib/ipc/commands';
  import { addToast } from '$lib/stores/toast.svelte';

  interface Props {
    profile: ProfileDto;
    deviceModel: string;
    selectedSvgId: string | null;
    onSvgSelect: (id: string) => void;
    onUpdated: () => void;
  }

  let { profile, deviceModel, selectedSvgId, onSvgSelect, onUpdated }: Props = $props();

  let editIdx: number | null = $state(null);
  let editActionType: number = $state(1);
  let editValue: string = $state('');

  /** Map standard button indices to human-readable names. */
  const BUTTON_LABELS: Record<number, string> = {
    1: 'Left Click',
    2: 'Right Click',
    3: 'Middle Click',
    4: 'Scroll Up',
    5: 'Scroll Down',
    8: 'Back',
    9: 'Forward',
  };

  function buttonLabel(index: number): string {
    return BUTTON_LABELS[index] ?? `Button ${index}`;
  }

  $effect(() => {
    if (selectedSvgId?.startsWith('button')) {
      const idx = parseInt(selectedSvgId.replace('button', ''), 10);
      if (!isNaN(idx) && profile.buttons.some(b => b.index === idx)) {
        startEdit(profile.buttons.find(b => b.index === idx)!);
      }
    }
  });

  function formatAction(btn: ButtonDto): string {
    const v = btn.action_value;
    switch (v.kind) {
      case 'none':    return 'None';
      case 'button':  return `Button ${v.button}`;
      case 'special': return `Special ${v.special}`;
      case 'key':     return `Key ${v.keycode}`;
      case 'macro':   return `Macro (${v.entries.length} steps)`;
      case 'unknown': return 'Unknown';
      default:        return '\u2014';
    }
  }

  function startEdit(btn: ButtonDto) {
    editIdx = btn.index;
    editActionType = btn.action_type;
    editValue = btn.action_value.kind === 'button' ? String(btn.action_value.button)
              : btn.action_value.kind === 'key'    ? String(btn.action_value.keycode)
              : btn.action_value.kind === 'special' ? String(btn.action_value.special)
              : '';
    onSvgSelect(`button${btn.index}`);
  }

  function cancelEdit() { editIdx = null; }

  async function applyEdit() {
    const btn = profile.buttons.find(b => b.index === editIdx);
    if (!btn) return;

    let value: ActionValueDto;
    const n = parseInt(editValue, 10) || 0;

    switch (editActionType) {
      case 0:  value = { kind: 'none' }; break;
      case 1:  value = { kind: 'button', button: n }; break;
      case 2:  value = { kind: 'special', special: n }; break;
      case 3:  value = { kind: 'key', keycode: n }; break;
      case 4:  value = btn.action_value.kind === 'macro'
                  ? btn.action_value
                  : { kind: 'macro', entries: [] };
               break;
      default: value = { kind: 'unknown' }; break;
    }

    try {
      await setButtonMapping(btn.path, editActionType, value);
      onUpdated();
    } catch (e) {
      console.error('Button mapping failed:', e);
      addToast('Button mapping failed — check daemon connection');
    }
    editIdx = null;
  }
</script>

<div class="flex flex-col gap-3">
  {#if profile.buttons.length === 0}
    <p class="text-xs text-base-content/35 italic">No buttons configured</p>
  {/if}

  {#each profile.buttons as btn (btn.index)}
    {@const isEditing = editIdx === btn.index}
    {@const isSelected = selectedSvgId === `button${btn.index}`}
    <div class="editor-card group {isSelected ? '!border-primary/40' : ''}">
      <div class="editor-card-header">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="flex items-center justify-center w-7 h-7 rounded-lg bg-base-300/40 text-[11px] font-mono font-bold text-base-content/60 shrink-0">
            {btn.index}
          </span>
          <div class="min-w-0">
            <div class="text-sm truncate">{buttonLabel(btn.index)} — {formatAction(btn)}</div>
            <div class="text-[10px] text-base-content/30">
              {ACTION_TYPES[btn.action_type] ?? 'Unknown'}
            </div>
          </div>
        </div>

        {#if !isEditing}
          <button
            onclick={() => startEdit(btn)}
            class="pill-btn text-[11px] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            Edit
          </button>
        {/if}
      </div>

      {#if isEditing}
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-base-300/20">
          <select
            bind:value={editActionType}
            class="select select-bordered select-xs bg-base-300/30 border-base-300/40 text-xs"
          >
            {#each btn.action_types as at (at)}
              <option value={at}>{ACTION_TYPES[at] ?? `Type ${at}`}</option>
            {/each}
          </select>

          {#if editActionType !== 0 && editActionType !== 4}
            <input
              type="number"
              bind:value={editValue}
              class="input input-bordered input-xs w-20 font-mono bg-base-300/30 border-base-300/40"
              min="0"
            />
          {/if}

          {#if editActionType === 4}
            <span class="text-[11px] text-base-content/35 italic">Macro editing not yet supported</span>
          {/if}

          <div class="flex gap-1 ml-auto">
            <button onclick={applyEdit} class="pill-btn pill-btn-active text-[11px]">Apply</button>
            <button onclick={cancelEdit} class="pill-btn text-[11px]">Cancel</button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>
