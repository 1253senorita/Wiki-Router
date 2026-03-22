/* [SERVER] server-core.js */
const USER_MODES = {
    'DEV_MASTER': { text: "관리자 모드 활성화 (호텔객실 관리자)", accessLevel: 5 },
    'GUEST_USER': { text: "게스트 제한 모드 (일반룸)", accessLevel: 1 },
    'NORMAL_USER': { text: "일반 사용자 모드 (프라이빗)", accessLevel: 2 }
};

io.on('connection', (socket) => {
    socket.on('get_oi', (id) => {
        const modeData = USER_MODES[id];
        if (modeData) {
            // 성공 시 페이로드와 함께 응답
            socket.emit('oi_response', { 
                success: true, 
                payload: { text: modeData.text, level: modeData.accessLevel } 
            });
        } else {
            socket.emit('oi_response', { success: false });
        }
    });
});