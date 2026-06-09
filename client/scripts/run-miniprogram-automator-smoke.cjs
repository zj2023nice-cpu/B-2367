const fs = require('node:fs');
const path = require('node:path');
const automator = require('miniprogram-automator');

const DEFAULT_CLI_PATH = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
const INVALID_ADDRESS = 'adfasdfghjklqwertyuiopzzzz';
const LOGIN_USERNAME = 'admin';
const LOGIN_PASSWORD = '123456';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(miniProgram, expectedPath, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const page = await miniProgram.currentPage();
    if (page && page.path === expectedPath) {
      return page;
    }
    await sleep(250);
  }
  throw new Error(`Timeout waiting for page path: ${expectedPath}`);
}

async function screenshot(miniProgram, dir, name) {
  const outputPath = path.join(dir, name);
  await miniProgram.screenshot({ path: outputPath });
  return outputPath;
}

async function readText(page, selector) {
  const el = await page.$(selector);
  if (!el) {
    return '';
  }
  return el.text();
}

async function run() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const projectPath = path.resolve(__dirname, '..');
  const artifactsDir = path.join(repoRoot, 'miniprogram-automator-artifacts');
  const reportPath = path.join(repoRoot, 'miniprogram-automator-report.json');
  const cliPath = process.env.WECHAT_DEVTOOLS_CLI || DEFAULT_CLI_PATH;

  fs.mkdirSync(artifactsDir, { recursive: true });

  const report = {
    startedAt: new Date().toISOString(),
    cliPath,
    projectPath,
    artifactsDir,
    steps: {},
  };

  let miniProgram;

  try {
    miniProgram = await automator.launch({
      projectPath,
      cliPath,
      timeout: 120000,
    });

    let page = await miniProgram.currentPage();
    report.steps.launch = {
      ok: true,
      path: page ? page.path : '',
    };
    report.steps.login_screen = {
      ok: true,
      screenshot: await screenshot(miniProgram, artifactsDir, '01-login.png'),
      title: await readText(page, '.login-title'),
    };

    const inputs = await page.$$('.input-field');
    if (inputs.length < 2) {
      throw new Error(`Expected 2 login inputs, got ${inputs.length}`);
    }
    await inputs[0].input(LOGIN_USERNAME);
    await inputs[1].input(LOGIN_PASSWORD);
    const loginButton = await page.$('.login-btn');
    if (!loginButton) {
      throw new Error('Missing .login-btn');
    }
    await loginButton.tap();

    page = await waitForPath(miniProgram, 'pages/home/index');
    const welcomeText = await readText(page, '.home-welcome-main');
    report.steps.login_submit = {
      ok: welcomeText.includes('特产日程'),
      path: page.path,
      welcomeText,
      screenshot: await screenshot(miniProgram, artifactsDir, '02-home.png'),
    };

    page = await miniProgram.switchTab('/pages/specialties/index');
    await page.waitFor('.specialty-card');
    const specialtyCards = await page.$$('.specialty-card');
    report.steps.specialties = {
      ok: specialtyCards.length >= 6,
      cardCount: specialtyCards.length,
      firstTitle: await readText(page, '.specialty-title'),
      screenshot: await screenshot(miniProgram, artifactsDir, '03-specialties.png'),
    };

    const firstLocationButton = await page.$('.location-btn');
    if (!firstLocationButton) {
      throw new Error('Missing .location-btn on specialties page');
    }
    await firstLocationButton.tap();
    page = await waitForPath(miniProgram, 'pages/map/index');
    await page.waitFor(1200);
    const mapInfoText = await readText(page, '.map-info-label');
    const mapErrorText = await readText(page, '.map-error-text');
    report.steps.map_success = {
      ok: mapInfoText.length > 0,
      mapInfoText,
      mapErrorText,
      screenshot: await screenshot(miniProgram, artifactsDir, '04-map-success.png'),
    };

    page = await miniProgram.reLaunch(`/pages/map/index?address=${INVALID_ADDRESS}`);
    await page.waitFor('.map-error-text');
    const failText = await readText(page, '.map-error-text');
    const failAddressText = await readText(page, '.map-error-address');
    report.steps.map_fail = {
      ok: failText.includes('地址解析失败') || failText.includes('未找到该地址'),
      failText,
      failAddressText,
      screenshot: await screenshot(miniProgram, artifactsDir, '05-map-fail.png'),
    };

    page = await miniProgram.switchTab('/pages/schedule/index');
    await page.waitFor('.schedule-card');
    const scheduleCards = await page.$$('.schedule-card');
    report.steps.schedule = {
      ok: scheduleCards.length >= 6,
      cardCount: scheduleCards.length,
      firstTitle: await readText(page, '.schedule-title'),
      screenshot: await screenshot(miniProgram, artifactsDir, '06-schedule.png'),
    };

    page = await miniProgram.switchTab('/pages/user/index');
    await page.waitFor('.avatar-wrap');

    const avatarBeforeEl = await page.$('.avatar-img');
    const avatarBeforeSrc = avatarBeforeEl ? await avatarBeforeEl.attribute('src').catch(() => '') : '';
    const mockedAvatarPath = `wxfile://tmp/mcp-avatar-${Date.now().toString().slice(-6)}.jpg`;

    await miniProgram.mockWxMethod('chooseImage', {
      tempFilePaths: [mockedAvatarPath],
      tempFiles: [{ path: mockedAvatarPath, size: 1234 }],
      errMsg: 'chooseImage:ok',
    });

    try {
      const avatarWrap = await page.$('.avatar-wrap');
      if (!avatarWrap) {
        throw new Error('Missing .avatar-wrap on user page');
      }
      await avatarWrap.tap();

      // chooseImage 会引发页面 hide/show，重新获取当前页面对象避免 page destroyed。
      page = await waitForPath(miniProgram, 'pages/user/index');
      await page.waitFor('.avatar-wrap');
      await page.waitFor(1000);

      const avatarAfterEl = await page.$('.avatar-img');
      const avatarAfterSrc = avatarAfterEl ? await avatarAfterEl.attribute('src').catch(() => '') : '';
      report.steps.avatar_update = {
        ok: Boolean(avatarAfterSrc) && avatarAfterSrc !== avatarBeforeSrc,
        beforeSrc: avatarBeforeSrc,
        afterSrc: avatarAfterSrc,
        screenshot: await screenshot(miniProgram, artifactsDir, '07-avatar-updated.png'),
      };
    } finally {
      await miniProgram.restoreWxMethod('chooseImage').catch(() => {});
    }

    await page.waitFor('.name-row');
    const nickname = `MCP-${Date.now().toString().slice(-6)}`;
    const nameRow = await page.$('.name-row');
    if (!nameRow) {
      throw new Error('Missing .name-row on user page');
    }
    await nameRow.tap();
    await page.waitFor('.nickname-input');
    const nicknameInput = await page.$('.nickname-input');
    if (!nicknameInput) {
      throw new Error('Missing .nickname-input');
    }
    await nicknameInput.input(nickname);
    const saveButton = await page.$('.save-btn');
    if (!saveButton) {
      throw new Error('Missing .save-btn');
    }
    await saveButton.tap();
    await page.waitFor('.nickname-text');
    const savedNickname = await readText(page, '.nickname-text');
    report.steps.user_save = {
      ok: savedNickname.trim() === nickname,
      expectedNickname: nickname,
      actualNickname: savedNickname,
      screenshot: await screenshot(miniProgram, artifactsDir, '08-user.png'),
    };

    const logoutButton = await page.$('.logout-btn');
    if (!logoutButton) {
      throw new Error('Missing .logout-btn');
    }
    await logoutButton.tap();
    await sleep(300);
    try {
      await miniProgram.native().confirmModal();
    } catch (error) {
      report.steps.logout_modal = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    page = await waitForPath(miniProgram, 'pages/login/index');
    report.steps.logout = {
      ok: true,
      path: page.path,
      screenshot: await screenshot(miniProgram, artifactsDir, '09-after-logout.png'),
    };

    const stepNames = [
      'launch',
      'login_screen',
      'login_submit',
      'specialties',
      'map_success',
      'map_fail',
      'schedule',
      'avatar_update',
      'user_save',
      'logout',
    ];
    const failedSteps = stepNames.filter((name) => !report.steps[name] || report.steps[name].ok !== true);

    report.finishedAt = new Date().toISOString();
    report.summary = {
      pass: failedSteps.length === 0,
      failedSteps,
    };
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.summary = {
      pass: false,
      failedSteps: ['runtime'],
    };
    report.runtimeError = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    try {
      if (miniProgram) {
        await miniProgram.close();
      }
    } catch (_) {
      // ignore close errors
    }

    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // Keep a concise stdout summary for CI/local use.
    const summary = report.summary || { pass: false, failedSteps: ['unknown'] };
    console.log(JSON.stringify({ reportPath, artifactsDir, summary }, null, 2));
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
