const { chromium } = require('playwright');
const path = require('path');

// ==========================================
// 💡 核心配置
// ==========================================
const RENEW_URL = 'https://game4free.net/woairenqi'; 
const MC_USERNAME = 'renqi'; 

const TG_TOKEN = process.env.TG_TOKEN || '';
const TG_CHAT = process.env.TG_CHAT_ID || ''; // 对应 yml 里的名字

// TG 通知发送函数
async function sendTG(message) {
    if (!TG_TOKEN || !TG_CHAT) return;
    try {
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT, text: `🤖 G4F 自动续期:\n${message}` })
        });
    } catch (e) {
        console.error("TG 通知发送失败");
    }
}

const extensionPath = path.resolve(__dirname, 'extensions/buster/unpacked');

(async () => {
    console.log(`\n===== 🚀 开始执行极速续期 =====`);
    console.log(`🎯 目标 URL: ${RENEW_URL}`);
    console.log(`👤 填入服务器名: ${MC_USERNAME}`);

    const browserContext = await chromium.launchPersistentContext('', {
        channel: 'chrome', // 🌟 修复 1：强制使用 GitHub 自带的完整版 Google Chrome，自带全部音频解码器！
        headless: false, 
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required' // 🌟 修复 2：解除浏览器自动播放限制，允许语音直接播放
        ]
    });

    const page = await browserContext.newPage();

    try {
        await page.goto(RENEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
        console.log("🌐 已成功打开专属续期页面");

        console.log("🤖 正在处理 reCAPTCHA...");
        const captchaFrame = page.frameLocator('iframe[title*="reCAPTCHA"]');
        
        await captchaFrame.locator('.recaptcha-checkbox-border').waitFor({ state: 'visible', timeout: 10000 });
        await captchaFrame.locator('.recaptcha-checkbox-border').click(); 
        
        console.log("⏳ 等待 Google 验证响应...");
        await page.waitForTimeout(3000); 

        const anchor = captchaFrame.locator('#recaptcha-anchor');
        const isChecked = await anchor.getAttribute('aria-checked').catch(() => 'false');

        if (isChecked === 'true') {
            console.log("⏩ 验证码秒过，无需使用 Buster 破解。");
        } else {
            const challengeFrame = page.frameLocator('iframe[title*="recaptcha challenge"]');
            try {
                // 🌟 修复 3.1：确保处于“语音挑战”模式（如果弹出的是图片，先点耳机图标切成语音）
                const audioBtn = challengeFrame.locator('#recaptcha-audio-button');
                if (await audioBtn.isVisible({ timeout: 5000 })) {
                    console.log("🎧 点击耳机图标，切换到语音验证模式...");
                    await audioBtn.click({ force: true });
                    await page.waitForTimeout(2000); // 等待语音界面加载
                }

                // 🌟 修复 3.2：精准定位并触发 Buster 的破解按钮
                const busterBtn = challengeFrame.locator('#solver-button').first();
                if (await busterBtn.isVisible({ timeout: 5000 })) {
                    console.log("🔄 触发 Buster 语音破解插件...");
                    // 使用 evaluate 强制执行原生 JS 点击，防止任何 UI 遮挡导致点击失效
                    await busterBtn.evaluate(b => b.click());
                    
                    console.log("⏳ 正在等待 Buster 识别语音 (最多轮询 30 秒)...");
                    let solved = false;
                    for (let i = 0; i < 15; i++) {
                        await page.waitForTimeout(2000); 
                        let check = await anchor.getAttribute('aria-checked').catch(() => 'false');
                        if (check === 'true') {
                            console.log("✅ Buster 破解成功！");
                            solved = true;
                            break;
                        }
                    }
                    if (!solved) {
                        console.log("⚠️ Buster 破解超时或被 Google 拦截，继续兜底流程...");
                    }
                } else {
                     console.log("⚠️ 找不到 Buster 破解按钮，页面可能加载异常。");
                }
            } catch (err) {
                console.log("⚠️ 验证码弹窗处理异常，继续尝试下文...", err.message);
            }
        }

        // 3. 填写服务器名称
        await page.getByPlaceholder(/Minecraft Username/i).fill(MC_USERNAME);
        console.log("✍️ 已填入名称: " + MC_USERNAME);
        await page.screenshot({ path: path.join(__dirname, `screenshots/1_filled.png`) });

        // 4. 点击 Renew 按钮
        console.log("🚀 准备提交续期请求...");
        const renewBtn = page.getByRole('button', { name: 'Renew', exact: true });
        
        await page.waitForTimeout(1000);

        if (await renewBtn.isEnabled()) {
            await renewBtn.click();
            
            await page.waitForTimeout(5000); 
            await page.screenshot({ path: path.join(__dirname, `screenshots/2_result.png`) });
            
            if (await page.locator('text="The server has been renewed."').isVisible().catch(()=>false)) {
                console.log("🎉 续期大成功！出现了绿色成功横幅。");
                await sendTG(`✅ 服务器 [${MC_USERNAME}] 续期成功！\n时间: ${new Date().toLocaleString()}`);
            } else {
                console.log("⚠️ 点击了按钮，但没检测到绿色横幅，请检查截图");
                await sendTG(`⚠️ 续期已执行，请查阅 GitHub 截图确认状态。\n时间: ${new Date().toLocaleString()}`);
            }
        } else {
            console.log("⏸️ Renew 按钮当前不可点击 (可能在冷却中)");
            await sendTG(`ℹ️ 续期跳过，按钮置灰（冷却中）。\n时间: ${new Date().toLocaleString()}`);
        }

    } catch (error) {
        console.error("❌ 发生错误:", error);
        await page.screenshot({ path: path.join(__dirname, `screenshots/error.png`) });
        await sendTG(`❌ 自动续期失败！\n错误信息: ${error.message}`);
    } finally {
        await browserContext.close();
    }
})();
