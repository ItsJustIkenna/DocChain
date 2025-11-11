import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

let client: twilio.Twilio | null = null;

function getTwilioClient() {
  if (!client && accountSid && apiKeySid && apiKeySecret) {
    client = twilio(apiKeySid, apiKeySecret, { accountSid });
  }
  return client;
}

/**
 * Create a video room for an appointment
 */
export async function createVideoRoom(appointmentId: string) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio not configured');

  const room = await client.video.v1.rooms.create({
    uniqueName: appointmentId,
    type: 'group', // Use 'group' instead of legacy 'peer-to-peer'
    maxParticipants: 2,
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
  });

  return room;
}

/**
 * Generate access token for video room
 */
export async function generateVideoToken(
  roomName: string,
  participantName: string,
  participantId: string
) {
  if (!accountSid || !apiKeySid || !apiKeySecret) {
    throw new Error('Twilio not configured');
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VideoGrant = AccessToken.VideoGrant;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: participantId,
    ttl: 14400, // 4 hours
  });

  const videoGrant = new VideoGrant({
    room: roomName,
  });

  token.addGrant(videoGrant);

  return {
    token: token.toJwt(),
    roomName,
    participantName,
  };
}

/**
 * End video room
 */
export async function endVideoRoom(roomSid: string) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio not configured');

  await client.video.v1.rooms(roomSid).update({ status: 'completed' });
}

/**
 * Get room details
 */
export async function getVideoRoom(roomSid: string) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio not configured');

  const room = await client.video.v1.rooms(roomSid).fetch();
  return room;
}
