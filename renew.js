const { chromium } = require('playwright');
const path = require('path');

// ==========================================
// 💡 核心配置
// ==========================================
const RENEW_URL = 'https://game4free.net/woairenqi'; 
const MC_USERNAME = 'renqi'; // 保持使用正确的标识符

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
        channel: 'chrome', // 🌟 核心破局点 1：强制使用自带的完整版 Chrome，解决 MP3 解码问题！
        headless: false, 
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required' // 🌟 核心破局点 2：允许音频自动播放
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
                // 🌟 防御性步骤：如果当前是图片九宫格，先强制点击耳机图标切换到语音模式
                const audioBtn = challengeFrame.locator('#recaptcha-audio-button');
                if (await audioBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log("🎧 手动点击耳机图标，切换到语音验证模式...");
                    await audioBtn.click({ force: true });
                    await page.waitForTimeout(2000); 
                }

                // 定位 Buster 的小人按钮
                const busterBtn = challengeFrame.locator('.help-button-holder').first();
                
                if (await busterBtn.isVisible({ timeout: 5000 })) {
                    console.log("🔄 发现 Buster 按钮，启动智能点击矩阵...");
                    
                    let solved = false;
                    // 循环最多尝试 3 次，防止插件反应慢导致的漏点
                    for (let tryCount = 1; tryCount <= 3; tryCount++) {
                        console.log(`🖱️ 第 ${tryCount} 次尝试触发 Buster...`);
                        
                        await busterBtn.hover();
                        await page.waitForTimeout(500); 
                        // 模拟人类点击，带少许延迟
                        await busterBtn.click({ force: true, delay: 100 });
                        
                        console.log(`⏳ 等待识别结果 (最多轮询 15 秒)...`);
                        for (let wait = 0; wait < 15; wait++) {
                            await page.waitForTimeout(1000); 
                            let check = await anchor.getAttribute('aria-checked').catch(() => 'false');
                            if (check === 'true') {
                                solved = true;
                                break;
                            }
                        }
                        
                        if (solved) {
                            console.log("✅ Buster 破解成功！");
                            break; 
                        } else {
                            console.log(`⚠️ 第 ${tryCount} 次触发未能完成破解，准备重试...`);
                        }
                    }
                    
                    if (!solved) {
                        console.log("❌ Buster 破解彻底失败 (可能是 Google 判定环境风险，拒绝下发音频)。");
                    }
                } else {
                    console.log("⚠️ 找不到 Buster 破解按钮，跳过破解...");
                }
            } catch (err) {
                console.log("⚠️ 验证码弹窗处理异常: " + err.message);
            }
        }

        // 3. 填写服务器名称
        await page.getByPlaceholder(/Minecraft Username/i).fill(MC_USERNAME);
        console.log("✍️ 已填入名称: " + MC_USERNAME);
        await page.screenshot({ path: path.join(__dirname, `screenshots/1_filled.png`) });

        console.log("🚀 准备提交续期请求...");
        const renewBtn = page.locator('button:has-text("Renew")').first();
        
        if (await renewBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
            if (await renewBtn.isEnabled()) {
                await renewBtn.click();
                
                await page.waitForTimeout(5000); 
                await page.screenshot({ path: path.join(__dirname, `screenshots/2_result.png`) });
                
                if (await page.locator('text="The server has been renewed."').isVisible().catch(()=>false)) {
                    console.log("🎉 续期大成功！出现了绿色成功横幅。");
                    await sendTG(`✅ 服务器 [${MC_USERNAME}] 续期成功！\n时间: ${new Date().toLocaleString()}`);
                } else {
                    console.log("⚠️ 点击了按钮，但没检测到绿色横幅。");
                    await sendTG(`⚠️ 续期已执行，请查阅 GitHub 截图确认状态。\n时间: ${new Date().toLocaleString()}`);
                }
            } else {
                console.log("⏸️ Renew 按钮当前不可点击 (可能在冷却中)");
                await sendTG(`ℹ️ 续期跳过，按钮置灰（冷却中）。\n时间: ${new Date().toLocaleString()}`);
            }
        } else {
            console.log("❌ 页面未出现可点击的 Renew 按钮 (因为前置验证码未通过)。");
            await sendTG(`❌ 续期失败：验证码未通过，无法执行 Renew。`);
        }

    } catch (error) {
        console.error("❌ 发生致命错误:", error);
        await page.screenshot({ path: path.join(__dirname, `screenshots/error.png`) });
        await sendTG(`❌ 自动续期崩溃！\n错误信息: ${error.message}`);
    } finally {
        await browserContext.close();
    }
})();
