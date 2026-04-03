const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 🌟 账号密码硬编码
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

// 终极版验证码克星：加入自动寻路与强制语音模式
async function autoSolveCaptcha(page) {
    try {
        const challengeFrame = page.frameLocator('iframe[src*="api2/bframe"]').first();
        
        if (await challengeFrame.locator('.rc-imageselect-payload, #rc-imageselect').isVisible({ timeout: 2000 })) {
            console.log("  [侦测] 🎧 发现 reCAPTCHA 验证码阻拦！");
            
            let solverBtn = challengeFrame.locator('#solver-button');
            
            // 如果没看到小黄人图标，先强行点击“耳机”图标切换到语音模式
            if (!(await solverBtn.isVisible({ timeout: 2000 }))) {
                console.log("  [侦测] ⚠️ 首屏未见 Buster 图标，强行点击耳机切入语音模式！");
                const audioBtn = challengeFrame.locator('#recaptcha-audio-button');
                if (await audioBtn.isVisible({ timeout: 2000 })) {
                    await audioBtn.click({ force: true });
                    await page.waitForTimeout(1500); // 等待语音面板滑出
                }
            }

            // 再次检查小黄人图标
            if (await solverBtn.isVisible({ timeout: 3000 })) {
                console.log("  [侦测] 🤖 成功锁定 Buster 小黄人图标！正在点击破解...");
                await solverBtn.click({ force: true });
                console.log("  [侦测] ⏳ 已启动 Buster，等待 15 秒聆听并破解语音...");
                await page.waitForTimeout(15000); 
                console.log("  [侦测] ✅ Buster 破解动作执行完毕。");
                return true;
            } else {
                console.log("  [侦测] 🚨 致命异常：已经切入语音模式，但 Buster 插件仍未加载！可能是路径错误或被拦截。");
            }
        }
    } catch (e) {}
    return false;
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，执行环境自检...");
    
    // 🌟 核心修复：自动雷达扫描 Buster 插件的真实路径
    let busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');
    if (!fs.existsSync(busterPath)) {
        busterPath = path.join(__dirname, 'extensions', 'buster');
        if (!fs.existsSync(busterPath)) {
            busterPath = path.join(__dirname, 'buster'); // 兜底查找
        }
    }
    console.log(`📂 [环境检查] 动态锁定的 Buster 插件路径: ${busterPath}`);
    if (!fs.existsSync(busterPath)) {
         console.log("🚨 [致命警告] 无法在当前目录找到 Buster 插件！接下来的验证码将无法破解！");
    }

    let context;
    let targetPage;

    try {
        console.log("🔥 [步骤 1] 正在点火启动浏览器 (启用解除跨域限制的终极参数)...");
        
        context = await chromium.launchPersistentContext('', {
            headless: false, 
            timeout: 120000, 
            args: [
                '--headless=new', 
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--disable-web-security', // 🌟 关键：干掉网页的安全策略拦截，让插件畅通无阻
                '--disable-site-isolation-trials',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu' 
            ],
            ignoreDefaultArgs: ["--mute-audio"],
        });
        console.log("✅ [步骤 1] 浏览器进程拉起成功！");

        const page = await context.newPage();
        targetPage = page;
        console.log("✅ [步骤 2] 标签页创建成功！");

        console.log("🌐 [步骤 3] 终极捷径：直达核心 Panel 面板...");
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
                console.log("⏳ [步骤 4] 账号密码已提交！进入最高警戒：盯防验证码...");

                let loginSuccess = false;
                for (let i = 0; i < 15; i++) { 
                    if (!targetPage.url().includes('auth/login')) {
                        loginSuccess = true;
                        console.log("🎉 [步骤 4] 验证通过！成功突破大门进入后台！");
                        break;
                    }

                    console.log(`  -> 正在扫视是否有验证码... (扫描 ${i+1}/15)`);
                    const solved = await autoSolveCaptcha(targetPage);
                    
                    if (solved) {
                        await targetPage.waitForTimeout(3000); // 破解完等一会儿让动画转圈结束
                        try {
                            if (await loginBtn.isVisible({ timeout: 1000 })) {
                                await loginBtn.click({ force: true });
                                console.log("  -> 验证完毕，重新补点登录按钮...");
                            }
                        } catch(e) {}
                    }
                    await targetPage.waitForTimeout(2000);
                }
                
                // 🛑 核心防线：如果 30 秒了还没进去（大概率是被验证码卡死），直接报错退出，不往后走！
                if (!loginSuccess) {
                     throw new Error("🚨 登录被拦截！30秒内未能成功进入后台，可能是验证码破解失败或账号密码错误！");
                }

            } else {
                console.log("✅ [步骤 4] 未发现登录框，已免密直达后台！");
            }
        } catch (e) {
            if(e.message.includes("登录被拦截")) throw e;
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
            if (i % 6 === 0) console.log(`  -> 广告倒计时巡逻中... 已等待 ${i * 5} 秒`);
            
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
