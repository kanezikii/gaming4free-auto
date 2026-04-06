import os
import time
import requests
import urllib.request
import speech_recognition as sr
from pydub import AudioSegment
from playwright.sync_api import sync_playwright

# ==========================================
# ✅ 账号信息和 TG 机器人信息 (已直接写死)
# ==========================================
USERNAME = 'peng320829@gmail.com'
PASSWORD = 'Qwer12138@'
TG_TOKEN = '8490493179:AAG1Q5pkFNkUzR2E5pSm8OpJa_SPZNf32Mw'
TG_CHAT = '6499138234'
# ==========================================

def send_telegram_message(text):
    if not TG_TOKEN or not TG_CHAT or '填入你的' in TG_TOKEN:
        return
    import datetime
    now_utc = datetime.datetime.utcnow()
    beijing_hour = (now_utc + datetime.timedelta(hours=8)).hour
    
    if beijing_hour != 12:
        print(f"🔕 [通知静音] 当前北京时间 {beijing_hour} 点。按规则仅在每天中午 12 点发报。")
        return
        
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
    payload = {"chat_id": TG_CHAT, "text": text}
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"TG 通知发送失败: {e}")

def solve_audio_captcha(page):
    """
    终极破壁：直接拦截音频底包进行物理硬解 (完美兼容 Invisible 无感模式)
    """
    print("  [透视雷达] 正在扫描验证码框架...")
    try:
        # 1. 智能探测：看是否需要先点击“我不是机器人”复选框
        main_frame = page.frame_locator('iframe[title*="reCAPTCHA"]').first
        checkbox = main_frame.locator('.recaptcha-checkbox-border')
        
        if checkbox.is_visible(timeout=3000):
            print("  [透视雷达] 发现显式复选框，正在执行点击...")
            checkbox.click(timeout=3000)
            time.sleep(3)
        else:
            print("  [透视雷达] 未发现复选框，判定为 Invisible 无感验证，直接接管挑战弹窗...")

        # 2. 锁定并接管弹出的挑战框 iframe
        bframe = page.frame_locator('iframe[title*="recaptcha challenge"]').first
        
        # 给弹窗一点加载时间（8秒），寻找耳机按钮
        if not bframe.locator('#recaptcha-audio-button').is_visible(timeout=8000):
            print("  [透视雷达] ✅ 信用极高或未触发强验证，直接通过！")
            return True

        print("  [透视雷达] 锁定耳机图标，切入音频模式...")
        bframe.locator('#recaptcha-audio-button').click()
        time.sleep(2)

        # 检查是否被 Google 封锁音频通道
        error_msg = bframe.locator('.rc-doscaptcha-header-text')
        if error_msg.is_visible(timeout=2000) and "Try again later" in error_msg.inner_text():
            print("  [透视雷达] 🚨 遭遇 Google 信用降级拦截 (IP被限制)！")
            return False

        # 3. 截获音频文件直链
        audio_url = bframe.locator('#audio-source').get_attribute('src')
        if not audio_url:
            print("  [透视雷达] ❌ 无法获取音频 URL")
            return False
            
        print(f"  [透视雷达] ⬇️ 成功截获音频流流址，正在下载底包...")
        urllib.request.urlretrieve(audio_url, "captcha.mp3")

        print("  [透视雷达] 🔄 正在进行音频基因重组 (MP3 -> WAV)...")
        sound = AudioSegment.from_mp3("captcha.mp3")
        sound.export("captcha.wav", format="wav")

        # 4. 离线/云端语音解码
        print("  [透视雷达] 🧠 启动神经语音解码...")
        recognizer = sr.Recognizer()
        with sr.AudioFile("captcha.wav") as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            print(f"  [透视雷达] 🎯 解码成功！验证密码为: {text}")

        # 5. 回填答案并击穿验证
        bframe.locator('#audio-response').fill(text)
        bframe.locator('#recaptcha-verify-button').click()
        time.sleep(4)
        return True

    except Exception as e:
        print(f"  [透视雷达] 💥 验证码破解链路断裂: {e}")
        return False

def run():
    print("==========================================")
    print("🚀 [步骤 0] Python 强力突围脚本启动...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False, 
            proxy={"server": "socks5://127.0.0.1:10808"},
            args=[
                '--no-sandbox', 
                '--disable-blink-features=AutomationControlled'
            ]
        )
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        try:
            print("🔥 [步骤 1] 直达核心 Panel 面板...")
            page.goto('https://panel.gaming4free.net', wait_until='domcontentloaded', timeout=60000)
            
            page.wait_for_selector('input[type="password"]', timeout=15000)
            
            print("🔑 填入账号密码...")
            page.locator('input:not([type="hidden"]):not([type="password"])').first.fill(USERNAME)
            page.locator('input[type="password"]').first.fill(PASSWORD)
            
            print("🟢 尝试点击登录按钮并处理前端延迟...")
            login_btn = page.get_by_role('button', name='LOGIN').first
            
            ready_to_solve = False
            for i in range(5):
                print(f"  -> [第 {i+1} 次] 触发登录动作...")
                login_btn.click(force=True)
                time.sleep(2)
                
                error_toast = page.get_by_text("did not render yet", exact=False)
                if error_toast.is_visible():
                    print("  ⏳ [前端拦截] 网站报错底层验证码未加载！等待 5 秒后再试...")
                    time.sleep(5)
                else:
                    print("  ✅ 登录动作被网站受理！进入盯防状态...")
                    ready_to_solve = True
                    break
                    
            if not ready_to_solve:
                raise Exception("验证码模块死活不加载，网络可能存在问题")
                
            time.sleep(3) 
            
            # 检测是否有任何形式的验证码 iframe 处于激活状态
            if page.locator('iframe[title*="reCAPTCHA"]').is_visible() or page.locator('iframe[title*="recaptcha challenge"]').is_visible():
                print("⚠️ 探测到防御系统已启动，执行物理硬解方案...")
                success = solve_audio_captcha(page)
                if not success:
                    page.screenshot(path="screenshots/error_captcha.png", full_page=True)
                    raise Exception("CAPTCHA_FAILED")
            
            page.wait_for_url('**/dashboard**', timeout=20000)
            print("🎉 突破大门，成功进入后台！")
            
            print("🖥️ 定位 renqi 服务...")
            page.get_by_text('My renqi', exact=False).first.click()
            page.wait_for_load_state('networkidle')
            
            page.locator('a').filter(has_text='Console').first.click()
            page.wait_for_load_state('networkidle')
            
            print("⏳ 准备续期...")
            renew_btn = page.get_by_role('button', name='ADD 90 MINUTES').first
            
            if renew_btn.is_visible(timeout=5000):
                renew_btn.click()
                print("✅ 成功点击续期！等待最后确认...")
                time.sleep(5)
                
                if page.locator('iframe[title*="recaptcha challenge"]').is_visible():
                    solve_audio_captcha(page)
                    time.sleep(5)
                    
                page.screenshot(path="screenshots/success_renew.png", full_page=True)
                send_telegram_message(f"🎮 Gaming4Free 续期成功！\n账号: {USERNAME}\n状态: 已成功领取 90 分钟！")
                print("🎉🎉 破阵成功！全流程完美收官！")
            else:
                print("ℹ️ 未找到可点击的续期按钮，可能在冷却中。")
                
        except Exception as e:
            print(f"💥 流程提前终止: {e}")
            page.screenshot(path="screenshots/fatal_error.png", full_page=True)
        finally:
            browser.close()
            print("🛑 脚本安全结束。")

if __name__ == "__main__":
    run()
