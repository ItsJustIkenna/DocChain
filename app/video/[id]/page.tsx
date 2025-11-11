'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Video, { 
  LocalVideoTrack, 
  LocalAudioTrack, 
  RemoteVideoTrack, 
  RemoteAudioTrack,
  RemoteParticipant,
  Room
} from 'twilio-video';

interface Appointment {
  id: string;
  appointment_time: string;
  status: string;
  doctor_id: string;
  patient_id: string;
  twilio_room_sid: string | null;
  sui_transaction_digest?: string | null;
  doctor: {
    full_name: string;
    specialty: string;
  };
  patient: {
    full_name: string;
  };
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchAppointment();

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [appointmentId, user]);

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (!response.ok) throw new Error('Appointment not found');
      
      const data = await response.json();
      setAppointment(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const joinVideoCall = async () => {
    if (!appointment || !user) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get video token from API
      const response = await fetch('/api/video/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          participant_id: user.userId,
          participant_name: user.role === 'doctor' 
            ? `Dr. ${appointment.doctor.full_name}` 
            : appointment.patient.full_name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get video token');
      }

      const { token, roomName } = await response.json();

      // Connect to Twilio Video room
      const connectedRoom = await Video.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 640, height: 480 }
      });

      setRoom(connectedRoom);

      // Attach local video
      connectedRoom.localParticipant.videoTracks.forEach(publication => {
        const track = publication.track as LocalVideoTrack;
        if (localVideoRef.current && track) {
          localVideoRef.current.appendChild(track.attach());
        }
      });

      // Handle remote participants
      connectedRoom.participants.forEach(handleParticipantConnected);
      connectedRoom.on('participantConnected', handleParticipantConnected);
      connectedRoom.on('participantDisconnected', handleParticipantDisconnected);

      // Handle disconnection
      connectedRoom.on('disconnected', () => {
        setRoom(null);
        setRemoteParticipant(null);
      });

    } catch (err: any) {
      console.error('Video call error:', err);
      setError(err.message || 'Failed to join video call');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    setRemoteParticipant(participant);

    // Attach existing tracks
    participant.tracks.forEach(publication => {
      if (publication.track && publication.kind !== 'data') {
        attachTrack(publication.track as RemoteVideoTrack | RemoteAudioTrack);
      }
    });

    // Handle new tracks
    participant.on('trackSubscribed', (track) => {
      if (track.kind !== 'data') {
        attachTrack(track as RemoteVideoTrack | RemoteAudioTrack);
      }
    });
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    setRemoteParticipant(null);
  };

  const attachTrack = (track: RemoteVideoTrack | RemoteAudioTrack) => {
    if (track.kind === 'video' && remoteVideoRef.current) {
      const videoTrack = track as RemoteVideoTrack;
      remoteVideoRef.current.appendChild(videoTrack.attach());
    } else if (track.kind === 'audio') {
      const audioTrack = track as RemoteAudioTrack;
      audioTrack.attach();
    }
  };

  const toggleAudio = () => {
    if (!room) return;

    room.localParticipant.audioTracks.forEach(publication => {
      const track = publication.track as LocalAudioTrack;
      if (isAudioMuted) {
        track.enable();
      } else {
        track.disable();
      }
    });

    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    if (!room) return;

    room.localParticipant.videoTracks.forEach(publication => {
      const track = publication.track as LocalVideoTrack;
      if (isVideoMuted) {
        track.enable();
      } else {
        track.disable();
      }
    });

    setIsVideoMuted(!isVideoMuted);
  };

  const leaveCall = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setRemoteParticipant(null);
    }
    router.push(user?.role === 'doctor' ? '/doctors/dashboard' : '/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              Video Consultation
            </h1>
            {appointment && (
              <p className="text-sm text-gray-400 mt-1">
                {user?.role === 'doctor' 
                  ? `with ${appointment.patient.full_name}`
                  : `with Dr. ${appointment.doctor.full_name}`
                }
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {room && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!room ? (
          // Pre-call screen
          <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="text-center max-w-md">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to join?</h2>
              <p className="text-gray-400 mb-6">
                {appointment && `Appointment scheduled for ${new Date(appointment.appointment_time).toLocaleString()}`}
              </p>
              
              {/* Blockchain Verification Badge */}
              {appointment?.sui_transaction_digest && (
                <div className="mb-6 p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm font-semibold text-purple-300">Blockchain Verified</span>
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-2">
                    This appointment is permanently recorded on Sui blockchain
                  </p>
                  <a
                    href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet'}/tx/${appointment.sui_transaction_digest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center justify-center gap-1"
                  >
                    <span>View on Explorer</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              <button
                onClick={joinVideoCall}
                disabled={isConnecting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Join Video Call'
                )}
              </button>
            </div>
          </div>
        ) : (
          // In-call screen
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Remote Video (Other Participant) */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  className="w-full h-full object-cover"
                />
                {!remoteParticipant && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="text-gray-400">Waiting for other participant...</p>
                    </div>
                  </div>
                )}
                {remoteParticipant && (
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <p className="text-white text-sm font-medium">
                      {user?.role === 'doctor' 
                        ? appointment?.patient.full_name
                        : `Dr. ${appointment?.doctor.full_name}`
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Local Video (You) */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <p className="text-white text-sm font-medium">You</p>
                </div>
                {isVideoMuted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm">Camera Off</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={toggleAudio}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  isAudioMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isAudioMuted ? 'Unmute' : 'Mute'}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isAudioMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>

              <button
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  isVideoMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
              </button>

              <button
                onClick={leaveCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors duration-200"
                title="Leave call"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
