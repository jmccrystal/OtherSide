import { useState } from 'react';
import { supabase } from '../lib/supabase';

const questions = [
  { id: 1, text: "Choose a number", options: ["1", "2", "3"], type: "multiple" }, // Added type
  { id: 2, text: "What’s your stance on climate change action?", type: "free" }, // Free response
];

export default function Survey() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = async () => {
    const { data, error } = await supabase.from("responses").insert([{ responses: answers }]);

    if (error) console.error("Error submitting:", error);
    else setSubmitted(true);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-4">CrossPerspective Survey</h1>
      {questions.map((q) => (
        <div key={q.id} className="mb-4">
          <p className="font-semibold">{q.text}</p>

          {/* Multiple Choice Question */}
          {q.type === "multiple" && (
            <select
              className="mt-2 p-2 border rounded w-full"
              onChange={(e) => handleAnswer(q.id, e.target.value)}
            >
              <option value="">Select an answer</option>
              {q.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {/* Free Response Question */}
          {q.type === "free" && (
            <textarea
              className="mt-2 p-2 border rounded w-full"
              placeholder="Write your response..."
              onChange={(e) => handleAnswer(q.id, e.target.value)}
            />
          )}

        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="w-full bg-blue-500 text-white p-2 rounded mt-4"
      >
        Submit
      </button>

      {submitted && <p className="mt-4 text-green-500">Survey submitted! Finding your match...</p>}
    </div>
  );
}
