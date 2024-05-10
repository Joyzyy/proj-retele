export const ICE_CONFIG = {
  ICE_SERVERS: [
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
  ],
  ICE_CANDIDATE_POOL_SIZE: 10,
};

export const RTC_OPTIONS = {
  displayMediaOption: {
    video: {
      height: 720,
      frameRate: 30,
    },
    audio: true
  },
  rtpPeerConnectionOption: {
    iceServers: [{
      urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302'
      ]
    }],
    iceCandidatePoolSize: 10,
  }
}