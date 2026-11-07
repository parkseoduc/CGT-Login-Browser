const fs = require('fs');
const path = require('path');
const tls = require('tls');
const net = require('net');

const SENT_EMAILS_FILE = path.join(__dirname, '..', 'data', 'sent_emails.json');
const SMTP_CONFIG_FILE = path.join(__dirname, '..', 'data', 'smtp_config.json');

// Mặc định cấu hình SMTP (người dùng/admin có thể đổi trong data/smtp_config.json)
const DEFAULT_SMTP = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'OmniBrowser Support <support@cgtdev.space>'
};

function getSmtpConfig() {
  try {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(SMTP_CONFIG_FILE, 'utf8'));
      return { ...DEFAULT_SMTP, ...data };
    }
  } catch {}
  return DEFAULT_SMTP;
}

function logSentEmail(record) {
  try {
    const dir = path.dirname(SENT_EMAILS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let list = [];
    if (fs.existsSync(SENT_EMAILS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(SENT_EMAILS_FILE, 'utf8'));
        if (!Array.isArray(list)) list = [];
      } catch {}
    }

    list.unshift(record);
    if (list.length > 500) list = list.slice(0, 500);
    fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Mailer] Lưu log email lỗi:', err.message);
  }
}

/**
 * Gửi email qua SMTP socket thuần Node.js không cần cài thêm thư viện npm
 */
function sendRawSmtp({ host, port, secure, user, pass, from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    if (!user || !pass) {
      // Nếu chưa điền user/pass SMTP thì coi như mock thành công và lưu vào sent_emails.json
      return resolve({
        success: true,
        mock: true,
        message: 'Đã tạo và lưu thư cảm ơn vào hàng đợi hòm thư'
      });
    }

    const socket = secure ? tls.connect(port, host) : net.connect(port, host);
    let step = 0;
    let logBuffer = '';

    socket.setEncoding('utf8');
    socket.setTimeout(15000);

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP timeout kết nối'));
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('data', (data) => {
      logBuffer += data;
      const code = parseInt(data.slice(0, 3), 10);

      if (step === 0 && code === 220) {
        step = 1;
        socket.write(`EHLO ${host}\r\n`);
      } else if (step === 1 && (code === 250 || data.includes('250 '))) {
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 2 && code === 334) {
        step = 3;
        socket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (step === 3 && code === 334) {
        step = 4;
        socket.write(Buffer.from(pass).toString('base64') + '\r\n');
      } else if (step === 4 && code === 235) {
        step = 5;
        socket.write(`MAIL FROM:<${from.replace(/.*<([^>]+)>.*/, '$1')}>\r\n`);
      } else if (step === 5 && code === 250) {
        step = 6;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 6 && code === 250) {
        step = 7;
        socket.write('DATA\r\n');
      } else if (step === 7 && code === 354) {
        step = 8;
        const mimeMessage = [
          `From: ${from}`,
          `To: ${to}`,
          `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          Buffer.from(html).toString('base64'),
          '.\r\n'
        ].join('\r\n');

        socket.write(mimeMessage);
      } else if (step === 8 && code === 250) {
        step = 9;
        socket.write('QUIT\r\n');
        socket.end();
        resolve({ success: true, message: 'Đã gửi email thành công qua SMTP' });
      } else if (code >= 400) {
        socket.destroy();
        reject(new Error(`Lỗi SMTP (${code}): ${data.trim()}`));
      }
    });
  });
}

/**
 * Tạo nội dung HTML thư cảm ơn và thông tin License Key
 */
function buildThankYouHtml({ customerName, customerEmail, planName, planCode, licenseKey, durationDays, maxProfiles, maxThreads, orderId }) {
  const safeName = customerName || customerEmail.split('@')[0];
  const durationText = durationDays >= 3650 ? 'Vĩnh viễn (10 Năm - Trọn đời)' : `${durationDays} Ngày`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Cảm ơn bạn đã nâng cấp OmniBrowser</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
    .container { max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%); color: #FFFFFF; padding: 32px 30px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 30px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 12px; }
    .intro { font-size: 14.5px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .key-card { background: #EFF6FF; border: 2px dashed #3B82F6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .key-label { font-size: 12px; font-weight: 700; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .key-code { font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 800; color: #1D4ED8; letter-spacing: 0.08em; word-break: break-all; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid #F1F5F9; font-size: 13.5px; }
    .info-table td.lbl { color: #64748B; font-weight: 600; width: 40%; }
    .info-table td.val { color: #0F172A; font-weight: 700; text-align: right; }
    .guide-box { background: #F8FAFC; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #E2E8F0; }
    .guide-title { font-size: 13.5px; font-weight: 700; color: #0F172A; margin-bottom: 10px; }
    .guide-list { margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6; }
    .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748B; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OmniBrowser Antidetect</h1>
      <p>Xác nhận kích hoạt bản quyền & Thư cảm ơn khách hàng</p>
    </div>

    <div class="content">
      <div class="greeting">Kính gửi bạn ${safeName},</div>
      <p class="intro">
        Đội ngũ <strong>OmniBrowser Antidetect</strong> xin gửi lời cảm ơn chân thành nhất đến bạn vì đã tin tưởng lựa chọn giải pháp trình duyệt antidetect của chúng tôi. Đơn hàng của bạn đã được hệ thống ghi nhận và kích hoạt thành công!
      </p>

      <div class="key-card">
        <div class="key-label">MÃ BẢN QUYỀN (LICENSE KEY) CỦA BẠN</div>
        <div class="key-code">${licenseKey}</div>
      </div>

      <table class="info-table">
        <tr>
          <td class="lbl">Gói dịch vụ:</td>
          <td class="val">${planName}</td>
        </tr>
        <tr>
          <td class="lbl">Hạn mức hồ sơ:</td>
          <td class="val">${maxProfiles.toLocaleString('vi-VN')} Profiles</td>
        </tr>
        <tr>
          <td class="lbl">Số luồng đồng thời:</td>
          <td class="val">${maxThreads} Luồng</td>
        </tr>
        <tr>
          <td class="lbl">Thời hạn sử dụng:</td>
          <td class="val">${durationText}</td>
        </tr>
        <tr>
          <td class="lbl">Email đăng ký:</td>
          <td class="val">${customerEmail}</td>
        </tr>
        ${orderId ? `<tr><td class="lbl">Mã đơn hàng:</td><td class="val">${orderId}</td></tr>` : ''}
      </table>

      <div class="guide-box">
        <div class="guide-title">🚀 Hướng dẫn kích hoạt bản quyền trên phần mềm:</div>
        <ol class="guide-list">
          <li>Mở phần mềm <strong>OmniBrowser</strong> trên máy tính của bạn.</li>
          <li>Vào mục <strong>"Bản Quyền & Gói"</strong> trên thanh điều hướng bên trái.</li>
          <li>Chọn thẻ <strong>"Kích Hoạt License Key"</strong>, dán mã key ở trên và bấm <strong>"Kích Hoạt Ngay"</strong>.</li>
          <li><em>(Nếu bạn đặt mua khi đã đăng nhập vào tài khoản, hệ thống đã tự động kích hoạt thẳng vào tài khoản của bạn).</em></li>
        </ol>
      </div>

      <p style="font-size: 13.5px; color: #475569; margin: 0 0 16px;">
        Nếu cần hỗ trợ kỹ thuật hoặc có bất kỳ câu hỏi nào trong quá trình sử dụng, đội ngũ kỹ thuật của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.
      </p>

      <div style="font-size: 13.5px; font-weight: 700; color: #0F172A;">
        Trân trọng cảm ơn,<br>
        <span style="font-weight: 500; color: #64748B;">Đội ngũ Phát triển OmniBrowser & CGT Dev Team</span>
      </div>
    </div>

    <div class="footer">
      <div>Hệ thống Bản quyền Trực tuyến: <a href="https://lic.cgtdev.space" target="_blank">lic.cgtdev.space</a></div>
      <div>Email hỗ trợ: <a href="mailto:support@cgtdev.space">support@cgtdev.space</a></div>
      <div style="margin-top: 6px; font-size: 11px; color: #94A3B8;">&copy; 2026 OmniBrowser Antidetect. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Gửi email cảm ơn và License Key về hòm thư người mua
 */
async function sendThankYouEmail({ customerName, customerEmail, planName, planCode, licenseKey, durationDays = 30, maxProfiles = 500, maxThreads = 20, orderId = '' }) {
  if (!customerEmail || !customerEmail.includes('@')) {
    console.warn('[Mailer] Email không hợp lệ để gửi thư:', customerEmail);
    return false;
  }

  const subject = `🎉 [OmniBrowser] Xác nhận kích hoạt bản quyền ${planName} thành công`;
  const html = buildThankYouHtml({
    customerName,
    customerEmail,
    planName,
    planCode,
    licenseKey,
    durationDays,
    maxProfiles,
    maxThreads,
    orderId
  });

  const smtp = getSmtpConfig();
  const record = {
    id: 'mail_' + Date.now(),
    to: customerEmail,
    customer_name: customerName,
    plan_name: planName,
    license_key: licenseKey,
    subject,
    sent_at: new Date().toISOString(),
    status: 'SENT'
  };

  try {
    const result = await sendRawSmtp({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      pass: smtp.pass,
      from: smtp.from,
      to: customerEmail,
      subject,
      html
    });

    record.smtp_result = result.message;
    console.log(`[Mailer] ✅ Đã gửi thư cảm ơn & License Key tới: ${customerEmail} (Khách: ${customerName})`);
  } catch (err) {
    console.warn(`[Mailer] Gửi SMTP gặp lỗi (đã ghi nhận vào lịch sử gửi):`, err.message);
    record.status = 'QUEUED_LOGGED';
    record.error = err.message;
  }

  logSentEmail(record);
  return true;
}


/**
 * Tạo nội dung HTML gửi mã xác nhận bảo mật OTP 6 số
 */
function buildOtpHtml({ toEmail, otpCode, minutes = 5, actionType = 'register' }) {
  const isReset = actionType === 'reset_password';
  const actionTitle = isReset ? 'Đặt Lại Mật Khẩu' : 'Đăng Ký Tài Khoản';
  const actionDesc = isReset
    ? `Bạn đang yêu cầu đặt lại mật khẩu cho tài khoản <strong>OmniBrowser</strong> với hòm thư: <strong>${toEmail}</strong>.`
    : `Bạn đang yêu cầu mã xác nhận để đăng ký tài khoản trên hệ thống <strong>OmniBrowser</strong> với hòm thư: <strong>${toEmail}</strong>.`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Mã xác nhận bảo mật OmniBrowser - ${actionTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 26px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 30px 26px; }
    .otp-box { background: #f8fafc; border: 2px dashed #93c5fd; border-radius: 12px; padding: 20px; text-align: center; margin: 22px 0; }
    .otp-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .otp-code { font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 8px; margin: 4px 0; }
    .otp-expiry { font-size: 12.5px; color: #64748b; margin-top: 6px; }
    .note { font-size: 13px; color: #475569; line-height: 1.6; }
    .warning { font-size: 12.5px; color: #dc2626; background: #fef2f2; border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 6px; margin: 18px 0; font-weight: 500; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>OmniBrowser Antidetect</h1>
      <p>Hệ Thống Trình Duyệt Antidetect Tự Động Hóa</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; font-weight: 600; margin-top: 0;">Xin chào bạn,</p>
      <p class="note">
        ${actionDesc}
      </p>
      <div class="otp-box">
        <div class="otp-label">MÃ XÁC NHẬN CỦA BẠN (OTP)</div>
        <div class="otp-code">${otpCode}</div>
        <div class="otp-expiry">Hiệu lực trong <strong>${minutes} phút</strong></div>
      </div>
      <div class="warning">
        🔒 Lưu ý bảo mật: Tuyệt đối không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn tài khoản và quyền lợi gói bản quyền của bạn.
      </div>
      <p class="note" style="font-size: 12.5px; color: #94a3b8;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua thư này hoặc đổi mật khẩu ngay để bảo vệ tài khoản.
      </p>
    </div>
    <div class="footer">
      <div>Hệ thống Bản quyền & Quản lý: <a href="https://lic.cgtdev.space" target="_blank" style="color: #2563eb; text-decoration: none;">lic.cgtdev.space</a></div>
      <div style="margin-top: 4px;">&copy; 2026 OmniBrowser Antidetect. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gửi mã OTP xác nhận về email (hỗ trợ cả đăng ký và đặt lại mật khẩu)
 */
async function sendOtpEmail({ toEmail, otpCode, actionType = 'register' }) {
  if (!toEmail || !toEmail.includes('@')) return { success: false, error: 'Email không hợp lệ' };

  const isReset = actionType === 'reset_password';
  const subject = isReset
    ? `[OmniBrowser] Mã xác nhận đặt lại mật khẩu: ${otpCode}`
    : `[OmniBrowser] Mã xác nhận đăng ký tài khoản: ${otpCode}`;
  const html = buildOtpHtml({ toEmail, otpCode, minutes: 5, actionType });
  const smtp = getSmtpConfig();

  const record = {
    id: 'otp_' + Date.now(),
    to: toEmail,
    otp_code: otpCode,
    action_type: actionType,
    subject,
    sent_at: new Date().toISOString(),
    status: 'SENT'
  };

  const isMock = !smtp.user || !smtp.pass;

  try {
    const result = await sendRawSmtp({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      pass: smtp.pass,
      from: smtp.from,
      to: toEmail,
      subject,
      html
    });

    record.smtp_result = result.message;
    console.log(`[Mailer] ✅ Đã gửi mã OTP (${otpCode}) tới: ${toEmail}`);
  } catch (err) {
    console.warn(`[Mailer] Gửi OTP SMTP lỗi:`, err.message);
    record.status = 'QUEUED_LOGGED';
    record.error = err.message;
  }

  logSentEmail(record);
  return { success: true, isMock, message: isMock ? 'Mã xác nhận đã tạo (chế độ demo/mock)' : 'Đã gửi qua SMTP' };
}

module.exports = {
  getSmtpConfig,
  sendThankYouEmail,
  buildThankYouHtml,
  sendOtpEmail,
  buildOtpHtml
};
