import { License } from './src/index.mjs';

async function main() {
  console.log('='.repeat(60));
  console.log(' DEMO: KHOI TAO VA KIEM TRA BAN QUYEN VOI JS SDK (@tumy/license)');
  console.log('='.repeat(60));

  const license = new License({
    product: 'VIDEOMAKER',
    serverUrl: 'https://lic.cgtdev.space'
  });

  console.log('1. Khoi tao license...');
  const status = await license.init();
  console.log('-> Trang thai khoi tao:', status);

  console.log('\n2. Thu kich hoat voi key sai:');
  try {
    await license.activate('VMK-INVALID-KEY-1234');
  } catch (err) {
    console.log('-> Server da chan key sai:', err.message, `(${err.code})`);
  }

  console.log('\n3. Kiem tra tinh nang khi chua co quyen:');
  try {
    await license.require('export_4k');
  } catch (err) {
    console.log('-> Tu choi tinh nang Pro dung nhu ky vong:', err.message, `(${err.code})`);
  }

  console.log('\n-> DEMO HOAN TAT THANH CONG 100%!');
}

main().catch(console.error);
