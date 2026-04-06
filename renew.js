// 🌟 引入隐身增强版 Playwright
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); 

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

// ==========================================
// ✅ 账号信息和 TG 机器人信息
// ==========================================
const MC_USERNAME = 'peng320829@gmail.com';
const MC_PASSWORD = 'Qwer12138@'; 
const TG_BOT_TOKEN = '8490493179:AAG1Q5pkFNkUzR2E5pSm8OpJa_SPZNf32Mw'; 
const TG_CHAT_ID = '6499138234';     
// ==========================================

async function sendTelegramMessage(text) {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID || TG_BOT_TOKEN.includes('填入你的')) return;
    const now = new Date();
    const beijingHour = new Date(now.getTime() + 8 * 3600 * 1000).getUTCHours();
    
    if (beijingHour !== 12) {
        console.log(`🔕 [通知静音] 当前北京时间 ${beijingHour} 点。按规则仅在每天中午 12 点发报。`);
        return;
    }
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text })
        });
    } catch (e) {}
}

// 🌟 极度耐心的验证码狙击模块
async function autoSolveCaptcha(page) {
    try {
        const frames = page.frames();
        for (const frame of frames) {
            if (frame.url().includes('bframe') || frame.url().includes('fallback') || frame.url().includes('recaptcha')) {
                
                const blockMsg = await frame.locator('.rc-doscaptcha-header-text').innerText().catch(() => '');
                if (blockMsg.includes('Try again later')) {
                    console.log("  [透视雷达] 🚨 致命错误：当前 IP 请求被谷歌拦截 (Try again later)！");
                    return 'blocked';
                }

                const audioBtn = frame.locator('#recaptcha-audio-button');
                const solverBtn = frame.locator('#solver-button');

                if (await audioBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log("  [透视雷达] 🎧 发现验证码！正在耐心等待 Buster 插件注入 (最高10秒)...");

                    await solverBtn.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});

                    if (await solverBtn.count() > 0) {
                        console.log("  [透视雷达] 🤖 锁定 Buster 小黄人！发送物理强制点击...");
                        await solverBtn.click({ force: true });
                        await page.waitForTimeout(15000); 
                        return 'solved';
                    } else {
                        console.log("  [透视雷达] ⚠️ 10秒过去未见 Buster。强行切入语音模式试试...");
                        await audioBtn.click({ force: true });
                        await page.waitForTimeout(3000); 

                        const blockMsg2 = await frame.locator('.rc-doscaptcha-header-text').innerText().catch(() => '');
                        if (blockMsg2.includes('Try again later')) {
                            console.log("  [透视雷达] 🚨 致命错误：切入语音瞬间被谷歌拦截！");
                            return 'blocked';
                        }

                        await solverBtn.waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
                        if (await solverBtn.count() > 0) {
                            console.log("  [透视雷达] 🤖 语音模式下锁定 Buster！发送强杀点击...");
                            await solverBtn.click({ force: true });
                            await page.waitForTimeout(15000); 
                            return 'solved';
                        } else {
                            console.log("  [透视雷达] ❌ 彻底找不到 Buster 按钮！注入失败！");
                            return 'missing_buster'; // 🌟 返回缺失状态，打破无限循环
                        }
                    }
                }
            }
        }
    } catch (e) {}
    return 'none';
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，环境自检...");
    
    const busterPath = path.join(os.tmpdir(), 'buster-extension');
    if (!fs.existsSync(path.join(busterPath, 'manifest.json'))) {
        try {
            fs.mkdirSync(busterPath, { recursive: true });
            const releaseJson = execSync('curl -sL https://api.github.com/repos/dessant/buster/releases/latest').toString();
            const downloadUrl = JSON.parse(releaseJson).assets.find(a => a.name.includes('chrome')).browser_download_url;
            execSync(`curl -L -o /tmp/buster.zip "${downloadUrl}"`);
            execSync(`unzip -q -o /tmp/buster.zip -d ${busterPath}`);
            
            // ==========================================
            // 🌟 核心破壁：篡改 Buster 配置文件，强制全网注入！
            // ==========================================
            const manifestPath = path.join(busterPath, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                if (manifest.content_scripts) {
                    manifest.content_scripts.forEach(script => {
                        if (script.matches) {
                            script.matches.push("<all_urls>"); 
                            script.matches.push("*://*/*");
                        }
                    });
                    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                    console.log("✅ [底层破壁] 成功篡改 Buster 配置文件，已强制开启无差别全网注入！");
                }
            }
            // ==========================================
        } catch (e) {
            console.error("下载或篡改 Buster 失败", e);
        }
    }

    let context;
    let targetPage;

    try {
        console.log("🔥 [步骤 1] 点火启动浏览器 (挂载美国家宽 + 隐身伪装)...");
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
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
                '--window-size=1920,1080', '--disable-blink-features=AutomationControlled' 
            ],
            ignoreDefaultArgs: ["--mute-audio", "--enable-automation"], 
        });

        const page = await context.newPage();
        targetPage = page;
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

        console.log("🌐 [步骤 3] 直达核心 Panel 面板 (等待家宽慢速加载)...");
        await targetPage.goto('https://panel.gaming4free.net', { waitUntil: 'domcontentloaded', timeout: 90000 });
        await targetPage.waitForTimeout(5000); 

        console.log("🔒 [步骤 4] 正在解析当前页面状态...");
        const pwdInput = targetPage.locator('input[type="password"]').first();
        const serverLabel = targetPage.getByText('My renqi', { exact: false }).first();

        let pageType = 'none';
        for(let i=0; i<15; i++) {
            if (await pwdInput.isVisible()) { pageType = 'login'; break; }
            if (await serverLabel.isVisible()) { pageType = 'dashboard'; break; }
            await targetPage.waitForTimeout(3000); 
        }

        if (pageType === 'none') {
            console.log("🚨 [致命错误] 45秒内未加载出任何有效页面！");
            await targetPage.screenshot({ path: path.join(screenshotDir, `error_nologin_${Date.now()}.png`), fullPage: true }).catch(()=>{});
            throw new Error("找不到登录页面或后台页面，无法继续！");
        }

        if (pageType === 'login') {
            console.log(`🔑 发现登录框！正在填入账号: ${MC_USERNAME}`);
            const userInput = targetPage.locator('input:not([type="hidden"]):not([type="password"])').first();
            await userInput.fill(MC_USERNAME);
            await pwdInput.fill(MC_PASSWORD);
            await targetPage.getByRole('button', { name: /LOGIN|登录|Sign In/i }).first().click({ force: true });
            
            console.log("⏳ 账号密码已提交！盯防验证码...");
            let loginSuccess = false;
            for (let i = 0; i < 20; i++) { 
                if (!targetPage.url().includes('auth/login')) {
                    loginSuccess = true;
                    console.log("🎉 验证通过！成功突破大门进入后台！");
                    break;
                }
                const capStatus = await autoSolveCaptcha(targetPage);
                // 🌟 打破无限循环：如果彻底找不到插件，直接撤退
                if (capStatus === 'blocked' || capStatus === 'missing_buster') {
                    console.log("🚨 登录遭遇拦截或插件失效，终止死循环，立即撤退！");
                    break;
                }
                await targetPage.waitForTimeout(2000);
            }
            
            if (!loginSuccess) {
                 await targetPage.screenshot({ path: path.join(screenshotDir, `retreat_login_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                 return; 
            }
        } else {
            console.log("✅ 检测到服务器卡片，已免密直达后台！");
        }

        console.log("🖥️ [步骤 5] 正在精确定位并点击你的 renqi 服务...");
        await targetPage.getByText('My renqi', { exact: false }).filter({ state: 'visible' }).first().click({ force: true });
        await targetPage.waitForLoadState('domcontentloaded');
        await targetPage.waitForTimeout(3000); 

        console.log("💻 [步骤 6] 切换 Console...");
        await targetPage.locator('a').filter({ hasText: /^Console$/i }).first().click({ force: true }); 
        await targetPage.waitForLoadState('domcontentloaded');
        await targetPage.waitForTimeout(3000);

        let success = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
            console.log(`⏳ [步骤 7] 准备点击续期按钮... (第 ${attempt} 回合)`);
            const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
            
            try {
                await addTimeBtn.waitFor({ state: 'visible', timeout: 10000 });
                await addTimeBtn.click({ force: true });
                console.log("✅ 成功按下 ADD 90 MINUTES！");
                console.log("📺 开始静音挂机看广告 (预留 150 秒)，等待验证码弹出...");
            } catch (e) {
                const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                if (await waitBtn.isVisible({ timeout: 3000 })) {
                    console.log("ℹ️ [日常巡逻] 续期冷却中，安全撤退。");
                    await targetPage.screenshot({ path: path.join(screenshotDir, `cooldown_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                    return; 
                }
            }

            let adFinished = false;
            let ipBlocked = false;

            for (let i = 1; i <= 30; i++) {
                await targetPage.waitForTimeout(5000); 
                if (i % 2 === 0) console.log(`  -> 广告播放/网络加载中... 已耐心等待 ${i * 5} 秒`);
                
                const captchaResult = await autoSolveCaptcha(targetPage);
                // 🌟 打破无限循环
                if (captchaResult === 'blocked' || captchaResult === 'missing_buster') {
                    ipBlocked = true;
                    break; 
                }

                try {
                    const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                    if (await waitBtn.isVisible({ timeout: 1000 })) {
                        adFinished = true;
                        success = true;
                        console.log("🎉🎉 破阵成功！已进入 PLEASE WAIT 续期等待状态！");
                        break;
                    }
                } catch (e) {}
            }

            if (ipBlocked) {
                console.log("❌ 遭遇 IP 死锁或插件失效，停止本回合尝试。");
                break; 
            }
            if (adFinished) break;

            if (attempt === 1 && !ipBlocked) {
                console.log("⚠️ 150秒过去了，似乎卡死在加载圈。刷新重试！");
                await targetPage.reload({ waitUntil: 'domcontentloaded' });
                await targetPage.waitForTimeout(5000);
            }
        }

        if (!success) {
            console.log("ℹ️ [日常巡逻] 续期失败，已隐蔽撤退。");
            await targetPage.screenshot({ path: path.join(screenshotDir, `retreat_fail_${Date.now()}.png`), fullPage: true }).catch(()=>{});
            return;
        }

        console.log("🎉 全流程完美收收官！");
        await targetPage.waitForTimeout(3000);
        await targetPage.screenshot({ path: path.join(screenshotDir, `success_renew_${Date.now()}.png`), fullPage: true }).catch(()=>{});
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}\n状态: 已成功领取 90 分钟！`);

    } catch (error) {
        console.error("❌ 发生崩溃异常:", error.message);
        process.exit(1);
    } finally {
        if (context) await context.close();
        console.log("🛑 脚本进程已安全关闭。");
    }
})();
