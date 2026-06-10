import os, sys, time, urllib.request, json
from seleniumbase import SB

# ==========================================
# 💡 核心配置 (G4F.GG 极简直连散弹枪版)
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

print(f"\n===== 🚀 开始执行极速续期 (极简直连散弹枪版) =====")

proxy_str = "socks5://127.0.0.1:40000"

with SB(uc=True, proxy=proxy_str, headless=False, window_size="1920,1080") as sb:
    try:
        print("⏳ 正在为虚拟显示器安装 xdotool 物理鼠标引擎...")
        os.system("sudo apt-get update > /dev/null 2>&1")
        os.system("sudo apt-get install -y xdotool > /dev/null 2>&1")

        print(f"🌐 正在通过 WARP 访问目标网址: {TARGET_URL}")
        # 🌟 强制将浏览器窗口钉死在屏幕最左上角，确保物理坐标绝对不会偏移
        sb.driver.set_window_position(0, 0)
        sb.open(TARGET_URL)
        sb.sleep(6) 
        
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_page_loaded.png")

        # 🌟 响应最高指令：直接跳过输入步骤，直奔主题！
        print("🚀 直接触发 [+ ADD 90 MIN] 核心按钮...")
        
        # 彻底删去任何带有 return 的语句，使用最粗暴直接的动作指令
        js_click_code = """
        let els = document.querySelectorAll('button, a, input, div, span');
        for (let i = els.length - 1; i >= 0; i--) {
            let el = els[i];
            let text = (el.innerText || el.value || '').toUpperCase();
            if (text.includes('ADD 90')) {
                el.click();
                break;
            }
        }
        """
        sb.execute_script(js_click_code)
        
        # 纯正 XPath 备用连击，双重保险
        try:
            sb.click('xpath=//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add 90")]', timeout=2)
        except:
            pass

        print("⏳ 盲等 6 秒钟，等待 CF 盾在屏幕正中央完全展开...")
        time.sleep(6) 
        
        print("🛡️ 启动【物理散弹枪覆盖】模块，对准心脏区域实施三连发！")
        
        # 🌟 散弹枪坐标系 (完美避开下方的 Cancel)
        points = [
            (850, 510), # 第一发：偏上
            (850, 530), # 第二发：正中心
            (850, 550)  # 第三发：偏下
        ]
        
        for i, (tx, ty) in enumerate(points):
            print(f"🎯 第 {i+1} 发子弹出膛，轰击绝对坐标: ({tx}, {ty})")
            os.system(f"xdotool mousemove {tx} {ty} click 1")
            time.sleep(0.5) # 给每次点击留出响应间隙
        
        print("🖱️ 散弹三连发完毕！静默等待 8 秒，让盾转圈通过...")
        time.sleep(8)
            
        try:
            sb.save_screenshot("screenshots/2_result.png")
            print("📸 最终战况截图已保存。")
        except:
            print("⚠️ 截图保存失败。")

        print("✅ 流程执行完毕！")
        send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期脚本运行完毕！\n【破盾方式: 极简直连 + 散弹覆盖】请查阅 GitHub 截图确认战果。")

    except Exception as e:
        print(f"❌ 发生致命错误: {e}")
        try:
            os.makedirs("screenshots", exist_ok=True)
            sb.save_screenshot("screenshots/error.png")
        except:
            pass
        send_tg(f"❌ 自动续期崩溃: {e}")
