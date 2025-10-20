/**
 * SurrealDB Schema Definitions
 * Based on the comprehensive database guide for real-time voice state tracking
 */

export const SURREAL_SCHEMA_DEFINITIONS = {
	// Core Tables
	guilds: `
    DEFINE TABLE guilds SCHEMAFULL {
      id: string,
      name: string,
      owner_id: string,
      active: bool DEFAULT true,
      created_at: datetime,
      updated_at: datetime
    };
  `,

	channels: `
    DEFINE TABLE channels SCHEMAFULL {
      id: string,
      guild_id: string,
      name: string,
      type: int,
      active: bool DEFAULT true,
      created_at: datetime,
      updated_at: datetime
    };
  `,

	members: `
    DEFINE TABLE members SCHEMAFULL {
      id: string,
      guild_id: string,
      user_id: string,
      username: string,
      display_name: string,
      global_name: string?,
      avatar: string?,
      discriminator: string,
      nickname: string?,
      joined_at: datetime,
      roles: array<string>,
      profile_hash: string,
      profile_history: array<object> DEFAULT [],
      active: bool DEFAULT true,
      created_at: datetime,
      updated_at: datetime
    };
    DEFINE INDEX idx_members_user ON members FIELDS user_id, guild_id;
    DEFINE INDEX idx_members_hash ON members FIELDS profile_hash;
  `,

	// Voice State Tables (Real-time Focus)
	voice_states: `
    DEFINE TABLE voice_states SCHEMAFULL PERMISSIONS FULL {
      id: string,
      guild_id: string,
      user_id: string,
      channel_id: option<string>,
      self_mute: bool,
      self_deaf: bool,
      server_mute: bool,
      server_deaf: bool,
      streaming: bool,
      self_video: bool,
      suppress: bool,
      session_id: option<string>,
      joined_at: option<datetime>,
      created_at: datetime,
      updated_at: datetime
    };
    DEFINE INDEX idx_voice_states_user ON voice_states FIELDS user_id, guild_id;
    DEFINE INDEX idx_voice_states_channel ON voice_states FIELDS channel_id;
    DEFINE INDEX idx_voice_states_active ON voice_states FIELDS channel_id WHERE channel_id IS NOT NONE;
  `,

	voice_history: `
    DEFINE TABLE voice_history SCHEMAFULL PERMISSIONS FULL {
      guild_id: string,
      user_id: string,
      channel_id: option<string>,
      event_type: string,
      from_channel_id: option<string>,
      to_channel_id: option<string>,
      self_mute: bool,
      self_deaf: bool,
      server_mute: bool,
      server_deaf: bool,
      streaming: bool,
      self_video: bool,
      session_id: option<string>,
      session_duration: option<int>,
      timestamp: datetime,
      created_at: datetime
    };
    DEFINE INDEX idx_voice_history_user ON voice_history FIELDS user_id, guild_id;
    DEFINE INDEX idx_voice_history_timestamp ON voice_history FIELDS timestamp;
    DEFINE INDEX idx_voice_history_event ON voice_history FIELDS event_type;
  `,

	voice_sessions: `
    DEFINE TABLE voice_sessions SCHEMAFULL PERMISSIONS FULL {
      guild_id: string,
      user_id: string,
      channel_id: string,
      joined_at: datetime,
      left_at: datetime,
      duration: int,
      channels_visited: array<string>,
      switch_count: int,
      time_muted: int,
      time_deafened: int,
      time_streaming: int,
      active: bool,
      created_at: datetime,
      updated_at: datetime
    };
    DEFINE INDEX idx_voice_sessions_user ON voice_sessions FIELDS user_id, guild_id;
    DEFINE INDEX idx_voice_sessions_channel ON voice_sessions FIELDS channel_id;
    DEFINE INDEX idx_voice_sessions_active ON voice_sessions FIELDS active WHERE active = true;
  `,

	// Additional Tables
	actions: `
    DEFINE TABLE actions SCHEMAFULL {
      id: string,
      guild_id: string,
      user_id: string,
      action_type: string,
      target_id: string?,
      reason: string?,
      executed: bool DEFAULT false,
      executed_at: datetime?,
      created_at: datetime,
      updated_at: datetime
    };
    DEFINE INDEX idx_actions_user ON actions FIELDS user_id, guild_id;
    DEFINE INDEX idx_actions_executed ON actions FIELDS executed WHERE executed = false;
  `,

	messages: `
    DEFINE TABLE messages SCHEMAFULL {
      id: string,
      discord_id: string,
      content: string,
      author_id: string,
      channel_id: string,
      guild_id: string,
      timestamp: datetime,
      edited_at: datetime?,
      deleted_at: datetime?,
      mentions: array<string>,
      reactions: array<object>,
      reply_to: string?,
      attachments: array<object>,
      embeds: array<object>,
      flags: int?,
      type: int?,
      created_at: datetime,
      updated_at: datetime
    };
    DEFINE INDEX idx_messages_channel ON messages FIELDS channel_id;
    DEFINE INDEX idx_messages_author ON messages FIELDS author_id;
    DEFINE INDEX idx_messages_timestamp ON messages FIELDS timestamp;
  `,
};

/**
 * Live Query Definitions for Real-time Updates
 */
export const LIVE_QUERY_DEFINITIONS = {
	// Voice State Live Queries
	voiceStatesAll: `
    LIVE SELECT * FROM voice_states;
  `,

	voiceStatesByGuild: `
    LIVE SELECT * FROM voice_states WHERE guild_id = $guild_id;
  `,

	voiceStatesByChannel: `
    LIVE SELECT * FROM voice_states WHERE channel_id = $channel_id;
  `,

	activeVoiceStates: `
    LIVE SELECT * FROM voice_states WHERE channel_id IS NOT NONE;
  `,

	// Voice History Live Queries
	voiceHistoryByGuild: `
    LIVE SELECT * FROM voice_history WHERE guild_id = $guild_id ORDER BY timestamp DESC LIMIT 100;
  `,

	voiceHistoryByUser: `
    LIVE SELECT * FROM voice_history WHERE user_id = $user_id ORDER BY timestamp DESC LIMIT 50;
  `,

	// Voice Sessions Live Queries
	activeVoiceSessions: `
    LIVE SELECT * FROM voice_sessions WHERE active = true;
  `,

	voiceSessionsByChannel: `
    LIVE SELECT * FROM voice_sessions WHERE channel_id = $channel_id AND active = true;
  `,

	// Member Live Queries
	membersByGuild: `
    LIVE SELECT * FROM members WHERE guild_id = $guild_id AND active = true;
  `,

	// Channel Live Queries
	channelsByGuild: `
    LIVE SELECT * FROM channels WHERE guild_id = $guild_id AND active = true ORDER BY position ASC;
  `,

	// Action Live Queries
	pendingActions: `
    LIVE SELECT * FROM actions WHERE executed = false ORDER BY created_at ASC;
  `,

	actionsByGuild: `
    LIVE SELECT * FROM actions WHERE guild_id = $guild_id ORDER BY created_at DESC LIMIT 50;
  `,
};

/**
 * Helper functions for record ID generation
 */
export const RECORD_ID_HELPERS = {
	voiceState: (guildId: string, userId: string) =>
		`voice_states:${guildId}_${userId}`,
	voiceHistory: (guildId: string, userId: string, timestamp: string) =>
		`voice_history:${guildId}_${userId}_${timestamp}`,
	voiceSession: (guildId: string, userId: string, sessionId: string) =>
		`voice_sessions:${guildId}_${userId}_${sessionId}`,
	member: (guildId: string, userId: string) => `members:${guildId}_${userId}`,
	channel: (guildId: string, channelId: string) =>
		`channels:${guildId}_${channelId}`,
	guild: (guildId: string) => `guilds:${guildId}`,
	action: (guildId: string, actionId: string) =>
		`actions:${guildId}_${actionId}`,
	message: (channelId: string, messageId: string) =>
		`messages:${channelId}_${messageId}`,
};

/**
 * Voice State Event Types
 */
export const VOICE_EVENT_TYPES = {
	JOIN: "voice_join",
	LEAVE: "voice_leave",
	MOVE: "voice_move",
	MUTE: "voice_mute",
	UNMUTE: "voice_unmute",
	DEAFEN: "voice_deafen",
	UNDEAFEN: "voice_undeafen",
	STREAM_START: "stream_start",
	STREAM_STOP: "stream_stop",
	VIDEO_START: "video_start",
	VIDEO_STOP: "video_stop",
} as const;

export type VoiceEventType =
	(typeof VOICE_EVENT_TYPES)[keyof typeof VOICE_EVENT_TYPES];
