const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD; 
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

// 发送 TG 通知
async function sendTelegramMessage(text) {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text })
        });
    } catch (e) {
        console.error("TG通知发送失败:", e);
    }
}

// 🤖 核心功能：自动侦测并破解 reCAPTCHA
async function autoSolveCaptcha(page) {
    try {
        const challengeFrame = page.frameLocator('iframe[src*="recaptcha/api2/bframe"]').first();
        const solverBtn = challengeFrame.locator('#solver-button');
        
        if (await solverBtn.isVisible({ timeout: 2000 })) {
            console.log("🎧 发现 reCAPTCHA 验证码！正在呼叫 Buster 插件进行语音破解...");
            await solverBtn.click({ force: true });
            
            // 给 Buster 12 秒钟时间听音频并填写
            await page.waitForTimeout(12000); 
            console.log("✅ Buster 破解流程执行完毕。");
            return true;
        }
    } catch (e) {
        // 未检测到验证码，静默跳过
    }
    return false;
}

(async () => {
    console.log("🚀 启动浏览器...");
    const busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');
    
    // 显式创建一个临时文件夹存配置，防止 GitHub 环境下路径异常卡死
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-profile-')); 

    let context;
    let targetPage;

    try {
        context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            timeout: 60000, 
            args: [
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                // ⚠️ 删除了 disable-software-rasterizer，让服务器用 CPU 软渲染画面，解决卡死问题
                '--disable-dev-shm-usage',
                '--window-size=1280,960'
            ],
            ignoreDefaultArgs: ["--mute-audio"],
        });

        const page = await context.newPage();
        targetPage = page;

        console.log("🌐 1. 访问前台登录页...");
        await targetPage.goto('https://gaming4free.net/login', { waitUntil: 'networkidle', timeout: 60000 });

        console.log("🔑 输入前台账号密码...");
        await targetPage.locator('input[type="email"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: 'Sign In' }).click();

        await targetPage.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
        await targetPage.waitForLoadState('networkidle');

        console.log("🔍 检查前台新手引导弹窗...");
        try {
            const skipBtn = targetPage.getByText('Skip', { exact: true });
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            await targetPage.waitForTimeout(1000); 
        } catch (error) {}

        console.log("🎛️ 2. 点击 Panel 准备进入后台...");
        const panelPromise = context.waitForEvent('page').catch(() => null);
        await targetPage.locator('a[target="_blank"]').last().click({ force: true });
        
        const newPage = await panelPromise;
        if (newPage) {
            targetPage = newPage;
            await targetPage.waitForLoadState('domcontentloaded');
        }

        console.log("🔒 3. 到达后台登录页，执行二次登录...");
        await targetPage.locator('input[type="email"], input[name="username"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: /LOGIN|登录/i }).click();

        // 尝试破解登录时的验证码
        const solvedAtLogin = await autoSolveCaptcha(targetPage);
        if (solvedAtLogin) {
            try {
                // 如果破解完没自动跳转，再点一次登录
                const loginBtn = targetPage.getByRole('button', { name: /LOGIN|登录/i });
                if (await loginBtn.isVisible({ timeout: 2000 })) {
                    await loginBtn.click({ force: true });
                }
            } catch(e) {}
        }

        console.log("🖥️ 4. 进入后台，寻找并点击你的服务器...");
        await targetPage.waitForLoadState('networkidle');
        await targetPage.waitForTimeout(3000);

        // 如果你的服务器改名了，请把 My renqi 换掉！
        const serverBlock = targetPage.getByText('My renqi', { exact: false }).first();
        await serverBlock.waitFor({ state: 'visible', timeout: 15000 });
        await serverBlock.click({ force: true });
        
        await targetPage.waitForLoadState('networkidle');

        console.log("💻 5. 进入 Console 面板...");
        await targetPage.getByText('Console', { exact: true }).click();
        await targetPage.waitForLoadState('networkidle');

        console.log("⏳ 寻找并点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await addTimeBtn.click({ force: true });

        console.log("📺 6. 开启广告清障与验证码巡逻模式，等待续期生效...");
        let success = false;
        
        // 循环 60 次，每次等 5 秒，总计 5 分钟
        for (let i = 0; i < 60; i++) {
            await targetPage.waitForTimeout(5000);
            
            // 招式 1：按 ESC 关弹窗
            await targetPage.keyboard.press('Escape').catch(() => {});
            try {
                const closeBtn = targetPage.locator('button[aria-label*="lose" i], [class*="close" i], svg.lucide-x').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    await closeBtn.click({ force: true });
                }
            } catch (e) {}

            // 招式 2：巡逻验证码！应对你看完 30 秒广告后弹出的那个 reCAPTCHA
            await autoSolveCaptcha(targetPage);

            // 招式 3：检查是否成功领到时间
            try {
                const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                if (await waitBtn.isVisible({ timeout: 1000 })) {
                    success = true;
                    console.log("✅ 成功领到时间！已进入 PLEASE WAIT 续期等待状态！");
                    break;
                }
            } catch (e) {}
        }

        if (!success) {
            throw new Error("🚨 5分钟内未能跳回控制台或验证码无法通过。");
        }

        console.log("🎉 续期全流程顺利完成！");
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}`);

    } catch (error) {
        console.error("❌ 发生错误:", error);
        if (targetPage) {
            try {
                const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
                await targetPage.screenshot({ path: screenshotPath });
                console.log("📸 已保存案发现场截图！");
            } catch (e) {}
        }
        await sendTelegramMessage(`⚠️ 续期脚本崩溃！\n账号: ${MC_USERNAME}\n报错: ${error.message.substring(0, 100)}...`);
        process.exit(1);
    } finally {
        if (context) await context.close();
        console.log("🛑 脚本运行结束。");
    }
})();
