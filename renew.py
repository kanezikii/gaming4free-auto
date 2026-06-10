import os, sys, time, urllib.request, json
from seleniumbase import SB

# ==========================================
# 💡 G4F.GG 自动续期脚本 (生产环境精简版)
# ==========================================
TARGET_URL = "https://g4f.gg/renqi" 
MC_USERNAME = "renqi"

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")

def send_tg(status, time_str):
    if TG_TOKEN and TG_CHAT:
        try:
            # 极简通知格式：只保留节点、状态和剩余时间
            msg = f"🤖 节点 [{MC_USERNAME}]\n状态: {status}\n剩余时间: {time_str}"
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": msg}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        except:
            pass

print("\n===== 开始执行 G4F 自动续期 =====")

proxy_str = "socks5://127.0.0.1:40000"

with SB(uc=True, proxy=proxy_str, headless=False, window_size="1920,1080") as sb:
    try:
        print("初始化物理鼠标依赖...")
        os.system("sudo apt-get update > /dev/null 2>&1")
        os.system("sudo apt-get install -y xdotool > /dev/null 2>&1")

        print(f"访问目标网址: {TARGET_URL}")
        # 固定窗口坐标，确保点击精度
        sb.driver.set_window_position(0, 0)
        sb.open(TARGET_URL)
        sb.sleep(6) 
        
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_page_loaded.png")

        print("尝试点击续期按钮...")
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
        
        # 备用点击
        try:
            sb.click('xpath=//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add 90")]', timeout=2)
        except:
            pass

        print("等待人机验证加载...")
        time.sleep(6) 
        
        print("执行验证框区域点击 (4x4 网格)...")
        # 经验证 100% 有效的安全物理坐标网格
        xs = [790, 810, 830, 850]
        ys = [540, 560, 580, 600]
        
        for y in ys:
            for x in xs:
                os.system(f"xdotool mousemove {x} {y} click 1")
                time.sleep(0.1)
        
        print("点击完成，等待验证结果...")
        time.sleep(8)
        
        print("获取页面剩余时间...")
        # 🌟 利用正则表达式，精准抓取网页中的 00:00:00 时间串
        js_get_time = "let m = document.body.innerText.match(/\\d{2}:\\d{2}:\\d{2}/); return m ? m[0] : '未知';"
        remaining_time = sb.execute_script(js_get_time)
        print(f"提取到时间: {remaining_time}")
            
        # 🌟 验证最终结果
        page_text = sb.get_text("body").lower()
        if "90 minutes added" in page_text or "extended this server recently" in page_text:
            status = "✅ 续期成功"
        else:
            status = "⚠️ 状态未知"

        try:
            sb.save_screenshot("screenshots/2_result.png")
        except:
            pass

        print(f"流程执行完毕。状态: {status}")
        send_tg(status, remaining_time)

    except Exception as e:
        print(f"发生异常: {e}")
        try:
            os.makedirs("screenshots", exist_ok=True)
            sb.save_screenshot("screenshots/error.png")
        except:
            pass
        send_tg("❌ 发生异常失败", "未知")
