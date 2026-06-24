import os, sys, time, urllib.request, json, re
from seleniumbase import SB

# ==========================================
# 💡 G4F.GG 自动续期
# ==========================================
TARGETS = [
    {"name": "renqi", "url": "https://g4f.gg/renqi"},
    {"name": "heisi", "url": "https://g4f.gg/heisi"}
]

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")

def send_unified_tg(results):
    if TG_TOKEN and TG_CHAT:
        try:
            # 构建统一的消息面板
            lines = ["🤖 G4F 续期综合汇报"]
            for res in results:
                lines.append("-----------------------")
                lines.append(f"节点: {res['name']}")
                lines.append(f"状态: {res['status']}")
                lines.append(f"剩余时间: {res['time']}")
            
            msg = "\n".join(lines)
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": msg}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
            print("Telegram 综合通知发送成功。")
        except Exception as e:
            print(f"发送通知失败: {e}")

print("\n===== 开始执行 G4F 自动续期 =====")

proxy_str = "socks5://127.0.0.1:40000"
task_results = []

print("初始化物理鼠标依赖...")
os.system("sudo apt-get update > /dev/null 2>&1")
os.system("sudo apt-get install -y xdotool > /dev/null 2>&1")

for target in TARGETS:
    name = target["name"]
    url = target["url"]
    print(f"\n开始处理节点: [{name}]")
    
    try:
        # 确保每次循环都开启一个全新的、未被拦截的纯净浏览器进程
        with SB(uc=True, proxy=proxy_str, headless=False, window_size="1920,1080") as sb:
            print(f"正在访问目标网址: {url}")
            sb.driver.set_window_position(0, 0)
            sb.open(url)
            sb.sleep(6) 
            
            os.makedirs("screenshots", exist_ok=True)
            sb.save_screenshot(f"screenshots/{name}_1_page_loaded.png")

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
            
            try:
                sb.click('xpath=//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add 90")]', timeout=2)
            except:
                pass

            print("等待人机验证加载...")
            time.sleep(6) 
            
            print("执行验证框区域点击 (4x4 网格)...")
            xs = [790, 810, 830, 850]
            ys = [540, 560, 580, 600]
            
            for y in ys:
                for x in xs:
                    os.system(f"xdotool mousemove {x} {y} click 1")
                    time.sleep(0.1)
            
            print("点击完成，等待验证结果...")
            time.sleep(8)
            
            print("等待 16 秒广告时间，确保最终页面完全加载...")
            time.sleep(16)
            
            print("获取页面剩余时间...")
            page_text = sb.get_text("body")
            time_match = re.search(r'\d{2}:\d{2}:\d{2}', page_text)
            remaining_time = time_match.group(0) if time_match else "未知"
            print(f"提取到时间: {remaining_time}")
                
            page_text_lower = page_text.lower()
            if "90 minutes added" in page_text_lower or "extended this server recently" in page_text_lower:
                status = "✅ 续期成功"
            else:
                status = "⚠️ 状态未知"

            try:
                sb.save_screenshot(f"screenshots/{name}_2_result.png")
            except:
                pass
            
            # 记录当前节点的成功状态
            task_results.append({"name": name, "status": status, "time": remaining_time})

    except Exception as e:
        print(f"节点 [{name}] 执行过程中发生异常: {e}")
        task_results.append({"name": name, "status": "❌ 执行失败", "time": "未知"})

print("\n所有节点处理完毕，正在统一发送综合汇报...")
send_unified_tg(task_results)
