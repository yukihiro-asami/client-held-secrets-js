export const DB_NAME = 'rainfrog-local-auth-v1';

async function transaction(mode, action) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('identities');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction('identities', mode);
      let value;
      action(tx.objectStore('identities'), (result) => {
        value = result;
      });
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'));
    });
  } finally {
    database.close();
  }
}

export function readIdentity(appId) {
  return transaction('readonly', (store, result) => {
    store.get(appId).onsuccess = (event) => result(event.target.result);
  });
}

export function saveIdentity(appId, identity) {
  return transaction('readwrite', (store) => {
    store.put(identity, appId);
  });
}

// Compare inside one transaction so a late response cannot overwrite another tab's login.
export function setLogin(appId, publicKey, expectedLoginId, loginId) {
  return transaction('readwrite', (store, result) => {
    store.get(appId).onsuccess = (event) => {
      const identity = event.target.result;
      if (identity?.publicKey === publicKey && identity.loginId === expectedLoginId) {
        store.put({ ...identity, loginId }, appId);
        result(true);
      } else {
        result(false);
      }
    };
  });
}
