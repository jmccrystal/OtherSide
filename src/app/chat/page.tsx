import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


const generateUserId = () => "user-" + Math.random().toString(36).substring(2, 15);

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const userId = generateUserId(); 

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching messages:", error);
      else setMessages(data || []);
    };
    fetchMessages();

    
    const subscription = supabase
      .channel("public:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    const message = {
      user_id: userId,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("messages").insert([message]);

    if (error) console.error("Error sending message:", error);
    else setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-2xl p-4 bg-white shadow-lg rounded-lg mt-8">
        <h1 className="text-2xl font-bold text-center mb-4">Chat Room</h1>

        <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
          {messages.map((msg) => (
            <div key={msg.id} className={`mb-3 flex ${msg.user_id === userId ? "justify-end" : "justify-start"}`}>
              <div className={`p-3 rounded-lg shadow ${msg.user_id === userId ? "bg-blue-500 text-white" : "bg-gray-300 text-black"}`}>
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center mt-4">
          <input
            type="text"
            className="flex-1 p-2 border rounded-lg"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">Send</button>
        </div>
      </div>
    </div>
  );
}