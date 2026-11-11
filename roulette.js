// roulette.js
import { h } from "./vdom.js";
import { FunctionComponent } from "./component.js";
import { useState, useMemo, useEffect } from "./hooks.js";

const COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#B983FF", "#FF9F45", "#00C2A8", "#F473B9"];
const SPIN_MS = 3000; // CSS의 transition 3s와 맞춤
const MAX_PEOPLE = 15; 


// ───────────── 자식 컴포넌트 (상태 없음, props만 사용) ─────────────

// 이름 입력 한 줄
function NameRow({ name, index, disabled, canRemove, onChange, onRemove }) {
  return h("li", { class: "name-row" },
    h("span", { class: "name-index" }, index + 1),
    h("input", {
      class: "name-input",
      value: name,
      placeholder: "이름 입력",
      disabled,
      onInput: (e) => onChange(index, e.target.value),   // 수정
    }),
    h("button", {
      class: "remove-btn",
      disabled: disabled || !canRemove,
      onClick: () => onRemove(index),                    // 삭제
    }, "✕")
  );
}

// 왼쪽: 참가자 목록
function NameList({ names, total, disabled, canAdd, onChange, onAdd, onRemove }) {
  return h("section", { class: "panel name-panel" },
    h("div", { class: "panel-header" },
      h("h2", null, "참가자"),
      h("span", { class: "total" }, "총 ", total, "명 / 최대 ", MAX_PEOPLE, "명")
    ),
    h("ul", { class: "name-list" },
      names.map((name, i) =>
        NameRow({ name, index: i, disabled, canRemove: names.length > 1, onChange, onRemove })
      )
    ),
    h("button", { class: "add-btn", disabled: disabled || !canAdd, onClick: onAdd },
      canAdd ? "+ 이름 칸 추가" : `최대 ${MAX_PEOPLE}명까지 가능해요`
    )
  );
}

// 오른쪽 위: 룰렛 판
function Wheel({ participants, rotation }) {
  const count = participants.length;
  const seg = count > 0 ? 360 / count : 0;   // 한 칸의 각도

  // 칸마다 색을 나눈 원판 배경 (conic-gradient는 위쪽 0도부터 시계 방향)
  const background = count === 0
    ? "#e5e7eb"
    : `conic-gradient(${participants
        .map((_, i) => `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
        .join(", ")})`;

  return h("div", { class: "wheel-wrap" },
    h("div", { class: "pointer" }),
    h("div", {
      class: "wheel",
      style: `background: ${background}; transform: rotate(${rotation}deg);`,
    },
      count === 0
        ? h("span", { class: "wheel-empty" }, "이름을 입력하세요")
        : participants.map((name, i) =>
            h("span", {
              class: "wheel-label",
              // 칸 가운데 각도로 돌린 뒤 바깥쪽으로 밀어서 배치
              style: `transform: translate(-50%, -50%) rotate(${(i + 0.5) * seg}deg) translateY(-95px);`,
            }, name)
          )
    )
  );
}

// 오른쪽 아래: 돌리기 버튼 + 결과
function Controls({ canSpin, spinning, winner, onSpin }) {
  let message;
  if (spinning) message = "두근두근...";
  else if (winner) message = ["🎉 당첨: ", h("strong", null, winner)];
  else if (canSpin) message = "돌리기를 눌러보세요";
  else message = "2명 이상 입력하세요";

  return h("div", { class: "controls" },
    h("button", { class: "spin-btn", disabled: !canSpin || spinning, onClick: onSpin },
      spinning ? "돌아가는 중..." : "돌리기"
    ),
    h("p", { class: "result" }, message)
  );
}


// ───────────── 루트 컴포넌트 (상태와 Hook은 여기에만) ─────────────

function App() {
  const [names, setNames] = useState(["", ""]);     // hooks[0] 입력칸 목록
  const [rotation, setRotation] = useState(0);      // hooks[1] 룰렛 회전 각도
  const [spinning, setSpinning] = useState(false);  // hooks[2] 돌아가는 중인지
  const [winner, setWinner] = useState(null);       // hooks[3] 당첨자

  // hooks[4] 빈칸을 뺀 실제 참가자 (names가 바뀔 때만 다시 계산)
  const participants = useMemo(
    () => names.map((n) => n.trim()).filter((n) => n !== ""),
    [names]
  );

  // hooks[5] 탭 제목에 인원수 표시 (인원수가 바뀔 때만)
  useEffect(() => {
    document.title = `랜덤 룰렛 (${participants.length}명)`;
  }, [participants.length]);

  // hooks[6] 돌리기 시작하면 3초 뒤 멈춤 처리
  useEffect(() => {
    if (!spinning) return;
    setTimeout(() => setSpinning(false), SPIN_MS);
  }, [spinning]);

  const canSpin = participants.length >= 2;

  // ── 이벤트 처리 (자식에게 props로 내려줌) ──
  const addName = () => {
    if (names.length >= MAX_PEOPLE) return;   // 최대 인원이면 추가 안 함
    setNames([...names, ""]);
  };

  const changeName = (index, value) => {
    setNames(names.map((n, i) => (i === index ? value : n)));
    setWinner(null);
  };

  const removeName = (index) => {
    setNames(names.filter((_, i) => i !== index));
    setWinner(null);
  };

  const spin = () => {
    if (!canSpin || spinning) return;

    const count = participants.length;
    const winnerIndex = Math.floor(Math.random() * count);
    const seg = 360 / count;

    const target = (winnerIndex + 0.5) * seg;
    const current = ((rotation % 360) + 360) % 360;
    const desired = (360 - target) % 360;
    const delta = (desired - current + 360) % 360;

    setSpinning(true);
    setRotation(rotation + 360 * 5 + delta);
    setWinner(participants[winnerIndex]);
  };

  return h("div", { class: "app" },
    h("h1", { class: "title" }, "🎯 랜덤 룰렛"),
    h("div", { class: "layout" },
      NameList({
        names,
        total: participants.length,
        disabled: spinning,
        canAdd: names.length < MAX_PEOPLE,   // 15칸 미만일 때만 추가 가능
        onChange: changeName,
        onAdd: addName,
        onRemove: removeName,
      }),
      h("section", { class: "panel wheel-panel" },
        Wheel({ participants, rotation }),
        Controls({ canSpin, spinning, winner, onSpin: spin })
      )
    )
  );
}

const app = new FunctionComponent(App);
app.mount(document.getElementById("app"));
window.app = app;