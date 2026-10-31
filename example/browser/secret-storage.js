import { storageKey, exchangeKey, seal, open, envelope, isExchangeKey } from './selected-crypto.js';

const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('rainfrog-secrets-v1', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('identities');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
function usable(key, name) {
  return key instanceof CryptoKey && !key.extractable && key.algorithm.name === name;
}
export class SecretStorage {
  constructor(context) {
    this.context = context;
    this.key = [context.appId, context.userId];
  }
  async read() {
    const db = await database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('identities', 'readonly');
      const request = tx.objectStore('identities').get(this.key);
      tx.oncomplete = () => resolve(request.result ?? {});
      tx.onabort = () => reject(tx.error);
    });
  }
  async write(value) {
    const db = await database;
    await new Promise((resolve, reject) => {
      const tx = db.transaction('identities', 'readwrite');
      tx.objectStore('identities').put(value, this.key);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    const channel = new BroadcastChannel('rainfrog-secrets-v1');
    channel.postMessage(this.key);
    channel.close();
  }
  async change(action, current = () => true) {
    return navigator.locks.request(`rainfrog-secrets:${JSON.stringify(this.key)}`, async () => {
      if (!current()) {
        throw new Error('login_changed');
      }
      const state = await this.read();
      const result = await action(state);
      if (!current()) {
        throw new Error('login_changed');
      }
      await this.write(state);
      return result;
    });
  }
  async describe() {
    const state = await this.read();
    if (!state.card) {
      return { pending: state.pending };
    }
    let plain;
    try {
      plain = await open(state.card, state.aes, this.context);
      return {
        last4: new TextDecoder().decode(plain.subarray(-4)),
        revision: state.card.itemRevision,
        pending: state.pending,
      };
    } catch {
      return { unreadable: true, pending: state.pending };
    } finally {
      plain?.fill(0);
    }
  }
  async save(plain, current) {
    return this.change(async (state) => {
      if (state.pending) {
        throw new Error('pending_operation');
      }
      if (!usable(state.aes, 'AES-GCM')) {
        state.aes = await storageKey();
        delete state.exchange; // A custom exchange key may be wrapped by the lost AES key.
        state.generation = (state.generation ?? 0) + 1;
      }
      state.revision = (state.revision ?? 0) + 1;
      if (!Number.isSafeInteger(state.revision) || !Number.isSafeInteger(state.generation)) {
        throw new Error('storage_version_exhausted');
      }
      state.card = await seal(plain, state.aes, this.context, state.generation, state.revision);
    }, current);
  }
  async remove(current) {
    return this.change((state) => {
      if (state.pending) {
        throw new Error('pending_operation');
      }
      delete state.card;
    }, current);
  }
  async prepare(provider, revision, current) {
    return this.change(async (state) => {
      if (state.pending) {
        throw new Error('pending_operation');
      }
      if (state.card?.itemRevision !== revision) {
        throw new Error('card_changed');
      }
      if (!isExchangeKey(state.exchange)) {
        state.exchange = await exchangeKey(state.aes, this.context);
      }
      const plain = await open(state.card, state.aes, this.context);
      try {
        const operationId = crypto.randomUUID();
        const input = await envelope(
          plain,
          state.exchange,
          provider,
          this.context,
          operationId,
          revision,
          state.aes,
        );
        state.pending = { operationId, purpose: 'card-number-check', itemRevision: revision };
        return input;
      } finally {
        plain.fill(0);
      }
    }, current);
  }
  async complete(operationId, current) {
    return this.change((state) => {
      if (state.pending?.operationId === operationId) {
        delete state.pending;
      }
    }, current);
  }
}
