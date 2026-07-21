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
from selenium.webdriver.common.action_chains import ActionChains

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
        if not t_str or "EXPIRED" in t_str.upper() or "未知" in t_str:
            return 0
        try:
            h, m, s = map(int, t_str.strip().split(':'))
            return h * 3600 + m * 60 + s
        except:
            return 0

    def get_remaining_time(self, sb):
        remaining_text = "未知"
        try:
            sb.wait_for_element_visible('#sd-timer', timeout=15)
            time.sleep(1)
            remaining_text = sb.get_text('#sd-timer').strip()
        except Exception:
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
        
        # ⚠️ 关键修复 1：移除了硬编码的 User-Agent
        # 让 uc 模式自动匹配真实的浏览器内核指纹，防止被 Cloudflare 秒杀
        CHROMIUM_ARGS = "--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--window-position=0,0,--window-size=1280,720,--disable-blink-features=AutomationControlled,--disable-infobars,--disable-popup-blocking"

        with SB(
            uc=True,
            test=True,
            headed=True,
            headless=False,
            xvfb=False,  # GitHub Actions 中已经使用 xvfb-run
            chromium_arg=CHROMIUM_ARGS,
            proxy=PROXY_URL if PROXY_URL else None
        ) as sb:
            try:
                self.log("✅ 浏览器已启动！")
                sb.driver.maximize_window() # 确保在虚拟桌面中完全展开

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

                sb.execute_script("window.scrollBy(0,600);")
                self.human_wait(2, 4)
                
                # 打开验证模态框
                try:
                    self.log("🖱️ 正在点击 'VOTE + ADD 90 MIN'...")
                    sb.wait_for_element_visible("#sd-vote-btn", timeout=10)
                    sb.click('#sd-vote-btn')
                except Exception as e:
                    raise Exception(f"未找到打开模态框的按钮: {e}")

                self.log("⏳ 等待 15 秒，确保模态框加载及底层视频广告播放...")
                time.sleep(15)  
                
                # 清理遮挡广告（保留 DOM 结构完整性）
                try:
                    sb.execute_script("""
                        document.querySelectorAll('ins, .ad-container, iframe[src*="google"]').forEach(e => e.remove());
                    """)
                except: pass
                time.sleep(2)

                # ========================================================
                # 💥 关键修复 2：Shadow DOM 递归穿透 + 三重扫射点击
                # ========================================================
                token = ""
                for attempt in range(4):
                    self.log(f"⚡ 尝试定位并破解 Cloudflare (尝试 {attempt+1}/4)...")
                    
                    # 强力 JS 脚本：遍历全 DOM (包含所有影子节点) 寻找 Turnstile
                    rect = sb.execute_script("""
                        let result = null;
                        function searchDOM(node) {
                            if (result) return;
                            if (node.tagName === 'IFRAME' && (node.src.includes('cloudflare') || node.src.includes('turnstile'))) {
                                result = node;
                                return;
                            }
                            if (node.shadowRoot) searchDOM(node.shadowRoot);
                            for (let child of node.children) searchDOM(child);
                        }
                        searchDOM(document.body);
                        
                        if (result) {
                            result.id = 'cf-target-iframe-unique';
                            // 强制滚动到视图中央
                            result.scrollIntoView({block: 'center', inline: 'center'});
                            let r = result.getBoundingClientRect();
                            return {x: r.left, y: r.top, width: r.width, height: r.height};
                        }
                        return null;
                    """)
                    
                    if rect and rect['width'] > 0:
                        self.log(f"   -> 🎯 成功穿透 DOM 锁定 CF iframe! 尺寸: {rect['width']}x{rect['height']}")
                        
                        try:
                            # 策略 A: SeleniumBase 的抗指纹原生点击
                            sb.uc_click('#cf-target-iframe-unique')
                            time.sleep(1)
                            
                            # 策略 B: ActionChains 物理坐标扫射 (精准打击打勾框)
                            cf_el = sb.driver.find_element("css selector", "#cf-target-iframe-unique")
                            # 计算复选框相对于元素中心的 X 轴偏移量（偏左约一半宽度，再往右收 30 像素）
                            center_x_offset = int(-(rect['width'] / 2) + 30)
                            
                            # 依次执行三次细微水平偏移的点击，确保必定打中
                            for offset in [center_x_offset - 15, center_x_offset, center_x_offset + 15]:
                                ac = ActionChains(sb.driver)
                                ac.move_to_element(cf_el).move_by_offset(offset, 0).click().perform()
                                time.sleep(0.5)
                                
                        except Exception as e:
                            self.log(f"   -> 🖱️ 坐标扫射执行异常 (可忽略): {e}")
                    else:
                        self.log("   -> ⚠️ 未能找到明确的 CF iframe，尝试备用 GUI 兜底盲点...")
                        try: sb.uc_gui_click_captcha()
                        except: pass
                    
                    self.log("   -> ⏳ 等待 Cloudflare 验证回调 (6 秒)...")
                    time.sleep(6)
                    
                    # 摸底检查：获取 CF 注入到隐藏表单里的凭证 Token
                    token = sb.execute_script("return document.querySelector('[name=\"cf-turnstile-response\"]') ? document.querySelector('[name=\"cf-turnstile-response\"]').value : ''")
                    
                    if token:
                        self.log("✅ 破盾成功！已获取到 Cloudflare 凭证。")
                        break
                
                if not token:
                    self.log("⚠️ 4 轮尝试后未获取到显式凭证，可能已静默通过或 IP 被高亮审查，强行提交碰运气！")
                # ========================================================

                self.human_wait(2, 4)

                try:
                    self.log("🖱️ 正在点击最终提交按钮 'VOTE — ADDS 90 MINUTES'...")
                    sb.wait_for_element_visible("#vm-submit", timeout=15)
                    sb.uc_click('#vm-submit') 
                    self.human_wait(8, 12)
                except Exception as e:
                    raise Exception("未能点击最终的确认提交按钮，可能是按钮未激活。")

                time.sleep(10)
                
                timestamp_after = self.get_remaining_time(sb)
                self.log(f"🕒 续期后剩余运行时间: {timestamp_after}")

                sec_before = self.time_to_seconds(timestamp_before)
                sec_after = self.time_to_seconds(timestamp_after)
                
                # 依然保持严格防假报逻辑
                if sec_after <= sec_before + 60:  
                    raise Exception(f"❌ 严重异常：时间未增加！(前: {timestamp_before}, 后: {timestamp_after})。验证码点击被拦截或未生效。")

                final_screenshot = f"{self.screenshot_dir}/final_success_{server_num}.png"
                sb.save_screenshot(final_screenshot)

                msg = f"✅ [{region}] 续期成功\n🖥️ 编号: {server_num}\n🕒 续期前时间: {timestamp_before}\n🎉 续期后时间: {timestamp_after}"
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
