"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import type { StoreConfig } from "../../lib/stores";

const quickMenus = [
  { icon: "attendance", label: "출석체크", detail: "오늘 +100P", tone: "mint" },
  { icon: "ticket", label: "내 쿠폰", detail: "3장 보유", tone: "coral", target: "coupons" },
  { icon: "points", label: "포인트", detail: "2,450P", tone: "blue" },
  { icon: "store", label: "매장정보", detail: "영업중", tone: "sand" },
];

type StorefrontProps = {
  store: StoreConfig;
};

export function Storefront({ store }: StorefrontProps) {
  const [gameOpen, setGameOpen] = useState(false);
  const [won, setWon] = useState(false);
  const [toast, setToast] = useState("");

  const theme = {
    "--navy": store.theme.navy,
    "--deep": store.theme.navy,
    "--blue": store.theme.blue,
    "--aqua": store.theme.aqua,
    "--coral": store.theme.coral,
    "--cream": store.theme.cream,
  } as CSSProperties;

  const notify = (message: string, duration = 1800) => {
    setToast(message);
    window.setTimeout(() => setToast(""), duration);
  };

  const playGame = () => {
    setGameOpen(true);
    setWon(false);
  };

  const saveCoupon = () => {
    setGameOpen(false);
    notify("쿠폰함에 저장했어요!", 2200);
  };

  return (
    <main className="app-shell" style={theme} data-store-code={store.publicCode}>
      <section className="hero" id="home">
        <div className="hero-glow" aria-hidden="true" />
        <header className="topbar">
          <div className="brand">
            {store.logoSrc ? (
              <span className="brand-logo-box">
                <img className="brand-logo" src={store.logoSrc} alt={`${store.displayName} 로고`} />
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
            <span className="eyebrow">WELCOME</span>
            <h1>
              오늘의 행운을
              <br />
              <em>잡아보세요!</em>
            </h1>
            <p>오늘 매장을 방문한 고객님만을 위한 특별한 혜택이에요.</p>
          </div>

          <button className="game-card" onClick={playGame}>
            {store.game.artSrc ? (
              <img className="game-art" src={store.game.artSrc} alt="" aria-hidden="true" />
            ) : null}
            <span className="game-label">오늘의 게임</span>
            <span className="game-title">
              {store.game.title.split("\n").map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
            <span className="game-cta">도전하기 <b>→</b></span>
          </button>
        </div>
      </section>

      <section className="content">
        <div className="member-card">
          <div>
            <span className="member-tier">BLUE MEMBER</span>
            <strong>이번 달 2번째 방문이에요</strong>
          </div>
          <div className="points">
            <span>나의 포인트</span>
            <b>2,450 <small>P</small></b>
          </div>
          <div className="progress" aria-label="다음 등급까지 55퍼센트">
            <span style={{ width: "55%" }} />
          </div>
          <p>1,550P 더 모으면 <b>Silver</b> 등급!</p>
        </div>

        <div className="quick-grid" aria-label="빠른 메뉴">
          {quickMenus.map((menu) => (
            <button
              className="quick-item"
              key={menu.label}
              onClick={() => {
                if (menu.target) {
                  document.getElementById(menu.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                notify(`${menu.label} 메뉴를 준비 중이에요.`);
              }}
            >
              <span className={`quick-icon ${menu.tone}`}>
                <span className={`menu-icon ${menu.icon}`} aria-hidden="true" />
              </span>
              <strong>{menu.label}</strong>
              <small>{menu.detail}</small>
            </button>
          ))}
        </div>

        <div className="tablet-grid">
          <section className="coupon-section" id="coupons">
            <div className="section-heading">
              <div>
                <span>MY COUPONS</span>
                <h2>내 쿠폰함</h2>
              </div>
              <button onClick={() => notify("전체 쿠폰함을 준비 중이에요.")}>전체보기</button>
            </div>
            <div className="coupon-list">
              {store.coupons.map((coupon) => (
                <article className="coupon" key={coupon.title}>
                  <div className={`coupon-badge ${coupon.color}`}>
                    <b>{coupon.discount}</b>
                    <span>COUPON</span>
                  </div>
                  <div className="coupon-copy">
                    <strong>{coupon.title}</strong>
                    <p>{coupon.description}</p>
                    <span>{coupon.due}</span>
                  </div>
                  <button className="download" aria-label={`${coupon.title} 쿠폰 받기`} onClick={() => notify("쿠폰을 받았어요!")}>
                    ↓
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="channel-card" id="channel">
            <div className="kakao-symbol" aria-hidden="true">talk</div>
            <div>
              <span>{store.displayName} 소식 받기</span>
              <h2>친구만 받는<br />신선한 혜택</h2>
              <p>신메뉴와 깜짝 쿠폰을 카톡으로 보내드려요.</p>
            </div>
            <button onClick={() => notify(`${store.displayName} 카카오톡 채널로 연결해요.`, 2000)}>
              카카오톡 채널 추가
            </button>
          </section>
        </div>
      </section>

      {gameOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setGameOpen(false)}>
          <section
            className="game-modal"
            role="dialog"
            aria-modal="true"
            aria-label={store.game.title.replace("\n", " ")}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setGameOpen(false)} aria-label="닫기">×</button>
            {!won ? (
              <>
                <span className="modal-eyebrow">{store.game.eyebrow}</span>
                <h2>오늘의 행운은<br />어떤 물고기일까요?</h2>
                <div className="catch-scene" aria-hidden="true">
                  <span className="hook">J</span>
                  <span className="caught-fish">◆</span>
                </div>
                <p>화면을 눌러 행운을 낚아보세요!</p>
                <button className="primary-button" onClick={() => setWon(true)}>지금 낚기</button>
              </>
            ) : (
              <>
                <span className="modal-eyebrow">CONGRATULATIONS!</span>
                <h2>신선한 행운을<br />낚았어요!</h2>
                <div className="prize">
                  <span>오늘의 당첨 쿠폰</span>
                  <b>{store.game.prize}</b>
                  <small>오늘부터 7일간 사용 가능</small>
                </div>
                <button className="primary-button" onClick={saveCoupon}>쿠폰함에 저장하기</button>
              </>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
