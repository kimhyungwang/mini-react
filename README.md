# Mini React

외부 라이브러리 없이 JavaScript로 만든 작은 UI 프레임워크입니다.
컴포넌트를 함수로 작성하면, 상태가 바뀔 때 화면에서 **바뀐 부분만** 자동으로 다시 그립니다.

## 시작하기

### 1. HTML 준비

컴포넌트를 그릴 빈 자리 하나와, 앱 스크립트를 `type="module"`로 불러옵니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>My App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 2. 컴포넌트 작성

```js
// app.js
import { h } from "./vdom.js";
import { FunctionComponent } from "./component.js";
import { useState } from "./hooks.js";

function App() {
  const [count, setCount] = useState(0);

  return h("div", null,
    h("h1", null, "카운터"),
    h("p", null, "숫자: ", count),
    h("button", { onClick: () => setCount(count + 1) }, "+1")
  );
}
```

### 3. 화면에 출력

```js
const app = new FunctionComponent(App);
app.mount(document.getElementById("app"));
```

### 4. 실행

VS Code **Live Server**로 HTML 파일을 엽니다.
ES Module을 쓰므로 파일을 더블클릭해서 열면 동작하지 않습니다.

## 화면 그리기: `h()`

```js
h(태그이름, 속성, ...자식)
```

| 쓰는 것 | 예시 | 결과 |
|---|---|---|
| 기본 | `h("p", null, "안녕")` | `<p>안녕</p>` |
| 속성 | `h("div", { class: "box" }, ...)` | `<div class="box">` |
| 스타일 | `h("div", { style: "color: red;" }, ...)` | 문자열로 작성 |
| 숫자 | `h("p", null, "숫자: ", 3)` | `<p>숫자: 3</p>` |
| 중첩 | `h("ul", null, h("li", null, "사과"))` | `<ul><li>사과</li></ul>` |

### 이벤트

`on`으로 시작하는 속성에 함수를 넣습니다.

```js
h("button", { onClick: () => setCount(count + 1) }, "+1")
h("input", { value: name, onInput: (e) => setName(e.target.value) })
```

### 리스트

배열은 `map`으로 만들어 그대로 넣으면 펼쳐집니다.

```js
h("ul", null, fruits.map((f) => h("li", null, f)))
```

### 조건부 출력

`false`, `null`, `undefined`는 화면에 그리지 않습니다.

```js
h("div", null,
  isEmpty && h("p", null, "비어 있어요"),
  isLoggedIn ? h("p", null, "환영합니다") : h("button", null, "로그인")
)
```

### 비활성화

`false`면 속성이 빠집니다.

```js
h("button", { disabled: count === 0 }, "초기화")
```

## 컴포넌트 나누기

- **상태는 루트 컴포넌트(`App`)에만** 둡니다.
- 자식 컴포넌트는 props를 받아 `h()` 결과를 반환하는 함수로 만들고, **함수처럼 직접 호출**합니다.
- 자식에서 일어난 일은 props로 받은 함수로 `App`에 알립니다.

```js
// 자식: 상태 없이 props만 사용
function Counter({ count, onAdd }) {
  return h("div", null,
    h("p", null, "숫자: ", count),
    h("button", { onClick: onAdd }, "+1")
  );
}

// 루트: 상태를 갖고 자식에게 내려줌
function App() {
  const [count, setCount] = useState(0);

  return h("div", null,
    Counter({ count, onAdd: () => setCount(count + 1) })
  );
}
```

> 자식은 `h(Counter, ...)`가 아니라 `Counter({ ... })`로 호출합니다.

## Hooks

모두 **루트 컴포넌트 안, 맨 위**에서 호출합니다. 조건문이나 반복문 안에서 호출하지 않습니다.

```js
import { useState, useMemo, useEffect } from "./hooks.js";
```

### useState — 바뀌는 값 저장

```js
const [값, 바꾸는함수] = useState(처음값);
```

- 바꾸는 함수를 부르면 화면이 다시 그려집니다.
- 같은 값을 넣으면 다시 그리지 않습니다.
- 배열·객체는 **새로 만들어서** 넣습니다.

```js
const [todos, setTodos] = useState([]);

setTodos([...todos, "새 할 일"]);                 // 추가
setTodos(todos.filter((_, i) => i !== index));   // 삭제
setTodos(todos.map((t, i) => i === index ? "수정" : t));  // 수정
```

> `todos.push(...)`처럼 기존 배열을 직접 고치면 화면이 바뀌지 않습니다.

### useMemo — 계산 결과 재사용

```js
const 결과 = useMemo(() => 계산, [의존성]);
```

의존성이 바뀔 때만 다시 계산합니다.

```js
const doneCount = useMemo(() => todos.filter((t) => t.done).length, [todos]);
```

### useEffect — 화면을 그린 뒤 할 일

```js
useEffect(() => { 할 일 }, [의존성]);
```

화면 반영이 끝난 뒤, 의존성이 바뀔 때만 실행됩니다. 탭 제목 변경, 타이머처럼 화면 밖의 작업에 씁니다.

```js
useEffect(() => {
  document.title = `할 일 ${todos.length}개`;
}, [todos.length]);
```

## 예제

| 파일 | 내용 |
|---|---|
| [`phase2.html`](./phase2.html) | 숫자 올리기, 이름 입력, 글자 수, 탭 제목 |
| [`roulette.html`](./roulette.html) | 이름을 입력해 돌리는 랜덤 룰렛 (자식 컴포넌트 분리 예시) |
| [`index.html`](./index.html) | Virtual DOM · Diff · Patch 검증 페이지 |

## 알아둘 점

- 리스트 항목은 **순서대로** 비교합니다. 가운데 항목을 지우면 뒤 항목들은 "내용 변경"으로 처리됩니다.
- 바꾸는 함수를 부를 때마다 바로 다시 그립니다. 여러 번 부르면 그만큼 그립니다.
- `useEffect`의 정리 함수(return)는 지원하지 않습니다.
- 개발자 도구 Console에서 `update 변경 목록` 로그로 어떤 부분이 바뀌었는지 볼 수 있습니다.

## 실제 React와의 차이

### 여러 상태 변경 (Batching)

> React는 한 번의 이벤트 안에서 `setState`를 여러 번 불러도 모아서 화면을 한 번만 다시 그립니다.

- Mini React는 `setState`를 부를 때마다 바로 다시 그립니다.
- 예: 룰렛의 돌리기 버튼은 상태를 세 번 바꾸기 때문에 화면도 세 번 다시 그려집니다.

## 파일 구성

```
vdom.js       # h(), Virtual DOM ↔ 실제 DOM
diff.js       # 이전·새 Virtual DOM 비교
patch.js      # 바뀐 부분만 실제 DOM에 반영
component.js  # FunctionComponent (mount, update)
hooks.js      # useState, useMemo, useEffect
```
