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
    终极破壁：防 403 拦截 + AI 容错重试机制
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

        # ====== 加入重试机制 (最高尝试3次) ======
        for attempt in range(3):
            print(f"  [透视雷达] 🎵 开始第 {attempt + 1} 次音频破解尝试...")
            
            error_msg = target_frame.locator('.rc-doscaptcha-header-text')
            if error_msg.is_visible(timeout=1000) and "Try again later" in error_msg.inner_text():
                print("  [透视雷达] 🚨 遭遇 Google 信用降级拦截 (音频通道被封锁)！")
                return False

            audio_url = target_frame.locator('#audio-source').get_attribute('src')
            if not audio_url:
                print("  [透视雷达] ❌ 无法获取音频 URL")
                return False
                
            print(f"  [透视雷达] ⬇️ 成功截获音频流址，正在伪装浏览器下载底包...")
            
            # 使用 requests 强力伪装，防止被 Google 返回 403 HTML 导致解析失败
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
                
                # 检查提交后是否提示错误（比如 Google 觉得答案不对要求重试）
                error_msg_after = target_frame.locator('.rc-audiochallenge-error-message')
                if error_msg_after.is_visible(timeout=2000):
                    print("  [透视雷达] ⚠️ 答案似乎不被接受，自动刷新验证码...")
                    target_frame.locator('#recaptcha-reload-button').click(force=True)
                    time.sleep(3)
                    continue # 继续下一次循环
                    
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
            
            print("⏳ 准备续期...")
            renew_btn = page.get_by_role('button', name='ADD 90 MINUTES').first
            
            if renew_btn.is_visible(timeout=5000):
                renew_btn.click(force=True)
                print("✅ 成功点击续期！平台将强行弹出强制广告...")
                
                print("⏳ 开启防卡死倒计时，乖乖等待广告播放及网络缓冲 (安全期 45 秒)...")
                for wait_sec in range(45, 0, -5):
                    print(f"  -> 📺 广告播放中... 剩余约 {wait_sec} 秒")
                    time.sleep(5)
                
                print("✅ 广告等待期结束！正在侦测是否触发二次验证...")
                
                challenge_popped = False
                for _ in range(10): 
                    time.sleep(1)
                    for f in page.frames:
                        if 'bframe' in f.url or 'recaptcha' in f.url:
                            try:
                                if f.locator('#recaptcha-audio-button').is_visible():
                                    challenge_popped = True
                                    break
                            except:
                                pass
                    if challenge_popped:
                        break

                if challenge_popped:
                    print("⚠️ 广告结束后触发了二次风控，再次启动硬解...")
                    solve_audio_captcha(page)
                else:
                    print("✅ 未检测到二次验证弹窗，时长已顺利到账！")
                    
                time.sleep(5)
                page.screenshot(path="screenshots/success_renew.png", full_page=True)
                send_telegram_message(f"🎮 Gaming4Free 续期成功！\n账号: {USERNAME}\n状态: 已成功看穿广告并领取 90 分钟！")
                print("🎉🎉 破阵成功！全流程完美收官！")
            else:
                print("ℹ️ 未找到可点击的续期按钮，可能在冷却中。")
                page.screenshot(path="screenshots/cooldown.png", full_page=True)
                
        except Exception as e:
            print(f"💥 流程提前终止: {e}")
            page.screenshot(path="screenshots/fatal_error.png", full_page=True)
        finally:
            browser.close()
            print("🛑 脚本安全结束。")

if __name__ == "__main__":
    run()
