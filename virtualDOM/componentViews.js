// 각 함수는 자신에게 전달된 상태로 해당 영역의 트리만 만듭니다.
function createCounterView(state) {
  return {
    type: "p",
    props: {},
    children: [
      "숫자: ",
      { type: "span", props: { id: "number" }, children: [String(state.count)] }
    ]
  };
}

function createTitleView(state) {
  return {
    type: "h1",
    props: {},
    children: [state.title]
  };
}

function createDetailsView(state) {
  return {
    type: "p",
    // hidden은 속성이 있을 때 숨겨지므로, 비표시 상태일 때만 추가합니다.
    props: state.showDetails ? {} : { hidden: "" },
    children: ["이 설명의 표시 여부도 독립된 state로 바뀝니다."]
  };
}

function createListView(state) {
  return {
    type: "ul",
    props: {},
    children: state.items.map((item) => ({
      type: "li",
      props: {},
      children: [item]
    }))
  };
}
