/* [SERVER] server-core.js */
const USER_MODES = {
    'DEV_MASTER': { text: "관리자 모드 활성화 (호텔객실 관리자)", accessLevel: 5 },
    'GUEST_USER': { text: "게스트 제한 모드 (일반룸)", accessLevel: 1 },
    'NORMAL_USER': { text: "일반 사용자 모드 (프라이빗)", accessLevel: 2 }
};

/* [SIO_S(📡📡📡)] 소켓 서버 로직 */
io.on('connection', (socket) => {
    const penguinId = socket.id.substring(0, 5);

    socket.on('register-peer', (id) => {
        socket.myPeerId = id;
        peerList.add(id);
        console.log(`📡 [SIO_S] 입성: ${penguinId} (Peer: ${id})`);
        io.emit('peer-joined', id);
    });

    socket.on('get-peers', () => {
        socket.emit('peer-list', Array.from(peerList));
    });

    // 💎 [ADD] 텍스트 메시지 전송 및 방 브로드캐스트
    socket.on('send-message', (data) => {
        const currentRoom = Array.from(socket.rooms).find(r => r !== socket.id);
        if (currentRoom) {
            socket.to(currentRoom).emit('receive-message', {
                message: data.message,
                id: penguinId,
                userId: data.userId
            });
            console.log(`💬 [TEXT_MSG] ${penguinId} -> 방: [${currentRoom}] (${data.message})`);
        }
    });

    // 💎 [ADD] 이미지 전송 (Base64 또는 바이너리) 및 방 브로드캐스트
    socket.on('send-image', (data) => {
        const currentRoom = Array.from(socket.rooms).find(r => r !== socket.id);
        if (currentRoom) {
            socket.to(currentRoom).emit('receive-image', {
                image: data.image,
                fileName: data.fileName,
                id: penguinId
            });
            console.log(`🖼️ [IMAGE_SEND] ${penguinId} -> 방: [${currentRoom}]`);
        }
    });

    // =========================================================================
    // 💎 [UPDATE] 오디오 스트림 수신 및 데이터 왕복 검사 로직 (아이콘/주석 포함)
    // =========================================================================
    socket.on('sync-audio-file', (data) => {
        if (!data || !data.blob) {
            console.log("❌ [서버 오류] 받은 오디오 데이터에 blob이 없습니다.");
            return;
        }
        
        const currentRoom = Array.from(socket.rooms).find(r => r !== socket.id);

        if (currentRoom) {
            // 📥 [서버 수신 검사 로그] 앱에서 보낸 오디오 패킷이 서버에 도착했을 때
            console.log(`📥 [서버 수신] ${penguinId}가 방[${currentRoom}]으로 오디오 전송함 (크기: ${data.blob.length || 0} bytes)`);

            // 같은 방에 참여 중인 다른 클라이언트들에게 오디오 브로드캐스트
            socket.to(currentRoom).emit('receive-sync-audio', { 
                blob: data.blob, 
                id: penguinId 
            });

            // 📤 [서버 송신 검사 로그] 상대방 앱으로 오디오 패킷을 밖으로 쏠 때
            console.log(`📤 [서버 송신] 방[${currentRoom}]의 다른 유저들에게 오디오 브로드캐스트 완료`);
        } else {
            console.log(`⚠️ [서버 경고] ${penguinId}가 어떤 방에도 속해있지 않아 오디오를 버립니다.`);
        }
        
        // 로컬 파일 백업 로직
        const fName = `voice_${currentRoom || 'lobby'}_${penguinId}_${Date.now()}.webm`;
        fs.writeFile(path.join(recDir, fName), Buffer.from(data.blob), (err) => {
            if (!err && typeof rotateLogs === 'function') rotateLogs();
        });
    });
    // =========================================================================

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