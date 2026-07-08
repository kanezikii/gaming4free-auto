import os, sys, time, urllib.request, json, re
from seleniumbase import SB

# ==========================================
# 💡 G4F.GG 自动续期 
# ==========================================
TARGETS = [
    {"name": "renqi", "url": "https://g4f.gg/renqi"},
    {"name": "heisi", "url": "https://g4f.gg/heisi"}
]

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")

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
            print("Telegram 综合通知发送成功。")
        except Exception as e:
            print(f"发送通知失败: {e}")

print("\n===== 开始执行 =====")

proxy_str = "socks5://127.0.0.1:10808"
task_results = []

print("初始化物理鼠标依赖...")
os.system("sudo apt-get update > /dev/null 2>&1")
os.system("sudo apt-get install -y xdotool > /dev/null 2>&1")

for target in TARGETS:
    name = target["name"]
    url = target["url"]
    print(f"\n开始处理节点: [{name}]")
    
    try:
        with SB(uc=True, proxy=proxy_str, headless=False, window_size="1920,1080") as sb:
            print(f"正在访问目标网址: {url}")
            sb.driver.set_window_position(0, 0)
            sb.open(url)
            sb.sleep(6) 
            
            os.makedirs("screenshots", exist_ok=True)
            sb.save_screenshot(f"screenshots/{name}_1_page_loaded.png")

            print("尝试点击初始续期按钮...")
            js_click_code = """
            let step1_els = document.querySelectorAll('button, a, input, div, span');
            for (let i = step1_els.length - 1; i >= 0; i--) {
                let el = step1_els[i];
                let text = (el.innerText || el.value || '').toUpperCase();
                if (text.includes('ADD 90')) {
                    el.click();
                    break;
                }
            }
            """
            sb.execute_script(js_click_code)
            
            try:
                sb.click('xpath=//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add 90")]', timeout=2)
            except:
                pass

            print("等待人机验证加载...")
            time.sleep(6) 
            
            print("执行验证框区域点击 (4x4 网格)...")
            xs = [790, 810, 830, 850]
            ys = [540, 560, 580, 600]
            
            for y in ys:
                for x in xs:
                    os.system(f"xdotool mousemove {x} {y} click 1")
                    time.sleep(0.1)
            
            print("点击完成，等待验证盾亮起绿勾 (10秒)...")
            time.sleep(10)
            
            for sweep_y in range(600, 780, 30):
                os.system(f"xdotool mousemove 960 {sweep_y} click 1")
                time.sleep(0.2)
                
            print("尝试点击最新的 [✓ VOTED — +90m] 确认按钮...")
            js_vote_click = """
            let step2_els = document.querySelectorAll('button, a, input, div, span');
            for (let i = step2_els.length - 1; i >= 0; i--) {
                let el = step2_els[i];
                let text = (el.innerText || '').toUpperCase();
                if (text.includes('VOTED') || text.includes('VOTE') || text.includes('+90M')) {
                    el.click();
                    break;
                }
            }
            """
            sb.execute_script(js_vote_click)
            
            print("等待 45 秒让视频广告完整播放并发放奖励...")
            time.sleep(45)
            
            print("奖励已发放，强制刷新页面以清理所有广告遮挡...")
            sb.refresh_page()
            time.sleep(8)
            
            print("获取页面最新剩余时间...")
            page_text = sb.get_text("body")
            time_match = re.search(r'\d{2}:\d{2}:\d{2}', page_text)
            remaining_time = time_match.group(0) if time_match else "未知"
            print(f"提取到时间: {remaining_time}")
            
            status = "✅ 续期成功" if remaining_time != "未知" else "⚠️ 状态未知"

            try:
                sb.save_screenshot(f"screenshots/{name}_2_result.png")
            except:
                pass
            
            task_results.append({"name": name, "status": status, "time": remaining_time})

    except Exception as e:
        print(f"节点 [{name}] 执行过程中发生异常: {e}")
        task_results.append({"name": name, "status": "❌ 执行失败", "time": "未知"})

print("\n所有节点处理完毕，正在统一发送综合汇报...")
send_unified_tg(task_results)
