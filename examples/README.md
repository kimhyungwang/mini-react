# JavaScript와 React 카운터 비교

- `javascript.html`: 데이터를 바꾼 뒤 `textContent`로 화면을 직접 갱신합니다.
- `react.html`: `setCount`로 상태 변경을 요청하면 React가 화면에 반영합니다.

각 HTML 파일을 브라우저에서 열고 **증가** 버튼을 눌러 보세요.
두 예제 모두 숫자가 0부터 시작하고, 한 번 누를 때마다 1씩 증가합니다.
새로고침하면 0으로 돌아갑니다.

React 예제는 인터넷 연결이 필요합니다. React와 JSX 실행용 Babel을 CDN에서 불러오며,
별도의 패키지 설치 없이 비교해 보는 학습용 구성입니다.
