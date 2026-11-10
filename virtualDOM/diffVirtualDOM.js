// 두 VNode 트리를 비교해 변경 목록을 반환합니다. 실제 DOM은 수정하지 않습니다.
// path가 [1, 3]이면 루트의 children[1].children[3] 위치라는 뜻입니다.
function diffVirtualDOM(previous, next, path = []) {
  if (previous === next) {
    return [];
  }

  const previousMissing = previous === null || previous === undefined;
  const nextMissing = next === null || next === undefined;

  if (previousMissing && nextMissing) {
    return [];
  }

  if (previousMissing) {
    return [{ type: "ADD", path, newNode: next }];
  }

  if (nextMissing) {
    return [{ type: "REMOVE", path, oldNode: previous }];
  }

  const previousIsText = typeof previous === "string";
  const nextIsText = typeof next === "string";

  if (previousIsText && nextIsText) {
    return [{ type: "TEXT", path, oldValue: previous, newValue: next }];
  }

  // 글자가 요소로 바뀌거나, 태그 종류가 바뀌면 해당 위치의 노드가 교체됩니다.
  if (previousIsText !== nextIsText || previous.type !== next.type) {
    return [{ type: "REPLACE", path, oldNode: previous, newNode: next }];
  }

  // 실제 주석 DOM에는 자식 노드가 없으므로, 주석 자신을 변경 대상으로 기록합니다.
  if (previous.type === "#comment") {
    return previous.children[0] === next.children[0]
      ? []
      : [{ type: "TEXT", path, oldValue: previous.children[0], newValue: next.children[0] }];
  }

  const changes = [];

  // 이전에 있던 속성이 사라졌는지 확인합니다.
  for (const name of Object.keys(previous.props)) {
    if (!Object.hasOwn(next.props, name)) {
      changes.push({
        type: "REMOVE_PROP",
        path,
        name,
        oldValue: previous.props[name]
      });
    }
  }

  // 새 속성이 생겼거나, 기존 속성 값이 바뀌었는지 확인합니다.
  for (const name of Object.keys(next.props)) {
    if (!Object.hasOwn(previous.props, name) || previous.props[name] !== next.props[name]) {
      changes.push({
        type: "SET_PROP",
        path,
        name,
        oldValue: previous.props[name],
        newValue: next.props[name]
      });
    }
  }

  // 같은 인덱스의 자식끼리 비교합니다. 자식의 자식도 같은 방식으로 비교합니다.
  const childCount = Math.max(previous.children.length, next.children.length);
  for (let index = 0; index < childCount; index += 1) {
    const childChanges = diffVirtualDOM(
      previous.children[index],
      next.children[index],
      [...path, index]
    );
    changes.push(...childChanges);
  }

  return changes;
}
