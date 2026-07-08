import os, sys, time, urllib.request, json, re, random
from seleniumbase import SB

# ==========================================
# 💡 G4F.GG 自动续期
# ==========================================

# 智能虚拟桌面环境配置 (完美适配 GitHub Actions)
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
# 这里的端口对应你的 Sing-box 节点
PROXY_URL = "socks5://127.0.0.1:10808"

def send_unified_tg(results):
    if TG_TOKEN and TG_CHAT:
        try:
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
            print("✅ Telegram 综合通知发送成功。")
        except Exception as e:
            print(f"❌ 发送通知失败: {e}")

def get_remaining_time(sb):
    """通过官方专属 ID 获取精准时间"""
    try:
        sb.wait_for_element_visible('#sd-timer', timeout=15)
        time.sleep(1)
        return sb.get_text('#sd-timer').strip()
    except:
        try:
            return sb.execute_script("let el = document.querySelector('#sd-timer'); return el ? el.innerText.trim() : '未知';")
        except:
            return "未知"

print("\n===== 🚀 开始执行极速续期 =====")
task_results = []
os.makedirs("screenshots", exist_ok=True)

for target in TARGETS:
    name = target["name"]
    url = target["url"]
    print(f"\n[{name}] 开始处理节点...")
    
    try:
        # 🌟 核心参数升级：采用与成功脚本完全一致的隐身启动参数
        with SB(
            uc=True, 
            test=True, 
            headed=True, 
            headless=False, 
            xvfb=False, 
            chromium_arg="--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--window-position=0,0,--start-maximized",
            proxy=PROXY_URL
        ) as sb:
            
            print(f"[{name}] 正在访问目标网址...")
            sb.uc_open_with_reconnect(url, reconnect_time=5)
            time.sleep(random.uniform(6, 10))
            sb.save_screenshot(f"screenshots/{name}_1_loaded.png")

            # 提取续期前时间 (仅作记录)
            time_before = get_remaining_time(sb)
            print(f"[{name}] 当前剩余时间: {time_before}")

            # 1. 点击初始续期按钮 (使用官方 ID)
            print(f"[{name}] 正在点击初始 [+ ADD 90 MIN] 按钮...")
            try:
                sb.wait_for_element_visible("#sd-vote-btn", timeout=10)
                sb.click('#sd-vote-btn')
            except Exception as e:
                print(f"[{name}] ⚠️ 未找到初始按钮，可能需要先关闭 Cookie 弹窗...")
                # 尝试点击任何包含 Cookie/同意 的按钮
                cookie_btns = ['//button[contains(., "Recommended")]', '//button[contains(., "Accept")]', '//button[contains(., "Consent")]']
                for btn in cookie_btns:
                    if sb.is_element_present(btn):
                        try: sb.click(btn); time.sleep(2)
                        except: pass
                sb.click('#sd-vote-btn')

            time.sleep(random.uniform(6, 10))

            # 2. 🌟 核心杀手锏：接管 Cloudflare 人机验证
            print(f"[{name}] 开始迎战 Cloudflare 人机验证盾...")
            cf_indicators = ["verify you are human", "确认您是真人", "troubleshoot", "just a moment"]
            cf_passed = False
            
            for i in range(10): # 循环监听破盾情况
                try:
                    sb.uc_gui_click_captcha()
                    time.sleep(3)
                    page_lower = sb.get_page_source().lower()
                    if any(x in page_lower for x in cf_indicators):
                        sb.uc_gui_handle_captcha() # 调用神级内置破盾
                        time.sleep(3)
                        page_lower = sb.get_page_source().lower()
                    if not any(x in page_lower for x in cf_indicators):
                        print(f"[{name}] ✅ Cloudflare 验证已完美通过！")
                        cf_passed = True
                        break
                except:
                    time.sleep(2)

            # 3. 破盾后点击最后的确认按钮
            print(f"[{name}] 正在点击最终的 [VOTE - ADDS 90 MINUTES] 确认按钮...")
            try:
                sb.wait_for_element_visible("#vm-submit", timeout=10)
                sb.click('#vm-submit')
            except Exception as e:
                print(f"[{name}] ⚠️ 无法通过 ID 找到最终按钮，尝试盲点击...")
                sb.slow_click("body", force=True)

            print(f"[{name}] 等待后台发放奖励时间...")
            time.sleep(15) 
            
            # 因为我们用的是直接抓取 ID 时间，所以就算有广告遮挡也完全不影响数据的提取！
            final_time = get_remaining_time(sb)
            print(f"[{name}] 提取到最新时间: {final_time}")
            
            status = "✅ 续期成功" if final_time != "未知" else "⚠️ 状态未知"
            sb.save_screenshot(f"screenshots/{name}_2_result.png")
            
            task_results.append({"name": name, "status": status, "time": final_time})

    except Exception as e:
        print(f"[{name}] ❌ 节点执行异常: {e}")
        task_results.append({"name": name, "status": "❌ 执行失败", "time": "未知"})

print("\n所有节点处理完毕，正在发送汇报...")
send_unified_tg(task_results)
