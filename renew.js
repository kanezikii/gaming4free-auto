const { chromium } = require('playwright');
const path = require('path');

// ==========================================
// 💡 核心配置
// ==========================================
const RENEW_URL = 'https://game4free.net/woairenqi'; 
// 从 GitHub Secrets 读取游戏用户名，如果没有则默认填 'woairenqi'
const MC_USERNAME = process.env.MC_USERNAME || 'woairenqi'; 

const TG_TOKEN = process.env.TG_TOKEN || '';
const TG_CHAT = process.env.TG_CHAT || '';

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
    console.log(`👤 填入用户名: ${MC_USERNAME}`);

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
        // 1. 访问专属续期页面
        await page.goto(RENEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({ path: path.join(__dirname, `screenshots/1_open.png`) });
        console.log("🌐 已成功打开专属续期页面");

        // 2. 识别并破解 reCAPTCHA
        console.log("🤖 正在处理 reCAPTCHA 人机验证...");
        const captchaFrame = page.frameLocator('iframe[title*="reCAPTCHA"]');
        
        // 等待复选框出现并点击
        await captchaFrame.locator('.recaptcha-checkbox-border').waitFor({ state: 'visible', timeout: 10000 });
        await captchaFrame.locator('.recaptcha-checkbox-border').click(); 
        
        await page.waitForTimeout(2000); 

        // 切换到弹出的图片/语音挑战 iframe
        const challengeFrame = page.frameLocator('iframe[title*="recaptcha challenge"]');
        if (await challengeFrame.locator('.help-button-holder').isVisible({ timeout: 5000 }).catch(()=>false)) {
            console.log("🔄 触发 Buster 语音破解插件...");
            await challengeFrame.locator('.help-button-holder').click();
            
            // 给 Buster 留出足够的语音识别时间
            await page.waitForTimeout(8000); 
            console.log("✅ 验证码破解完成");
        } else {
            console.log("⏩ 运气不错，未弹出二次验证，直接绿勾通过！");
        }

        // 3. 填写游戏用户名
        await page.getByPlaceholder(/Minecraft Username/i).fill(MC_USERNAME);
        console.log("✍️ 已填写用户名");
        await page.screenshot({ path: path.join(__dirname, `screenshots/2_filled.png`) });

        // 4. 点击 Renew 按钮
        console.log("🚀 准备提交续期请求...");
        const renewBtn = page.getByRole('button', { name: 'Renew', exact: true });
        
        if (await renewBtn.isEnabled({ timeout: 5000 })) {
            await renewBtn.click();
            
            // 等待页面反馈结果
            await page.waitForTimeout(5000); 
            await page.screenshot({ path: path.join(__dirname, `screenshots/3_result.png`) });
            
            // 验证是否出现了绿色的成功提示
            if (await page.locator('text="The server has been renewed."').isVisible().catch(()=>false)) {
                console.log("🎉 续期大成功！");
                await sendTG(`✅ 服务器续期成功！\n专属页面: ${RENEW_URL}\n时间: ${new Date().toLocaleString()}`);
            } else {
                console.log("⚠️ 点击了按钮，但没检测到绿色成功横幅，请检查 3_result.png 确认实际状态");
                await sendTG(`⚠️ 续期已执行，结果未知，请查阅 GitHub 截图。\n时间: ${new Date().toLocaleString()}`);
            }
        } else {
            console.log("⏸️ Renew 按钮当前不可点击 (可能在冷却中，尚未到期)");
            await sendTG(`ℹ️ 续期跳过，按钮置灰（尚未到期）。\n时间: ${new Date().toLocaleString()}`);
        }

    } catch (error) {
        console.error("❌ 发生错误:", error);
        await page.screenshot({ path: path.join(__dirname, `screenshots/error.png`) });
        await sendTG(`❌ 自动续期失败！\n错误信息: ${error.message}`);
    } finally {
        await browserContext.close();
    }
})();
