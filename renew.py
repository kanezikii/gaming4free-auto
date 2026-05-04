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

print(f"\n===== 🚀 开始执行极速续期 (WARP + Python 终极版) =====")

# 🌟 必须加回来：指定本地 WARP SOCKS5 代理
proxy_str = "socks5://127.0.0.1:40000"

with SB(uc=True, proxy=proxy_str, headless=False) as sb:
    try:
        print("🌐 正在通过 WARP SOCKS5 代理访问目标...")
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
                    audio_src = None
                    if sb.is_element_visible('#audio-source'):
                        audio_src = sb.get_attribute('#audio-source', 'src')
                    elif sb.is_element_visible('.rc-audiochallenge-tdownload-link'):
                        audio_src = sb.get_attribute('.rc-audiochallenge-tdownload-link', 'href')

                    if audio_src:
                        urllib.request.urlretrieve(audio_src, 'payload.mp3')
                        subprocess.run(['ffmpeg', '-i', 'payload.mp3', 'payload.wav', '-y'], 
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                        print("🧠 AI 正在解析语音内容...")
                        r = sr.Recognizer()
                        with sr.AudioFile('payload.wav') as source:
                            audio_data = r.record(source)
                        try:
                            text = r.recognize_google(audio_data)
                            print(f"✅ 识别成功: [{text}]")
                            
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
                print("❌ 当前 IP 无法加载音频，可能被 Google 临时屏蔽。")
        
       # 验证结束，彻底切回最外层，准备填表单
        sb.switch_to_default_content()
        print(f"✍️ 填入服务器名: {MC_USERNAME}")
        # 定位唯一的文本输入框
        sb.type('input[type="text"]', MC_USERNAME)

        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_filled.png")

        print("🚀 提交续期请求...")
        try:
            # 🌟 核心杀手锏：使用无视标签的“地毯式” XPath 搜索！
            # 无论是 <button>, <input>, 还是 <a>, 只要它写着 Renew 或者 value 是 Renew，统统按下！
            sb.click('xpath=//*[contains(text(), "Renew") or @value="Renew"]', timeout=10)
            print("🖱️ 成功点击 Renew 按钮！")
            
            print("⏳ 等待服务器响应...")
            sb.sleep(5)
            sb.save_screenshot("screenshots/2_result.png")

            if sb.is_text_visible("The server has been renewed."):
                print("🎉 读取到成功提示: The server has been renewed.")
                print("✅ 续期大成功！")
                send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期成功！(WARP IP)")
            else:
                print("⚠️ 按钮已点，但未读取到成功横幅，请查阅截图确认。")
                send_tg(f"⚠️ 续期已执行，请查阅截图确认状态。")
        except Exception as e:
            print(f"❌ 页面未出现可点击的 Renew 按钮或点击超时: {e}")
            send_tg(f"❌ 续期跳过：无法点击 Renew。")

    except Exception as e:
        print(f"❌ 发生致命错误: {e}")
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/error.png")
        send_tg(f"❌ 自动续期崩溃: {e}")
