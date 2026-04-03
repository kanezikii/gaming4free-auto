const { chromium } = require('playwright');
const path = require('path');

// 从 GitHub Actions 提取环境变量
const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD; 
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

// 发送 TG 通知的方法
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
        headless: false, // 必须为 false 才能加载 Buster 插件
        args: [
            `--disable-extensions-except=${busterPath}`,
            `--load-extension=${busterPath}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreDefaultArgs: ["--mute-audio"], // 允许播放声音，防验证码拦截
    });

    const page = await context.newPage();
    let targetPage = page; // 用于跟踪当前处于焦点的页面

    try {
        console.log("🌐 访问登录页...");
        await targetPage.goto('https://gaming4free.net/login', { waitUntil: 'networkidle' });

        // 1. 执行登录
        console.log("🔑 正在输入账号密码...");
        await targetPage.locator('input[type="email"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: 'Sign In' }).click();

        // 等待登录成功并进入 Dashboard
        await targetPage.waitForURL('**/dashboard**', { timeout: 20000 })
            .catch(() => console.log("未检测到标准 URL 跳转，继续尝试..."));
        await targetPage.waitForLoadState('networkidle');

        // 2. 点击 Panel (外部跳转图标)
        console.log("🎛️ 准备进入服务器后台 Panel...");
        // 查找包含 target="_blank" 的 a 标签（通常是这种面板右下角的跳转图标）
        const panelPromise = context.waitForEvent('page').catch(() => null);
        await targetPage.locator('a[target="_blank"]').last().click();
        
        // 如果点击后新开了一个标签页，就把控制权交给新标签页
        const newPage = await panelPromise;
        if (newPage) {
            targetPage = newPage;
            await targetPage.waitForLoadState('domcontentloaded');
        }

        // 3. 点击 Console
        console.log("💻 正在进入 Console 面板...");
        // 根据截图4，顶部导航包含 Console
        await targetPage.getByText('Console', { exact: true }).click();
        await targetPage.waitForLoadState('networkidle');

        // 4. 点击增加时间
        console.log("⏳ 正在寻找并点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await addTimeBtn.click();

        // 5. 等待广告读秒结束
        console.log("📺 广告时间... 正在等待状态变更为 PLEASE WAIT...");
        // 设一个 5 分钟的超长等待，确保广告能播完
        const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
        await waitBtn.waitFor({ state: 'visible', timeout: 20 });

        console.log("✅ 续期成功！");
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}`);

    } catch (error) {
        console.error("❌ 发生错误:", error);
        
        // 截图留证
        const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
        await targetPage.screenshot({ path: screenshotPath });
        
        await sendTelegramMessage(`⚠️ 续期脚本崩溃！\n账号: ${MC_USERNAME}\n详见 Actions 截图日志。\n报错: ${error.message.substring(0, 100)}...`);
        process.exit(1); // 抛出异常，让 GitHub Actions 标记为失败 (红叉)
        
    } finally {
        await context.close();
        console.log("🛑 脚本运行结束。");
    }
})();
