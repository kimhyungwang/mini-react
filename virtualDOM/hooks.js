// 현재 실행 중인 루트입니다. 상태 자체는 인스턴스의 hooks에 남습니다.
let currentFunctionComponent = null;

function withoutHooks(callback) {
  const previous = currentFunctionComponent;
  currentFunctionComponent = null;
  try {
    return callback();
  } finally {
    currentFunctionComponent = previous;
  }
}

function getHook(kind, initialize) {
  const component = currentFunctionComponent;
  if (!component) {
    throw new Error("Hook은 루트 컴포넌트 함수의 최상위에서만 호출할 수 있습니다.");
  }
  const index = component.hookIndex++;
  if (!component.hooks[index]) {
    const hook = initialize(component);
    hook.kind = kind;
    component.hooks[index] = hook;
  }
  const hook = component.hooks[index];
  if (hook.kind !== kind) {
    throw new Error("Hook의 호출 순서를 바꾸거나 조건문 안에서 호출할 수 없습니다.");
  }
  return hook;
}

function dependenciesChanged(previous, next) {
  return previous === undefined || next === undefined
    || previous.length !== next.length
    || next.some((value, index) => !Object.is(value, previous[index]));
}

function copyDependencies(dependencies) {
  if (dependencies !== undefined && !Array.isArray(dependencies)) {
    throw new TypeError("의존성은 배열 또는 undefined여야 합니다.");
  }
  return dependencies === undefined ? undefined : [...dependencies];
}

function useState(initialValue) {
  const hook = getHook("state", (component) => {
    const generation = component.generation;
    const state = {
      value: typeof initialValue === "function" ? withoutHooks(initialValue) : initialValue
    };
    state.setState = (valueOrUpdater) => {
      if (component.isRendering) throw new Error("렌더링 중에는 상태를 변경할 수 없습니다.");
      if (!component.isMounted || generation !== component.generation) return;
      const nextValue = typeof valueOrUpdater === "function"
        ? withoutHooks(() => valueOrUpdater(state.value)) : valueOrUpdater;
      if (Object.is(state.value, nextValue)) return;
      state.value = nextValue;
      component.scheduleUpdate();
    };
    return state;
  });
  return [hook.value, hook.setState];
}

function useMemo(calculate, dependencies) {
  if (typeof calculate !== "function") throw new TypeError("useMemo에는 함수가 필요합니다.");
  const nextDependencies = copyDependencies(dependencies);
  const hook = getHook("memo", () => ({ initialized: false }));
  if (!hook.initialized || dependenciesChanged(hook.dependencies, nextDependencies)) {
    hook.value = withoutHooks(calculate);
    hook.dependencies = nextDependencies;
    hook.initialized = true;
  }
  return hook.value;
}

function useEffect(effect, dependencies) {
  if (typeof effect !== "function") throw new TypeError("useEffect에는 함수가 필요합니다.");
  const nextDependencies = copyDependencies(dependencies);
  const hook = getHook("effect", () => ({ initialized: false, cleanup: undefined }));
  if (!hook.initialized || dependenciesChanged(hook.dependencies, nextDependencies)) {
    // 실행은 DOM 반영 후 FunctionComponent에서 담당합니다.
    hook.pending = { effect, dependencies: nextDependencies };
  }
}
