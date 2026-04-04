// 🌟 引入隐身增强版 Playwright
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); 

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

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
    } catch (e) {}
}

// 🌟 终极验证码克星
async function autoSolveCaptcha(page) {
    try {
        const bframeLocators = page.frameLocator('iframe[src*="api2/bframe"]');
        const count = await bframeLocators.count();
        
        for (let i = 0; i < count; i++) {
            const bframe = bframeLocators.nth(i);
            const isActive = await bframe.locator('.rc-imageselect-payload, .rc-audiochallenge-payload').first().isVisible({timeout: 1000}).catch(()=>false);
            
            if (isActive) {
                console.log(`  [侦测] 🎧 锁定当前活动的 reCAPTCHA 弹窗 (Frame ${i})！`);
                
                const audioBtn = bframe.locator('#recaptcha-audio-button');
                const solverBtn = bframe.locator('#solver-button');

                await solverBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(()=>{});

                if (await solverBtn.count() > 0) {
                    console.log("  [侦测] 🤖 成功锁定 Buster！使用 dispatchEvent 强制引爆点击...");
                    await solverBtn.dispatchEvent('click');
                    console.log("  [侦测] ⏳ 已经触发 Buster，等待 15 秒聆听并破解...");
                    await page.waitForTimeout(15000); 
                    console.log("  [侦测] ✅ Buster 破解回合结束。");
                    return true;
                } else if (await audioBtn.count() > 0) {
                    console.log("  [侦测] ⚠️ 未见 Buster，强行触发耳机按钮...");
                    await audioBtn.dispatchEvent('click');
                    await page.waitForTimeout(1500); 
                    
                    if (await solverBtn.count() > 0) {
                        console.log("  [侦测] 🤖 语音模式下锁定 Buster！强制引爆点击...");
                        await solverBtn.dispatchEvent('click');
                        console.log("  [侦测] ⏳ 已经触发 Buster，等待 15 秒聆听并破解...");
                        await page.waitForTimeout(15000); 
                        console.log("  [侦测] ✅ Buster 破解回合结束。");
                        return true;
                    }
                }
                console.log("  [侦测] 🚨 异常：当前框架内仍未找到 Buster 按钮。");
            }
        }
    } catch (e) {}
    return false;
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，执行环境自检与强力自动修复...");
    
    const busterPath = path.join(os.tmpdir(), 'buster-extension');
    if (!fs.existsSync(path.join(busterPath, 'manifest.json'))) {
        console.log("📥 [环境修复] 正在通过 GitHub API 动态追踪最新版 Buster 插件...");
        try {
            fs.mkdirSync(busterPath, { recursive: true });
            const releaseJson = execSync('curl -sL https://api.github.com/repos/dessant/buster/releases/latest').toString();
            const releaseData = JSON.parse(releaseJson);
            const chromeAsset = releaseData.assets.find(a => a.name.toLowerCase().includes('chrome') && a.name.endsWith('.zip'));
            let downloadUrl = chromeAsset ? chromeAsset.browser_download_url : 'https://github.com/dessant/buster/releases/download/v2.0.1/buster-extension-2.0.1-chrome.zip';
            
            execSync(`curl -L -o /tmp/buster.zip "${downloadUrl}"`, { stdio: 'inherit' });
            execSync(`unzip -q -o /tmp/buster.zip -d ${busterPath}`, { stdio: 'inherit' });
            console.log(`✅ [环境修复] Buster 插件下载并解压成功: ${busterPath}`);
        } catch (e) {
            console.error("🚨 [环境修复致命错误] 下载或解压 Buster 失败！", e.message);
        }
    } else {
        console.log(`✅ [环境检查] 找到本地已存在的完整 Buster 插件: ${busterPath}`);
    }

    let context;
    let targetPage;

    try {
        console.log("🔥 [步骤 1] 正在点火启动浏览器 (启用私有节点代理 + 隐身伪装)...");
        
        context = await chromium.launchPersistentContext('', {
            headless: false, 
            timeout: 120000, 
            proxy: { server: 'socks5://127.0.0.1:10808' }, 
            args: [
                '--headless=new', 
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--disable-web-security', 
                '--disable-site-isolation-trials',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080', 
                '--disable-blink-features=AutomationControlled' 
            ],
            ignoreDefaultArgs: ["--mute-audio", "--enable-automation"], 
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
                for (let i = 0; i < 20; i++) { 
                    if (!targetPage.url().includes('auth/login')) {
                        loginSuccess = true;
                        console.log("🎉 [步骤 4] 验证通过！成功突破大门进入后台！");
                        break;
                    }

                    console.log(`  -> 正在扫视是否有验证码... (扫描 ${i+1}/20)`);
                    const solved = await autoSolveCaptcha(targetPage);
                    
                    if (solved) {
                        await targetPage.waitForTimeout(3000); 
                        try {
                            if (await loginBtn.isVisible({ timeout: 1000 })) {
                                await loginBtn.click({ force: true });
                                console.log("  -> 验证完毕，重新补点登录按钮...");
                            }
                        } catch(e) {}
                    }
                    await targetPage.waitForTimeout(2000);
                }
                
                if (!loginSuccess) {
                     throw new Error("🚨 登录被拦截！40秒内未能成功进入后台，可能是验证码破解失败或账号密码错误！");
                }

            } else {
                console.log("✅ [步骤 4] 未发现登录框，已免密直达后台！");
            }
        } catch (e) {
            if(e.message.includes("登录被拦截")) throw e;
            console.log("✅ [步骤 4] 未发现登录框，已免密直达后台！");
        }

        console.log("🖥️ [步骤 5] 正在精准定位并点击你的 renqi 服务...");
        const serverCard = targetPage.getByText('My renqi', { exact: false }).filter({ state: 'visible' }).first();
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
        console.log("🎉 全流程完美收官！正在截取最新的冷却时间与剩余时间...");
        
        // ==========================================
        // 🌟 新增的成功状态截图代码
        // ==========================================
        await targetPage.waitForTimeout(3000); // 稍微多等3秒，确保网页UI把剩余时间和 PLEASE WAIT 按钮完全加载出来
        const successPicPath = path.join(__dirname, 'screenshots', `success_renew_${Date.now()}.png`);
        
        // 开启 fullPage 确保截取到屏幕下方的所有有效信息
        await targetPage.screenshot({ path: successPicPath, fullPage: true }); 
        console.log(`📸 成功状态截图已保存至: ${successPicPath} (可前往 GitHub Actions 页面下载查看)`);
        // ==========================================

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
