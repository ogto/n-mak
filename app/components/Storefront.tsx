"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { MemberView, PublicKakaoConfig } from "../../lib/auth/types";
import type { StoreConfig } from "../../lib/stores";
import { KakaoAuthButton } from "./KakaoAuthButton";

const quickMenus = [
  { icon: "attendance", label: "출석체크", tone: "mint", section: "attendance" },
  { icon: "ticket", label: "내 쿠폰", tone: "coral", section: "coupons" },
  { icon: "points", label: "포인트", tone: "blue", section: "points" },
  { icon: "store", label: "매장정보", tone: "sand", section: "store" },
] as const;

type StorefrontProps = {
  store: StoreConfig;
  member: MemberView | null;
  kakao: PublicKakaoConfig;
};

export function Storefront({ store, member, kakao }: StorefrontProps) {
  const router = useRouter();
  const [promoOpen, setPromoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast, setToast] = useState("");
  const returnTo = `/s/${store.publicCode}`;

  useEffect(() => {
    if (!member || store.internalKey !== "a-fish-brothers") return;

    const storageKey = `promoSeen:${store.publicCode}:cold-noodle`;
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

    const messages: Record<string, string> = {
      success: "카카오 로그인이 완료됐어요.",
      consent_required: "아래 버튼을 눌러 카카오 로그인을 완료해 주세요.",
      failed: "로그인에 실패했어요. 다시 시도해 주세요.",
      invalid_state: "로그인에 실패했어요. 다시 시도해 주세요.",
      cancelled: "카카오 로그인이 취소됐어요.",
    };
    const message = messages[status] ?? "";
    const showTimer = message ? window.setTimeout(() => setToast(message), 0) : undefined;
    const hideTimer = message ? window.setTimeout(() => setToast(""), 2200) : undefined;
    url.searchParams.delete("auth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    return () => {
      if (showTimer) window.clearTimeout(showTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  const theme = {
    "--navy": store.theme.navy,
    "--deep": store.theme.navy,
    "--blue": store.theme.blue,
    "--aqua": store.theme.aqua,
    "--coral": store.theme.coral,
    "--cream": store.theme.cream,
  } as CSSProperties;

  const notify = (message: string, duration = 2200) => {
    setToast(message);
    window.setTimeout(() => setToast(""), duration);
  };

  const closePromo = () => {
    window.localStorage.setItem(`promoSeen:${store.publicCode}:cold-noodle`, String(Date.now()));
    setPromoOpen(false);
  };

  const quickDetail = (section: (typeof quickMenus)[number]["section"]) => {
    if (section === "attendance") return member ? `방문 ${member.visitCount}회` : "오늘 +100P";
    if (section === "coupons") return member ? `${member.couponCount}장 보유` : "로그인 필요";
    if (section === "points") return member ? `${member.pointsBalance.toLocaleString()}P` : "0P부터 시작";
    return "영업중";
  };

  const goToQuickMenu = (section: (typeof quickMenus)[number]["section"]) => {
    if (section !== "store" && !member) {
      setLoginOpen(true);
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
            onClick={() => member ? router.push(`/s/${store.publicCode}/game`) : setLoginOpen(true)}
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
            <KakaoAuthButton
              javascriptKey={kakao.javascriptKey}
              channelPublicId={kakao.channelPublicId}
              storeCode={store.publicCode}
              returnTo={returnTo}
              onError={notify}
            />
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
          <section className="game-modal promo-modal" role="dialog" aria-modal="true" aria-labelledby="promo-title">
            <div className="promo-image-wrap">
              <Image
                className="promo-image"
                src="/stores/fish-brothers/cold-noodle-promo.png"
                alt="전복에 빠진 냉 비빔물국수 신메뉴"
                width={1456}
                height={1086}
                priority
                unoptimized
              />
            </div>
            <div className="promo-body">
              <h2 id="promo-title">시원하고 칼칼한<br />여름 신메뉴</h2>
              <p>전복과 아삭한 채소를 푸짐하게 담은 냉 비빔물국수를 만나보세요.</p>
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
            <h2 id="auth-title">500P 받고 대어 잡으러 가요!</h2>
            <KakaoAuthButton
              javascriptKey={kakao.javascriptKey}
              channelPublicId={kakao.channelPublicId}
              storeCode={store.publicCode}
              returnTo={returnTo}
              onError={notify}
            />
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
