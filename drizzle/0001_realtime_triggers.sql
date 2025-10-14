-- Realtime triggers for LISTEN/NOTIFY
-- channels table

CREATE OR REPLACE FUNCTION notify_channels_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('channels_update', json_build_object(
    'channelId', COALESCE(NEW.discord_id, OLD.discord_id),
    'event', TG_OP,
    'table', TG_TABLE_NAME,
    'updatedAt', now()
  )::text);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS channels_update_trigger ON channels;
CREATE TRIGGER channels_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON channels
FOR EACH ROW EXECUTE FUNCTION notify_channels_update();

-- voice_channel_sessions table (presence/durations)
CREATE OR REPLACE FUNCTION notify_voice_sessions_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('voice_sessions_update', json_build_object(
    'channelId', NEW.channel_id,
    'userId', NEW.user_id,
    'event', TG_OP,
    'table', TG_TABLE_NAME,
    'updatedAt', now()
  )::text);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'voice_sessions_update_trigger';
  IF NOT FOUND THEN
    CREATE TRIGGER voice_sessions_update_trigger
    AFTER INSERT OR UPDATE ON voice_channel_sessions
    FOR EACH ROW EXECUTE FUNCTION notify_voice_sessions_update();
  END IF;
END $$;


