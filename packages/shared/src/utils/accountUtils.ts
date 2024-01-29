/* eslint-disable spellcheck/spell-checker */
import { isNil } from 'lodash';

import {
  WALLET_TYPE_EXTERNAL,
  WALLET_TYPE_HD,
  WALLET_TYPE_HW,
  WALLET_TYPE_IMPORTED,
  WALLET_TYPE_WATCHING,
} from '@onekeyhq/kit-bg/src/dbs/local/consts';
import type { IDBAccount } from '@onekeyhq/kit-bg/src/dbs/local/types';

import { EAccountSelectorSceneName } from '../../types';
import { INDEX_PLACEHOLDER, SEPERATOR } from '../engine/engineConsts';

import networkUtils from './networkUtils';
import uriUtils from './uriUtils';

function beautifyPathTemplate({ template }: { template: string }) {
  return template.replace(INDEX_PLACEHOLDER, '*');
}

function shortenAddress({ address }: { address: string | undefined }) {
  if (!address) {
    return '';
  }
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isHdWallet({ walletId }: { walletId: string | undefined }) {
  return Boolean(walletId && walletId.startsWith(`${WALLET_TYPE_HD}-`));
}
function isHwWallet({ walletId }: { walletId: string | undefined }) {
  return Boolean(walletId && walletId.startsWith(`${WALLET_TYPE_HW}-`));
}

function buildHDAccountId({
  walletId,
  index,
  template,
  path,
  idSuffix,
  isUtxo,
}: {
  walletId: string;
  index?: number;
  template?: string;
  path?: string;
  idSuffix?: string;
  isUtxo?: boolean;
}): string {
  let usedPath = path;
  if (!usedPath) {
    if (!template) {
      throw new Error(
        'buildHDAccountId ERROR: template or path must be provided',
      );
    }
    if (isNil(index)) {
      throw new Error('buildHDAccountId ERROR: index must be provided');
    }
    usedPath = template.replace(INDEX_PLACEHOLDER, index.toString());
  }
  let id = `${walletId}--${usedPath}`;
  // EVM LedgerLive ID:  hd-1--m/44'/60'/0'/0/0--LedgerLive
  if (idSuffix) {
    id = `${walletId}--${usedPath}--${idSuffix}`;
  }
  // utxo always remove last 0/0
  if (isUtxo) {
    id = id.replace(/\/0\/0$/i, '');
  }
  return id;
}

function buildAccountSelectorSceneId({
  sceneName,
  sceneUrl,
}: {
  sceneName: EAccountSelectorSceneName;
  sceneUrl?: string;
}): string {
  if (sceneName === EAccountSelectorSceneName.discover) {
    if (!sceneUrl) {
      throw new Error('buildSceneId ERROR: sceneUrl is required');
    }
    const origin = uriUtils.getOriginFromUrl({ url: sceneUrl });
    if (origin !== sceneUrl) {
      throw new Error(
        'buildSceneId ERROR: sceneUrl should be equal to origin, full url is not allowed',
      );
    }
    return `${sceneName}--${origin}`;
  }

  if (!sceneName) {
    throw new Error('buildSceneId ERROR: sceneName is required');
  }
  return sceneName;
}

function buildIndexedAccountId({
  walletId,
  index,
}: {
  walletId: string;
  index: number;
}) {
  return `${walletId}--${index}`;
}

function parseIndexedAccountId({
  indexedAccountId,
}: {
  indexedAccountId: string;
}) {
  const arr = indexedAccountId.split(SEPERATOR);
  const index = Number(arr[arr.length - 1]);
  const walletIdArr = arr.slice(0, -1);
  return {
    walletId: walletIdArr.join(''),
    index,
  };
}

function buildHdWalletId({ nextHD }: { nextHD: number }) {
  return `${WALLET_TYPE_HD}-${nextHD}`;
}

function getDeviceIdFromWallet({ walletId }: { walletId: string }) {
  return walletId.replace(`${WALLET_TYPE_HW}-`, '');
}

function getWalletIdFromAccountId({ accountId }: { accountId: string }) {
  /*
  external--60--0xf588ff00613814c3f86efc57059121c74eb237f1
  hd-1--m/44'/118'/0'/0/0
  hw-da2fb055-f3c8-4b55-922e-a04a6fea29cf--m/44'/0'/0'
  hw-f5f9b539-2879-4811-bac2-8d143b08adef-mg2PbFeAMoms9Z7f5by1MscdP3RAhbrLUJ--m/49'/0'/0'
  */
  return accountId.split(SEPERATOR)[0] || '';
}

function buildLocalTokenId({
  networkId,
  tokenIdOnNetwork,
}: {
  networkId: string;
  tokenIdOnNetwork: string;
}) {
  return `${networkId}__${tokenIdOnNetwork}`;
}

function isAccountCompatibleWithNetwork({
  account,
  networkId,
}: {
  account: IDBAccount;
  networkId: string;
}) {
  if (!networkId) {
    throw new Error(
      'isAccountCompatibleWithNetwork ERROR: networkId is not defined',
    );
  }
  if (!account.impl) {
    throw new Error(
      'isAccountCompatibleWithNetwork ERROR: account.impl is not defined',
    );
  }

  const impl = networkUtils.getNetworkImpl({ networkId });
  // check if impl matched
  if (impl !== account.impl) {
    return false;
  }

  // check if accountSupportNetworkId matched
  if (account.networks && account.networks.length) {
    for (const accountSupportNetworkId of account.networks) {
      if (accountSupportNetworkId === networkId) {
        return true;
      }
    }
    return false;
  }
  return true;
}

function getAccountCompatibleNetwork({
  account,
  networkId,
}: {
  account: IDBAccount;
  networkId: string;
}) {
  let accountNetworkId = networkId;

  const activeNetworkImpl = networkUtils.getNetworkImpl({
    networkId,
  });

  // if impl not matched, use createAtNetwork
  if (activeNetworkImpl !== account.impl) {
    accountNetworkId = account.createAtNetwork || ''; // should fallback to ''
  }

  // if accountNetworkId not in account available networks, use first networkId of available networks
  if (account.networks && account.networks.length) {
    if (!account.networks.includes(accountNetworkId)) {
      [accountNetworkId] = account.networks;
    }
  }
  return accountNetworkId || '';
}

function isOthersWallet({ walletId }: { walletId: string }) {
  return (
    walletId === WALLET_TYPE_WATCHING ||
    walletId === WALLET_TYPE_EXTERNAL ||
    walletId === WALLET_TYPE_IMPORTED
  );
}

export default {
  buildLocalTokenId,
  buildHdWalletId,
  isHdWallet,
  isHwWallet,
  buildHDAccountId,
  buildIndexedAccountId,
  parseIndexedAccountId,
  shortenAddress,
  beautifyPathTemplate,
  buildAccountSelectorSceneId,
  getDeviceIdFromWallet,
  getWalletIdFromAccountId,
  isAccountCompatibleWithNetwork,
  getAccountCompatibleNetwork,
  isOthersWallet,
};