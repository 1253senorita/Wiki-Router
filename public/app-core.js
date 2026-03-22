   /* [통신 및 기존 변수 유지] */
    const socket = io();
    const peer = new Peer({ host: location.hostname, port: location.port || 3000, path: '/peerjs' });
    let myStream, calls = [], rec, chunks = [], isBusy = false;
    let isBearActive = true; 

    /* --- [가입 및 모드 선택 로직 🍎] --- */
    const authScreen = document.getElementById('auth-screen');
    const unlockScreen = document.getElementById('unlock');
    const joinBtn = document.getElementById('join-btn');
    let selectedModeId = null;

    // 1. 모드 선택 시 서버에 권한 요청
    function selectMode(id) {
        const idVal = document.getElementById('join-id').value;
        if (!idVal.trim()) {
            alert("🍎 먼저 ID를 입력해 주세요!");
            return;
        }
        selectedModeId = id;
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.innerText = "🍎 권한 검증 중...";
        }
        // 서버로 ID와 모드 전송
        socket.emit('get_oi', { userId: idVal, modeId: id });
    }

    // 2. 서버 응답 처리 (인증 결과)
    socket.on('oi_response', (res) => {
        const statusDisplay = document.getElementById('status-display');
        if (res.success) {
            if (statusDisplay) {
                statusDisplay.innerText = `🍎 ${res.payload.text}`;
                statusDisplay.style.color = "var(--peng)";
            }
            joinBtn.disabled = false;
            joinBtn.style.background = "var(--peng)";
            joinBtn.innerText = "🍎 시스템 접속 시작";
        } else {
            if (statusDisplay) {
                statusDisplay.innerText = "❌ 접근 권한이 없습니다.";
                statusDisplay.style.color = "var(--bear)";
            }
            joinBtn.disabled = true;
            joinBtn.style.background = "var(--bear)";
        }
    });







// 3. 접속 버튼 클릭 시 (검증 완료 상태)
joinBtn.onclick = () => {
    if(joinBtn.disabled) return;

    // 🔥 [추가] 선택한 모드(방)에 실제로 입장하도록 서버에 신호 보냄
    if (selectedModeId) {
        socket.emit('join-room', selectedModeId); 
        console.log(`🏠 [ROOM] ${selectedModeId} 방으로 입장을 시도합니다.`);
    }

    authScreen.style.display = 'none';
    unlockScreen.style.display = 'flex';
    console.log("🍎 WIKI-ROUTER 접속 성공");
};

    /* --- [기존 로직 유지] --- */
    peer.on('open', (id) => socket.emit('register-peer', id));

    const masterSwitch = document.getElementById('master-switch');
    const handle = document.getElementById('slide-handle');
    const fill = document.getElementById('slide-fill');
    const statusSub = document.getElementById('status-sub');
    const bStat = document.getElementById('b-stat');
    const bTrig = document.getElementById('b-trig');

    masterSwitch.onclick = () => {
        if (isBearActive) {
            isBearActive = false;
            calls.forEach(c => c.close());
            calls = [];
            handle.style.left = '5px';
            handle.innerText = "🔌";
            fill.style.width = '0%';
            fill.style.background = '#ff4757';
            statusSub.innerText = "BEAR-OFFLINE";
            statusSub.style.color = "#ff4757";
            bStat.innerText = "OFF";
            bTrig.style.opacity = "0.3";
            bTrig.style.pointerEvents = "none";
        } else {
            isBearActive = true;
            handle.style.left = '70px';
            handle.innerText = "📞";
            fill.style.width = '100%';
            fill.style.background = '#2ecc71';
            statusSub.innerText = "💎 ONLINE";
            statusSub.style.color = "#00ff00";
            bStat.innerText = "READY";
            bTrig.style.opacity = "1";
            bTrig.style.pointerEvents = "auto";
        }
    };

    unlockScreen.onclick = function() {
        this.style.display = 'none';
        document.getElementById('status').innerText = "💎 ONLINE";
    };

    const startBear = async () => {
        if(!isBearActive || isBusy) return;
        isBusy = true;
        document.getElementById('b-stat').innerText = "STREAMING...";
        if (!myStream) myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        socket.emit('get-peers');
    };

    const startPeng = async () => {
        if(isBusy) return;
        isBusy = true; chunks = [];
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
    };

    const stopAll = () => {
        if(!isBusy) return;
        document.getElementById('b-stat').innerText = isBearActive ? "READY" : "OFF";
        if(rec && rec.state === "recording") rec.stop();
        isBusy = false;
    };

    document.getElementById('b-trig').onmousedown = startBear;
    document.getElementById('p-trig').onmousedown = startPeng;
    window.onmouseup = stopAll;
    document.getElementById('b-trig').ontouchstart = startBear;
    document.getElementById('p-trig').ontouchstart = startPeng;
    window.ontouchend = stopAll;

    socket.on('peer-list', (list) => {
        list.forEach(tid => { if(tid !== peer.id) calls.push(peer.call(tid, myStream)); });
    });

    peer.on('call', (c) => {
        c.answer();
        c.on('stream', (s) => { const a = new Audio(); a.srcObject = s; a.play(); });
    });

    socket.on('receive-sync-audio', (d) => {
        const url = URL.createObjectURL(new Blob([d.blob], { type: 'audio/webm' }));
        addLog(d.id, url, true);
        new Audio(url).play().catch(() => {});
    });

    function addLog(id, url, isOther) {
        const d = document.createElement('div');
        d.className = 'msg';
        d.innerHTML = `<strong>${isOther?'🐧':'👤'} ${id}</strong><audio src="${url}" controls style="width:100%;"></audio>`;
        document.getElementById('l-box').prepend(d);
    }

    document.getElementById('clear-btn').onclick = () => {
        socket.emit('clear-logs-signal');
        document.getElementById('l-box').innerHTML = '';
    };