const domEventListeners = new WeakMap();

// 노드별 현재 함수를 보관해 다시 렌더링할 때 이벤트가 중복 등록되지 않게 합니다.
function setDOMEvent(element, name, listener) {
  let listeners = domEventListeners.get(element);
  if (!listeners) {
    listeners = new Map();
    domEventListeners.set(element, listeners);
  }
  const previous = listeners.get(name);
  if (previous === listener) return;
  if (previous) element.removeEventListener(name, previous);
  if (listener) {
    element.addEventListener(name, listener);
    listeners.set(name, listener);
  } else {
    listeners.delete(name);
  }
}

// 현재 입력 상태는 setAttribute가 아닌 DOM 프로퍼티로 반영합니다.
function setDOMProperty(element, name, value) {
  if (name === "selectedIndices") {
    const selectedIndices = new Set(value);
    for (const [index, option] of Array.from(element.options).entries()) {
      const selected = selectedIndices.has(index);
      if (option.selected !== selected) option.selected = selected;
    }
    if (selectedIndices.size === 0) element.selectedIndex = -1;
  } else if (element[name] !== value) {
    // 같은 값을 다시 대입해 입력 커서가 불필요하게 이동하는 것을 방지합니다.
    element[name] = value;
  }
}

// 자식을 모두 붙인 뒤 적용해야 select의 선택 상태도 정확히 복원됩니다.
function restoreDOMProperties(element, virtualDOM) {
  if (typeof virtualDOM === "string" || virtualDOM.type === "#comment") return;

  virtualDOM.children.forEach((child, index) => {
    restoreDOMProperties(element.childNodes[index], child);
  });
  for (const [name, value] of Object.entries(virtualDOM.domProps ?? {})) {
    setDOMProperty(element, name, value);
  }
}

// VNode 하나를 실제 DOM 노드로 만듭니다. 추가와 교체 작업에서 사용합니다.
function createDOMNode(node, ownerDocument = document) {
  // 구조를 만든 뒤 입력 상태를 한 번에 복원합니다.
  const element = createDOMStructure(node, ownerDocument);
  restoreDOMProperties(element, node);
  return element;
}

function createDOMStructure(node, ownerDocument) {
  if (typeof node === "string") {
    return ownerDocument.createTextNode(node);
  }

  if (node.type === "#comment") {
    return ownerDocument.createComment(node.children[0]);
  }

  const element = ownerDocument.createElement(node.type);
  for (const [name, value] of Object.entries(node.props)) {
    element.setAttribute(name, value);
  }
  for (const [name, listener] of Object.entries(node.events ?? {})) {
    setDOMEvent(element, name, listener);
  }
  for (const child of node.children) {
    element.appendChild(createDOMStructure(child, ownerDocument));
  }
  return element;
}

// Diff가 반환한 변경 목록을 실제 DOM에 적용하고, 적용 후 루트를 반환합니다.
function patchDOM(root, changes) {
  const ownerDocument = root?.ownerDocument ?? document;
  let patchedRoot = root;

  // 삭제하면 형제의 인덱스가 바뀌므로, 수정 전에 대상 노드를 모두 찾아 둡니다.
  const operations = changes.map((change) => {
    if (change.path.length === 0) {
      return { change, target: root, parent: root?.parentNode ?? null };
    }

    const parentPath = change.path.slice(0, -1);
    const parent = parentPath.reduce((node, index) => node.childNodes[index], root);
    const index = change.path[change.path.length - 1];
    return { change, target: parent.childNodes[index], parent };
  });

  const propertyUpdates = [];
  for (const { change, target, parent } of operations) {
    switch (change.type) {
      case "TEXT":
        // 텍스트 노드와 주석 노드의 실제 글자를 바꿉니다.
        target.nodeValue = change.newValue;
        break;
      case "SET_PROP":
        target.setAttribute(change.name, change.newValue);
        break;
      case "REMOVE_PROP":
        target.removeAttribute(change.name);
        break;
      case "SET_EVENT":
        setDOMEvent(target, change.name, change.newValue);
        break;
      case "SET_DOM_PROP":
        propertyUpdates.push(() => setDOMProperty(target, change.name, change.newValue));
        break;
      case "ADD": {
        const newNode = createDOMNode(change.newNode, ownerDocument);
        if (parent) parent.insertBefore(newNode, target ?? null);
        if (change.path.length === 0) patchedRoot = newNode;
        propertyUpdates.push(() => restoreDOMProperties(newNode, change.newNode));
        break;
      }
      case "REMOVE":
        if (parent) parent.removeChild(target);
        if (change.path.length === 0) patchedRoot = null;
        break;
      case "REPLACE": {
        const newNode = createDOMNode(change.newNode, ownerDocument);
        if (parent) parent.replaceChild(newNode, target);
        if (change.path.length === 0) patchedRoot = newNode;
        propertyUpdates.push(() => restoreDOMProperties(newNode, change.newNode));
        break;
      }
      default:
        throw new Error("알 수 없는 변경 종류: " + change.type);
    }
  }

  // 구조와 속성 변경이 끝난 뒤 입력 상태를 반영합니다.
  for (const update of propertyUpdates) update();

  return patchedRoot;
}
