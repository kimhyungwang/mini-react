# mini-react

화면을 구성할 내용
js
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
    document.title = `숫자: ${count}`;
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

결과

App 함수가 정의만 됨 (아직 실행 안 됨, 화면 비어 있음)
화면 생성
js
const app = new FunctionComponent(App, { title: "useState 테스트" });
app.mount(document.getElementById("app"));

결과 (new FunctionComponent 직후)

js
app = {
  fn: App,
  props: { title: "useState 테스트" },
  hooks: [],              // 아직 비어 있음
  hookIndex: 0,
  container: null,
  vnode: null,
  dom: null,
  pendingEffects: [],
}
- mount
js
mount(container) {
    this.container = container;
    this.vnode = this.render();
    this.dom = createElement(this.vnode);
    container.innerHTML = "";
    container.appendChild(this.dom);
    this.runEffects();          //화면에 붙인 뒤 useEffect 실행
  }

mount의 두 번째 줄 this.vnode = this.render();에서 render가 먼저 실행됩니다.

- render
js
render() {
    this.hookIndex = 0;
    this.pendingEffects = [];   //이번 렌더링의 목록을 비우고 시작
    currentComponent = this;
    const vnode = this.fn(this.props);
    currentComponent = null;
    return vnode;
  }

결과 (return 직전)

js
app.hookIndex      = 4          // Hook 4개가 0, 1, 2, 3번 칸을 받아감
app.hooks          = [ 0, "", { value: 0, deps: [""] }, { deps: [0] } ]
app.pendingEffects = [ effect ] // useEffect 작업 (아직 실행 안 함)

반환한 vnode:
  div
   ├ h1     "useState 테스트"
   ├ p      "숫자: " "0"
   ├ button "+1"
   ├ button "초기화"
   ├ input  value: ""
   ├ p      "안녕, " "누구" "!"
   └ p      "이름 글자 수: " "0"

render가 돌려준 VNode로 mount의 나머지 줄(createElement → 화면에 붙이기 → runEffects)이 실행됩니다.

결과 (mount 끝난 뒤)

js
app.container = <div id="app">
app.hooks     = [ 0, "", { value: 0, deps: [""] }, { deps: [0] } ]
//              count name  nameLength(useMemo)    useEffect
app.vnode     = 화면 VNode (숫자: 0, 안녕, 누구!, 이름 글자 수: 0)
app.dom       = 화면에 붙은 실제 <div>
app.pendingEffects = []      // runEffects가 실행하고 비움
화면                          탭 제목: 숫자: 0
┌────────────────────────┐
│ useState 테스트          │
│ 숫자: 0  [+1] [초기화]   │
│ [ 이름 입력      ]       │
│ 안녕, 누구!              │
│ 이름 글자 수: 0          │
└────────────────────────┘

Console
useMemo 계산 실행
useEffect 실행
철수 입력
js
onInput: (e) => setName(e.target.value)

결과

js
e.target.value = "철수"
setName("철수") 호출       // setName = 1번 칸 담당 setState
변경 내용
js
const setState = (nextValue) => {
    if (Object.is(nextValue, component.hooks[i])) return;  // 값이 같으면 다시 안 그림

    component.hooks[i] = nextValue;  // i번 칸에 새 값 저장
    component.update();              // 다시 그리기
  };

결과 (update() 부르기 직전)

js
nextValue = "철수", i = 1
Object.is("철수", "") → false → 계속

app.hooks = [ 0, "철수", { value: 0, deps: [""] }, { deps: [0] } ]
//               ↑ "" → "철수"      ↑ useMemo 칸은 아직 그대로
- update
js
update() {
    const newVNode = this.render();
    const patches = diff(this.vnode, newVNode);
    console.log("update 변경 목록:", patches);
    patch(this.dom, patches);
    this.dom = this.container.firstChild;
    this.vnode = newVNode;
    this.runEffects();    
  }

결과 ① this.render() 끝난 뒤 (App 재실행, 글자 수 계산은 아래 useMemo 참고)

js
app.hooks = [ 0, "철수", { value: 2, deps: ["철수"] }, { deps: [0] } ]
//                        ↑ 글자 수 0 → 2
app.pendingEffects = []    // count 그대로라 useEffect 작업 안 넣음

newVNode:
  div
   ├ h1     "useState 테스트"
   ├ p      "숫자: " "0"
   ├ button "+1"
   ├ button "초기화"
   ├ input  value: "철수"
   ├ p      "안녕, " "철수" "!"
   └ p      "이름 글자 수: " "2"

결과 ② diff 변경 목록

js
patches = [
  { type: "PROPS", path: [2],    name: "onClick", value: 새 함수 },  // +1 버튼
  { type: "PROPS", path: [3],    name: "onClick", value: 새 함수 },  // 초기화 버튼
  { type: "PROPS", path: [4],    name: "value",   value: "철수" },   // 입력창
  { type: "PROPS", path: [4],    name: "onInput", value: 새 함수 },  // 입력창
  { type: "TEXT",  path: [5, 1], value: "철수" },                    // 안녕, 누구 → 철수
  { type: "TEXT",  path: [6, 1], value: "2" },                       // 글자 수 0 → 2
]

onClick, onInput은 App이 다시 실행되면서 화살표 함수가 새로 만들어져서 나오는 변경입니다. h1과 숫자: 0은 바뀐 게 없어서 목록에 없습니다.

결과 ③ patch · runEffects 끝난 뒤

js
app.vnode = newVNode
app.hooks = [ 0, "철수", { value: 2, deps: ["철수"] }, { deps: [0] } ]

글자 수
js
// hooks[2]: name이 바뀔 때만 글자 수를 다시 계산
  const nameLength = useMemo(() => {
    console.log("useMemo 계산 실행");
    return name.length;
  }, [name]);

결과 (update → render → App 재실행 중, 이 줄에 도착했을 때)

js
name    = "철수"                      // 바로 위 useState("")가 hooks[1]에서 꺼내준 값
compute = () => { ...; return name.length; }
deps    = ["철수"]
- useMemo
js
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

결과

js
i    = 2
prev = { value: 0, deps: [""] }          // 처음 화면 그릴 때 저장해 둔 것

depsChanged([""], ["철수"]) → true        // 이름이 바뀜 → 다시 계산
compute() → "철수".length → 2             // Console: useMemo 계산 실행

app.hooks = [ 0, "철수", { value: 2, deps: ["철수"] }, { deps: [0] } ]
//                        ↑ { value: 0, deps: [""] } → { value: 2, deps: ["철수"] }

return 2 → nameLength = 2














