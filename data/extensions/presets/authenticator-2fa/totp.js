// Simple Base32 decode & SHA1 HMAC for 2FA TOTP
function base32tohex(base32) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  base32 = base32.replace(/=+$/, "").toUpperCase().replace(/\s/g, '');
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

async function hmacSha1(keyHex, messageHex) {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const msgBytes = new Uint8Array(messageHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: { name: "SHA-1" } }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return new Uint8Array(signature);
}

async function getTOTP(secret) {
  try {
    const keyHex = base32tohex(secret);
    if (!keyHex) return 'ERROR';
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / 30);
    const timeHex = timeStep.toString(16).padStart(16, '0');
    const hmacResult = await hmacSha1(keyHex, timeHex);
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const binary = ((hmacResult[offset] & 0x7f) << 24) |
                   ((hmacResult[offset + 1] & 0xff) << 16) |
                   ((hmacResult[offset + 2] & 0xff) << 8) |
                   (hmacResult[offset + 3] & 0xff);
    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  } catch (e) {
    return 'ERROR';
  }
}

let storedAccounts = [];

function loadStored() {
  chrome.storage.local.get(['twoFaAccounts'], (res) => {
    storedAccounts = res.twoFaAccounts || [
      { label: 'Demo Account', secret: 'JBSWY3DPEHPK3PXP' }
    ];
    updateCodes();
  });
}

async function updateCodes() {
  const container = document.getElementById('keys-container');
  container.innerHTML = '';
  
  const epoch = Math.floor(Date.now() / 1000);
  const remaining = 30 - (epoch % 30);
  document.getElementById('countdown').textContent = remaining + 's';

  for (let i = 0; i < storedAccounts.length; i++) {
    const acc = storedAccounts[i];
    const code = await getTOTP(acc.secret);
    const div = document.createElement('div');
    div.className = 'auth-card';
    div.innerHTML = `
      <div>
        <div class="auth-label">${acc.label}</div>
        <div class="auth-code">${code}</div>
      </div>
      <button style="padding:4px 8px; font-size:10px; color:#f87171;" class="btn-del" data-index="${i}">Xoá</button>
    `;
    div.onclick = (e) => {
      if (e.target.classList.contains('btn-del')) return;
      navigator.clipboard.writeText(code).then(() => {
        alert(`Đã chép mã 2FA ${code} vào bộ nhớ tạm!`);
      });
    };
    container.appendChild(div);
  }

  container.querySelectorAll('.btn-del').forEach(b => {
    b.onclick = (e) => {
      const idx = Number(e.target.dataset.index);
      storedAccounts.splice(idx, 1);
      chrome.storage.local.set({ twoFaAccounts: storedAccounts }, updateCodes);
    };
  });
}

document.getElementById('btn-add-toggle').onclick = () => {
  const form = document.getElementById('add-form');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
};

document.getElementById('btn-cancel-add').onclick = () => {
  document.getElementById('add-form').style.display = 'none';
};

document.getElementById('btn-save-key').onclick = () => {
  const label = document.getElementById('input-label').value.trim() || 'Account';
  const secret = document.getElementById('input-secret').value.trim().replace(/\s/g, '');
  if (!secret) return alert('Vui lòng nhập secret key');

  storedAccounts.push({ label, secret });
  chrome.storage.local.set({ twoFaAccounts: storedAccounts }, () => {
    document.getElementById('input-label').value = '';
    document.getElementById('input-secret').value = '';
    document.getElementById('add-form').style.display = 'none';
    updateCodes();
  });
};

setInterval(updateCodes, 1000);
loadStored();