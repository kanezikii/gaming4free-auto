const { chromium } = require('playwright');
const path = require('path');

// 🌟 账号密码已硬编码
const MC_USERNAME = 'peng320829@gmail.com';
const MC_PASSWORD = 'Qwer12138@'; 

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

// 增强版验证码侦测，扩大了 iframe 的匹配范围
async function autoSolveCaptcha(page) {
    try {
        const challengeFrame = page.frameLocator('iframe[src*="bframe"], iframe[title*="recaptcha payload" i]').first();
        const solverBtn = challengeFrame.locator('#solver-button');
        
        if (await solverBtn.isVisible({ timeout: 2000 })) {
            console.log("  [侦测] 🎧 发现 reCAPTCHA 验证码阻拦！正在呼叫 Buster...");
            await solverBtn.click({ force: true });
            console.log("  [侦测] ⏳ 已点击 Buster，等待 15 秒破解语音...");
            await page.waitForTimeout(15000); 
            console.log("  [侦测] ✅ Buster 破解动作执行完毕。");
            return true;
        }
    } catch (e) {}
    return false;
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，准备纯净环境...");
    const busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');
    
    let context;
    let targetPage;

    try {
        console.log("🔥 [步骤 1] 正在点火启动浏览器 (启用新一代 --headless=new 原生模式)...");
        
        context = await chromium.launchPersistentContext('', {
            headless: false, 
            timeout: 120000, 
            args: [
                '--headless=new', 
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu' 
            ],
            ignoreDefaultArgs: ["--mute-audio"],
        });
        console.log("✅ [步骤 1] 浏览器进程拉起成功！");

        console.log("📄 [步骤 2] 正在创建新标签页...");
        const page = await context.newPage();
        targetPage = page;
        console.log("✅ [步骤 2] 标签页创建成功！");

        console.log("🌐 [步骤 3] 终极捷径：绕过前台广告，直达核心 Panel 面板...");
        await targetPage.goto('https://panel.gaming4free.net', { waitUntil: 'networkidle', timeout: 60000 });

        console.log("🔒 [步骤 4] 检查面板登录状态...");
        try {
            const emailInput = targetPage.locator('input[name="user"], input[name="username"], input[type="email"]').filter({ state: 'visible' }).first();
            if (await emailInput.isVisible({ timeout: 10000 })) {
                console.log(`🔑 [步骤 4] 发现登录界面，正在填入硬编码账号: ${MC_USERNAME}`);
                await emailInput.click();
                await targetPage.waitForTimeout(500);
                await emailInput.fill(MC_USERNAME);

                const pwdInput = targetPage.locator('input[type="password"]').filter({ state: 'visible' }).first();
                await pwdInput.click();
                await targetPage.waitForTimeout(500);
                await pwdInput.fill(MC_PASSWORD);

                const loginBtn = targetPage.getByRole('button', { name: /LOGIN|登录|Sign In/i }).filter({ state: 'visible' }).first();
                await loginBtn.click({ force: true });
                console.log("⏳ [步骤 4] 账号密码已提交！进入智能驻留防卫模式...");

                // ==========================================
                // 🌟 核心升级：智能驻留巡逻，死盯延迟验证码
                // ==========================================
                let loginSuccess = false;
                for (let i = 0; i < 15; i++) { // 最多等 30 秒
                    // 只要 URL 离开了 auth/login，就说明登录进去了
                    if (!targetPage.url().includes('auth/login')) {
                        loginSuccess = true;
                        console.log("✅ [步骤 4] 成功突破大门，进入后台！");
                        break;
                    }

                    console.log(`  -> 正在侦测是否有延迟弹出的验证码... (扫描 ${i+1}/15)`);
                    const solved = await autoSolveCaptcha(targetPage);
                    
                    if (solved) {
                        // 破解完等 3 秒让绿勾生效
                        await targetPage.waitForTimeout(3000);
                        try {
                            // 如果页面没自动跳，再点一次登录按钮
                            if (await loginBtn.isVisible({ timeout: 1000 })) {
                                await loginBtn.click({ force: true });
                                console.log("  -> 补点登录按钮...");
                            }
                        } catch(e) {}
                    }
                    await targetPage.waitForTimeout(2000);
                }
                
                if (!loginSuccess) {
                     console.log("⚠️ [步骤 4] 30秒内未检测到 URL 跳转，尝试强行继续...");
                }
                // ==========================================

            } else {
                console.log("✅ [步骤 4] 未发现登录框，已免密直达后台！");
            }
        } catch (e) {
            console.log("✅ [步骤 4] 未发现登录框，已免密直达后台！");
        }

        console.log("🖥️ [步骤 5] 正在点击你的 renqi 服务...");
        const serverCard = targetPage.locator('a, div, span').filter({ hasText: /My renqi/i }).first();
        await serverCard.waitFor({ state: 'visible', timeout: 20000 });
        await serverCard.click({ force: true });
        await targetPage.waitForLoadState('networkidle');
        console.log("✅ [步骤 5] 已成功进入专属服务器详情页。");

        console.log("💻 [步骤 6] 点击上部导航栏的 Console...");
        const topConsoleBtn = targetPage.locator('a').filter({ hasText: /^Console$/i }).first();
        await topConsoleBtn.waitFor({ state: 'visible', timeout: 10000 });
        await topConsoleBtn.click({ force: true });
        await targetPage.waitForLoadState('networkidle');
        console.log("✅ [步骤 6] 已切换至 Console 控制台界面。");

        console.log("⏳ [步骤 7] 寻找并点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await addTimeBtn.click({ force: true });
        console.log("✅ [步骤 7] 已点击续期按钮，进入看广告防断网循环。");

        console.log("📺 [步骤 8] 开启最高 5 分钟的验证码巡逻与弹窗清理...");
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
                    console.log("🎉🎉 [步骤 8] 破阵成功！已进入 PLEASE WAIT 续期等待状态！");
                    break;
                }
            } catch (e) {}
        }

        if (!success) {
            throw new Error("🚨 [致命错误] 5分钟已耗尽，未能领到时间。");
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
