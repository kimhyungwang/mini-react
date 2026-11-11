// diff.js
// 두 VNode(이전, 새것)를 비교해서 "어디가, 어떻게 바뀌었는지" 변경 목록(patches)을 만드는 파일
// 실제 DOM은 전혀 건드리지 않음. 계산만 함. 적용은 patch.js가 담당


// 두 VNode를 비교해서 변경 목록을 반환하는 메인 함수
// oldV: 이전 VNode / newV: 새 VNode
// path: 루트에서 지금 노드까지 오는 자식 번호 경로 (기본값 [] = 루트 자신)
//   예) [1, 0] = 루트의 1번 자식 → 그 0번 자식
// patches: 변경 기록을 쌓는 배열 (기본값 [] = 빈 배열로 시작)
//   재귀 호출할 때 같은 배열을 계속 넘겨서 모든 변경이 한 배열에 모임
// export: main.js에서 import해서 쓸 수 있게 공개
export function diff(oldV, newV, path = [], patches = []) {

  // ① 추가: 이전 노드는 없고(undefined) 새 노드만 있는 경우
  //    diffChildren에서 새 자식이 더 많을 때 oldV 자리에 undefined를 넘겨서 생김
  if (!oldV && newV) {

    // "이 경로에 이 VNode를 새로 추가해라"고 기록
    // vnode를 같이 담는 이유: patch가 새 DOM을 만들 때 설계도가 필요하기 때문
    // 예) { type: "ADD", path: [2, 2], vnode: { type: "li", ... } }
    patches.push({ type: "ADD", path, vnode: newV });

    // 새 노드는 통째로 만들 거라 안쪽을 비교할 필요 없음 → 바로 끝
    return patches;
  }

  // ② 삭제: 이전 노드는 있는데 새 노드가 없는(undefined) 경우
  //    diffChildren에서 이전 자식이 더 많을 때 newV 자리에 undefined를 넘겨서 생김
  if (oldV && !newV) {

    // "이 경로의 노드를 지워라"고 기록
    // 지우기만 하면 되니 경로(path)만 있으면 됨
    // 예) { type: "REMOVE", path: [2, 1] }
    patches.push({ type: "REMOVE", path });

    // 지울 노드의 안쪽은 비교할 필요 없음 → 바로 끝
    return patches;
  }

  // 여기부터는 두 노드가 모두 있는 경우만 도착함

  // ③ 교체: 두 노드의 종류(type)가 다른 경우
  //    예) "h3" vs "h2", "p" vs "div", "#text" vs "span"
  if (oldV.type !== newV.type) {

    // "이 경로의 노드를 이 VNode로 통째로 바꿔라"고 기록
    // 예) { type: "REPLACE", path: [0], vnode: { type: "h2", ... } }
    patches.push({ type: "REPLACE", path, vnode: newV });

    // 태그가 다르면 구조도 다를 거라고 보고 속성, 자식 비교를 생략 → 바로 끝
    // (실제 React도 같은 규칙을 씀)
    return patches;
  }

  // 여기부터는 두 노드의 type이 같은 경우만 도착함

  // ④ 텍스트 비교: 이전 노드가 텍스트인 경우
  //    type이 같다는 걸 이미 확인했으니 새 노드도 텍스트임
  if (oldV.type === "#text") {

    // 글자가 다를 때만 기록 (같으면 아무것도 안 함 → 불필요한 변경 방지)
    if (oldV.value !== newV.value) {

      // "이 경로의 텍스트를 이 글자로 바꿔라"고 기록
      // 예) { type: "TEXT", path: [1, 0], value: "반가워" }
      patches.push({ type: "TEXT", path, value: newV.value });
    }

    // 텍스트는 속성도 자식도 없으니 → 바로 끝 (재귀가 멈추는 지점)
    return patches;
  }

  // 여기부터는 같은 태그의 요소 노드만 도착함
  // 노드 자체는 같으니, 남은 두 가지(속성, 자식)를 확인해야 함

  // ⑤ 이 노드의 속성들을 비교 (변경 사항은 patches에 추가됨)
  diffProps(oldV.props, newV.props, path, patches);

  // 이 노드의 자식들을 비교 (자식마다 diff를 다시 호출 → 재귀)
  diffChildren(oldV.children, newV.children, path, patches);

  // 지금까지 쌓인 모든 변경 기록을 반환
  return patches;
}


// 두 노드의 속성(props)을 비교하는 함수
// export가 없음 → 이 파일 안에서만 쓰는 내부 함수
function diffProps(oldProps, newProps, path, patches) {

  // 새 속성들을 하나씩 확인 (for...in = 객체의 키를 하나씩 꺼냄)
  // 이 반복문이 잡는 경우: 값이 바뀐 속성, 새로 생긴 속성
  for (const name in newProps) {

    // 이전 값과 새 값이 다르면
    // 새로 생긴 속성은 oldProps[name]이 undefined라서 역시 다르다고 판단됨
    if (oldProps[name] !== newProps[name]) {

      // "이 경로 노드의 이 속성을 이 값으로 설정해라"고 기록
      // 예) { type: "PROPS", path: [], name: "class", value: "card active" }
      patches.push({ type: "PROPS", path, name, value: newProps[name] });
    }
  }

  // 이전 속성들을 하나씩 확인
  // 이 반복문이 잡는 경우: 사라진 속성
  for (const name in oldProps) {

    // 이전엔 있었는데 새 속성에는 이 이름이 없으면
    if (!(name in newProps)) {

      // value: null을 "이 속성을 지워라"는 신호로 약속함
      // 예) { type: "PROPS", path: [1], name: "id", value: null } 
      patches.push({ type: "PROPS", path, name, value: null });
    }
  }
}


// 두 노드의 자식 목록(children)을 비교하는 함수
// 직접 비교하지 않고, 같은 번호끼리 짝지어서 diff에 다시 맡김 (재귀)
// export가 없음 → 이 파일 안에서만 쓰는 내부 함수
function diffChildren(oldChildren, newChildren, path, patches) {

  // 양쪽에 모두 있는 자식 수 (둘 중 짧은 쪽 길이)
  // 예) 이전 li 2개, 새 li 3개 → common = 2
  const common = Math.min(oldChildren.length, newChildren.length);

  // 양쪽에 다 있는 자식들: 같은 번호끼리 짝지어 diff 재귀 호출
  for (let i = 0; i < common; i++) { 

    // [...path, i]: 현재 경로 뒤에 i를 붙인 "새 배열"
    //   예) path가 [2]이고 i가 0이면 → [2, 0]
    //   원본 path를 직접 바꾸면 형제 노드끼리 경로가 섞이므로 매번 새로 만듦
    diff(oldChildren[i], newChildren[i], [...path, i], patches);
  }

  // 새 쪽에만 있는 자식들 (새 자식이 더 많을 때)
  for (let i = common; i < newChildren.length; i++) {

    // oldV 자리에 undefined를 넘김 → diff 맨 위의 ① ADD에 걸림
    diff(undefined, newChildren[i], [...path, i], patches);
  }

  // 이전 쪽에만 있는 자식들 (이전 자식이 더 많을 때)
  // 뒤에서부터 거꾸로 도는 이유:
  //   [A, B, C, D]에서 C(2번), D(3번)를 지울 때 앞에서부터 지우면
  //   C를 지우는 순간 D가 2번으로 당겨져서 3번을 지우려 할 때 아무것도 없음
  //   뒤부터 지우면 앞쪽 번호는 변하지 않아서 안전함
  for (let i = oldChildren.length - 1; i >= common; i--) {

    // newV 자리에 undefined를 넘김 → diff 맨 위의 ② REMOVE에 걸림
    diff(oldChildren[i], undefined, [...path, i], patches);
  }
}