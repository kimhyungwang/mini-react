// 실제 DOM 노드를 읽어서, 화면 구조를 표현하는 일반 JavaScript 데이터로 바꿉니다.
function domToVirtualDOM(node) {
  // 글자는 문자열로 보관합니다. 공백과 줄바꿈도 원본대로 유지합니다.
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  // HTML 주석도 보관합니다.
  if (node.nodeType === Node.COMMENT_NODE) {
    return {
      type: "#comment",
      props: {},
      children: [node.textContent]
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  // id뿐 아니라 class, lang, data-* 등 모든 HTML 속성을 읽습니다.
  const props = Object.fromEntries(
    Array.from(node.attributes, (attribute) => [attribute.name, attribute.value])
  );

  // 자식마다 같은 함수를 호출합니다. 이것이 재귀입니다.
  const children = Array.from(node.childNodes)
    .map((child) => domToVirtualDOM(child))
    .filter((child) => child !== null);

  return {
    type: node.localName,
    props,
    children
  };
}
