// VNode 하나를 실제 DOM 노드로 만듭니다. 추가와 교체 작업에서 사용합니다.
function createDOMNode(node, ownerDocument = document) {
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
  for (const child of node.children) {
    element.appendChild(createDOMNode(child, ownerDocument));
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
      case "ADD": {
        const newNode = createDOMNode(change.newNode, ownerDocument);
        if (parent) parent.insertBefore(newNode, target ?? null);
        if (change.path.length === 0) patchedRoot = newNode;
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
        break;
      }
      default:
        throw new Error("알 수 없는 변경 종류: " + change.type);
    }
  }

  return patchedRoot;
}
