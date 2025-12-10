import duplicateList from './duplicateList';

export async function postData(endpoint: string, payload: any, setDuplicates: any, navigate: any  ) {
  // Verhindert TS6133 (Parameter ungenutzt)
  void endpoint;
  void payload;

  try {
    // const response = await fetch(endpoint, {
    //   method: 'POST',
    //   body: JSON.stringify(payload),
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });

    // const data = await response.json();

    // if (response.status === 409) {
    //   setDuplicates(duplicateList);  
    //   navigate('/identity/duplicates')
    // }

    setDuplicates(duplicateList)
    navigate('/identity/duplicates')


    // if (!response.ok) {
    //   throw new Error(data.message || 'Something went wrong');
    // }

    // return data;

  } catch (error) {
    console.error('Request failed:', error);
    throw error;  
  }
}
