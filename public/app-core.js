/* [WIKI-ROUTER v5.2 Core Engine] */
const socket = io();
const peer = new Peer({ 
    host: location.hostname, 
    port: location.port || 3000, 
    path: '/peerjs',
    config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } 
});

let myStream, calls = [], rec, chunks = [], isBusy = false;
let isBearActive = true; 
let selectedModeId = null;

const authScreen = document.getElementById('auth-screen');
const unlockScreen = document.getElementById('unlock');
const joinBtn = document.getElementById('join-btn');
const statusDisplay = document.getElementById('status-display');

/* --- [1. 인증 및 모드 선택] --- */
function selectMode(id) {
    const idVal = document.getElementById('join-id').value;
    const pwVal = document.getElementById('join-pw').value;

    if (!idVal.trim() || !pwVal.trim()) {
        alert("🍎 ID와 비밀번호를 모두 입력해 주세요!");
        return;
    }

    selectedModeId = id;
    if (statusDisplay) statusDisplay.innerText = "🍎 보안 검증 중...";

    socket.emit('get_oi', { userId: idVal, userPw: pwVal, modeId: id });
}

socket.on('oi_response', (res) => {
    if (res.success) {
        statusDisplay.innerText = `✅ ${res.payload.text}`;
        statusDisplay.style.color = "var(--peng)";
        joinBtn.disabled = false;
        joinBtn.style.background = "var(--peng)";
        joinBtn.innerText = "🍎 시스템 접속 시작";
    } else {
        statusDisplay.innerText = "❌ 인증 실패: 정보를 확인하세요.";
        statusDisplay.style.color = "var(--bear)";
        joinBtn.disabled = true;
        joinBtn.style.background = "var(--bear)";
    }
});

joinBtn.onclick = () => {
    if(joinBtn.disabled) return;
    if (selectedModeId) socket.emit('join-room', selectedModeId); 
    
    authScreen.style.display = 'none';
    unlockScreen.style.display = 'flex';
};

/* --- [2. 시스템 초기화 및 오디오 활성화] --- */
unlockScreen.onclick = async function() {
    // 브라우저 오디오 컨텍스트 정책 해제
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    this.style.display = 'none';
    document.getElementById('status').innerText = "💎 ONLINE";
};

peer.on('open', (id) => socket.emit('register-peer', id));

/* --- [3. 실시간 통신 제어 (BEAR/PENG)] --- */
const startBear = async (e) => {
    if (e) e.preventDefault(); // 이벤트 중복 방지
    if(!isBearActive || isBusy) return;
    isBusy = true;
    document.getElementById('b-stat').innerText = "STREAMING...";
    
    try {
        if (!myStream) myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        socket.emit('get-peers');
    } catch (err) {
        alert("마이크 권한이 필요합니다.");
        isBusy = false;
    }
};

const startPeng = async (e) => {
    if (e) e.preventDefault();
    if(isBusy) return;
    isBusy = true; 
    chunks = [];
    
    try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(s, { mimeType: 'audio/webm' });
        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            socket.emit('sync-audio-file', { blob: blob });
            addLog("나", URL.createObjectURL(blob), false);
            s.getTracks().forEach(t => t.stop());
        };
        rec.start();
    } catch (err) {
        alert("마이크 권한이 필요합니다.");
        isBusy = false;
    }
};

const stopAll = (e) => {
    if (e) e.preventDefault();
    if(!isBusy) return;
    document.getElementById('b-stat').innerText = isBearActive ? "READY" : "OFF";
    if(rec && rec.state === "recording") rec.stop();
    isBusy = false;
};

// 이벤트 바인딩 (모바일/PC 하이브리드 대응)
const bTrig = document.getElementById('b-trig');
const pTrig = document.getElementById('p-trig');

bTrig.addEventListener('mousedown', startBear);
bTrig.addEventListener('touchstart', startBear, {passive: false});
pTrig.addEventListener('mousedown', startPeng);
pTrig.addEventListener('touchstart', startPeng, {passive: false});

window.addEventListener('mouseup', stopAll);
window.addEventListener('touchend', stopAll);

/* --- [4. 수신 및 로그 처리] --- */
socket.on('peer-list', (list) => {
    list.forEach(tid => { if(tid !== peer.id) calls.push(peer.call(tid, myStream)); });
});

peer.on('call', (c) => {
    c.answer();
    c.on('stream', (s) => { 
        const a = new Audio(); 
        a.srcObject = s; 
        a.play().catch(e => console.log("자동 재생 방지 대응 필요")); 
    });
});

socket.on('receive-sync-audio', (d) => {
    const url = URL.createObjectURL(new Blob([d.blob], { type: 'audio/webm' }));
    addLog(d.id, url, true);
    new Audio(url).play().catch(() => {});
});

function addLog(id, url, isOther) {
    const d = document.createElement('div');
    d.className = 'msg';
    d.innerHTML = `<strong>${isOther?'🐧':'👤'} ${id}</strong><audio src="${url}" controls style="width:100%; margin-top:5px;"></audio>`;
    document.getElementById('l-box').prepend(d);
}

document.getElementById('clear-btn').onclick = () => {
    if(confirm("모든 로그를 삭제하시겠습니까?")) {
        socket.emit('clear-logs-signal');
        document.getElementById('l-box').innerHTML = '';
    }
};

/* --- [5. 마스터 스위치 UI 제어] --- */
document.getElementById('master-switch').onclick = () => {
    const handle = document.getElementById('slide-handle');
    const fill = document.getElementById('slide-fill');
    const statusSub = document.getElementById('status-sub');
    const bStat = document.getElementById('b-stat');

    isBearActive = !isBearActive;
    
    if (!isBearActive) {
        calls.forEach(c => c.close());
        calls = [];
        handle.style.left = '5px'; handle.innerText = "🔌";
        fill.style.width = '0%'; fill.style.background = '#ff4757';
        statusSub.innerText = "BEAR-OFFLINE"; statusSub.style.color = "#ff4757";
        bStat.innerText = "OFF";
        bTrig.style.opacity = "0.3"; bTrig.style.pointerEvents = "none";
    } else {
        handle.style.left = '70px'; handle.innerText = "📞";
        fill.style.width = '100%'; fill.style.background = '#2ecc71';
        statusSub.innerText = "💎 ONLINE"; statusSub.style.color = "#00ff00";
        bStat.innerText = "READY";
        bTrig.style.opacity = "1"; bTrig.style.pointerEvents = "auto";
    }
};