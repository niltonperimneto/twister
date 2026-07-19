/* Theme import/export — native file dialogs + fs plugin.
 *
 * Exports are plain ThemeConfig JSON plus a $schema tag for
 * forward-compat. Imports are parsed and validated with
 * validateThemeConfig before anything is applied, so a corrupted or
 * hand-edited file can never half-apply; the caller surfaces the
 * returned errors (toast) and decides when to apply. */

import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { validateThemeConfig, type ThemeConfig } from './config';

export const THEME_SCHEMA_TAG = 'twister-theme/v1';

const JSON_FILTER = [{ name: 'Twister theme', extensions: ['json'] }];

export type ExportResult = { status: 'saved'; path: string } | { status: 'cancelled' };

export async function exportTheme(config: ThemeConfig): Promise<ExportResult> {
  const path = await save({
    title: 'Export theme',
    defaultPath: 'twister-theme.json',
    filters: JSON_FILTER,
  });
  if (path === null) return { status: 'cancelled' };
  await writeTextFile(
    path,
    JSON.stringify({ $schema: THEME_SCHEMA_TAG, ...config }, null, 2),
  );
  return { status: 'saved', path };
}

export type ImportResult =
  | { status: 'loaded'; config: ThemeConfig }
  | { status: 'cancelled' }
  | { status: 'error'; errors: string[] };

export async function importTheme(): Promise<ImportResult> {
  const path = await open({
    title: 'Import theme',
    multiple: false,
    directory: false,
    filters: JSON_FILTER,
  });
  if (path === null) return { status: 'cancelled' };

  let data: unknown;
  try {
    data = JSON.parse(await readTextFile(path));
  } catch {
    return {
      status: 'error',
      errors: ['The file could not be read as JSON — is it a theme export?'],
    };
  }

  const result = validateThemeConfig(data);
  return result.ok
    ? { status: 'loaded', config: result.config }
    : { status: 'error', errors: result.errors };
}
