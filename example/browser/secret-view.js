import { SecretStorage } from './secret-storage.js';
import { verifyReceipt } from './selected-crypto.js';
import { cardBytes } from '../secret-wire.js';

const explanations = {
  invalid_card_number: '13〜19桁の数字で入力してください。空白とハイフンは除去します。',
  pending_operation: '前回の利用結果を確認してください。',
  card_changed: '別の画面でカードが変更されました。内容を確認し直してください。',
  provider_key_changed: '提供元の鍵が更新されました。結果を確認してから、改めて利用してください。',
  invalid_secret_envelope: '暗号化した情報を確認できませんでした。結果を確認してください。',
  invalid_receipt:
    '利用記録の署名を確認できませんでした。成功として扱わず、結果を再確認してください。',
  secrets_unavailable: 'この環境ではカードの利用処理を準備していません。',
};

export function mountSecretView(root, client) {
  const $ = (id) => root.querySelector(`#${id}`);
  const input = $('card-number');
  const message = $('card-message');
  const confirm = $('card-confirm');
  let epoch = 0;
  let storage;
  let context;
  let description = {};
  let transport;
  let busy = false;
  let confirmAction;
  let notFound = false;
  const channel = new BroadcastChannel('rainfrog-secrets-v1');
  const current = (stamp) => stamp === epoch && client.authenticated;

  function clear() {
    epoch += 1;
    input.value = '';
    transport = undefined;
    storage = undefined;
    context = undefined;
    description = {};
    confirmAction = undefined;
    busy = false;
    notFound = false;
    root.hidden = true;
    confirm.hidden = true;
    message.textContent = '';
    $('card-state').textContent = '';
    $('card-receipt').textContent = '';
  }
  function controls() {
    input.disabled = busy || Boolean(description.pending);
    $('card-save').disabled = busy || Boolean(description.pending);
    $('card-delete').disabled =
      busy || Boolean(description.pending) || (!description.last4 && !description.unreadable);
    $('card-use').disabled = busy || Boolean(description.pending) || !description.last4;
    $('card-pending').hidden = !description.pending;
    $('card-result').disabled = busy;
    $('card-retry').hidden = !transport;
    $('card-retry').disabled = busy;
    $('card-abandon').hidden = !notFound;
    $('card-abandon').disabled = busy;
    $('card-accept').disabled = busy;
    $('card-cancel').disabled = busy;
  }
  async function refresh(stamp) {
    const next = await storage.describe();
    if (!current(stamp)) {
      return;
    }
    description = next;
    $('card-state').textContent = next.unreadable
      ? '保存情報を読み出せません。カード番号を再入力して置き換えるか、削除してください。'
      : next.last4
        ? `保存済み · 末尾 ${next.last4}`
        : 'このブラウザにはまだ保存していません。';
    controls();
  }
  async function perform(action) {
    if (busy || !storage || !client.authenticated) {
      return;
    }
    const stamp = epoch;
    busy = true;
    controls();
    try {
      await action(stamp);
    } catch (error) {
      if (current(stamp)) {
        message.textContent =
          explanations[error.code ?? error.message] ??
          '処理を完了できませんでした。通信とログイン状態を確認してください。';
      }
    } finally {
      if (current(stamp)) {
        busy = false;
        await refresh(stamp).catch(() => {
          message.textContent =
            'ブラウザの保存領域を読み出せません。サイトデータの設定を確認してください。';
        });
        controls();
      }
    }
  }
  function ask(text, action, dangerous = false) {
    $('card-confirm-text').textContent = text;
    $('card-accept').className = dangerous ? 'danger' : 'primary';
    $('card-accept').textContent = dangerous ? '削除する' : '確認して実行';
    confirmAction = action;
    confirm.hidden = false;
    $('card-accept').focus();
  }
  async function save(stamp) {
    let plain;
    try {
      plain = cardBytes(input.value);
      input.value = '';
      await storage.save(plain, () => current(stamp));
      if (current(stamp)) {
        message.textContent =
          'このブラウザに暗号化して保存しました。カード番号は送信していません。';
        $('card-receipt').textContent = '';
      }
    } finally {
      plain?.fill(0);
    }
  }
  async function acceptReceipt(receipt, provider, pending, stamp) {
    const result = await verifyReceipt(receipt, provider.receiptKeys, context, pending);
    if (!current(stamp)) {
      return;
    }
    await storage.complete(pending.operationId, () => current(stamp));
    if (current(stamp)) {
      transport = undefined;
      notFound = false;
      $('card-receipt').textContent =
        `番号の形式確認 · ${new Date(result.completedAt).toLocaleString('ja-JP')} · 提供元の署名を確認済み`;
      message.textContent = '形式確認が完了しました。決済は行っていません。';
    }
  }
  async function send(stamp) {
    const input = transport;
    const receipt = await client.request('/api/secrets/use', { method: 'POST', body: input });
    if (!current(stamp)) {
      return;
    }
    const provider = await client.request('/api/secrets/keys');
    if (current(stamp)) {
      await acceptReceipt(receipt, provider, input.manifest, stamp);
    }
  }
  async function checkResult(stamp) {
    const pending = description.pending;
    const receipt = await client.request('/api/secrets/result', {
      method: 'POST',
      body: { operationId: pending.operationId },
    });
    if (!current(stamp)) {
      return;
    }
    if (receipt.status === 'not_found') {
      notFound = true;
      message.textContent =
        '利用記録がまだ見つかりません。処理中や通信中断の可能性があり、未実行とは断定できません。しばらくして再確認できます。';
      return;
    }
    const provider = await client.request('/api/secrets/keys');
    if (current(stamp)) {
      await acceptReceipt(receipt, provider, pending, stamp);
    }
  }

  $('card-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (description.last4 || description.unreadable) {
      ask(
        `保存済みの${description.last4 ? `末尾 ${description.last4} の` : '読み出せない'}カードを、入力した番号に置き換えます。保存先はこのブラウザだけです。`,
        save,
      );
    } else {
      void perform(save);
    }
  });
  $('card-delete').addEventListener('click', () => {
    ask(
      `${description.last4 ? `末尾 ${description.last4} の` : '読み出せない'}カードをこのブラウザから削除します。再利用には番号の再入力が必要です。`,
      async (stamp) => {
        await storage.remove(() => current(stamp));
        if (current(stamp)) {
          input.value = '';
          $('card-receipt').textContent = '';
          message.textContent = '保存したカードを削除しました。';
        }
      },
      true,
    );
  });
  $('card-use').addEventListener('click', () => {
    const revision = description.revision;
    ask(
      `末尾 ${description.last4} の番号を「番号の形式確認」のために提供元で一時的に復号します。番号は提供元に保存しません。決済は行いません。`,
      async (stamp) => {
        $('card-receipt').textContent = '';
        const provider = await client.request('/api/secrets/keys');
        if (!current(stamp)) {
          return;
        }
        const input = await storage.prepare(provider, revision, () => current(stamp));
        if (!current(stamp)) {
          return;
        }
        transport = input;
        notFound = false;
        message.textContent = '利用結果を確認しています。';
        await send(stamp);
      },
    );
  });
  $('card-result').addEventListener('click', () => void perform(checkResult));
  $('card-retry').addEventListener('click', () => {
    ask('前回と同じ暗号化要求を再送し、利用記録を取得します。同じ操作は二重に記録しません。', send);
  });
  $('card-abandon').addEventListener('click', () => {
    const operationId = description.pending.operationId;
    ask(
      '前回の処理結果は未確認のままです。この確認待ちを終了しますか。後で利用し直す場合は別の操作になります。',
      async (stamp) => {
        await storage.complete(operationId, () => current(stamp));
        if (current(stamp)) {
          transport = undefined;
          notFound = false;
          message.textContent = '確認待ちを終了しました。前回の処理の取り消しを意味しません。';
        }
      },
    );
  });
  $('card-accept').addEventListener('click', () => {
    const action = confirmAction;
    confirmAction = undefined;
    confirm.hidden = true;
    if (action) {
      void perform(action);
    }
  });
  $('card-cancel').addEventListener('click', () => {
    confirmAction = undefined;
    confirm.hidden = true;
    input.value = '';
  });
  async function synchronize() {
    clear();
    if (!client.authenticated) {
      return;
    }
    const stamp = epoch;
    try {
      const identity = await client.request('/auth/status');
      if (!current(stamp)) {
        return;
      }
      context = { origin: location.origin, appId: identity.appId, userId: identity.userId };
      storage = new SecretStorage(context);
      await refresh(stamp);
      if (current(stamp)) {
        root.hidden = false;
        if (description.pending) {
          message.textContent = '前回の利用結果が未確認です。番号を再送せずに結果を確認できます。';
        }
      }
    } catch {
      if (current(stamp)) {
        root.hidden = false;
        message.textContent =
          'カードの保存領域を準備できません。ブラウザの設定とログイン状態を確認してください。';
        root.querySelectorAll('button, input').forEach((element) => {
          element.disabled = true;
        });
      }
    }
  }
  window.addEventListener('rainfrog-auth-change', () => void synchronize());
  window.addEventListener('rainfrog-auth-clear', clear);
  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      void synchronize();
    }
  });
  channel.addEventListener('message', (event) => {
    if (storage && JSON.stringify(event.data) === JSON.stringify(storage.key)) {
      confirmAction = undefined;
      confirm.hidden = true;
      input.value = '';
      void perform(async (stamp) => {
        const next = await storage.describe();
        if (current(stamp) && next.revision !== description.revision) {
          $('card-receipt').textContent = '';
          message.textContent = '';
        }
        if (current(stamp) && next.pending?.operationId !== transport?.manifest.operationId) {
          transport = undefined;
          notFound = false;
        }
      });
    }
  });
  void synchronize();
}
