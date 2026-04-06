import os
import time
import requests
import urllib.request
import re 
import speech_recognition as sr
from pydub import AudioSegment
from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

# ==========================================
# ✅ 账号信息和 TG 机器人信息
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
    except Exception:
        pass

def solve_audio_captcha(page):
    print("  [透视雷达] 正在扫描验证码框架...")
    try:
        checkbox_clicked = False
        for f in page.frames:
            if 'anchor' in f.url or 'recaptcha' in f.url:
                try:
                    checkbox = f.locator('.recaptcha-checkbox-border')
                    if checkbox.is_visible(timeout=1000):
                        print("  [透视雷达] 发现显式复选框，正在执行点击...")
                        checkbox.click(force=True)
                        checkbox_clicked = True
                        time.sleep(3)
                        break
                except:
                    pass

        if not checkbox_clicked:
            print("  [透视雷达] 未发现/未点击复选框，判定为 Invisible 模式...")

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
            print("  [透视雷达] ✅ 未发现验证码弹窗，判定为免检！")
            return True

        print("  [透视雷达] 🎯 锁定目标弹窗！切入音频模式...")
        try:
            audio_btn.click(force=True, timeout=5000)
        except Exception:
            return False
            
        time.sleep(2)

        for attempt in range(3):
            print(f"  [透视雷达] 🎵 开始第 {attempt + 1} 次音频破解...")
            
            error_msg = target_frame.locator('.rc-doscaptcha-header-text')
            if error_msg.is_visible(timeout=1000) and "Try again later" in error_msg.inner_text():
                print("  [透视雷达] 🚨 遭遇 Google 信用降级拦截！当前 IP 已被谷歌暂时封锁音频通道。")
                return False

            print(f"  [透视雷达] ⬇️ 尝试提取音频直链...")
            try:
                audio_src_locator = target_frame.locator('#audio-source')
                audio_src_locator.wait_for(state='attached', timeout=5000) 
                audio_url = audio_src_locator.get_attribute('src')
            except Exception:
                print("  [透视雷达] ⚠️ 5秒内未获取到音频源！退出死循环！")
                return False
                
            if not audio_url:
                return False
                
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9'
            }
            audio_res = requests.get(audio_url, headers=headers, timeout=15)
            with open("captcha.mp3", "wb") as f:
                f.write(audio_res.content)

            sound = AudioSegment.from_mp3("captcha.mp3")
            sound.export("captcha.wav", format="wav")

            recognizer = sr.Recognizer()
            try:
                with sr.AudioFile("captcha.wav") as source:
                    audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data)
                    print(f"  [透视雷达] 🔓 解码成功！密码为: {text}")

                try:
                    target_frame.locator('#audio-response').fill(text, timeout=3000)
                    target_frame.locator('#recaptcha-verify-button').click(force=True, timeout=3000)
                except Exception as e:
                    print(f"  [透视雷达] ✅ 填入密码时框架异常断开，判定为极速秒过！")
                    return True
                    
                time.sleep(4)
                
                try:
                    error_msg_after = target_frame.locator('.rc-audiochallenge-error-message')
                    if error_msg_after.is_visible(timeout=2000):
                        print("  [透视雷达] ⚠️ 答案不被接受，刷新验证码...")
                        target_frame.locator('#recaptcha-reload-button').click(force=True)
                        time.sleep(3)
                        continue 
                except Exception:
                    print("  [透视雷达] ✅ 检查提示时发现框架已彻底销毁，验证成功通过！")
                    return True

                return True

            except sr.UnknownValueError:
                print("  [透视雷达] ⚠️ 语音模糊！刷新重试...")
                try:
                    target_frame.locator('#recaptcha-reload-button').click(force=True)
                    time.sleep(3)
                except:
                    pass
            except Exception as e:
                return False
                
        return False

    except Exception as e:
        err_str = str(e).lower()
        if "closed" in err_str or "detached" in err_str or "destroyed" in err_str:
            print("  [透视雷达] ✅ 检测到外围页面框架被销毁，这是被放行的标志！")
            return True
        print(f"  [透视雷达] 💥 外围异常捕获: {e}")
        return False

def run():
    print("==========================================")
    print("🚀 [步骤 0] Python 强力突围脚本启动...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",  
            headless=False, 
            proxy={"server": "socks5://127.0.0.1:10808"},
            args=[
                '--no-sandbox', 
                '--disable-blink-features=AutomationControlled',
                '--autoplay-policy=no-user-gesture-required' 
            ]
        )
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        stealth_sync(page)

        try:
            print("🔥 [步骤 1] 直达核心 Panel 面板...")
            page.goto('https://panel.gaming4free.net', wait_until='domcontentloaded', timeout=60000)
            
            # ======== 🌟 核心修复区：放宽等待，增加错误截图 ========
            print("⏳ 正在等待 Cloudflare 盾牌放行及页面渲染 (最高等待 60 秒)...")
            try:
                page.wait_for_selector('input[type="password"]', timeout=60000)
            except Exception as e:
                print("🚨 致命错误：60秒后依然未找到密码框！可能遭遇死盾拦截或网络极差。")
                page.screenshot(path="screenshots/error_login_page.png", full_page=True)
                raise Exception("LOGIN_PAGE_TIMEOUT")
            # ======================================================
            
            print("🔑 填入账号密码...")
            page.locator('input:not([type="hidden"]):not([type="password"])').first.fill(USERNAME)
            page.locator('input[type="password"]').first.fill(PASSWORD)
            
            print("🟢 尝试点击登录按钮并处理前端延迟...")
            login_btn = page.get_by_role('button', name='LOGIN').first
            
            ready_to_solve = False
            for i in range(5):
                login_btn.click(force=True)
                time.sleep(2)
                if page.get_by_text("did not render yet", exact=False).is_visible():
                    print("  ⏳ [前端拦截] 网站报错底层验证码未加载！等待 5 秒后再试...")
                    time.sleep(5)
                else:
                    ready_to_solve = True
                    break
                    
            if not ready_to_solve:
                raise Exception("验证码模块死活不加载，网络可能存在问题")
                
            time.sleep(3) 
            success = solve_audio_captcha(page)
            if not success:
                raise Exception("CAPTCHA_FAILED")
            
            print("⏳ 等待控制台界面渲染...")
            page.wait_for_selector('text="My renqi"', timeout=20000)
            print("🎉 突破大门，成功进入后台服务器列表！")
            
            print("🖱️ 正在点击进入服务器详情...")
            page.get_by_text('My renqi', exact=False).first.click(force=True)
            time.sleep(4) 
            
            print("🎛️ 切换至 Console 面板...")
            console_tab = page.locator('a').filter(has_text='Console').first
            console_tab.wait_for(state='visible', timeout=10000) 
            console_tab.click(force=True)
            time.sleep(4) 
            
            cooldown_btn = page.get_by_role('button', name=re.compile("PLEASE WAIT", re.IGNORECASE))
            if cooldown_btn.is_visible(timeout=3000):
                print("ℹ️ 续期处于冷却中 (已显示 PLEASE WAIT)，本次任务正常结束。")
                return

            print("⏳ 准备执行续期点击...")
            renew_btn = page.get_by_role('button', name='ADD 90 MINUTES').first
            
            if renew_btn.is_visible(timeout=5000):
                renew_btn.click(force=True)
                print("✅ 成功点击续期！拥有真实解码器的 Chrome 正在硬扛视频广告...")
                
                print("🖱️ 模拟真实鼠标：盲点屏幕中心，尝试强制唤醒休眠的视频广告...")
                try:
                    page.mouse.click(960, 540)
                    time.sleep(1)
                    page.mouse.click(960, 540)
                except:
                    pass

                global_success = False
                consecutive_captcha_fails = 0
                radar_cooldown_end = 0 
                
                for check_round in range(1, 21): 
                    time.sleep(5)
                    print(f"  -> 🔍 第 {check_round} 次心跳检测...")
                    
                    current_time = time.time()
                    if current_time > radar_cooldown_end:
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
                            print("⚠️ 雷达警报！侦测到疑似验证码弹窗，前去查探...")
                            res = solve_audio_captcha(page)
                            if not res:
                                consecutive_captcha_fails += 1
                            else:
                                consecutive_captcha_fails = 0
                                
                            if consecutive_captcha_fails >= 2:
                                print("🛑 连续 2 次提取音频失败！判定当前为广告遮挡下的【幽灵框架】！")
                                print("🛑 雷达将强制进入 30 秒静默冷却期，绝不干扰广告播放！")
                                radar_cooldown_end = current_time + 30
                                consecutive_captcha_fails = 0 
                    else:
                        print(f"  [雷达冷却中 🧊] 脚本正在乖乖挂机看广告... (剩余冷却约 {int(radar_cooldown_end - current_time)} 秒)")
                                
                    try:
                        wait_btn = page.get_by_role("button", name=re.compile("PLEASE WAIT", re.IGNORECASE))
                        if wait_btn.is_visible(timeout=1000):
                            print("🎯 捕捉到决定性证据！按钮已成功变为 'PLEASE WAIT'！")
                            global_success = True
                            break
                    except Exception:
                        pass
                
                if not global_success:
                    print("⚠️ 100秒侦测完毕依然在转圈！前端可能假死。执行 F5 强制刷新进行最终核验...")
                    try:
                        page.reload(wait_until="domcontentloaded", timeout=20000)
                        time.sleep(5)
                        verify_btn = page.get_by_role("button", name=re.compile("PLEASE WAIT", re.IGNORECASE))
                        if verify_btn.is_visible(timeout=5000):
                            print("🎯 峰回路转！刷新后发现时长已在后台悄悄到账！按钮状态已更新！")
                            global_success = True
                    except Exception as e:
                        print(f"刷新核验异常: {e}")

                if global_success:
                    time.sleep(2) 
                    page.screenshot(path="screenshots/success_renew.png", full_page=True)
                    send_telegram_message(f"🎮 Gaming4Free 续期成功！\n账号: {USERNAME}\n状态: 成功熬过广告并斩获 90 分钟！")
                    print("🎉🎉 破阵成功！全流程完美收官！")
                else:
                    print("❌ 彻底失败：刷新后依然没有冷却按钮，广告绝对被拦截了。")
                    page.screenshot(path="screenshots/timeout_renew.png", full_page=True)
            else:
                print("ℹ️ 未找到 ADD 90 MINUTES 按钮。")
                
        except Exception as e:
            print(f"💥 流程提前终止: {e}")
            try:
                page.screenshot(path="screenshots/fatal_error.png", full_page=True)
            except:
                pass
        finally:
            browser.close()
            print("🛑 脚本安全结束。")

if __name__ == "__main__":
    run()
