/* [SERVER] server-core.js */
const USER_MODES = {
    'DEV_MASTER': { text: "관리자 모드 활성화 (호텔객실 관리자)", accessLevel: 5 },
    'GUEST_USER': { text: "게스트 제한 모드 (일반룸)", accessLevel: 1 },
    'NORMAL_USER': { text: "일반 사용자 모드 (프라이빗)", accessLevel: 2 }
};

io.on('connection', (socket) => {
    // 클라이언트에서 객체 형태로 데이터를 보냄 { userId, modeId }
    socket.on('get_oi', (data) => {
        const { userId, modeId } = data;
        const modeData = USER_MODES[modeId];

        if (modeData) {
            // 해당 소켓을 특정 모드의 '룸'에 자동으로 조인시킬 수도 있습니다.
            socket.join(modeId); 

            socket.emit('oi_response', { 
                success: true, 
                userId: userId,
                modeId: modeId,
                payload: { 
                    text: `${userId}님, ${modeData.text}`, 
                    level: modeData.accessLevel 
                } 
            });
        } else {
            socket.emit('oi_response', { success: false });
        }
    });
});