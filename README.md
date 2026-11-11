Mini React
===========

JavaScript로 Virtual DOM, Diff·Patch, 함수형 컴포넌트와 Hooks를 직접 구현한 프로젝트입니다.

사용자 입력으로 상태가 바뀌면 새 Virtual DOM과 이전 Virtual DOM을 비교해 변경 사항을 실제 DOM에 반영합니다.
외부 프레임워크 없이 컴포넌트 실행부터 상태 유지, 화면 갱신까지 연결했습니다.

## 동작 구조

```mermaid
flowchart TD
    Input[사용자 입력] --> State[useState로 상태 변경]
    State --> Update["update() 호출"]
    Update --> Next[새 VDOM 생성]
    Previous[이전 VDOM] --> Diff[Diff: 변경 사항 비교]
    Next --> Diff
    Diff --> Patch[Patch: 실제 DOM 부분 갱신]
    Patch --> Effect[의존성이 바뀐 Effect 실행]
```

- 상태는 `hooks` 배열에 저장하고, `update()`가 루트와 자식 컴포넌트를 실행해 새 VDOM을 만듭니다.
- 이전 VDOM과 비교한 변경 목록을 실제 DOM에 적용하며, 유지할 DOM 노드는 재사용합니다.
- 갱신한 VDOM은 다음 비교의 기준으로 저장하고, DOM 반영 후 의존성이 바뀐 Effect를 실행합니다.

## Virtual DOM · Diff · Patch

`createElement()`가 태그, 속성, 자식, 이벤트, 입력 프로퍼티를 가진 Virtual DOM을 생성합니다.
Diff는 두 트리의 차이를 변경 목록으로 만들고, Patch는 해당 목록을 실제 DOM에 적용합니다.

### Diff의 5가지 기본 경우

같은 위치의 두 노드를 비교하고, 자식도 같은 방식으로 재귀적으로 비교합니다.
값이 같으면 변경 목록을 만들지 않고, 차이가 있으면 다음 기준으로 처리합니다.

| 경우 | 판단 기준 | 변경 목록 |
| --- | --- | --- |
| 추가 | 이전 노드가 없고 다음 노드가 있음 | `ADD` |
| 삭제 | 이전 노드가 있고 다음 노드가 없음 | `REMOVE` |
| 교체 | 태그나 노드 종류가 달라짐 | `REPLACE` |
| 텍스트 변경 | 같은 위치의 텍스트 내용이 달라짐 | `TEXT` |
| 속성 변경 | 속성이 추가·삭제되거나 값이 달라짐 | `SET_PROP`, `REMOVE_PROP` |

### 변경 목록을 실제 DOM에 반영

Patch는 경로에 해당하는 DOM을 찾아 추가·삭제·교체 메서드나 `nodeValue`, `setAttribute()` 등을 적용합니다.

- 같은 인덱스의 자식끼리 재귀적으로 비교하며, 교체 대상이 아닌 기존 DOM 노드를 재사용합니다.
- 여러 형제 노드를 삭제할 때 인덱스가 밀리지 않도록 변경 전에 대상 DOM을 찾아 둡니다.
- 이전 이벤트 함수를 제거한 뒤 새 함수를 등록해 중복 등록을 방지합니다.
- DOM 프로퍼티는 구조와 속성 변경이 끝난 뒤 반영합니다. 같은 입력값은 재대입하지 않아 불필요한 커서 이동을 줄입니다.

구현: [diffVirtualDOM.js](virtualDOM/diffVirtualDOM.js), [patchDOM.js](virtualDOM/patchDOM.js)

## 함수형 컴포넌트와 상태 분리

- UI를 역할에 따라 작은 함수형 컴포넌트로 나눕니다.
- 루트 컴포넌트에서 상태를 관리합니다.
- 자식 컴포넌트는 전달받은 props로 Virtual DOM을 반환합니다.
- 부모가 상태 변경 함수를 props로 전달하고, 자식은 사용자 입력을 그 함수에 전달합니다.
- `createElement()`로 실행한 자식 컴포넌트에서는 Hook 호출을 차단합니다.

구현: [components.js](virtualDOM/components.js), [createElement.js](virtualDOM/createElement.js)

## 함수를 다시 실행해도 유지되는 상태

- `FunctionComponent` 인스턴스에 `hooks` 배열을 보관합니다.
- 렌더링을 시작할 때 Hook 인덱스를 0으로 초기화하고, 호출 순서대로 기존 저장 공간을 사용합니다.
- 루트 컴포넌트 함수가 다시 실행되어도 같은 인스턴스의 상태를 읽습니다.
- 렌더링 간 Hook 호출 개수나 종류의 순서가 달라지면 오류를 발생시킵니다.

구현: [FunctionComponent.js](virtualDOM/FunctionComponent.js), [hooks.js](virtualDOM/hooks.js)

## useState · useEffect · useMemo

세 Hook은 `getHook()`으로 자신의 저장 공간을 찾습니다.
컴포넌트 함수가 다시 실행되어도 같은 호출 순서의 저장 공간을 사용하므로 상태와 계산 결과가 유지됩니다.

### useState — 상태 저장과 화면 갱신

현재 상태와 상태를 바꾸는 함수를 함께 반환합니다.
변경 함수에서는 전달받은 값 또는 이전 상태로 계산한 값을 저장합니다.

- 값이 같으면 추가 갱신을 생략합니다.
- 값이 달라지면 상태를 저장하고 `scheduleUpdate()`를 통해 `update()`가 실행되도록 합니다.
- 다음 렌더링에서는 `hooks`에 저장한 새 상태를 읽습니다.

### useEffect — 화면 반영 후 작업 실행

의존성이 바뀌었는지 확인하고, 실행할 함수를 저장합니다.

저장한 함수는 DOM 반영 후 `flushEffects()`에서 실행합니다.

- 의존성을 생략하면 매 렌더링 후 실행하고, 빈 배열이면 최초 마운트 후 실행합니다.
- 의존성 배열에 값이 있으면 해당 값이 달라질 때 다시 실행합니다.
- Effect가 반환한 정리 함수는 보관했다가 다음 실행 전이나 컴포넌트 종료 시 호출합니다.

### useMemo — 계산 결과 재사용

최초 실행이거나 의존성이 바뀌었을 때만 계산하고 결과를 저장합니다.

의존성이 같으면 저장한 결과를 그대로 반환합니다.
`useEffect`가 실행할 작업과 정리 함수를 관리한다면, `useMemo`는 렌더링 중 사용할 계산 결과를 관리합니다.
의존성의 각 값은 `Object.is()`로 비교하며, `withoutHooks()`는 콜백 안에서 Hook을 호출하지 못하게 합니다.

구현: [hooks.js](virtualDOM/hooks.js), [FunctionComponent.js](virtualDOM/FunctionComponent.js)

## 중점 포인트

### 브라우저에서 DOM을 다루는 방법

브라우저에서 DOM을 다룰 때는 **문서가 준비되는 시점**과 **화면을 표시할 위치**를 알아야 합니다.

- **Window**를 통해 HTML을 읽고 DOM 구성이 끝나는 시점을 확인합니다.
- **Document**를 통해 현재 문서에서 화면을 표시할 요소를 찾습니다.
- 찾은 요소에 새 DOM을 붙여 화면을 표시합니다.

#### 실제 DOM의 변경 감지

`MutationObserver`는 자식 노드 추가·삭제, 속성, 텍스트 변경을 관찰하는 브라우저 API입니다.
`childList`, `attributes`, `characterData`, `subtree` 등의 옵션으로 관찰 범위를 지정합니다.
입력창의 현재 `value` 같은 프로퍼티 변경은 DOM 속성 변경과 구분하고, 사용자 입력은 `input`·`change` 이벤트로 처리합니다.
API 설명: [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver).

현재 구현은 상태 변경을 출발점으로 Diff·Patch를 실행하며, `MutationObserver`를 사용하지 않습니다.
DOM 변경 감지와 다음 화면의 변경 사항을 계산하는 Diff는 서로 다른 역할입니다.

#### Reflow · Repaint와 DOM 갱신 비용

- **Reflow**: 요소의 크기와 위치를 다시 계산하는 작업입니다.
- **Repaint**: 글자나 색상 등을 화면에 다시 그리는 작업입니다.

DOM을 변경하면 이런 작업이 필요할 수 있습니다.
이 프로젝트는 기존 DOM을 재사용하고 달라진 부분만 수정해 불필요한 작업을 줄입니다.
렌더링 과정: [MDN — Critical rendering path](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path).
