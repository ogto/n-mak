"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreConfig } from "../../lib/stores";

type GamePhase = "ready" | "casting" | "timing" | "catching" | "miss" | "result";

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
      phase === "casting" ? 900 : 1600,
    );

    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "timing") return;

    let frame = 0;
    const startedAt = performance.now();
    const animateGauge = (now: number) => {
      const progress = ((now - startedAt) % 1400) / 1400;
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
      setPhase("casting");
      return;
    }

    if (phase === "timing") {
      if (gauge >= 34 && gauge <= 66) {
        setReward(drawReward());
        setPhase("catching");
      } else {
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
    ready: { title: "탭해서 낚싯줄 던지기", description: "물고기가 모이는 곳에 힘껏 던져보세요." },
    casting: { title: "캐스팅!", description: "낚싯줄이 물속으로 내려가고 있어요." },
    timing: { title: "지금 한 번 더 탭!", description: "움직이는 바늘이 초록 영역에 왔을 때 탭하세요." },
    catching: { title: reward?.golden ? "황금 물고기다!" : "입질이 왔어요!", description: "힘껏 낚아 올리는 중이에요." },
    miss: { title: "물고기가 도망갔어요", description: "타이밍을 맞춰 다시 도전해보세요." },
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
        </div>

        <span className="game-sun" aria-hidden="true" />
        <span className="game-cloud cloud-one" aria-hidden="true" />
        <span className="game-cloud cloud-two" aria-hidden="true" />
        <span className="distant-island" aria-hidden="true" />
        <span className="fishing-rod" aria-hidden="true" />
        <span className="fishing-line" aria-hidden="true">
          <b className="line-float" />
          <em className="line-sinker" />
          <i />
        </span>
        <span className="game-boat" aria-hidden="true"><i /></span>
        <span className="boat-wake" aria-hidden="true" />
        <span className="ocean-wave wave-back" aria-hidden="true" />
        <span className="ocean-wave wave-front" aria-hidden="true" />
        <span className="sea-bubbles bubbles-one" aria-hidden="true"><i /></span>
        <span className="sea-bubbles bubbles-two" aria-hidden="true"><i /></span>
        {(phase === "catching" || phase === "result") && (
          <span className={`game-caught-fish ${reward?.golden ? "golden" : ""}`} aria-hidden="true"><i /></span>
        )}
        {phase === "miss" && <span className="miss-splash" aria-hidden="true">⌁</span>}

        <button
          className="game-tap-surface"
          onClick={handleStageTap}
          disabled={phase === "casting" || phase === "catching" || phase === "result" || phase === "miss"}
          aria-label={phase === "ready" ? "낚싯줄 던지기" : phase === "timing" ? "물고기 낚아 올리기" : undefined}
        >
          <span className="stage-action">
            {phase === "ready" && "화면을 탭하세요"}
            {phase === "casting" && "낚싯줄 던지는 중…"}
            {phase === "timing" && "초록 영역에서 탭!"}
            {phase === "catching" && "낚아 올리는 중…"}
          </span>
        </button>

        {(phase === "timing" || phase === "catching") && (
          <section className="fishing-gauge" aria-label={`낚시 타이밍 ${gauge}퍼센트`}>
            <div className="gauge-label"><span>초록 영역을 노리세요</span></div>
            <div className="gauge-track">
              <span className="gauge-success" />
              <i className="gauge-needle" />
            </div>
          </section>
        )}

        {phase === "miss" && (
          <section className="game-result miss-result">
            <h2>조금만 더 정확하게!</h2>
            <p>바늘이 가운데 초록색 영역에 들어왔을 때 탭하면 물고기를 낚을 수 있어요.</p>
            <button onClick={resetGame}>다시 도전하기</button>
          </section>
        )}

        {phase === "result" && reward && (
          <section className={`game-result reward-${reward.tone} ${reward.golden ? "golden-result" : ""}`}>
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
