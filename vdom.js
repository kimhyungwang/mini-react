// vdom.js

// 의미 있는 자식만 고르기 (공백 텍스트, 주석 제외)
// domToVNode와 patch가 같은 기준으로 자식을 세기 위해 공통으로 사용
export function getChildren(node) {
  return [...node.childNodes].filter((child) => {
    if (child.nodeType === Node.TEXT_NODE) return child.textContent.trim() !== "";  //텍스트만 통과
    return child.nodeType === Node.ELEMENT_NODE;  //요소만 통과
  });
}

// 실제 DOM → VNode
export function domToVNode(node) {

  // 받은 노드의 종류 번호(nodeType)가 텍스트(3)인지 확인
  // 텍스트에는 태그 이름, 속성, 자식이 없어서 따로 처리해야 함
  if (node.nodeType === Node.TEXT_NODE) {

    // 텍스트 노드의 글자(textContent)를 읽어서 텍스트 VNode 객체로 만들어 바로 반환
    // 예) "안녕하세요" → { type: "#text", value: "안녕하세요" }
    // 여기서 return하므로 아래 코드는 실행되지 않음 → 재귀가 멈추는 지점
    return { type: "#text", value: node.textContent };
  }

  // 여기부터는 요소 노드(<div>, <p> 등)만 도착함

  // 속성들을 담을 빈 객체를 새로 만듦
  const props = {};

  // 노드의 속성 목록(attributes)을 하나씩 꺼내며 반복
  // 예) <div class="card" id="box"> → attr이 class, id 순서로 들어옴
  for (const attr of node.attributes) {

    // 속성 이름을 키로, 속성 값을 값으로 props에 저장
    // 예) props["class"] = "card" → props = { class: "card" }
    props[attr.name] = attr.value;
  }

  // ① getChildren(node): 자식 중 공백 텍스트와 주석을 뺀 의미 있는 자식만 배열로 받음
  //    예) div.card → [h3, p, ul]
  // ② .map(domToVNode): 그 자식 하나하나를 다시 domToVNode로 변환 (재귀 호출)
  //    예) [h3, p, ul] → [h3의 VNode, p의 VNode, ul의 VNode]
  // 이 줄 덕분에 손자, 증손자까지 트리 끝까지 전부 변환됨
  const children = getChildren(node).map(domToVNode);

  // 태그 이름(tagName)을 읽어 소문자로 바꾸고, 앞에서 만든 props와 children을 묶어
  // 새로운 VNode 객체를 만들어 반환
  // 예) { type: "div", props: { class: "card" }, children: [...] }
  // tagName은 "DIV"처럼 대문자로 오기 때문에 toLowerCase()로 통일
  // { props, children }은 { props: props, children: children }의 줄임 문법
  return { type: node.tagName.toLowerCase(), props, children };
}

// VNode → 실제 DOM
export function createElement(vnode) {
  if (vnode.type === "#text") {
    return document.createTextNode(vnode.value);
  }

  const el = document.createElement(vnode.type);

  // [Phase 2 수정] el.setAttribute(name, value) → setProp(el, name, value)
  // 이유: props에 onClick 함수나 value가 들어올 수 있어서, 종류별 처리를 하는 setProp에 맡김
  for (const [name, value] of Object.entries(vnode.props)) {
    setProp(el, name, value);
  }

  for (const child of vnode.children) {
    el.appendChild(createElement(child));
  }
  return el;
}


//phase 2 추가 함수--------------------------------


// 왜 추가했나?
//   Phase 1에서는 VNode를 domToVNode로 "읽어서" 얻었음
//   Phase 2에서는 컴포넌트 함수가 VNode를 "직접 만들어서" 반환해야 함
//   객체를 손으로 쓰면 너무 길어서, React의 JSX가 변환되는 함수(createElement)를 흉내 낸 것
//
//   손으로 쓰면: { type: "p", props: {}, children: [{ type: "#text", value: "안녕" }] }
//   h()로 쓰면:  h("p", null, "안녕")
//   결과는 똑같고, domToVNode가 만드는 VNode와 모양도 같아서 diff/patch를 그대로 쓸 수 있음
//
// type: 태그 이름
// props: 속성 객체 (없으면 null로 넘겨도 됨)
// ...children: 나머지 매개변수 → 세 번째 인자부터 전부 배열로 모음
//   예) h("ul", null, A, B, C) → children = [A, B, C]
export function h(type, props, ...children) {
  return {
    type,                                   // { type: type }의 줄임
    props: props || {},                     // null/undefined면 빈 객체 (diffProps의 for...in이 오류 안 나게)
    children: normalizeChildren(children),  // 자식들을 VNode 배열로 정리
  };
}


// h()에 들어온 자식들은 종류가 제각각이라, 전부 VNode로 통일하는 함수
//   "안녕"           → 문자열
//   3                → 숫자
//   h("li", ...)     → 이미 VNode
//   [li, li, li]     → map으로 만든 배열
//   false, null      → 조건부 렌더링에서 나오는 값
// export가 없음 → 이 파일 안에서만 쓰는 내부 함수
function normalizeChildren(children) {
  const result = [];

  // flat(Infinity): 배열 안의 배열을 전부 한 줄로 펼침
  // 예) h("ul", null, fruits.map(f => h("li", null, f)))
  //     children = [ [li 사과, li 바나나] ]  ← 배열이 통째로 하나의 자식으로 들어옴
  //     flat 후   = [ li 사과, li 바나나 ]
  for (const child of children.flat(Infinity)) {

    // 1) null, undefined, true, false는 화면에 아무것도 안 그림
    //    조건부 렌더링 때문에 필요:
    //    h("div", null, isEmpty && h("p", null, "비어있음"))
    //    isEmpty가 false면 자식으로 false가 들어옴 → 이걸 "false" 글자로 찍으면 안 되니 건너뜀
    if (child === null || child === undefined || typeof child === "boolean") continue;

    // 2) 문자열, 숫자는 텍스트 VNode로 감쌈
    //    숫자도 String()으로 바꾸는 이유: diff에서 "3" !== 3 이 되는 혼란을 막고
    //    domToVNode가 만드는 텍스트 VNode(항상 문자열)와 모양을 맞추기 위해
    //    예) h("p", null, "숫자: ", 3) → [#text "숫자: ", #text "3"]
    if (typeof child === "string" || typeof child === "number") {
      result.push({ type: "#text", value: String(child) });
      continue;
    }

    // 3) 그 외(이미 h()로 만든 VNode 객체)는 그대로 넣음
    result.push(child);
  }

  return result;
}

// 왜 추가했나?
//   Phase 1에서는 props가 전부 문자열(class="card" 등)이라 setAttribute 하나로 충분했음
//   Phase 2에서는 props에 두 가지 새로운 게 들어옴
//     1) onClick 같은 "함수"  → setAttribute로 넣으면 함수가 글자로 바뀌어 동작 안 함
//     2) input의 value       → setAttribute는 초기값만 바꾸고, 사용자가 타이핑한 내용은 안 바뀜
//   그래서 prop 종류별로 다르게 붙이는 규칙을 이 함수 하나에 모음
//   createElement(처음 만들 때)와 patch(바꿀 때)가 둘 다 이 함수를 써서 규칙이 항상 같음
//
// el: 실제 DOM 요소 / name: prop 이름 / value: 값 (null이면 "지우기")
export function setProp(el, name, value) {

  // ── 이벤트: "on"으로 시작하는 prop (onClick, onInput, onSubmit ...) ──
  if (name.startsWith("on")) {

    // prop 이름을 브라우저 이벤트 이름으로 바꿈
    // "onClick" → slice(2) → "Click" → toLowerCase() → "click"
    const eventName = name.slice(2).toLowerCase();

    // 이 요소에 붙여둔 이벤트 함수들을 기억하는 상자
    // 요소(DOM 객체)에 우리가 직접 _listeners라는 속성을 하나 만들어 저장함
    // 예) el._listeners = { click: 함수A }
    // 이미 있으면 그대로 쓰고, 없으면 빈 객체로 새로 만듦
    el._listeners = el._listeners || {};

    // 이전에 붙여둔 같은 이벤트 함수가 있으면 먼저 떼어냄
    // 왜? 컴포넌트가 다시 실행될 때마다 () => ... 화살표 함수가 "새로" 만들어짐
    //     → diff가 매번 onClick이 바뀌었다고 판단 → setProp이 매번 호출됨
    //     → 떼지 않고 붙이기만 하면 함수가 계속 쌓여서, 클릭 한 번에 여러 번 실행됨
    // removeEventListener는 "붙일 때 쓴 그 함수"를 정확히 넘겨야 떼어지므로 기억해 둔 것을 씀
    if (el._listeners[eventName]) {
      el.removeEventListener(eventName, el._listeners[eventName]);
    }

    if (value) {
      // 새 함수가 있으면 이벤트로 붙이고, 나중에 뗄 수 있게 기억해 둠
      el.addEventListener(eventName, value);
      el._listeners[eventName] = value;
    } else {
      // value가 null이면 (diff가 "onClick이 사라졌다"고 알려준 경우) 기억에서도 지움
      delete el._listeners[eventName];
    }
    return; // 이벤트 처리 끝, 아래 코드 실행 안 함
  }

  // ── value, checked: 프로퍼티로 직접 넣어야 하는 것 ──
  // HTML 속성(attribute)과 DOM 프로퍼티(property)는 다름
  //   <input value="처음">의 value 속성 = "초기값"
  //   input.value                       = "지금 입력창에 들어 있는 글자"
  // 사용자가 타이핑한 뒤에 setAttribute("value", "")를 해도 입력창은 안 비워짐
  // 그래서 el.value = "" 처럼 직접 대입해야 화면에 반영됨 (checked도 체크박스에서 같은 이유)
  if (name === "value" || name === "checked") {
    // 지우기(null)일 때는 value는 빈 문자열, checked는 false로 되돌림
    el[name] = value === null ? (name === "checked" ? false : "") : value;
    return;
  }

  // ── 그 외 일반 속성: class, id, placeholder 등 (Phase 1과 같은 방식) ──
  if (value === null || value === undefined || value === false) {
    // 값이 없거나 false면 속성 제거
    // false도 지우는 이유: h("button", { disabled: isEmpty })에서 isEmpty가 false면 속성이 없어야 함
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value);
  }
}