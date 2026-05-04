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

# 接管本地 Xray 代理
proxy_str = "socks5://127.0.0.1:10808"

# 🌟 启动 SeleniumBase UC (Undetected Chromedriver) 模式，无视大多数风控
with SB(uc=True, proxy=proxy_str, headless=False) as sb:
    try:
        print("🌐 访问续期目标网址...")
        sb.open(TARGET_URL)
        sb.sleep(2)

        print("🛡️ 锁定 reCAPTCHA 框架...")
        sb.switch_to_frame('iframe[title*="reCAPTCHA"]')
        
        print("🖱️ 物理模拟点击 reCAPTCHA checkbox...")
        sb.wait_for_element('.recaptcha-checkbox-border', timeout=15)
        sb.uc_click('.recaptcha-checkbox-border')
        sb.sleep(3)

        is_checked = sb.get_attribute('#recaptcha-anchor', 'aria-checked')
        if is_checked == 'true':
            print("⏩ 验证码秒过！无感验证完成。")
        else:
            print("⚠️ 需要破解音频验证码...")
            sb.switch_to_default_content()
            sb.switch_to_frame('iframe[title*="recaptcha challenge"]')

            print("🎧 启动过盾流程...")
            sb.wait_for_element('#recaptcha-audio-button', timeout=10)
            sb.click('#recaptcha-audio-button')
            sb.sleep(2)

            print("📥 获取音频数据源...")
            audio_src = None
            if sb.is_element_visible('#audio-source'):
                audio_src = sb.get_attribute('#audio-source', 'src')
            elif sb.is_element_visible('.rc-audiochallenge-tdownload-link'):
                audio_src = sb.get_attribute('.rc-audiochallenge-tdownload-link', 'href')

            if audio_src:
                print("⏳ 正在下载并处理音频数据...")
                # 伪装请求头下载音频，防止 Google 拦截
                req = urllib.request.Request(audio_src, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open('payload.mp3', 'wb') as out_file:
                    out_file.write(response.read())
                
                # 借助环境中已安装的 ffmpeg 将 mp3 转为无损 wav
                subprocess.run(['ffmpeg', '-i', 'payload.mp3', 'payload.wav', '-y'], 
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                print("🧠 调用语音转文字底层引擎...")
                r = sr.Recognizer()
                with sr.AudioFile('payload.wav') as source:
                    audio_data = r.record(source)
                try:
                    text = r.recognize_google(audio_data)
                    print(f"✅ 识别结果: [{text}]")
                    
                    print("🚀 提交破解序列...")
                    sb.type('#audio-response', text)
                    sb.click('#recaptcha-verify-button')
                    sb.sleep(4)
                except sr.UnknownValueError:
                    print("❌ 引擎无法识别音频内容 (可能是纯噪音)。")
                except sr.RequestError as e:
                    print(f"❌ 语音引擎请求错误: {e}")
            else:
                print("❌ 未能获取到音频链接，IP 被拦截。")

        sb.switch_to_default_content()
        
        print(f"✍️ 填入服务器名: {MC_USERNAME}")
        # 精准定位唯一的文本输入框
        sb.type('input[type="text"]', MC_USERNAME)

        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_filled.png")

        print("🚀 准备点击提交...")
        if sb.is_element_visible('button:contains("Renew")'):
            sb.click('button:contains("Renew")')
            print("⏳ 等待续期结果...")
            sb.sleep(5)
            sb.save_screenshot("screenshots/2_result.png")

            # 🌟 使用更加安全的文本检测 API
            if sb.is_text_visible("The server has been renewed."):
                print("🎉 读取到成功提示: The server has been renewed.")
                print("✅ 续期大成功！")
                send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期成功！")
            else:
                print("⚠️ 未读取到成功横幅，请查阅截图确认。")
                send_tg(f"⚠️ 续期已执行，请查阅截图确认状态。")
        else:
            print("❌ 页面未出现可点击的 Renew 按钮。")
            send_tg(f"❌ 续期跳过：验证码未通过。")

    except Exception as e:
        print(f"❌ 发生致命错误: {e}")
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/error.png")
        send_tg(f"❌ 自动续期崩溃: {e}")
