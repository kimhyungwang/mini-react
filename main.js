// main.js
// 프로그램의 시작점. index.html이 직접 불러오는 유일한 JS 파일
// 다른 파일(vdom, diff, patch)의 함수들을 "언제, 어떤 순서로" 부를지 정하는 지휘자 역할


// ───────────── 도구 가져오기 ─────────────

// vdom.js에서 변환 함수 두 개를 가져옴 (가져오기만 하고 아직 실행 안 함)
//   domToVNode: 실제 DOM → VNode
//   createElement: VNode → 실제 DOM
import { domToVNode, createElement } from "./vdom.js";

// diff.js에서 비교 함수를 가져옴 (두 VNode → 변경 목록)
import { diff } from "./diff.js";

// patch.js에서 반영 함수를 가져옴 (변경 목록 → 실제 DOM 수정)
import { patch } from "./patch.js";


// ───────────── HTML 요소 찾기 ─────────────
// id로 요소를 찾아 변수에 담아둠. 매번 다시 찾지 않아도 되도록

// 실제 영역 틀 (<div id="real">)
const real = document.getElementById("real");

// 테스트 영역 틀 (<div id="test" contenteditable="true">)
const test = document.getElementById("test");

// Patch 버튼
const patchBtn = document.getElementById("patch-btn");

// 뒤로가기 버튼
const backBtn = document.getElementById("back-btn");

// 앞으로가기 버튼
const forwardBtn = document.getElementById("forward-btn");

// "History: 2 / 3" 같은 현재 위치를 보여줄 글자 자리
const historyInfo = document.getElementById("history-info");


// ───────────── State History ─────────────

// 지금까지의 VNode 상태들을 순서대로 쌓아두는 배열
// 예) [처음 상태, Patch1 후 상태, Patch2 후 상태]
// 이름을 history로 하면 브라우저 내장 window.history와 헷갈려서 historyStack으로 지음
// const지만 배열 "안의 내용"은 push, splice로 바꿀 수 있음 (변수가 다른 배열을 가리키게만 못 함)
const historyStack = [];

// 지금 화면이 historyStack의 몇 번째 상태인지 가리키는 번호 (0부터 시작)
// 뒤로/앞으로 갈 때마다 바뀌어야 해서 let
let currentIndex = 0;


// ───────────── 페이지 로드 시 (바로 실행) ─────────────
// 아래 세 줄은 addEventListener 밖에 있으므로 페이지가 열리자마자 한 번 실행됨

// 실제 영역 안의 첫 번째 요소(div.card)를 VNode로 변환해서 History의 0번에 저장
// firstElementChild: 공백 텍스트를 건너뛰고 첫 번째 "태그"만 가져옴
// 이게 "원래 내용을 기억하는" 부분. 이후 모든 비교의 출발점
historyStack.push(domToVNode(real.firstElementChild));

// 저장한 VNode(0번)로 비어 있던 테스트 영역에 카드를 그림 → 사용자가 수정할 대상이 생김
renderTest(historyStack[currentIndex]);

// 처음 상태라 뒤로/앞으로 버튼을 비활성화하고 "History: 1 / 1" 표시
updateButtons();


// ───────────── Patch 버튼 (클릭할 때마다 실행) ─────────────

// 클릭하면 실행할 함수를 브라우저에 "등록"만 함. 이 줄을 지나도 안의 코드는 아직 실행 안 됨
patchBtn.addEventListener("click", () => {

  // 엣지 케이스: 사용자가 테스트 영역 내용을 전부 지워서 요소가 하나도 없으면
  // domToVNode(null)이 되어 오류가 나므로 미리 막음
  if (!test.firstElementChild) {
    alert("테스트 영역이 비어 있어요.");
    return; // 아래 코드 실행하지 않고 함수 종료
  }

  // 지금 실제 영역이 어떤 상태인지 History에서 꺼냄 (비교 기준)
  const oldVNode = historyStack[currentIndex];

  // ① 변환: 사용자가 고친 테스트 영역의 현재 모습을 새 VNode로 만듦
  const newVNode = domToVNode(test.firstElementChild);

  // ② 비교: 이전 VNode와 새 VNode의 차이를 변경 목록 배열로 받음
  // 예) [{ type: "TEXT", path: [1, 0], value: "반가워" }]
  const patches = diff(oldVNode, newVNode);

  // 확인용으로 변경 목록을 Console에 출력
  console.log("변경 목록:", patches);

  // 엣지 케이스: 아무것도 안 고치고 Patch를 누른 경우
  // 변경이 없는데 History에 같은 상태가 계속 쌓이지 않도록 그냥 종료
  if (patches.length === 0) return;

  // ③ 반영: 변경 목록대로 실제 영역의 카드에서 바뀐 곳만 수정
  patch(real.firstElementChild, patches);

  // ④ History 저장 준비
  // splice(n): n번째부터 끝까지 전부 잘라냄
  // 뒤로가기 한 상태에서 새로 Patch하면, 현재 위치 뒤에 있던 "미래" 기록은 버림
  // 예) [A, B, C]에서 B(1번)로 돌아간 뒤 Patch → splice(2)로 C 삭제 → [A, B]
  historyStack.splice(currentIndex + 1);

  // 새 상태를 History 맨 뒤에 추가
  // 예) [A, B] → [A, B, D]
  historyStack.push(newVNode);

  // 현재 위치를 방금 추가한 마지막 칸으로 옮김
  currentIndex = historyStack.length - 1;

  // 버튼 상태와 "History: 3 / 3" 표시를 갱신
  updateButtons();
});


// ───────────── 뒤로가기 / 앞으로가기 버튼 ─────────────

// 뒤로가기: 현재 번호보다 하나 앞 상태로 이동
backBtn.addEventListener("click", () => goTo(currentIndex - 1));

// 앞으로가기: 현재 번호보다 하나 뒤 상태로 이동
forwardBtn.addEventListener("click", () => goTo(currentIndex + 1));


// ───────────── 함수들 ─────────────
// 아래 function 선언들은 파일 맨 아래에 있지만,
// JS의 "호이스팅" 덕분에 위쪽(페이지 로드 부분)에서 먼저 불러도 동작함

// History의 index번째 상태로 이동하는 함수
// [예시] historyStack = [A, B, C]
//   A: "안녕하세요", 사과, 바나나   (처음)
//   B: "반가워",     사과, 바나나   (Patch 1)
//   C: "반가워",     바나나         (Patch 2: 사과 삭제)
//   현재 currentIndex = 2 (C를 보는 중)
function goTo(index) {

  // 엣지 케이스: 0보다 작거나(처음보다 앞), 배열 길이 이상(마지막보다 뒤)이면 무시
  // 버튼이 비활성화돼 있어도 혹시 모를 상황을 대비
  if (index < 0 || index >= historyStack.length) return;

  // 지금 실제 영역 상태를 History에서 꺼냄 (저장돼 있던 VNode)
  // 예) 뒤로가기 클릭 → goTo(1) → fromVNode = historyStack[2] = C
  const fromVNode = historyStack[currentIndex];

  // 이동하려는 상태를 History에서 꺼냄 (저장돼 있던 VNode)
  // 예) toVNode = historyStack[1] = B
  const toVNode = historyStack[index];

  // 두 상태의 차이를 "지금" 새로 계산 (차이는 저장해두지 않음)
  // 예) C → B : diff(C, B) = [{ type: "ADD",  path: [2, 1], vnode: li 바나나 }, ...]
  //             (사과가 다시 생기므로 li 개수가 1개 → 2개로 늘어남)
  //     B → A : diff(B, A) = [{ type: "TEXT", path: [1, 0], value: "안녕하세요" }]
  //     A → B : diff(A, B) = [{ type: "TEXT", path: [1, 0], value: "반가워" }]
  // 매번 계산하는 이유:
  //   1) VNode끼리 비교는 JS 객체 비교라 아주 빠름
  //   2) 어떤 상태에서 어떤 상태로든 diff 한 번이면 됨 (A → C로 바로 점프도 가능)
  const patches = diff(fromVNode, toVNode);

  // 확인용 출력. 예) "History 2 → 1 변경 목록: [...]"
  console.log(`History ${currentIndex} → ${index} 변경 목록:`, patches);

  // 계산된 변경만 실제 영역에 반영
  patch(real.firstElementChild, patches);

  // 테스트 영역: 이동할 상태로 통째로 다시 그림
  // 사용자가 Patch 없이 고쳐둔 내용이 있을 수 있어서 Diff 대신 확실하게 새로 그림
  renderTest(toVNode);

  // 현재 위치를 이동한 번호로 갱신
  currentIndex = index;

  // 버튼 상태와 위치 표시 갱신
  updateButtons();
}

// 테스트 영역을 비우고, 받은 VNode로 새로 그리는 함수
function renderTest(vnode) {

  // 테스트 영역 안의 내용을 전부 지움 (innerHTML에 빈 문자열을 넣으면 자식이 모두 사라짐)
  test.innerHTML = "";

  // VNode로 새 DOM을 만들어 테스트 영역 안에 붙임 → 화면에 나타남
  test.appendChild(createElement(vnode));
}

// 버튼 활성/비활성과 현재 위치 글자를 갱신하는 함수
function updateButtons() {

  // 처음(0번)이면 더 뒤로 갈 곳이 없으니 뒤로가기 버튼 비활성화
  // disabled = true면 회색으로 바뀌고 클릭 안 됨
  backBtn.disabled = currentIndex === 0;

  // 마지막 칸이면 더 앞으로 갈 곳이 없으니 앞으로가기 버튼 비활성화
  forwardBtn.disabled = currentIndex === historyStack.length - 1;

  // 사람이 보기 좋게 1부터 세서 표시 (currentIndex는 0부터라 +1)
  // 예) currentIndex 1, 길이 3 → "History: 2 / 3"
  historyInfo.textContent = `History: ${currentIndex + 1} / ${historyStack.length}`;
}