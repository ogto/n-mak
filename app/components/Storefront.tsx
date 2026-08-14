"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import type { MemberView, PublicKakaoConfig } from "../../lib/auth/types";
import type { StoreConfig } from "../../lib/stores";
import { KakaoAuthButton } from "./KakaoAuthButton";
import { KakaoChannelButton } from "./KakaoChannelButton";

const quickMenus = [
  { icon: "attendance", label: "출석체크", tone: "mint", section: "attendance" },
  { icon: "ticket", label: "내 쿠폰", tone: "coral", section: "coupons" },
  { icon: "points", label: "포인트", tone: "blue", section: "points" },
  { icon: "store", label: "매장정보", tone: "sand", section: "store" },
] as const;

type StorefrontProps = {
  store: StoreConfig;
  member: MemberView | null;
  hasPendingKakaoSignup: boolean;
  kakao: PublicKakaoConfig;
};

type AuthStage = "login" | "channel" | "retry";

type ChannelVerifyResponse = {
  ok?: boolean;
  status?: string;
  returnTo?: string;
};

function safeStoreReturnTo(value: string | null | undefined, storeCode: string) {
  const fallback = `/s/${storeCode}`;
  if (!value?.startsWith(fallback) || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "https://n-mak.invalid");
    if (url.origin !== "https://n-mak.invalid") return fallback;
    if (url.pathname !== fallback && !url.pathname.startsWith(`${fallback}/`)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function Storefront({
  store,
  member,
  hasPendingKakaoSignup,
  kakao,
}: StorefrontProps) {
  const router = useRouter();
  const returnTo = `/s/${store.publicCode}`;
  const initiallyPending = hasPendingKakaoSignup && !member;
  const [promoOpen, setPromoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(initiallyPending);
  const [authStage, setAuthStage] = useState<AuthStage>(initiallyPending ? "channel" : "login");
  const [authMessage, setAuthMessage] = useState("");
  const [channelChecking, setChannelChecking] = useState(false);
  const [pendingChannel, setPendingChannel] = useState(initiallyPending);
  const [loginReturnTo, setLoginReturnTo] = useState(returnTo);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string, duration = 2200) => {
    setToast(message);
    window.setTimeout(() => setToast(""), duration);
  }, []);

  useEffect(() => {
    if (!member || store.internalKey !== "a-fish-brothers") return;

    const storageKey = `promoSeen:${store.publicCode}:shrimp-salt-grill`;
    const seenAt = Number(window.localStorage.getItem(storageKey) ?? 0);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (seenAt > 0 && Date.now() - seenAt < sevenDays) return;

    const timer = window.setTimeout(() => setPromoOpen(true), 550);
    return () => window.clearTimeout(timer);
  }, [member, store.internalKey, store.publicCode]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("auth");
    if (!status) return;

    const nextReturnTo = safeStoreReturnTo(
      url.searchParams.get("next"),
      store.publicCode,
    );

    const messages: Record<string, string> = {
      success: "카카오 로그인이 완료됐어요.",
      cancelled: "카카오 로그인이 취소됐어요.",
    };
    const message = messages[status] ?? "";
    let hideTimer: number | undefined;
    const applyStatusTimer = window.setTimeout(() => {
      setLoginReturnTo(nextReturnTo);
      if (message) {
        setToast(message);
        hideTimer = window.setTimeout(() => setToast(""), 2200);
      }

      if (status === "channel_required" || status === "channel_check_failed") {
        setPendingChannel(true);
        setAuthStage("channel");
        setAuthMessage(
          status === "channel_check_failed"
            ? "친구 추가 후 아래 버튼을 눌러 500P를 받아보세요."
            : "",
        );
        setLoginOpen(true);
      } else if (status === "rate_limited") {
        setPendingChannel(false);
        setAuthStage("retry");
        setAuthMessage("잠시 후 다시 시작하면 바로 이어갈 수 있어요.");
        setLoginOpen(true);
      } else if (status === "failed" || status === "invalid_state") {
        setPendingChannel(false);
        setAuthStage("retry");
        setAuthMessage("한 번 더 눌러 가입을 이어가 주세요.");
        setLoginOpen(true);
      } else if (status === "consent_required") {
        setAuthStage("login");
        setAuthMessage("");
        setLoginOpen(true);
      }
    }, 0);

    url.searchParams.delete("auth");
    url.searchParams.delete("next");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    return () => {
      window.clearTimeout(applyStatusTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [store.publicCode]);

  const theme = {
    "--navy": store.theme.navy,
    "--deep": store.theme.navy,
    "--blue": store.theme.blue,
    "--aqua": store.theme.aqua,
    "--coral": store.theme.coral,
    "--cream": store.theme.cream,
  } as CSSProperties;

  const closePromo = () => {
    window.localStorage.setItem(`promoSeen:${store.publicCode}:shrimp-salt-grill`, String(Date.now()));
    setPromoOpen(false);
  };

  const openLogin = (destination = returnTo) => {
    setLoginReturnTo(safeStoreReturnTo(destination, store.publicCode));
    setAuthMessage("");
    setAuthStage(pendingChannel ? "channel" : "login");
    setLoginOpen(true);
  };

  const verifyChannel = useCallback(async () => {
    if (channelChecking) return;

    setChannelChecking(true);
    setAuthMessage("");

    try {
      const response = await fetch("/api/auth/kakao/channel/verify", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json() as ChannelVerifyResponse;

      if (response.ok && result.ok) {
        setPendingChannel(false);
        setLoginOpen(false);
        notify("500P가 지급됐어요!", 2600);
        window.location.assign(
          safeStoreReturnTo(result.returnTo ?? loginReturnTo, store.publicCode),
        );
        return;
      }

      if (result.status === "channel_required") {
        setAuthMessage("친구 추가를 완료한 뒤 다시 확인해 주세요.");
        return;
      }

      if (result.status === "expired") {
        setPendingChannel(false);
        setAuthStage("retry");
        setAuthMessage("가입을 다시 시작하면 500P를 바로 받을 수 있어요.");
        return;
      }

      setAuthMessage("잠시 후 다시 확인해 주세요.");
    } catch {
      setAuthMessage("연결이 잠시 불안정해요. 다시 확인해 주세요.");
    } finally {
      setChannelChecking(false);
    }
  }, [channelChecking, loginReturnTo, notify, store.publicCode]);

  const quickDetail = (section: (typeof quickMenus)[number]["section"]) => {
    if (section === "attendance") return member ? `방문 ${member.visitCount}회` : "오늘 +100P";
    if (section === "coupons") return member ? `${member.couponCount}장 보유` : "로그인 필요";
    if (section === "points") return member ? `${member.pointsBalance.toLocaleString()}P` : "0P부터 시작";
    return "영업중";
  };

  const goToQuickMenu = (section: (typeof quickMenus)[number]["section"]) => {
    if (section !== "store" && !member) {
      openLogin(`/s/${store.publicCode}/${section}`);
      return;
    }
    router.push(`/s/${store.publicCode}/${section}`);
  };

  return (
    <main className="app-shell" style={theme} data-store-code={store.publicCode}>
      <section className="hero" id="home">
        <div className="hero-glow" aria-hidden="true" />
        <header className="topbar">
          <div className="brand">
            {store.logoSrc ? (
              <span className="brand-logo-box">
                <Image
                  className="brand-logo"
                  src={store.logoSrc}
                  alt={`${store.displayName} 로고`}
                  width={600}
                  height={260}
                  unoptimized
                />
              </span>
            ) : (
              <span className="brand-wordmark">{store.displayName}</span>
            )}
            <div className="branch-copy">
              <strong>{store.branchName}</strong>
              <span>{store.tagline}</span>
            </div>
          </div>
        </header>

        <div className="welcome">
          <div className="welcome-copy">
            <h1>
              오늘의 행운을
              <br />
              <em>잡아보세요!</em>
            </h1>
            <p>오늘 매장을 방문한 고객님만을 위한 특별한 혜택이에요.</p>
          </div>

          <button
            className="game-card"
            onClick={() => member
              ? router.push(`/s/${store.publicCode}/game`)
              : openLogin(`/s/${store.publicCode}/game`)}
          >
            {store.game.artSrc ? (
              <Image
                className="game-art"
                src={store.game.artSrc}
                alt=""
                aria-hidden="true"
                width={760}
                height={560}
                unoptimized
              />
            ) : null}
            <span className="game-label">오늘의 게임</span>
            <span className="game-title">
              {store.game.title.split("\n").map((line) => <span key={line}>{line}</span>)}
            </span>
            <span className="game-cta">도전하기 <b>→</b></span>
          </button>
        </div>
      </section>

      <section className="content">
        {member ? (
          <div className="member-card">
            <div>
              <strong>
                {member.nickname ? `${member.nickname}님, 반가워요!` : "카카오 가입을 마무리해 주세요"}
              </strong>
              {!member.nickname && (
                <div className="member-onboarding-prompt">
                  <KakaoAuthButton
                    javascriptKey={kakao.javascriptKey}
                    channelPublicId={kakao.channelPublicId}
                    storeCode={store.publicCode}
                    returnTo={returnTo}
                    onError={notify}
                  />
                </div>
              )}
            </div>
            <div className="points">
              <span>나의 포인트</span>
              <b>{member.pointsBalance.toLocaleString()} <small>P</small></b>
            </div>
            <div className="progress" aria-label="다음 등급 진행률">
              <span style={{ width: `${Math.min(100, member.lifetimePoints / 40)}%` }} />
            </div>
            <p>방문 {member.visitCount}회 · 적립 포인트는 매장에서 바로 사용할 수 있어요.</p>
            {member.channelFriendStatus === "blocked" ? (
              <div className="member-channel-row">
                <div>
                  <strong>카카오톡 채널 수신이 차단되어 있어요</strong>
                  <span>카카오톡 채널에서 차단을 해제하면 신메뉴와 쿠폰 소식을 받을 수 있어요.</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="member-card member-card-guest">
            <div>
              <strong>지금 카톡 친구 추가하고 500P 받자!</strong>
              <p>가입 혜택 챙기고 행운의 대어까지 낚아보세요.</p>
            </div>
            {pendingChannel ? (
              <button
                type="button"
                className="member-channel-add member-signup-resume"
                onClick={() => openLogin(loginReturnTo)}
              >
                500P 받기
              </button>
            ) : (
              <KakaoAuthButton
                javascriptKey={kakao.javascriptKey}
                channelPublicId={kakao.channelPublicId}
                storeCode={store.publicCode}
                returnTo={returnTo}
                onError={notify}
              />
            )}
          </div>
        )}

        <div className="quick-grid" aria-label="빠른 메뉴">
          {quickMenus.map((menu) => (
            <button className="quick-item" key={menu.label} onClick={() => goToQuickMenu(menu.section)}>
              <span className={`quick-icon ${menu.tone}`}>
                <span className={`menu-icon ${menu.icon}`} aria-hidden="true" />
              </span>
              <strong>{menu.label}</strong>
              <small>{quickDetail(menu.section)}</small>
            </button>
          ))}
        </div>

      </section>

      {promoOpen && (
        <div className="modal-backdrop promo-backdrop">
          <section className="game-modal promo-modal" role="dialog" aria-modal="true" aria-label="대하 소금구이 신메뉴 안내">
            <div className="promo-image-wrap">
              <Image
                className="promo-image"
                src="/stores/fish-brothers/shrimp-promo.webp"
                alt="탱글탱글 신선한 대하 소금구이 개시"
                width={1200}
                height={1700}
                priority
                unoptimized
              />
            </div>
            <div className="promo-body">
              <button className="primary-button" onClick={closePromo}>확인</button>
            </div>
          </section>
        </div>
      )}

      {loginOpen && (
        <div className="modal-backdrop auth-backdrop" onClick={() => setLoginOpen(false)}>
          <section
            className="game-modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="auth-close" onClick={() => setLoginOpen(false)} aria-label="닫기">×</button>
            {authStage === "channel" ? (
              <>
                <h2 id="auth-title">친구 추가하고 500P 받기</h2>
                <p>친구 추가가 완료되면 포인트와 낚시 게임이 바로 열려요.</p>
                <div className="auth-channel-actions">
                  <KakaoChannelButton
                    javascriptKey={kakao.javascriptKey}
                    channelPublicId={kakao.channelPublicId}
                    onReturn={verifyChannel}
                    onError={notify}
                  />
                  <button
                    type="button"
                    className="member-channel-sync auth-channel-verify"
                    disabled={channelChecking}
                    aria-busy={channelChecking}
                    onClick={() => void verifyChannel()}
                  >
                    {channelChecking ? "확인 중..." : "추가 완료했어요"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="auth-title">
                  {authStage === "retry" ? "500P 받으러 다시 시작해요" : "500P 받고 대어 잡으러 가요!"}
                </h2>
                <KakaoAuthButton
                  javascriptKey={kakao.javascriptKey}
                  channelPublicId={kakao.channelPublicId}
                  storeCode={store.publicCode}
                  returnTo={loginReturnTo}
                  onError={notify}
                />
              </>
            )}
            {authMessage ? <p className="auth-message" role="status">{authMessage}</p> : null}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
