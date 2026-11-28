export const LIVE_CONFIG = {
MAX_VIEWERS: 10,
ALLOW_STREAMER: true,

VIDEO: {
DEFAULT_QUALITY: "720p",
DEFAULT_BITRATE: 2000,
},

STATUS: {
LIVE: "live",
ENDED: "ended",
WAITING: "waiting",
},

COLLECTIONS: {
LIVES: "lives",
MESSAGES: "live_messages",
VIEWERS: "live_viewers",
},
} as const;
