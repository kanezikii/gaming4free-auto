import os, sys, time, urllib.request, json, re, random
from seleniumbase import SB

# ==========================================
# G4F.GG 自动续期
# ==========================================

if "DISPLAY" not in os.environ:
    os.environ["DISPLAY"] = ":1"
if "XAUTHORITY" not in os.environ:
    if os.path.exists("/home/headless/.Xauthority"):
        os.environ["XAUTHORITY"] = "/home/headless/.Xauthority"

TARGETS = [
    {"name": "renqi", "url": "https://g4f.gg/renqi"},
    {"name": "heisi", "url": "https://g4f.gg/heisi"}
]

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")
PROXY_URL = "socks5://127.0.0.1:10808"

def send_tg(results):
    if TG_TOKEN and TG_CHAT:
        try:
            lines = ["G4F 续期汇报"]
            for res in results:
                lines.append("-----------------------")
                lines.append(f"节点: {res['name']}")
                lines.append(f"状态: {res['status']}")
                lines.append(f"时间: {res['time']}")
            msg = "\n".join(lines)
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": msg}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            print(f"通知失败: {e}")

def get_time(sb):
    try:
        sb.wait_for_element_visible('#sd-timer', timeout=15)
        time.sleep(1)
        return sb.get_text('#sd-timer').strip()
    except:
        try:
            return sb.execute_script("let el = document.querySelector('#sd-timer'); return el ? el.innerText.trim() : '未知';")
        except:
            return "未知"

print("\n===== 开始执行 =====")
task_results = []
os.makedirs("screenshots", exist_ok=True)

for target in TARGETS:
    name = target["name"]
    url = target["url"]
    print(f"\n开始处理: [{name}]")
    
    try:
        with SB(
            uc=True, 
            test=True, 
            headed=True, 
            headless=False, 
            xvfb=False, 
            chromium_arg="--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--window-position=0,0,--start-maximized",
            proxy=PROXY_URL
        ) as sb:
            
            print("访问页面...")
            sb.uc_open_with_reconnect(url, reconnect_time=5)
            time.sleep(random.uniform(6, 10))
            sb.save_screenshot(f"screenshots/{name}_1_loaded.png")

            time_before = get_time(sb)
            print(f"当前时间: {time_before}")

            print("点击初始按钮...")
            try:
                sb.execute_script("""
                    document.querySelectorAll('button').forEach(b => {
                        if(b.innerText.includes('Accept') || b.innerText.includes('Recommended')) b.click();
                    });
                """)
                time.sleep(1)
                sb.execute_script("document.querySelector('#sd-vote-btn').click();")
            except:
                try: sb.click('#sd-vote-btn')
                except: pass

            time.sleep(4)

            print("处理人机验证...")
            for _ in range(3):
                try:
                    sb.uc_gui_click_captcha()
                    time.sleep(2)
                    sb.uc_gui_handle_captcha()
                except:
                    pass
                time.sleep(3)
            
            print("触发确认按钮...")
            try:
                sb.execute_script("document.querySelector('#vm-submit').click();")
            except:
                try: sb.click('#vm-submit', timeout=5)
                except: pass

            print("等待奖励发放...")
            time.sleep(45) 
            
            print("刷新页面...")
            sb.refresh_page()
            time.sleep(8)
            
            final_time = get_time(sb)
            print(f"更新时间: {final_time}")
            
            status = "成功" if final_time != "未知" and final_time != time_before else "未知/未增加"
            sb.save_screenshot(f"screenshots/{name}_2_result.png")
            task_results.append({"name": name, "status": status, "time": final_time})

    except Exception as e:
        print(f"执行异常: {e}")
        task_results.append({"name": name, "status": "异常", "time": "未知"})

print("\n执行完毕，发送通知...")
send_tg(task_results)
