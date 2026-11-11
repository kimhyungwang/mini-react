// hooks.js
// 함수형 컴포넌트에서 상태와 계산 결과를 기억하게 해주는 Hook 함수들
import { getCurrentComponent } from "./component.js";


// ───────────── useState ─────────────
// useState(초기값) → [현재 값, 값을 바꾸는 함수]
export function useState(initialValue) {

  // 지금 실행 중인 컴포넌트(app 객체)
  const component = getCurrentComponent();

  if (!component) {
    throw new Error("useState는 컴포넌트 함수 안에서만 호출할 수 있어요.");
  }

  // 이 useState가 쓸 칸 번호 (부른 순서대로 0, 1, 2...)
  const i = component.hookIndex++;

  // 처음이면 i번 칸에 초기값 저장
  if (component.hooks.length <= i) {
    component.hooks[i] = initialValue;
  }

  // i번 칸의 값을 바꾸는 함수
  const setState = (nextValue) => {
    if (Object.is(nextValue, component.hooks[i])) return;  // 값이 같으면 다시 안 그림

    component.hooks[i] = nextValue;  // i번 칸에 새 값 저장
    component.update();              // 다시 그리기
  };

  return [component.hooks[i], setState];
}


// ───────────── 의존성 비교 ─────────────
// 이전 의존성 배열과 새 의존성 배열을 비교
// 처음(이전 없음)이거나, 하나라도 값이 다르면 true
function depsChanged(prevDeps, nextDeps) {
  if (!prevDeps) return true;
  return nextDeps.some((dep, idx) => !Object.is(dep, prevDeps[idx]));
}


// ───────────── useMemo ─────────────
// useMemo(계산함수, 의존성배열) → 계산 결과
// 의존성이 바뀔 때만 다시 계산하고, 아니면 저장해 둔 결과를 그대로 돌려줌
export function useMemo(compute, deps) {

  const component = getCurrentComponent();

  if (!component) {
    throw new Error("useMemo는 컴포넌트 함수 안에서만 호출할 수 있어요.");
  }

  // useState와 같은 방식으로 칸 번호를 받음
  const i = component.hookIndex++;

  // i번 칸에는 { value: 계산 결과, deps: 그때의 의존성 } 이 저장됨
  const prev = component.hooks[i];

  // 처음이거나 의존성이 바뀌었으면 다시 계산해서 저장
  if (!prev || depsChanged(prev.deps, deps)) {
    component.hooks[i] = { value: compute(), deps };
  }

  return component.hooks[i].value;
}

// ───────────── useEffect ─────────────
// useEffect(작업함수, 의존성배열)
// 의존성이 바뀌었을 때만, 화면을 다 그린 뒤에 작업을 실행
export function useEffect(effect, deps) {

  const component = getCurrentComponent();

  if (!component) {
    throw new Error("useEffect는 컴포넌트 함수 안에서만 호출할 수 있어요.");
  }

  // 다른 Hook과 같은 방식으로 칸 번호를 받음
  const i = component.hookIndex++;

  // i번 칸에는 { deps: 그때의 의존성 } 이 저장됨
  const prev = component.hooks[i];

  // 처음이거나 의존성이 바뀌었으면
  if (!prev || depsChanged(prev.deps, deps)) {
    component.hooks[i] = { deps };            // 이번 의존성 기억
    component.pendingEffects.push(effect);    // 지금 실행하지 않고 "나중에 실행할 목록"에 넣음
  }
}