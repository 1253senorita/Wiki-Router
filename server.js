/* [SRV(🏗️🏗️🏗️)] WIKI-ROUTER v5.2 CORE ENGINE */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const fs = require('fs');

// 💎 [ADD] DB 연결 도구 추가
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 💎 [ADD] Neon DB 설정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// DB 연결 확인 테스트
pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('❌ Neon DB 연결 실패!', err);
    else console.log('✅ Neon DB 연결 성공! 서버 시간:', res.rows[0].now);
});

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

    socket.on('register-peer', (id) => {
        socket.myPeerId = id;
        peerList.add(id);
        console.log(`📡 [SIO_S] 입성: ${penguinId} (Peer: ${id})`);
        io.emit('peer-joined', id);
    });



// =========================================================================
    // 💎 [UPDATE] 오디오 스트림 수신 및 데이터 양방향 검사 로직
    // =========================================================================
    socket.on('sync-audio-file', (data) => {
        if (!data || !data.blob) {
            console.log("❌ [서버 오류] 받은 오디오 데이터에 blob이 없습니다.");
            return;
        }
        
        const currentRoom = Array.from(socket.rooms).find(r => r !== socket.id);

        if (currentRoom) {
            // 📥 [서버 수신] 클라이언트 A가 보낸 오디오를 서버가 받음
            console.log(`📥 [서버 수신] ${penguinId}가 방[${currentRoom}]으로 오디오 전송함 (크기: ${data.blob.length || 0} bytes)`);

            // 🔄 [양방향 중계 핵심] 나(보낸 사람)를 제외한 방 안의 다른 클라이언트(클라이언트 B 등)들에게 즉시 쏴줌!
            socket.to(currentRoom).emit('receive-sync-audio', { 
                blob: data.blob, 
                id: penguinId 
            });

            // 📤 [서버 송신] 다른 유저들에게 브로드캐스트 완료 로그
            console.log(`📤 [서버 송신] 방[${currentRoom}]의 다른 유저들에게 오디오 브로드캐스트 완료`);
        } else {
            console.log(`⚠️ [서버 경고] ${penguinId}가 어떤 방에도 속해있지 않아 오디오를 버립니다.`);
        }
        
        // (참고) 서버 로컬 폴더에 오디오 파일 백업 저장
        const fName = `voice_${currentRoom || 'lobby'}_${penguinId}_${Date.now()}.webm`;
        fs.writeFile(path.join(recDir, fName), Buffer.from(data.blob), (err) => {
            if (!err && typeof rotateLogs === 'function') rotateLogs();
        });
    });



    socket.on('get_oi', (data) => {
        const { userId, userPw, modeId } = data;
        let isSuccess = false;
        let message = "";

        const PASSWORDS = {
            'DEV_MASTER': '1234',
            'GUEST_USER': '0000',
            'NORMAL_USER': '1111'
        };

        if (PASSWORDS[modeId] && userPw === PASSWORDS[modeId]) {
            isSuccess = true;
            message = `${userId}님, [${modeId}] 접속 승인 완료!`;
            console.log(`✅ [AUTH_SUCCESS] ${userId} -> ${modeId}`);
        } else {
            isSuccess = false;
            message = "❌ 정보가 일치하지 않습니다.";
            console.log(`❌ [AUTH_FAILED] ${userId} -> ${modeId} (Wrong PW)`);
        }

        socket.emit('oi_response', {
            success: isSuccess,
            payload: { text: message }
        });
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`🏠 [ROOM_JOIN] 유저(${socket.id}) -> 방: [${roomId}]`);
    });

    socket.on('clear-logs-signal', () => {
        if (fs.existsSync(recDir)) {
            fs.readdirSync(recDir).forEach(f => fs.unlinkSync(path.join(recDir, f)));
        }
        io.emit('logs-cleared-notification', { by: penguinId });
    });

    socket.on('disconnect', () => {
        if (socket.myPeerId) {
            peerList.delete(socket.myPeerId);
            io.emit('peer-left', socket.myPeerId); 
            console.log(`👋 [퇴장] Peer: ${socket.myPeerId}`);
        }
    });
});

/* [SYSTEM(🚀🚀🚀)] 서버 구동 및 환경 최적화 */
const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
    // 💡 로그에 찍히는 주소만 사람이 이해하기 쉬운 주소로 바꿉니다.
    const displayAddr = process.env.NODE_ENV === 'production' ? 'Cloudtype URL' : `http://localhost:${PORT}`;

    console.log(`
    ================================================
    🚀 [WIKI-ROUTER v5.2] CORE ENGINE ONLINE
    📡 MODE: ${process.env.NODE_ENV || 'development'}
    🌐 URL: ${displayAddr}  <-- 💡 이 부분이 핵심!
    📂 REC_DIR: ${recDir}
    ✅ PORT BINDING: SUCCESS (INTERNAL: ${PORT})
    ================================================
    `);
});/* [ERROR_HANDLING(⚠️⚠️⚠️)] */
process.on('uncaughtException', (err) => {
    console.error('🔴 [CRITICAL_ERROR] 서버 중단 방어:', err);
});