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

async function autoSolveCaptcha(page) {
    try {
        const frames = page.frames();
        for (const frame of frames) {
            if (frame.url().includes('bframe') || frame.url().includes('fallback')) {
                
                const errorLocator = frame.locator('.rc-doscaptcha-header-text');
                const solverBtn = frame.locator('#solver-button, .help-button-holder button').first();
                const audioBtn = frame.locator('#recaptcha-audio-button').first();

                const isSolverVisible = await solverBtn.isVisible({timeout: 1000}).catch(()=>false);
                const isAudioVisible = await audioBtn.isVisible({timeout: 1000}).catch(()=>false);

                // 1. 如果 Buster 已经可见，直接点！
                if (isSolverVisible) {
                    console.log("  [透视雷达] 🤖 锁定真正可见的 Buster！执行物理点击...");
                    await solverBtn.click({ force: true });
                    await page.waitForTimeout(15000);
                    return 'solved';
                }

                // 2. 看到耳机，点击切入语音，然后开启 15 秒死盯！
                if (isAudioVisible) {
                    console.log("  [透视雷达] ⚠️ 锁定真正可见的耳机图标！点击切入语音...");
                    await audioBtn.click({ force: true });
                    
                    console.log("  [透视雷达] 正在死盯 Buster 插件注入 (最高等待 15 秒)...");
                    let busterAppeared = false;
                    let isBlocked = false;

                    for (let j = 0; j < 15; j++) {
                        await page.waitForTimeout(1000);
                        
                        if (await errorLocator.isVisible({timeout: 500}).catch(()=>false)) {
                            if ((await errorLocator.innerText()).includes('Try again later')) {
                                isBlocked = true;
                                break;
                            }
                        }

                        if (await solverBtn.isVisible({timeout: 500}).catch(()=>false)) {
                            busterAppeared = true;
                            break;
                        }
                    }

                    if (isBlocked) {
                        console.log("  [透视雷达] 🚨 致命错误：被谷歌拦截 (Try again later)！");
                        return 'blocked';
                    }

                    if (busterAppeared) {
                        console.log("  [透视雷达] 🤖 Buster 已现身！执行物理暴击...");
                        await solverBtn.click({ force: true });
                        await page.waitForTimeout(15000);
                        return 'solved';
                    } else {
                        console.log("  [透视雷达] ❌ 异常：等了整整 15 秒依然未见 Buster。可能是企业级拦截。");
                        return 'no_buster';
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

    // ==========================================
    // 🌟 终极破壁：基因重组 Buster 配置文件，强行开启企业级拦截网注入权限！
    // ==========================================
    const manifestPath = path.join(busterPath, 'manifest.json');
    try {
        let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        let modified = false;

        // 1. 修复 Manifest V3 兼容性
        if (manifest.manifest_version === 3 && manifest.action && !manifest.browser_action) {
            manifest.browser_action = manifest.action;
            modified = true;
        }

        // 2. 强行加入 Enterprise 企业级风控匹配网址
        if (manifest.content_scripts) {
            manifest.content_scripts.forEach(script => {
                if (script.matches) {
                    const extraMatches = [
                        "*://*.google.com/recaptcha/enterprise/bframe*",
                        "*://*.recaptcha.net/recaptcha/enterprise/bframe*",
                        "*://*.recaptcha.net/recaptcha/api2/bframe*"
                    ];
                    extraMatches.forEach(m => {
                        if (!script.matches.includes(m)) {
                            script.matches.push(m);
                            modified = true;
                        }
                    });
                }
            });
        }

        if (modified) {
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log("✅ [底层破壁] 成功篡改 Buster 配置文件！已强制打破谷歌 Enterprise 企业级限制！");
        }
    } catch (e) {
        console.log("⚠️ 篡改 Buster 配置文件失败: " + e.message);
    }
    // ==========================================

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

    let context;
    try {
        console.log("🔥 [步骤 1] 点火启动浏览器...");
        context = await chromium.launchPersistentContext('', {
            headless: false, 
            timeout: 120000, 
            proxy: { server: 'socks5://127.0.0.1:10808' }, 
            args: [
                '--headless=new', 
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--disable-web-security', '--disable-site-isolation-trials',
                '--no-sandbox', '--disable-gpu', '--window-size=1920,1080', 
                '--disable-blink-features=AutomationControlled',
                '--enforce-webrtc-ip-permission-check',
                '--force-webrtc-ip-handling-policy=disable-non-proxied-udp'
            ],
            ignoreDefaultArgs: ["--mute-audio", "--enable-automation"], 
        });

        const targetPage = await context.newPage();
        console.log("🌐 直达核心 Panel 面板 (等待家宽慢速加载)...");
        await targetPage.goto('https://panel.gaming4free.net', { waitUntil: 'domcontentloaded', timeout: 90000 });

        const pwdInput = targetPage.locator('input[type="password"]').first();
        const serverLabel = targetPage.getByText('My renqi', { exact: false }).first();

        let pageType = 'none';
        for(let i=0; i<15; i++) {
            if (await pwdInput.isVisible()) { pageType = 'login'; break; }
            if (await serverLabel.isVisible()) { pageType = 'dashboard'; break; }
            await targetPage.waitForTimeout(3000); 
        }

        if (pageType === 'none') {
            console.log("🚨 未加载出有效页面。");
            await targetPage.screenshot({ path: path.join(screenshotDir, `error_nologin_${Date.now()}.png`), fullPage: true }).catch(()=>{});
            throw new Error("LOGIN_FAILED"); 
        }

        if (pageType === 'login') {
            console.log(`🔑 发现登录框，填入账号...`);
            await targetPage.locator('input:not([type="hidden"]):not([type="password"])').first().fill(MCUSERNAME);
            await pwdInput.fill(MC_PASSWORD);
            
            let readyToSolve = false;
            for (let clickRetry = 1; clickRetry <= 5; clickRetry++) {
                console.log(`🟢 [第 ${clickRetry} 次] 点击登录按钮...`);
                await targetPage.getByRole('button', { name: /LOGIN|登录|Sign In/i }).first().click({ force: true });
                
                await targetPage.waitForTimeout(2000);
                const errorToast = targetPage.getByText('did not render yet', { exact: false });
                
                if (await errorToast.isVisible({timeout: 1500}).catch(()=>false)) {
                    console.log("⏳ [前端拦截] 网站报错底层验证码未加载！等 5 秒后再点...");
                    await targetPage.waitForTimeout(5000);
                } else {
                    console.log("✅ 登录动作被网站受理！盯防验证码...");
                    readyToSolve = true;
                    break;
                }
            }

            if (!readyToSolve) throw new Error("LOGIN_FAILED");

            let loginSuccess = false;
            for (let i = 0; i < 20; i++) { 
                if (!targetPage.url().includes('auth/login')) {
                    loginSuccess = true;
                    console.log("🎉 验证通过！成功突破大门进入后台！");
                    break;
                }
                await autoSolveCaptcha(targetPage);
                await targetPage.waitForTimeout(2000);
            }
            if (!loginSuccess) {
                await targetPage.screenshot({ path: path.join(screenshotDir, `error_login_captcha_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                throw new Error("LOGIN_FAILED");
            }
        }

        console.log("🖥️ 定位并点击 renqi 服务...");
        await targetPage.getByText('My renqi', { exact: false }).filter({ state: 'visible' }).first().click({ force: true });
        await targetPage.waitForLoadState('domcontentloaded');
        await targetPage.waitForTimeout(3000); 
        await targetPage.locator('a').filter({ hasText: /^Console$/i }).first().click({ force: true }); 
        await targetPage.waitForLoadState('domcontentloaded');
        await targetPage.waitForTimeout(3000);

        console.log(`⏳ 准备点击 ADD 90 MINUTES 续期按钮...`);
        try {
            await targetPage.getByRole('button', { name: /ADD 90 MINUTES/i }).waitFor({ state: 'visible', timeout: 10000 });
            await targetPage.getByRole('button', { name: /ADD 90 MINUTES/i }).click({ force: true });
            console.log("✅ 成功点击！进入广告与验证码环节 (绝不盲目重试)...");
        } catch (e) {
            if (await targetPage.getByRole('button', { name: /PLEASE WAIT/i }).isVisible({ timeout: 3000 })) {
                console.log("ℹ️ 续期冷却中，本次挂机正常结束。");
                return; 
            }
        }

        let globalSuccess = false;

        for (let i = 1; i <= 30; i++) {
            await targetPage.waitForTimeout(5000); 
            if (i % 2 === 0) console.log(`  -> 等待环节进行中... 已度过 ${i * 5} 秒`);
            
            const capStatus = await autoSolveCaptcha(targetPage);
            
            if (capStatus === 'blocked') {
                console.log("🚨 验证码遭遇拦截 (Try again later)！立刻拍照并终止任务！");
                await targetPage.screenshot({ path: path.join(screenshotDir, `analysis_blocked_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                break;
            } else if (capStatus === 'no_buster') {
                console.log("📸 耳机已点击但找不到 Buster！立刻拍照取证并终止任务！");
                await targetPage.screenshot({ path: path.join(screenshotDir, `analysis_no_buster_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                break; 
            }

            try {
                if (await targetPage.getByRole('button', { name: /PLEASE WAIT/i }).isVisible({ timeout: 1000 })) {
                    globalSuccess = true;
                    break;
                }
            } catch (e) {}
        }

        if (globalSuccess) {
            console.log("🎉🎉 破阵成功！全流程完美收官！");
            await targetPage.screenshot({ path: path.join(screenshotDir, `success_${Date.now()}.png`), fullPage: true }).catch(()=>{});
            await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}\n状态: 已成功领取 90 分钟！`);
        } else {
            console.log("⚠️ 续期流程未能在 150 秒内成功完成，已保存现场截图待分析。");
        }

    } catch (error) {
        console.log(`💥 流程提前终止: ${error.message}`);
    } finally {
        if (context) await context.close().catch(()=>{});
        console.log("🛑 脚本进程已安全关闭。等待你的捷报！");
    }
})();
