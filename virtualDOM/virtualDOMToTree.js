// VNode의 children을 따라가며, 관계를 눈으로 볼 수 있는 문자열을 만듭니다.
function virtualDOMToTree(virtualDOM) {
  const lines = [];

  function getLabel(node) {
    if (typeof node === "string") {
      // 긴 스크립트도 트리 한 줄을 차지하도록 일부만 표시합니다.
      const preview = node.length > 80 ? node.slice(0, 80) + "…" : node;
      return "#text " + JSON.stringify(preview);
    }

    if (node.type === "#comment") {
      return "#comment " + JSON.stringify(node.children[0]);
    }

    const attributes = Object.entries(node.props)
      .map(([name, value]) => name + "=" + JSON.stringify(value))
      .join(" ");

    return "<" + node.type + (attributes ? " " + attributes : "") + ">";
  }

  function visit(node, prefix, isLast, isRoot = false) {
    const branch = isRoot ? "" : (isLast ? "└─ " : "├─ ");
    lines.push(prefix + branch + getLabel(node));

    // 텍스트와 주석은 트리의 끝입니다.
    if (typeof node === "string" || node.type === "#comment") {
      return;
    }

    // 들여쓰기용 공백만 숨깁니다. 원본 VNode의 children은 바꾸지 않습니다.
    const children = node.children.filter(
      (child) => typeof child !== "string" || child.trim() !== ""
    );
    const childPrefix = prefix + (isRoot ? "" : (isLast ? "   " : "│  "));

    children.forEach((child, index) => {
      visit(child, childPrefix, index === children.length - 1);
    });
  }

  visit(virtualDOM, "", true, true);
  return lines.join("\n");
}
