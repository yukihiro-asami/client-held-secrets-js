export function mountLoginView(container, client, showResult) {
  const status = document.createElement('p');
  status.id = 'login-status';
  const login = document.createElement('button');
  login.id = 'login';
  login.textContent = '試験用の本人確認でログイン';
  const logout = document.createElement('button');
  logout.id = 'logout';
  logout.textContent = 'ログアウト';
  container.append(status, login, logout);
  function refresh() {
    status.textContent = client.authenticated ? 'ログイン中' : '未ログイン';
  }
  async function run(action) {
    login.disabled = logout.disabled = true;
    try {
      showResult(await action());
    } catch (error) {
      showResult({ error: error.code ?? error.message });
    } finally {
      login.disabled = logout.disabled = false;
      refresh();
    }
  }
  const onLogin = () => run(() => client.login());
  const onLogout = () => run(() => client.logout());
  login.addEventListener('click', onLogin);
  logout.addEventListener('click', onLogout);
  refresh();
  return {
    refresh,
    async resume() {
      await run(() => client.resume());
    },
    destroy() {
      login.removeEventListener('click', onLogin);
      logout.removeEventListener('click', onLogout);
      container.replaceChildren();
    },
  };
}
