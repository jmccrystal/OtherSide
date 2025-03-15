// Matching page will do a few things:
// 1. Fetch all survey responses from the database
// 2. Send all survey responses, along with user responses to the GPT API
// 3. Add current user's responses to their own user profile

// Actual page should only consist of "Finding your match..." with a loading spinner.


import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.loader}></div>
      <div style={styles.loadingText}>Loading...</div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f0f0f0',
    flexDirection: 'column',
  },
  loader: {
    border: '8px solid #f3f3f3',
    borderTop: '8px solid #3498db',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 2s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '20px',
    color: '#333',
  },
};

const fetchAllResponses = async () => {
    const { data, error } = await supabase.from('survey_responses').select('*');
  
    if (error) {
      console.error('Error fetching survey responses:', error);
      return;
    }
  
    console.log('Survey responses:', data);
    return data;
  };

export default LoadingScreen;