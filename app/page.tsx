"use client";

import { useState } from "react";

const quickMenus = [
  { icon: "◷", label: "출석체크", detail: "오늘 +100P", tone: "mint" },
  { icon: "％", label: "내 쿠폰", detail: "3장 보유", tone: "coral" },
  { icon: "P", label: "포인트", detail: "2,450P", tone: "blue" },
  { icon: "⌁", label: "매장정보", detail: "영업중", tone: "sand" },
];

const coupons = [
  {
    discount: "10%",
    title: "모둠회 주문 시 할인",
    description: "5만원 이상 주문 시 사용 가능",
    due: "8월 31일까지",
    color: "navy",
  },
  {
    discount: "서비스",
    title: "매운탕 무료 제공",
    description: "테이블당 1회 사용 가능",
    due: "9월 15일까지",
    color: "coral",
  },
];

export default function Home() {
  const [gameOpen, setGameOpen] = useState(false);
  const [won, setWon] = useState(false);
  const [toast, setToast] = useState("");

  const playGame = () => {
    setGameOpen(true);
    setWon(false);
  };

  const revealPrize = () => {
    setWon(true);
  };

  const saveCoupon = () => {
    setGameOpen(false);
    setToast("쿠폰함에 저장했어요!");
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <main className="app-shell">
      <section className="hero" id="home">
        <div className="hero-glow" aria-hidden="true" />
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <div>
              <strong>파도상회</strong>
              <span>오늘 바다, 오늘 한 접시</span>
            </div>
          </div>
          <button className="icon-button" aria-label="알림">
            <span className="bell" aria-hidden="true" />
            <b />
          </button>
        </header>

        <div className="welcome">
          <div className="welcome-copy">
            <span className="eyebrow">WELCOME, 민지님</span>
            <h1>
              바다의 행운을
              <br />
              <em>낚아보세요!</em>
            </h1>
            <p>오늘 방문한 고객님만 참여할 수 있어요.</p>
          </div>

          <button className="game-card" onClick={playGame}>
            <span className="game-label">오늘의 게임</span>
            <span className="game-title">행운의<br />파도잡기</span>
            <span className="game-cta">도전하기 <b>→</b></span>
            <span className="sun" aria-hidden="true" />
            <span className="wave wave-one" aria-hidden="true" />
            <span className="wave wave-two" aria-hidden="true" />
            <span className="fish" aria-hidden="true">●</span>
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
                setToast(`${menu.label} 메뉴를 준비 중이에요.`);
                window.setTimeout(() => setToast(""), 1800);
              }}
            >
              <span className={`quick-icon ${menu.tone}`}>{menu.icon}</span>
              <strong>{menu.label}</strong>
              <small>{menu.detail}</small>
            </button>
          ))}
        </div>

        <div className="tablet-grid">
          <section className="coupon-section" id="coupons">
            <div className="section-heading">
              <div>
                <span>FOR YOU</span>
                <h2>지금 쓸 수 있는 혜택</h2>
              </div>
              <button>전체보기</button>
            </div>
            <div className="coupon-list">
              {coupons.map((coupon) => (
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
                  <button
                    className="download"
                    aria-label={`${coupon.title} 쿠폰 받기`}
                    onClick={() => {
                      setToast("쿠폰을 받았어요!");
                      window.setTimeout(() => setToast(""), 1800);
                    }}
                  >
                    ↓
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="channel-card" id="channel">
            <div className="kakao-symbol" aria-hidden="true">talk</div>
            <div>
              <span>파도상회 소식 받기</span>
              <h2>친구만 받는<br />싱싱한 혜택</h2>
              <p>신메뉴와 깜짝 쿠폰을 카톡으로 보내드려요.</p>
            </div>
            <button
              onClick={() => {
                setToast("카카오톡 채널 연결 화면으로 이동해요.");
                window.setTimeout(() => setToast(""), 2000);
              }}
            >
              카카오톡 채널 추가
            </button>
          </section>
        </div>

        <p className="footer-note">파도상회 · 부산광역시 해운대구 바다로 27</p>
      </section>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <a className="active" href="#home"><span>⌂</span>홈</a>
        <a href="#coupons"><span>％</span>혜택</a>
        <button onClick={playGame} aria-label="게임 열기"><span className="nav-game">✦</span>게임</button>
        <a href="#channel"><span>◌</span>소식</a>
        <button onClick={() => setToast("마이페이지를 준비 중이에요.")}><span>○</span>MY</button>
      </nav>

      {gameOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setGameOpen(false)}>
          <section
            className="game-modal"
            role="dialog"
            aria-modal="true"
            aria-label="행운의 파도잡기"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setGameOpen(false)} aria-label="닫기">×</button>
            {!won ? (
              <>
                <span className="modal-eyebrow">TODAY&apos;S CATCH</span>
                <h2>오늘의 행운은<br />어떤 물고기일까요?</h2>
                <div className="catch-scene" aria-hidden="true">
                  <span className="hook">J</span>
                  <span className="caught-fish">◆</span>
                </div>
                <p>화면을 눌러 행운을 낚아보세요!</p>
                <button className="primary-button" onClick={revealPrize}>지금 낚기</button>
              </>
            ) : (
              <>
                <span className="modal-eyebrow">CONGRATULATIONS!</span>
                <h2>싱싱한 행운을<br />낚았어요!</h2>
                <div className="prize">
                  <span>오늘의 당첨 쿠폰</span>
                  <b>모둠회 10% 할인</b>
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
