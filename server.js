/* [SRV(🏗️🏗️🏗️)] WIKI-ROUTER v5.1 CORE ENGINE */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

/* [PORT(🚪🚪🚪)] 인프라 및 경로 설정 */
const io = new Server(server, { maxHttpBufferSize: 2e7, cors: { origin: "*" } });
const peerServer = ExpressPeerServer(server, { debug: false, path: '/' });
const recDir = path.join(__dirname, 'recordings');

if (!fs.existsSync(recDir)) fs.mkdirSync(recDir);

/* [RUT(🛣️🛣️🛣️)] 라우팅 및 정적 파일 경로 강제 지정 */
app.use('/peerjs', peerServer);
app.use(express.static(path.join(__dirname, 'public')));

let peerList = new Set();

/* [RUT(🛣️🛣️🛣️)] 파일 순환 시스템 (100개 제한) */
function rotateLogs() {
    try {
        const files = fs.readdirSync(recDir).map(f => ({ 
            name: f, time: fs.statSync(path.join(recDir, f)).mtime.getTime() 
        })).sort((a, b) => a.time - b.time);
        if (files.length > 100) {
            files.slice(0, files.length - 100).forEach(f => fs.unlinkSync(path.join(recDir, f.name)));
        }
    } catch (e) {}
}

/* [SIO_S(📡📡📡)] 소켓 서버 로직 */
io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);

    // 💎 SIO_S: 통합 ID 등록
    socket.on('register-peer', (id) => {
        socket.myPeerId = id;
        peerList.add(id);
        console.log(`📡 [SIO_S] 입성: ${penguinId} (Peer: ${id})`);
    });





    // 🐻 BEAR: 실시간 타겟 리스트 요청 응답
    socket.on('get-peers', () => {
        socket.emit('peer-list', Array.from(peerList));
    });





    // 🐧 PENG: 무전기 음성 파일 동기화 (BLOB 처리)
    socket.on('sync-audio-file', (data) => {
        if (!data || !data.blob) return;
        
        // 📢 EV: 전역 브로드캐스팅
        socket.broadcast.emit('receive-sync-audio', { 
            blob: data.blob, 
            id: penguinId 
        });

// server.js 소켓 로직 내부
socket.on('disconnect', () => {
    if (socket.myPeerId) {
        peerList.delete(socket.myPeerId);
        // 연결이 끊겼을 때 다른 사용자들에게 알림을 보낼 수도 있습니다.
        io.emit('peer-left', socket.myPeerId); 
    }
    console.log(`👋 [퇴장] ${penguinId}`);
});




        // 서버 파일 저장 및 순환
        const fName = `voice_${penguinId}_${Date.now()}.webm`;
        fs.writeFile(path.join(recDir, fName), Buffer.from(data.blob), (err) => {
            if (!err) rotateLogs();
        });
    });

    // 🗑️ EV: 전체 삭제 신호
    socket.on('clear-logs-signal', () => {
        if (fs.existsSync(recDir)) {
            fs.readdirSync(recDir).forEach(f => fs.unlinkSync(path.join(recDir, f)));
        }
        io.emit('logs-cleared-notification', { by: penguinId });
    });

    socket.on('disconnect', () => {
        if (socket.myPeerId) peerList.delete(socket.myPeerId);
        console.log(`👋 [퇴장] ${penguinId}`);
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [WIKI-ROUTER v5.1] ONLINE: http://localhost:${PORT}`);
});