// 호출할 때마다 독립된 상태, 이전 트리, 실제 DOM 노드를 보관합니다.
function createComponent(container, initialState, createVirtualDOM) {
  const state = { ...initialState };
  const observers = new Set();
  let previousVirtualDOM = null;
  let root = null;

  // 상태 변경을 알림받을 함수를 등록하고, 구독 해제 함수를 반환합니다.
  function subscribe(observer) {
    observers.add(observer);
    return () => observers.delete(observer);
  }

  function notify() {
    for (const observer of [...observers]) {
      observer(state);
    }
  }

  // 처음에는 가상 DOM으로 실제 DOM을 만들어 컨테이너에 붙입니다.
  function mount() {
    const nextVirtualDOM = createVirtualDOM(state);
    root = createDOMNode(nextVirtualDOM);
    container.appendChild(root);
    previousVirtualDOM = nextVirtualDOM;
  }

  // 이후에는 이전 트리와 비교해서 바뀐 부분만 실제 DOM에 반영합니다.
  function update() {
    const nextVirtualDOM = createVirtualDOM(state);
    const changes = diffVirtualDOM(previousVirtualDOM, nextVirtualDOM);
    root = patchDOM(root, changes);
    previousVirtualDOM = nextVirtualDOM;
  }

  function setState(changes) {
    Object.assign(state, changes);
    notify();
  }

  // 화면 갱신도 상태 변경을 구독하는 함수로 등록합니다.
  subscribe(update);

  // 첫 화면은 상태 변경 알림 없이 한 번 만듭니다.
  mount();

  return {
    state,
    setState,
    subscribe
  };
}
