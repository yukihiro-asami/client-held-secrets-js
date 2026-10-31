import { AuthClient } from '/core/auth/browser/client.js';
import { mountLoginView } from '/core/auth/browser/login-view.js';
export const status = document.querySelector('#message');
export const client = new AuthClient((await (await fetch('/config')).json()).appId);
const authChannel = new BroadcastChannel('rainfrog-auth-ui');
const notify = (type) => window.dispatchEvent(new Event(type));
const request = client.request.bind(client);
client.request = async (...args) => {
  const wasAuthenticated = client.authenticated;
  try {
    return await request(...args);
  } finally {
    if (wasAuthenticated && !client.authenticated) {
      notify('rainfrog-auth-clear');
    }
  }
};
const logout = client.logout.bind(client);
client.logout = async () => {
  notify('rainfrog-auth-clear');
  authChannel.postMessage('logout');
  return logout();
};
authChannel.addEventListener('message', () => notify('rainfrog-auth-clear'));
export const login = mountLoginView(document.querySelector('#login'), client, () => {
  status.textContent = client.authenticated ? 'ログインしました。内容を取得できます。' : '';
  notify('rainfrog-auth-change');
});
export async function run(action) {
  try {
    await action();
  } catch (error) {
    status.textContent = `確認してください：${error.code ?? error.message}`;
  }
  login.refresh();
}
await login.resume();
