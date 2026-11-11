// component.js
import { createElement } from "./vdom.js";
import { diff } from "./diff.js";
import { patch } from "./patch.js";

let currentComponent = null;

export function getCurrentComponent() {
  return currentComponent;
}

export class FunctionComponent {

  constructor(fn, props = {}) {
    this.fn = fn;
    this.props = props;
    this.hooks = [];
    this.hookIndex = 0;
    this.container = null;
    this.vnode = null;
    this.dom = null;
    this.pendingEffects = [];   // [5단계] 화면 그린 뒤 실행할 useEffect 작업 목록
  }

  render() {
    this.hookIndex = 0;
    this.pendingEffects = [];   // [5단계] 이번 렌더링의 목록을 비우고 시작
    currentComponent = this;
    const vnode = this.fn(this.props);
    currentComponent = null;
    return vnode;
  }

  mount(container) {
    this.container = container;
    this.vnode = this.render();
    this.dom = createElement(this.vnode);
    container.innerHTML = "";
    container.appendChild(this.dom);
    this.runEffects();          // [5단계] 화면에 붙인 뒤 useEffect 실행
  }

  update() {
    const newVNode = this.render();
    const patches = diff(this.vnode, newVNode);
    console.log("update 변경 목록:", patches);
    patch(this.dom, patches);
    this.dom = this.container.firstChild;
    this.vnode = newVNode;
    this.runEffects();          // [5단계] patch 끝난 뒤 useEffect 실행
  }

  // [5단계] 모아둔 useEffect 작업들을 차례로 실행
  runEffects() {
    const effects = this.pendingEffects;
    this.pendingEffects = [];   // 실행 중에 setState로 다시 그려져도 섞이지 않게 먼저 비움
    effects.forEach((effect) => effect());
  }
}