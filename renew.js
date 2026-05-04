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

    // 🌟 回归初心：去除 channel: 'chrome'，使用你 yml 中默认安装的 Chromium，最稳定。
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
                // 🌟 防御：如果是图片验证码，先点击耳机图标切换到语音模式
                const audioBtn = challengeFrame.locator('#recaptcha-audio-button');
                if (await audioBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log("🎧 切换到语音验证模式...");
                    await audioBtn.click({ force: true });
                    await page.waitForTimeout(2000); 
                }

                // 🌟 核心修复：精准定位 Buster 的按钮 ID
                const busterBtn = challengeFrame.locator('#solver-button').first();
                
                if (await busterBtn.isVisible({ timeout: 5000 })) {
                    console.log("🔄 发现 Buster 按钮，准备启动【真实物理点击】...");
                    
                    let solved = false;
                    for (let tryCount = 1; tryCount <= 3; tryCount++) {
                        console.log(`🖱️ 第 ${tryCount} 次尝试触发 Buster...`);
                        
                        // 🌟 杀手锏：获取按钮在屏幕上的物理坐标，驱动虚拟鼠标真实点击
                        const box = await busterBtn.boundingBox();
                        if (box) {
                            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                            await page.mouse.down();
                            await page.mouse.up();
                        } else {
                            await busterBtn.click({ force: true });
                        }
                        
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
                            console.log(`⚠️ 第 ${tryCount} 次触发未能完成破解，可能是网络拦截，准备重试...`);
                        }
                    }
                    
                    if (!solved) {
                        console.log("❌ Buster 破解彻底失败 (极大可能是当前 WARP IP 被 Google 拒绝下发音频)。");
                    }
                } else {
                    console.log("⚠️ 找不到 Buster 破解按钮，跳过破解...");
                }
            } catch (err) {
                console.log("⚠️ 验证码弹窗处理异常: " + err.message);
            }
        }

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
            await sendTG(`❌ 续期跳过：验证码未通过 (大概率因 IP 质量导致音频被拒)。`);
        }

    } catch (error) {
        console.error("❌ 发生致命错误:", error);
        await page.screenshot({ path: path.join(__dirname, `screenshots/error.png`) });
        await sendTG(`❌ 自动续期崩溃！\n错误信息: ${error.message}`);
    } finally {
        await browserContext.close();
    }
})();
