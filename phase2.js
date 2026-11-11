// phase2.js
import { h } from "./vdom.js";
import { FunctionComponent } from "./component.js";
import { useState, useMemo, useEffect } from "./hooks.js";   // ← useEffect 추가

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

const app = new FunctionComponent(App, { title: "useState 테스트" });
app.mount(document.getElementById("app"));

window.app = app;