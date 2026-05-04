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
            url = f"https://api.telegram.org/bot${TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": f"🤖 G4F 自动续期:\n{msg}"}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        except:
            pass

print(f"\n===== 🚀 开始执行极速续期 (WARP + Python 终极版) =====")
# 🌟 核心修改：使用 WARP 默认的 SOCKS5 代理端口
proxy_str = "socks5://127.0.0.1:40000"

with SB(uc=True, proxy=proxy_str, headless=False) as sb:
    try:
        print("🌐 正在通过 WARP 代理访问目标...")
        sb.open(TARGET_URL)
        sb.sleep(2)

        print("🛡️ 锁定 reCAPTCHA 框架...")
        sb.switch_to_frame('iframe[title*="reCAPTCHA"]')
        
        print("🖱️ 点击人机验证复选框...")
        sb.wait_for_element('.recaptcha-checkbox-border', timeout=15)
        sb.click('.recaptcha-checkbox-border')
        sb.sleep(4)

        sb.switch_to_default_content()
        sb.switch_to_frame('iframe[title*="reCAPTCHA"]')
        is_checked = sb.get_attribute('#recaptcha-anchor', 'aria-checked')
        
        if is_checked == 'true':
            print("⏩ 运气爆表！IP 干净，验证码秒过。")
        else:
            print("⚠️ 触发挑战，正在尝试通过音频破解...")
            sb.switch_to_default_content()
            sb.switch_to_frame('iframe[title*="recaptcha challenge"]')

            if sb.is_element_visible('#recaptcha-audio-button'):
                sb.click('#recaptcha-audio-button')
                sb.sleep(3)

                if sb.is_text_visible("Try again later"):
                    print("❌ 抽到“黑人” IP，Google 拒绝下发音频。等待下次换 IP 自动重试。")
                else:
                    print("📥 正在抓取音频数据流...")
                    audio_src = sb.get_attribute('#audio-source', 'src') if sb.is_element_visible('#audio-source') else None
                    if not audio_src and sb.is_element_visible('.rc-audiochallenge-tdownload-link'):
                        audio_src = sb.get_attribute('.rc-audiochallenge-tdownload-link', 'href')

                    if audio_src:
                        urllib.request.urlretrieve(audio_src, 'payload.mp3')
                        subprocess.run(['ffmpeg', '-i', 'payload.mp3', 'payload.wav', '-y'], 
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                        print("🧠 AI 正在解析语音内容...")
                        r = sr.Recognizer()
                        with sr.AudioFile('payload.wav') as source:
                            audio_data = r.record(source)
                        text = r.recognize_google(audio_data)
                        print(f"✅ 识别成功: [{text}]")
                        
                        sb.type('#audio-response', text)
                        sb.click('#recaptcha-verify-button')
                        sb.sleep(4)
            else:
                print("❌ 当前 IP 无法加载音频，可能被 Google 临时屏蔽。")

        sb.switch_to_default_content()
        print(f"✍️ 填入服务器名: {MC_USERNAME}")
        sb.type('input[type="text"]', MC_USERNAME)

        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_filled.png")

        print("🚀 提交续期请求...")
        if sb.is_element_visible('button:contains("Renew")'):
            sb.click('button:contains("Renew")')
            sb.sleep(5)
            sb.save_screenshot("screenshots/2_result.png")

            if sb.is_text_visible("The server has been renewed."):
                print("🎉 续期成功！")
                send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期成功！(WARP IP)")
            else:
                print("⚠️ 按钮已点，但未见成功横幅。")
        else:
            print("❌ 验证未通过，无法点击 Renew。")

    except Exception as e:
        print(f"❌ 运行异常: {e}")
        sb.save_screenshot("screenshots/error.png")
