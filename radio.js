/* [🍌 RADIO(📻📻📻)] PENG & FS SYNC SYSTEM */
const fs = require('fs');
const path = require('path');
const recDir = path.join(__dirname, 'recordings');

module.exports = function(io, socket) {
    const penguinId = socket.id.substring(0, 5);

    // 🏠 룸 입장 로직
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.myRoom = roomId;
        console.log(`🏠 [ROOM] ${penguinId} (${socket.user.role}) -> ${roomId} 입성`);
    });

    // 🐧 무전기 음성 동기화
    socket.on('sync-audio-file', (data) => {
        if (!data.blob || !socket.myRoom) return;

        // 동일 룸 유저에게만 전달
        socket.to(socket.myRoom).emit('receive-sync-audio', {
            blob: data.blob,
            id: penguinId
        });

        // 서버 물리 저장 및 순환
        const fName = `voice_${socket.myRoom}_${Date.now()}.webm`;
        fs.writeFile(path.join(recDir, fName), Buffer.from(data.blob), () => {
            // rotateLogs() 실행 로직 (생략 가능)
        });
    });

    // 🗑️ 개발자 전용 전체 삭제
    socket.on('clear-logs-signal', () => {
        if (socket.user.role === 'developer') {
            fs.readdirSync(recDir).forEach(f => fs.unlinkSync(path.join(recDir, f)));
            io.emit('logs-cleared-notification', { by: 'DEVELOPER' });
        }
    });
};