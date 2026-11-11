# mini-react

화면을 구성할 내용
```js
function App(props) {
  // hooks[0]: 숫자
  const [count, setCount] = useState(0);
  // hooks[1]: 이름
  const [name, setName] = useState("");

  // hooks[2]: name이 바뀔 때만 글자 수를 다시 계산
  const nameLength = useMemo(() => {
    console.log("useMemo 계산 실행");
    return name.length;
  }, [name]);

  // hooks[3]: count가 바뀔 때만, 화면을 그린 뒤 브라우저 탭 제목을 바꿈
  useEffect(() => {
    console.log("useEffect 실행");
    document.title = 숫자: ${count};
  }, [count]);

  return h("div", null,
    h("h1", null, props.title),

    h("p", null, "숫자: ", count),
    h("button", { onClick: () => setCount(count + 1) }, "+1"),
    h("button", { onClick: () => setCount(0) }, "초기화"),

    h("input", {
      value: name,
      placeholder: "이름 입력",
      onInput: (e) => setName(e.target.value),
    }),
    h("p", null, "안녕, ", name || "누구", "!"),
    h("p", null, "이름 글자 수: ", nameLength)
  );
}
```

화면 생성
```js
const app = new FunctionComponent(App, { title: "useState 테스트" });
app.mount(document.getElementById("app"));

mount
mount(container) {
  this.container = container;
  this.vnode = this.render();
  this.dom = createElement(this.vnode);
  container.innerHTML = "";
  container.appendChild(this.dom);
  this.runEffects();          //화면에 붙인 뒤 useEffect 실행
}

render
render() {
  this.hookIndex = 0;
  this.pendingEffects = [];   //이번 렌더링의 목록을 비우고 시작
  currentComponent = this;
  const vnode = this.fn(this.props);
  currentComponent = null;
  return vnode;
}
```

철수 입력
```js
onInput: (e) => setName(e.target.value)
```

변경 내용
```js
const setState = (nextValue) => {
    if (Object.is(nextValue, component.hooks[i])) return;  // 값이 같으면 다시 안 그림

    component.hooks[i] = nextValue;  // i번 칸에 새 값 저장
    component.update();              // 다시 그리기
  };

update update() {
  const newVNode = this.render();
  const patches = diff(this.vnode, newVNode);
  console.log("update 변경 목록:", patches);
  patch(this.dom, patches);
  this.dom = this.container.firstChild;
  this.vnode = newVNode;
  this.runEffects();
}
```

글자 수
```js
// hooks[2]: name이 바뀔 때만 글자 수를 다시 계산
  const nameLength = useMemo(() => {
    console.log("useMemo 계산 실행");
    return name.length;
  }, [name]);
```

```js
useMemo
export function useMemo(compute, deps) {

const component = getCurrentComponent();

if (!component) {
  throw new Error("useMemo는 컴포넌트 함수 안에서만 호출할 수 있어요.");
}

// useState와 같은 방식으로 칸 번호를 받음
const i = component.hookIndex++;

// i번 칸에는 { value: 계산 결과, deps: 그때의 의존성 } 이 저장됨
const prev = component.hooks[i];

// 처음이거나 의존성이 바뀌었으면 다시 계산해서 저장
if (!prev || depsChanged(prev.deps, deps)) {
  component.hooks[i] = { value: compute(), deps };
}

return component.hooks[i].value;
}
```
