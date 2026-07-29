export type StoreCoupon = {
  discount: string;
  title: string;
  description: string;
  due: string;
  color: "navy" | "coral";
};

export type StoreConfig = {
  id: string;
  internalKey: string;
  publicCode: string;
  displayName: string;
  branchName: string;
  tagline: string;
  logoSrc?: string;
  address: string;
  businessHours?: string;
  lastOrder?: string;
  closedDays?: string;
  kakaoChannelId: string;
  theme: {
    navy: string;
    blue: string;
    aqua: string;
    coral: string;
    cream: string;
  };
  game: {
    eyebrow: string;
    title: string;
    prize: string;
    artSrc?: string;
  };
  coupons: StoreCoupon[];
};

export const DEFAULT_STORE_CODE = "1xbHos";

// DB 연동 시 이 객체를 stores 테이블 조회로 교체합니다.
// publicCode에는 UNIQUE 인덱스를 적용하고 내부 매장 키는 외부에 노출하지 않습니다.
const storesByPublicCode: Record<string, StoreConfig> = {
  "1xbHos": {
    id: "store_fish_brothers_cheongju",
    internalKey: "a-fish-brothers",
    publicCode: "1xbHos",
    displayName: "어시장브라더스",
    branchName: "청주점",
    tagline: "바다를 가장 맛있게 즐기는 방법",
    logoSrc: "/stores/fish-brothers/logo.png",
    address: "충북 청주시 흥덕구 직지대로 551 A동 1층 116~120호",
    businessHours: "11:00 – 23:00",
    lastOrder: "22:00",
    closedDays: "연중무휴",
    kakaoChannelId: "_fish_brothers",
    theme: {
      navy: "#071b2b",
      blue: "#165aa8",
      aqua: "#63d6e8",
      coral: "#ff765f",
      cream: "#f5f6f2",
    },
    game: {
      eyebrow: "TODAY'S CATCH",
      title: "행운의\n대어잡기",
      prize: "모둠회 10% 할인",
      artSrc: "/stores/fish-brothers/fishing-game-banner.png",
    },
    coupons: [
      {
        discount: "10%",
        title: "모둠회 주문 시 할인",
        description: "5만원 이상 주문 시 사용 가능",
        due: "발급 후 7일 이내",
        color: "navy",
      },
      {
        discount: "서비스",
        title: "매운탕 무료 제공",
        description: "테이블당 1회 사용 가능",
        due: "발급 후 14일 이내",
        color: "coral",
      },
    ],
  },
  k8Pm2A: {
    id: "store_bread_bank",
    internalKey: "bread-bank",
    publicCode: "k8Pm2A",
    displayName: "빵장고",
    branchName: "은행점",
    tagline: "매일 갓 구운 행복을 저장하세요",
    address: "빵장고 은행점",
    kakaoChannelId: "_bread_bank",
    theme: {
      navy: "#3b2a20",
      blue: "#95673c",
      aqua: "#f4cc77",
      coral: "#e8814f",
      cream: "#faf5e9",
    },
    game: {
      eyebrow: "TODAY'S BAKE",
      title: "행운의\n빵 뽑기",
      prize: "오늘의 빵 1개 증정",
    },
    coupons: [
      {
        discount: "1+1",
        title: "소금빵 하나 더",
        description: "동일 제품 구매 시 사용 가능",
        due: "발급 후 7일 이내",
        color: "navy",
      },
      {
        discount: "2천원",
        title: "만원 이상 구매 할인",
        description: "다른 쿠폰과 중복 사용 불가",
        due: "발급 후 14일 이내",
        color: "coral",
      },
    ],
  },
};

export async function getStoreByPublicCode(publicCode: string) {
  return storesByPublicCode[publicCode] ?? null;
}
