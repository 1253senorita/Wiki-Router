// 🐧 Wiki-Router 전용: PENG-PTT (펭귄) 모듈 엔진
module.exports = function(io) {
    // 펭귄 전용 접속자 저장소
    const pengPeers = new Set();

    io.on('connection', (socket) => {
        let currentId = null;

        // 📡 펭귄 노드 등록
        socket.on('register-peer', (id) => {
            currentId = id;
            pengPeers.add(id);
            console.log(`📡 [PENG-MOD] 노드 등록: ${id}`);
        });

        // 📢 접속 리스트 송출
        socket.on('get-peers', () => {
            socket.emit('peer-list', Array.from(pengPeers));
        });

        // ❌ 연결 해제 
        socket.on('disconnect', () => {
            if (currentId) {
                pengPeers.delete(currentId);
                console.log(`❌ [PENG-MOD] 노드 제거: ${currentId}`);
            }
        });
    });
};