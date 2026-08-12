"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreConfig } from "../../lib/stores";

type GamePhase = "ready" | "casting" | "timing" | "catching" | "miss" | "result";

const SUCCESS_START = 18;
const SUCCESS_END = 82;
const GAUGE_CYCLE_MS = 2200;

type GameReward = {
  name: string;
  description: string;
  probability: number;
  tone: string;
  golden?: boolean;
};

const rewards: GameReward[] = [
  { name: "맛보기 해산물", description: "오늘의 해산물 한 접시", probability: 5, tone: "gold", golden: true },
  { name: "소주 1병", description: "테이블당 1회 사용 가능", probability: 10, tone: "mint" },
  { name: "맥주 1병", description: "테이블당 1회 사용 가능", probability: 10, tone: "blue" },
  { name: "음료 1캔", description: "원하는 탄산음료 1캔", probability: 15, tone: "coral" },
  { name: "500 포인트", description: "결제할 때 바로 사용 가능", probability: 20, tone: "navy" },
  { name: "300 포인트", description: "멤버십 포인트 즉시 적립", probability: 20, tone: "aqua" },
  { name: "모둠회 10% 할인", description: "5만원 이상 주문 시 사용", probability: 20, tone: "violet" },
];

function drawReward() {
  const roll = Math.random() * 100;
  let accumulated = 0;

  for (const reward of rewards) {
    accumulated += reward.probability;
    if (roll < accumulated) return reward;
  }

  return rewards[rewards.length - 1];
}

type FishingGameProps = {
  store: StoreConfig;
};

export function FishingGame({ store }: FishingGameProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [gauge, setGauge] = useState(0);
  const [reward, setReward] = useState<GameReward | null>(null);
  const [claimed, setClaimed] = useState(false);

  const theme = {
    "--navy": store.theme.navy,
    "--deep": store.theme.navy,
    "--blue": store.theme.blue,
    "--aqua": store.theme.aqua,
    "--coral": store.theme.coral,
    "--cream": store.theme.cream,
    "--gauge-position": `${gauge}%`,
  } as CSSProperties;

  useEffect(() => {
    if (phase !== "casting" && phase !== "catching") return;

    const timer = window.setTimeout(
      () => setPhase(phase === "casting" ? "timing" : "result"),
      phase === "casting" ? 1000 : 2000,
    );

    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "timing") return;

    let frame = 0;
    const startedAt = performance.now();
    const animateGauge = (now: number) => {
      const progress = ((now - startedAt) % GAUGE_CYCLE_MS) / GAUGE_CYCLE_MS;
      const position = progress < 0.5 ? progress * 200 : (1 - progress) * 200;
      setGauge(Math.round(position));
      frame = window.requestAnimationFrame(animateGauge);
    };

    frame = window.requestAnimationFrame(animateGauge);
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const handleStageTap = () => {
    if (phase === "ready") {
      setReward(null);
      setClaimed(false);
      setGauge(0);
      window.navigator.vibrate?.(15);
      setPhase("casting");
      return;
    }

    if (phase === "timing") {
      if (gauge >= SUCCESS_START && gauge <= SUCCESS_END) {
        setReward(drawReward());
        window.navigator.vibrate?.([35, 30, 70]);
        setPhase("catching");
      } else {
        window.navigator.vibrate?.(20);
        setPhase("miss");
      }
    }
  };

  const resetGame = () => {
    setReward(null);
    setClaimed(false);
    setGauge(0);
    setPhase("ready");
  };

  const phaseCopy: Record<GamePhase, { title: string; description: string }> = {
    ready: { title: "한 번 탭해서 던져요", description: "어디를 눌러도 낚싯줄이 힘차게 날아가요." },
    casting: { title: "낚싯줄 던지는 중!", description: "물고기가 있는 곳으로 날아가고 있어요." },
    timing: { title: "초록색에서 한 번 더!", description: "넓은 초록 구간에 바늘이 들어오면 탭하세요." },
    catching: { title: reward?.golden ? "황금 물고기다!" : "손맛이 왔어요!", description: "낚싯대가 휘었어요. 힘껏 끌어올리는 중!" },
    miss: { title: "앗, 살짝 빨랐어요", description: "초록 구간이 넓으니 천천히 다시 해보세요." },
    result: { title: reward?.golden ? "대박! 황금 물고기!" : "낚시 성공!", description: "오늘의 행운 보상을 확인해보세요." },
  };

  return (
    <main className={`app-shell fishing-shell fishing-phase-${phase}`} style={theme}>
      <section className={`fishing-stage phase-${phase}`}>
        <header className="fishing-header">
          <button onClick={() => router.push(`/s/${store.publicCode}`)} aria-label="홈으로 돌아가기">←</button>
          <div><strong>행운의 대어잡기</strong><span>{store.displayName} {store.branchName}</span></div>
          <span className="game-attempt">무료 도전</span>
        </header>

        <div className="fishing-copy" aria-live="polite">
          <h1>{phaseCopy[phase].title}</h1>
          <p>{phaseCopy[phase].description}</p>
          {(phase === "ready" || phase === "casting" || phase === "timing") && (
            <div className="game-steps" aria-label="게임 진행 단계">
              <span className={phase === "ready" || phase === "casting" ? "active" : "done"}><b>1</b> 던지기</span>
              <i aria-hidden="true" />
              <span className={phase === "timing" ? "active" : ""}><b>2</b> 낚아올리기</span>
            </div>
          )}
        </div>

        <span className="game-sun" aria-hidden="true" />
        <span className="game-cloud cloud-one" aria-hidden="true" />
        <span className="game-cloud cloud-two" aria-hidden="true" />
        <span className="distant-island" aria-hidden="true" />
        <span className="fishing-rod" aria-hidden="true"><i className="rod-flex" /></span>
        <span className="fishing-line" aria-hidden="true">
          <span className="line-cast-arc" />
          <b className="line-float" />
          <em className="line-sinker" />
          <i className="line-hook" />
          <span className="hook-ripple" />
          {phase === "timing" && <strong className="bite-alert">!</strong>}
          <span className="hook-splash" />
          {(phase === "catching" || phase === "result") && (
            <span className={`game-caught-fish ${reward?.golden ? "golden" : ""}`}>
              <i />
            </span>
          )}
        </span>
        <span className="cast-splash" aria-hidden="true" />
        <span className="game-boat" aria-hidden="true"><i /></span>
        <span className="boat-wake" aria-hidden="true" />
        <span className="ocean-wave wave-back" aria-hidden="true" />
        <span className="ocean-wave wave-front" aria-hidden="true" />
        {(phase === "timing" || phase === "catching") && (
          <span className="fish-shadow" aria-hidden="true"><i /></span>
        )}
        <span className="sea-bubbles bubbles-one" aria-hidden="true"><i /></span>
        <span className="sea-bubbles bubbles-two" aria-hidden="true"><i /></span>
        {phase === "miss" && <span className="miss-splash" aria-hidden="true">⌁</span>}

        <button
          className="game-tap-surface"
          onClick={handleStageTap}
          disabled={phase === "casting" || phase === "catching" || phase === "result" || phase === "miss"}
          aria-label={phase === "ready" ? "낚싯줄 던지기" : phase === "timing" ? "물고기 낚아 올리기" : undefined}
        >
          <span className="stage-action">
            {phase === "ready" && <><b>낚싯줄 던지기</b><small>화면 어디든 한 번 탭</small></>}
            {phase === "casting" && "낚싯줄 던지는 중…"}
            {phase === "timing" && <><b>지금 낚아 올리기!</b><small>초록색 안에서 한 번 탭</small></>}
            {phase === "catching" && "낚아 올리는 중…"}
          </span>
        </button>

        {(phase === "timing" || phase === "catching") && (
          <section className="fishing-gauge" aria-label={`낚시 타이밍 ${gauge}퍼센트`}>
            <div className="gauge-label"><strong>쉬운 타이밍</strong><span>초록색 안에서 탭</span></div>
            <div className="gauge-track">
              <span className="gauge-success" />
              <i className="gauge-needle" />
            </div>
          </section>
        )}

        {phase === "miss" && (
          <section className="game-result miss-result">
            <span className="reward-catch-mark miss-mark" aria-hidden="true">↻</span>
            <h2>바로 다시 해볼까요?</h2>
            <p>바늘이 넓은 초록색 안에 있을 때 탭하면 쉽게 잡을 수 있어요.</p>
            <button onClick={resetGame}>한 번 더 던지기</button>
          </section>
        )}

        {phase === "result" && reward && (
          <section className={`game-result reward-${reward.tone} ${reward.golden ? "golden-result" : ""}`}>
            <span className="reward-catch-mark" aria-hidden="true">{reward.golden ? "★" : "✓"}</span>
            <h2>{reward.name}</h2>
            <p>{reward.description}</p>
            <button onClick={() => setClaimed(true)} disabled={claimed}>{claimed ? "보상 저장 완료" : "보상 받기"}</button>
            <button className="game-retry" onClick={resetGame}>다시 해보기</button>
          </section>
        )}
      </section>
    </main>
  );
}
