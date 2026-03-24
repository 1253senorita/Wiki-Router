# 1. 가볍고 보안이 강화된 Alpine 이미지 사용
FROM node:18-alpine

# 2. 컨테이너 내 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. 의존성 설치 (캐시 효율을 위해 package.json만 먼저 복사)
# --production 옵션으로 개발용 라이브러리를 제외해 용량을 줄입니다.
COPY package*.json ./
RUN npm install --production

# 4. 전체 소스 코드 복사
COPY . .

# 5. 환경 변수 설정 (기존 3000에서 8080으로 변경)
# Cloudtype 환경 변수 주입이 없을 경우 기본값으로 8080을 사용합니다.
ENV PORT=8080
ENV NODE_ENV=production

# 6. 포트 개방 (Cloudtype 설정에서도 8080으로 맞춰주세요)
EXPOSE 8080

# 7. 서버 실행
# 만약 진입점이 server.js가 아니라면 파일명을 수정하세요.
CMD ["node", "server.js"]