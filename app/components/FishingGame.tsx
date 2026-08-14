"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberView, PublicKakaoConfig } from "../../lib/auth/types";
import type { TodayGamePlayView } from "../../lib/membership";
import type { StoreConfig } from "../../lib/stores";
import { KakaoAuthButton } from "./KakaoAuthButton";

type GamePhase = "ready" | "casting" | "timing" | "catching" | "miss" | "result";

const SUCCESS_START = 18;
const SUCCESS_END = 82;
const GAUGE_CYCLE_MS = 2200;

type GameReward = {
  id: string;
  name: string;
  description: string;
  rewardType: "coupon" | "points";
  rewardValue: number | null;
  tone: string;
  golden: boolean;
};

type GamePlayResponse = {
  reward?: Omit<GameReward, "tone">;
  error?: string;
};

function rewardTone(reward: Omit<GameReward, "tone">) {
  if (reward.golden) return "gold";
  if (reward.rewardType === "points") return reward.rewardValue === 500 ? "navy" : "aqua";
  if (reward.name.includes("소주")) return "mint";
  if (reward.name.includes("맥주")) return "blue";
  if (reward.name.includes("음료")) return "coral";
  return "violet";
}

type FishingGameProps = {
  store: StoreConfig;
  member: MemberView | null;
  initialReward: TodayGamePlayView | null;
  kakao: PublicKakaoConfig;
};

export function FishingGame({ store, member, initialReward, kakao }: FishingGameProps) {
  const router = useRouter();
  const alreadyPlayedToday = Boolean(initialReward);
  const [phase, setPhase] = useState<GamePhase>(initialReward ? "result" : "ready");
  const [gauge, setGauge] = useState(0);
  const [reward, setReward] = useState<GameReward | null>(() => initialReward
    ? { ...initialReward, tone: rewardTone(initialReward) }
    : null);
  const [gameError, setGameError] = useState("");

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
    if (phase !== "casting" && !(phase === "catching" && reward)) return;

    const timer = window.setTimeout(
      () => setPhase(phase === "casting" ? "timing" : "result"),
      phase === "casting" ? 1000 : 2000,
    );

    return () => window.clearTimeout(timer);
  }, [phase, reward]);

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

  const issueReward = async () => {
    const response = await fetch("/api/game/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeCode: store.publicCode }),
    });
    const result = await response.json() as GamePlayResponse;

    if (!response.ok || !result.reward) {
      throw new Error(result.error ?? "게임 보상을 저장하지 못했습니다.");
    }

    setReward({ ...result.reward, tone: rewardTone(result.reward) });
  };

  const handleStageTap = async () => {
    if (!member || alreadyPlayedToday) return;

    if (phase === "ready") {
      setReward(null);
      setGameError("");
      setGauge(0);
      window.navigator.vibrate?.(15);
      setPhase("casting");
      return;
    }

    if (phase === "timing") {
      if (gauge >= SUCCESS_START && gauge <= SUCCESS_END) {
        window.navigator.vibrate?.([35, 30, 70]);
        setPhase("catching");
        try {
          await issueReward();
        } catch (error) {
          setGameError(error instanceof Error ? error.message : "게임 보상을 저장하지 못했습니다.");
          setPhase("miss");
        }
      } else {
        window.navigator.vibrate?.(20);
        setPhase("miss");
      }
    }
  };

  const resetGame = () => {
    setReward(null);
    setGameError("");
    setGauge(0);
    setPhase("ready");
  };

  const phaseCopy: Record<GamePhase, { title: string; description: string }> = {
    ready: { title: "한 번 탭해서 던져요", description: "어디를 눌러도 낚싯줄이 힘차게 날아가요." },
    casting: { title: "낚싯줄 던지는 중!", description: "물고기가 있는 곳으로 날아가고 있어요." },
    timing: { title: "초록색에서 한 번 더!", description: "넓은 초록 구간에 바늘이 들어오면 탭하세요." },
    catching: { title: reward?.golden ? "황금 물고기다!" : "손맛이 왔어요!", description: "낚싯대가 휘었어요. 힘껏 끌어올리는 중!" },
    miss: gameError
      ? { title: "보상을 확인하지 못했어요", description: gameError }
      : { title: "앗, 살짝 빨랐어요", description: "초록 구간이 넓으니 천천히 다시 해보세요." },
    result: {
      title: alreadyPlayedToday ? "오늘 참여 완료" : reward?.golden ? "대박! 황금 물고기!" : "낚시 성공!",
      description: alreadyPlayedToday ? "내일 다시 새로운 행운을 낚아보세요." : "오늘의 행운 보상을 확인해보세요.",
    },
  };

  return (
    <main className={`app-shell fishing-shell fishing-phase-${phase}`} style={theme}>
      <section className={`fishing-stage phase-${phase}`}>
        <header className="fishing-header">
          <button onClick={() => router.push(`/s/${store.publicCode}`)} aria-label="홈으로 돌아가기">←</button>
          <div><strong>행운의 대어잡기</strong><span>{store.displayName} {store.branchName}</span></div>
          <span className="game-attempt">{alreadyPlayedToday ? "참여 완료" : "오늘 1회"}</span>
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
          disabled={!member || phase === "casting" || phase === "catching" || phase === "result" || phase === "miss"}
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
            <h2>{gameError ? "로그인 상태를 확인해 주세요" : "바로 다시 해볼까요?"}</h2>
            <p>{gameError || "바늘이 넓은 초록색 안에 있을 때 탭하면 쉽게 잡을 수 있어요."}</p>
            <button onClick={gameError ? () => router.push(`/s/${store.publicCode}`) : resetGame}>
              {gameError ? "홈으로 돌아가기" : "한 번 더 던지기"}
            </button>
          </section>
        )}

        {phase === "result" && reward && (
          <section className={`game-result reward-${reward.tone} ${reward.golden ? "golden-result" : ""}`}>
            <span className="reward-catch-mark" aria-hidden="true">{reward.golden ? "★" : "✓"}</span>
            <h2>{reward.name}</h2>
            <p>{reward.description}</p>
            <button onClick={() => router.push(`/s/${store.publicCode}/${reward.rewardType === "coupon" ? "coupons" : "points"}`)}>
              {reward.rewardType === "coupon" ? "내 쿠폰함 확인" : "적립 포인트 확인"}
            </button>
            <button className="game-retry" onClick={() => router.push(`/s/${store.publicCode}`)}>홈으로 돌아가기</button>
          </section>
        )}

        {!member && (
          <section className="game-login-gate" role="dialog" aria-modal="true" aria-labelledby="game-login-title">
            <h2 id="game-login-title">카카오 로그인 후 참여해요</h2>
            <p>가입 즉시 500P를 받고, 오늘의 낚시 보상도 내 쿠폰함에 바로 저장돼요.</p>
            <KakaoAuthButton
              javascriptKey={kakao.javascriptKey}
              channelPublicId={kakao.channelPublicId}
              storeCode={store.publicCode}
              returnTo={`/s/${store.publicCode}/game`}
            />
            <button className="game-login-home" onClick={() => router.push(`/s/${store.publicCode}`)}>
              홈으로 돌아가기
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
