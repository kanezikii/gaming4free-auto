const { chromium } = require('playwright');
const path = require('path');

const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD; 
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

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

async function autoSolveCaptcha(page) {
    try {
        const challengeFrame = page.frameLocator('iframe[src*="recaptcha/api2/bframe"]').first();
        const solverBtn = challengeFrame.locator('#solver-button');
        
        if (await solverBtn.isVisible({ timeout: 2000 })) {
            console.log("  [侦测] 🎧 发现 reCAPTCHA 验证码！正在呼叫 Buster...");
            await solverBtn.click({ force: true });
            console.log("  [侦测] ⏳ 已点击 Buster，等待 12 秒破解...");
            await page.waitForTimeout(12000); 
            console.log("  [侦测] ✅ Buster 破解等待结束。");
            return true;
        }
    } catch (e) {}
    return false;
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，准备环境...");
    const busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');
    
    let context;
    let targetPage;

    try {
        console.log("🔥 [步骤 1] 正在点火启动浏览器 (使用黄金参数组合)...");
        
        context = await chromium.launchPersistentContext('', {
            headless: false,
            timeout: 120000, 
            args: [
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--disable-gpu',             // 🌟 必须：防止 GPU 进程崩溃 (修复刚才的错误)
                '--no-sandbox',              // 🌟 必须：Linux 运行权限
                '--disable-setuid-sandbox',  // 🌟 必须：Linux 运行权限
                '--disable-dev-shm-usage',   // 🌟 必须：防止 Docker 环境下内存溢出
            ],
            ignoreDefaultArgs: ["--mute-audio"],
        });
        console.log("✅ [步骤 1] 浏览器进程拉起成功！");

        console.log("📄 [步骤 2] 正在创建新标签页...");
        const page = await context.newPage();
        targetPage = page;
        console.log("✅ [步骤 2] 标签页创建成功！");

        console.log("🌐 [步骤 3] 正在访问前台登录页...");
        await targetPage.goto('https://gaming4free.net/login', { waitUntil: 'networkidle', timeout: 60000 });
        console.log("✅ [步骤 3] 页面加载完成。");

        console.log("🔑 [步骤 4] 正在输入前台账号密码...");
        await targetPage.locator('input[type="email"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: 'Sign In' }).click();
        
        await targetPage.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
        await targetPage.waitForLoadState('networkidle');

        console.log("🔍 [步骤 5] 检查前台新手引导弹窗...");
        try {
            const skipBtn = targetPage.getByText('Skip', { exact: true });
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            console.log("👀 [步骤 5] 发现并跳过新手引导。");
            await targetPage.waitForTimeout(1000); 
        } catch (error) {
            console.log("✅ [步骤 5] 无新手引导弹窗。");
        }

        console.log("🎛️ [步骤 6] 寻找并点击 Panel 按钮进入后台...");
        const panelPromise = context.waitForEvent('page').catch(() => null);
        await targetPage.locator('a[target="_blank"]').last().click({ force: true });
        
        const newPage = await panelPromise;
        if (newPage) {
            targetPage = newPage;
            await targetPage.waitForLoadState('domcontentloaded');
            console.log("✅ [步骤 6] 已成功切换至后台新标签页。");
        }

        console.log("🔒 [步骤 7] 执行后台二次登录...");
        await targetPage.locator('input[type="email"], input[name="username"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: /LOGIN|登录/i }).click();

        console.log("🤖 [步骤 8] 检查后台登录时是否弹出验证码...");
        const solvedAtLogin = await autoSolveCaptcha(targetPage);
        if (solvedAtLogin) {
            try {
                const loginBtn = targetPage.getByRole('button', { name: /LOGIN|登录/i });
                if (await loginBtn.isVisible({ timeout: 2000 })) {
                    await loginBtn.click({ force: true });
                    console.log("✅ [步骤 8] 破解后已补点登录按钮。");
                }
            } catch(e) {}
        }

        console.log("🖥️ [步骤 9] 寻找你的服务器区块...");
        await targetPage.waitForLoadState('networkidle');
        await targetPage.waitForTimeout(3000);
        
        const serverBlock = targetPage.getByText('My renqi', { exact: false }).first();
        await serverBlock.waitFor({ state: 'visible', timeout: 15000 });
        await serverBlock.click({ force: true });
        console.log("✅ [步骤 9] 已点击服务器区块。");
        
        await targetPage.waitForLoadState('networkidle');

        console.log("💻 [步骤 10] 进入 Console 面板...");
        await targetPage.getByText('Console', { exact: true }).click();
        await targetPage.waitForLoadState('networkidle');

        console.log("⏳ [步骤 11] 点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await addTimeBtn.click({ force: true });
        console.log("✅ [步骤 11] 已点击续期按钮，进入看广告阶段。");

        console.log("📺 [步骤 12] 开启最高 5 分钟的验证码巡逻与弹窗清理...");
        let success = false;
        
        for (let i = 1; i <= 60; i++) {
            await targetPage.waitForTimeout(5000); 
            if (i % 6 === 0) console.log(`  -> 巡逻中... 已等待 ${i * 5} 秒`);
            
            await targetPage.keyboard.press('Escape').catch(() => {});
            try {
                const closeBtn = targetPage.locator('button[aria-label*="lose" i], [class*="close" i], svg.lucide-x').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    await closeBtn.click({ force: true });
                    console.log("  💥 [清理] 检测并强行关闭了一个广告弹窗！");
                }
            } catch (e) {}

            await autoSolveCaptcha(targetPage);

            try {
                const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                if (await waitBtn.isVisible({ timeout: 1000 })) {
                    success = true;
                    console.log("🎉🎉 [步骤 12] 破阵成功！已进入 PLEASE WAIT 续期等待状态！");
                    break;
                }
            } catch (e) {}
        }

        if (!success) {
            throw new Error("🚨 [致命错误] 5分钟已耗尽，未能跳回控制台。");
        }

        console.log("==========================================");
        console.log("🎉 全流程完美收官！发送电报通知...");
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}`);

    } catch (error) {
        console.log("==========================================");
        console.error("❌ 发生崩溃异常:", error.message);
        
        if (targetPage) {
            try {
                console.log("📸 正在对案发现场进行拍照取证...");
                const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
                await targetPage.screenshot({ path: screenshotPath });
                console.log("✅ 取证完毕，截图已保存。");
            } catch (e) {}
        }
        
        await sendTelegramMessage(`⚠️ 续期脚本崩溃！\n账号: ${MC_USERNAME}\n报错: ${error.message.substring(0, 100)}...`);
        process.exit(1);
    } finally {
        if (context) await context.close();
        console.log("🛑 脚本进程强制结束。");
    }
})();
