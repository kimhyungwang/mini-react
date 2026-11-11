// 루트 컴포넌트 함수를 실행하고, 렌더링 결과와 Hooks 저장 공간을 유지합니다.
class FunctionComponent {
  constructor(component, container, props = {}) {
    this.component = component;
    this.container = container;
    this.props = props;
    this.hooks = [];
    this.previousVirtualDOM = null;
    this.root = null;
    this.hookIndex = 0;
    this.hookCount = null;
    this.isMounted = false;
    this.isRendering = false;
    this.updateScheduled = false;
    this.updateVersion = 0;
    this.generation = 0;
  }

  render(props) {
    const previous = currentFunctionComponent;
    currentFunctionComponent = this;
    this.hookIndex = 0;
    this.isRendering = true;
    try {
      const result = this.component(props);
      if (this.hookCount !== null && this.hookIndex !== this.hookCount) {
        throw new Error("매 렌더링에서 같은 개수와 순서로 Hook을 호출해야 합니다.");
      }
      this.hookCount = this.hookIndex;
      if (result == null || typeof result === "boolean") return "";
      return typeof result === "number" ? String(result) : result;
    } finally {
      currentFunctionComponent = previous;
      this.isRendering = false;
    }
  }

  // 처음에는 VDOM으로 실제 DOM을 만들어 붙입니다.
  mount() {
    // 여러 번 호출해도 같은 화면이 중복으로 붙지 않도록 합니다.
    if (this.isMounted) return this.root;

    const nextVirtualDOM = this.render(this.props);
    const root = createDOMNode(nextVirtualDOM, this.container.ownerDocument);
    this.container.appendChild(root);

    this.root = root;
    this.previousVirtualDOM = nextVirtualDOM;
    this.isMounted = true;
    this.flushEffects();
    return this.root;
  }

  // 같은 함수를 다시 실행하고, 이전 결과와 달라진 부분만 반영합니다.
  update(nextProps = this.props) {
    if (this.isRendering) throw new Error("렌더링 중 update()를 호출할 수 없습니다.");
    if (!this.isMounted) {
      this.props = nextProps;
      return this.mount();
    }

    this.updateScheduled = false;
    this.updateVersion += 1;
    const nextVirtualDOM = this.render(nextProps);
    const changes = diffVirtualDOM(this.previousVirtualDOM, nextVirtualDOM);
    this.root = patchDOM(this.root, changes);

    this.props = nextProps;
    this.previousVirtualDOM = nextVirtualDOM;
    this.flushEffects();
    return this.root;
  }

  scheduleUpdate() {
    if (!this.isMounted || this.updateScheduled) return;
    this.updateScheduled = true;
    const version = ++this.updateVersion;
    // 같은 이벤트에서 여러 setState를 호출해도 한 번만 렌더링합니다.
    queueMicrotask(() => {
      if (this.isMounted && version === this.updateVersion) this.update();
    });
  }

  flushEffects() {
    for (const hook of this.hooks) {
      if (!this.isMounted) break;
      if (hook.kind !== "effect" || !hook.pending) continue;
      const pending = hook.pending;
      hook.pending = undefined;
      const cleanup = hook.cleanup;
      hook.cleanup = undefined;
      if (cleanup) withoutHooks(cleanup);
      hook.dependencies = pending.dependencies;
      hook.initialized = true;
      const nextCleanup = withoutHooks(pending.effect);
      if (nextCleanup !== undefined && typeof nextCleanup !== "function") {
        throw new TypeError("Effect는 정리 함수 또는 undefined를 반환해야 합니다.");
      }
      hook.cleanup = nextCleanup;
    }
  }

  unmount() {
    if (!this.isMounted) return;
    this.isMounted = false;
    this.generation += 1;
    this.updateVersion += 1;
    this.updateScheduled = false;
    for (const hook of this.hooks) {
      if (hook.kind === "effect" && hook.cleanup) {
        const cleanup = hook.cleanup;
        hook.cleanup = undefined;
        try {
          withoutHooks(cleanup);
        } catch (error) {
          console.error("Effect 정리 중 오류:", error);
        }
      }
    }
    this.root.remove();
    this.root = null;
    this.previousVirtualDOM = null;
    this.hooks = [];
    this.hookCount = null;
    this.hookIndex = 0;
  }
}
