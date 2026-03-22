/* [SRV(🏗️🏗️🏗️)] WIKI-ROUTER v5.2 CORE ENGINE */
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
        // 새로운 유저 입장을 모두에게 알림 (필요시)
        io.emit('peer-joined', id);
    });

    // 🐻 BEAR: 실시간 타겟 리스트 요청 응답
    socket.on('get-peers', () => {
        socket.emit('peer-list', Array.from(peerList));
    });

    // 🐧 PENG: 무전기 음성 파일 동기화
    socket.on('sync-audio-file', (data) => {
        if (!data || !data.blob) return;
        
        socket.broadcast.emit('receive-sync-audio', { 
            blob: data.blob, 
            id: penguinId 
        });

        const fName = `voice_${penguinId}_${Date.now()}.webm`;
        fs.writeFile(path.join(recDir, fName), Buffer.from(data.blob), (err) => {
            if (!err) rotateLogs();
        });
    });

// 서버의 io.on('connection', ...) 내부에 추가
socket.on('join-room', (roomId) => {
    socket.join(roomId); // 실제로 소켓을 해당 방에 넣음
    console.log(`🏠 [ROOM_JOIN] 유저(${socket.id}) -> 방: [${roomId}]`);
});




    // 🗑️ EV: 전체 삭제 신호
    socket.on('clear-logs-signal', () => {
        if (fs.existsSync(recDir)) {
            fs.readdirSync(recDir).forEach(f => fs.unlinkSync(path.join(recDir, f)));
        }
        io.emit('logs-cleared-notification', { by: penguinId });
    });

    // 🔌 DISCONNECT: 통합 연결 종료 로직 (중복 제거)
    socket.on('disconnect', () => {
        if (socket.myPeerId) {
            peerList.delete(socket.myPeerId);
            // 리스트에서 삭제되었음을 전역 알림
            io.emit('peer-left', socket.myPeerId); 
            console.log(`👋 [퇴장] Peer: ${socket.myPeerId} (Socket: ${penguinId})`);
        } else {
            console.log(`👋 [퇴장] Socket: ${penguinId}`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [WIKI-ROUTER v5.2] ONLINE: http://localhost:${PORT}`);
});