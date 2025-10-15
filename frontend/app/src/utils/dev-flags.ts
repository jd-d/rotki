import { checkIfDevelopment } from '@shared/utils';

function parseBooleanFlag(value: unknown): boolean {
  if (value === undefined || value === null)
    return false;

  const normalized = String(value).trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no';
}

export function isDevUnlockAllEnabled(): boolean {
  if (!parseBooleanFlag(import.meta.env.VITE_ROTKI_DEV_UNLOCK_ALL))
    return false;

  const mode = import.meta.env.MODE;
  return checkIfDevelopment() || mode !== 'production';
}
