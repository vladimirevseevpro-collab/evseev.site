(function () {
  var KEY = 'druckbrot_auth_1978';
  var PIN = '1978';

  function isUnlocked() {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  window.__isEvseevUnlocked = isUnlocked;

  if (isUnlocked()) {
    if (typeof window.__onEvseevAuthUnlocked === 'function') {
      window.__onEvseevAuthUnlocked();
    }
    return;
  }

  // Immediately hide page content to prevent flash before PIN entry
  var hideStyle = document.createElement('style');
  hideStyle.id = 'evseev-auth-hide-style';
  hideStyle.textContent = [
    'html.evseev-locked, html.evseev-locked body { overflow: hidden !important; }',
    'html.evseev-locked body > *:not(#evseev-auth-gate) { filter: blur(16px) !important; pointer-events: none !important; user-select: none !important; }',
    '#evseev-auth-gate {',
    '  position: fixed; inset: 0; z-index: 2147483647;',
    '  background: rgba(7, 8, 12, 0.88);',
    '  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);',
    '  display: flex; align-items: center; justify-content: center;',
    '  padding: 20px; font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '  transition: opacity 0.3s ease, visibility 0.3s ease;',
    '}',
    '#evseev-auth-gate.unlocked { opacity: 0; visibility: hidden; pointer-events: none; }',
    '.evseev-auth-card {',
    '  width: 100%; max-width: 360px;',
    '  background: rgba(18, 22, 34, 0.95);',
    '  border: 1px solid rgba(56, 189, 248, 0.35);',
    '  border-radius: 22px; padding: 28px 24px;',
    '  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.85), 0 0 30px rgba(56, 189, 248, 0.12);',
    '  text-align: center; color: #f8fafc;',
    '  display: flex; flex-direction: column; gap: 14px;',
    '}',
    '.evseev-auth-logo {',
    '  width: 48px; height: 48px; margin: 0 auto;',
    '  background: linear-gradient(135deg, #0284c7, #6366f1);',
    '  border-radius: 14px; display: flex; align-items: center; justify-content: center;',
    '  font-size: 24px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.35);',
    '}',
    '.evseev-auth-badge {',
    '  font-family: ui-monospace, "JetBrains Mono", monospace;',
    '  font-size: 11px; font-weight: 700; letter-spacing: 0.12em;',
    '  text-transform: uppercase; color: #38bdf8;',
    '}',
    '.evseev-auth-title { font-size: 22px; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: -0.3px; }',
    '.evseev-auth-sub { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.4; }',
    '.evseev-pin-input {',
    '  width: 100%; text-align: center;',
    '  font-family: ui-monospace, "JetBrains Mono", monospace;',
    '  font-size: 28px; font-weight: 700; letter-spacing: 0.45em;',
    '  padding: 12px 16px; border-radius: 12px;',
    '  border: 1.5px solid rgba(255, 255, 255, 0.16);',
    '  background: rgba(7, 10, 19, 0.9); color: #ffffff; outline: none;',
    '  transition: border-color 0.15s, box-shadow 0.15s;',
    '  box-sizing: border-box;',
    '}',
    '.evseev-pin-input:focus {',
    '  border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.22);',
    '}',
    '.evseev-pin-input.err {',
    '  border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);',
    '  animation: evseevShake 0.3s ease;',
    '}',
    '.evseev-pin-btn {',
    '  width: 100%; padding: 12px 16px; border-radius: 12px; border: none;',
    '  background: linear-gradient(135deg, #0284c7, #2563eb);',
    '  color: #ffffff; font-size: 14px; font-weight: 700; cursor: pointer;',
    '  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); transition: transform 0.15s, filter 0.15s;',
    '}',
    '.evseev-pin-btn:hover { filter: brightness(1.08); }',
    '.evseev-pin-btn:active { transform: scale(0.98); }',
    '@keyframes evseevShake {',
    '  0%, 100% { transform: translateX(0); }',
    '  25% { transform: translateX(-6px); }',
    '  75% { transform: translateX(6px); }',
    '}'
  ].join('\n');

  document.documentElement.classList.add('evseev-locked');
  (document.head || document.documentElement).appendChild(hideStyle);

  function mountGate() {
    if (document.getElementById('evseev-auth-gate')) return;
    if (!document.body) {
      requestAnimationFrame(mountGate);
      return;
    }

    var gate = document.createElement('div');
    gate.id = 'evseev-auth-gate';
    gate.innerHTML = [
      '<div class="evseev-auth-card">',
      '  <div class="evseev-auth-logo">🔒</div>',
      '  <div class="evseev-auth-badge">EVSEEV.SITE · PRIVATE HUB</div>',
      '  <h2 class="evseev-auth-title">Код доступа</h2>',
      '  <p class="evseev-auth-sub">Введите 4-значный пароль для входа на сайт:</p>',
      '  <input id="evseev-pin-field" class="evseev-pin-input" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off" autofocus>',
      '  <button id="evseev-pin-btn" class="evseev-pin-btn" type="button">Войти</button>',
      '</div>'
    ].join('');

    document.body.appendChild(gate);

    var field = document.getElementById('evseev-pin-field');
    var btn = document.getElementById('evseev-pin-btn');

    function unlock() {
      try {
        localStorage.setItem(KEY, '1');
      } catch (e) {}
      document.documentElement.classList.remove('evseev-locked');
      gate.classList.add('unlocked');
      field.blur();
      setTimeout(function () {
        if (gate.parentNode) gate.parentNode.removeChild(gate);
      }, 350);
      if (typeof window.__onEvseevAuthUnlocked === 'function') {
        window.__onEvseevAuthUnlocked();
      }
    }

    function checkPin() {
      var val = (field.value || '').trim();
      if (val === PIN) {
        unlock();
      } else if (val.length >= 4) {
        field.classList.remove('err');
        void field.offsetWidth;
        field.classList.add('err');
        field.value = '';
      }
    }

    field.addEventListener('input', function () {
      if ((field.value || '').trim() === PIN) {
        checkPin();
      }
    });

    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkPin();
      }
    });

    btn.addEventListener('click', checkPin);
    setTimeout(function () {
      try { field.focus(); } catch (e) {}
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountGate);
  } else {
    mountGate();
  }
})();
