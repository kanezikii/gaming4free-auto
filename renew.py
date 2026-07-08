import os
import sys
import time
import urllib.request
import json
import random
from seleniumbase import SB

# ==========================================
# G4F.GG 自动续期脚本 (完美融合参考框架版)
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
    if not TG_TOKEN or not TG_CHAT:
        return
    try:
        lines = ["🤖 G4F Renew Status"]
        for res in results:
            lines.append("-----------------------")
            lines.append(f"Node: {res['name']}")
            lines.append(f"Status: {res['status']}")
            lines.append(f"Time: {res['time']}")
        msg = "\n".join(lines)
        url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
        data = json.dumps({"chat_id": TG_CHAT, "text": msg}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"TG Error: {e}")

def get_time(sb):
    try:
        sb.wait_for_element_visible('#sd-timer', timeout=15)
        time.sleep(1)
        return sb.get_text('#sd-timer').strip()
    except:
        try:
            return sb.execute_script("let el = document.querySelector('#sd-timer'); return el ? el.innerText.trim() : 'Unknown';")
        except:
            return "Unknown"

def human_action(sb):
    """模拟人类滚动页面并随机点击空白处，防止广告遮挡及增加信任度"""
    try:
        sb.execute_script("window.scrollBy(0, 1000);")
        for _ in range(2):
            sb.slow_click("body", force=True)
            time.sleep(random.uniform(0.5, 1.2))
    except:
        pass

print("Task started")
task_results = []
os.makedirs("screenshots", exist_ok=True)

for target in TARGETS:
    name = target["name"]
    url = target["url"]
    print(f"\n[{name}] Process started")
    
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
            
            print(f"[{name}] Loading page")
            sb.uc_open_with_reconnect(url, reconnect_time=5)
            time.sleep(random.uniform(6, 10))
            
            time_before = get_time(sb)
            print(f"[{name}] Initial time: {time_before}")

            # 1. 处理 Cookie 弹窗
            cookie_btns = [
                '//button[contains(., "Recommended Cookies")]',
                '//button[contains(., "Accept")]',
                '//button[contains(., "I Agree")]',
                '//button[contains(., "Consent")]'
            ]
            for btn in cookie_btns:
                if sb.is_element_present(btn):
                    try: 
                        sb.click(btn)
                        print(f"[{name}] Cookie accepted")
                        break
                    except: pass
            time.sleep(2)

            # 2. 初始点击 (滑动避开广告 -> 官方 ID 定位)
            print(f"[{name}] Step 1: Initial click")
            human_action(sb)
            try:
                sb.wait_for_element_visible("#sd-vote-btn", timeout=10)
                sb.click('#sd-vote-btn')
            except Exception as e:
                print(f"[{name}] Error clicking initial button: {e}")
                sb.save_screenshot(f"screenshots/{name}_error_step1.png")
                raise Exception("Initial button not found")

            time.sleep(random.uniform(6, 10))

            # 3. 循环击破 CF 人机验证盾
            print(f"[{name}] Step 2: Captcha")
            cf_indicators = ["verify you are human", "确认您是真人", "troubleshoot", "just a moment"]
            for _ in range(10): # 尝试 10 次
                try:
                    sb.uc_gui_click_captcha()
                    time.sleep(3)
                    page_lower = sb.get_page_source().lower()
                    if any(x in page_lower for x in cf_indicators):
                        sb.uc_gui_handle_captcha()
                        time.sleep(3)
                        page_lower = sb.get_page_source().lower()
                    if not any(x in page_lower for x in cf_indicators):
                        print(f"[{name}] Captcha passed")
                        break
                except:
                    pass

            # 4. 最终确认点击
            print(f"[{name}] Step 3: Submit")
            try:
                human_action(sb)
                sb.wait_for_element_visible("#vm-submit", timeout=10)
                sb.click('#vm-submit')
            except Exception as e:
                print(f"[{name}] Error clicking submit button: {e}")
                sb.save_screenshot(f"screenshots/{name}_error_step3.png")
                raise Exception("Submit button not found")

            # 5. 等待奖励发放与刷新
            print(f"[{name}] Step 4: Wait for reward (35s)")
            time.sleep(35)
            
            print(f"[{name}] Step 5: Refresh")
            sb.refresh_page()
            time.sleep(10)
            
            final_time = get_time(sb)
            print(f"[{name}] Final time: {final_time}")
            
            if final_time != "Unknown" and final_time != time_before:
                status = "Success"
            else:
                status = "Unknown/Failed"
                
            sb.save_screenshot(f"screenshots/{name}_final_result.png")
            task_results.append({"name": name, "status": status, "time": final_time})

    except Exception as e:
        print(f"[{name}] Exception: {e}")
        task_results.append({"name": name, "status": "Error", "time": "Unknown"})

print("Task finished, sending notification")
send_tg(task_results)
