import os
import time
import requests
import urllib.request
import re  # 引入正则模块，用于模糊匹配按钮文本
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
    终极破壁：防 403 拦截 + AI 容错重试 + 页面跳转识别 + 5秒急速超时判定
    """
    print("  [透视雷达] 正在扫描验证码框架...")
    try:
        checkbox_clicked = False
        for f in page.frames:
            if 'anchor' in f.url or 'recaptcha' in f.url:
                try:
                    checkbox = f.locator('.recaptcha-checkbox-border')
                    if checkbox.is_visible(timeout=1000):
                        print("  [透视雷达] 发现显式复选框，正在执行点击...")
                        checkbox.click()
                        checkbox_clicked = True
                        time.sleep(3)
                        break
                except:
                    pass

        if not checkbox_clicked:
            print("  [透视雷达] 未发现/未点击复选框，判定为 Invisible 模式，准备拦截九宫格...")

        print("  [透视雷达] 开启全栈扫描：寻找可见的耳机图标...")
        target_frame = None
        audio_btn = None
        
        for _ in range(15):
            for f in page.frames:
                if 'bframe' in f.url or 'recaptcha' in f.url:
                    try:
                        btn = f.locator('#recaptcha-audio-button')
                        if btn.is_visible():
                            target_frame = f
                            audio_btn = btn
                            break
                    except:
                        pass
            if target_frame:
                break
            time.sleep(1)

        if not target_frame or not audio_btn:
            print("  [透视雷达] ✅ 15秒扫描未发现验证码弹窗，判定为信用免检，直接通过！")
            return True

        print("  [透视雷达] 🎯 锁定目标弹窗！切入音频模式...")
        try:
            audio_btn.click(force=True, timeout=5000)
        except Exception as e:
            print(f"  [透视雷达] ❌ 无法点击耳机图标，弹窗可能已消失: {e}")
            return False
            
        time.sleep(2)

        for attempt in range(3):
            print(f"  [透视雷达] 🎵 开始第 {attempt + 1} 次音频破解尝试...")
            
            error_msg = target_frame.locator('.rc-doscaptcha-header-text')
            if error_msg.is_visible(timeout=1000) and "Try again later" in error_msg.inner_text():
                print("  [透视雷达] 🚨 遭遇 Google 信用降级拦截 (音频通道被封锁)！")
                return False

            print(f"  [透视雷达] ⬇️ 尝试提取音频直链...")
            try:
                audio_src_locator = target_frame.locator('#audio-source')
                audio_src_locator.wait_for(state='attached', timeout=5000) 
                audio_url = audio_src_locator.get_attribute('src')
            except Exception:
                print("  [透视雷达] ⚠️ 5秒内未获取到音频源！可能遭遇风控静默拦截或验证已在后台通过。退出死循环！")
                return False
                
            if not audio_url:
                print("  [透视雷达] ❌ 无法获取音频 URL")
                return False
                
            print(f"  [透视雷达] ⬇️ 成功截获音频流址，正在伪装浏览器下载底包...")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5'
            }
            audio_res = requests.get(audio_url, headers=headers, timeout=15)
            with open("captcha.mp3", "wb") as f:
                f.write(audio_res.content)

            print("  [透视雷达] 🔄 正在进行音频基因重组 (MP3 -> WAV)...")
            sound = AudioSegment.from_mp3("captcha.mp3")
            sound.export("captcha.wav", format="wav")

            print("  [透视雷达] 🧠 启动神经语音解码...")
            recognizer = sr.Recognizer()
            
            try:
                with sr.AudioFile("captcha.wav") as source:
                    audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data)
                    print(f"  [透视雷达] 🔓 解码成功！验证密码为: {text}")

                target_frame.locator('#audio-response').fill(text)
                target_frame.locator('#recaptcha-verify-button').click(force=True)
                time.sleep(4)
                
                error_msg_after = target_frame.locator('.rc-audiochallenge-error-message')
                if error_msg_after.is_visible(timeout=2000):
                    print("  [透视雷达] ⚠️ 答案似乎不被接受，自动刷新验证码...")
                    target_frame.locator('#recaptcha-reload-button').click(force=True)
                    time.sleep(3)
                    continue 
                    
                return True

            except sr.UnknownValueError:
                print("  [透视雷达] ⚠️ 语音太过模糊或为空，API 无法识别！自动点击刷新按钮更换音频...")
                target_frame.locator('#recaptcha-reload-button').click(force=True)
                time.sleep(3)
            except sr.RequestError as e:
                print(f"  [透视雷达] ❌ 语音识别 API 请求失败: {e}")
                return False
                
        print("  [透视雷达] ❌ 3 次尝试均失败，放弃破解。")
        return False

    except Exception as e:
        err_str = str(e).lower()
        if "closed" in err_str or "detached" in err_str or "destroyed" in err_str:
            print("  [透视雷达] ✅ 检测到页面跳转或框架被销毁，这是验证成功被放行的标志！")
            return True
        print(f"  [透视雷达] 💥 验证码破解外围链路断裂: {e}")
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
            
            success = solve_audio_captcha(page)
            if not success:
                page.screenshot(path="screenshots/error_captcha.png", full_page=True)
                raise Exception("CAPTCHA_FAILED")
            
            print("⏳ 等待控制台界面渲染...")
            page.wait_for_selector('text="My renqi"', timeout=20000)
            print("🎉 突破大门，成功进入后台服务器列表！")
            
            print("🖥️ 定位并点击 renqi 服务...")
            page.get_by_text('My renqi', exact=False).first.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3) 
            
            print("🎛️ 切换至 Console 面板...")
            page.locator('a').filter(has_text='Console').first.click()
            page.wait_for_load_state('networkidle')
            time.sleep(3)
            
            # ======== 终极校验逻辑 ========
            # 1. 先检查是不是已经在冷却中了 (按钮显示 PLEASE WAIT)
            cooldown_btn = page.get_by_role('button', name=re.compile("PLEASE WAIT", re.IGNORECASE))
            if cooldown_btn.is_visible(timeout=3000):
                print("ℹ️ 续期处于冷却中 (已显示 PLEASE WAIT)，本次任务已达完美状态。")
                page.screenshot(path="screenshots/cooldown.png", full_page=True)
                return

            # 2. 如果没冷却，寻找 ADD 90 MINUTES 按钮
            print("⏳ 准备执行续期点击...")
            renew_btn = page.get_by_role('button', name='ADD 90 MINUTES').first
            
            if renew_btn.is_visible(timeout=5000):
                renew_btn.click(force=True)
                print("✅ 成功点击续期！开启动态雷达侦测，死盯最终成功标志...")
                
                global_success = False
                # 最高循环 18 次 * 5秒 = 90秒，足够覆盖广告和缓冲
                for check_round in range(1, 19):
                    time.sleep(5)
                    print(f"  -> 🔍 第 {check_round} 次雷达扫描 (广告播放或验证中)...")
                    
                    # 侦测A：是否遭遇暗杀弹窗 (验证码)
                    challenge_popped = False
                    for f in page.frames:
                        if 'bframe' in f.url or 'recaptcha' in f.url:
                            try:
                                if f.locator('#recaptcha-audio-button').is_visible():
                                    challenge_popped = True
                                    break
                            except:
                                pass
                    
                    if challenge_popped:
                        print("⚠️ 雷达警报！侦测到二次风控弹窗，立即拦截并启动硬解...")
                        solve_audio_captcha(page)
                        time.sleep(3) # 解完缓冲一下，让前端反应过来
                        
                    # 侦测B：是否抵达胜利彼岸 (出现 PLEASE WAIT 按钮)
                    try:
                        wait_btn = page.get_by_role("button", name=re.compile("PLEASE WAIT", re.IGNORECASE))
                        if wait_btn.is_visible(timeout=1000):
                            print("🎯 捕捉到决定性证据！按钮已变为 'PLEASE WAIT'！")
                            global_success = True
                            break
                    except Exception:
                        pass
                
                if global_success:
                    time.sleep(2) # 给截图留点 UI 渲染时间
                    page.screenshot(path="screenshots/success_renew.png", full_page=True)
                    send_telegram_message(f"🎮 Gaming4Free 续期成功！\n账号: {USERNAME}\n状态: 成功通过广告与验证，已获得 90 分钟！")
                    print("🎉🎉 破阵成功！全流程完美收官！")
                else:
                    print("⚠️ 侦测雷达超时 (90秒)，按钮未变成 PLEASE WAIT，可能卡死或广告未放行。")
                    page.screenshot(path="screenshots/timeout_renew.png", full_page=True)
            else:
                print("ℹ️ 未找到 ADD 90 MINUTES 按钮。")
                page.screenshot(path="screenshots/no_button.png", full_page=True)
                
        except Exception as e:
            print(f"💥 流程提前终止: {e}")
            page.screenshot(path="screenshots/fatal_error.png", full_page=True)
        finally:
            browser.close()
            print("🛑 脚本安全结束。")

if __name__ == "__main__":
    run()
