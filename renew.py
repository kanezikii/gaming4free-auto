import os, sys, time, urllib.request, subprocess, json
import speech_recognition as sr
from seleniumbase import SB

# ==========================================
# 💡 核心配置
# ==========================================
TARGET_URL = "https://game4free.net/woairenqi"
MC_USERNAME = "renqi"

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")

def send_tg(msg):
    if TG_TOKEN and TG_CHAT:
        try:
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": f"🤖 G4F 自动续期:\n{msg}"}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        except:
            pass

print(f"\n===== 🚀 开始执行极速续期 (Python 终极架构版) =====")
print(f"🎯 目标 URL: {TARGET_URL}")

proxy_str = "socks5://127.0.0.1:10808"

with SB(uc=True, proxy=proxy_str, headless=False) as sb:
    try:
        print("🌐 访问续期目标网址...")
        sb.open(TARGET_URL)
        sb.sleep(2)

        print("🛡️ 锁定 reCAPTCHA 框架...")
        sb.switch_to_frame('iframe[title*="reCAPTCHA"]')
        
        print("🖱️ 物理模拟点击 reCAPTCHA checkbox...")
        sb.wait_for_element('.recaptcha-checkbox-border', timeout=15)
        # 🌟 核心修复 1：改用普通 click，避免焦点自动丢失
        sb.click('.recaptcha-checkbox-border')
        sb.sleep(3)

        # 🌟 核心修复 2：极其严谨地切回主网页，再重新切入验证码框架，确保焦点100%正确
        sb.switch_to_default_content()
        sb.switch_to_frame('iframe[title*="reCAPTCHA"]')
        
        is_checked = sb.get_attribute('#recaptcha-anchor', 'aria-checked')
        
        if is_checked == 'true':
            print("⏩ 验证码秒过！无感验证完成。")
        else:
            print("⚠️ 弹出图片/音频挑战，准备破解...")
            # 切回主页面，准备进入另一个专门装“挑战图片”的 iframe
            sb.switch_to_default_content()
            sb.switch_to_frame('iframe[title*="recaptcha challenge"]')

            print("🎧 正在切换到音频挑战模式...")
            if sb.is_element_visible('#recaptcha-audio-button'):
                sb.click('#recaptcha-audio-button')
                sb.sleep(3)

                print("📥 获取音频数据源...")
                audio_src = None
                if sb.is_element_visible('#audio-source'):
                    audio_src = sb.get_attribute('#audio-source', 'src')
                elif sb.is_element_visible('.rc-audiochallenge-tdownload-link'):
                    audio_src = sb.get_attribute('.rc-audiochallenge-tdownload-link', 'href')

                if audio_src:
                    print("⏳ 正在下载并处理音频数据...")
                    req = urllib.request.Request(audio_src, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req) as response, open('payload.mp3', 'wb') as out_file:
                        out_file.write(response.read())
                    
                    subprocess.run(['ffmpeg', '-i', 'payload.mp3', 'payload.wav', '-y'], 
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                    print("🧠 调用底层 AI 引擎进行语音转文字...")
                    r = sr.Recognizer()
                    with sr.AudioFile('payload.wav') as source:
                        audio_data = r.record(source)
                    try:
                        text = r.recognize_google(audio_data)
                        print(f"✅ 识别结果: [{text}]")
                        
                        print("🚀 正在提交破解序列...")
                        sb.type('#audio-response', text)
                        sb.click('#recaptcha-verify-button')
                        sb.sleep(4)
                    except sr.UnknownValueError:
                        print("❌ 引擎无法识别音频内容。")
                    except sr.RequestError as e:
                        print(f"❌ 语音引擎请求错误: {e}")
                else:
                    print("❌ 未能获取到音频链接。")
            else:
                print("❌ 未找到耳机图标，可能被 Google 临时屏蔽音频验证。")

        # 验证结束，彻底切回最外层，准备填表单
        sb.switch_to_default_content()
        
        print(f"✍️ 填入服务器名: {MC_USERNAME}")
        # 定位唯一的文本输入框
        sb.type('input[type="text"]', MC_USERNAME)

        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_filled.png")

        print("🚀 准备点击提交...")
        # SeleniumBase 专属的高级文本寻找器
        if sb.is_element_visible('button:contains("Renew")'):
            sb.click('button:contains("Renew")')
            print("⏳ 等待续期结果...")
            sb.sleep(5)
            sb.save_screenshot("screenshots/2_result.png")

            if sb.is_text_visible("The server has been renewed."):
                print("🎉 读取到成功提示: The server has been renewed.")
                print("✅ 续期大成功！")
                send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期成功！")
            else:
                print("⚠️ 未读取到成功横幅，请查阅截图确认。")
                send_tg(f"⚠️ 续期已执行，请查阅截图确认状态。")
        else:
            print("❌ 页面未出现可点击的 Renew 按钮。")
            send_tg(f"❌ 续期跳过：验证码可能未通过。")

    except Exception as e:
        print(f"❌ 发生致命错误: {e}")
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/error.png")
        send_tg(f"❌ 自动续期崩溃: {e}")
