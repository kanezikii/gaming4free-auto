// 🌟 引入隐身增强版 Playwright
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); 

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

// ==========================================
// ✅ 你的账号信息和 TG 机器人信息
// ==========================================
const MC_USERNAME = 'peng320829@gmail.com';
const MC_PASSWORD = 'Qwer12138@'; 
const TG_BOT_TOKEN = '8490493179:AAG1Q5pkFNkUzR2E5pSm8OpJa_SPZNf32Mw'; 
const TG_CHAT_ID = '6499138234';     
// ==========================================

// 🌟 通知模块：只在每天北京时间中午 12 点（12:00-12:59）发报
async function sendTelegramMessage(text) {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID || TG_BOT_TOKEN.includes('填入你的')) return;
    
    const now = new Date();
    const beijingHour = new Date(now.getTime() + 8 * 3600 * 1000).getUTCHours();
    
    if (beijingHour !== 12) {
        console.log(`🔕 [通知静音] 当前北京时间 ${beijingHour} 点。按规则仅在每天中午 12 点发送电报通知。`);
        return;
    }

    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text })
        });
        console.log("📢 TG 汇报通知已成功发送！");
    } catch (e) {}
}

// 🌟 核心：无差别雷达全屏扫描，无视谷歌底层改版！
async function autoSolveCaptcha(page) {
    try {
        const iframes = page.frameLocator('iframe');
        const count = await iframes.count();
        
        for (let i = 0; i < count; i++) {
            const frame = iframes.nth(i);
            
            const audioBtn = frame.locator('#recaptcha-audio-button');
            const solverBtn = frame.locator('#solver-button');
            
            const isAudioVisible = await audioBtn.isVisible({timeout: 500}).catch(()=>false);
            const isSolverVisible = await solverBtn.isVisible({timeout: 500}).catch(()=>false);
            
            if (isAudioVisible || isSolverVisible) {
                console.log(`  [侦测] 🎧 暴力雷达锁定当前活动的 reCAPTCHA 弹窗！`);
                
                await solverBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(()=>{});

                if (await solverBtn.count() > 0) {
                    console.log("  [侦测] 🤖 成功锁定 Buster！使用 dispatchEvent 强制引爆点击...");
                    await solverBtn.dispatchEvent('click');
                    await page.waitForTimeout(15000); 
                    return true;
                } else if (await audioBtn.count() > 0) {
                    console.log("  [侦测] ⚠️ 未见 Buster，强行触发耳机按钮...");
                    await audioBtn.dispatchEvent('click');
                    await page.waitForTimeout(1500); 
                    
                    if (await solverBtn.count() > 0) {
                        console.log("  [侦测] 🤖 语音模式下锁定 Buster！强制引爆点击...");
                        await solverBtn.dispatchEvent('click');
                        await page.waitForTimeout(15000); 
                        return true;
                    }
                }
            }
        }
    } catch (e) {}
    return false;
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，执行环境自检与动态下载 Buster...");
    
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
    }

    let context;
    let targetPage;

    try {
        console.log("🔥 [步骤 1] 正在点火启动浏览器 (挂载美国家宽代理 + 隐身伪装)...");
        
        context = await chromium.launchPersistentContext('', {
            headless: false, 
            timeout: 120000, 
            proxy: { server: 'socks5://127.0.0.1:10808' }, // 🌟 重新挂载 GitHub 本地开启的节点入口
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

        const page = await context.newPage();
        targetPage = page;
        
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

        console.log("🌐 [步骤 3] 直达核心 Panel 面板...");
        await targetPage.goto('https://panel.gaming4free.net', { waitUntil: 'networkidle', timeout: 60000 });

        console.log("🔒 [步骤 4] 检查面板登录状态...");
        try {
            const emailInput = targetPage.locator('input[name="user"], input[name="username"], input[type="email"]').filter({ state: 'visible' }).first();
            if (await emailInput.isVisible({ timeout: 10000 })) {
                console.log(`🔑 发现登录界面，填入账号: ${MC_USERNAME}`);
                await emailInput.click();
                await targetPage.waitForTimeout(500);
                await emailInput.fill(MC_USERNAME);

                const pwdInput = targetPage.locator('input[type="password"]').filter({ state: 'visible' }).first();
                await pwdInput.click();
                await targetPage.waitForTimeout(500);
                await pwdInput.fill(MC_PASSWORD);

                const loginBtn = targetPage.getByRole('button', { name: /LOGIN|登录|Sign In/i }).filter({ state: 'visible' }).first();
                await loginBtn.click({ force: true });
                console.log("⏳ 账号密码已提交！盯防验证码...");

                let loginSuccess = false;
                for (let i = 0; i < 20; i++) { 
                    if (!targetPage.url().includes('auth/login')) {
                        loginSuccess = true;
                        console.log("🎉 验证通过！成功突破大门进入后台！");
                        break;
                    }
                    console.log(`  -> 正在扫视是否有验证码... (扫描 ${i+1}/20)`);
                    const solved = await autoSolveCaptcha(targetPage);
                    if (solved) {
                        await targetPage.waitForTimeout(3000); 
                        try {
                            if (await loginBtn.isVisible({ timeout: 1000 })) await loginBtn.click({ force: true });
                        } catch(e) {}
                    }
                    await targetPage.waitForTimeout(2000);
                }
                
                if (!loginSuccess) {
                     console.log("ℹ️ [日常巡逻] 登录遭遇验证码死锁。");
                     const retreatPicPath = path.join(screenshotDir, `retreat_login_${Date.now()}.png`);
                     await targetPage.screenshot({ path: retreatPicPath, fullPage: true }).catch(()=>{});
                     console.log(`📸 撤退前已拍下案发现场留档: ${retreatPicPath}`);
                     await sendTelegramMessage(`🎮 Gaming4Free 巡逻报告\n账号: ${MC_USERNAME}\n状态: 登录被图片风控拦截，隐蔽撤退等待下小时重试。`);
                     return; 
                }

            } else {
                console.log("✅ 未发现登录框，已免密直达后台！");
            }
        } catch (e) {
            console.log("✅ 尝试直达后台！");
        }

        console.log("🖥️ [步骤 5] 定位并点击 renqi 服务...");
        const serverCard = targetPage.getByText('My renqi', { exact: false }).filter({ state: 'visible' }).first();
        await serverCard.waitFor({ state: 'visible', timeout: 20000 });
        await serverCard.click({ force: true });
        
        await targetPage.waitForLoadState('domcontentloaded');
        await targetPage.waitForTimeout(3000); 

        console.log("💻 [步骤 6] 清理广告并点击 Console...");
        try {
            const globalCloseBtn = targetPage.locator('button[aria-label*="lose" i], [class*="close" i], svg.lucide-x').first();
            if (await globalCloseBtn.isVisible({ timeout: 2000 })) {
                await globalCloseBtn.click({ force: true });
                console.log("  💥 [清理] 强行关闭全局遮挡弹窗广告！");
                await targetPage.waitForTimeout(1000);
            }
        } catch (e) {}

        const topConsoleBtn = targetPage.locator('a').filter({ hasText: /^Console$/i }).first();
        await topConsoleBtn.waitFor({ state: 'visible', timeout: 10000 });
        await topConsoleBtn.click({ force: true }); 
        await targetPage.waitForLoadState('domcontentloaded');
        await targetPage.waitForTimeout(3000);

        console.log("⏳ [步骤 7] 寻找 ADD 90 MINUTES 续期按钮...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        
        try {
            await addTimeBtn.waitFor({ state: 'visible', timeout: 10000 });
            await addTimeBtn.click({ force: true });
            console.log("✅ 已点击续期按钮，进入看广告循环。");
        } catch (e) {
            console.log("ℹ️ [日常巡逻] 续期冷却中，无需操作，安全撤退。");
            const cooldownPicPath = path.join(screenshotDir, `cooldown_${Date.now()}.png`);
            await targetPage.screenshot({ path: cooldownPicPath, fullPage: true }).catch(()=>{});
            console.log(`📸 冷却中状态截图已保存: ${cooldownPicPath}`);
            await sendTelegramMessage(`🎮 Gaming4Free 巡逻正常\n账号: ${MC_USERNAME}\n状态: 续期冷却中，无需操作。`);
            return; 
        }

        let success = false;
        for (let i = 1; i <= 60; i++) {
            await targetPage.waitForTimeout(5000); 
            if (i % 6 === 0) console.log(`  -> 广告倒计时巡逻中... 已等待 ${i * 5} 秒`);
            
            await targetPage.keyboard.press('Escape').catch(() => {});
            try {
                const closeBtn = targetPage.locator('button[aria-label*="lose" i], [class*="close" i], svg.lucide-x').first();
                if (await closeBtn.isVisible({ timeout: 500 })) await closeBtn.click({ force: true });
            } catch (e) {}

            await autoSolveCaptcha(targetPage);

            try {
                const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                if (await waitBtn.isVisible({ timeout: 1000 })) {
                    success = true;
                    console.log("🎉🎉 破阵成功！已进入 PLEASE WAIT 续期等待状态！");
                    break;
                }
            } catch (e) {}
        }

        if (!success) {
            console.log("ℹ️ [日常巡逻] 广告期间阻断，隐蔽撤退。");
            const retreatAdPicPath = path.join(screenshotDir, `retreat_ad_${Date.now()}.png`);
            await targetPage.screenshot({ path: retreatAdPicPath, fullPage: true }).catch(()=>{});
            console.log(`📸 广告阻断截图已保存留档: ${retreatAdPicPath}`);
            return;
        }

        console.log("🎉 全流程完美收官！");
        await targetPage.waitForTimeout(3000);
        const successPicPath = path.join(screenshotDir, `success_renew_${Date.now()}.png`);
        await targetPage.screenshot({ path: successPicPath, fullPage: true }).catch(()=>{});
        console.log(`📸 成功状态截图已保存至: ${successPicPath}`);
        
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}\n状态: 已成功领取 90 分钟！`);

    } catch (error) {
        console.error("❌ 发生真正的崩溃异常:", error.message);
        process.exit(1);
    } finally {
        if (context) await context.close();
        console.log("🛑 脚本进程已安全关闭。");
    }
})();
