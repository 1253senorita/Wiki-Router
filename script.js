const mainApp = document.querySelector('.main-app');
const cards = document.querySelectorAll('.card');
let isDragging = false;
let startPos = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let animationID = 0;
let currentIndex = 0;

// 이벤트 바인딩
mainApp.addEventListener('mousedown', dragStart);
mainApp.addEventListener('touchstart', dragStart);
mainApp.addEventListener('mouseup', dragEnd);
mainApp.addEventListener('touchend', dragEnd);
mainApp.addEventListener('mousemove', dragMove);
mainApp.addEventListener('touchmove', dragMove);
mainApp.addEventListener('mouseleave', dragEnd);

function dragStart(e) {
    isDragging = true;
    startPos = getPositionX(e);
    animationID = requestAnimationFrame(animation);
    mainApp.style.transition = 'none'; // 드래그 중에는 애니메이션 중지
}

function dragMove(e) {
    if (!isDragging) return;
    const currentPosition = getPositionX(e);
    currentTranslate = prevTranslate + currentPosition - startPos;
}

function dragEnd() {
    isDragging = false;
    cancelAnimationFrame(animationID);

    const movedBy = currentTranslate - prevTranslate;

    // 100px 이상 움직였을 때만 슬라이드 전환
    if (movedBy < -100 && currentIndex < cards.length - 1) currentIndex += 1;
    if (movedBy > 100 && currentIndex > 0) currentIndex -= 1;

    setPositionByIndex();
}

function getPositionX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
}

function animation() {
    setSliderPosition();
    if (isDragging) requestAnimationFrame(animation);
}

function setSliderPosition() {
    mainApp.style.transform = `translateX(${currentTranslate}px)`;
}

function setPositionByIndex() {
    mainApp.style.transition = 'transform 0.4s ease-out';
    // 카드 너비 + 간격(gap 30px)을 계산하여 이동
    const cardWidth = cards[0].offsetWidth + 30; 
    currentTranslate = currentIndex * -cardWidth;
    prevTranslate = currentTranslate;
    setSliderPosition();
}

// 창 크기가 바뀔 때 위치 재보정
window.addEventListener('resize', setPositionByIndex);