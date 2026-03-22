/* [🍎 PHONE(📞📞📞)] C:\Users\55341\Desktop\Wiki-Router\phone.js */
module.exports = function(io, socket, peerList) {
    
    // 💎 Peer ID 등록 (기존 유지)
    socket.on('register-peer', (id) => {
        socket.myPeerId = id;
        peerList.add(id);
        io.emit('peer-joined', id);
    });

    // 🐻 [수리] BEAR: 실시간 타겟 리스트 요청 응답 추가
    socket.on('get-peers', () => {
        // 나를 제외한 나머지 피어 목록만 추출
        const otherPeers = Array.from(peerList).filter(id => id !== socket.myPeerId);
        console.log(`📞 [BEAR] ${socket.myPeerId}가 명단을 요청함. 대상: ${otherPeers.length}명`);
        socket.emit('peer-list', otherPeers);
    });

    // 📞 1:1 전화 걸기 (기존 유지)
    socket.on('call-request', (data) => {
        socket.to(data.targetPeerId).emit('incoming-call', {
            from: socket.myPeerId,
            callerName: socket.user.name
        });
    });

    // 🔇 미디어 상태 동기화 (기존 유지)
    socket.on('media-toggle', (state) => {
        if(socket.myRoom) {
            socket.to(socket.myRoom).emit('peer-media-update', {
                id: socket.myPeerId,
                mic: state.mic,
                video: state.video
            });
        }
    });
};