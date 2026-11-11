// patch.js
// diff.js가 만든 변경 목록(patches)을 받아서, 실제 DOM에 "바뀐 곳만" 적용하는 파일
// diff가 설계도를 그리면, patch는 그 설계도대로 공사하는 역할


// vdom.js에서 함수 두 개를 가져옴 (가져오기만 하고 아직 실행 안 함)
//   createElement: ADD, REPLACE 때 VNode로 새 DOM을 만들기 위해
//   getChildren: path를 따라 노드를 찾을 때 domToVNode와 같은 기준으로 자식을 세기 위해
// [Phase 2 수정] import에 setProp 추가
// 이유: PROPS 변경을 처리할 때도 createElement와 똑같은 규칙(이벤트, value 처리)을 써야 하므로
import { createElement, getChildren, setProp } from "./vdom.js";


// path(자식 번호 경로)를 따라가서 실제 DOM 노드를 찾아 반환하는 함수
// root: 출발점 노드 (실제 영역의 div.card)
// path: 찾아갈 경로. 예) [1, 0] = root의 1번 자식 → 그 0번 자식
// export가 없음 → 이 파일 안에서만 쓰는 내부 함수
function getNode(root, path) {

  // 출발점에서 시작
  let node = root;

  // 경로의 번호를 하나씩 꺼내며 한 단계씩 아래로 내려감
  // for...of: 배열의 "값"을 하나씩 꺼냄 (for...in은 "키")
  for (const i of path) {

    // 지금 노드의 의미 있는 자식들 중 i번째로 이동
    // childNodes가 아니라 getChildren을 쓰는 이유:
    //   실제 DOM에는 HTML 줄바꿈으로 생긴 공백 텍스트 노드가 섞여 있음
    //   domToVNode는 공백을 빼고 번호를 매겼으니, 찾을 때도 똑같이 빼고 세야 번호가 맞음
    // 예) div.card의 childNodes: ["\n", h3, "\n", p, "\n", ul, "\n"] → [1]은 h3 (틀림)
    //     div.card의 getChildren: [h3, p, ul]                         → [1]은 p  (맞음)
    node = getChildren(node)[i];
  }

  // 경로 끝에 도착한 노드를 반환
  // path가 []이면 반복을 안 하므로 root 자신이 반환됨
  return node;
}


// 변경 목록을 실제 DOM에 순서대로 적용하는 함수
// root: 고칠 대상의 최상위 노드 (실제 영역의 div.card)
// patches: diff가 만든 변경 목록 배열
// export: main.js에서 import해서 쓸 수 있게 공개
export function patch(root, patches) {

  // 변경 기록을 앞에서부터 하나씩 꺼냄
  // 예) p = { type: "TEXT", path: [1, 0], value: "반가워" }
  for (const p of patches) {

    // 변경 종류(type)에 따라 다른 방법으로 처리
    switch (p.type) {

      // ───── 텍스트 변경 ─────
      case "TEXT": {

        // 경로의 텍스트 노드를 찾아서 글자만 바꿈
        // 새 노드를 만들지 않고 기존 노드를 그대로 재사용 → 가장 가벼운 변경
        // 예) "안녕하세요" 텍스트 노드 → "반가워"
        getNode(root, p.path).textContent = p.value;

        // break가 없으면 아래 case까지 줄줄이 실행되므로 꼭 필요
        break;
      }

      // ───── 속성 변경 ─────
      // [Phase 2 수정] 속성 변경을 setProp에 맡김
      // 전: if (p.value === null) removeAttribute / else setAttribute
      // 후: setProp 한 줄
      // 이유:
      //   - onClick이 바뀐 경우 → setProp이 이전 함수를 떼고 새 함수를 붙임
      //     (이 덕분에 버튼을 눌렀을 때 "B 클릭!"만 나오고 "A 클릭!"은 안 나옴)
      //   - value가 바뀐 경우 → setProp이 el.value에 직접 넣어 입력창 내용이 실제로 바뀜
      //   - 일반 속성 / null(삭제) → setProp 안에서 Phase 1과 같은 방식으로 처리
      case "PROPS": {
        setProp(getNode(root, p.path), p.name, p.value);
        break;
      }

      // ───── 노드 교체 ─────
      case "REPLACE": {

        // ① createElement(p.vnode): diff가 담아준 새 VNode로 새 DOM을 만듦
        //    (새 VNode 안에 속성, 자식이 다 들어 있어서 완성된 노드가 만들어짐)
        // ② getNode(...).replaceWith(...): 기존 노드를 찾아서 그 자리에 새 노드를 끼워 넣음
        // 예) <h3>제목</h3> 자리에 → 새로 만든 <h2>제목</h2>
        getNode(root, p.path).replaceWith(createElement(p.vnode));

        break;
      }

      // ───── 노드 추가 ─────
      case "ADD": {

        // 추가할 노드는 아직 화면에 없으니, 붙일 "부모"를 찾아야 함
        // slice(0, -1): 경로의 마지막 번호를 뺀 새 배열 = 부모의 경로
        // 예) [2, 2] (ul의 2번 자식 자리) → [2] (ul)
        const parent = getNode(root, p.path.slice(0, -1));

        // 새 VNode로 새 DOM을 만들어 부모의 맨 뒤에 붙임
        // 맨 뒤에 붙여도 되는 이유: diffChildren이 ADD를 항상 기존 자식들 "뒤쪽" 번호에서만 만들기 때문
        // 예) <ul><li>사과</li><li>바나나</li></ul> → 맨 뒤에 <li>포도</li>
        parent.appendChild(createElement(p.vnode));

        break;
      }

      // ───── 노드 삭제 ─────
      case "REMOVE": {

        // 경로의 노드를 찾아서 화면(DOM)에서 지움
        // 삭제 순서는 diffChildren이 이미 "뒤에서부터"로 만들어둬서 번호가 꼬이지 않음
        // 예) [2, 1] → ul의 두 번째 li 삭제
        getNode(root, p.path).remove();

        break;
      }
    }
  }
}