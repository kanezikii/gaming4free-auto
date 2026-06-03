import os, sys, time, urllib.request, json
from seleniumbase import SB

# ==========================================
# 💡 核心配置 (适配全新 g4f.gg 界面)
# ==========================================
TARGET_URL = "https://g4f.gg/renqi" 
MC_USERNAME = "renqi"

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")

def send_tg(msg):
    if TG_TOKEN and TG_CHAT:
        try:
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": f"🤖 G4F 自动续期:\n{msg}"}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        except:
            pass

print(f"\n===== 🚀 开始执行极速续期 (G4F.GG 赛博朋克全新版) =====")

proxy_str = "socks5://127.0.0.1:40000"

with SB(uc=True, proxy=proxy_str, headless=False) as sb:
    try:
        print(f"🌐 正在通过 WARP 访问新版目标网址: {TARGET_URL}")
        sb.open(TARGET_URL)
        
        sb.sleep(6) 
        
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_page_loaded.png")

        print("✍️ 尝试填入游戏ID (OPTIONAL)...")
        try:
            sb.type('input[placeholder*="Steve"], input[placeholder*="Player"]', MC_USERNAME, timeout=5)
            print("✅ ID 填入成功！")
        except:
            print("ℹ️ 未找到输入框或无需填入，继续下一步。")

        print("🚀 寻找 [+ ADD 90 MIN] 核心按钮并执行降维打击...")
        
        js_click_code = """
        let clicked = false;
        let els = document.querySelectorAll('button, a, input, div, span');
        for (let i = els.length - 1; i >= 0; i--) {
            let el = els[i];
            let text = (el.innerText || el.value || '').toUpperCase();
            if (text.includes('ADD 90')) {
                el.click();
                clicked = true;
                break;
            }
        }
        return clicked;
        """
        
        is_clicked = sb.execute_script(js_click_code)
        
        if is_clicked:
            print("🖱️ JavaScript 强制穿透点击成功！")
        else:
            print("⚠️ JS 未能点击，尝试备用 XPath 方案...")
            sb.click('xpath=//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add 90")]')

        # 🌟 核心杀手锏：全天候雷达监控 CF 弹窗！
        print("⏳ 开启全天候雷达，检测是否有 Cloudflare 盾弹窗 (最高守候 12 秒)...")
        # 扩大匹配范围，抓取一切疑似的验证框
        cf_iframe = 'iframe[src*="cloudflare"], iframe[src*="turnstile"], iframe[title*="Cloudflare"], iframe[title*="challenge"]'
        
        try:
            # 死死盯住屏幕 12 秒，一旦弹窗露头立马捕获！
            sb.wait_for_element(cf_iframe, timeout=12)
            print("🛡️ 成功捕获 Cloudflare Turnstile 验证弹窗！准备破盾...")
            
            # 切入 CF 的内置框架
            sb.switch_to_frame(cf_iframe)
            sb.sleep(1.5) # 给盾里的动画一点时间
            
            # 物理模拟点击整个验证框的躯体
            sb.click('body')
            print("🖱️ 已狠狠按下 CF 验证框！等待转圈验证通过...")
            sb.sleep(7)
            
        except Exception as e:
            # 如果 12 秒后都没弹窗，说明直接免验证通过了
            print("⏩ 12秒内未检测到 CF 弹窗，或盾已自动消失，继续下一步...")
            
        finally:
            # 无论破盾成功与否，安全撤回到主页面
            sb.switch_to_default_content()

        print("⏳ 等待最终续期结果加载 (等待 6 秒)...")
        sb.sleep(6)
        sb.save_screenshot("screenshots/2_result.png")

        print("✅ 流程执行完毕！")
        send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期脚本运行完毕！\n官方界面已重构，请查阅 GitHub 最新截图确认 CF 盾是否通过以及时间是否增加。")

    except Exception as e:
        print(f"❌ 发生致命错误: {e}")
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/error.png")
        send_tg(f"❌ 自动续期崩溃: {e}")
