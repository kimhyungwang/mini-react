// 자식 컴포넌트들은 Hook 없이 props로만 화면을 만듭니다.
function Counter({ count, onIncrease }) {
  return createElement("div", {},
    createElement("p", {}, "숫자: ", createElement("strong", {}, count)),
    createElement("button", { type: "button", onClick: onIncrease }, "+1")
  );
}

function NameInput({ name, onChange }) {
  return createElement("label", {}, "이름: ",
    createElement("input", { type: "text", value: name, onInput: onChange })
  );
}

// 모든 상태와 Hook은 이 루트 함수에만 둡니다.
function App({ title }) {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("학습자");
  // 숫자만 바뀔 때는 이름으로 만든 인사말을 재사용합니다.
  const greeting = useMemo(() => `${name}님, 안녕하세요.`, [name]);

  // DOM 갱신 후 탭 제목을 바꾸고, 변경/종료 시 이전 제목을 복원합니다.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${name}의 카운터: ${count}`;
    return () => { document.title = previousTitle; };
  }, [name, count]);

  return createElement("div", {},
    createElement("h3", {}, title),
    createElement("p", {}, greeting),
    createElement(NameInput, {
      name,
      onChange: (event) => setName(event.target.value)
    }),
    createElement(Counter, {
      count,
      onIncrease: () => setCount((value) => value + 1)
    })
  );
}
