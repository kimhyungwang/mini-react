// JSX나 외부 라이브러리 없이 기존 Phase 1의 VDOM 형식을 만듭니다.
function createElement(type, props = {}, ...children) {
  props = props ?? {};
  const normalizedChildren = children.flat(Infinity)
    .filter((child) => child !== null && child !== undefined && typeof child !== "boolean")
    .map((child) => typeof child === "number" ? String(child) : child);
  if (typeof type === "function") {
    // 자식은 props만 받습니다. 자식 안의 Hook 호출은 차단됩니다.
    return withoutHooks(() => type({ ...props, children: normalizedChildren }));
  }
  const attributes = {};
  const events = {};
  const domProps = {};
  for (const [name, value] of Object.entries(props)) {
    if (/^on[A-Z]/.test(name)) {
      if (value != null && typeof value !== "function") {
        throw new TypeError(`${name} 이벤트에는 함수가 필요합니다.`);
      }
      if (value) events[name.slice(2).toLowerCase()] = value;
    } else if ((name === "value" && (type === "input" || type === "textarea"))
      || (name === "checked" && type === "input")
      || (name === "selected" && type === "option")) {
      if (value != null) domProps[name] = name === "value" ? String(value) : Boolean(value);
    } else if (value !== null && value !== undefined && value !== false) {
      attributes[name === "className" ? "class" : name] = value === true ? "" : String(value);
    }
  }
  return { type, props: attributes, events, domProps, children: normalizedChildren };
}
