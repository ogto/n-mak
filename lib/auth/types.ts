export type MemberView = {
  id: string;
  nickname: string | null;
  profileImageUrl: string | null;
  channelFriendStatus: "unknown" | "added" | "not_added" | "blocked";
  tier: string;
  pointsBalance: number;
  lifetimePoints: number;
  visitCount: number;
};

export type PublicKakaoConfig = {
  javascriptKey: string;
  channelPublicId: string;
};
