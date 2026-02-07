const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  network: [
    /网络/i,
    /network/i,
    /超时/i,
    /timeout/i,
    /连接/i,
    /connection/i,
    /断开/i,
    /disconnect/i,
    /dns/i,
    /ip/i,
    /socket/i,
  ],
  billing: [
    /余额/i,
    /balance/i,
    /付费/i,
    /payment/i,
    /欠费/i,
    /overdue/i,
    /订阅/i,
    /subscription/i,
    /充值/i,
    /recharge/i,
    /套餐/i,
    /plan/i,
  ],
  device: [
    /设备/i,
    /device/i,
    /离线/i,
    /offline/i,
    /重启/i,
    /restart/i,
    /固件/i,
    /firmware/i,
    /硬件/i,
    /hardware/i,
    /摄像/i,
    /camera/i,
  ],
  authentication: [
    /登录/i,
    /login/i,
    /密码/i,
    /password/i,
    /验证/i,
    /verify/i,
    /认证/i,
    /auth/i,
    /token/i,
    /权限/i,
    /permission/i,
  ],
  streaming: [
    /流媒体/i,
    /stream/i,
    /播放/i,
    /play/i,
    /视频/i,
    /video/i,
    /直播/i,
    /live/i,
    /回放/i,
    /playback/i,
  ],
  storage: [
    /存储/i,
    /storage/i,
    /云存储/i,
    /cloud/i,
    /录像/i,
    /recording/i,
    /sd卡/i,
    /sdcard/i,
    /空间/i,
    /space/i,
  ],
  configuration: [
    /配置/i,
    /config/i,
    /设置/i,
    /setting/i,
    /参数/i,
    /parameter/i,
  ],
};

/**
 * Auto-infer category from error description and solution
 */
export function categorizeError(description: string, solution: string): string {
  const text = `${description} ${solution}`.toLowerCase();

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return category;
      }
    }
  }

  return "general";
}
