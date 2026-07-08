import time
import os
import json
import re
import random
import urllib.request

# ================= 智能环境配置 =================
if "DISPLAY" not in os.environ:
    os.environ["DISPLAY"] = ":1"
if "XAUTHORITY" not in os.environ:
    if os.path.exists("/home/headless/.Xauthority"):
        os.environ["XAUTHORITY"] = "/home/headless/.Xauthority"

from seleniumbase import SB

# ================= 核心参数配置 =================
PROXY_URL = "socks5://127.0.0.1:10808"
TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT_ID = os.getenv("TG_CHAT_ID", "")

TARGETS = [
    {"num": "renqi", "region": "renqi"},
    {"num": "heisi", "region": "heisi"}
]

class Game4FreeRenewal:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.screenshot_dir = os.path.join(self.BASE_DIR, "screenshots")
        if not os.path.exists(self.screenshot_dir):
            os.makedirs(self.screenshot_dir)
        self.task_results = []

    def log(self, msg):
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] [INFO] {msg}", flush=True)

    def human_wait(self, min_s=6, max_s=10):
        time.sleep(random.uniform(min_s, max_s))

    def move_mouse_human(self, sb):
        try:
            for _ in range(3):
                sb.slow_click("body", force=True)
                time.sleep(random.uniform(0.5, 1.2))
        except:
            pass

    def get_remaining_time(self, sb):
        remaining_text = "未知"
        try:
            sb.wait_for_element_visible('#sd-timer', timeout=15)
            time.sleep(1)
            remaining_text = sb.get_text('#sd-timer').strip()
        except:
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

    def send_telegram_notify(self):
        if not TG_TOKEN or not TG_CHAT_ID:
            self.log("⚠️ 未配置 TG_TOKEN 或 TG_CHAT_ID，跳过推送。")
            return
        try:
            lines = ["🤖 G4F 续期综合汇报"]
            for res in self.task_results:
                lines.append("-----------------------")
                lines.append(f"节点: {res['name']}")
                lines.append(f"状态: {res['status']}")
                lines.append(f"剩余时间: {res['time']}")
            
            msg = "\n".join(lines)
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT_ID, "text": msg}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
            self.log("✅ TG 综合推送已发送")
        except Exception as e:
            self.log(f"❌ TG 推送失败: {e}")

    def run_single_server(self, server_num, region):
        URL_APP_PANEL = f"https://g4f.gg/{server_num}"
        
        self.log("=" * 40)
        self.log(f"🚀 开始处理节点 [{region}]")
        self.log("=" * 40)

        with SB(
            uc=True,
            test=True,
            headed=True,
            headless=False,
            xvfb=False,
            chromium_arg="--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--window-position=0,0,--start-maximized",
            proxy=PROXY_URL
        ) as sb:
            try:
                self.log(f"📂 正在访问目标网址...")
                sb.uc_open_with_reconnect(URL_APP_PANEL, reconnect_time=5)
                self.human_wait(6, 10)

                # 关闭 Cookie
                cookie_btns = [
                    '//button[contains(., "Continue with Recommended Cookies")]',
                    '//button[contains(., "Recommended Cookies")]',
                    '//button[contains(., "Accept")]',
                    '//button[contains(., "I Agree")]',
                    '//button[contains(., "Consent")]',
                    '//button[contains(., "Got it")]',
                ]
                for btn in cookie_btns:
                    if sb.is_element_present(btn):
                        try:
                            sb.click(btn)
                            self.log("🍪 已关闭 Cookie")
                            break
                        except:
                            pass
                self.human_wait(3, 5)

                timestamp_before = self.get_remaining_time(sb)
                self.log(f"🕒 初始时间: {timestamp_before}")

                # ================== 核心动作 1：向下滚动并点击 ==================
                sb.execute_script("window.scrollBy(0,1000);")
                
                try:
                    self.log("🖱️ 正在点击初始按钮...")
                    self.move_mouse_human(sb)
                    sb.wait_for_element_visible("#sd-vote-btn", timeout=15)
                    sb.click('#sd-vote-btn')
                    self.human_wait(6, 10)
                except Exception as e:
                    self.log(f"❌ 未找到初始按钮: {e}")
                    sb.save_screenshot(f"{self.screenshot_dir}/{region}_error_step1.png")
                    self.task_results.append({"name": region, "status": "❌ 失败 (初始按钮)", "time": "未知"})
                    return

                # ================== 核心动作 2：验证 Cloudflare ==================
                self.log("⏳ 开始迎战 Cloudflare...")
                cf_indicators = ["verify you are human", "确认您是真人", "troubleshoot", "just a moment"]
                for _ in range(10):
                    sb.uc_gui_click_captcha()
                    time.sleep(3)
                    page_lower = sb.get_page_source().lower()
                    if any(x in page_lower for x in cf_indicators):
                        sb.uc_gui_handle_captcha()
                        time.sleep(3)
                        page_lower = sb.get_page_source().lower()
                    if not any(x in page_lower for x in cf_indicators):
                        self.log("✅ Cloudflare 验证通过")
                        break

                # ================== 核心动作 3：最终确认点击 ==================
                try:
                    self.log("🖱️ 正在触发最终确认按钮...")
                    self.move_mouse_human(sb)
                    sb.wait_for_element_visible("#vm-submit", timeout=15)
                    sb.click('#vm-submit')
                    self.human_wait(6, 10)
                except Exception as e:
                    self.log(f"❌ 未找到确认按钮: {e}")
                    sb.save_screenshot(f"{self.screenshot_dir}/{region}_error_step3.png")
                    self.task_results.append({"name": region, "status": "❌ 失败 (确认按钮)", "time": "未知"})
                    return

                # 等待奖励并刷新
                self.log("⏳ 等待 45 秒奖励发放...")
                time.sleep(45)
                sb.refresh_page()
                time.sleep(10)

                timestamp_after = self.get_remaining_time(sb)
                self.log(f"🕒 更新时间: {timestamp_after}")
                
                sb.save_screenshot(f"{self.screenshot_dir}/{region}_final_result.png")

                status = "✅ 成功" if timestamp_after != "未知" and timestamp_after != timestamp_before else "⚠️ 未知/未增加"
                self.task_results.append({"name": region, "status": status, "time": timestamp_after})

            except Exception as e:
                self.log(f"❌ 运行异常: {e}")
                sb.save_screenshot(f"{self.screenshot_dir}/{region}_exception.png")
                self.task_results.append({"name": region, "status": "❌ 异常崩溃", "time": "未知"})

    def run(self):
        for target in TARGETS:
            self.run_single_server(target["num"], target["region"])
        self.log("\n所有节点处理完毕，开始发送通知...")
        self.send_telegram_notify()

if __name__ == "__main__":
    Game4FreeRenewal().run()
