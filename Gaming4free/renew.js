const { chromium } = require('playwright');
const path = require('path');

const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD; 
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
    } catch (e) {
        console.error("TG通知发送失败:", e);
    }
}

(async () => {
    console.log("🚀 启动浏览器...");
    const busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');

    const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${busterPath}`,
            `--load-extension=${busterPath}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreDefaultArgs: ["--mute-audio"],
    });

    const page = await context.newPage();
    let targetPage = page;

    try {
        console.log("🌐 访问登录页...");
        await targetPage.goto('https://gaming4free.net/login', { waitUntil: 'networkidle' });

        // 1. 执行登录
        console.log("🔑 正在输入账号密码...");
        await targetPage.locator('input[type="email"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: 'Sign In' }).click();

        await targetPage.waitForURL('**/dashboard**', { timeout: 20000 })
            .catch(() => console.log("未检测到标准 URL 跳转，继续尝试..."));
        await targetPage.waitForLoadState('networkidle');

        // 处理新手引导弹窗
        console.log("🔍 检查是否有新手引导弹窗...");
        try {
            const skipBtn = targetPage.getByText('Skip', { exact: true });
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            console.log("👀 发现新手引导，已点击 Skip 跳过。");
            await targetPage.waitForTimeout(1000); 
        } catch (error) {
            console.log("✅ 5秒内未检测到弹窗，继续执行。");
        }

        // 2. 点击 Panel (外部跳转图标)
        console.log("🎛️ 准备进入服务器后台 Panel...");
        const panelPromise = context.waitForEvent('page').catch(() => null);
        
        await targetPage.locator('a[target="_blank"]').last().click({ force: true });
        
        const newPage = await panelPromise;
        if (newPage) {
            targetPage = newPage;
            await targetPage.waitForLoadState('domcontentloaded');
        }

        // 3. 点击 Console
        console.log("💻 正在进入 Console 面板...");
        await targetPage.getByText('Console', { exact: true }).click();
        await targetPage.waitForLoadState('networkidle');

        // 4. 点击增加时间
        console.log("⏳ 正在寻找并点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await addTimeBtn.click({ force: true });

        // ==========================================
        // 🌟 核心升级：激进的广告等待与弹窗清理策略
        // ==========================================
        console.log("📺 进入广告/跳转处理阶段，最长等待 5 分钟...");
        let success = false;
        
        for (let i = 0; i < 60; i++) {
            await targetPage.waitForTimeout(5000); // 每次等 5 秒
            
            // 招式一：无脑按 ESC 键（可以直接关掉 90% 的网页居中弹窗，包括截图里那个）
            await targetPage.keyboard.press('Escape').catch(() => {});
            
            // 招式二：尝试寻找并点击各种常见的关闭按钮图标 (X)
            try {
                // 模糊匹配包含 close 的按钮或 SVG 图标
                const closeBtn = targetPage.locator('button[aria-label*="lose" i], [class*="close" i], svg.lucide-x').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    await closeBtn.click({ force: true });
                    console.log("💥 检测到阻碍跳转的广告弹窗，已强行关闭！");
                }
            } catch (e) {}

            // 招式三：检查是否已经跳回了控制台并且出现了 PLEASE WAIT
            try {
                const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                if (await waitBtn.isVisible({ timeout: 1000 })) {
                    success = true;
                    console.log("✅ 成功回到控制台，已进入 PLEASE WAIT 续期等待状态！");
                    break;
                }
            } catch (e) {}
        }

        if (!success) {
            throw new Error("🚨 等待广告结束超时！可能是广告页面卡死，未能跳回控制台。");
        }
        // ==========================================

        console.log("🎉 续期成功！");
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}`);

    } catch (error) {
        console.error("❌ 发生错误:", error);
        
        const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
        await targetPage.screenshot({ path: screenshotPath });
        
        await sendTelegramMessage(`⚠️ 续期脚本崩溃！\n账号: ${MC_USERNAME}\n报错: ${error.message.substring(0, 100)}...`);
        process.exit(1);
        
    } finally {
        await context.close();
        console.log("🛑 脚本运行结束。");
    }
})();
