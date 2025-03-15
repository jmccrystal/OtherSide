import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function MatchPage() {
  const [match, setMatch] = useState(null);

  useEffect(() => {
    const findMatch = async () => {
      const { data } = await supabase.from("responses").select("*").limit(1);
      if (data.length > 0) {
        const response = await fetch("/api/match", {
          method: "POST",
          body: JSON.stringify({ userId: data[0].id, responses: data[0].responses }),
          headers: { "Content-Type": "application/json" },
        });
        const result = await response.json();
        setMatch(result.match);
      }
    };

    findMatch();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold">Your Matched Partner</h1>
      {match ? (
        <p className="mt-4">You have been matched with User {match.id}!</p>
      ) : (
        <p className="mt-4 text-gray-500">Looking for your match...</p>
      )}
    </div>
  );
}