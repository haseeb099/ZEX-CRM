import { getTokenPair } from '@/apollo/utils/getTokenPair';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { getDefaultStore } from 'jotai';

const store = getDefaultStore();

export const zexRestBaseUrl = `${REACT_APP_SERVER_BASE_URL}/rest/zex`;

export const buildZexAuthHeaders = (): Record<string, string> => {
  if (store.get(isCookieAuthActiveState.atom)) {
    return {};
  }

  const tokenPair = store.get(tokenPairState.atom) ?? getTokenPair();
  const token = tokenPair?.accessOrWorkspaceAgnosticToken?.token;

  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const zexFetch = async (
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  return fetch(`${zexRestBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...buildZexAuthHeaders(),
      ...init?.headers,
    },
  });
};
