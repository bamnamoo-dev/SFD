import os
import sys
import http.server
import socketserver
import webbrowser
import threading
import time
import socket
import json

# 1. 포트 자동 탐색
def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

# 2. 서빙 리소스 경로 파악 및 데이터 저장 경로 설정
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    base_path = os.path.join(sys._MEIPASS, 'dist')
    exe_dir = os.path.dirname(sys.executable)
else:
    base_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
    exe_dir = os.path.dirname(os.path.abspath(__file__))

DATA_FILE = os.path.join(exe_dir, 'dashboard_data.json')

PORT = find_free_port()
last_heartbeat = time.time()

# 3. HTTP 서버 요청 핸들러
class SpaHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global last_heartbeat
        if self.path == '/api/heartbeat':
            last_heartbeat = time.time()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(b'ok')
            return
        elif self.path == '/api/load':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            if os.path.exists(DATA_FILE):
                try:
                    with open(DATA_FILE, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.wfile.write(content.encode('utf-8'))
                except Exception as e:
                    self.wfile.write(b'{"budgetData": [], "expenseData": []}')
            else:
                self.wfile.write(b'{"budgetData": [], "expenseData": []}')
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                # JSON 데이터 유효성 검증 후 저장
                data = json.loads(post_data.decode('utf-8'))
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "ok"}')
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))
            return

    def translate_path(self, path):
        # base_path 기준으로 정적 파일 매핑
        path = super().translate_path(path)
        rel = os.path.relpath(path, os.getcwd())
        return os.path.join(base_path, rel)

    def log_message(self, format, *args):
        pass  # 콘솔 로그 생략

def start_server():
    with socketserver.TCPServer(("", PORT), SpaHTTPRequestHandler) as httpd:
        httpd.serve_forever()


# 4. 자동 종료 모니터
def monitor_heartbeat():
    time.sleep(15)  # 브라우저가 최초 실행되어 로딩될 때까지 대기
    while True:
        time.sleep(3)
        if time.time() - last_heartbeat > 15:
            # 브라우저 탭이 닫혀서 핑이 15초 이상 전달되지 않으면 서버 자가 종료
            os._exit(0)

if __name__ == '__main__':
    # 서버 실행
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # 모니터링 실행
    monitor_thread = threading.Thread(target=monitor_heartbeat, daemon=True)
    monitor_thread.start()
    
    # 브라우저 연결
    time.sleep(1)
    webbrowser.open(f'http://localhost:{PORT}')
    
    # 메인 스레드 유지
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)
