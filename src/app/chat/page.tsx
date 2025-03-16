'use client';

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updateActivity } from "@/lib/activity";

interface Message {
  id: string;
  user_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  responses?: any;
}

export default function Chat() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('match');
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [matchReason, setMatchReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [showNewMatchButton, setShowNewMatchButton] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string | null>(null);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);

      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Auth and profile data
  useEffect(() => {
    const getAuth = async () => {
      // Update activity status
      updateActivity();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUserId(user.id);

      // Get my profile
      const { data: profile } = await supabase
          .from('profile')
          .select('*')
          .eq('id', user.id)
          .single();

      if (profile) {
        setMyProfile(profile);

        // If we have match info in profile, use it
        if (profile.responses?.match_reason) {
          setMatchReason(profile.responses.match_reason);
        }
      }

      // Get match profile if we have a match ID
      if (matchId) {
        const { data: matchProfile } = await supabase
            .from('profile')
            .select('*')
            .eq('id', matchId)
            .single();

        if (matchProfile) {
          // Parse name to get first name only
          const fullName = matchProfile.name || '';
          const firstName = fullName.split(' ')[0];

          setMatchProfile({
            ...matchProfile,
            name: firstName
          });
        }
      }

      setLoading(false);
    };

    getAuth();
  }, [matchId, router]);

  // Message handling
  useEffect(() => {
    if (!userId || !matchId) return;

    const fetchMessages = async () => {
      // Get messages between these two users
      const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`and(user_id.eq.${userId},receiver_id.eq.${matchId}),and(user_id.eq.${matchId},receiver_id.eq.${userId})`)
          .order("created_at", { ascending: true });

      if (error) console.error("Error fetching messages:", error);
      else if (data) {
        setMessages(data);

        // Check conversation activity to show new match button
        if (data.length > 0) {
          const lastMsgTime = new Date(data[data.length - 1].created_at);
          setLastActivity(lastMsgTime);

          // For demo, show new match after 1 minute, not 7 days
          const minutesSinceLastMessage = (new Date().getTime() - lastMsgTime.getTime()) / (1000 * 60);
          setShowNewMatchButton(minutesSinceLastMessage > 1);
        }
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
        .channel("messages_channel")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
        }, (payload) => {
          const newMsg = payload.new as Message;

          // Only process messages that are part of this conversation
          if ((newMsg.user_id === userId && newMsg.receiver_id === matchId) ||
              (newMsg.user_id === matchId && newMsg.receiver_id === userId)) {

            console.log("New message received in real-time:", newMsg);

            // Show browser notification for messages from match
            if (newMsg.user_id === matchId && notificationPermission === "granted") {
              const matchName = matchProfile?.name || "Your match";
              try {
                new Notification(`New message from ${matchName}`, {
                  body: newMsg.content.substring(0, 60) + (newMsg.content.length > 60 ? '...' : ''),
                  icon: '/notification-icon.png' // Add an icon to your public folder
                });
              } catch (e) {
                console.error("Failed to send notification:", e);
              }
            }

            // Update messages
            setMessages(prev => {
              // Avoid duplicate messages
              const msgExists = prev.some(m => m.id === newMsg.id);
              return msgExists ? prev : [...prev, newMsg];
            });

            setLastActivity(new Date());
            setShowNewMatchButton(false);
          }
        })
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, matchId, matchProfile, notificationPermission]);

  // Check activity every minute to update "Find New Match" button
  useEffect(() => {
    if (!lastActivity) return;

    const interval = setInterval(() => {
      const minutesSinceLastMessage = (new Date().getTime() - lastActivity.getTime()) / (1000 * 60);
      setShowNewMatchButton(minutesSinceLastMessage > 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [lastActivity]);

  const sendMessage = async () => {
    if (!userId || !matchId || newMessage.trim() === "") return;

    // First, optimistically update the UI
    const tempId = Math.random().toString();
    const optimisticMessage = {
      id: tempId,
      user_id: userId,
      receiver_id: matchId,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    // Add to messages immediately for instant feedback
    setMessages(prev => [...prev, optimisticMessage]);

    // Clear input field
    setNewMessage("");

    // Update activity state
    setLastActivity(new Date());
    setShowNewMatchButton(false);

    // Then actually send the message
    const { error, data } = await supabase.from("messages").insert([{
      user_id: userId,
      receiver_id: matchId,
      content: optimisticMessage.content,
      created_at: optimisticMessage.created_at,
    }]).select();

    if (error) {
      console.error("Error sending message:", error);
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      // Restore the message to the input
      setNewMessage(optimisticMessage.content);
    } else if (data && data[0]) {
      // Replace optimistic message with real one (with real ID)
      setMessages(prev => prev.map(m =>
          m.id === tempId ? data[0] : m
      ));
    }
  };

  const findNewMatch = async () => {
    // Mark current match as inactive in profile
    if (userId) {
      await supabase
          .from('profile')
          .update({
            responses: {
              ...myProfile?.responses,
              previous_matches: [...(myProfile?.responses?.previous_matches || []), matchId]
            }
          })
          .eq('id', userId);

      // Redirect to matching page
      router.push('/matching');
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
        </div>
    );
  }

  if (!matchId || !matchProfile) {
    return (
        <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">No match found</h2>
            <p className="mb-4">Please go to the matching page to find someone to chat with.</p>
            <button
                onClick={() => router.push('/matching')}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded transition-colors"
            >
              Find a Match
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center p-4">
        <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-indigo-600 text-white p-4">
            <h1 className="text-xl font-bold">
              Chat with {matchProfile?.name || 'Match'}
            </h1>
            {notificationPermission !== "granted" && (
                <button
                    onClick={() => {
                      Notification.requestPermission().then(permission => {
                        console.log("Notification permission:", permission);
                        setNotificationPermission(permission);
                        if (permission === "granted") {
                          // Send test notification
                          new Notification("Notifications enabled", {
                            body: "You'll now receive notifications for new messages"
                          });
                        }
                      });
                    }}
                    className="text-xs bg-white text-indigo-600 px-2 py-1 rounded mt-1 hover:bg-gray-100"
                >
                  Enable Notifications
                </button>
            )}
          </div>

          {matchReason && (
              <div className="bg-indigo-100 p-4 border-b border-indigo-200">
                <h3 className="font-bold text-indigo-800 text-sm">Why you were matched:</h3>
                <p className="text-indigo-900 text-sm">{matchReason}</p>
                {myProfile?.responses?.disagreement_score && (
                    <div className="mt-2 flex items-center">
                      <span className="text-xs text-indigo-800 mr-2">Disagreement score:</span>
                      <div className="h-3 w-32 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600"
                            style={{
                              width: `${Math.min(100, Math.max(0, myProfile.responses.disagreement_score * 100))}%`
                            }}
                        ></div>
                      </div>
                      <span className="text-xs ml-2">
                  {(myProfile.responses.disagreement_score * 100).toFixed(0)}%
                </span>
                    </div>
                )}
              </div>
          )}

          <div className="h-96 overflow-y-auto p-4 bg-white">
            {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2">You were matched because you have different perspectives.</p>
                </div>
            )}

            {messages.map((msg) => (
                <div key={msg.id} className={`mb-3 flex ${msg.user_id === userId ? "justify-end" : "justify-start"}`}>
                  <div
                      className={`p-3 rounded-lg shadow-sm max-w-xs md:max-w-md ${
                          msg.user_id === userId
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-800"
                      }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.user_id === userId ? "text-indigo-200" : "text-gray-500"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
            ))}
          </div>

          <div className="p-4 border-t">
            <div className="flex items-center">
              <input
                  type="text"
                  className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 placeholder-gray-500"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />
              <button
                  onClick={sendMessage}
                  className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>

            {showNewMatchButton && (
                <div className="mt-4 pt-2 border-t">
                  <div className="text-sm text-indigo-600 mb-2">
                    This conversation has been inactive for a while.
                  </div>
                  <button
                      onClick={findNewMatch}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors"
                  >
                    Find a New Match
                  </button>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}