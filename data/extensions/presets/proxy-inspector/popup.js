async function checkIp() {
  document.getElementById('ip-val').textContent = 'Đang tải...';
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    document.getElementById('ip-val').textContent = data.ip || 'Unknown';
    document.getElementById('country-val').textContent = (data.country_name || '') + ' (' + (data.country_code || '') + ')';
    document.getElementById('city-val').textContent = data.city || 'Unknown';
    document.getElementById('isp-val').textContent = data.org || 'Unknown';
  } catch (e) {
    document.getElementById('ip-val').textContent = 'Lỗi kết nối';
  }
}
document.getElementById('btn-recheck').onclick = checkIp;
checkIp();