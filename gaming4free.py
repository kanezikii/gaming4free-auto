import time
import os
import json
import re
import random
import requests

# 智能环境配置
if "DISPLAY" not in os.environ:
    os.environ["DISPLAY"] = ":1"
    
if "XAUTHORITY" not in os.environ:
    if os.path.exists("/home/headless/.Xauthority"):
        os.environ["XAUTHORITY"] = "/home/headless/.Xauthority"

from seleniumbase import SB

# ================= 配置区域 =================
PROXY_URL = os.getenv("PROXY", "")  
TG_TOKEN = os.getenv("TG_TOKEN")  
TG_CHAT_ID = os.getenv("TG_CHAT_ID")  
SERVERS = os.getenv("SERVERS", "").strip()  

SERVER_LIST = []
if SERVERS:
    for item in SERVERS.split("|"):
        try:
            num, region = item.split(",", 1)
            SERVER_LIST.append({"num": num.strip(), "region": region.strip()})
        except:
            print(f"⚠️ SERVERS 配置格式错误: {item}")
# ===========================================

class Game4FreeRenewal:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.screenshot_dir = os.path.join(self.BASE_DIR, "artifacts")
        if not os.path.exists(self.screenshot_dir):
            os.makedirs(self.screenshot_dir)

    def log(self, msg):
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] [INFO] {msg}", flush=True)

    def human_wait(self, min_s=6, max_s=10):
        time.sleep(random.uniform(min_s, max_s))

    def time_to_seconds(self, t_str):
        """将 HH:MM:SS 格式转换为秒数，用于严格校验续期是否生效"""
        try:
            h, m, s = map(int, t_str.strip().split(':'))
            return h * 3600 + m * 60 + s
        except:
            return 0

    def move_mouse_human_advanced(self, sb):
        """生成更复杂的随机鼠标移动轨迹"""
        try:
            time.sleep(random.uniform(0.1, 0.4))
            width = sb.execute_script("return window.innerWidth;")
            height = sb.execute_script("return window.innerHeight;")

            regions = [
                (0.1 * width, 0.1 * height, 0.4 * width, 0.4 * height),
                (0.6 * width, 0.6 * height, 0.9 * width, 0.9 * height),
                (width / 2, height / 2, width / 2, height / 2)
            ]
            num_paths = random.randint(2, 3)

            for _ in range(num_paths):
                target_region = random.choice(regions)
                x_dest = random.randint(int(target_region[0]), int(target_region[2]))
                y_dest = random.randint(int(target_region[1]), int(target_region[3]))
                x_offset = random.randint(-5, 5)
                y_offset = random.randint(-5, 5)
                
                sb.execute_script(f"""
                    var evt = new MouseEvent("mousemove", {{
                        bubbles: true,
                        cancelable: true,
                        clientX: {x_dest + x_offset},
                        clientY: {y_dest + y_offset}
                    }});
                    document.body.dispatchEvent(evt);
                """)
                time.sleep(random.uniform(0.8, 1.5))
        except:
            pass
    
    def get_remaining_time(self, sb):
        remaining_text = "未知"
        try:
            sb.wait_for_element_visible('#sd-timer', timeout=15)
            time.sleep(1)
            remaining_text = sb.get_text('#sd-timer').strip()
        except Exception as e:
            try:
                remaining_text = sb.execute_script("""
                    var el = document.querySelector('#sd-timer');
                    return el ? el.innerText.trim() : null;
                """)
                if not remaining_text:
                    remaining_text = "未知"
            except:
                remaining_text = "未知"
        return remaining_text

    def send_telegram_notify(self, message, photo_path=None):
        if not TG_TOKEN or not TG_CHAT_ID:
            self.log("⚠️ 未配置 TG_TOKEN，跳过推送。")
            return
        try:
            if photo_path and os.path.exists(photo_path):
                url = f"https://api.telegram.org/bot{TG_TOKEN}/sendPhoto"
                with open(photo_path, 'rb') as f:
                    requests.post(url, data={'chat_id': TG_CHAT_ID, 'caption': message}, files={'photo': f})
            else:
                url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
                requests.post(url, data={'chat_id': TG_CHAT_ID, 'text': message})
            self.log("✅ TG 推送已发送")
        except Exception as e:
            self.log(f"❌ TG 推送失败: {e}")

    def run_single_server(self, server_num, region):
        URL_APP_PANEL = f"https://gaming4free.net/servers/{server_num}"

        self.log("=" * 40)
        self.log(f"🚀 开始续期 [{region}] ({server_num})")
        
        USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

        with SB(
            uc=True,
            test=True,
            headed=True,
            headless=False,
            xvfb=False,
            chromium_arg=f"--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--window-position=0,0,--start-maximized,--disable-blink-features=AutomationControlled,--disable-infobars,--disable-popup-blocking,--user-agent={USER_AGENT}",
            proxy=PROXY_URL if PROXY_URL else None
        ) as sb:
            try:
                self.log("✅ 浏览器已启动！")

                try:
                    sb.open("https://api.ipify.org?format=json")
                    ip_val = json.loads(re.search(r'\{.*\}', sb.get_text("body")).group(0)).get('ip', 'Unknown')
                    parts = ip_val.split('.')
                    self.log(f"✅ 当前出口 IP: {parts[0]}.{parts[1]}.***.{parts[-1]}")
                except:
                    pass

                self.log(f"📂 正在进入续期面板 [{region}] ...")
                sb.uc_open_with_reconnect(URL_APP_PANEL, reconnect_time=5)
                self.human_wait(8, 12)

                if "login" in sb.get_current_url().lower():
                    raise Exception("登录状态失效或权限被拒绝。")

                cookie_btns = ['//button[contains(., "Continue with Recommended Cookies")]', '//button[contains(., "Accept")]', '//button[contains(., "I Agree")]', '//button[contains(., "Consent")]']
                for btn in cookie_btns:
                    if sb.is_element_present(btn):
                        try:
                            sb.click(btn)
                            break
                        except:
                            pass

                timestamp_before = self.get_remaining_time(sb)
                self.log(f"🕒 续期前剩余运行时间: {timestamp_before}")

                sb.execute_script("window.scrollBy(0,800);")
                self.human_wait(2, 4)
                
                try:
                    self.log("🖱️ 正在迹点击 'VOTE + ADD 90 MIN'...")
                    self.move_mouse_human_advanced(sb)
                    sb.wait_for_element_visible("#sd-vote-btn", timeout=10)
                    sb.click('#sd-vote-btn')
                except Exception as e:
                    raise Exception(f"未找到打开模态框的按钮: {e}")

                self.log("⏳ 观看视频广告...")
                time.sleep(35) 
                
                try:
                    sb.execute_script("document.querySelector('#vm-submit').scrollIntoView({block: 'center'});")
                    time.sleep(1)
                except:
                    pass

                self.log("📡 开始扫描")
                cf_found = False
                for _ in range(5):
                    if sb.execute_script("return !!document.querySelector('iframe[src*=\"challenges.cloudflare.com\"], iframe[src*=\"turnstile\"], [name=\"cf-turnstile-response\"]')"):
                        cf_found = True
                        break
                    time.sleep(1)

                if cf_found:
                    self.log("🛡️ 锁定 Cloudflare 验证框，执行点击...")
                    for attempt in range(3):
                        try:
                            sb.uc_gui_click_captcha()
                            time.sleep(4)
                            token = sb.execute_script("return document.querySelector('[name=\"cf-turnstile-response\"]') ? document.querySelector('[name=\"cf-turnstile-response\"]').value : ''")
                            if token:
                                self.log("✅ Turnstile 验证已成功获取凭证！")
                                break
                        except Exception as e:
                            self.log(f"⚠️ 破解尝试 {attempt+1} 出现小偏差，继续重试...")
                        time.sleep(2)
                else:
                    self.log("✅ 扫描未发现验证框，当前 IP 免检。")
                # ========================================================

                self.human_wait(2, 4)

                try:
                    self.log("🖱️ 正在点击最终提交按钮 'VOTE — ADDS 90 MINUTES'...")
                    # 确保按钮不仅可见，还要处于可点击的激活状态（防广告遮挡或倒计时锁定）
                    sb.wait_for_element_clickable("#vm-submit", timeout=15)
                    sb.click('#vm-submit')
                    self.human_wait(8, 12)
                except Exception as e:
                    raise Exception("未能点击最终的确认提交按钮，可能是广告仍未加载完成导致按钮未激活。")

                time.sleep(8)
                
                timestamp_after = self.get_remaining_time(sb)
                self.log(f"🕒 续期后剩余运行时间: {timestamp_after}")

                sec_before = self.time_to_seconds(timestamp_before)
                sec_after = self.time_to_seconds(timestamp_after)
                
                if sec_after > 0 and sec_before > 0:
                    if sec_after <= sec_before + 120:  
                        raise Exception("时间并未增加！人机验证失败或提交请求被服务器拦截。")

                final_screenshot = f"{self.screenshot_dir}/final_success_{server_num}.png"
                sb.save_screenshot(final_screenshot)

                msg = f"✅ [{region}] 续期成功\n🖥️ 编号: {server_num}\n🕒 续期前剩余时间: {timestamp_before}\n🎉 续期后剩余时间: {timestamp_after}"
                self.send_telegram_notify(msg, final_screenshot)

            except Exception as e:
                self.log(f"❌ 运行异常: {e}")
                sb.save_screenshot(f"{self.screenshot_dir}/error_{server_num}.png")
                self.send_telegram_notify(f"❌ [{region}] 执行失败: {e}\n🖥️ 编号: {server_num}", f"{self.screenshot_dir}/error_{server_num}.png")

    def run(self):
        if not SERVER_LIST:
            self.log("❌ 未配置 SERVERS")
            return
        for server in SERVER_LIST:
            self.run_single_server(server["num"], server["region"])


if __name__ == "__main__":
    Game4FreeRenewal().run()
