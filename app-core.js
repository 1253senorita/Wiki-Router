/* [CLIENT] app-core.js */

// 1. 상태 관리 변수
let selectedModeId = null;

/**
 * 모드 선택 시 서버에 권한 요청을 보냅니다.
 */
function selectMode(id) {
    selectedModeId = id;
    console.log(`📡 [OI] ID 전송 시도: ${id}`);
    
    const display = document.getElementById('status-display');
    if (display) display.innerText = "권한 확인 중...";
    
    // 서버의 'get_oi' 이벤트 호출
    socket.emit('get_oi', id);
}

/**
 * 서버의 응답을 받아 UI와 시스템 엔진을 제어합니다.
 */
socket.on('oi_response', (res) => {
    const display = document.getElementById('status-display');
    const oiPanel = document.getElementById('oi-display-panel');

    if (res.success) {
        // UI 업데이트
        const msg = `[SUCCESS] ${res.payload.text}`;
        if (display) {
            display.innerText = msg;
            display.style.color = "var(--peng)"; // 성공 테마 컬러
        }
        if (oiPanel) oiPanel.innerText = res.payload.text;

        // 권한 기반 엔진 가동 (accessLevel을 활용할 수도 있음)
        triggerAudioEngine(true); 
    } else {
        // 실패 처리
        if (display) {
            display.innerText = "접근 거부되었습니다.";
            display.style.color = "var(--bear)"; // 경고 테마 컬러
        }
        triggerAudioEngine(false);
    }
});

/**
 * 인증 상태에 따라 실제 기능을 활성화/비활성화합니다.
 */
function triggerAudioEngine(isAuthenticated) {
    const joinBtn = document.getElementById('join-btn');
    if (!joinBtn) return;

    if (isAuthenticated) {
        console.log("🔊 [ENGINE] 오디오 엔진 준비 완료.");
        joinBtn.style.background = "var(--success)"; 
        joinBtn.disabled = false; // 버튼 잠금 해제
    } else {
        joinBtn.disabled = true;  // 버튼 잠금
        joinBtn.style.background = "var(--disabled)";
    }
}