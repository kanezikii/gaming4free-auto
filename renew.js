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

// 🌟 带有“透视眼”状态反馈的底层强杀模块
async function autoSolveCaptcha(page) {
    try {
        const frames = page.frames();
        for (const frame of frames) {
            if (frame.url().includes('bframe') || frame.url().includes('fallback')) {
                const status = await frame.evaluate(() => {
                    const errorMsg = document.querySelector('.rc-doscaptcha-header-text'); 
                    if (errorMsg && errorMsg.innerText.includes('Try again later')) return 'blocked';
                    
                    const solverBtn = document.querySelector('#solver-button');
                    const audioBtn = document.querySelector('#recaptcha-audio-button');
                    
                    if (solverBtn) { solverBtn.click(); return 'clicked_buster'; }
                    if (audioBtn) { audioBtn.click(); return 'clicked_audio'; }
                    return 'none';
                }).catch(() => 'error');

                if (status === 'blocked') {
                    console.log("  [透视雷达] 🚨 致命错误：当前 IP 被彻底拉黑，请求语音被谷歌拒绝 (Try again later)！");
                    return 'blocked';
                } else if (status === 'clicked_buster') {
                    console.log("  [透视雷达] 🤖 发现验证码！已成功按下 Buster 小黄人，等待 15 秒破解...");
                    await page.waitForTimeout(15000); 
                    return 'solved';
                } else if (status === 'clicked_audio') {
                    console.log("  [透视雷达] ⚠️ 发现验证码！无 Buster，正在强行切入语音模式...");
                    await page.waitForTimeout(2000); 
                    
                    const retryStatus = await frame.evaluate(() => {
                        const errorMsg = document.querySelector('.rc-doscaptcha-header-text'); 
                        if (errorMsg && errorMsg.innerText.includes('Try again later')) return 'blocked';
                        const btn = document.querySelector('#solver-button');
                        if (btn) { btn.click(); return 'clicked_buster'; }
                        return 'none';
                    }).catch(() => 'none');
                    
                    if (retryStatus === 'blocked') {
                        console.log("  [透视雷达] 🚨 致命错误：切入语音瞬间被谷歌拦截 (Try again later)！");
                        return 'blocked';
                    } else if (retryStatus === 'clicked_buster') {
                        console.log("  [透视雷达] 🤖 语音模式下成功按下 Buster！等待 15 秒破解...");
                        await page.waitForTimeout(15000); 
                        return 'solved';
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
        } catch (e) {}
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
        // 🌟 放宽初始加载时间
        await targetPage.goto('https://panel.gaming4free.net', { waitUntil: 'domcontentloaded', timeout: 90000 });
        await targetPage.waitForTimeout(5000); // 强行等5秒，让 Cloudflare 盾牌飞一会儿

        console.log("🔒 [步骤 4] 寻找登录框...");
        const emailInput = targetPage.locator('input[name="user"], input[type="email"]').filter({ state: 'visible' }).first();
        
        // 🌟 核心修复：给家宽代理 45 秒的时间去刷出登录框
        await emailInput.waitFor({ state: 'visible', timeout: 45000 }).catch(() => {});

        if (await emailInput.isVisible()) {
            console.log(`🔑 成功找到登录框，填入账号: ${MC_USERNAME}`);
            await emailInput.fill(MC_USERNAME);
            await targetPage.locator('input[type="password"]').filter({ state: 'visible' }).first().fill(MC_PASSWORD);
            await targetPage.getByRole('button', { name: /LOGIN|登录|Sign In/i }).filter({ state: 'visible' }).first().click({ force: true });
            console.log("⏳ 账号密码提交！盯防验证码...");

            let loginSuccess = false;
            for (let i = 0; i < 20; i++) { 
                if (!targetPage.url().includes('auth/login')) {
                    loginSuccess = true;
                    console.log("🎉 验证通过！成功突破大门进入后台！");
                    break;
                }
                const capStatus = await autoSolveCaptcha(targetPage);
                if (capStatus === 'blocked') {
                    console.log("🚨 登录时就被拉黑，撤退！");
                    break;
                }
                await targetPage.waitForTimeout(2000);
            }
            
            if (!loginSuccess) {
                 await targetPage.screenshot({ path: path.join(screenshotDir, `retreat_login_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                 return; 
            }
        } else {
            // 🌟 核心修复：如果找不到登录框，绝不再自作聪明，直接拍照报警
            console.log("🚨 [致命错误] 45秒内未加载出登录框！可能是高延迟或被 Cloudflare 拦截。");
            await targetPage.screenshot({ path: path.join(screenshotDir, `error_nologin_${Date.now()}.png`), fullPage: true }).catch(()=>{});
            throw new Error("找不到登录页面，无法继续！");
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
                if (captchaResult === 'blocked') {
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
                console.log("❌ 遭遇 IP 彻底死锁，停止本回合尝试。");
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

        console.log("🎉 全流程完美收官！");
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
