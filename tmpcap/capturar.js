const { chromium } = require('playwright');
const B = 'http://localhost';
const CUENTAS = { apoderado: ['apoderado@salaabierta.cl', 'apoderado123'], profesor: ['profesor@salaabierta.cl', 'profesor123'], direccion: ['admin@salaabierta.cl', 'admin123'] };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  const shot = async (n, full = true) => { await page.waitForTimeout(1300); await page.screenshot({ path: `capturas/${n}.png`, fullPage: full }); console.log('ok', n); };
  const paso = async (n, fn) => { try { await fn(); } catch (e) { console.log('FALLO', n, e.message.split('\n')[0]); await page.screenshot({ path: `capturas/FALLO_${n}.png` }).catch(() => {}); } };
  const entrar = async (quien) => {
    await page.evaluate(() => localStorage.clear()); await page.goto(B); await page.waitForTimeout(2000);
    await page.getByPlaceholder('correo@colegio.cl').fill(CUENTAS[quien][0]); await page.getByPlaceholder('••••••••').fill(CUENTAS[quien][1]);
    await page.getByText('Ingresar', { exact: true }).click(); await page.waitForTimeout(2500);
  };
  const ir = async (ruta, n) => { await page.goto(B + ruta); await page.waitForTimeout(2200); await shot(n); };
  await page.goto(B); await page.waitForTimeout(2500);
  await paso('login', () => shot('01_login', false));
  await paso('apoderado', async () => {
    await entrar('apoderado'); await shot('02_inicio_apoderado');
    await ir('/apoderado/notas', '03_notas'); await ir('/apoderado/asistencia', '04_asistencia'); await ir('/apoderado/anotaciones', '05_anotaciones');
    await ir('/muro', '06_muro_apoderado'); await ir('/horario', '07_horario'); await ir('/apoderado/certificados', '08_certificados');
    await ir('/apoderado/asistente', '09_sali');
  });
  await paso('profesor', async () => {
    await entrar('profesor'); await shot('10_inicio_profesor');
    await ir('/profesor/asistencia', '11_pasar_asistencia'); await ir('/profesor/notas', '12_registrar_notas'); await ir('/profesor/anotaciones', '13_anotaciones_prof');
    await ir('/muro', '14_muro_profesor'); await ir('/profesor/alertas', '15_alertas');
  });
  await paso('direccion', async () => {
    await entrar('direccion'); await shot('16_inicio_direccion');
    await ir('/admin/resumen', '17_resumen'); await ir('/admin/auditoria', '18_auditoria'); await ir('/admin/umbrales', '19_umbrales'); await ir('/admin/certificados', '20_verificar');
  });
  await browser.close();
})();
