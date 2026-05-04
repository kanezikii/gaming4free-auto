const { chromium } = require('playwright');
const path = require('path');

// ==========================================
// 💡 核心配置
// ==========================================
const RENEW_URL = 'https://game4free.net/woairenqi'; 
const MC_USERNAME = 'renqi'; 

const TG_TOKEN = process.env.TG_TOKEN || '';
const TG_CHAT = process.env.TG_CHAT_ID || '';

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
        headless: false, 
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
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
                if (await challengeFrame.locator('.help-button-holder').isVisible({ timeout: 5000 })) {
                    console.log("🔄 触发 Buster 语音破解插件...");
                    await challengeFrame.locator('.help-button-holder').click({ force: true });
                    
                    console.log("⏳ 正在等待 Buster 识别语音 (最多等待 30 秒)...");
                    // 🌟 核心修复：智能轮询等待绿勾
                    let solved = false;
                    for (let i = 0; i < 15; i++) {
                        await page.waitForTimeout(2000); // 每次等2秒
                        let check = await anchor.getAttribute('aria-checked').catch(() => 'false');
                        if (check === 'true') {
                            console.log("✅ Buster 破解成功！");
                            solved = true;
                            break;
                        }
                    }
                    if (!solved) {
                        console.log("⚠️ Buster 破解耗时过长或失败，继续尝试兜底流程...");
                    }
                }
            } catch (err) {
                console.log("⚠️ 未能点击 Buster 按钮，继续尝试...");
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
